package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/awanio/vapor/internal/kubernetes"
)

func main() {
	// Create a new Kubernetes service
	service, err := kubernetes.NewService()
	if err != nil {
		log.Fatalf("Failed to create Kubernetes service: %v", err)
	}

	// Get detailed information about a deployment
	// Replace with your actual namespace and deployment name
	namespace := "default"
	deploymentName := "nginx-deployment"

	detail, err := service.GetDeploymentDetail(context.Background(), namespace, deploymentName)
	if err != nil {
		log.Fatalf("Failed to get deployment detail: %v", err)
	}

	// Pretty print the deployment detail
	jsonData, err := json.MarshalIndent(detail, "", "  ")
	if err != nil {
		log.Fatalf("Failed to marshal deployment detail: %v", err)
	}

	fmt.Printf("Deployment Detail for %s/%s:\n", namespace, deploymentName)
	fmt.Println(string(jsonData))

	// Example of accessing specific fields
	fmt.Println("\n--- Key Information ---")
	fmt.Printf("Name: %s\n", detail.Name)
	fmt.Printf("Namespace: %s\n", detail.Namespace)
	fmt.Printf("Ready Replicas: %d/%d\n", detail.Status.ReadyReplicas, detail.Status.Replicas)
	fmt.Printf("Strategy Type: %s\n", detail.Spec.Strategy.Type)
	fmt.Printf("Age: %s\n", detail.Age)

	// List containers
	fmt.Println("\n--- Containers ---")
	for _, container := range detail.Spec.Template.Spec.Containers {
		fmt.Printf("- %s (Image: %s)\n", container.Name, container.Image)
		if len(container.Ports) > 0 {
			fmt.Printf("  Ports: ")
			for i, port := range container.Ports {
				if i > 0 {
					fmt.Printf(", ")
				}
				fmt.Printf("%d/%s", port.ContainerPort, port.Protocol)
			}
			fmt.Println()
		}
	}

	// Show conditions
	fmt.Println("\n--- Conditions ---")
	for _, condition := range detail.Status.Conditions {
		fmt.Printf("- %s: %s (Reason: %s)\n", 
			condition.Type, 
			condition.Status, 
			condition.Reason)
	}

	// Show volumes if any
	if len(detail.Spec.Template.Spec.Volumes) > 0 {
		fmt.Println("\n--- Volumes ---")
		for i := range detail.Spec.Template.Spec.Volumes {
			// Volumes are interface{} type, so we need type assertion
			fmt.Printf("- Volume %d info available (raw data)\n", i+1)
		}
	}
}
