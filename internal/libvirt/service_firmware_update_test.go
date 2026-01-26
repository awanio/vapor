package libvirt

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestEnsureUEFIBootXML(t *testing.T) {
	tmp := t.TempDir()
	code := filepath.Join(tmp, "OVMF_CODE.fd")
	vars := filepath.Join(tmp, "OVMF_VARS.fd")
	if err := os.WriteFile(code, []byte("code"), 0o644); err != nil {
		t.Fatalf("failed to write code file: %v", err)
	}
	if err := os.WriteFile(vars, []byte("vars"), 0o644); err != nil {
		t.Fatalf("failed to write vars file: %v", err)
	}

	t.Setenv("VAPOR_OVMF_CODE", code)
	t.Setenv("VAPOR_OVMF_VARS", vars)

	xml := `
<domain type='kvm'>
  <name>vm-test</name>
  <os>
    <type arch='x86_64'>hvm</type>
  </os>
  <devices></devices>
</domain>`

	updated, err := ensureUEFIBootXML(xml, "vm-test", false)
	if err != nil {
		t.Fatalf("ensureUEFIBootXML returned error: %v", err)
	}
	if !strings.Contains(updated, "firmware='efi'") {
		t.Fatalf("expected firmware='efi' in os tag")
	}
	if !strings.Contains(updated, code) {
		t.Fatalf("expected loader to include %q", code)
	}
	if !strings.Contains(updated, "template='"+vars+"'") {
		t.Fatalf("expected nvram template to include %q", vars)
	}
	if !strings.Contains(updated, "/var/lib/libvirt/qemu/nvram/vm-test_VARS.fd") {
		t.Fatalf("expected nvram path to include vm-test_VARS.fd")
	}
}

func TestEnsureUEFIBootXMLSecure(t *testing.T) {
	tmp := t.TempDir()
	code := filepath.Join(tmp, "OVMF_CODE.secboot.fd")
	vars := filepath.Join(tmp, "OVMF_VARS.secboot.fd")
	if err := os.WriteFile(code, []byte("code"), 0o644); err != nil {
		t.Fatalf("failed to write code file: %v", err)
	}
	if err := os.WriteFile(vars, []byte("vars"), 0o644); err != nil {
		t.Fatalf("failed to write vars file: %v", err)
	}

	t.Setenv("VAPOR_OVMF_CODE_SECURE", code)
	t.Setenv("VAPOR_OVMF_VARS_SECURE", vars)

	xml := `
<domain type='kvm'>
  <name>vm-secure</name>
  <os>
    <type arch='x86_64'>hvm</type>
  </os>
  <devices></devices>
</domain>`

	updated, err := ensureUEFIBootXML(xml, "vm-secure", true)
	if err != nil {
		t.Fatalf("ensureUEFIBootXML returned error: %v", err)
	}
	if !strings.Contains(updated, "secure='yes'") {
		t.Fatalf("expected loader secure='yes' attribute")
	}
	if !strings.Contains(updated, code) {
		t.Fatalf("expected loader to include %q", code)
	}
	if !strings.Contains(updated, "template='"+vars+"'") {
		t.Fatalf("expected nvram template to include %q", vars)
	}
}
