#!/bin/bash

# Script to download technology icons from Simple Icons
# Simple Icons provides SVG icons for many technology brands

ICONS_DIR="../public/icons/tech"
SIMPLE_ICONS_BASE="https://cdn.jsdelivr.net/npm/simple-icons@latest/icons"

# Create directory if it doesn't exist
mkdir -p "$ICONS_DIR"

# List of icons to download
# Format: "filename:simple-icons-name"
ICONS=(
  "kubernetes:kubernetes"
  "ansible:ansible"
  "helm:helm"
  "docker:docker"
  "jenkins:jenkins"
  "gitlab:gitlab"
  "github:github"
  "prometheus:prometheus"
  "grafana:grafana"
  "vault:vault"
  "consul:consul"
  "linux:linux"
  "go:go"
  "git:git"
  "vscode:visualstudiocode"
  "vim:vim"
)

echo "Downloading technology icons..."

for icon_pair in "${ICONS[@]}"; do
  IFS=':' read -r filename simple_name <<< "$icon_pair"
  
  echo "Downloading $filename.svg..."
  
  # Download the icon
  curl -s -o "$ICONS_DIR/$filename.svg" "$SIMPLE_ICONS_BASE/$simple_name.svg"
  
  if [ $? -eq 0 ] && [ -f "$ICONS_DIR/$filename.svg" ]; then
    # Add currentColor to make the icon theme-aware
    # This allows the icon to inherit the text color from its parent
    sed -i '' 's/fill="[^"]*"/fill="currentColor"/g' "$ICONS_DIR/$filename.svg" 2>/dev/null || \
    sed -i 's/fill="[^"]*"/fill="currentColor"/g' "$ICONS_DIR/$filename.svg" 2>/dev/null
    
    echo "✓ Downloaded $filename.svg"
  else
    echo "✗ Failed to download $filename.svg"
  fi
done

echo ""
echo "Icons downloaded to: $ICONS_DIR"
echo ""
echo "To use these icons in your components:"
echo "  import { icon } from '../utils/icons';"
echo "  \${icon('kubernetes', { size: 'md' })}"
echo ""
echo "Or directly in HTML:"
echo "  <img src=\"/icons/tech/kubernetes.svg\" class=\"w-6 h-6\" />"
