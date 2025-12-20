package docker

import (
	"context"
	"time"

	"github.com/awanio/vapor/internal/websocket"
	"github.com/docker/docker/api/types"
)

// StartEventForwarder listens to Docker/Containerd events and broadcasts them over the websocket hub.
// Non-fatal: exits quietly if hub is nil or events stream errors out.
func StartEventForwarder(ctx context.Context, cli Client, hub *websocket.Hub) {
	if cli == nil || hub == nil {
		return
	}

	events, errs := cli.Events(ctx, types.EventsOptions{})

	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case err := <-errs:
				if err != nil {
					return
				}
			case ev := <-events:
				payload := map[string]interface{}{
					"kind":       "container",
					"id":         ev.Actor.ID,
					"name":       ev.Actor.Attributes["name"],
					"action":     ev.Action,
					"type":       ev.Type,
					"timestamp":  time.Unix(ev.Time, 0).UTC(),
					"attributes": ev.Actor.Attributes,
				}
				msg := websocket.Message{Type: websocket.MessageTypeEvent, Payload: payload}
				if b, err := websocket.MarshalMessage(msg); err == nil {
					hub.BroadcastToChannel("container-events", b)
				}
			}
		}
	}()
}
