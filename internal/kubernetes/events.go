package kubernetes

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type EventBroadcaster interface {
	BroadcastToChannel(channel string, message []byte)
}

// StartEventForwarder watches Kubernetes pod events cluster-wide and broadcasts them.
// Non-fatal: exits quietly if hub is nil or watch cannot be established.
func StartEventForwarder(ctx context.Context, svc *Service, hub EventBroadcaster) {
	if svc == nil || hub == nil || svc.client == nil {
		return
	}

	watcher, err := svc.client.CoreV1().Pods("").Watch(ctx, metav1.ListOptions{Watch: true})
	if err != nil {
		return
	}

	go func() {
		defer watcher.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case ev, ok := <-watcher.ResultChan():
				if !ok {
					return
				}

				obj, ok := ev.Object.(metav1.Object)
				if !ok {
					continue
				}

				payload := map[string]interface{}{
					"kind":            "k8s-pod",
					"action":          string(ev.Type),
					"name":            obj.GetName(),
					"namespace":       obj.GetNamespace(),
					"uid":             string(obj.GetUID()),
					"resourceVersion": obj.GetResourceVersion(),
					"timestamp":       time.Now().UTC(),
				}

				msg := struct {
					Type    string      `json:"type"`
					Payload interface{} `json:"payload"`
				}{
					Type:    "event",
					Payload: payload,
				}

				if b, err := json.Marshal(msg); err == nil {
					hub.BroadcastToChannel("k8s-events", b)
					if ns := obj.GetNamespace(); ns != "" {
						hub.BroadcastToChannel(fmt.Sprintf("k8s-events:%s", ns), b)
					}
				}
			}
		}
	}()
}
