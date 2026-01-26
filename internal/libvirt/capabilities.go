package libvirt

import (
	"context"
	"encoding/xml"
	"fmt"
	"io"
	"runtime"
	"strings"
)

// DomainCapabilitiesResponse describes domain capabilities for the host/libvirt connection.
type DomainCapabilitiesResponse struct {
	Emulator     string              `json:"emulator,omitempty"`
	Arch         string              `json:"arch,omitempty"`
	Domain       string              `json:"domain,omitempty"`
	MachineTypes []string            `json:"machine_types,omitempty"`
	Enums        map[string][]string `json:"enums,omitempty"`
	RawXML       string              `json:"raw_xml,omitempty"`
}

// DomainCapabilitiesRequest controls which domain capabilities to query.
type DomainCapabilitiesRequest struct {
	Emulator   string
	Arch       string
	Machine    string
	VirtType   string
	IncludeRaw bool
}

func defaultDomainArch() string {
	switch runtime.GOARCH {
	case "amd64":
		return "x86_64"
	case "arm64":
		return "aarch64"
	case "386":
		return "i686"
	default:
		return runtime.GOARCH
	}
}

func appendUnique(list []string, value string) []string {
	value = strings.TrimSpace(value)
	if value == "" {
		return list
	}
	for _, existing := range list {
		if existing == value {
			return list
		}
	}
	return append(list, value)
}

func parseDomainCapabilitiesXML(xmlDesc string) DomainCapabilitiesResponse {
	caps := DomainCapabilitiesResponse{Enums: map[string][]string{}}
	decoder := xml.NewDecoder(strings.NewReader(xmlDesc))
	currentEnum := ""

	for {
		tok, err := decoder.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			break
		}
		switch t := tok.(type) {
		case xml.StartElement:
			switch t.Name.Local {
			case "path":
				caps.Emulator = strings.TrimSpace(readElementText(decoder))
			case "arch":
				caps.Arch = strings.TrimSpace(readElementText(decoder))
			case "domain":
				caps.Domain = strings.TrimSpace(readElementText(decoder))
			case "machine":
				caps.MachineTypes = appendUnique(caps.MachineTypes, readElementText(decoder))
			case "enum":
				currentEnum = ""
				for _, attr := range t.Attr {
					if attr.Name.Local == "name" {
						currentEnum = strings.TrimSpace(attr.Value)
						break
					}
				}
			case "value":
				if currentEnum != "" {
					value := strings.TrimSpace(readElementText(decoder))
					if value != "" {
						caps.Enums[currentEnum] = appendUnique(caps.Enums[currentEnum], value)
					}
				}
			}
		case xml.EndElement:
			if t.Name.Local == "enum" {
				currentEnum = ""
			}
		}
	}

	if len(caps.Enums["machine"]) > 0 {
		caps.MachineTypes = caps.Enums["machine"]
	}

	return caps
}

func parseHostCapabilitiesMachineTypes(xmlDesc string, arch string, virtType string) []string {
	machines := []string{}
	decoder := xml.NewDecoder(strings.NewReader(xmlDesc))
	wantedArch := strings.TrimSpace(arch)
	wantedVirt := strings.TrimSpace(virtType)
	inGuest := false
	inArch := false
	archMatch := false
	currentDomain := ""

	for {
		tok, err := decoder.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			break
		}
		switch t := tok.(type) {
		case xml.StartElement:
			switch t.Name.Local {
			case "guest":
				inGuest = true
			case "arch":
				if !inGuest {
					break
				}
				inArch = true
				archMatch = false
				for _, attr := range t.Attr {
					if attr.Name.Local == "name" {
						archMatch = strings.TrimSpace(attr.Value) == wantedArch
						break
					}
				}
			case "domain":
				if inArch && archMatch {
					currentDomain = ""
					for _, attr := range t.Attr {
						if attr.Name.Local == "type" {
							currentDomain = strings.TrimSpace(attr.Value)
							break
						}
					}
				}
			case "machine":
				if inArch && archMatch {
					canonical := ""
					for _, attr := range t.Attr {
						if attr.Name.Local == "canonical" {
							canonical = strings.TrimSpace(attr.Value)
							break
						}
					}
					value := strings.TrimSpace(readElementText(decoder))
					if value == "" {
						value = canonical
					}
					if value != "" {
						if wantedVirt == "" || currentDomain == "" || currentDomain == wantedVirt {
							machines = appendUnique(machines, value)
						}
					}
				}
			}
		case xml.EndElement:
			switch t.Name.Local {
			case "domain":
				currentDomain = ""
			case "arch":
				inArch = false
				archMatch = false
			case "guest":
				inGuest = false
			}
		}
	}

	return machines
}

func readElementText(decoder *xml.Decoder) string {
	var sb strings.Builder
	for {
		tok, err := decoder.Token()
		if err != nil {
			break
		}
		switch v := tok.(type) {
		case xml.CharData:
			sb.Write([]byte(v))
		case xml.EndElement:
			return sb.String()
		}
	}
	return sb.String()
}

// GetDomainCapabilities returns parsed domain capabilities for the current libvirt connection.
func (s *Service) GetDomainCapabilities(ctx context.Context, req DomainCapabilitiesRequest) (*DomainCapabilitiesResponse, error) {
	_ = ctx
	if s.conn == nil {
		return nil, fmt.Errorf("libvirt connection not initialized")
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	arch := strings.TrimSpace(req.Arch)
	if arch == "" {
		arch = defaultDomainArch()
	}
	virtType := strings.TrimSpace(req.VirtType)
	if virtType == "" {
		virtType = "kvm"
	}

	xmlDesc, err := s.conn.GetDomainCapabilities(req.Emulator, arch, req.Machine, virtType, 0)
	if err != nil && req.VirtType == "" {
		// Fallback to qemu if kvm is not supported
		virtType = "qemu"
		xmlDesc, err = s.conn.GetDomainCapabilities(req.Emulator, arch, req.Machine, virtType, 0)
	}
	if err != nil {
		return nil, err
	}

	caps := parseDomainCapabilitiesXML(xmlDesc)
	if caps.Arch == "" {
		caps.Arch = arch
	}
	if caps.Domain == "" {
		caps.Domain = virtType
	}

	if hostXML, hostErr := s.conn.GetCapabilities(); hostErr == nil {
		hostMachines := parseHostCapabilitiesMachineTypes(hostXML, arch, virtType)
		if len(hostMachines) > 0 {
			for _, m := range hostMachines {
				caps.MachineTypes = appendUnique(caps.MachineTypes, m)
			}
			if len(caps.Enums["machine"]) == 0 {
				caps.Enums["machine"] = caps.MachineTypes
			}
		}
	}
	if req.IncludeRaw {
		caps.RawXML = xmlDesc
	}

	return &caps, nil
}
