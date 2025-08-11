# Panduan Instalasi

## Persyaratan Sistem

Sebelum menginstal Vapor, pastikan sistem Anda memenuhi persyaratan berikut:

### Sistem Operasi
- **Target Utama**: Linux x86_64
  - Ubuntu 18.04 LTS atau yang lebih baru
  - Debian 10 atau yang lebih baru
  - RHEL/CentOS 8 atau yang lebih baru
  - Fedora 32 atau yang lebih baru
  - Arch Linux (terbaru)
  - Alpine Linux 3.12 atau yang lebih baru
- **Arsitektur**: x86_64 (AMD64)
  - Dukungan ARM64 masih eksperimental
- **Kernel**: Linux 4.15 atau yang lebih baru

### Persyaratan Perangkat Keras
- **CPU**: Minimal 2 core (4+ core direkomendasikan)
- **RAM**: Minimal 2GB (4GB+ direkomendasikan)
- **Disk**: 1GB ruang kosong untuk Vapor
- **Jaringan**: Koneksi jaringan aktif

### Paket Sistem yang Diperlukan

#### Utilitas Inti
Ini biasanya sudah terinstal pada sebagian besar distribusi Linux:
- `mount`, `umount` - Operasi mounting filesystem
- `lsblk` - Informasi block device
- `useradd`, `usermod`, `userdel` - Manajemen pengguna
- `systemd` - Manajemen layanan dan logging

#### Alat Filesystem
Instal berdasarkan filesystem yang akan Anda gunakan:
```bash
# Ubuntu/Debian
sudo apt-get install -y e2fsprogs xfsprogs btrfs-progs

# RHEL/CentOS/Fedora
sudo dnf install -y e2fsprogs xfsprogs btrfs-progs

# Arch Linux
sudo pacman -S e2fsprogs xfsprogs btrfs-progs

# Alpine Linux
sudo apk add e2fsprogs xfsprogs btrfs-progs
```

#### Fitur Lanjutan Opsional
Untuk fungsionalitas lengkap, instal paket opsional berikut:
```bash
# Dukungan LVM
sudo apt-get install -y lvm2

# Dukungan iSCSI
sudo apt-get install -y open-iscsi

# Dukungan Multipath
sudo apt-get install -y multipath-tools

# Container Runtime (pilih salah satu)
sudo apt-get install -y docker.io
# ATAU
sudo apt-get install -y containerd
# ATAU
sudo apt-get install -y cri-o
```

## Metode Instalasi

### Metode 1: Instalasi Cepat (Direkomendasikan)

Cara termudah untuk menginstal Vapor adalah menggunakan skrip instalasi otomatis:

```bash
# Unduh skrip instalasi
wget https://github.com/awanio/vapor/releases/latest/download/deploy.sh

# Buat dapat dieksekusi
chmod +x deploy.sh

# Jalankan instalasi
sudo ./deploy.sh
```

Skrip ini akan:
1. Memeriksa kompatibilitas sistem
2. Mengunduh binary Vapor terbaru
3. Menginstal dependensi yang diperlukan
4. Mengkonfigurasi layanan systemd
5. Memulai Vapor secara otomatis

### Metode 2: Instalasi Manual

Untuk kontrol lebih terhadap proses instalasi:

#### Langkah 1: Unduh Binary
```bash
# Buat direktori untuk Vapor
sudo mkdir -p /opt/vapor

# Unduh rilis terbaru
wget https://github.com/awanio/vapor/releases/latest/download/vapor-linux-amd64 \
  -O /opt/vapor/vapor

# Buat dapat dieksekusi
sudo chmod +x /opt/vapor/vapor

# Buat symbolic link
sudo ln -s /opt/vapor/vapor /usr/local/bin/vapor
```

#### Langkah 2: Buat Konfigurasi
```bash
# Buat direktori konfigurasi
sudo mkdir -p /etc/vapor

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Buat file environment
sudo tee /etc/vapor/environment > /dev/null <<EOF
# Konfigurasi Vapor
JWT_SECRET=$JWT_SECRET
SERVER_ADDR=:8080
LOG_LEVEL=info
EOF

# Amankan konfigurasi
sudo chmod 600 /etc/vapor/environment
```

#### Langkah 3: Buat Layanan systemd
```bash
# Buat file layanan
sudo tee /etc/systemd/system/vapor.service > /dev/null <<EOF
[Unit]
Description=Vapor System Management API
Documentation=https://github.com/awanio/vapor
After=network.target

[Service]
Type=simple
User=root
Group=root
ExecStart=/usr/local/bin/vapor
Restart=on-failure
RestartSec=5
EnvironmentFile=/etc/vapor/environment

# Pengaturan keamanan
NoNewPrivileges=true
PrivateTmp=true

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=vapor

[Install]
WantedBy=multi-user.target
EOF
```

#### Langkah 4: Aktifkan dan Mulai Layanan
```bash
# Reload systemd
sudo systemctl daemon-reload

# Aktifkan layanan untuk mulai saat boot
sudo systemctl enable vapor

# Mulai layanan
sudo systemctl start vapor

# Periksa status
sudo systemctl status vapor
```

### Metode 3: Instalasi Docker

Untuk deployment terkontainerisasi:

```bash
# Buat direktori data
mkdir -p ~/vapor-data

# Jalankan kontainer Vapor
docker run -d \
  --name vapor \
  --restart unless-stopped \
  --privileged \
  --pid host \
  --network host \
  -v /:/host:ro \
  -v ~/vapor-data:/data \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e JWT_SECRET=$(openssl rand -base64 32) \
  -p 8080:8080 \
  awanio/vapor:latest
```

### Metode 4: Build dari Source

Untuk developer atau build kustom:

```bash
# Clone repository
git clone https://github.com/awanio/vapor.git
cd vapor

# Instal Go 1.21 atau yang lebih baru
# Lihat: https://golang.org/doc/install

# Build binary
make build

# Instal
sudo make install

# Mulai layanan
sudo systemctl start vapor
```

## Langkah Pasca-Instalasi

### 1. Verifikasi Instalasi

Periksa bahwa Vapor berjalan dengan benar:

```bash
# Periksa status layanan
sudo systemctl status vapor

# Periksa log
sudo journalctl -u vapor -n 50

# Tes endpoint API
curl http://localhost:8080/health
```

Respons yang diharapkan:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 30
}
```

### 2. Konfigurasi Firewall

Jika Anda mengaktifkan firewall, izinkan akses ke Vapor:

```bash
# UFW (Ubuntu/Debian)
sudo ufw allow 8080/tcp

# firewalld (RHEL/CentOS/Fedora)
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload

# iptables
sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
sudo service iptables save
```

### 3. Konfigurasi Reverse Proxy (Opsional)

Untuk deployment produksi, gunakan reverse proxy seperti Nginx:

```nginx
server {
    listen 80;
    server_name vapor.example.com;
    
    # Redirect ke HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name vapor.example.com;
    
    # Konfigurasi SSL
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Pengaturan proxy
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Dukungan WebSocket
    location /api/v1/ws/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}
```

### 4. Atur Backup Otomatis

Buat skrip backup untuk konfigurasi Vapor:

```bash
#!/bin/bash
# /usr/local/bin/vapor-backup.sh

BACKUP_DIR="/var/backups/vapor"
DATE=$(date +%Y%m%d_%H%M%S)

# Buat direktori backup
mkdir -p $BACKUP_DIR

# Backup konfigurasi
tar -czf $BACKUP_DIR/vapor-config-$DATE.tar.gz /etc/vapor/

# Simpan hanya backup 7 hari terakhir
find $BACKUP_DIR -name "vapor-config-*.tar.gz" -mtime +7 -delete
```

Tambahkan ke crontab:
```bash
# Jalankan setiap hari pada jam 2 pagi
0 2 * * * /usr/local/bin/vapor-backup.sh
```

## Upgrade Vapor

Untuk upgrade ke versi yang lebih baru:

### Upgrade Otomatis
```bash
# Unduh dan jalankan skrip upgrade
wget https://github.com/awanio/vapor/releases/latest/download/upgrade.sh
chmod +x upgrade.sh
sudo ./upgrade.sh
```

### Upgrade Manual
```bash
# Hentikan layanan
sudo systemctl stop vapor

# Backup binary saat ini
sudo cp /usr/local/bin/vapor /usr/local/bin/vapor.backup

# Unduh versi baru
wget https://github.com/awanio/vapor/releases/latest/download/vapor-linux-amd64 \
  -O /usr/local/bin/vapor

# Buat dapat dieksekusi
sudo chmod +x /usr/local/bin/vapor

# Mulai layanan
sudo systemctl start vapor
```

## Uninstall

Untuk menghapus Vapor sepenuhnya:

```bash
# Hentikan dan nonaktifkan layanan
sudo systemctl stop vapor
sudo systemctl disable vapor

# Hapus file
sudo rm -f /usr/local/bin/vapor
sudo rm -f /etc/systemd/system/vapor.service
sudo rm -rf /etc/vapor

# Reload systemd
sudo systemctl daemon-reload
```

## Pemecahan Masalah Instalasi

### Layanan Gagal Dimulai

Periksa log untuk error:
```bash
sudo journalctl -u vapor -n 100 --no-pager
```

Masalah umum:
- Port 8080 sudah digunakan
- Paket yang diperlukan tidak ada
- Izin tidak mencukupi

### Tidak Dapat Mengakses Antarmuka Web

1. Periksa apakah layanan berjalan:
   ```bash
   sudo systemctl is-active vapor
   ```

2. Periksa apakah port mendengarkan:
   ```bash
   sudo netstat -tlnp | grep 8080
   ```

3. Periksa aturan firewall:
   ```bash
   sudo iptables -L -n | grep 8080
   ```

### Error Permission Denied

Pastikan Vapor berjalan dengan priviledge yang sesuai:
```bash
# Periksa pengguna layanan
sudo systemctl show vapor | grep User=

# Harus menunjukkan: User=root
```

## Langkah Selanjutnya

Setelah instalasi selesai, lanjutkan ke [Login Pertama](03-first-login.md) untuk mengakses Vapor untuk pertama kalinya.

---

[← Sebelumnya: Pendahuluan](01-introduction.md) | [Selanjutnya: Login Pertama →](03-first-login.md)
