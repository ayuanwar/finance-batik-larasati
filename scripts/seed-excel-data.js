const xlsx = require('xlsx');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus terdefinisi di .env.local');
  process.exit(1);
}

// Service Role bypasses RLS untuk proses seeding
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const EXCEL_PATH = path.join(__dirname, '../docs/Data_Contoh_Finance.xlsx');

async function batchUpsert(tableName, rows, batchSize = 50, onConflict = 'id') {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(tableName).upsert(batch, { onConflict });
    if (error) {
      throw new Error(`Gagal upsert ke tabel '${tableName}' pada baris ${i + 1}-${i + batch.length}: ${error.message}`);
    }
  }
}

async function runSeed() {
  console.log('🚀 Membaca file data contoh:', EXCEL_PATH);
  const workbook = xlsx.readFile(EXCEL_PATH);

  // Ambil sheet akun uji untuk password
  const akunUjiSheet = xlsx.utils.sheet_to_json(workbook.Sheets['Akun Uji'] || {});
  const passwordMap = new Map();
  for (const item of akunUjiSheet) {
    passwordMap.set(item.email, item.kata_sandi_latihan || 'Latihan#2026');
  }

  // ============================================================================
  // 1. PROFILES & SUPABASE AUTH USERS (7 rows)
  // ============================================================================
  console.log('\n👤 [1/8] Menyiapkan Supabase Auth & profiles...');
  const { count: profilesCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  if (profilesCount >= 7) {
    console.log(`  ✓ 7 profiles sudah terdaftar di database, melewati.`);
  } else {
    const profilesRaw = xlsx.utils.sheet_to_json(workbook.Sheets['profiles']);
    const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();
    const existingUserMap = new Map();
    for (const u of existingUsers) {
      existingUserMap.set(u.id, u);
      existingUserMap.set(u.email, u);
    }

    const profilesClean = [];
    for (const row of profilesRaw) {
      const password = passwordMap.get(row.email) || 'Latihan#2026';
      const existing = existingUserMap.get(row.id) || existingUserMap.get(row.email);

      if (existing) {
        await supabase.auth.admin.updateUserById(existing.id, {
          password: password,
          user_metadata: { nama_lengkap: row.nama_lengkap }
        });
        console.log(`  ✓ User auth '${row.email}' diperbarui (${row.id})`);
      } else {
        const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
          id: row.id,
          email: row.email,
          password: password,
          email_confirm: true,
          user_metadata: { nama_lengkap: row.nama_lengkap }
        });
        if (createErr) throw new Error(`Gagal membuat user '${row.email}': ${createErr.message}`);
        console.log(`  + User auth '${row.email}' berhasil dibuat (${newUser.user.id})`);
      }

      profilesClean.push({
        id: row.id,
        nama_lengkap: row.nama_lengkap,
        email: row.email,
        peran: row.peran,
        jabatan: row.jabatan || null,
        aktif: Boolean(row.aktif),
        dibuat_pada: row.dibuat_pada
      });
    }

    await batchUpsert('profiles', profilesClean);
    console.log(`  🎉 ${profilesClean.length} profiles berhasil diimpor.`);
  }

  // ============================================================================
  // 2. AKUN (26 Bagan Akun)
  // ============================================================================
  console.log('\n📚 [2/8] Mengimpor 26 Bagan Akun (akun)...');
  const { count: akunCount } = await supabase.from('akun').select('*', { count: 'exact', head: true });
  if (akunCount >= 26) {
    console.log(`  ✓ 26 akun sudah terdaftar di database, melewati.`);
  } else {
    const akunRaw = xlsx.utils.sheet_to_json(workbook.Sheets['akun']);
    const akunClean = akunRaw.map(row => ({
      id: Number(row.id),
      kode: String(row.kode),
      nama: row.nama,
      tipe: row.tipe,
      saldo_normal: row.saldo_normal,
      is_kas_bank: Boolean(row.is_kas_bank),
      aktif: Boolean(row.aktif),
      keterangan: row.keterangan || null
    }));

    await batchUpsert('akun', akunClean);
    console.log(`  🎉 ${akunClean.length} akun berhasil diimpor.`);
  }

  // ============================================================================
  // 3. PERIODE (4 Periode Bulanan)
  // ============================================================================
  console.log('\n📅 [3/8] Mengimpor 4 Periode Akuntansi (periode)...');
  const { count: periodeCount } = await supabase.from('periode').select('*', { count: 'exact', head: true });
  if (periodeCount >= 4) {
    console.log(`  ✓ 4 periode sudah terdaftar di database, melewati.`);
  } else {
    const periodeRaw = xlsx.utils.sheet_to_json(workbook.Sheets['periode']);
    const periodeClean = periodeRaw.map(row => ({
      id: Number(row.id),
      tahun: Number(row.tahun),
      bulan: Number(row.bulan),
      tanggal_mulai: `${row.tahun}-${String(row.bulan).padStart(2, '0')}-01`,
      status: row.status,
      ditutup_oleh: row.ditutup_oleh || null,
      ditutup_pada: row.ditutup_pada || null,
      alasan_buka_ulang: row.alasan_buka_ulang || null
    }));

    await batchUpsert('periode', periodeClean);
    console.log(`  🎉 ${periodeClean.length} periode berhasil diimpor.`);
  }

  // ============================================================================
  // 4. PENOMORAN (8 Baris)
  // ============================================================================
  console.log('\n🔢 [4/8] Mengimpor status penomoran (penomoran)...');
  const { count: penomoranCount } = await supabase.from('penomoran').select('*', { count: 'exact', head: true });
  if (penomoranCount >= 8) {
    console.log(`  ✓ 8 penomoran sudah terdaftar di database, melewati.`);
  } else {
    const penomoranRaw = xlsx.utils.sheet_to_json(workbook.Sheets['penomoran']);
    const penomoranClean = penomoranRaw.map(row => ({
      jenis: row.jenis,
      tahun: Number(row.tahun),
      bulan: Number(row.bulan),
      nomor_terakhir: Number(row.nomor_terakhir)
    }));

    await batchUpsert('penomoran', penomoranClean, 50, 'jenis,tahun,bulan');
    console.log(`  🎉 ${penomoranClean.length} penomoran berhasil diimpor.`);
  }

  // ============================================================================
  // 5. PENGAJUAN (35 Pengajuan Biaya/Reimburse)
  // ============================================================================
  console.log('\n📝 [5/8] Mengimpor 35 Pengajuan (pengajuan)...');
  const { count: pengajuanCount } = await supabase.from('pengajuan').select('*', { count: 'exact', head: true });
  if (pengajuanCount >= 35) {
    console.log(`  ✓ 35 pengajuan sudah terdaftar di database, melewati.`);
  } else {
    const pengajuanRaw = xlsx.utils.sheet_to_json(workbook.Sheets['pengajuan']);
    const pengajuanClean = pengajuanRaw.map(row => ({
      id: Number(row.id),
      nomor: row.nomor,
      pengaju_id: row.pengaju_id,
      jenis: row.jenis,
      tanggal_transaksi: row.tanggal_transaksi,
      akun_beban_id: Number(row.akun_beban_id),
      jumlah: Number(row.jumlah),
      keterangan: row.keterangan,
      bukti_path: row.bukti_path || null,
      status: row.status,
      catatan_peninjau: row.catatan_peninjau || null,
      diajukan_pada: row.diajukan_pada || null,
      diverifikasi_oleh: row.diverifikasi_oleh || null,
      diverifikasi_pada: row.diverifikasi_pada || null,
      disetujui_oleh: row.disetujui_oleh || null,
      disetujui_pada: row.disetujui_pada || null,
      akun_kas_id: row.akun_kas_id ? Number(row.akun_kas_id) : null,
      dibayar_oleh: row.dibayar_oleh || null,
      dibayar_pada: row.dibayar_pada || null,
      dibuat_pada: row.dibuat_pada
    }));

    await batchUpsert('pengajuan', pengajuanClean);
    console.log(`  🎉 ${pengajuanClean.length} pengajuan berhasil diimpor.`);
  }

  // ============================================================================
  // 6. JURNAL & JURNAL_BARIS (90 Jurnal & 191 Baris)
  // ============================================================================
  console.log('\n📖 [6/8] Mengimpor 90 Jurnal dan 191 Baris Jurnal...');
  const { count: jurnalCount } = await supabase.from('jurnal').select('*', { count: 'exact', head: true });
  if (jurnalCount >= 90) {
    console.log(`  ✓ 90 kepala jurnal dan baris sudah ada di database, melewati.`);
  } else {
    const jurnalRaw = xlsx.utils.sheet_to_json(workbook.Sheets['jurnal']);
    const jurnalClean = jurnalRaw.map(row => ({
      id: Number(row.id),
      nomor: row.nomor || null,
      tanggal: row.tanggal,
      periode_id: Number(row.periode_id),
      keterangan: row.keterangan,
      sumber: row.sumber,
      status: row.status,
      pengajuan_id: row.pengajuan_id ? Number(row.pengajuan_id) : null,
      jurnal_dibalik_id: row.jurnal_dibalik_id ? Number(row.jurnal_dibalik_id) : null,
      dibuat_oleh: row.dibuat_oleh,
      diposting_oleh: row.diposting_oleh || null,
      diposting_pada: row.diposting_pada || null,
      dibuat_pada: row.dibuat_pada
    }));

    await batchUpsert('jurnal', jurnalClean);
    console.log(`  ✓ ${jurnalClean.length} kepala jurnal berhasil diimpor.`);

    const barisRaw = xlsx.utils.sheet_to_json(workbook.Sheets['jurnal_baris']);
    const barisClean = barisRaw.map(row => ({
      id: Number(row.id),
      jurnal_id: Number(row.jurnal_id),
      urutan: Number(row.urutan || 1),
      akun_id: Number(row.akun_id),
      debit: Number(row.debit || 0),
      kredit: Number(row.kredit || 0),
      keterangan: row.keterangan || null
    }));

    await batchUpsert('jurnal_baris', barisClean);
    console.log(`  ✓ ${barisClean.length} baris debit/kredit jurnal berhasil diimpor.`);
  }

  // ============================================================================
  // 7. AUDIT_LOG (185 Riwayat Log)
  // ============================================================================
  console.log('\n📜 [7/8] Mengimpor 185 Catatan Audit Log (audit_log)...');
  const { count: auditCount } = await supabase.from('audit_log').select('*', { count: 'exact', head: true });
  if (auditCount >= 185) {
    console.log(`  ✓ ${auditCount} riwayat audit_log sudah terdaftar, melewati.`);
  } else {
    const auditRaw = xlsx.utils.sheet_to_json(workbook.Sheets['audit_log']);
    const auditClean = auditRaw.map(row => {
      let dataLama = null;
      let dataBaru = null;
      try {
        if (row.data_lama) dataLama = typeof row.data_lama === 'string' ? JSON.parse(row.data_lama) : row.data_lama;
      } catch {
        dataLama = row.data_lama;
      }
      try {
        if (row.data_baru) dataBaru = typeof row.data_baru === 'string' ? JSON.parse(row.data_baru) : row.data_baru;
      } catch {
        dataBaru = row.data_baru;
      }

      return {
        id: Number(row.id),
        waktu: row.waktu,
        pelaku_id: row.pelaku_id || null,
        aksi: row.aksi,
        nama_tabel: row.nama_tabel,
        id_data: String(row.id_data),
        data_lama: dataLama,
        data_baru: dataBaru
      };
    });

    for (let i = 0; i < auditClean.length; i += 50) {
      const batch = auditClean.slice(i, i + 50);
      const { error } = await supabase.from('audit_log').insert(batch);
      if (error) {
        throw new Error(`Gagal insert ke audit_log pada baris ${i + 1}-${i + batch.length}: ${error.message}`);
      }
    }
    console.log(`  🎉 ${auditClean.length} riwayat audit_log berhasil diimpor.`);
  }

  // ============================================================================
  // 8. MUTASI_BANK (9 Data Mutasi Bank - abaikan catatan baris ke-10)
  // ============================================================================
  console.log('\n🏦 [8/8] Mengimpor 9 Data Mutasi Bank (mutasi_bank)...');
  const { count: mutasiCount } = await supabase.from('mutasi_bank').select('*', { count: 'exact', head: true });
  if (mutasiCount >= 9) {
    console.log(`  ✓ 9 mutasi_bank sudah terdaftar, melewati.`);
  } else {
    const mutasiRaw = xlsx.utils.sheet_to_json(workbook.Sheets['mutasi_bank']);
    // Filter hanya baris data dengan ID angka (abaikan catatan baris terakhir)
    const validRows = mutasiRaw.filter(r => Number.isInteger(Number(r.id)));
    const mutasiClean = validRows.map(row => ({
      id: Number(row.id),
      akun_bank_id: Number(row.akun_bank_id),
      tanggal: row.tanggal,
      deskripsi: row.deskripsi,
      jumlah: Number(row.jumlah),
      saldo: row.saldo !== undefined && row.saldo !== null ? Number(row.saldo) : null,
      nama_file: row.nama_file,
      jurnal_id: row.jurnal_id ? Number(row.jurnal_id) : null,
      diimpor_oleh: row.diimpor_oleh,
      diimpor_pada: row.diimpor_pada
    }));

    await batchUpsert('mutasi_bank', mutasiClean);
    console.log(`  🎉 ${mutasiClean.length} mutasi_bank berhasil diimpor.`);
  }

  console.log('\n======================================================');
  console.log('✅ SELURUH DATA CONTOH EXCEL BERHASIL DIIMPOR KE SUPABASE!');
  console.log('💡 Kata sandi seluruh akun uji latihan: "Latihan#2026"');
  console.log('======================================================\n');
}

runSeed().catch(err => {
  console.error('\n❌ PROSES SEEDING GAGAL:', err.message);
  process.exit(1);
});
