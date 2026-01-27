# Troubleshooting

## Overview

This section covers troubleshooting in Vapor.

## Key Features

- Feature 1
- Feature 2
- Feature 3

## Getting Started

[Content for Troubleshooting will be added here]

## Best Practices

1. Best practice 1
2. Best practice 2
3. Best practice 3

## Troubleshooting

### Common Issues

#### Libvirt Version Mismatch

**Error:** `/lib/x86_64-linux-gnu/libvirt.so.0: version 'LIBVIRT_8.0.0' not found`

**Cause:** Your system has an older version of libvirt installed (common on Ubuntu 20.04 or Debian 11).

**Solution:**
- **Ubuntu 20.04:** Enable Ubuntu Cloud Archive as described in the [Installation Guide](02-installation.md).
- **Other OS:** Upgrade your operating system to a supported version (e.g., Ubuntu 22.04+, Debian 12+, RHEL 9+).

#### UEFI VM Display Not Initialized

**Error:** VNC console shows "Guest has not initialized the display (yet)"

**Cause:** This usually happens when using UEFI (especially with Secure Boot) in combination with an old QEMU version (older than 6.2). Older QEMU versions like 4.2.x have compatibility issues with modern OVMF firmware SMM (System Management Mode).

**Solution:**
- **Upgrade QEMU:** Ensure you are running QEMU 6.2 or newer.
- **Ubuntu 20.04 Users:** Ubuntu 20.04 ships with QEMU 4.2 which is too old for proper UEFI support. Please upgrade to Ubuntu 22.04 or newer.
- **Workaround:** If you cannot upgrade, try creating the VM without Secure Boot enabled.

#### Cannot Connect to Console

**Error:** WebSocket connection failed or immediate disconnection.

**Solution:**
1. Check if the VM is actually running (`virsh list --all`).
2. Verify port 7770 is reachable and not blocked by firewall.
3. Check `vapor.log` for any permission errors to the VNC socket.
4. Ensure the `vapor` user is in the `libvirt` group (`sudo usermod -aG libvirt vapor`).

## Next Steps

- Learn more about related features
- Explore advanced configurations
- Review security considerations

---

[← Previous: Security Best Practices](14-security.md) | [Next: Back to Index →](README.md)