Daily Kopi ToGo - Aplikasi POS Kasir Sederhana

Aplikasi POS berbasis web untuk kasir dan penjualan harian Daily Kopi ToGo.
Data aplikasi disimpan di browser menggunakan LocalStorage, sehingga bisa
dipakai tanpa database atau server.


FITUR UTAMA

1. Dashboard Profesional
- Tampilan dashboard modern dengan kartu ringkasan.
- Menampilkan omzet hari ini, laba hari ini, item terjual, dan total produk.
- Grafik penjualan default 5 hari terakhir.
- Grafik bisa diganti berdasarkan Omzet, Laba, atau Qty.
- Ringkasan penjualan berdasarkan metode pembayaran.
- Top 5 produk terlaris hari ini.
- Alert stok menipis dengan shortcut ke menu produk.
- Ringkasan hari ini: total transaksi, rata-rata transaksi, item per transaksi,
  dan total laba hari ini.

2. Menu Kasir
- Layout kasir dua area: daftar produk dan transaksi kasir.
- Pencarian produk berdasarkan nama.
- Filter kategori produk.
- Klik produk untuk langsung menambahkan item ke keranjang.
- Keranjang kasir dengan gambar produk, qty, subtotal, diskon, pajak, dan total.
- Metode pembayaran: Cash, QRIS, Transfer, dan Lainnya.
- Upload dan tampilkan barcode QRIS toko saat pembayaran QRIS.
- Tambah catatan atau keterangan pada item terakhir.
- Tambah nominal manual dengan keterangan.
- Item nominal manual tampil sebagai nominal di bagian atas dan keterangan di bawah.
- Checkout langsung tanpa input uang diterima dan tanpa kembalian.
- Cetak struk terakhir.

3. Produk
- Tambah, edit, dan hapus produk.
- Data produk mencakup nama, kategori, harga modal, harga jual, gambar produk,
  dan stok awal.
- Format titik ribuan otomatis untuk input nominal uang.
- Perhitungan margin/laba otomatis.
- Menampilkan stok awal, terjual, dan stok akhir.
- Export data produk ke Excel.

4. Laporan
- Tampilan laporan modern dengan toolbar tanggal, periode, dan tombol refresh.
- Filter laporan: Daily, Weekly, dan Monthly.
- Kartu ringkasan: total transaksi, total qty, total omzet, dan total laba.
- Tabel laporan dengan tanggal, produk, keterangan, metode bayar, qty, modal,
  jual, omzet, laba, dan tombol cetak struk.
- Empty state khusus saat belum ada transaksi pada periode terpilih.
- Export laporan periode ke Excel.

5. Struk Transaksi
- Template struk Daily Kopi ToGo untuk printer thermal 58 mm.
- Nomor transaksi otomatis.
- Menampilkan detail pesanan, subtotal, diskon, PPN, dan total.
- Bagian uang diterima dan kembalian tidak ditampilkan.
- Struk bisa dicetak ulang dari dashboard/laporan atau tombol cetak struk terakhir.
- Struk bisa dikirim ke WhatsApp customer tanpa menyimpan nomor pelanggan.

6. Pengaturan
- Kelola PIN Admin.
- Backup data ke file JSON.
- Restore data dari file JSON.
- Export seluruh riwayat transaksi ke Excel.
- Reset data dengan pilihan granular dan perlindungan PIN Admin.

7. Reset Data Aman
- Reset data tidak langsung menghapus semua data.
- Pengguna bisa memilih data yang ingin dihapus:
  - Produk tertentu.
  - Transaksi tertentu per nomor transaksi.
  - Item keranjang tertentu.
- Tersedia pencarian data reset.
- Reset transaksi memiliki filter periode.
- Penghapusan data wajib memakai PIN Admin.
- Data yang tidak dipilih tetap tersimpan.

8. Penyimpanan Data
- Produk disimpan di LocalStorage dengan key pos_products.
- Transaksi disimpan di LocalStorage dengan key pos_sales.
- Keranjang disimpan di LocalStorage dengan key pos_cart.
- Barcode QRIS disimpan di LocalStorage dengan key pos_qris_image.
- PIN Admin disimpan sebagai hash SHA-256 di pos_admin_pin_hash.
- Backup JSON menjaga kompatibilitas data produk dan transaksi yang sudah dibuat.


CARA MENJALANKAN

1. Extract ZIP atau buka folder aplikasi.
2. Buka file index.html di browser.
3. Aplikasi langsung bisa dipakai.

Jika browser memblokir beberapa fitur PWA/service worker saat dibuka langsung
dari file, jalankan melalui server lokal sederhana.

Contoh:
python -m http.server 8000

Lalu buka:
http://localhost:8000


STRUKTUR FILE

- index.html
  Struktur halaman aplikasi, dialog, menu, dan elemen UI.

- style.css
  Styling utama aplikasi, termasuk dashboard, kasir, laporan, reset data,
  dialog pengaturan, dan tampilan responsive.

- app.js
  Logika aplikasi: produk, kasir, keranjang, transaksi, laporan, struk,
  backup/restore, reset data, PIN Admin, dan LocalStorage.

- splash.css
  Styling splash screen.

- manifest.json
  Konfigurasi PWA.

- service-worker.js
  Cache dasar asset aplikasi.

- assets/
  Logo dan asset gambar aplikasi.


CATATAN

- Aplikasi ini belum memakai database/server.
- Data tersimpan di browser yang digunakan.
- Jika cache/browser data dihapus, data aplikasi juga bisa hilang.
- Lakukan backup JSON secara berkala dari menu Pengaturan.
- Cocok untuk kasir sederhana, usaha kecil, dan penggunaan lokal.

Copyright © 2026 Agan Sulisfiana