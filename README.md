# Matcha Bee x Daily Kopi To Go - Aplikasi POS Kasir

Aplikasi POS berbasis web untuk kasir dan penjualan harian Daily Kopi ToGo.
Data aplikasi disimpan di browser menggunakan LocalStorage, sehingga bisa dipakai tanpa database atau server.

---

## FITUR UTAMA

### 1. Dashboard Profesional
- Tampilan dashboard profesional dengan warna netral, kartu ringkasan yang lebih rapat, dan visual yang lebih fokus pada data operasional.
- Menampilkan omzet, laba, item terjual, dan total produk berdasarkan tanggal dashboard yang dipilih.
- Tanggal dashboard bisa dipilih langsung dari toolbar.
- Tombol refresh dashboard membaca ulang data dari LocalStorage dan merender ulang tampilan dashboard, produk, kasir, dan keranjang.
- Grafik penjualan default 5 hari terakhir dari tanggal yang dipilih.
- Grafik bisa diganti berdasarkan Omzet, Laba, atau Qty.
- Ringkasan penjualan berdasarkan metode pembayaran.
- Top 5 produk terlaris pada tanggal yang dipilih.
- Alert stok menipis (otomatis mendeteksi stok < 5) dengan shortcut ke menu produk.
- Ringkasan tanggal pilihan: total transaksi, rata-rata transaksi, item per transaksi, dan total laba.

### 2. Menu Kasir & Fitur Cetak Struk (Thermal Printer)
- Layout kasir dua area: daftar produk dan transaksi kasir.
- Tampilan kasir dibuat lebih bersih dengan produk, kategori, keranjang, dan tombol bayar yang lebih tegas untuk alur kerja kasir harian.
- Daftar pilihan produk memiliki scroll sendiri saat produk banyak.
- Kategori produk di kasir bisa digeser horizontal pada layar sempit.
- Pencarian produk berdasarkan nama dan Filter kategori produk.
- Keranjang kasir dengan gambar produk, qty, subtotal, diskon, pajak, dan total.
- Metode pembayaran: Cash, QRIS, Transfer, dan ada menu diskon yang bisa di input dengan nominal / persen.
- Upload dan tampilkan barcode QRIS toko saat pembayaran QRIS.
- Tambah catatan atau keterangan pada item terakhir.
- **Dukungan Thermal Printer (58mm/80mm)**: Struk otomatis dicetak menggunakan format khusus kasir, tanpa dialog sistem (tergantung dukungan browser).
- Cetak ulang struk terakhir dari dashboard atau riwayat laporan kapan saja.
- Kirim Struk ke WhatsApp pelanggan langsung dari sistem.

### 3. Produk
- Tambah, edit, dan hapus produk (Data: nama, kategori, modal, harga jual, gambar, stok).
- Perhitungan stok cerdas: Stok Awal + Stok Masuk - Stok Terjual = Stok Akhir.
- Status Stok Otomatis: 
  - **Aman**: >= 5 
  - **Rendah**: < 5 
  - **Hampir Habis**: < 3 
  - **Habis**: 0
- Format titik ribuan otomatis untuk input nominal uang dan penghitungan margin/laba instan.
- Export data produk ke Excel.

### 4. Laporan
- Filter laporan berdasarkan Daily, Weekly, dan Monthly.
- Kartu ringkasan: total transaksi, total qty, total omzet, dan total laba.
- Tabel laporan detail per transaksi.
- Export laporan ke Excel dalam 1 sheet dengan 3 bagian (Detail Transaksi, Produk Terjual, Keuangan).

### 5. Pengaturan & Reset Data Aman
- Manajemen keamanan dengan **PIN Admin**.
- Backup data lengkap ke file JSON dan Restore dari file JSON.
- Reset data granular: Pilih spesifik produk, transaksi, atau keranjang yang ingin dihapus. Semua dikunci dengan verifikasi PIN.
- Export seluruh riwayat transaksi ke Excel.

### 6. PWA (Progressive Web App) & Responsif
- **Aplikasi PWA (Progressive Web App)**: Bisa diinstal langsung ke perangkat Android/Windows/iOS layaknya aplikasi native. Mendukung offline caching sehingga dapat dibuka tanpa koneksi internet yang stabil.
- Layout responsif penuh untuk desktop, tablet (POS Android), dan layar EDC kecil. Navigasi berubah dinamis menyesuaikan lebar layar.
- Splash screen khusus yang terintegrasi halus.

---

## CARA MENJALANKAN

1. Extract ZIP atau buka folder aplikasi (hasil clone).
2. Anda bisa langsung membuka file `index.html` di browser.
3. Untuk mengaktifkan fitur PWA & Service Worker secara sempurna, jalankan menggunakan server lokal:
   
   ```bash
   python -m http.server 8000
   ```
   Lalu buka di browser: `http://localhost:8000`

---

## STRUKTUR FILE

- `index.html`: Struktur utama aplikasi, UI kasir, laporan, dialog.
- `manifest.json`: Konfigurasi PWA dan meta instalasi.
- `service-worker.js`: Cache aset aplikasi (Offline mode).
- `assets/`
  - `css/`: Terdiri dari `style.css` (utama), `animations.css` (animasi), `splash.css`, dan `premium.css` (tema Matcha Bee).
  - `js/`: Berisi logika utama `app.js` dan `enhance.js`.
  - `images/`: Logo dan placeholder aplikasi.

---

## CATATAN PENTING

- Aplikasi menggunakan penyimpanan **LocalStorage** per browser. Tidak ada database cloud (Serverless).
- **Lakukan Backup JSON** secara rutin lewat Pengaturan untuk menghindari hilangnya data saat Cache/History browser dibersihkan.
- Jika ada update aplikasi namun tampilan tidak berubah, lakukan Hard Refresh (`Ctrl + F5`) atau clear cache agar Service Worker PWA memperbarui aset yang baru.

**Daily Kopi ToGo POS**  
Version 1.0.0  
*Developed by Agan Sulisfiana*
