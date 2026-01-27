# Panduan Instalasi

Panduan ini menjelaskan cara menginstal Vapor di sistem Linux Anda.

## Persyaratan Sistem

### Kebutuhan Hardware Minimum

| Komponen | Kebutuhan |
|----------|-----------|
| Arsitektur | x86_64 (amd64) |
| CPU | 2 core |
| RAM | 2 GB |
| Disk | 1 GB ruang kosong |
| Jaringan | Koneksi jaringan aktif |

### Sistem Operasi yang Didukung

Vapor memerlukan **libvirt 8.0.0+** dan **QEMU 6.2+** untuk fitur virtualisasi lengkap termasuk dukungan UEFI dan Secure Boot.

| Distribusi | Versi | QEMU | libvirt | Status |
|------------|-------|------|---------|--------|
| **Ubuntu** | 24.04 LTS | 8.2.2 | 10.0.0 | ✅ Direkomendasikan |
| | 22.04 LTS | 6.2.0 | 8.0.0 | ✅ Didukung |
| | 20.04 LTS | 4.2.1 | 6.0.0 | ❌ Tidak didukung (QEMU terlalu lama) |
| **Debian** | 12 (Bookworm) | 7.2.0 | 9.0.0 | ✅ Didukung |
| | 11 (Bullseye) | 5.2.0 | 7.0.0 | ❌ Tidak didukung (QEMU/libvirt terlalu lama) |
| **RHEL/Rocky/Alma** | 9.x | 7.0+ | 9.0.0+ | ✅ Didukung |
| | 8.x | 4.2.0 | 8.6.0 | ❌ Tidak didukung (QEMU terlalu lama) |
| **Fedora** | 40+ | 8.2+ | 10.0.0+ | ✅ Didukung |
| | 39 | 8.1.0 | 9.6.0 | ✅ Didukung |
| **CentOS Stream** | 9 | 7.0+ | 9.0.0+ | ✅ Didukung |

> **Penting**: QEMU 6.2+ diperlukan untuk output tampilan UEFI yang benar. Versi QEMU lama (seperti 4.2.x di Ubuntu 20.04) memiliki masalah inisialisasi tampilan dengan VM UEFI.

## Persyaratan Pra-Instalasi

### Memeriksa Sistem Anda

Sebelum menginstal, verifikasi versi QEMU dan libvirt Anda:

```bash
# Cek versi QEMU
qemu-system-x86_64 --version

# Cek versi libvirt
virsh version
```

**Versi minimum yang diperlukan:**
- QEMU: 6.2.0 atau lebih tinggi
- libvirt: 8.0.0 atau lebih tinggi

## Metode Instalasi

### Metode 1: Instalasi Cepat (Direkomendasikan)

Installer interaktif menggunakan Ansible untuk menyiapkan Vapor dan komponen opsional:

```bash
# Download script instalasi
curl -fsSL https://raw.githubusercontent.com/awanio/vapor/main/scripts/install.sh -o install.sh

# Buat executable
chmod +x install.sh

# Jalankan installer
sudo ./install.sh
```

Installer akan memandu Anda memilih komponen:

1. **Ansible & Dependensi**: Otomatis diinstal jika belum ada
2. **Libvirt/KVM**: Manajemen mesin virtual (direkomendasikan)
3. **Container Runtime**: Pilih Docker atau Containerd
4. **Kubernetes**: Opsional, dengan pilihan versi (v1.29 - v1.34)
5. **Helm**: Package manager Kubernetes (jika K8s dipilih)

### Metode 2: Instalasi Non-Interaktif

Untuk deployment otomatis atau scripted:

```bash
# Set variabel environment
export AUTO_INSTALL_DEPS=y
export INSTALL_LIBVIRT=y
export INSTALL_DOCKER=y
export INSTALL_K8S=y
export K8S_VERSION=1.30

# Jalankan installer
curl -fsSL https://raw.githubusercontent.com/awanio/vapor/main/scripts/install.sh | sudo -E bash
```

#### Variabel Environment yang Tersedia

| Variabel | Nilai | Deskripsi |
|----------|-------|-----------|
| `AUTO_INSTALL_DEPS` | y/n | Auto-install Ansible dan dependensi |
| `INSTALL_LIBVIRT` | y/n | Install libvirt/KVM |
| `INSTALL_DOCKER` | y/n | Install Docker |
| `INSTALL_CONTAINERD` | y/n | Install Containerd (alternatif Docker) |
| `INSTALL_K8S` | y/n | Install Kubernetes |
| `K8S_VERSION` | 1.29-1.34 | Versi Kubernetes yang akan diinstal |
| `INSTALL_HELM` | y/n | Install Helm |

### Metode 3: Build dari Source

Untuk development atau custom build:

```bash
# Prasyarat
# - Go 1.21+
# - Node.js 18+
# - Paket libvirt-dev (Ubuntu/Debian) atau libvirt-devel (RHEL/Fedora)

# Clone repositori
git clone https://github.com/awanio/vapor.git
cd vapor

# Build
make build

# Install ke sistem
sudo make install

# Atau jalankan langsung
./bin/vapor
```

## Pasca-Instalasi

### Verifikasi Instalasi

```bash
# Cek status layanan
sudo systemctl status vapor

# Cek log
sudo journalctl -u vapor -f

# Test endpoint API
curl -k https://localhost:7770/api/health
```

Response health yang diharapkan:
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

### Akses Antarmuka Web

Buka browser dan navigasi ke:
```
https://<ip-server>:7770
```

Login dengan kredensial sistem Anda (user root atau sudo).

### Konfigurasi Firewall

**Ubuntu/Debian (UFW):**
```bash
sudo ufw allow 7770/tcp
```

**RHEL/Rocky/Alma/Fedora (firewalld):**
```bash
sudo firewall-cmd --permanent --add-port=7770/tcp
sudo firewall-cmd --reload
```

## Konfigurasi

File konfigurasi utama terletak di `/etc/vapor/vapor.conf`.

```ini
[server]
host = 0.0.0.0
port = 7770
tls = true

[auth]
session_timeout = 3600

[logging]
level = info
file = /var/log/vapor/vapor.log
```

### Sertifikat TLS

Secara default, Vapor membuat sertifikat self-signed. Untuk produksi, konfigurasi sertifikat Anda sendiri:

```ini
[tls]
cert_file = /etc/vapor/certs/server.crt
key_file = /etc/vapor/certs/server.key
```

## Upgrade

### Menggunakan Installer

```bash
curl -fsSL https://raw.githubusercontent.com/awanio/vapor/main/scripts/install.sh -o install.sh
chmod +x install.sh
sudo ./install.sh --upgrade
```

### Upgrade Manual

```bash
# Stop layanan
sudo systemctl stop vapor

# Download binary baru
sudo curl -L https://github.com/awanio/vapor/releases/latest/download/vapor-linux-amd64 -o /usr/local/bin/vapor
sudo chmod +x /usr/local/bin/vapor

# Start layanan
sudo systemctl start vapor
```

## Uninstall

```bash
# Stop dan disable layanan
sudo systemctl stop vapor
sudo systemctl disable vapor

# Hapus file
sudo rm -rf /usr/local/bin/vapor
sudo rm -rf /etc/vapor
sudo rm -rf /var/log/vapor
sudo rm /etc/systemd/system/vapor.service

# Reload systemd
sudo systemctl daemon-reload
```

## Troubleshooting

### Error Versi Libvirt

Jika Anda melihat error seperti:
```
/usr/local/bin/vapor: /lib/x86_64-linux-gnu/libvirt.so.0: version `LIBVIRT_8.0.0' not found
```

**Solusi berdasarkan distribusi:**

| Distribusi | Solusi |
|------------|--------|
| Ubuntu 20.04 | Aktifkan Ubuntu Cloud Archive (lihat di atas) |
| Ubuntu 22.04+ | Sudah kompatibel, coba `sudo apt install libvirt-dev` |
| Debian 11 | Upgrade ke Debian 12 |
| Debian 12 | Sudah kompatibel |
| RHEL/Rocky/Alma 8.x | Update ke 8.6+ dengan `sudo dnf update` |
| RHEL/Rocky/Alma 9 | Sudah kompatibel |

### Layanan Tidak Bisa Start

Cek log untuk error:
```bash
sudo journalctl -u vapor -n 100 --no-pager
```

Masalah umum:
- Port 7770 sudah digunakan
- Libvirt tidak terinstal (untuk fitur virtualisasi)
- Masalah permission

### Tidak Bisa Terhubung ke Antarmuka Web

1. Verifikasi layanan berjalan:
   ```bash
   sudo systemctl status vapor
   ```

2. Cek firewall:
   ```bash
   sudo ufw status  # Ubuntu/Debian
   sudo firewall-cmd --list-all  # RHEL/Rocky/Fedora
   ```

3. Verifikasi port listening:
   ```bash
   sudo ss -tlnp | grep 7770
   ```

### Error Permission Denied

Pastikan user vapor memiliki permission yang diperlukan:
```bash
# Tambahkan ke grup libvirt (untuk manajemen VM)
sudo usermod -aG libvirt vapor

# Tambahkan ke grup docker (untuk manajemen container)
sudo usermod -aG docker vapor
```

## Langkah Selanjutnya

Setelah instalasi, lihat:
- [Panduan Quick Start](03-quick-start.md) - Langkah pertama dengan Vapor
- [Panduan Konfigurasi](04-configuration.md) - Opsi konfigurasi detail
- [Panduan Virtualisasi](05-virtualization.md) - Mengelola mesin virtual
