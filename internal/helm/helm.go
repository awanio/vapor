package helm

import (
	"context"
	"fmt"

	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/cli"

	"github.com/vapor/system-api/internal/kubernetes"
)

// Service represents the Helm service
type Service struct {
	cfg         *action.Configuration
	settings    *cli.EnvSettings
	kubeClient  *kubernetes.Service
}

// NewService creates a new Helm service
func NewService(kubeClient *kubernetes.Service) (*Service, error) {
	settings := cli.New()
	
	actionConfig := new(action.Configuration)
	
	// Initialize the Helm configuration
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

// ListChartsOptions represents options for listing Helm charts
type ListChartsOptions struct {
	Repository  string
	AllVersions bool
}

// ListCharts lists all Helm charts
func (s *Service) ListCharts(ctx context.Context, opts ListChartsOptions) ([]string, error) {
	// Simulate listing charts for demo purposes
	// TODO: Implement using Helm SDK
	return []string{"nginx", "redis", "prometheus"}, nil
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
