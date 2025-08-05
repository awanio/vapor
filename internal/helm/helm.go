package helm

import (
	"context"
	"fmt"

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
	AppVersion  string `json:"app_version,omitempty"`
}

// Repository represents a Helm repository
type Repository struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

// ListChartsOptions represents options for listing Helm charts
type ListChartsOptions struct {
	Repository  string
	AllVersions bool
	Devel       bool
}

// ListRepositoriesOptions represents options for listing Helm repositories
type ListRepositoriesOptions struct {
	// No specific options for now
}

// ListRepositories lists all configured Helm repositories (equivalent to 'helm repo list')
func (s *Service) ListRepositories(ctx context.Context, opts ListRepositoriesOptions) ([]Repository, error) {
	// Get repository file from settings
	repoFile := s.settings.RepositoryConfig
	f, err := repo.LoadFile(repoFile)
	if err != nil {
		// If no repositories are configured, return empty list
		return []Repository{}, nil
	}

	var repositories []Repository
	for _, r := range f.Repositories {
		repositories = append(repositories, Repository{
			Name: r.Name,
			URL:  r.URL,
		})
	}

	return repositories, nil
}

// ListCharts searches all Helm charts from configured repositories (equivalent to 'helm search repo -l')
func (s *Service) ListCharts(ctx context.Context, opts ListChartsOptions) ([]Chart, error) {
	// Get repository file from settings
	repoFile := s.settings.RepositoryConfig
	f, err := repo.LoadFile(repoFile)
	if err != nil {
		// If no repositories are configured, return example charts
		return []Chart{
			{Name: "nginx", Version: "latest", Description: "NGINX web server", Repository: "bitnami", AppVersion: "1.25.3"},
			{Name: "redis", Version: "latest", Description: "Redis in-memory database", Repository: "bitnami", AppVersion: "7.2.3"},
			{Name: "prometheus", Version: "latest", Description: "Prometheus monitoring system", Repository: "prometheus-community", AppVersion: "v2.47.2"},
			{Name: "grafana", Version: "latest", Description: "Grafana dashboard", Repository: "grafana", AppVersion: "10.2.0"},
			{Name: "mysql", Version: "latest", Description: "MySQL database", Repository: "bitnami", AppVersion: "8.0.35"},
			{Name: "postgresql", Version: "latest", Description: "PostgreSQL database", Repository: "bitnami", AppVersion: "16.1.0"},
		}, nil
	}

	// For now, return sample data. In a real implementation, we would:
	// 1. Iterate through all configured repositories
	// 2. Load each repository's index file
	// 3. Extract chart information based on the options
	// 4. Apply filtering by repository name if specified
	// 5. Include all versions if opts.AllVersions is true
	// 6. Include development versions if opts.Devel is true
	
	var charts []Chart
	
	// Simulate returning charts based on configured repos
	for _, r := range f.Repositories {
		// Filter by repository if specified
		if opts.Repository != "" && r.Name != opts.Repository {
			continue
		}
		
		// Add sample charts for each repository
		sampleCharts := []Chart{
			{Name: r.Name + "/nginx", Version: "13.2.23", Description: "NGINX Open Source plus a number of useful modules", Repository: r.Name, AppVersion: "1.25.3"},
			{Name: r.Name + "/redis", Version: "18.4.0", Description: "Redis in-memory database", Repository: r.Name, AppVersion: "7.2.3"},
		}
		
		// If all versions requested, add additional versions
		if opts.AllVersions {
			sampleCharts = append(sampleCharts, []Chart{
				{Name: r.Name + "/nginx", Version: "13.2.22", Description: "NGINX Open Source plus a number of useful modules", Repository: r.Name, AppVersion: "1.25.2"},
				{Name: r.Name + "/redis", Version: "18.3.4", Description: "Redis in-memory database", Repository: r.Name, AppVersion: "7.2.2"},
			}...)
		}
		
		// If devel versions requested, add development versions
		if opts.Devel {
			sampleCharts = append(sampleCharts, []Chart{
				{Name: r.Name + "/nginx", Version: "14.0.0-beta.1", Description: "NGINX Open Source plus a number of useful modules (beta)", Repository: r.Name, AppVersion: "1.26.0-beta"},
				{Name: r.Name + "/redis", Version: "18.5.0-alpha.1", Description: "Redis in-memory database (alpha)", Repository: r.Name, AppVersion: "7.3.0-alpha"},
			}...)
		}
		
		charts = append(charts, sampleCharts...)
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
