# Dashboard

## Gambaran Umum

Dashboard Vapor menyediakan tampilan real-time yang komprehensif tentang kesehatan dan performa sistem Anda. Ini adalah layar pertama yang Anda lihat setelah login dan berfungsi sebagai pusat komando untuk pemantauan sistem.

![Antarmuka Utama](../assets/screenshots/dashboard_main_view_realtime_metrics_dark.png)

## Tata Letak Dashboard

Dashboard dibagi menjadi beberapa bagian utama:

### 1. Panel Gambaran Sistem

Terletak di sudut kiri atas, panel ini menampilkan informasi sistem penting:

- **Hostname**: Nama server Anda
- **Sistem Operasi**: Distribusi dan versi Linux
- **Kernel**: Informasi versi kernel
- **Uptime**: Berapa lama sistem telah berjalan
- **Arsitektur**: Arsitektur sistem (mis., x86_64, ARM64)

Contoh:
```
Hostname:        avid5
Sistem Operasi:  linux
Kernel:          5.4.0-214-generic
Uptime:          101 hari, 2 jam, 6 menit
Arsitektur:      ubuntu
```

### 2. Panel Informasi CPU

Panel CPU menyediakan informasi prosesor terperinci:

- **Model**: Nama lengkap dan spesifikasi prosesor
- **Core**: Jumlah core CPU yang tersedia
- **Load Average**: Beban sistem selama 1, 5, dan 15 menit
- **Penggunaan Saat Ini**: Persentase utilisasi CPU real-time

Contoh:
```
Model:         Intel(R) Xeon(R) CPU E5-2620 v4 @ 2.10GHz
Core:          1
Load Average:  4.10, 3.53, 3.79
Penggunaan:    10.2%
```

### 3. Panel Informasi Memori

Menampilkan statistik memori komprehensif:

- **Total**: Total memori sistem
- **Digunakan**: Memori yang sedang digunakan dengan persentase
- **Bebas**: Memori yang segera tersedia
- **Tersedia**: Memori yang tersedia untuk alokasi tanpa swapping

Contoh:
```
Total:     251.84 GB
Digunakan: 53.04 GB (21.1%)
Bebas:     29.41 GB
Tersedia:  197.2 GB
```

## Metrik Real-Time

### Grafik Penggunaan CPU

Grafik penggunaan CPU menunjukkan:
- **Update real-time**: Diperbarui setiap detik melalui WebSocket
- **Data historis**: 5 menit terakhir penggunaan CPU
- **Interaktif**: Hover untuk melihat nilai tepat
- **Kode warna**: 
  - Hijau (0-50%): Penggunaan normal
  - Kuning (50-80%): Penggunaan sedang
  - Merah (80-100%): Penggunaan tinggi

### Grafik Penggunaan Memori

Grafik penggunaan memori menampilkan:
- **Konsumsi memori**: Penggunaan memori real-time
- **Analisis tren**: Representasi visual tren memori
- **Buffer/Cache**: Membedakan antara memori yang digunakan dan di-cache
- **Penggunaan Swap**: Jika swap dikonfigurasi

## Fitur Interaktif

### 1. Auto-Refresh

Semua metrik diperbarui otomatis secara real-time:
- Metrik sistem: Setiap 1 detik
- Grafik: Streaming berkelanjutan
- Tidak perlu refresh manual

### 2. Tampilan Terperinci

Klik pada panel mana pun untuk mengakses informasi terperinci:
- **Panel CPU** → Statistik CPU terperinci dan penggunaan per-core
- **Panel Memori** → Rincian memori berdasarkan jenis
- **Panel Sistem** → Informasi sistem lengkap

### 3. Aksi Cepat

Tersedia dari dashboard:
- **Lihat Proses**: Link cepat ke manajemen proses
- **Log Sistem**: Lompat ke log sistem terbaru
- **Status Jaringan**: Lihat interface jaringan
- **Gambaran Penyimpanan**: Periksa penggunaan disk

## Memahami Metrik

### Load Average

Tiga angka load average mewakili:
1. **Rata-rata 1 menit**: Beban sistem segera
2. **Rata-rata 5 menit**: Tren terkini
3. **Rata-rata 15 menit**: Pola jangka panjang

**Aturan praktis**: Load average sebaiknya kurang dari jumlah core CPU.

### Jenis Memori

- **Digunakan**: Memori aktif oleh aplikasi
- **Bebas**: Memori yang benar-benar tidak digunakan
- **Tersedia**: Memori yang dapat dibebaskan jika diperlukan
- **Buffer/Cache**: Memori yang digunakan untuk optimasi performa

### Status CPU

Penggunaan CPU meliputi:
- **User**: Waktu yang dihabiskan untuk proses pengguna
- **System**: Waktu yang dihabiskan untuk operasi kernel
- **Idle**: Waktu CPU tidak digunakan
- **I/O Wait**: Waktu menunggu operasi disk/jaringan

## Kustomisasi Dashboard

### Pemilihan Tema

Beralih antara tema gelap dan terang:
1. Klik ikon tema (🌓) di top bar
2. Dashboard menyesuaikan dengan preferensi Anda
3. Grafik dan chart menyesuaikan warna otomatis

### Dukungan Bahasa

Beralih antara Inggris dan Indonesia:
1. Klik ikon bahasa (🌐)
2. Semua label dan teks diperbarui segera
3. Format angka menyesuaikan dengan lokal

## Optimasi Performa

Dashboard dioptimalkan untuk:
- **Bandwidth rendah**: Transfer data WebSocket yang efisien
- **Update frekuensi tinggi**: Tanpa membebani browser
- **Display besar**: Skala dari mobile hingga layar 4K
- **Beberapa tab**: Pause update saat tab tidak terlihat

## Pemecahan Masalah Dashboard

### Metrik Tidak Diperbarui

Jika metrik real-time berhenti update:
1. Periksa indikator koneksi di status bar
2. Verifikasi koneksi WebSocket aktif
3. Refresh halaman jika diperlukan

### Penggunaan Resource Tinggi

Jika dashboard sendiri menggunakan terlalu banyak CPU:
1. Kurangi frekuensi update di pengaturan
2. Tutup tab dashboard yang tidak digunakan
3. Gunakan tema terang untuk performa lebih baik

### Akurasi Data

Untuk data paling akurat:
- Metrik CPU: Rata-rata selama 1 detik
- Metrik memori: Snapshot setiap detik
- Load average: Nilai yang dilaporkan kernel

## Pengalaman Mobile

Pada perangkat mobile:
- Panel ditumpuk vertikal
- Grafik menyesuaikan ukuran otomatis
- Gesture sentuh untuk interaksi grafik
- Tata letak disederhanakan untuk layar kecil

## Pintasan Keyboard

Percepat navigasi dengan pintasan keyboard:
- `R` - Refresh semua metrik
- `D` - Toggle tema gelap/terang
- `F` - Toggle fullscreen
- `?` - Tampilkan pintasan keyboard

## Ekspor dan Laporan

Dari dashboard, Anda dapat:
1. **Ekspor metrik**: Unduh data saat ini sebagai CSV
2. **Generate laporan**: Buat ringkasan PDF
3. **Bagikan snapshot**: Bagikan status dashboard melalui link
4. **Akses API**: Dapatkan data mentah melalui REST API

## Integrasi dengan Fitur Lain

Dashboard terintegrasi dengan:
- **Alert**: Indikator visual untuk alert sistem
- **Notifikasi**: Notifikasi masalah real-time
- **Log**: Akses cepat ke entri log terkait
- **Terminal**: Buka terminal untuk tindakan segera

## Praktik Terbaik

1. **Monitor secara teratur**: Periksa dashboard setidaknya harian
2. **Atur alert**: Konfigurasi threshold untuk metrik kritis
3. **Pahami baseline**: Ketahui perilaku normal sistem Anda
4. **Tanggapi tren**: Atasi masalah sebelum menjadi kritis

## Langkah Selanjutnya

- Pelajari tentang [Manajemen Jaringan](06-network-management.md)
- Konfigurasi [Alert Sistem](14-security.md#alerts)
- Jelajahi [Integrasi API](13-api-reference.md#metrics)

---

[← Sebelumnya: Antarmuka Pengguna](04-user-interface.md) | [Selanjutnya: Manajemen Jaringan →](06-network-management.md)
