# Manajemen Kubernetes

## Gambaran Umum

Vapor menyediakan kemampuan manajemen cluster Kubernetes yang komprehensif, memungkinkan Anda mengelola workload, memantau resource, dan deploy aplikasi langsung dari antarmuka web. Bagian Kubernetes terintegrasi mulus dengan cluster Anda, menyediakan operasi dasar dan fitur lanjutan seperti manajemen Helm chart.

## Mengakses Fitur Kubernetes

Navigasi ke bagian Kubernetes melalui sidebar:

```
Kubernetes
├── Workloads     (Pod, Deployment, StatefulSet, dll.)
├── Networks      (Service, Ingress, NetworkPolicy)
├── Storages      (PVC, PV, StorageClass)
├── Configurations (ConfigMap, Secret)
├── Nodes         (Node cluster dan resource)
├── CRDs          (Custom Resource Definition)
└── Helm Charts   (Manajemen paket)
```

## Manajemen Workload

### Pod

Tampilan Pod menyediakan manajemen pod yang komprehensif:

![Daftar Pod Kubernetes](../assets/screenshots/k8s_pods_list.png)

#### Fitur Daftar Pod

**Filter Namespace**
- Pilih "Semua Namespace" atau namespace spesifik
- Perpindahan namespace cepat
- Isolasi namespace untuk keamanan

**Pencarian dan Filter**
- Pencarian real-time berdasarkan nama pod
- Filter berdasarkan status (Running, Pending, Failed)
- Urutkan berdasarkan umur, status, atau penggunaan resource

**Indikator Status**
- 🟢 **RUNNING**: Pod sehat dan berjalan
- 🟡 **PENDING**: Pod sedang dijadwalkan atau memulai
- 🔴 **FAILED**: Pod crash atau gagal memulai
- 🟠 **UNKNOWN**: Status pod tidak dapat ditentukan

#### Tampilan Informasi Pod

Setiap entri pod menampilkan:
- **Nama**: Identifier pod lengkap
- **Namespace**: Namespace Kubernetes
- **Status**: Status pod saat ini
- **Replika**: Jumlah kontainer
- **Umur**: Waktu sejak pembuatan
- **Aksi**: Menu aksi cepat

### Detail Pod

Klik pada pod mana pun untuk melihat informasi terperinci:

![Modal Detail Pod](../assets/screenshots/k8s_pod_detail.png)

#### Informasi Dasar
```yaml
Nama:              virt-launcher-019840fd-2c27-7d14-bbeb-98263371bda7-cnjvc
Namespace:         3cca58ab-5e85-473e-90a3-2862c2cf8f20
UID:               6e21864d-30e6-464d-bf4f-d73889bc3ba0
Resource Version:  1233755250
Waktu Pembuatan:   2025-07-25T09:52:03Z
Umur:              13 hari, 3 jam
```

#### Informasi Status
```yaml
Phase:       Running
QoS Class:   Burstable
Waktu Mulai: 2025-07-25T09:52:03Z
```

#### Informasi Jaringan
```yaml
IP Pod:      10.0.8.22
IP Host:     172.16.1.2
Node:        avid5
```

### Membuat Resource

Vapor mendukung pembuatan resource Kubernetes menggunakan YAML atau JSON:

![Buat Resource](../assets/screenshots/k8s_pod_create_form.png)

#### Proses Pembuatan Resource

1. **Klik tombol "Create"** di tampilan workload
2. **Masukkan definisi resource** dalam format YAML atau JSON
3. **Auto-deteksi format** mengidentifikasi sintaks
4. **Validasi** terjadi sebelum pengiriman
5. **Apply** untuk membuat resource

#### Contoh Pembuatan Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
  namespace: default
spec:
  containers:
  - name: nginx
    image: nginx:latest
    ports:
    - containerPort: 80
```

### Operasi Pod

#### Melihat Log

Akses log pod real-time:

![Viewer Log Pod](../assets/screenshots/k8s_pods_log.png)

**Fitur Log:**
- Streaming real-time
- Pencarian dalam log
- Tampilan timestamp
- Format JSON untuk log terstruktur
- Kemampuan ekspor

#### Menghapus Pod

Penghapusan aman dengan konfirmasi:

![Konfirmasi Hapus](../assets/screenshots/k8s_pods_delete.png)

**Keamanan Penghapusan:**
- Dialog konfirmasi menampilkan detail pod
- Peringatan tentang penghapusan permanen
- Verifikasi namespace
- Opsi batal tersedia

## Deployment

Kelola deployment aplikasi dengan:

### Fitur Deployment
- **Scaling**: Sesuaikan jumlah replika
- **Rolling Update**: Deployment tanpa downtime
- **Rollback**: Kembalikan ke versi sebelumnya
- **Konfigurasi Strategi**: RollingUpdate atau Recreate

### Membuat Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
        ports:
        - containerPort: 80
```

### Operasi Deployment
- **Scale**: Sesuaikan jumlah replika naik atau turun
- **Update**: Ubah image atau konfigurasi
- **Pause/Resume**: Kontrol proses rollout
- **History**: Lihat riwayat revisi

## StatefulSet

Untuk aplikasi stateful yang memerlukan:
- Identitas jaringan yang stabil
- Penyimpanan persisten
- Deployment dan scaling berurutan
- Terminasi berurutan

### Contoh StatefulSet

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
spec:
  serviceName: mysql
  replicas: 3
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        env:
        - name: MYSQL_ROOT_PASSWORD
          value: "secretpassword"
        volumeMounts:
        - name: mysql-storage
          mountPath: /var/lib/mysql
  volumeClaimTemplates:
  - metadata:
      name: mysql-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

## DaemonSet

Deploy pod di setiap node:
- Kolektor log
- Agent monitoring
- Plugin jaringan
- Daemon penyimpanan

## Job dan CronJob

### Job
Tugas satu kali:
- Pemrosesan data
- Operasi batch
- Tugas pemeliharaan

### CronJob
Tugas terjadwal berulang:
- Backup
- Pembuatan laporan
- Operasi pembersihan

## Jaringan

### Service

Ekspos aplikasi dalam cluster:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  selector:
    app: nginx
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
  type: ClusterIP
```

**Tipe Service:**
- **ClusterIP**: Akses internal cluster
- **NodePort**: Akses eksternal melalui port node
- **LoadBalancer**: Load balancer cloud provider
- **ExternalName**: Record DNS CNAME

### Ingress

Routing HTTP/HTTPS:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nginx-ingress
spec:
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: nginx-service
            port:
              number: 80
```

## Penyimpanan

### Persistent Volume Claim (PVC)

Request penyimpanan untuk pod:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: fast-ssd
```

### Storage Class

Definisikan tipe penyimpanan:
- Tier performa
- Kebijakan backup
- Pengaturan enkripsi
- Konfigurasi provisioner

## Konfigurasi

### ConfigMap

Simpan data konfigurasi:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  database.conf: |
    host=localhost
    port=5432
    name=myapp
  app.properties: |
    debug=false
    version=1.0.0
```

### Secret

Kelola data sensitif:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mysql-secret
type: Opaque
data:
  password: cGFzc3dvcmQxMjM=  # base64 encoded
```

## Manajemen Helm Chart

Vapor menyertakan dukungan Helm penuh:

### Operasi Helm
- **List Release**: Lihat semua chart yang di-deploy
- **Install Chart**: Deploy dari repository
- **Upgrade Release**: Update ke versi baru
- **Rollback**: Kembalikan ke release sebelumnya
- **Uninstall**: Hapus chart yang di-deploy

### Menginstal Helm Chart

```bash
# Contoh: Menginstal Prometheus
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/prometheus
```

### Mengelola Release

Lihat dan kelola release Helm:
- Nama release dan namespace
- Versi chart
- Versi aplikasi
- Status (deployed, failed, pending)
- Timestamp terakhir diperbarui

## Custom Resource Definition (CRD)

Perluas Kubernetes dengan resource kustom:

### Melihat CRD
- Daftar semua CRD yang terinstal
- Lihat detail dan versi CRD
- Akses resource kustom
- Monitor status CRD

### CRD Umum
- Sertifikat cert-manager
- Service mesh Istio
- Monitoring Prometheus
- Resource yang dikelola operator

## Manajemen Node

Monitor node cluster:
- Alokasi resource
- Penjadwalan pod
- Kondisi node
- Taint dan toleration

## Praktik Terbaik

### Manajemen Resource
1. **Set limit resource**: Cegah kehabisan resource
2. **Gunakan namespace**: Isolasi workload
3. **Label konsisten**: Manajemen lebih mudah
4. **Monitor resource**: Lacak pola penggunaan

### Keamanan
1. **Gunakan RBAC**: Kontrol akses berbasis peran
2. **Amankan secret**: Enkripsi data sensitif
3. **Network policy**: Kontrol aliran trafik
4. **Pod security**: Gunakan security context

### High Availability
1. **Multiple replika**: Hindari single point of failure
2. **Pod disruption budget**: Kontrol pemeliharaan
3. **Liveness probe**: Pemulihan otomatis
4. **Readiness probe**: Manajemen trafik

## Pemecahan Masalah

### Masalah Umum

#### Pod Tidak Memulai
1. Periksa event pod
2. Tinjau log kontainer
3. Verifikasi ketersediaan image
4. Periksa batasan resource

#### Service Discovery
1. Verifikasi selector service
2. Periksa pembuatan endpoint
3. Test resolusi DNS
4. Validasi network policy

#### Masalah Penyimpanan
1. Periksa binding PVC
2. Verifikasi storage class
3. Tinjau permission volume
4. Monitor ruang disk

## Integrasi dengan CI/CD

Fitur Kubernetes Vapor terintegrasi dengan:
- Workflow GitOps
- Pipeline CI/CD
- Helm chart
- Perintah kubectl

## Langkah Selanjutnya

- Jelajahi [Manajemen Kontainer](08-container-management.md)
- Pelajari tentang [Integrasi API](13-api-reference.md#kubernetes)
- Tinjau [Praktik Terbaik Keamanan](14-security.md#kubernetes)

---

[← Sebelumnya: Manajemen Kontainer](08-container-management.md) | [Selanjutnya: Manajemen Pengguna →](10-user-management.md)
