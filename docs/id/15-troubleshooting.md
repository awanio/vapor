# Pemecahan Masalah

## Gambaran Umum

Bagian ini mencakup pemecahan masalah di Vapor.

## Fitur Utama

- Fitur 1
- Fitur 2
- Fitur 3

## Memulai

[Konten untuk Pemecahan Masalah akan ditambahkan di sini]

## Praktik Terbaik

1. Praktik terbaik 1
2. Praktik terbaik 2
3. Praktik terbaik 3

## Pemecahan Masalah

### Masalah Umum

#### Ketidakcocokan Versi Libvirt

**Error:** `/lib/x86_64-linux-gnu/libvirt.so.0: version 'LIBVIRT_8.0.0' not found`

**Penyebab:** Sistem Anda memiliki versi libvirt yang lebih lama (umumnya di Ubuntu 20.04 atau Debian 11).

**Solusi:**
- **Ubuntu 20.04:** Aktifkan Ubuntu Cloud Archive seperti dijelaskan dalam [Panduan Instalasi](02-installation.md).
- **OS Lain:** Upgrade sistem operasi Anda ke versi yang didukung (contoh: Ubuntu 22.04+, Debian 12+, RHEL 9+).

#### Tampilan VM UEFI Tidak Terinisialisasi

**Error:** Konsol VNC menampilkan "Guest has not initialized the display (yet)"

**Penyebab:** Ini biasanya terjadi saat menggunakan UEFI (terutama dengan Secure Boot) dikombinasikan dengan versi QEMU lama (lebih lama dari 6.2). Versi QEMU lama seperti 4.2.x memiliki masalah kompatibilitas dengan firmware OVMF modern SMM (System Management Mode).

**Solusi:**
- **Upgrade QEMU:** Pastikan Anda menjalankan QEMU 6.2 atau yang lebih baru.
- **Pengguna Ubuntu 20.04:** Ubuntu 20.04 menyertakan QEMU 4.2 yang terlalu lama untuk dukungan UEFI yang tepat. Harap upgrade ke Ubuntu 22.04 atau yang lebih baru.
- **Workaround:** Jika Anda tidak dapat melakukan upgrade, coba buat VM tanpa mengaktifkan Secure Boot.

#### Tidak Dapat Terhubung ke Konsol

**Error:** Koneksi WebSocket gagal atau terputus segera.

**Solusi:**
1. Periksa apakah VM benar-benar berjalan (`virsh list --all`).
2. Verifikasi port 7770 dapat dijangkau dan tidak diblokir oleh firewall.
3. Periksa `vapor.log` untuk masalah permission ke soket VNC.
4. Pastikan pengguna `vapor` ada di grup `libvirt` (`sudo usermod -aG libvirt vapor`).

## Langkah Selanjutnya

- Pelajari lebih lanjut tentang fitur terkait
- Jelajahi konfigurasi lanjutan
- Tinjau pertimbangan keamanan

---

[← Sebelumnya: Keamanan](14-security.md) | [Selanjutnya: Kembali ke Indeks →](README.md)