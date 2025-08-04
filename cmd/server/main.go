package main

import (
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/vapor/system-api/internal/kubernetes"
	"github.com/vapor/system-api/internal/helm"
)

func main() {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// Initialize Kubernetes client
	kubeClient, err := kubernetes.NewService()
	if err != nil {
		log.Fatalf("Failed to create kubernetes client: %v", err)
	}

	// Initialize Helm service
	helmService, err := helm.NewService(kubeClient)
	if err != nil {
		log.Fatalf("Failed to create helm service: %v", err)
	}

	// Create Helm handler
	helmHandler := helm.NewHandler(helmService)
	helmHandler.RegisterRoutes(r)

	// Start server
	if err := http.ListenAndServe(":8080", r); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

