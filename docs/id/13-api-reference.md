# Referensi API

## Ikhtisar

Vapor menyediakan RESTful API yang komprehensif untuk manajemen sistem, memungkinkan akses terprogram ke semua fitur yang tersedia di antarmuka web. API menggunakan autentikasi JWT dan mendukung format JSON dan YAML untuk sumber daya Kubernetes.

## URL Dasar

```
http://localhost:8080/api/v1
```

Ganti `localhost:8080` dengan alamat dan port server Anda.

## Autentikasi

### Autentikasi Token JWT

Semua endpoint API (kecuali `/auth/login`) memerlukan autentikasi JWT. Sertakan token dalam header Authorization:

```http
Authorization: Bearer <token-jwt-anda>
```

### Endpoint Login

**POST** `/auth/login`

Melakukan autentikasi dan menerima token JWT.

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_at": 1704067200
  }
}
```

**Metode Autentikasi:**
1. **Akun admin bawaan** (hanya untuk pengembangan):
   - Username: `admin`
   - Password: `admin123`
   
2. **Pengguna sistem Linux** (disarankan untuk produksi):
   - Pengguna Linux yang valid dengan kredensial sistem
   - Menggunakan autentikasi sistem melalui perintah `su`

## Endpoint API

### Manajemen Jaringan

#### Daftar Antarmuka Jaringan
**GET** `/network/interfaces`

Mengembalikan semua antarmuka jaringan dengan konfigurasi dan statistiknya.

**Response:**
```json
{
  "status": "success",
  "data": {
    "interfaces": [
      {
        "name": "eth0",
        "mac": "00:11:22:33:44:55",
        "mtu": 1500,
        "state": "up",
        "type": "ethernet",
        "addresses": ["192.168.1.100/24"],
        "statistics": {
          "rx_bytes": 1048576,
          "tx_bytes": 524288,
          "rx_packets": 1000,
          "tx_packets": 500
        }
      }
    ]
  }
}
```

#### Mengaktifkan Antarmuka
**PUT** `/network/interfaces/{name}/up`

Mengaktifkan antarmuka jaringan.

**Parameter:**
- `name` (path): Nama antarmuka

**Response:**
```json
{
  "status": "success",
  "data": {
    "message": "Interface eth0 berhasil diaktifkan"
  }
}
```

#### Menonaktifkan Antarmuka
**PUT** `/network/interfaces/{name}/down`

Menonaktifkan antarmuka jaringan.

#### Konfigurasi Alamat IP
**POST** `/network/interfaces/{name}/address`

Menambahkan alamat IP ke antarmuka.

**Request Body:**
```json
{
  "address": "192.168.1.100",
  "netmask": 24,
  "gateway": "192.168.1.1"
}
```

### Manajemen Penyimpanan

#### Daftar Disk
**GET** `/storage/disks`

Mengembalikan informasi tentang semua disk penyimpanan.

**Response:**
```json
{
  "status": "success",
  "data": {
    "disks": [
      {
        "name": "sda",
        "path": "/dev/sda",
        "size": 107374182400,
        "model": "Samsung SSD 860",
        "type": "ssd",
        "partitions": [
          {
            "name": "sda1",
            "path": "/dev/sda1",
            "size": 536870912,
            "filesystem": "ext4",
            "mount_point": "/boot",
            "used": 104857600,
            "available": 432013312
          }
        ]
      }
    ]
  }
}
```

#### Mount Filesystem
**POST** `/storage/mount`

Memasang filesystem pada mount point yang ditentukan.

**Request Body:**
```json
{
  "device": "/dev/sdb1",
  "mount_point": "/mnt/data",
  "filesystem": "ext4",
  "options": "rw,noatime"
}
```

#### Format Disk
**POST** `/storage/format`

Memformat disk dengan filesystem yang ditentukan.

**Request Body:**
```json
{
  "device": "/dev/sdb",
  "filesystem": "ext4",
  "label": "DATA"
}
```

### Manajemen Container

#### Daftar Container
**GET** `/containers`

Mengembalikan semua container dari runtime yang tersedia (Docker, containerd, atau CRI-O).

**Response:**
```json
{
  "status": "success",
  "data": {
    "containers": [
      {
        "id": "2309b08a1303...",
        "name": "nginx",
        "image": "nginx:latest",
        "state": "CONTAINER_RUNNING",
        "created_at": "2025-07-25T09:38:51Z",
        "runtime": "docker"
      }
    ],
    "count": 5,
    "runtime": "docker"
  }
}
```

#### Detail Container
**GET** `/containers/{id}`

Mengembalikan informasi detail tentang container tertentu.

#### Log Container
**GET** `/containers/{id}/logs`

Mengembalikan log dari container.

**Response:**
```json
{
  "status": "success",
  "data": {
    "container_id": "abc123def456",
    "logs": "2025-08-02 09:00:00 Aplikasi dimulai\n2025-08-02 09:00:01 Mendengarkan pada port 8080\n",
    "runtime": "docker"
  }
}
```

### Manajemen Docker

#### Daftar Container Docker
**GET** `/docker/ps`

Menampilkan semua container Docker.

**Response:**
```json
{
  "status": "success",
  "data": {
    "containers": [
      {
        "id": "abc123",
        "names": ["/nginx"],
        "image": "nginx:latest",
        "state": "running",
        "status": "Up 2 hours",
        "ports": ["80/tcp->8080/tcp"]
      }
    ]
  }
}
```

#### Membuat Container Docker
**POST** `/docker/containers`

Membuat container Docker baru.

**Request Body:**
```json
{
  "name": "my-nginx",
  "image": "nginx:latest",
  "env": ["ENV=production"],
  "portBindings": {
    "80/tcp": [{"hostPort": "8080"}]
  }
}
```

#### Memulai Container
**POST** `/docker/containers/{id}/start`

Memulai container yang dihentikan.

#### Menghentikan Container
**POST** `/docker/containers/{id}/stop`

Menghentikan container yang sedang berjalan.

#### Menghapus Container
**DELETE** `/docker/containers/{id}`

Menghapus container (harus dihentikan terlebih dahulu).

#### Pull Docker Image
**POST** `/docker/images/pull`

Mengunduh image dari Docker Hub atau registry lain.

**Request Body:**
```json
{
  "imageName": "nginx",
  "tag": "latest"
}
```

### Manajemen Kubernetes

#### Daftar Pod
**GET** `/kubernetes/pods`

Menampilkan semua pod di semua namespace.

**Response:**
```json
{
  "status": "success",
  "data": {
    "pods": [
      {
        "name": "nginx-deployment-5d59d67564-abc12",
        "namespace": "default",
        "status": "Running",
        "ready": "1/1",
        "restarts": 0,
        "age": "2d",
        "ip": "10.244.1.5",
        "node": "worker-1"
      }
    ]
  }
}
```

#### Membuat/Memperbarui Pod
**POST** `/kubernetes/pods`

Membuat atau memperbarui pod menggunakan semantik apply Kubernetes.

**Headers:**
- `Content-Type`: `application/json`, `application/yaml`, atau `text/yaml`

**Request Body (JSON):**
```json
{
  "apiVersion": "v1",
  "kind": "Pod",
  "metadata": {
    "name": "nginx-pod",
    "namespace": "default"
  },
  "spec": {
    "containers": [
      {
        "name": "nginx",
        "image": "nginx:latest",
        "ports": [{"containerPort": 80}]
      }
    ]
  }
}
```

**Request Body (YAML):**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
  namespace: default
spec:
  containers:
  - name: nginx
    image: nginx:latest
    ports:
    - containerPort: 80
```

#### Daftar Deployment
**GET** `/kubernetes/deployments`

Menampilkan semua deployment di semua namespace.

#### Membuat/Memperbarui Deployment
**POST** `/kubernetes/deployments`

Membuat atau memperbarui deployment.

#### Daftar Service
**GET** `/kubernetes/services`

Menampilkan semua service Kubernetes.

#### Membuat/Memperbarui Service
**POST** `/kubernetes/services`

Membuat atau memperbarui service Kubernetes.

#### Daftar Custom Resource Definition
**GET** `/kubernetes/crds`

Menampilkan semua CRD dalam cluster.

**Response:**
```json
{
  "status": "success",
  "data": {
    "crds": [
      {
        "name": "certificates.cert-manager.io",
        "group": "cert-manager.io",
        "version": "v1",
        "kind": "Certificate",
        "scope": "Namespaced",
        "age": "30d"
      }
    ]
  }
}
```

### Manajemen Pengguna

#### Daftar Pengguna
**GET** `/users`

Menampilkan semua pengguna sistem.

**Response:**
```json
{
  "status": "success",
  "data": {
    "users": [
      {
        "username": "john",
        "uid": "1000",
        "gid": "1000",
        "home": "/home/john",
        "shell": "/bin/bash"
      }
    ]
  }
}
```

#### Membuat Pengguna
**POST** `/users`

Membuat pengguna sistem baru.

**Request Body:**
```json
{
  "username": "newuser",
  "password": "securepassword",
  "groups": "wheel,docker"
}
```

#### Reset Password
**POST** `/users/{username}/reset-password`

Mereset password pengguna.

**Request Body:**
```json
{
  "password": "newSecurePassword123"
}
```

### Monitoring Sistem

#### Ringkasan Sistem
**GET** `/system/summary`

Mengembalikan informasi sistem yang komprehensif.

**Response:**
```json
{
  "status": "success",
  "data": {
    "hostname": "server1",
    "os": "Ubuntu 22.04 LTS",
    "kernel": "5.15.0-58-generic",
    "uptime": 8640000,
    "load_average": [1.5, 1.2, 0.9]
  }
}
```

#### Informasi CPU
**GET** `/system/cpu`

Mengembalikan informasi CPU detail.

#### Informasi Memori
**GET** `/system/memory`

Mengembalikan statistik penggunaan memori.

### Log Sistem

#### Query Log
**GET** `/logs`

Mengquery log sistem dengan opsi filter.

**Query Parameter:**
- `service`: Filter berdasarkan nama service
- `priority`: Filter berdasarkan prioritas (debug, info, warning, error, critical)
- `since`: Tampilkan log sejak timestamp
- `until`: Tampilkan log sampai timestamp
- `page`: Nomor halaman (default: 1)
- `page_size`: Item per halaman (default: 100, max: 1000)

**Response:**
```json
{
  "status": "success",
  "data": {
    "logs": [
      {
        "timestamp": "2025-08-01T10:30:00Z",
        "priority": "info",
        "unit": "sshd",
        "message": "Accepted publickey for user",
        "hostname": "server1",
        "pid": 1234
      }
    ],
    "total_count": 500,
    "page": 1,
    "page_size": 100
  }
}
```

## Endpoint WebSocket

### Metrik Sistem Live
**WebSocket** `/ws/metrics`

Streaming metrik sistem real-time.

**Koneksi:**
```javascript
const ws = new WebSocket('ws://localhost:8080/ws/metrics');

// Autentikasi
ws.send(JSON.stringify({
  type: 'auth',
  payload: { token: 'token-jwt-anda' }
}));

// Subscribe ke metrik
ws.send(JSON.stringify({ type: 'subscribe' }));

// Menerima metrik
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // { type: 'metric', metric: 'cpu', timestamp: '...', data: {...} }
};
```

### Streaming Log Live
**WebSocket** `/ws/logs`

Streaming log real-time dengan filtering.

**Contoh Subscribe:**
```javascript
ws.send(JSON.stringify({
  type: 'subscribe',
  payload: {
    filters: {
      unit: 'sshd',
      priority: 'info',
      follow: true
    }
  }
}));
```

### Sesi Terminal
**WebSocket** `/ws/terminal`

Sesi terminal interaktif melalui WebSocket.

**Memulai Terminal:**
```javascript
ws.send(JSON.stringify({
  type: 'subscribe',
  payload: {
    cols: 80,
    rows: 24,
    shell: '/bin/bash'
  }
}));

// Kirim input
ws.send(JSON.stringify({
  type: 'input',
  data: 'ls -la\n'
}));
```

## Penanganan Error

Semua response error mengikuti format ini:

```json
{
  "status": "error",
  "error": {
    "code": "ERROR_CODE",
    "message": "Pesan error yang dapat dibaca",
    "details": "Detail error tambahan"
  }
}
```

### Kode Error Umum

| Kode | Deskripsi |
|------| ----------- |
| `UNAUTHORIZED` | Token JWT tidak ada atau tidak valid |
| `INVALID_INPUT` | Parameter request tidak valid |
| `NOT_FOUND` | Resource tidak ditemukan |
| `DOCKER_ERROR` | Error Docker daemon |
| `KUBERNETES_NOT_INSTALLED` | Kubernetes tidak tersedia |
| `NO_RUNTIME_AVAILABLE` | Runtime container tidak ditemukan |
| `PERMISSION_DENIED` | Izin tidak mencukupi |

## Rate Limiting

API menerapkan rate limiting untuk mencegah penyalahgunaan:
- **Limit default**: 100 request per menit per IP
- **Koneksi WebSocket**: Maksimum 10 koneksi bersamaan per klien
- **Upload file**: Maksimum 100MB per file

## Praktik Terbaik

1. **Manajemen Token**
   - Simpan token dengan aman
   - Implementasikan refresh token sebelum kadaluarsa
   - Jangan pernah mengekspos token di URL atau log

2. **Penanganan Error**
   - Selalu periksa field `status`
   - Implementasikan exponential backoff untuk retry
   - Log error untuk debugging

3. **Koneksi WebSocket**
   - Implementasikan logika reconnection
   - Tangani drop koneksi dengan baik
   - Bersihkan koneksi saat selesai

4. **Pembuatan Resource**
   - Gunakan semantik apply untuk operasi idempoten
   - Validasi YAML/JSON sebelum mengirim
   - Sertakan metadata dan label yang tepat

## SDK dan Contoh

### Contoh JavaScript/TypeScript

```javascript
class VaporAPI {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async request(method, path, body = null) {
    const response = await fetch(`${this.baseURL}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : null
    });

    const data = await response.json();
    if (data.status === 'error') {
      throw new Error(data.error.message);
    }
    return data.data;
  }

  async getContainers() {
    return this.request('GET', '/containers');
  }

  async createPod(podSpec) {
    return this.request('POST', '/kubernetes/pods', podSpec);
  }
}
```

### Contoh Python

```python
import requests
import json

class VaporAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def get_containers(self):
        response = requests.get(
            f'{self.base_url}/containers',
            headers=self.headers
        )
        return response.json()
    
    def create_pod(self, pod_spec):
        response = requests.post(
            f'{self.base_url}/kubernetes/pods',
            headers=self.headers,
            json=pod_spec
        )
        return response.json()
```

### Contoh cURL

```bash
# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Dapatkan container
curl -X GET http://localhost:8080/api/v1/containers \
  -H "Authorization: Bearer <token>"

# Buat pod Kubernetes
curl -X POST http://localhost:8080/api/v1/kubernetes/pods \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/yaml" \
  --data-binary @pod.yaml
```

## Versi API

API menggunakan versioning berbasis URL:
- Versi saat ini: `v1`
- Base path: `/api/v1`

Versi mendatang akan tersedia di `/api/v2`, dll., dengan kompatibilitas mundur dipertahankan selama minimal 6 bulan setelah rilis versi baru.

## Dukungan

Untuk dukungan dan pertanyaan API:
- GitHub Issues: [github.com/vapor/issues](https://github.com/vapor/issues)
- Dokumentasi API: Tersedia di endpoint `/docs`
- Forum Komunitas: [community.vapor.io](https://community.vapor.io)

---

[← Sebelumnya: Akses Terminal](12-terminal-access.md) | [Selanjutnya: Keamanan →](14-security.md)
