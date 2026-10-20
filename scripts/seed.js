const { createClient } = require('@supabase/supabase-js');

// Mengambil URL dan Service Role Key dari environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus terdefinisi di .env.local');
  process.exit(1);
}

// Inisialisasi Supabase Admin Client (Service Role bypasses RLS untuk seeding)
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Password default untuk seluruh akun uji latihan
const DEFAULT_PASSWORD = 'Password123!';

// 1. DATA 7 PENGGUNA UJI (Sesuai PRD Bagian 12)
const AKUN_UJI = [
  {
    nama_lengkap: 'Laras Prameswari',
    email: 'laras@larasati.test',
    peran: 'direktur',
    jabatan: 'Pemilik & Direktur Utama',
    aktif: true
  },
  {
    nama_lengkap: 'Dimas Arya Nugroho',
    email: 'dimas@larasati.test',
    peran: 'akuntan',
    jabatan: 'Kepala Bagian Akuntansi',
    aktif: true
  },
  {
    nama_lengkap: 'Wulan Sari Utami',
    email: 'wulan@larasati.test',
    peran: 'akuntan',
    jabatan: 'Staf Akuntansi & Pajak',
    aktif: true
  },
  {
    nama_lengkap: 'Rina Anggraini',
    email: 'rina@larasati.test',
    peran: 'staf',
    jabatan: 'Staf Produksi Batik Tulis',
    aktif: true
  },
  {
    nama_lengkap: 'Bagus Saputra',
    email: 'bagus@larasati.test',
    peran: 'staf',
    jabatan: 'Staf Produksi Batik Cap',
    aktif: true
  },
  {
    nama_lengkap: 'Sekar Ayu Lestari',
    email: 'sekar@larasati.test',
    peran: 'staf',
    jabatan: 'Staf Penjualan & Toko',
    aktif: true
  },
  {
    nama_lengkap: 'Yoga Pratama',
    email: 'yoga@larasati.test',
    peran: 'staf',
    jabatan: 'Mantan Karyawan',
    aktif: false // Akun dinonaktifkan untuk uji TC-AUTH-02
  }
];

// 2. BAGAN AKUN (26 AKUN SESUAI UMKM BATIK LARASATI)
const DAFTAR_AKUN = [
  // Aset (1xxx) - Saldo Normal: Debit
  { kode: '1101', nama: 'Kas Toko', tipe: 'aset', saldo_normal: 'debit', is_kas_bank: true, aktif: true, keterangan: 'Kas operasional toko fisik' },
  { kode: '1102', nama: 'Kas Kecil', tipe: 'aset', saldo_normal: 'debit', is_kas_bank: true, aktif: true, keterangan: 'Kas kecil pengeluaran mendesak (petty cash)' },
  { kode: '1103', nama: 'Bank BCA', tipe: 'aset', saldo_normal: 'debit', is_kas_bank: true, aktif: true, keterangan: 'Rekening operasional utama BCA' },
  { kode: '1104', nama: 'Bank Mandiri', tipe: 'aset', saldo_normal: 'debit', is_kas_bank: true, aktif: true, keterangan: 'Rekening penerimaan kelas wisata Mandiri' },
  { kode: '1201', nama: 'Piutang Usaha', tipe: 'aset', saldo_normal: 'debit', is_kas_bank: false, aktif: true, keterangan: 'Tagihan penjualan batik rombongan' },
  { kode: '1301', nama: 'Persediaan Kain Mori', tipe: 'aset', saldo_normal: 'debit', is_kas_bank: false, aktif: true, keterangan: 'Persediaan kain mori primissima & prima' },
  { kode: '1302', nama: 'Persediaan Lilin & Malam', tipe: 'aset', saldo_normal: 'debit', is_kas_bank: false, aktif: true, keterangan: 'Persediaan lilin klowong, tembokan, parafin' },
  { kode: '1303', nama: 'Persediaan Bahan Pewarna', tipe: 'aset', saldo_normal: 'debit', is_kas_bank: false, aktif: true, keterangan: 'Pewarna sintetis napthol, indigosol, alami' },
  { kode: '1304', nama: 'Persediaan Produk Jadi Batik', tipe: 'aset', saldo_normal: 'debit', is_kas_bank: false, aktif: true, keterangan: 'Kain batik tulis dan cap siap jual' },
  { kode: '1401', nama: 'Perlengkapan Workshop & Toko', tipe: 'aset', saldo_normal: 'debit', is_kas_bank: false, aktif: true, keterangan: 'Plastik kemasan, label, paper bag' },
  { kode: '1501', nama: 'Peralatan Canting & Wajan', tipe: 'aset', saldo_normal: 'debit', is_kas_bank: false, aktif: true, keterangan: 'Alat produksi batik tulis manual' },
  { kode: '1502', nama: 'Meja & Cap Tembaga', tipe: 'aset', saldo_normal: 'debit', is_kas_bank: false, aktif: true, keterangan: 'Peralatan produksi batik cap' },

  // Kewajiban (2xxx) - Saldo Normal: Kredit
  { kode: '2101', nama: 'Utang Usaha', tipe: 'kewajiban', saldo_normal: 'kredit', is_kas_bank: false, aktif: true, keterangan: 'Utang ke supplier kain & lilin' },
  { kode: '2102', nama: 'Utang Gaji', tipe: 'kewajiban', saldo_normal: 'kredit', is_kas_bank: false, aktif: true, keterangan: 'Gaji karyawan belum dibayarkan' },
  { kode: '2103', nama: 'Beban Akrual Masih Harus Dibayar', tipe: 'kewajiban', saldo_normal: 'kredit', is_kas_bank: false, aktif: true, keterangan: 'Tagihan listrik & internet berjalan' },

  // Ekuitas (3xxx) - Saldo Normal: Kredit
  { kode: '3101', nama: 'Modal Pemilik Laras Prameswari', tipe: 'ekuitas', saldo_normal: 'kredit', is_kas_bank: false, aktif: true, keterangan: 'Modal disetor pemilik CV Batik Larasati' },
  { kode: '3201', nama: 'Prive Pemilik', tipe: 'ekuitas', saldo_normal: 'kredit', is_kas_bank: false, aktif: true, keterangan: 'Penarikan dana pribadi pemilik' },
  { kode: '3301', nama: 'Laba Ditahan', tipe: 'ekuitas', saldo_normal: 'kredit', is_kas_bank: false, aktif: true, keterangan: 'Akumulasi laba periode terdahulu' },

  // Pendapatan (4xxx) - Saldo Normal: Kredit
  { kode: '4101', nama: 'Pendapatan Penjualan Batik Tulis', tipe: 'pendapatan', saldo_normal: 'kredit', is_kas_bank: false, aktif: true, keterangan: 'Hasil penjualan kain batik tulis halus' },
  { kode: '4102', nama: 'Pendapatan Penjualan Batik Cap & Seragam', tipe: 'pendapatan', saldo_normal: 'kredit', is_kas_bank: false, aktif: true, keterangan: 'Hasil penjualan batik cap & pesanan seragam' },
  { kode: '4201', nama: 'Pendapatan Kelas Membatik & Wisata', tipe: 'pendapatan', saldo_normal: 'kredit', is_kas_bank: false, aktif: true, keterangan: 'Penerimaan kelas workshop membatik wisatawan' },

  // Beban (5xxx) - Saldo Normal: Debit
  { kode: '5101', nama: 'Beban Bahan Pembantu & Pewarna', tipe: 'beban', saldo_normal: 'debit', is_kas_bank: false, aktif: true, keterangan: 'Pembelian malam, pewarna tambahan' },
  { kode: '5102', nama: 'Beban Perlengkapan & Packing', tipe: 'beban', saldo_normal: 'debit', is_kas_bank: false, aktif: true, keterangan: 'Paper bag, kotak kardus batik, stiker' },
  { kode: '5201', nama: 'Beban Gaji & Upah Tenaga Kerja', tipe: 'beban', saldo_normal: 'debit', is_kas_bank: false, aktif: true, keterangan: 'Gaji 7 staf dan perajin batik' },
  { kode: '5202', nama: 'Beban Listrik, Air, & Internet', tipe: 'beban', saldo_normal: 'debit', is_kas_bank: false, aktif: true, keterangan: 'Operasional bulanan toko dan galeri' },
  { kode: '5203', nama: 'Beban Transportasi & Pengiriman', tipe: 'beban', saldo_normal: 'debit', is_kas_bank: false, aktif: true, keterangan: 'Ongkir pengiriman kain batik dan BBM operasional' }
];

// 3. PERIODE AKUNTANSI (4 Periode: Juli - Oktober 2026)
const PERIODE_LIST = [
  { tahun: 2026, bulan: 7, tanggal_mulai: '2026-07-01', status: 'ditutup', alasan_buka_ulang: null },
  { tahun: 2026, bulan: 8, tanggal_mulai: '2026-08-01', status: 'ditutup', alasan_buka_ulang: null },
  { tahun: 2026, bulan: 9, tanggal_mulai: '2026-09-01', status: 'terbuka', alasan_buka_ulang: null },
  { tahun: 2026, bulan: 10, tanggal_mulai: '2026-10-01', status: 'terbuka', alasan_buka_ulang: null }
];

async function seed() {
  console.log('🚀 Memulai proses seeding database CV Batik Larasati...\n');

  // --- A. SEED AKUN PENGGUNA (SUPABASE AUTH + PROFILES) ---
  console.log('👤 [1/3] Menyiapkan 7 Akun Pengguna & Profil...');
  
  // Dapatkan daftar user yang sudah ada di Supabase Auth
  const { data: { users: existingUsers }, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('Gagal mengambil daftar pengguna auth:', listErr.message);
    process.exit(1);
  }

  const userMap = new Map();
  for (const u of existingUsers) {
    userMap.set(u.email, u);
  }

  let dimasUserId = null;

  for (const item of AKUN_UJI) {
    let userId;
    const existing = userMap.get(item.email);

    if (existing) {
      userId = existing.id;
      console.log(`  ✓ User Auth '${item.email}' sudah terdaftar (${userId})`);
      // Update password agar seragam
      await supabase.auth.admin.updateUserById(userId, {
        password: DEFAULT_PASSWORD,
        user_metadata: { nama_lengkap: item.nama_lengkap }
      });
    } else {
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email: item.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { nama_lengkap: item.nama_lengkap }
      });

      if (createErr) {
        console.error(`  ✗ Gagal membuat user '${item.email}':`, createErr.message);
        continue;
      }
      userId = newUser.user.id;
      console.log(`  + User Auth '${item.email}' berhasil dibuat (${userId})`);
    }

    if (item.email === 'dimas@larasati.test') {
      dimasUserId = userId;
    }

    // Upsert ke tabel profiles
    const { error: profileErr } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        nama_lengkap: item.nama_lengkap,
        email: item.email,
        peran: item.peran,
        jabatan: item.jabatan,
        aktif: item.aktif
      });

    if (profileErr) {
      console.error(`  ✗ Gagal upsert profile '${item.email}':`, profileErr.message);
    } else {
      console.log(`  ✓ Profil '${item.nama_lengkap}' (${item.peran}) berhasil diperbarui`);
    }
  }

  // --- B. SEED BAGAN AKUN (26 AKUN) ---
  console.log('\n📚 [2/3] Menanamkan 26 Bagan Akun (Chart of Accounts)...');
  for (const akun of DAFTAR_AKUN) {
    const { error: akunErr } = await supabase
      .from('akun')
      .upsert(akun, { onConflict: 'kode' });

    if (akunErr) {
      console.error(`  ✗ Gagal menyimpan akun [${akun.kode}] ${akun.nama}:`, akunErr.message);
    } else {
      console.log(`  ✓ Akun [${akun.kode}] ${akun.nama} (${akun.tipe})`);
    }
  }

  // --- C. SEED PERIODE AKUNTANSI ---
  console.log('\n📅 [3/3] Menanamkan 4 Periode Akuntansi (Juli - Oktober 2026)...');
  for (const per of PERIODE_LIST) {
    const payload = {
      ...per,
      ditutup_oleh: per.status === 'ditutup' ? dimasUserId : null,
      ditutup_pada: per.status === 'ditutup' ? `${per.tahun}-${String(per.bulan + 1).padStart(2, '0')}-01T00:00:00Z` : null
    };

    const { error: perErr } = await supabase
      .from('periode')
      .upsert(payload, { onConflict: 'tahun,bulan' });

    if (perErr) {
      console.error(`  ✗ Gagal menyimpan periode ${per.bulan}/${per.tahun}:`, perErr.message);
    } else {
      console.log(`  ✓ Periode ${per.bulan}/${per.tahun} (Status: ${per.status})`);
    }
  }

  console.log('\n🎉 PROSES SEEDING SELESAI DENGAN SUKSES!');
  console.log(`💡 Password seluruh akun uji latihan: "${DEFAULT_PASSWORD}"`);
}

seed();
