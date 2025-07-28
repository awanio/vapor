package websocket

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Client represents a WebSocket client
type Client struct {
	hub          *Hub
	conn         *websocket.Conn
	send         chan []byte
	id           string
	authenticated bool
	username     string
	subscriptions map[string]bool
	mu           sync.RWMutex
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
				close(client.send)
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
	var msg Message
	if err := json.Unmarshal(data, &msg); err != nil {
		c.sendError("Invalid message format")
		return
	}

	switch msg.Type {
	case MessageTypePing:
		c.sendMessage(Message{Type: MessageTypePong})

	case MessageTypeAuth:
		// Authentication will be handled by the specific handler
		// This is a placeholder

	case MessageTypeSubscribe:
		if !c.authenticated {
			c.sendError("Not authenticated")
			return
		}
		var payload SubscribePayload
		if data, err := json.Marshal(msg.Payload); err == nil {
			if err := json.Unmarshal(data, &payload); err == nil {
				c.mu.Lock()
				c.subscriptions[payload.Channel] = true
				c.mu.Unlock()
				log.Printf("Client %s subscribed to %s", c.id, payload.Channel)
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
	}
}

// sendMessage sends a message to the client
func (c *Client) sendMessage(msg Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}
	select {
	case c.send <- data:
	default:
		// Channel is full, skip
	}
}

// sendError sends an error message to the client
func (c *Client) sendError(errMsg string) {
	c.sendMessage(Message{
		Type:  MessageTypeError,
		Error: errMsg,
	})
}
