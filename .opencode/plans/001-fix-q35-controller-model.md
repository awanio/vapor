# Plan: Fix Q35 Controller Model Issue

## Problem
Updating a VM to use `machine_type: q35` fails because the backend explicitly sets `model='ahci'` for the SATA controller (converted from IDE). The installed version of Libvirt/QEMU on the host does not support this model attribute for the `q35` machine type (or expects it to be implicit), resulting in errors like `Unknown model type 'ahci'`.

## Solution
Modify the XML transformation logic to remove the `model` attribute when converting IDE controllers to SATA for Q35, allowing Libvirt to use the default compatible model.

## Steps

1.  **Modify `internal/libvirt/vm_boot_utils.go`**:
    *   **Refactor `replaceControllerTypeAndModel`**:
        *   Update regex to capture leading whitespace for cleaner removal: `reModel := regexp.MustCompile(\s*model=['"][^'"]*['"])`
        *   Update logic: If `toModel` is empty string (`""`), explicitly **remove** any existing `model` attribute using the regex.
    
2.  **Update Usage in `ensureMachineTypeXML`**:
    *   Locate the call: `replaceControllerTypeAndModel(updatedXML, "ide", "sata", "ahci")`
    *   Change to: `replaceControllerTypeAndModel(updatedXML, "ide", "sata", "")` to remove the model attribute.

3.  **Update Tests in `internal/libvirt/vm_boot_utils_test.go`**:
    *   Modify `TestEnsureMachineTypeXMLUpdatesControllersForQ35`.
    *   Current expectation: `strings.Contains(updated, "model='ahci'")`
    *   New expectation: Verify `type='sata'` is present, but `model='ahci'` is **absent** (to verify defaulting behavior).

## Verification
*   Run specific test: `go test -v internal/libvirt/vm_boot_utils_test.go -run TestEnsureMachineTypeXMLUpdatesControllersForQ35`
*   The change should prevent the `virError(Code=67, ... Unknown model type 'ahci')` error.
