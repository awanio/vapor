package config

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
	"time"
	
	"github.com/awanio/vapor/internal/libvirt"
)

// Config represents the application configuration
type Config struct {
	Port       string `yaml:"port"`
	AppDir     string `yaml:"appdir"`
	LibvirtURI string `yaml:"libvirt_uri,omitempty"`
	Console    ConsoleSettings `yaml:"console,omitempty"`
}

// Default configuration values
var defaultConfig = Config{
	Port:   "8080",
	AppDir: "/var/lib/vapor",
}

// Load loads the configuration from file, environment variables, and command-line flags
// Priority order (highest to lowest): command-line flags > environment variables > config file > defaults
func Load() (*Config, error) {
	// Start with default configuration
	config := defaultConfig

	// Define command-line flags
	var (
		configFile = flag.String("config", "", "Path to configuration file (can also be set via VAPOR_CONFIG env var)")
		port       = flag.String("port", "", "Server port")
		appDir     = flag.String("appdir", "", "Application data directory")
	)
	flag.Parse()

	// Check for config file from environment variable if not provided via flag
	configPath := *configFile
	if configPath == "" {
		if envConfig := os.Getenv("VAPOR_CONFIG"); envConfig != "" {
			configPath = envConfig
		}
	}

	// If no config file specified, try to find vapor.conf in common locations
	if configPath == "" {
		configPath = findConfigFile()
	}

	// Load configuration from file if it exists
	if configPath != "" {
		if err := loadFromFile(configPath, &config); err != nil {
			// Log warning but continue with other sources
			fmt.Fprintf(os.Stderr, "Warning: Failed to load config file %s: %v\n", configPath, err)
		} else {
			fmt.Printf("Loaded configuration from %s\n", configPath)
		}
	}

	// Override with environment variables
	if envPort := os.Getenv("VAPOR_PORT"); envPort != "" {
		config.Port = envPort
	}
	if envAppDir := os.Getenv("VAPOR_APPDIR"); envAppDir != "" {
		config.AppDir = envAppDir
	}

	// Override with command-line flags (highest priority)
	if *port != "" {
		config.Port = *port
	}
	if *appDir != "" {
		config.AppDir = *appDir
	}

	// Validate configuration
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}

	// Ensure AppDir exists
	if err := os.MkdirAll(config.AppDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create app directory %s: %w", config.AppDir, err)
	}

	return &config, nil
}

// loadFromFile loads configuration from a YAML file
func loadFromFile(path string, config *Config) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("failed to read config file: %w", err)
	}

	if err := yaml.Unmarshal(data, config); err != nil {
		return fmt.Errorf("failed to parse config file: %w", err)
	}

	return nil
}

// findConfigFile searches for vapor.conf in common locations
func findConfigFile() string {
	// Search paths in order of priority
	searchPaths := []string{
		"./vapor.conf",                    // Current directory
		"./config/vapor.conf",              // Config subdirectory
		"/etc/vapor/vapor.conf",            // System config directory
		"/usr/local/etc/vapor/vapor.conf", // Alternative system config
		"$HOME/.config/vapor/vapor.conf",  // User config directory
		"$HOME/.vapor.conf",                // User home directory
	}

	for _, path := range searchPaths {
		// Expand environment variables
		expandedPath := os.ExpandEnv(path)
		
		// Check if file exists and is readable
		if info, err := os.Stat(expandedPath); err == nil && !info.IsDir() {
			return expandedPath
		}
	}

	return ""
}

// Validate validates the configuration
func (c *Config) Validate() error {
	// Validate port
	if c.Port == "" {
		return fmt.Errorf("port cannot be empty")
	}

	// Validate AppDir
	if c.AppDir == "" {
		return fmt.Errorf("appdir cannot be empty")
	}

	// Ensure AppDir is an absolute path
	if !filepath.IsAbs(c.AppDir) {
		absPath, err := filepath.Abs(c.AppDir)
		if err != nil {
			return fmt.Errorf("failed to resolve appdir path: %w", err)
		}
		c.AppDir = absPath
	}

	return nil
}

// GetServerAddr returns the server address in the format ":port"
func (c *Config) GetServerAddr() string {
	// If port already contains a colon (e.g., ":8080" or "0.0.0.0:8080"), return as-is
	if len(c.Port) > 0 && c.Port[0] == ':' {
		return c.Port
	}
	
	// Check if it's a full address with host
	for _, ch := range c.Port {
		if ch == ':' {
			return c.Port
		}
	}
	
	// Otherwise, prepend colon for port-only format
	return ":" + c.Port
}

// GetAnsibleDir returns the Ansible directory path
func (c *Config) GetAnsibleDir() string {
	return filepath.Join(c.AppDir, "ansible")
}

// GetLibvirtURI returns the libvirt connection URI
func (c *Config) GetLibvirtURI() string {
	if c.LibvirtURI != "" {
		return c.LibvirtURI
	}
	// Check environment variable
	if uri := os.Getenv("LIBVIRT_URI"); uri != "" {
		return uri
	}
	// Default to local system connection
	return "qemu:///system"
}

// Print prints the configuration to stdout (for debugging)
func (c *Config) Print() {
	fmt.Printf("Configuration:\n")
	fmt.Printf("  Port: %s\n", c.Port)
	fmt.Printf("  AppDir: %s\n", c.AppDir)
	fmt.Printf("  Server Address: %s\n", c.GetServerAddr())
	fmt.Printf("  Ansible Directory: %s\n", c.GetAnsibleDir())
	fmt.Printf("  Libvirt URI: %s\n", c.GetLibvirtURI())
}

// Save saves the configuration to a file
func (c *Config) Save(path string) error {
	// Ensure the directory exists
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	// Marshal configuration to YAML
	data, err := yaml.Marshal(c)
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	// Write to file
	if err := os.WriteFile(path, data, 0644); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	return nil
}

// GenerateExample generates an example configuration file
func GenerateExample(path string) error {
	exampleConfig := &Config{
		Port:   "8080",
		AppDir: "/var/lib/vapor",
	}

	// Add header comment
	header := `# Vapor Configuration File
# 
# This file configures the Vapor system management API server.
# Settings can be overridden using environment variables or command-line flags.
#
# Environment variables:
#   VAPOR_CONFIG - Path to this configuration file
#   VAPOR_PORT   - Server port
#   VAPOR_APPDIR - Application data directory
#
# Command-line flags:
#   --config <path>  - Path to configuration file
#   --port <port>    - Server port
#   --appdir <path>  - Application data directory

`

	data, err := yaml.Marshal(exampleConfig)
	if err != nil {
		return fmt.Errorf("failed to marshal example config: %w", err)
	}

	fullContent := []byte(header + string(data))

	// Ensure the directory exists
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	if err := os.WriteFile(path, fullContent, 0644); err != nil {
		return fmt.Errorf("failed to write example config file: %w", err)
	}

	return nil
}

// ConsoleSettings represents console proxy configuration
type ConsoleSettings struct {
MaxConnectionsPerVM int      `yaml:"max_connections_per_vm,omitempty"`
MaxTotalConnections int      `yaml:"max_total_connections,omitempty"`
TokenTTL            string   `yaml:"token_ttl,omitempty"`           // e.g., "5m"
ConnectionTimeout   string   `yaml:"connection_timeout,omitempty"`  // e.g., "30s"
IdleTimeout         string   `yaml:"idle_timeout,omitempty"`        // e.g., "10m"
AllowedHosts        []string `yaml:"allowed_hosts,omitempty"`
EnableTLS           bool     `yaml:"enable_tls,omitempty"`
BufferSize          int      `yaml:"buffer_size,omitempty"`         // in KB
CleanupInterval     string   `yaml:"cleanup_interval,omitempty"`    // e.g., "1m"
}

// GetConsoleConfig converts ConsoleSettings to libvirt.ConsoleConfig
func (c *Config) GetConsoleConfig() (*libvirt.ConsoleConfig, error) {
config := libvirt.DefaultConsoleConfig()

if c.Console.MaxConnectionsPerVM > 0 {
config.MaxConnectionsPerVM = c.Console.MaxConnectionsPerVM
}
if c.Console.MaxTotalConnections > 0 {
config.MaxTotalConnections = c.Console.MaxTotalConnections
}
if c.Console.TokenTTL != "" {
duration, err := time.ParseDuration(c.Console.TokenTTL)
if err != nil {
return nil, fmt.Errorf("invalid token_ttl: %w", err)
}
config.TokenTTL = duration
}
if c.Console.ConnectionTimeout != "" {
duration, err := time.ParseDuration(c.Console.ConnectionTimeout)
if err != nil {
return nil, fmt.Errorf("invalid connection_timeout: %w", err)
}
config.ConnectionTimeout = duration
}
if c.Console.IdleTimeout != "" {
duration, err := time.ParseDuration(c.Console.IdleTimeout)
if err != nil {
return nil, fmt.Errorf("invalid idle_timeout: %w", err)
}
config.IdleTimeout = duration
}
if len(c.Console.AllowedHosts) > 0 {
config.AllowedHosts = c.Console.AllowedHosts
}
config.EnableTLS = c.Console.EnableTLS
if c.Console.BufferSize > 0 {
config.BufferSize = c.Console.BufferSize * 1024 // Convert KB to bytes
}
if c.Console.CleanupInterval != "" {
duration, err := time.ParseDuration(c.Console.CleanupInterval)
if err != nil {
return nil, fmt.Errorf("invalid cleanup_interval: %w", err)
}
config.CleanupInterval = duration
}

return config, nil
}
