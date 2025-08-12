//go:build linux && libvirt
// +build linux,libvirt

package libvirt

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/xml"
	"fmt"
	"os"
	"os/exec"
	"text/template"
	"time"

	"libvirt.org/go/libvirt"
)

const domainXMLTemplate = `
<domain type='kvm'>
  <name>{{.Name}}</name>
  <memory unit='MiB'>{{.Memory}}</memory>
  <vcpu placement='static'>{{.VCPUs}}</vcpu>
  <os>
    <type arch='{{.Architecture}}' machine='q35'>hvm</type>
    <boot dev='hd'/>
    {{if .ISOPath}}
    <boot dev='cdrom'/>
    {{end}}
  </os>
  <features>
    <acpi/>
    <apic/>
    <vmport state='off'/>
  </features>
  <cpu mode='host-model' check='partial'/>
  <clock offset='utc'>
    <timer name='rtc' tickpolicy='catchup'/>
    <timer name='pit' tickpolicy='delay'/>
    <timer name='hpet' present='no'/>
  </clock>
  <on_poweroff>destroy</on_poweroff>
  <on_reboot>restart</on_reboot>
  <on_crash>restart</on_crash>
  <pm>
    <suspend-to-mem enabled='no'/>
    <suspend-to-disk enabled='no'/>
  </pm>
  <devices>
    <emulator>/usr/bin/qemu-system-x86_64</emulator>
    <disk type='file' device='disk'>
      <driver name='qemu' type='qcow2'/>
      {{if .DiskPath}}
      <source file='{{.DiskPath}}'/>
      {{else}}
      <source file='/var/lib/libvirt/images/{{.Name}}.qcow2'/>
      {{end}}
      <target dev='vda' bus='virtio'/>
    </disk>
    {{if .ISOPath}}
    <disk type='file' device='cdrom'>
      <driver name='qemu' type='raw'/>
      <source file='{{.ISOPath}}'/>
      <target dev='hda' bus='ide'/>
      <readonly/>
    </disk>
    {{end}}
    <interface type='{{.Network.Type}}'>
      <source {{if eq .Network.Type "bridge"}}bridge{{else}}network{{end}}='{{.Network.Source}}'/>
      <model type='virtio'/>
    </interface>
    <serial type='pty'>
      <target port='0'/>
    </serial>
    <console type='pty'>
      <target type='serial' port='0'/>
    </console>
    <graphics type='{{.Graphics.Type}}' port='{{.Graphics.Port}}' autoport='yes' listen='0.0.0.0'>
      <listen type='address' address='0.0.0.0'/>
    </graphics>
    <video>
      <model type='qxl' ram='65536' vram='65536' vgamem='16384' heads='1' primary='yes'/>
    </video>
    <memballoon model='virtio'/>
  </devices>
</domain>
`

func (s *Service) generateDomainXML(req *VMCreateRequest) (string, error) {
	if req.Architecture == "" {
		req.Architecture = "x86_64"
	}

	if req.Network.Type == "" {
		req.Network.Type = NetworkTypeNAT
	}
	if req.Network.Source == "" {
		req.Network.Source = "default"
	}

	if req.Graphics.Type == "" {
		req.Graphics.Type = "vnc"
	}
	if req.Graphics.Port == 0 {
		req.Graphics.Port = -1 // Autoport
	}

	tmpl, err := template.New("domain").Parse(domainXMLTemplate)
	if err != nil {
		return "", fmt.Errorf("failed to parse domain template: %w", err)
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, req); err != nil {
		return "", fmt.Errorf("failed to execute domain template: %w", err)
	}

	return buf.String(), nil
}

func (s *Service) createDisk(poolName, vmName string, sizeGB uint64) (string, error) {
	pool, err := s.conn.LookupStoragePoolByName(poolName)
	if err != nil {
		return "", fmt.Errorf("failed to find storage pool '%s': %w", poolName, err)
	}
	defer pool.Free()

	volName := fmt.Sprintf("%s.qcow2", vmName)
	volXML := fmt.Sprintf(`
		<volume>
			<name>%s</name>
			<capacity unit='G'>%d</capacity>
			<target>
				<format type='qcow2'/>
			</target>
		</volume>`, volName, sizeGB)

	vol, err := pool.StorageVolCreateXML(volXML, 0)
	if err != nil {
		return "", fmt.Errorf("failed to create volume: %w", err)
	}
	defer vol.Free()

	path, err := vol.GetPath()
	if err != nil {
		return "", fmt.Errorf("failed to get volume path: %w", err)
	}

	return path, nil
}

func (s *Service) cloneDisk(poolName, sourcePath, newVMName string) (string, error) {
	pool, err := s.conn.LookupStoragePoolByName(poolName)
	if err != nil {
		return "", fmt.Errorf("failed to find storage pool '%s': %w", poolName, err)
	}
	defer pool.Free()

	sourceVol, err := s.conn.LookupStorageVolByPath(sourcePath)
	if err != nil {
		return "", fmt.Errorf("failed to find source volume: %w", err)
	}
	defer sourceVol.Free()

	newVolName := fmt.Sprintf("%s.qcow2", newVMName)
	newVolXML := fmt.Sprintf(`
		<volume>
			<name>%s</name>
			<capacity unit='bytes'>0</capacity>
			<target>
				<format type='qcow2'/>
			</target>
			<backingStore>
				<path>%s</path>
				<format type='qcow2'/>
			</backingStore>
		</volume>`, newVolName, sourcePath)

	newVol, err := pool.StorageVolCreateXML(newVolXML, 0)
	if err != nil {
		return "", fmt.Errorf("failed to create cloned volume: %w", err)
	}
	defer newVol.Free()

	path, err := newVol.GetPath()
	if err != nil {
		return "", fmt.Errorf("failed to get cloned volume path: %w", err)
	}

	return path, nil
}

func (s *Service) attachDisk(domain *libvirt.Domain, diskPath, target string) error {
	diskXML := fmt.Sprintf(`
		<disk type='file' device='disk'>
			<driver name='qemu' type='qcow2'/>
			<source file='%s'/>
			<target dev='%s' bus='virtio'/>
		</disk>`, diskPath, target)

	return domain.AttachDeviceFlags(diskXML, libvirt.DOMAIN_DEVICE_MODIFY_CONFIG)
}

func (s *Service) createCloudInitISO(vmName string, config *CloudInitConfig) (string, error) {
	isoPath := fmt.Sprintf("/var/lib/libvirt/images/%s-cloud-init.iso", vmName)
	
	// Create a temporary directory for cloud-init data
	tmpDir, err := os.MkdirTemp("", "cloud-init-")
	if err != nil {
		return "", fmt.Errorf("failed to create temp dir: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	// Create user-data file
	userData := config.UserData
	if userData == "" {
		// Generate from structured data
		userData = generateCloudInitUserData(config)
	}
	if err := os.WriteFile(fmt.Sprintf("%s/user-data", tmpDir), []byte(userData), 0644); err != nil {
		return "", err
	}
	
	// Create meta-data file
	metaData := fmt.Sprintf("instance-id: %s\nlocal-hostname: %s\n", vmName, vmName)
	if err := os.WriteFile(fmt.Sprintf("%s/meta-data", tmpDir), []byte(metaData), 0644); err != nil {
		return "", err
	}

	// Create network-config if specified
	if config.NetworkData != "" {
		if err := os.WriteFile(fmt.Sprintf("%s/network-config", tmpDir), []byte(config.NetworkData), 0644); err != nil {
			return "", fmt.Errorf("failed to write network-config: %w", err)
		}
	}

	// Create the ISO using genisoimage or mkisofs
	cmd := exec.Command("genisoimage",
		"-output", isoPath,
		"-volid", "cidata",
		"-joliet",
		"-rock",
		tmpDir)
	
	if err := cmd.Run(); err != nil {
		// Try mkisofs as fallback
		cmd = exec.Command("mkisofs",
			"-o", isoPath,
			"-V", "cidata",
			"-J",
			"-r",
			tmpDir)
		
		if err := cmd.Run(); err != nil {
			return "", fmt.Errorf("failed to create cloud-init ISO: %w", err)
		}
	}

	return isoPath, nil
}

func generateCloudInitUserData(config *CloudInitConfig) string {
	// Generate cloud-init YAML configuration
	var content string
	content += "#cloud-config\n"
	
	// Add users
	if len(config.Users) > 0 {
		content += "users:\n"
		for _, user := range config.Users {
			content += fmt.Sprintf("  - name: %s\n", user.Name)
			if user.Password != "" {
				// Password should be hashed - in production use mkpasswd
				content += fmt.Sprintf("    passwd: %s\n", user.Password)
				content += "    lock_passwd: false\n"
			}
			if user.Sudo != "" {
				content += fmt.Sprintf("    sudo: %s\n", user.Sudo)
			}
			if user.Groups != "" {
				content += fmt.Sprintf("    groups: %s\n", user.Groups)
			}
			if user.Shell != "" {
				content += fmt.Sprintf("    shell: %s\n", user.Shell)
			}
			if len(user.SSHAuthorizedKeys) > 0 {
				content += "    ssh_authorized_keys:\n"
				for _, key := range user.SSHAuthorizedKeys {
					content += fmt.Sprintf("      - %s\n", key)
				}
			}
		}
	} else if len(config.SSHKeys) > 0 {
		// If no users specified but SSH keys provided, add to default user
		content += "ssh_authorized_keys:\n"
		for _, key := range config.SSHKeys {
			content += fmt.Sprintf("  - %s\n", key)
		}
	}

	// Package installation
	if len(config.Packages) > 0 {
		content += "packages:\n"
		for _, pkg := range config.Packages {
			content += fmt.Sprintf("  - %s\n", pkg)
		}
		content += "package_update: true\n"
		content += "package_upgrade: true\n"
	}

	// Run commands
	if len(config.RunCmd) > 0 {
		content += "runcmd:\n"
		for _, cmd := range config.RunCmd {
			content += fmt.Sprintf("  - %s\n", cmd)
		}
	}

	// Enable SSH password authentication if needed
	if hasPasswordUsers(config.Users) {
		content += "ssh_pwauth: true\n"
	}

	// Final message
	content += "final_message: \"Cloud-init completed at $TIMESTAMP\"\n"

	return content
}

func hasPasswordUsers(users []CloudInitUser) bool {
	for _, user := range users {
		if user.Password != "" {
			return true
		}
	}
	return false
}

func (s *Service) generateStoragePoolXML(req *StoragePoolCreateRequest) string {
	return fmt.Sprintf(`
		<pool type='%s'>
			<name>%s</name>
			<target>
				<path>%s</path>
			</target>
		</pool>`,
		req.Type, req.Name, req.Path)
}

func (s *Service) generateVolumeXML(req *VolumeCreateRequest) string {
	return fmt.Sprintf(`
		<volume>
			<name>%s</name>
			<capacity unit='bytes'>%d</capacity>
			<target>
				<format type='%s'/>
			</target>
		</volume>`,
		req.Name, req.Capacity, req.Format)
}

func (s *Service) generateNetworkXML(req *NetworkCreateRequest) string {
	return fmt.Sprintf(`
		<network>
			<name>%s</name>
			<forward mode='%s'/>
			<bridge name='%s' stp='on' delay='0'/>
			<ip address='%s' netmask='%s'>
				<dhcp>
					<range start='%s' end='%s'/>
				</dhcp>
			</ip>
		</network>`,
		req.Name, req.Mode, req.Bridge, req.IPRange.Address, req.IPRange.Netmask, req.DHCP.Start, req.DHCP.End)
}

