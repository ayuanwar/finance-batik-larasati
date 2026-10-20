# Dokumen Rencana Pengujian (Test Plan)
## Aplikasi Finance dan Accounting UMKM — CV Batik Larasati

Dokumen ini memandu pengujian fungsional, integritas finansial, dan keamanan akses data aplikasi web Finance & Accounting CV Batik Larasati berdasarkan dokumen **PRD_Finance.docx.md** dan **ERD_Finance.pdf**.

---

## 1. Akun Uji & Hak Akses

Semua akun pengujian menggunakan kata sandi default yang telah ditentukan:

| No | Nama | Email | Peran | Hak Akses Utama |
|---|---|---|---|---|
| 1 | Laras Prameswari | `laras@larasati.test` | **Direktur** | Approval pengajuan > Rp1 jt & pengajuan Akuntan, buka kembali periode, kelola user & role, audit log, baca seluruh laporan. |
| 2 | Dimas Arya Nugroho | `dimas@larasati.test` | **Akuntan** | Kelola bagan akun & periode, verifikasi & bayar pengajuan, posting & balik jurnal, lihat seluruh laporan. |
| 3 | Wulan Sari Utami | `wulan@larasati.test` | **Akuntan** | Sama seperti Akuntan (untuk uji verifikasi silang / larangan self-approval). |
| 4 | Rina Anggraini | `rina@larasati.test` | **Staf** | Buat/ubah pengajuan sendiri, unggah bukti nota, lihat status pengajuan milik sendiri. |
| 5 | Bagus Saputra | `bagus@larasati.test` | **Staf** | Sama seperti Staf (untuk uji isolasi data antar staf). |
| 6 | Sekar Ayu Lestari | `sekar@larasati.test` | **Staf** | Staf pengajuan. |
| 7 | Yoga Pratama | `yoga@larasati.test` | **Staf (Nonaktif)** | Akun diblokir / nonaktif, dilarang masuk ke sistem. |

---

## 2. Matriks Pengujian Aturan Bisnis (BR-01 s/d BR-12)

### Kategori A: Autentikasi, Akun Pengguna, dan Kontrol Akses (BR-11, BR-12)

#### TC-AUTH-01: Login Berhasil untuk Pengguna Aktif
* **Aturan Terkait**: BR-11, BR-12
* **Aktor**: Staf (`rina@larasati.test`), Akuntan (`dimas@larasati.test`), Direktur (`laras@larasati.test`)
* **Langkah Uji**:
  1. Buka halaman Masuk (`/masuk`).
  2. Masukkan email dan kata sandi yang valid.
  3. Tekan tombol **Masuk**.
* **Hasil yang Diharapkan**:
  * Pengguna berhasil masuk dan diarahkan ke Dashboard.
  * Menu navigasi yang tampil sesuai dengan peran masing-masing.

#### TC-AUTH-02: Penolakan Login untuk Akun Nonaktif
* **Aturan Terkait**: BR-12
* **Aktor**: `yoga@larasati.test` (Staf status nonaktif)
* **Langkah Uji**:
  1. Masukkan kredensial akun Yoga Pratama.
  2. Tekan tombol **Masuk**.
* **Hasil yang Diharapkan**:
  * Sistem menolak login dengan pesan error: *"Akun Anda dinonaktifkan. Silakan hubungi Direktur."*
  * Pengguna tidak dapat mengakses Dashboard maupun API.

#### TC-SEC-01: Perlindungan Akses Data Keuangan (RLS Direct API Check)
* **Aturan Terkait**: BR-11
* **Aktor**: Staf (`rina@larasati.test`)
* **Langkah Uji**:
  1. Login sebagai Staf Rina.
  2. Coba akses URL `/jurnal`, `/buku-besar`, atau `/laporan` secara langsung via browser.
  3. Coba lakukan query SELECT ke tabel `jurnal`, `jurnal_baris`, atau `audit_log` via client Supabase / Postman menggunakan token Staf.
* **Hasil yang Diharapkan**:
  * Akses halaman diarahkan kembali ke Dashboard.
  * Query database langsung mengembalikan error permission denied atau array kosong (enforced by RLS).

---

### Kategori B: Bagan Akun dan Periode Akuntansi (BR-01, BR-05, BR-06)

#### TC-ACC-01: Validasi Kode Akun 4 Digit & Saldo Normal
* **Aturan Terkait**: BR-01
* **Aktor**: Akuntan (`dimas@larasati.test`)
* **Langkah Uji**:
  1. Masuk menu Akun & Periode.
  2. Buat akun baru dengan kode 3 digit atau 5 digit -> Sistem harus menolak.
  3. Buat akun dengan digit pertama 1 (Aset) -> Saldo normal otomatis debit.
  4. Buat akun dengan digit pertama 2 (Kewajiban) -> Saldo normal otomatis kredit.
* **Hasil yang Diharapkan**:
  * Hanya kode 4 digit valid yang diterima. Saldo normal konsisten sesuai tipe akun.

#### TC-ACC-02: Perlindungan Akun yang Sudah Dipakai Transaksi
* **Aturan Terkait**: BR-01
* **Aktor**: Akuntan
* **Langkah Uji**:
  1. Pilih akun yang sudah tercatat di tabel `jurnal_baris` atau `pengajuan`.
  2. Coba ubah kode akun atau hapus akun tersebut.
* **Hasil yang Diharapkan**:
  * Operasi ubah kode/tipe dan hapus ditolak di level database constraint. Akun hanya diizinkan untuk dinonaktifkan (`aktif = false`).

#### TC-PER-01: Penutupan Periode Akuntansi Berurutan & Validasi Draf
* **Aturan Terkait**: BR-05, BR-06
* **Aktor**: Akuntan
* **Langkah Uji**:
  1. Buat satu jurnal draf di periode September 2026.
  2. Coba tutup periode September 2026.
  3. Hapus/posting jurnal draf tersebut, lalu coba tutup periode September sementara Agustus masih terbuka.
* **Hasil yang Diharapkan**:
  * Penutupan ditolak jika masih ada jurnal draf di periode tersebut.
  * Penutupan ditolak jika periode sebelumnya belum ditutup.
  * Penutupan berhasil jika seluruh syarat terpenuhi.

#### TC-PER-02: Pembukaan Kembali Periode oleh Direktur
* **Aturan Terkait**: BR-06
* **Aktor**: Direktur (`laras@larasati.test`) vs Akuntan (`dimas@larasati.test`)
* **Langkah Uji**:
  1. Akuntan mencoba membuka kembali periode tertutup -> Ditolak (hanya Direktur).
  2. Direktur membuka kembali periode dengan alasan kurang dari 20 karakter -> Ditolak.
  3. Direktur membuka kembali periode terakhir ditutup dengan alasan $\ge$ 20 karakter.
* **Hasil yang Diharapkan**:
  * Pembukaan berhasil, status kembali `terbuka`, dan aksi tercatat di `audit_log`.

---

### Kategori C: Pengajuan Biaya & Reimburse (BR-07, BR-08, BR-09)

#### TC-SUB-01: Validasi Input Pengajuan (Nominal, Akun Beban, Tanggal, Bukti)
* **Aturan Terkait**: BR-07
* **Aktor**: Staf (`rina@larasati.test`)
* **Langkah Uji**:
  1. Masukkan nominal di bawah Rp10.000 atau di atas Rp25.000.000 -> Sistem menolak.
  2. Pilih tanggal transaksi di masa depan atau > 30 hari yang lalu -> Sistem menolak.
  3. Isi keterangan kurang dari 10 karakter -> Sistem menolak.
  4. Coba kirim tanpa unggah bukti foto/PDF nota -> Sistem menolak pengiriman.
  5. Masukkan data valid (nominal Rp150.000, nota valid, akun beban 5xxx) -> Kirim.
* **Hasil yang Diharapkan**:
  * Nomor pengajuan terbentuk otomatis dengan format `PG-YYYYMM-NNN`. Status menjadi `diajukan`.

#### TC-SUB-02: Alur Persetujuan Pengajuan $\le$ Rp1.000.000 oleh Akuntan
* **Aturan Terkait**: BR-08
* **Aktor**: Staf (pengaju: Rina), Akuntan (peninjau: Dimas)
* **Langkah Uji**:
  1. Staf Rina mengirim pengajuan senilai Rp350.000 (status: `diajukan`).
  2. Akuntan Dimas memeriksa pengajuan di daftar tinjauan dan menekan **Setujui**.
* **Hasil yang Diharapkan**:
  * Status langsung berubah menjadi `disetujui` (tidak perlu persetujuan Direktur).
  * Pengajuan siap dibayar oleh Akuntan.

#### TC-SUB-03: Alur Persetujuan Pengajuan $>$ Rp1.000.000 (Eskalasi ke Direktur)
* **Aturan Terkait**: BR-08
* **Aktor**: Staf (pengaju: Bagus, nilai Rp3.500.000), Akuntan (Dimas), Direktur (Laras)
* **Langkah Uji**:
  1. Akuntan Dimas memverifikasi pengajuan Bagus.
  2. Tombol di Akuntan adalah **Teruskan ke Direktur**.
  3. Status berubah menjadi `menunggu_direktur`.
  4. Direktur Laras login, membuka pengajuan tersebut, dan menekan **Setujui**.
* **Hasil yang Diharapkan**:
  * Status berubah menjadi `disetujui`.

#### TC-SUB-04: Larangan Self-Approval & Pengajuan Milik Akuntan
* **Aturan Terkait**: BR-09
* **Aktor**: Akuntan (pengaju: Dimas, nilai Rp200.000)
* **Langkah Uji**:
  1. Akuntan Dimas membuat pengajuan reimburse untuk dirinya sendiri dan mengirimnya.
  2. Akuntan Dimas mencoba memverifikasi/menyetujui pengajuannya sendiri.
* **Hasil yang Diharapkan**:
  * Pengajuan Dimas otomatis berstatus `menunggu_direktur` (tanpa memandang nominal).
  * Dimas dilarang menyetujui pengajuannya sendiri di UI dan ditolak oleh database constraint/policy.

#### TC-SUB-05: Penolakan atau Permintaan Revisi dengan Catatan Minimal 10 Karakter
* **Aturan Terkait**: BR-08
* **Aktor**: Akuntan / Direktur
* **Langkah Uji**:
  1. Peninjau menekan tombol **Minta Revisi** atau **Tolak**.
  2. Mengisi catatan peninjau dengan "foto blur" (9 karakter).
* **Hasil yang Diharapkan**:
  * Form menolak submit sampai catatan diisi minimal 10 karakter (misal: "Foto nota buram dan terpotong"). Status berpindah ke `perlu_revisi` atau `ditolak`.

---

### Kategori D: Pembayaran Pengajuan & Pembuatan Jurnal Otomatis (BR-10, BR-03)

#### TC-PAY-01: Pembayaran Pengajuan Berhasil & Pembentukan Jurnal Otomatis
* **Aturan Terkait**: BR-10, BR-03, BR-05
* **Aktor**: Akuntan (`dimas@larasati.test`)
* **Langkah Uji**:
  1. Buka pengajuan berstatus `disetujui` senilai Rp500.000 (akun beban 5101).
  2. Pilih akun kas/bank pembayaran (1101 Kas Toko, saldo Rp2.000.000).
  3. Tekan **Bayar Pengajuan**.
* **Hasil yang Diharapkan**:
  * Status pengajuan menjadi `dibayar`.
  * Sistem membuat 1 jurnal baru berstatus `diposting` dengan nomor format `JU-YYYYMM-NNNN`.
  * Baris jurnal: Debit akun 5101 (Rp500.000), Kredit akun 1101 (Rp500.000).
  * Saldo kas toko berkurang Rp500.000.

#### TC-PAY-02: Validasi Saldo Kas/Bank Tidak Mencukupi
* **Aturan Terkait**: BR-10
* **Aktor**: Akuntan
* **Langkah Uji**:
  1. Buka pengajuan berstatus `disetujui` senilai Rp800.000.
  2. Pilih akun kas yang saldonya hanya Rp200.000.
  3. Tekan **Bayar Pengajuan**.
* **Hasil yang Diharapkan**:
  * Transaksi ditolak dengan pesan: *"Saldo kas/bank tidak mencukupi untuk melakukan pembayaran."*
  * Tidak ada jurnal yang dibuat dan status tetap `disetujui`.

#### TC-PAY-03: Pencegahan Pembayaran Ganda (Idempotency & Concurrency)
* **Aturan Terkait**: BR-10
* **Langkah Uji**:
  1. Simulasikan dua permintaan bayar bersamaan untuk pengajuan yang sama (double-click atau 2 sesi akuntan).
* **Hasil yang Diharapkan**:
  * Tepat 1 pembayaran yang berhasil, pembayaran kedua ditolak.
  * Hanya ada 1 jurnal yang terbentuk untuk 1 `pengajuan_id`.

---

### Kategori E: Jurnal Umum, Keseimbangan, & Jurnal Pembalik (BR-02, BR-03, BR-04, BR-05)

#### TC-JRN-01: Validasi Keseimbangan Jurnal Saat Posting
* **Aturan Terkait**: BR-02
* **Aktor**: Akuntan
* **Langkah Uji**:
  1. Buat draf jurnal dengan baris: Debit Rp100.000, Kredit Rp80.000 (selisih Rp20.000).
  2. Simpan draf -> Berhasil.
  3. Tekan tombol **Posting Jurnal**.
* **Hasil yang Diharapkan**:
  * Posting ditolak: Total debit harus sama persis dengan total kredit.
  * Tombol posting hanya aktif jika selisih = 0 dan minimal terdapat 2 baris.

#### TC-JRN-02: Immutability Jurnal Diposting & Pembuatan Jurnal Pembalik
* **Aturan Terkait**: BR-04
* **Aktor**: Akuntan
* **Langkah Uji**:
  1. Coba hapus atau edit jurnal yang sudah berstatus `diposting`.
  2. Tekan tombol **Buat Jurnal Pembalik**.
  3. Posting jurnal pembalik tersebut di periode terbuka.
  4. Coba buat jurnal pembalik kedua kali untuk jurnal yang sama.
* **Hasil yang Diharapkan**:
  * Edit & delete jurnal diposting ditolak keras oleh sistem & trigger database.
  * Jurnal pembalik otomatis menukar posisi debit dan kredit.
  * Status jurnal asli menjadi `dibalik`.
  * Pembalikan kedua kali ditolak (1 jurnal hanya bisa dibalik 1 kali). Jurnal pembalik dan jurnal pembayaran tidak bisa dibalik.

#### TC-JRN-03: Penomoran Jurnal Tanpa Celah (Gapless Concurrency Test)
* **Aturan Terkait**: BR-03
* **Langkah Uji**:
  1. Simulasikan posting 5 jurnal pada detik yang sama di bulan Oktober 2026.
* **Hasil yang Diharapkan**:
  * Terbentuk 5 nomor berurutan tanpa ada nomor ganda dan tanpa loncatan (contoh: JU-202610-0001 s/d JU-202610-0005).

---

### Kategori F: Laporan Keuangan & Validasi Neraca (PRD Bagian 9 & 13)

#### TC-REP-01: Verifikasi Laba Rugi September 2026
* **Aturan Terkait**: PRD Bagian 13
* **Langkah Uji**:
  1. Masuk ke halaman Laporan Laba Rugi periode September 2026 (dengan data contoh terpasang).
* **Hasil yang Diharapkan**:
  * Menampilkan pendapatan per akun, beban per akun.
  * Laba bersih September 2026 menunjukkan nilai **Rugi Rp4.625.000** (ditampilkan dalam tanda kurung `(Rp4.625.000)`).

#### TC-REP-02: Verifikasi Keseimbangan Neraca per 30 September 2026
* **Aturan Terkait**: PRD Bagian 13
* **Langkah Uji**:
  1. Buka halaman Laporan Neraca per tanggal 30 September 2026.
* **Hasil yang Diharapkan**:
  * Total Aset = **Rp266.951.000**.
  * Total Kewajiban + Ekuitas + Laba Berjalan = **Rp266.951.000**.
  * Neraca seimbang (tidak muncul peringatan selisih).
