## Task 01

Standardize the OS info in API response in vm list and vm detail.

In vm list endpoint, instead of this:

```json
...
"os": {
    "type": "hvm",
    "architecture": "x86_64",
    "machine": "",
    "boot": null
},
"os_info": {
    "family": "linux",
    "variant": "debian11"
},
...
```

merged to: 

```json
...
"os": {
    "type": "hvm",
    "architecture": "x86_64",
    "machine": "",
    "boot": null,
    "family": "linux",
    "variant": "debian11"
},
...
```

Remove the os_info field and move all it properties to os field.

In vm detail endpoint, from this:

```json
...
"os_info": {
    "family": "linux",
    "variant": "debian11"
},
"os_type": "linux",
"os_variant": "debian11",
"architecture": "x86_64",
...
```

to this:

```json
...
"os": {
    "type": "hvm",
    "architecture": "x86_64",
    "machine": "",
    "boot": null,
    "family": "linux",
    "variant": "debian11"
},
...
```

You need to adjest frontend implementation especially at web/src/views/virtualization/virtualization-vms-enhanced.ts and web/src/components/virtualization/vm-detail-drawer.ts components.

## Task 02
Improve the listVMs() and getVMEnhanced() function at internal/routes/libvirt.go to provide IP for each vm's interface. You can use number of approach with fallback if one approach is does not works to get the VM' ip. For example:

Method 1: Using the QEMU Guest Agent. This is the most robust approach to get the vm IP whether the vm use Libvirt NAT/Network or ses a direct host bridge.

```go
package main

import (
	"fmt"
	"log"

	"libvirt.org/go/libvirt"
)

func getVMIPWithAgent(conn *libvirt.Connect, vmName string) (string, error) {
	dom, err := conn.LookupDomainByName(vmName)
	if err != nil {
		return "", fmt.Errorf("failed to lookup domain %s: %w", vmName, err)
	}
	defer dom.Free()

	// Use VIR_DOMAIN_INTERFACE_ADDRESSES_AGENT for the source flag
	ifAddrs, err := dom.InterfaceAddresses(libvirt.VIR_DOMAIN_INTERFACE_ADDRESSES_AGENT)
	if err != nil {
		return "", fmt.Errorf("failed to get interface addresses: %w", err)
	}

	for _, iface := range ifAddrs {
		for _, addr := range iface.Addrs {
			// Filter for IPv4 addresses
			if addr.Type == libvirt.VIR_IP_ADDR_TYPE_IPV4 {
				return addr.Addr, nil
			}
		}
	}

	return "", fmt.Errorf("no IPv4 addresses found for VM %s", vmName)
}

// Example usage:
// func main() {
// 	conn, err := libvirt.NewConnect("qemu:///system")
// 	if err != nil {
// 		log.Fatal(err)
// 	}
// 	defer conn.Close()
//
// 	ip, err := getVMIPWithAgent(conn, "my_vm_name")
// 	if err != nil {
// 		log.Fatal(err)
// 	}
// 	fmt.Printf("VM IP Address: %s\n", ip)
// }
```

But the cons is, not all vm has QEMU Guest Agent installed.

Method 2: Querying DHCP Leases if the vm using a libvirt-managed NAT or virtual network

```go
package main

import (
	"fmt"
	"log"
	"time"

	"libvirt.org/go/libvirt"
)

func getVMIPFromDHCP(conn *libvirt.Connect, vmName, networkName string) (string, error) {
	dom, err := conn.LookupDomainByName(vmName)
	if err != nil {
		return "", fmt.Errorf("failed to lookup domain %s: %w", vmName, err)
	}
	defer dom.Free()

	// First, get the VM's MAC address to filter the leases
	doc, err := dom.GetXMLDesc(0)
	if err != nil {
		return "", fmt.Errorf("failed to get domain XML: %w", err)
	}
    // You would need to parse the XML (e.g., using encoding/xml) to extract the MAC address
    // for the interface connected to the specified network. 
    // This part is complex due to XML parsing in Go.
    // Let's assume you have the MAC address:
    vmMacAddress := "52:54:00:ab:cd:ef" // Replace with actual MAC address retrieval

	net, err := conn.LookupNetworkByName(networkName)
	if err != nil {
		return "", fmt.Errorf("failed to lookup network %s: %w", networkName, err)
	}
	defer net.Free()

	leases, err := net.DHCPLeases(vmMacAddress, 0, 0)
	if err != nil {
		return "", fmt.Errorf("failed to get DHCP leases: %w", err)
	}

	for _, lease := range leases {
        // Filter for active IPv4 leases
		if lease.IPaddr != "" && time.Now().Before(time.Unix(int64(lease.ExpiryTime), 0)) {
			return lease.IPaddr, nil
		}
	}

	return "", fmt.Errorf("no active DHCP lease found for VM %s on network %s", vmName, networkName)
}

// Example usage:
// func main() {
// 	conn, err := libvirt.NewConnect("qemu:///system")
// 	if err != nil {
// 		log.Fatal(err)
// 	}
// 	defer conn.Close()
//
// 	ip, err := getVMIPFromDHCP(conn, "my_vm_name", "default")
// 	if err != nil {
// 		log.Fatal(err)
// 	}
// 	fmt.Printf("VM IP Address: %s\n", ip)
// }
```

Method 3: Using External Network Tools via Shell Execution. Use this approach is the vm does not have qemu guest agent or it use direct host bridge.

```go
package main

import (
	"encoding/xml"
	"fmt"
	"os/exec"
	"regexp"
	"libvirt.org/go/libvirt"
)

// Simplified struct to parse the relevant parts of the libvirt XML
type Domain struct {
    XMLName xml.Name `xml:"domain"`
    Interfaces []Interface `xml:"devices>interface"`
}

type Interface struct {
    XMLName xml.Name `xml:"interface"`
    MAC MAC `xml:"mac"`
    Source Source `xml:"source"`
}

type MAC struct {
    Address string `xml:"address,attr"`
}

type Source struct {
    Bridge string `xml:"bridge,attr"`
}

func getVMIPViaARP(conn *libvirt.Connect, vmName, bridgeName string) (string, error) {
    dom, err := conn.LookupDomainByName(vmName)
    if err != nil {
        return "", err
    }
    defer dom.Free()

    xmlDesc, err := dom.GetXMLDesc(0)
    if err != nil {
        return "", err
    }

    // Parse XML to find the MAC address attached to the correct bridge
    var domain Domain
    if err := xml.Unmarshal([]byte(xmlDesc), &domain); err != nil {
        return "", fmt.Errorf("failed to parse domain XML: %w", err)
    }

    var vmMacAddress string
    for _, iface := range domain.Interfaces {
        if iface.Source.Bridge == bridgeName && iface.MAC.Address != "" {
            vmMacAddress = iface.MAC.Address
            break
        }
    }

    if vmMacAddress == "" {
        return "", fmt.Errorf("could not find MAC address for bridge %s", bridgeName)
    }

    // Execute 'arp -an' or 'ip neigh' on the host system
    // This requires the Go program to have permission to run these commands.
    cmd := exec.Command("arp", "-an")
    output, err := cmd.Output()
    if err != nil {
        return "", fmt.Errorf("failed to execute arp command: %w", err)
    }

    // Regex to find IP in arp output: e.g., "(192.168.1.10) at 52:54:00:..."
    ipRegex := regexp.MustCompile(fmt.Sprintf(`\((.*?)\)\s+at\s+%s`, vmMacAddress))
    matches := ipRegex.FindStringSubmatch(string(output))

    if len(matches) > 1 {
        return matches[1], nil
    }

    return "", fmt.Errorf("IP address not found in ARP table for MAC %s. Ensure VM is powered on and network activity is occurring (maybe ping the network range)", vmMacAddress)
}
```

So the final API response for vm list and vm detail is:

```json
{
    "data": {
        "count": 3,
        "vms": [
            {
                "uuid": "8daeb8f2-d4f7-4bd9-b5cf-9cafbfcb8403",
                "name": "vm02",
                "state": "running",
                "memory": 4194304,
                "max_memory": 4194304,
                "vcpus": 4,
                "max_vcpus": 0,
                "os": {
                    "type": "hvm",
                    "architecture": "x86_64",
                    "machine": "",
                    "boot": null,
                    "family": "linux",
                    "variant": "debian11"
                },
                "disks": null,
                "networks": [
                {
                    "type": "network",
                    "source": "default",
                    "model": "virtio",
                    "mac": "52:54:00:43:2d:14",
                    "ipv4": "192.168.122.234/24",
                    "ipv6": null,
                }
                "created_at": "2026-01-19T00:18:10.631334893Z",
                "updated_at": "2026-01-19T00:18:10.631334893Z",
                "autostart": false,
                "persistent": true
            },
            {
                "uuid": "7ed59ab6-7a0d-e5af-d752-ca83241df26f",
                "name": "vm-mki662bw-o5si",
                "state": "running",
                "memory": 4194304,
                "max_memory": 4194304,
                "vcpus": 4,
                "max_vcpus": 0,
                "os": {
                    "type": "hvm",
                    "architecture": "x86_64",
                    "machine": "",
                    "boot": null,
                    "family": "linux",
                    "variant": "debian11"
                },
                "disks": null,
                "networks": [
                {
                    "type": "network",
                    "source": "default",
                    "model": "virtio",
                    "mac": "52:54:00:43:2d:15",
                    "ipv4": "192.168.122.236/24",
                    "ipv6": null,
                }
            ],
                "created_at": "2026-01-18T14:43:54.582177362Z",
                "updated_at": "2026-01-18T14:43:54.582177362Z",
                "autostart": false,
                "persistent": true
            }
        ]
    },
    "status": "success"
}
```

```json
{
    "data": {
        "uuid": "7ed59ab6-7a0d-e5af-d752-ca83241df26f",
        "name": "vm-mki662bw-o5si",
        "state": "running",
        "memory": 4096,
        "max_memory": 4096,
        "vcpus": 4,
        "max_vcpus": 4,
        "storage": {
            "disks": [
                {
                    "path": "/var/lib/libvirt/images/vm-mki662bw-o5si-disk0.qcow2",
                    "device": "disk",
                    "target": "vda",
                    "bus": "virtio",
                    "size": 20,
                    "capacity": 21474836480,
                    "allocation": 5581721600,
                    "format": "qcow2",
                    "storage_pool": "default",
                    "readonly": false,
                    "source_type": "file",
                    "source_path": "/var/lib/libvirt/images/vm-mki662bw-o5si-disk0.qcow2"
                },
                {
                    "path": "/home/awanio/data/virtualcompute/iso/debian-12.0.0-amd64-netinst.iso",
                    "device": "cdrom",
                    "target": "hdc",
                    "bus": "ide",
                    "format": "raw",
                    "storage_pool": "default",
                    "boot_order": 1,
                    "readonly": true,
                    "source_type": "file",
                    "source_path": "/home/awanio/data/virtualcompute/iso/debian-12.0.0-amd64-netinst.iso"
                }
            ]
        },
        "os": {
            "type": "hvm",
            "architecture": "x86_64",
            "machine": "",
            "boot": null,
            "family": "linux",
            "variant": "debian11"
        },
        "uefi": false,
        "secure_boot": false,
        "tpm": false,
        "networks": [
            {
                "type": "network",
                "source": "default",
                "model": "virtio",
                "mac": "52:54:00:43:2d:15",
                "ipv4": "192.168.122.236/24",
                "ipv6": null
            }
        ],
        "graphics": [
            {
                "type": "vnc",
                "port": 5901,
                "autoport": true,
                "listen": "0.0.0.0"
            }
        ],
        "autostart": false,
        "created_at": "2026-01-19T00:19:47.600748764Z",
        "updated_at": "2026-01-19T00:19:47.600748869Z",
        "persistent": true,
        "running": true
    },
    "status": "success"
}
```

Present all vm's IPs at vm list table and vm detail drawer at web/src/views/virtualization/virtualization-vms-enhanced.ts and web/src/components/virtualization/vm-detail-drawer.ts components.