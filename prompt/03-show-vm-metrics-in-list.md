Present vm's metrics in vm list at web/src/views/virtualization/virtualization-vms-enhanced.ts component. Change the Disk (GB) and OS Type columns to CPU Usage (%) and Memory Usage (%). For initial data you can fetch from vm's metrics endpoint at api/v1/virtualization/computes/{id}/metrics for each vm in the list where api response example is:

```json
{
    "data": {
        "uuid": "8daeb8f2-d4f7-4bd9-b5cf-9cafbfcb8403",
        "timestamp": "2026-01-19T02:25:06.337078825Z",
        "cpu_time": 1433723012729,
        "cpu_usage": 0,
        "memory_used": 4194304,
        "memory_usage": 104.63065610690411,
        "disk_read": 262144,
        "disk_write": 259731456,
        "network_rx": 0,
        "network_tx": 0
    },
    "status": "success"
}
```

But we need to update the metrics periodically, let say for every 3 seconds. But re-fecthing the metrics data will hurt the api especially if the vm numbers is quite alot. My suggestion is by providing new event subscripton such as vm-metrics-events to websocket event hub at ServeEventsWebSocket() function (internal/websocket/handlers.go:35). But you need to be carefully, that vm list already has event subscribe mechanisem (vm-events) to websocket event endpoint to listen vm sate from backend. I'm not sure if we can just add the metrics data to vm-events so we don't need to create new event type or we should use different event name. I'll let you decide it which one is best. If you decide to just utilize existing vm-events you need to make sure no visually blinking happened in vm table list in frontend since the data will continuously update for ever 3 seconds. My suggest is to just update the dom value related to each vm cpu and memory instead of refresh whole vm list.