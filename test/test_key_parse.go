package main

import (
	"encoding/pem"
	"fmt"
	"io/ioutil"
	"os"
	"strings"

	"golang.org/x/crypto/ssh"
)

func main() {
	// Read the private key
	keyPath := os.Getenv("HOME") + "/.ssh/id_rsa"
	privateKeyBytes, err := ioutil.ReadFile(keyPath)
	if err != nil {
		fmt.Printf("Error reading private key: %v\n", err)
		return
	}

	// Try to parse the private key
	block, _ := pem.Decode(privateKeyBytes)
	if block == nil {
		fmt.Println("Failed to decode PEM block")
		return
	}
	fmt.Printf("PEM block type: %s\n", block.Type)

	// Parse the private key
	signer, err := ssh.ParsePrivateKey(privateKeyBytes)
	if err != nil {
		fmt.Printf("Error parsing private key: %v\n", err)
		return
	}

	// Get the public key from the private key
	publicKey := signer.PublicKey()
	publicKeyStr := string(ssh.MarshalAuthorizedKey(publicKey))
	fmt.Printf("Derived public key:\n%s\n", strings.TrimSpace(publicKeyStr))

	// Read the actual public key file
	pubKeyPath := keyPath + ".pub"
	actualPubKey, err := ioutil.ReadFile(pubKeyPath)
	if err != nil {
		fmt.Printf("Error reading public key: %v\n", err)
		return
	}
	fmt.Printf("Actual public key:\n%s\n", strings.TrimSpace(string(actualPubKey)))

	// Compare them
	if strings.TrimSpace(publicKeyStr) == strings.TrimSpace(string(actualPubKey)) {
		fmt.Println("\n✓ Keys match!")
	} else {
		fmt.Println("\n✗ Keys don't match!")
	}

	// Read authorized_keys
	authKeysPath := os.Getenv("HOME") + "/.ssh/authorized_keys"
	authKeys, err := ioutil.ReadFile(authKeysPath)
	if err != nil {
		fmt.Printf("Error reading authorized_keys: %v\n", err)
		return
	}

	lines := strings.Split(string(authKeys), "\n")
	fmt.Printf("\nAuthorized keys file has %d lines\n", len(lines))
	
	for i, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		fmt.Printf("Key %d (first 60 chars): %s...\n", i+1, line[:min(60, len(line))])
		
		if strings.TrimSpace(line) == strings.TrimSpace(publicKeyStr) {
			fmt.Printf("  ✓ This matches our derived public key!\n")
		}
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
