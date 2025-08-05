# Helm Operations

The Helm endpoints provide access to Helm package manager operations in your Kubernetes cluster. These endpoints allow you to manage Helm releases and interact with charts.

## List Releases

```http
GET /api/v1/kubernetes/helm/releases
```

Lists all Helm releases from all namespaces in the cluster by default.

### Query Parameters

| Parameter     | Type    | Description |
|--------------|---------|-------------|
| namespace    | string  | Filter releases by specific namespace (overrides default all-namespace behavior) |
| all          | boolean | Explicitly control whether to show releases from all namespaces (default: true) |
| filter       | string  | Filter releases by regular expression |

### Authorization

Requires a valid bearer token.

```http
Authorization: Bearer <token>
```

### Response

#### 200: Success

Returns a list of all Helm releases.

```json
{
  "status": "success",
  "data": {
    "releases": [
      {
        "name": "prometheus",
        "namespace": "monitoring",
        "version": 1,
        "status": "deployed",
        "chart": "prometheus",
        "chart_version": "15.10.5",
        "app_version": "2.40.7",
        "updated": "2025-08-04T10:30:00Z",
        "description": "Installed using Helm",
        "labels": {
          "app.kubernetes.io/managed-by": "Helm"
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

#### 500: Internal Server Error

Returned when there's an error accessing Helm.

```json
{
  "status": "error",
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to list releases"
  }
}
```

### Example Usage

```bash
# List all releases in the current namespace
curl -H "Authorization: Bearer <token>" http://localhost:8080/api/v1/kubernetes/helm/releases

# List releases in a specific namespace
curl -H "Authorization: Bearer <token>" http://localhost:8080/api/v1/kubernetes/helm/releases?namespace=monitoring

# List releases across all namespaces
curl -H "Authorization: Bearer <token>" http://localhost:8080/api/v1/kubernetes/helm/releases?all=true

# Filter releases by name
curl -H "Authorization: Bearer <token>" http://localhost:8080/api/v1/kubernetes/helm/releases?filter=prometheus
```

## Release Fields

The release objects in the response include the following fields:

| Field         | Type     | Description |
|--------------|----------|-------------|
| name         | string   | Name of the release |
| namespace    | string   | Namespace where the release is installed |
| version      | integer  | Release version number |
| status       | string   | Current status of the release |
| chart        | string   | Name of the Helm chart |
| chartVersion | string   | Version of the Helm chart |
| appVersion   | string   | Version of the application deployed by the chart |
| updated      | string   | Timestamp of the last update (ISO 8601) |
| description  | string   | Release description |
| labels       | object   | Labels attached to the release |

## Notes

- The list operation requires the cluster to have Helm installed and configured
- Release status can be one of: deployed, failed, pending-install, pending-upgrade, pending-rollback, uninstalled
- Chart versions follow Semantic Versioning (SemVer) format
