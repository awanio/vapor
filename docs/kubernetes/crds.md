# Kubernetes Custom Resource Definitions (CRDs)

The CRDs endpoint allows you to list all Custom Resource Definitions installed in your Kubernetes cluster. CRDs extend the Kubernetes API by defining custom resources and their schemas.

## List CRDs

```http
GET /api/v1/kubernetes/crds
```

Lists all Custom Resource Definitions in the cluster.

### Authorization

Requires a valid bearer token.

```http
Authorization: Bearer <token>
```

### Response

#### 200: Success

Returns a list of all CRDs in the cluster.

```json
{
  "status": "success",
  "data": {
    "crds": [
      {
        "name": "prometheuses.monitoring.coreos.com",
        "group": "monitoring.coreos.com",
        "version": "v1",
        "scope": "Namespaced",
        "plural": "prometheuses",
        "singular": "prometheus",
        "kind": "Prometheus",
        "shortNames": ["prom"],
        "served": true,
        "storage": true,
        "established": true,
        "age": "10d",
        "labels": {
          "app.kubernetes.io/component": "monitoring",
          "app.kubernetes.io/name": "prometheus-operator"
        }
      }
    ]
  }
}
```

#### 401: Unauthorized

Returned when authentication is missing or invalid.

```json
{
  "status": "error",
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

#### 503: Kubernetes Not Installed

Returned when Kubernetes is not installed or accessible on the system.

```json
{
  "status": "error",
  "error": {
    "code": "KUBERNETES_NOT_INSTALLED",
    "message": "Kubernetes is not installed on this system",
    "details": "The kubelet service was not found on this system. Please install Kubernetes to use these features."
  }
}
```

### Example Usage

```bash
# List all CRDs
curl -H "Authorization: Bearer <token>" http://localhost:8080/api/v1/kubernetes/crds

# Using jq to filter specific CRDs by group
curl -H "Authorization: Bearer <token>" http://localhost:8080/api/v1/kubernetes/crds | jq '.data.crds[] | select(.group | contains("monitoring.coreos.com"))'
```

## Response Fields

The CRD objects in the response include the following fields:

| Field        | Type      | Description |
|--------------|-----------|-------------|
| name         | string    | Full name of the CRD (format: `<plural>.<group>`) |
| group        | string    | API group of the CRD |
| version      | string    | API version of the CRD |
| scope        | string    | Either "Namespaced" or "Cluster" |
| plural       | string    | Plural name used in URLs |
| singular     | string    | Singular name of the resource |
| kind         | string    | Kind of the custom resource |
| shortNames   | string[]  | List of short names for the resource |
| served       | boolean   | Whether this version is served |
| storage      | boolean   | Whether this version is used for storage |
| established  | boolean   | Whether the CRD is established |
| age          | string    | Age of the CRD |
| labels       | object    | Labels attached to the CRD |

## Notes

- CRDs are cluster-wide resources and are not namespaced
- The response includes all versions of each CRD
- The `established` field indicates whether the CRD is ready for use
- Short names can be used in kubectl commands (e.g., `kubectl get prom` instead of `kubectl get prometheuses`)
