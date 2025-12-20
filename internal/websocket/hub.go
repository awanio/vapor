package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/awanio/vapor/internal/logs"
	"github.com/gorilla/websocket"
)

// Client represents a WebSocket client
type Client struct {
	eventsHub      *Hub
	hub            *Hub
	conn           *websocket.Conn
	send           chan []byte
	id             string
	authenticated  bool
	username       string
	subscriptions  map[string]bool
	mu             sync.RWMutex
	jwtSecret      string
	handlerType    string
	logService     *logs.Service
	pseudoTerminal *PseudoTerminal
	ctx            context.Context
	cancel         context.CancelFunc
	closed         bool
}

// Hub maintains the set of active clients and broadcasts messages to the clients
type Hub struct {
	// Registered clients
	clients map[*Client]bool

	// Inbound messages from the clients
	broadcast chan []byte

	// Register requests from the clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// Mutex for thread-safe operations
	mu sync.RWMutex
}

// NewHub creates a new Hub
func NewHub() *Hub {
	return &Hub{
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
	}
}

// Run starts the hub
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("Client %s connected", client.id)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				client.mu.Lock()
				if !client.closed {
					client.closed = true
					close(client.send)
					if client.cancel != nil {
						client.cancel()
					}
				}
				client.mu.Unlock()
				h.mu.Unlock()
				log.Printf("Client %s disconnected", client.id)
			} else {
				h.mu.Unlock()
			}

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// BroadcastToChannel sends a message to all clients subscribed to a specific channel
func (h *Hub) BroadcastToChannel(channel string, message []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients {
		client.mu.RLock()
		if client.authenticated && client.subscriptions[channel] {
			select {
			case client.send <- message:
			default:
				// Client's send channel is full, skip
			}
		}
		client.mu.RUnlock()
	}
}

// readPump pumps messages from the websocket connection to the hub
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
		if c.pseudoTerminal != nil {
			c.pseudoTerminal.Close()
		}
	}()

	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		// Process the message
		c.processMessage(message)
	}
}

// writePump pumps messages from the hub to the websocket connection
func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			c.conn.WriteMessage(websocket.TextMessage, message)

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// processMessage handles incoming WebSocket messages
func (c *Client) processMessage(data []byte) {
	log.Printf("Client %s received message: %s", c.id, string(data))
	var msg Message
	if err := json.Unmarshal(data, &msg); err != nil {
		log.Printf("Failed to unmarshal message: %v", err)
		c.sendError("Invalid message format")
		return
	}
	log.Printf("Parsed message type: %s, payload: %+v", msg.Type, msg.Payload)

	switch msg.Type {
	case MessageTypePing:
		c.sendMessage(Message{Type: MessageTypePong})

	case MessageTypeAuth:
		// All handlers use the same authentication
		handleAuth(c, msg, c.jwtSecret)

	case MessageTypeSubscribe:
		if !c.authenticated {
			c.sendError("Not authenticated")
			return
		}

		var payload SubscribePayload
		if data, err := json.Marshal(msg.Payload); err == nil {
			_ = json.Unmarshal(data, &payload)
		}
		if payload.Channel != "" {
			c.mu.Lock()
			c.subscriptions[payload.Channel] = true
			c.mu.Unlock()
			log.Printf("Client %s subscribed to %s", c.id, payload.Channel)
		}

		c.mu.RLock()
		handlerType := c.handlerType
		c.mu.RUnlock()

		// Start the appropriate service based on handler type
		switch handlerType {
		case "events":
			// Dispatch based on subscribed channel
			switch payload.Channel {
			case "log-events":
				go tailLogs(c, c.logService, msg)
			case "metrics":
				go sendMetrics(c)
			}
		case "metrics":
			// Start sending metrics immediately
			go sendMetrics(c)
		case "logs":
			// Start tailing logs with filters from the message
			go tailLogs(c, c.logService, msg)
		case "terminal":
			// Start terminal session
			if c.pseudoTerminal == nil {
				log.Println("Initializing terminal...")
				// Get terminal size from payload if available
				var rows, cols float64 = 24, 80 // defaults
				log.Printf("Raw payload: %+v", msg.Payload)
				if payloadData, ok := msg.Payload.(map[string]interface{}); ok {
					log.Printf("Payload is a map: %+v", payloadData)
					if r, ok := payloadData["rows"].(float64); ok {
						rows = r
					}
					if c, ok := payloadData["cols"].(float64); ok {
						cols = c
					}
					log.Printf("Terminal size from payload: rows=%v, cols=%v", rows, cols)
				}
				// Get the authenticated username
				c.mu.RLock()
				username := c.username
				c.mu.RUnlock()
				c.pseudoTerminal = startTerminal(c, username)
				if c.pseudoTerminal == nil {
					c.sendError("Failed to initialize terminal")
					return
				}
				log.Println("Terminal initialized successfully")
				// Set initial size
				if err := c.pseudoTerminal.SetSize(int(rows), int(cols)); err != nil {
					log.Printf("Failed to set terminal size: %v", err)
				}
			}
		}

	case MessageTypeUnsubscribe:
		if !c.authenticated {
			c.sendError("Not authenticated")
			return
		}
		var payload SubscribePayload
		if data, err := json.Marshal(msg.Payload); err == nil {
			if err := json.Unmarshal(data, &payload); err == nil {
				c.mu.Lock()
				delete(c.subscriptions, payload.Channel)
				c.mu.Unlock()
				log.Printf("Client %s unsubscribed from %s", c.id, payload.Channel)
			}
		}

	case MessageTypeInput:
		if !c.authenticated {
			c.sendError("Not authenticated")
			return
		}
		c.mu.RLock()
		handlerType := c.handlerType
		c.mu.RUnlock()

		// Handle terminal input data
		if handlerType == "terminal" && c.pseudoTerminal != nil {
			// Parse the raw message again to get the data field
			var inputMsg struct {
				Type string `json:"type"`
				Data string `json:"data"`
			}
			if err := json.Unmarshal(data, &inputMsg); err == nil && inputMsg.Data != "" {
				log.Printf("Received terminal input: %q", inputMsg.Data)
				if err := c.pseudoTerminal.Write([]byte(inputMsg.Data)); err != nil {
					log.Printf("Error writing to terminal: %v", err)
				}
			} else {
				log.Printf("Failed to parse input data from message")
			}
		}

	case MessageTypeResize:
		if !c.authenticated {
			c.sendError("Not authenticated")
			return
		}
		c.mu.RLock()
		handlerType := c.handlerType
		c.mu.RUnlock()

		// Handle terminal resize
		if handlerType == "terminal" && c.pseudoTerminal != nil {
			if resizeData, ok := msg.Payload.(map[string]interface{}); ok {
				rows, rowsOk := resizeData["rows"].(float64)
				cols, colsOk := resizeData["cols"].(float64)
				if rowsOk && colsOk {
					log.Printf("Resizing terminal to %dx%d", int(rows), int(cols))
					if err := c.pseudoTerminal.SetSize(int(rows), int(cols)); err != nil {
						log.Printf("Error resizing terminal: %v", err)
						c.sendError(fmt.Sprintf("Failed to resize terminal: %v", err))
					} else {
						// Send confirmation
						c.sendMessage(Message{
							Type: "resize",
							Payload: map[string]interface{}{
								"success": true,
								"rows":    int(rows),
								"cols":    int(cols),
							},
						})
					}
				} else {
					log.Printf("Invalid resize parameters: missing rows or cols")
					c.sendError("Missing rows or cols in resize payload")
				}
			} else {
				c.sendError("Invalid resize message format - payload must be an object")
			}
		}
	}
}

// sendMessage sends a message to the client
func (c *Client) sendMessage(msg Message) {
	c.mu.RLock()
	closed := c.closed
	c.mu.RUnlock()

	if closed {
		return
	}

	data, err := json.Marshal(msg)
	if err != nil {
		return
	}

	// Use a non-blocking send with recovery for closed channel panic
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Recovered from panic while sending to client %s: %v", c.id, r)
		}
	}()

	select {
	case c.send <- data:
	default:
		// Channel is full, skip
		log.Printf("Client %s send channel is full, dropping message", c.id)
	}
}

// sendError sends an error message to the client
func (c *Client) sendError(errMsg string) {
	c.sendMessage(Message{
		Type:  MessageTypeError,
		Error: errMsg,
	})
}
