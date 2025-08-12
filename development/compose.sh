#!/bin/bash

# Universal Compose Wrapper Script
# Detects and uses the appropriate compose tool based on what's available
# Supports: docker-compose, docker compose, nerdctl compose, podman-compose

set -e

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
COMPOSE_CMD=""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if we're in a Colima environment
is_colima_running() {
    if command_exists colima; then
        colima status 2>/dev/null | grep -q "Running" && return 0
    fi
    return 1
}

# Function to detect the best available compose tool
detect_compose_tool() {
    # Check if we're using Colima with containerd
    if is_colima_running; then
        RUNTIME=$(colima status 2>/dev/null | grep -i runtime | awk '{print $2}')
        if [[ "$RUNTIME" == "containerd" ]] && command_exists nerdctl; then
            echo -e "${GREEN}Detected Colima with containerd runtime, using nerdctl compose${NC}"
            COMPOSE_CMD="nerdctl compose"
            return 0
        fi
    fi
    
    # Check for Docker Compose v2 (docker compose)
    if command_exists docker && docker compose version >/dev/null 2>&1; then
        echo -e "${GREEN}Using Docker Compose v2${NC}"
        COMPOSE_CMD="docker compose"
        return 0
    fi
    
    # Check for Docker Compose v1 (docker-compose)
    if command_exists docker-compose; then
        echo -e "${GREEN}Using Docker Compose v1${NC}"
        COMPOSE_CMD="docker-compose"
        return 0
    fi
    
    # Check for nerdctl compose
    if command_exists nerdctl; then
        if nerdctl compose version >/dev/null 2>&1; then
            echo -e "${GREEN}Using nerdctl compose${NC}"
            COMPOSE_CMD="nerdctl compose"
            return 0
        fi
    fi
    
    # Check for podman-compose
    if command_exists podman-compose; then
        echo -e "${GREEN}Using podman-compose${NC}"
        COMPOSE_CMD="podman-compose"
        return 0
    fi
    
    # No suitable tool found
    echo -e "${RED}Error: No suitable compose tool found!${NC}"
    echo "Please install one of the following:"
    echo "  - Docker Desktop (includes docker compose)"
    echo "  - Docker Compose standalone"
    echo "  - nerdctl with compose support"
    echo "  - podman-compose"
    echo ""
    echo "For Colima users with containerd:"
    echo "  brew install nerdctl"
    echo "  colima start --runtime containerd"
    exit 1
}

# Function to show usage
usage() {
    cat << EOF
Usage: $0 [COMMAND] [OPTIONS]

A universal wrapper for Docker Compose-compatible tools.
Automatically detects and uses the appropriate tool based on your environment.

Supported backends:
  - Docker Compose (v1 and v2)
  - nerdctl compose (for containerd/Colima users)
  - podman-compose

Common commands:
  up       Create and start containers
  down     Stop and remove containers
  ps       List containers
  logs     View output from containers
  build    Build or rebuild services
  exec     Execute a command in a running container
  stop     Stop services
  start    Start services
  restart  Restart services

Examples:
  $0 up -d              # Start services in detached mode
  $0 down              # Stop and remove containers
  $0 logs -f vapor-api # Follow logs for vapor-api service
  $0 exec vapor-api sh # Open shell in vapor-api container

Environment variables:
  COMPOSE_FILE    Specify an alternate compose file (default: docker-compose.yml)
  COMPOSE_BACKEND Force a specific backend (docker, nerdctl, podman)

EOF
}

# Main script logic
main() {
    # Check for help flag
    if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]] || [[ -z "$1" ]]; then
        usage
        exit 0
    fi
    
    # Allow forcing a specific backend
    if [[ -n "$COMPOSE_BACKEND" ]]; then
        case "$COMPOSE_BACKEND" in
            docker)
                if docker compose version >/dev/null 2>&1; then
                    COMPOSE_CMD="docker compose"
                else
                    COMPOSE_CMD="docker-compose"
                fi
                ;;
            nerdctl)
                COMPOSE_CMD="nerdctl compose"
                ;;
            podman)
                COMPOSE_CMD="podman-compose"
                ;;
            *)
                echo -e "${RED}Unknown COMPOSE_BACKEND: $COMPOSE_BACKEND${NC}"
                exit 1
                ;;
        esac
        echo -e "${YELLOW}Using forced backend: $COMPOSE_CMD${NC}"
    else
        # Auto-detect the best tool
        detect_compose_tool
    fi
    
    # Special handling for certain commands based on the backend
    case "$COMPOSE_CMD" in
        "nerdctl compose")
            # nerdctl might need special namespace handling
            if [[ "$1" == "up" ]] && [[ ! " $@ " =~ " --namespace " ]]; then
                # Use default namespace if not specified
                export COMPOSE_NAMESPACE="${COMPOSE_NAMESPACE:-default}"
            fi
            ;;
    esac
    
    # Check if compose file exists
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        echo -e "${RED}Error: Compose file '$COMPOSE_FILE' not found!${NC}"
        exit 1
    fi
    
    # Execute the compose command
    echo -e "${YELLOW}Running: $COMPOSE_CMD -f $COMPOSE_FILE $@${NC}"
    $COMPOSE_CMD -f "$COMPOSE_FILE" "$@"
}

# Run main function with all arguments
main "$@"
