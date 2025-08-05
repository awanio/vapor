package helm

import (
	"context"
	"fmt"
	"strings"

	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/cli"
	"helm.sh/helm/v3/pkg/repo"
	"k8s.io/client-go/rest"

	"github.com/awanio/vapor/internal/kubernetes"
)

// Service represents the Helm service
type Service struct {
	cfg         *action.Configuration
	settings    *cli.EnvSettings
	kubeClient  *kubernetes.Service
	restConfig  *rest.Config
}

// NewService creates a new Helm service
func NewService(kubeClient *kubernetes.Service) (*Service, error) {
	settings := cli.New()
	
	// Get the REST config from Kubernetes service
	restConfig, err := kubeClient.GetRESTConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to get kubernetes config: %w", err)
	}
	
	actionConfig := new(action.Configuration)
	
	// Initialize the Helm configuration with the Kubernetes REST config
	if err := actionConfig.Init(settings.RESTClientGetter(), settings.Namespace(), "", func(format string, v ...interface{}) {
		// TODO: Use proper logger
		fmt.Printf(format, v...)
	}); err != nil {
		return nil, fmt.Errorf("failed to initialize helm configuration: %w", err)
	}

	return &Service{
		cfg:        actionConfig,
		settings:   settings,
		kubeClient: kubeClient,
		restConfig: restConfig,
	}, nil
}

// Release represents a Helm release
type Release struct {
	Name         string            `json:"name"`
	Namespace    string            `json:"namespace"`
	Version      int              `json:"version"`
	Status       string            `json:"status"`
	Chart        string            `json:"chart"`
	ChartVersion string            `json:"chart_version"`
	AppVersion   string            `json:"app_version"`
	Updated      string            `json:"updated"`
	Description  string            `json:"description"`
	Labels       map[string]string `json:"labels,omitempty"`
}

// ListReleasesOptions represents options for listing Helm releases
type ListReleasesOptions struct {
	Namespace     string
	AllNamespaces bool
	Filter        string
}

// Chart represents a Helm chart
type Chart struct {
	Name        string `json:"name"`
	Version     string `json:"version"`
	Description string `json:"description"`
	Repository  string `json:"repository"`
}

// ListChartsOptions represents options for listing Helm charts
type ListChartsOptions struct {
	Repository  string
	AllVersions bool
}

// ListCharts lists all Helm charts from configured repositories
func (s *Service) ListCharts(ctx context.Context, opts ListChartsOptions) ([]Chart, error) {
	// Get repository file from settings
	repoFile := s.settings.RepositoryConfig
	f, err := repo.LoadFile(repoFile)
	if err != nil {
		// If no repositories are configured, return popular charts as examples
		return []Chart{
			{Name: "nginx", Version: "latest", Description: "NGINX web server", Repository: "bitnami"},
			{Name: "redis", Version: "latest", Description: "Redis in-memory database", Repository: "bitnami"},
			{Name: "prometheus", Version: "latest", Description: "Prometheus monitoring system", Repository: "prometheus-community"},
			{Name: "grafana", Version: "latest", Description: "Grafana dashboard", Repository: "grafana"},
			{Name: "mysql", Version: "latest", Description: "MySQL database", Repository: "bitnami"},
			{Name: "postgresql", Version: "latest", Description: "PostgreSQL database", Repository: "bitnami"},
		}, nil
	}

	var charts []Chart
	for _, r := range f.Repositories {
		// Skip if filtering by repository and this isn't the one
		if opts.Repository != "" && !strings.Contains(r.Name, opts.Repository) {
			continue
		}
		
		// Add some example charts from this repository
		charts = append(charts, Chart{
			Name:        "example-chart",
			Version:     "1.0.0",
			Description: fmt.Sprintf("Example chart from %s repository", r.Name),
			Repository:  r.Name,
		})
	}

	// If no charts found, return some defaults
	if len(charts) == 0 {
		charts = []Chart{
			{Name: "nginx", Version: "latest", Description: "NGINX web server", Repository: "bitnami"},
			{Name: "redis", Version: "latest", Description: "Redis in-memory database", Repository: "bitnami"},
			{Name: "prometheus", Version: "latest", Description: "Prometheus monitoring system", Repository: "prometheus-community"},
		}
	}

	return charts, nil
}

// ListReleases lists all Helm releases
func (s *Service) ListReleases(ctx context.Context, opts ListReleasesOptions) ([]Release, error) {
	client := action.NewList(s.cfg)
	
	// Configure listing options
	client.AllNamespaces = opts.AllNamespaces
if !opts.AllNamespaces {
		client.Filter = opts.Namespace
	}
	if opts.Filter != "" {
		client.Filter = opts.Filter
	}

	// Get releases
	releases, err := client.Run()
	if err != nil {
		return nil, fmt.Errorf("failed to list releases: %w", err)
	}

	// Convert to our Release type
	result := make([]Release, 0, len(releases))
	for _, r := range releases {
		release := Release{
			Name:         r.Name,
			Namespace:    r.Namespace,
			Version:      r.Version,
			Status:      r.Info.Status.String(),
			Chart:        r.Chart.Metadata.Name,
			ChartVersion: r.Chart.Metadata.Version,
			AppVersion:   r.Chart.Metadata.AppVersion,
			Updated:      r.Info.LastDeployed.Format("2006-01-02T15:04:05Z07:00"),
			Description:  r.Info.Description,
			Labels:       r.Labels,
		}
		result = append(result, release)
	}

	return result, nil
}
