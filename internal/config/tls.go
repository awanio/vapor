package config

import (
"crypto/ecdsa"
"crypto/elliptic"
"crypto/rand"
"crypto/x509"
"crypto/x509/pkix"
"encoding/pem"
"fmt"
"math/big"
"net"
"os"
"time"
)

// EnsureTLSCertificates ensures that TLS certificate and key files exist.
// If they don't exist, it generates self-signed certificates.
func (c *Config) EnsureTLSCertificates() error {
certFile := c.GetTLSCertFile()
keyFile := c.GetTLSKeyFile()
certDir := c.GetTLSCertDir()

// Check if both files exist
if fileExists(certFile) && fileExists(keyFile) {
return nil
}

// Create cert directory if it doesn't exist
if err := os.MkdirAll(certDir, 0755); err != nil {
return fmt.Errorf("failed to create cert directory: %w", err)
}

// Generate self-signed certificate
return generateSelfSignedCert(certFile, keyFile)
}

// generateSelfSignedCert generates a self-signed TLS certificate
func generateSelfSignedCert(certFile, keyFile string) error {
// Generate private key
privateKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
if err != nil {
return fmt.Errorf("failed to generate private key: %w", err)
}

// Generate serial number
serialNumber, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 128))
if err != nil {
return fmt.Errorf("failed to generate serial number: %w", err)
}

// Get hostname
hostname, err := os.Hostname()
if err != nil {
hostname = "localhost"
}

// Create certificate template
template := x509.Certificate{
SerialNumber: serialNumber,
Subject: pkix.Name{
Organization: []string{"Vapor"},
CommonName:   hostname,
},
NotBefore:             time.Now(),
NotAfter:              time.Now().Add(3 * 365 * 24 * time.Hour), // 3 years
KeyUsage:              x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
BasicConstraintsValid: true,
DNSNames:              []string{hostname, "localhost"},
IPAddresses:           []net.IP{net.ParseIP("127.0.0.1"), net.ParseIP("::1")},
}

// Get local IP addresses
if addrs, err := net.InterfaceAddrs(); err == nil {
for _, addr := range addrs {
if ipNet, ok := addr.(*net.IPNet); ok && !ipNet.IP.IsLoopback() {
if ipNet.IP.To4() != nil || ipNet.IP.To16() != nil {
template.IPAddresses = append(template.IPAddresses, ipNet.IP)
}
}
}
}

// Create self-signed certificate
certBytes, err := x509.CreateCertificate(rand.Reader, &template, &template, &privateKey.PublicKey, privateKey)
if err != nil {
return fmt.Errorf("failed to create certificate: %w", err)
}

// Write certificate to file
certOut, err := os.Create(certFile)
if err != nil {
return fmt.Errorf("failed to create cert file: %w", err)
}
defer certOut.Close()

if err := pem.Encode(certOut, &pem.Block{Type: "CERTIFICATE", Bytes: certBytes}); err != nil {
return fmt.Errorf("failed to write cert: %w", err)
}

// Write private key to file
keyOut, err := os.OpenFile(keyFile, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0600)
if err != nil {
return fmt.Errorf("failed to create key file: %w", err)
}
defer keyOut.Close()

privBytes, err := x509.MarshalECPrivateKey(privateKey)
if err != nil {
return fmt.Errorf("failed to marshal private key: %w", err)
}

if err := pem.Encode(keyOut, &pem.Block{Type: "EC PRIVATE KEY", Bytes: privBytes}); err != nil {
return fmt.Errorf("failed to write key: %w", err)
}

return nil
}

// fileExists checks if a file exists
func fileExists(path string) bool {
_, err := os.Stat(path)
return err == nil
}
