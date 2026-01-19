#!/bin/bash
set -e

# Vapor Install Script
# Revamped to use Ansible as the installation engine

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper for prompts
prompt_confirmation() {
    local question="$1"
    local default="$2"
    local response
    
    if [ -n "$3" ] && [ -n "${!3}" ]; then
        # Check env var if present
        if [[ "${!3}" =~ ^[Yy] ]]; then return 0; else return 1; fi
    fi

    # Determine default prompt
    local prompt_str="[$default]"
    
    echo -ne "$question $prompt_str: "
    read response
    response=${response:-$default}
    
    if [[ "$response" =~ ^[Yy] ]]; then
        return 0
    else
        return 1
    fi
}

prompt_value() {
    local question="$1"
    local default="$2"
    local var_name="$3"
    local response
    
    echo -ne "$question [$default]: "
    read response
    response=${response:-$default}
    
    # Export the variable
    export $var_name="$response"
}

select_option() {
    local prompt="$1"
    shift
    local options=("$@")
    local PS3="$prompt "
    
    select opt in "${options[@]}"; do
        if [ -n "$opt" ]; then
             echo "$opt"
             return 0
        else
             echo "Invalid option. Try again."
        fi
    done
}

# --- 1. Ansible Detection & Installation ---

echo -e "${GREEN}Checking installation prerequisites...${NC}"

OS_FAMILY=""
if [ -f /etc/debian_version ]; then
    OS_FAMILY="Debian"
elif [ -f /etc/redhat-release ]; then
    OS_FAMILY="RedHat"
else
    echo -e "${RED}Unsupported OS family. Only Debian and RedHat based systems are supported.${NC}"
    exit 1
fi

if ! command -v ansible-playbook &> /dev/null; then
    echo "Ansible is not installed."
    if prompt_confirmation "Ansible and libvirt-client are required. Install them now?" "y" "AUTO_INSTALL_DEPS"; then
        echo "Installing Ansible and dependencies..."
        if [ "$OS_FAMILY" == "Debian" ]; then
            sudo apt-get update
            sudo apt-get install -y ansible libvirt-clients python3
        elif [ "$OS_FAMILY" == "RedHat" ]; then
            # Attempt to install EPEL for Ansible if needed, simplistic approach
            sudo yum install -y epel-release || true
            sudo yum install -y ansible libvirt-client python3
        fi
    else
        echo -e "${RED}Installation aborted. Ansible is required.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}Ansible is already installed.${NC}"
fi

# Double check ansible availability
if ! command -v ansible-playbook &> /dev/null; then
    echo -e "${RED}Failed to install Ansible. Please install it manually and run this script again.${NC}"
    exit 1
fi

# --- 1.5 Prepare Playbooks (Fetch from Remote) ---
echo -e "${GREEN}Fetching installation playbooks...${NC}"
REPO_BASE="https://raw.githubusercontent.com/awanio/vapor/main"
CLONE_DIR="/tmp/vapor-installer-$$"
mkdir -p "$CLONE_DIR"

# List of files to download (relative to repo root)
FILES=(
    "ansible/playbooks/install_vapor_stack.yml"
    "ansible/playbooks/ansible.cfg"
    "ansible/playbooks/inventory.ini"
    "ansible/roles/common/tasks/main.yml"
    "ansible/roles/libvirt/tasks/main.yml"
    "ansible/roles/container_runtime/tasks/main.yml"
    "ansible/roles/container_runtime/handlers/main.yml"
    "ansible/roles/kubernetes/tasks/main.yml"
    "ansible/roles/helm/tasks/main.yml"
    "ansible/roles/vapor/tasks/main.yml"
    "ansible/roles/vapor/handlers/main.yml"
)

echo "Downloading Ansible files..."
for file in "${FILES[@]}"; do
    # Create directory structure
    dir=$(dirname "$file")
    mkdir -p "$CLONE_DIR/$dir"
    
    # Download file
    # Use -f to fail silently on server errors (404), -s for silent, -L for redirects
    # check for failure manually
    if ! curl -fsSL "$REPO_BASE/$file" -o "$CLONE_DIR/$file"; then
         echo -e "${RED}Error: Failed to download $file${NC}"
         echo -e "${YELLOW}Please ensure you are connected to the internet and the repository structure is correct.${NC}"
         rm -rf "$CLONE_DIR"
         exit 1
    fi
done

# Point to downloaded playbook
PLAYBOOK_DIR="$CLONE_DIR/ansible/playbooks"
PLAYBOOK_PATH="$PLAYBOOK_DIR/install_vapor_stack.yml"

if [ ! -f "$PLAYBOOK_PATH" ]; then
    echo -e "${RED}Error: Failed to find playbook at $PLAYBOOK_PATH${NC}"
    exit 1
fi

# --- 2. Component Selection ---

INSTALL_LIBVIRT="false"
INSTALL_DOCKER="false"
INSTALL_CONTAINERD="false"
INSTALL_K8S="false"
INSTALL_HELM="false"

# Variables for K8s
K8S_NODE_IP=""
K8S_NODE_ROLE="control-plane"
K8S_POD_CIDR="10.244.0.0/16"
K8S_SVC_CIDR="10.96.0.0/12"
K8S_CNI="flannel"

# Libvirt
if prompt_confirmation "Do you want to install Libvirt/KVM?" "y"; then
    INSTALL_LIBVIRT="true"
fi

# Container Runtime
if prompt_confirmation "Do you want to install a Container Runtime (Docker/Containerd)?" "y"; then
    # Choose runtime
    echo "Select Container Runtime:"
    RUNTIME=$(select_option "Select runtime:" "Docker" "Containerd")
    
    if [ "$RUNTIME" == "Docker" ]; then
        INSTALL_DOCKER="true"
    else
        INSTALL_CONTAINERD="true"
    fi
fi

# Kubernetes
if prompt_confirmation "Do you want to install Kubernetes?" "y"; then
    INSTALL_K8S="true"
    
    # Additional K8s Questions
    
    # 1. Node IP
    DEFAULT_IP=$(ip route get 1.2.3.4 | awk '{print $7}')
    prompt_value "Enter Node IP" "$DEFAULT_IP" "K8S_NODE_IP"
    
    # 2. Node Role
    echo "Select Node Role:"
    K8S_NODE_ROLE=$(select_option "Select role:" "control-plane" "worker")
    
    WORKER_NODES=()
    
    if [ "$K8S_NODE_ROLE" == "control-plane" ]; then
        # Ask to add worker nodes
        while prompt_confirmation "Do you want to add a worker node to this cluster?" "n"; do
             echo "--- Add Worker Node ---"
             prompt_value "Worker IP" "" "W_IP"
             prompt_value "SSH User" "root" "W_USER"
             prompt_value "SSH Private Key Path" "$HOME/.ssh/id_rsa" "W_KEY"
             
             if [ -z "$W_IP" ]; then
                 echo "IP is required."
                 continue
             fi
             
             WORKER_NODES+=("$W_IP|$W_USER|$W_KEY")
             echo "Worker $W_IP added."
        done
    fi

    # 3. Pod CIDR
    prompt_value "Enter Pod CIDR" "10.244.0.0/16" "K8S_POD_CIDR"
    
    # 4. Service CIDR
    prompt_value "Enter Service CIDR" "10.96.0.0/12" "K8S_SVC_CIDR"
    
    # 5. CNI
    echo "Select CNI Plugin:"
    CNI_CHOICE=$(select_option "Select CNI:" "Flannel (default)" "Calico" "Cilium")
    
    case "$CNI_CHOICE" in
        "Flannel (default)") K8S_CNI="flannel" ;;
        "Calico") K8S_CNI="calico" ;;
        "Cilium") K8S_CNI="cilium" ;;
    esac
fi

# Helm
if prompt_confirmation "Do you want to install Helm?" "y"; then
    INSTALL_HELM="true"
fi


# --- 3. Execution ---

# Generate Inventory
INVENTORY_FILE="$CLONE_DIR/ansible/playbooks/inventory.ini"
echo "[control_plane]" > "$INVENTORY_FILE"
# Localhost is always CP in this installer flow? 
# If user selected "worker", then localhost is a worker trying to join existing?
# The prompt "add another node to join to THIS new cluster" implies we are creating a cluster here.
# So if Role=control-plane, localhost is CP.
# If Role=worker, localhost is a worker (remote install logic doesn't apply to "adding workers" usually, but let's support the flow).

if [ "$K8S_NODE_ROLE" == "control-plane" ]; then
    echo "localhost ansible_connection=local node_role=control-plane" >> "$INVENTORY_FILE"
    
    if [ ${#WORKER_NODES[@]} -gt 0 ]; then
        echo -e "\n[workers]" >> "$INVENTORY_FILE"
        for worker in "${WORKER_NODES[@]}"; do
            IFS='|' read -r w_ip w_user w_key <<< "$worker"
            echo "$w_ip ansible_user=$w_user ansible_ssh_private_key_file=$w_key node_role=worker ansible_ssh_common_args='-o StrictHostKeyChecking=no'" >> "$INVENTORY_FILE"
        done
    fi
else
    # Localhost is a worker
    echo "localhost ansible_connection=local node_role=worker" >> "$INVENTORY_FILE"
    # We'd need join token/hash here if we were joining an existing cluster, but the script doesn't ask for it yet.
    # Assuming the user manually handles join or simply installs binaries.
    # But the prompt was about adding OTHER nodes to THIS one.
fi

echo -e "\n${GREEN}Starting Installation...${NC}"
echo "--------------------------------"
echo "Libvirt: $INSTALL_LIBVIRT"
echo "Docker: $INSTALL_DOCKER"
echo "Containerd: $INSTALL_CONTAINERD"
echo "Kubernetes: $INSTALL_K8S"
if [ "$INSTALL_K8S" == "true" ]; then
    echo "  - Role: $K8S_NODE_ROLE"
    echo "  - IP: $K8S_NODE_IP"
    echo "  - Pod CIDR: $K8S_POD_CIDR"
    echo "  - Service CIDR: $K8S_SVC_CIDR"
    echo "  - CNI: $K8S_CNI"
fi
echo "Helm: $INSTALL_HELM"
echo "--------------------------------"

if prompt_confirmation "Proceed with installation?" "y"; then
    # Playbook path is already set in PLAYBOOK_PATH
    
    # Build Extra Vars
    EXTRA_VARS="install_libvirt=$INSTALL_LIBVIRT install_docker=$INSTALL_DOCKER install_containerd=$INSTALL_CONTAINERD install_k8s=$INSTALL_K8S install_helm=$INSTALL_HELM"
    
    if [ "$INSTALL_K8S" == "true" ]; then
        EXTRA_VARS="$EXTRA_VARS k8s_version='1.28.0-00' pod_network_cidr='$K8S_POD_CIDR' service_cidr='$K8S_SVC_CIDR' cni_plugin='$K8S_CNI' node_role='$K8S_NODE_ROLE'"
    fi
    
    # Run Ansible
    # We must cd to the playbook directory so ansible.cfg is picked up
    cd "$PLAYBOOK_DIR"
    
    if ansible-playbook "install_vapor_stack.yml" --extra-vars "$EXTRA_VARS"; then
        echo -e "${GREEN}Installation completed successfully!${NC}"
        cd - > /dev/null # Attempt to return to previous dir, though we exit anyway
        rm -rf "$CLONE_DIR"
    else
        echo -e "${RED}Installation failed.${NC}"
        
        # Rollback / Cleanup Prompt
        if prompt_confirmation "Installation failed. Do you want to attempt a rollback/cleanup?" "n"; then
             # Since I don't have a distinct rollback playbook, I'm just notifying.
             # In a real scenario, this would trigger `ansible-playbook uninstall.yml`
             echo "Rollback initiated... (Not fully implemented yet, manual cleanup may be required)"
        else
             echo "Aborting."
        fi
        # cleanup even on fail? Maybe keep for debugging. Let's keep it if failed.
        echo "Installer files kept at $CLONE_DIR for debugging."
        exit 1
    fi

else
    echo "Installation cancelled."
    exit 0
fi
