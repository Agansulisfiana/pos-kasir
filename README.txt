Daily Kopi ToGo - Aplikasi POS Kasir Sederhana

Aplikasi POS berbasis web untuk kasir dan penjualan harian Daily Kopi ToGo.
Data aplikasi disimpan di browser menggunakan LocalStorage, sehingga bisa
dipakai tanpa database atau server.


FITUR UTAMA

1. Dashboard Profesional
- Tampilan dashboard profesional dengan warna netral, kartu ringkasan yang
  lebih rapat, dan visual yang lebih fokus pada data operasional.
- Menampilkan omzet, laba, item terjual, dan total produk berdasarkan tanggal
  dashboard yang dipilih.
- Tanggal dashboard bisa dipilih langsung dari toolbar.
- Tombol refresh dashboard membaca ulang data dari LocalStorage dan merender
  ulang tampilan dashboard, produk, kasir, dan keranjang.
- Grafik penjualan default 5 hari terakhir dari tanggal yang dipilih.
- Grafik bisa diganti berdasarkan Omzet, Laba, atau Qty.
- Ringkasan penjualan berdasarkan metode pembayaran.
- Top 5 produk terlaris pada tanggal yang dipilih.
- Alert stok menipis dengan shortcut ke menu produk.
- Ringkasan tanggal pilihan: total transaksi, rata-rata transaksi, item per
  transaksi, dan total laba.

2. Menu Kasir
- Layout kasir dua area: daftar produk dan transaksi kasir.
- Tampilan kasir dibuat lebih bersih dengan produk, kategori, keranjang, dan
  tombol bayar yang lebih tegas untuk alur kerja kasir harian.
- Pada tampilan desktop, panel Transaksi Kasir tetap di posisi kanan.
- Daftar pilihan produk memiliki scroll sendiri saat produk banyak.
- Pada tablet, POS Android, dan layar kecil, halaman kasir tetap bisa discroll
  penuh agar daftar produk tidak terpotong.
- Kategori produk di kasir bisa digeser horizontal pada layar sempit.
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
- Halaman produk dibuat responsif untuk desktop sempit, tablet, dan perangkat
  POS Android agar kartu ringkasan, toolbar filter, dan daftar produk tidak
  terpotong.
- Saat edit produk/stok, stok awal dikunci agar tidak mengubah data awal.
- Tambah Stok digunakan untuk menambahkan stok masuk; rumus stok akhir adalah
  stok awal + stok masuk - stok terjual.
- Layout edit stok dirapikan agar field tambah stok, URL gambar, upload gambar,
  dan tombol simpan tersusun jelas.
- Format titik ribuan otomatis untuk input nominal uang.
- Perhitungan margin/laba otomatis.
- Menampilkan stok awal, stok masuk, terjual, dan stok akhir.
- Export data produk ke Excel.

4. Laporan
- Tampilan laporan modern dengan toolbar periode dan tombol refresh.
- Filter laporan: Daily, Weekly, dan Monthly.
- Kontrol periode laporan dibuat ringkas agar tidak terlalu melebar.
- Kartu ringkasan: total transaksi, total qty, total omzet, dan total laba.
- Ringkasan produk terjual menampilkan total item dan top produk berdasarkan
  qty, omzet, dan laba.
- Tabel laporan dengan tanggal, produk, keterangan, metode bayar, qty, modal,
  jual, omzet, laba, dan tombol cetak struk.
- Empty state khusus saat belum ada transaksi pada periode terpilih.
- Export laporan periode ke Excel dibuat dalam 1 sheet dengan 3 bagian:
  Detail Transaksi, Ringkasan Produk Terjual, dan Ringkasan Keuangan.

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
- Tentang Aplikasi menampilkan nama aplikasi, versi, developer, dan copyright
  dalam dialog brand yang lebih modern dengan kontras teks yang lebih jelas.
- Menu pengaturan memakai icon konsisten agar terlihat lebih profesional.

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

9. Footer Aplikasi
- Footer aplikasi menampilkan nama Daily Kopi ToGo POS.
- Menampilkan versi aplikasi 1.0.0.
- Menampilkan kredit Developed by Agan Sulisfiana.
- Footer ditempatkan di bagian bawah sidebar kiri dengan teks putih agar
  terlihat rapi dan tidak menimpa konten.

10. Identitas Brand
- Logo Matcha Bee di sidebar ditampilkan dalam frame khusus agar terlihat
  menyatu dengan sidebar.
- Ukuran sidebar tetap compact, sedangkan logo Matcha Bee dipertahankan dalam
  brand card besar agar identitas toko tetap kuat.
- Teks brand di bawah logo dirapikan agar tidak keluar dari area sidebar.
- Navigasi sidebar memakai icon SVG konsisten tanpa emoji.
- Asset logo Matcha Bee ikut disimpan dalam cache service worker.

11. Responsif dan PWA
- Layout utama mendukung desktop, desktop sempit, tablet, POS Android, dan
  layar kecil seperti perangkat EDC.
- Navigasi berubah menyesuaikan lebar layar tanpa mengubah struktur halaman.
- Area kasir dan produk diperbaiki agar tidak terkunci tinggi layar dan tetap
  bisa discroll pada berbagai ukuran device.
- Splash screen custom disembunyikan saat aplikasi berjalan sebagai PWA agar
  tidak muncul dua kali bersama splash bawaan sistem.


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

- manifest.json
  Konfigurasi PWA.

- service-worker.js
  Cache dasar asset aplikasi.

- assets/
  Asset aplikasi yang dikelompokkan berdasarkan jenis.

  - css/
    style.css untuk styling utama dan splash.css untuk splash screen.

  - js/
    app.js untuk logika aplikasi, transaksi, laporan, dan LocalStorage.

  - images/
    Logo dan asset gambar aplikasi.


CATATAN

- Aplikasi ini belum memakai database/server.
- Data tersimpan di browser yang digunakan.
- Audit Log menyimpan maksimal 500 aktivitas terbaru di browser.
- Jika cache/browser data dihapus, data aplikasi juga bisa hilang.
- Lakukan backup JSON secara berkala dari menu Pengaturan.
- Jika tampilan belum berubah setelah update, lakukan hard refresh atau hapus
  service worker/cache browser karena aplikasi memakai PWA cache.
- Cocok untuk kasir sederhana, usaha kecil, dan penggunaan lokal.

Daily Kopi ToGo POS
Version 1.0.0
Developed by Agan Sulisfiana
