package websocket

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"runtime"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/load"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/vapor/system-api/internal/system"
	"github.com/vapor/system-api/internal/logs"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// In production, implement proper origin checking
		return true
	},
}

// ServeMetricsWebSocket handles WebSocket connections for system metrics
func ServeMetricsWebSocket(hub *Hub, jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("Failed to upgrade to websocket: %v", err)
			return
		}

		client := &Client{
			hub:           hub,
			conn:          conn,
			send:          make(chan []byte, 256),
			id:            fmt.Sprintf("metrics-%d", time.Now().UnixNano()),
			subscriptions: make(map[string]bool),
		}

		client.hub.register <- client

		// Start goroutines for reading and writing
		go client.readPump()
		go client.writePump()

		// Override processMessage for metrics-specific handling
		go func() {
			for {
				_, message, err := conn.ReadMessage()
				if err != nil {
					break
				}

				var msg Message
				if err := json.Unmarshal(message, &msg); err != nil {
					client.sendError("Invalid message format")
					continue
				}

				switch msg.Type {
				case MessageTypeAuth:
					handleAuth(client, msg, jwtSecret)
				case MessageTypeSubscribe:
					if !client.authenticated {
						client.sendError("Not authenticated")
						continue
					}
					// Start sending metrics
					go sendMetrics(client)
				}
			}
		}()
	}
}

// ServeLogsWebSocket handles WebSocket connections for system logs
func ServeLogsWebSocket(hub *Hub, jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("Failed to upgrade to websocket: %v", err)
			return
		}

		client := &Client{
			hub:           hub,
			conn:          conn,
			send:          make(chan []byte, 256),
			id:            fmt.Sprintf("logs-%d", time.Now().UnixNano()),
			subscriptions: make(map[string]bool),
		}

		client.hub.register <- client

		// Start goroutines for reading and writing
		go client.readPump()
		go client.writePump()

		// Override processMessage for logs-specific handling
		go func() {
			logService := logs.NewService()
			for {
				_, message, err := conn.ReadMessage()
				if err != nil {
					break
				}

				var msg Message
				if err := json.Unmarshal(message, &msg); err != nil {
					client.sendError("Invalid message format")
					continue
				}

				switch msg.Type {
				case MessageTypeAuth:
					handleAuth(client, msg, jwtSecret)
				case MessageTypeSubscribe:
					if !client.authenticated {
						client.sendError("Not authenticated")
						continue
					}
					// Start tailing logs
					go tailLogs(client, logService, msg)
				}
			}
		}()
	}
}

// ServeTerminalWebSocket handles WebSocket connections for terminal sessions
func ServeTerminalWebSocket(hub *Hub, jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("Failed to upgrade to websocket: %v", err)
			return
		}

		client := &Client{
			hub:           hub,
			conn:          conn,
			send:          make(chan []byte, 256),
			id:            fmt.Sprintf("terminal-%d", time.Now().UnixNano()),
			subscriptions: make(map[string]bool),
		}

		client.hub.register <- client

		// Start goroutines for reading and writing
		go client.readPump()
		go client.writePump()

		// Override processMessage for terminal-specific handling
		go func() {
			var pty *PseudoTerminal
			for {
				_, message, err := conn.ReadMessage()
				if err != nil {
					if pty != nil {
						pty.Close()
					}
					break
				}

				var msg Message
				if err := json.Unmarshal(message, &msg); err != nil {
					client.sendError("Invalid message format")
					continue
				}

				switch msg.Type {
				case MessageTypeAuth:
					handleAuth(client, msg, jwtSecret)
				case MessageTypeData:
					if !client.authenticated {
						client.sendError("Not authenticated")
						continue
					}
					// Handle terminal input/output
					if pty == nil {
						pty = startTerminal(client)
						if pty == nil {
							client.sendError("Failed to start terminal")
							continue
						}
					}
					
					// Forward input to PTY
					if inputData, ok := msg.Payload.(map[string]interface{}); ok {
						if data, ok := inputData["data"].(string); ok {
							pty.Write([]byte(data))
						}
					}
				}
			}
		}()
	}
}

// handleAuth handles authentication for WebSocket connections
func handleAuth(client *Client, msg Message, jwtSecret string) {
	payload, ok := msg.Payload.(map[string]interface{})
	if !ok {
		client.sendError("Invalid auth payload")
		return
	}

	tokenStr, ok := payload["token"].(string)
	if !ok {
		client.sendError("Token not provided")
		return
	}

	// Validate JWT token
	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(jwtSecret), nil
	})

	if err != nil || !token.Valid {
		client.sendError("Invalid token")
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		client.sendError("Invalid token claims")
		return
	}

	username, ok := claims["username"].(string)
	if !ok {
		client.sendError("Username not found in token")
		return
	}

	client.mu.Lock()
	client.authenticated = true
	client.username = username
	client.mu.Unlock()

	client.sendMessage(Message{
		Type: MessageTypeAuth,
		Payload: map[string]interface{}{
			"authenticated": true,
			"username":      username,
		},
	})
}

// sendMetrics continuously sends system metrics to the client
func sendMetrics(client *Client) {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	_ = system.NewService() // TODO: Use this for more advanced metrics

	for {
		select {
		case <-ticker.C:
			client.mu.RLock()
			authenticated := client.authenticated
			client.mu.RUnlock()

			if !authenticated {
				return
			}

			// Get system metrics
			loadAvg, _ := load.Avg()
			virtualMem, _ := mem.VirtualMemory()
			diskPartitions, _ := disk.Partitions(true)

			// Get CPU usage percentage
			cpuPercent, _ := cpu.Percent(time.Second, false)
			cpuUsage := float64(0)
			if len(cpuPercent) > 0 {
				cpuUsage = cpuPercent[0]
			}

			// Get swap memory info
			swapMem, _ := mem.SwapMemory()

			metricsData := MetricsData{
				Timestamp: time.Now(),
				CPU: CPUMetrics{
					Usage:       cpuUsage,
					Cores:       runtime.NumCPU(),
					LoadAverage: []float64{loadAvg.Load1, loadAvg.Load5, loadAvg.Load15},
				},
				Memory: MemoryMetrics{
					Total:       virtualMem.Total,
					Used:        virtualMem.Used,
					Free:        virtualMem.Free,
					Available:   virtualMem.Available,
					UsedPercent: virtualMem.UsedPercent,
					SwapTotal:   swapMem.Total,
					SwapUsed:    swapMem.Used,
					SwapFree:    swapMem.Free,
				},
			}

			// Add disk metrics
			for _, partition := range diskPartitions {
				usage, _ := disk.Usage(partition.Mountpoint)
				if usage != nil {
					metricsData.Disk = append(metricsData.Disk, DiskMetrics{
						Device:      partition.Device,
						Mountpoint:  partition.Mountpoint,
						Fstype:      partition.Fstype,
						Total:       usage.Total,
						Used:        usage.Used,
						Free:        usage.Free,
						UsedPercent: usage.UsedPercent,
					})
				}
			}

			client.sendMessage(Message{
				Type:    MessageTypeData,
				Payload: metricsData,
			})
		}
	}
}

// tailLogs continuously sends log entries to the client
func tailLogs(client *Client, logService *logs.Service, msg Message) {
	// Extract filters from subscribe message
	var filters LogQuery
	if payload, ok := msg.Payload.(map[string]interface{}); ok {
		if f, ok := payload["filters"].(map[string]interface{}); ok {
			if unit, ok := f["unit"].(string); ok {
				filters.Unit = unit
			}
			if priority, ok := f["priority"].(string); ok {
				filters.Priority = priority
			}
			if since, ok := f["since"].(string); ok {
				filters.Since = since
			}
		}
	}

	// TODO: Implement actual log tailing
	// For now, send sample log entries
	ticker := time.NewTicker(3 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			client.mu.RLock()
			authenticated := client.authenticated
			client.mu.RUnlock()

			if !authenticated {
				return
			}

			// Send sample log entry
			logEntry := LogEntry{
				Timestamp: time.Now(),
				Level:     "info",
				Unit:      filters.Unit,
				Message:   fmt.Sprintf("Sample log message at %s", time.Now().Format(time.RFC3339)),
			}

			client.sendMessage(Message{
				Type:    MessageTypeData,
				Payload: logEntry,
			})
		}
	}
}

// Helper functions
func getString(m map[string]interface{}, key string) string {
	if v, ok := m[key].(string); ok {
		return v
	}
	return ""
}

func getUint64(m map[string]interface{}, key string) uint64 {
	if v, ok := m[key].(float64); ok {
		return uint64(v)
	}
	if v, ok := m[key].(uint64); ok {
		return v
	}
	return 0
}

func getFloat64(m map[string]interface{}, key string) float64 {
	if v, ok := m[key].(float64); ok {
		return v
	}
	return 0
}
