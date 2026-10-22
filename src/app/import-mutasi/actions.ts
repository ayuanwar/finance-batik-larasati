'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface MutasiRowInput {
  tanggal: string; // YYYY-MM-DD
  deskripsi: string;
  jumlah: number; // nominal (positif untuk uang masuk, negatif untuk uang keluar)
  saldo: number | null;
}

export interface ImportMutasiPayload {
  akunId: number;
  namaFile: string;
  rows: MutasiRowInput[];
}

export interface BarisJurnalMutasiInput {
  akun_id: number;
  debit: number;
  kredit: number;
  keterangan?: string;
}

export interface BuatDrafJurnalPayload {
  mutasiId: number;
  tanggal: string; // YYYY-MM-DD
  keterangan: string;
  baris: BarisJurnalMutasiInput[];
}

export interface MutasiBankItem {
  id: number;
  akun_bank_id: number;
  akun_id?: number;
  tanggal: string;
  deskripsi: string;
  jumlah: number;
  saldo: number | null;
  nama_file: string;
  jurnal_id: number | null;
  diimpor_oleh: string;
  diimpor_pada: string;
  hash_transaksi?: string;
  akun?: {
    id: number;
    kode: string;
    nama: string;
  } | null;
  jurnal?: {
    id: number;
    nomor: string | null;
    status: string;
  } | null;
}

/**
 * Validasi otorisasi: Hanya Akuntan dan Direktur yang dapat mengakses modul ini
 */
async function verifyFinance() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, error: 'Sesi Anda telah berakhir. Silakan masuk kembali.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nama_lengkap, peran, aktif')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.aktif) {
    return { authorized: false, error: 'Akun Anda tidak aktif atau tidak ditemukan.' };
  }

  if (profile.peran !== 'akuntan' && profile.peran !== 'direktur') {
    return {
      authorized: false,
      error: 'Akses Ditolak: Fitur ini hanya dapat diakses oleh Akuntan dan Direktur.',
    };
  }

  return { authorized: true, user, profile, supabase };
}

/**
 * Helper untuk menghitung hash signature unik mutasi bank
 */
function createMutationHash(
  akunId: number,
  tanggal: string,
  deskripsi: string,
  jumlah: number,
  saldo: number | null
): string {
  const cleanDesc = deskripsi.trim().toLowerCase();
  const saldoStr = saldo !== null && saldo !== undefined ? String(Math.round(saldo)) : 'null';
  return `${akunId}|${tanggal}|${cleanDesc}|${Math.round(jumlah)}|${saldoStr}`;
}

/**
 * 1. Server Action: Mengimpor Data Mutasi Bank ke Tabel Perantara mutasi_bank
 * Mencegah duplikasi data secara mutlak berdasarkan kombinasi unik (hash).
 */
export async function importMutasiAction(
  payload: ImportMutasiPayload
): Promise<ActionResponse<{ totalInserted: number; totalDuplicate: number }>> {
  try {
    const auth = await verifyFinance();
    if (!auth.authorized || !auth.user) {
      return { success: false, error: auth.error };
    }

    if (!payload.akunId) {
      return { success: false, error: 'Akun Kas/Bank wajib dipilih sebelum mengunggah mutasi.' };
    }

    if (!payload.rows || payload.rows.length === 0) {
      return { success: false, error: 'Tidak ada baris data transaksi yang valid untuk diimpor.' };
    }

    const adminSupabase = createAdminClient();

    // Verifikasi bahwa akun yang dipilih benar-benar Akun Kas/Bank (is_kas_bank = true)
    const { data: akunData, error: akunErr } = await adminSupabase
      .from('akun')
      .select('id, kode, nama, is_kas_bank, aktif')
      .eq('id', payload.akunId)
      .single();

    if (akunErr || !akunData) {
      return { success: false, error: 'Akun Kas/Bank yang dipilih tidak ditemukan dalam sistem.' };
    }

    if (!akunData.is_kas_bank || !akunData.aktif) {
      return { success: false, error: 'Akun yang dipilih harus berstatus aktif dan merupakan Akun Kas/Bank.' };
    }

    // Ambil seluruh mutasi yang ada untuk akun bank ini guna mendeteksi duplikat
    const { data: existingMutasi, error: existErr } = await adminSupabase
      .from('mutasi_bank')
      .select('akun_bank_id, tanggal, deskripsi, jumlah, saldo')
      .eq('akun_bank_id', payload.akunId);

    if (existErr) {
      console.error('Error checking existing mutasi:', existErr);
    }

    const existingHashSet = new Set<string>();
    (existingMutasi || []).forEach((item) => {
      existingHashSet.add(
        createMutationHash(item.akun_bank_id, item.tanggal, item.deskripsi, item.jumlah, item.saldo)
      );
    });

    const newRowsToInsert: Array<{
      akun_bank_id: number;
      tanggal: string;
      deskripsi: string;
      jumlah: number;
      saldo: number | null;
      nama_file: string;
      diimpor_oleh: string;
      diimpor_pada: string;
    }> = [];

    let duplicateCount = 0;
    const currentBatchHashSet = new Set<string>();

    for (const r of payload.rows) {
      // Validasi baris dasar
      if (!r.tanggal || !r.deskripsi || r.jumlah === 0) {
        continue;
      }

      const hash = createMutationHash(payload.akunId, r.tanggal, r.deskripsi, r.jumlah, r.saldo);

      // Cek apakah sudah pernah ada di database atau di batch saat ini
      if (existingHashSet.has(hash) || currentBatchHashSet.has(hash)) {
        duplicateCount++;
        continue;
      }

      currentBatchHashSet.add(hash);
      newRowsToInsert.push({
        akun_bank_id: payload.akunId,
        tanggal: r.tanggal,
        deskripsi: r.deskripsi.trim(),
        jumlah: Math.round(r.jumlah),
        saldo: r.saldo !== null && r.saldo !== undefined ? Math.round(r.saldo) : null,
        nama_file: payload.namaFile || 'import_mutasi.csv',
        diimpor_oleh: auth.user.id,
        diimpor_pada: new Date().toISOString(),
      });
    }

    if (newRowsToInsert.length === 0) {
      return {
        success: true,
        data: { totalInserted: 0, totalDuplicate: duplicateCount },
        error:
          duplicateCount > 0
            ? `Seluruh ${duplicateCount} transaksi dalam file ini sudah pernah diimpor sebelumnya (duplikat terdeteksi).`
            : 'Tidak ada baris data mutasi baru yang valid untuk disimpan.',
      };
    }

    // Eksekusi insert batch ke tabel mutasi_bank
    const { error: insertErr } = await adminSupabase
      .from('mutasi_bank')
      .insert(newRowsToInsert);

    if (insertErr) {
      // Jika terjadi pelanggaran unique constraint pada level PostgreSQL
      if (insertErr.code === '23505') {
        return {
          success: false,
          error: 'Sebagian transaksi gagal diimpor karena melanggar batasan keunikan data mutasi di database.',
        };
      }
      return { success: false, error: 'Gagal menyimpan mutasi bank: ' + insertErr.message };
    }

    // Catat ke audit log
    await adminSupabase.from('audit_log').insert({
      waktu: new Date().toISOString(),
      pelaku_id: auth.user.id,
      aksi: 'IMPORT_MUTASI_BANK',
      nama_tabel: 'mutasi_bank',
      id_data: `AKUN_${payload.akunId}_${Date.now()}`,
      data_baru: {
        akun_bank_id: payload.akunId,
        nama_file: payload.namaFile,
        total_diimpor: newRowsToInsert.length,
        total_duplikat_dilewati: duplicateCount,
      },
    });

    revalidatePath('/import-mutasi');
    revalidatePath('/');

    return {
      success: true,
      data: {
        totalInserted: newRowsToInsert.length,
        totalDuplicate: duplicateCount,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat mengimpor mutasi.';
    return { success: false, error: msg };
  }
}

/**
 * 2. Server Action: Membuat Draf Jurnal dari Baris Mutasi Bank & Menghubungkannya
 * Aturan Bisnis PRD:
 * - Jurnal dibuat dalam status 'draf'
 * - Baris 1: Akun Kas/Bank mutasi
 * - Baris lawan diisi oleh Akuntan
 * - Setelah draf tersimpan, update mutasi_bank.jurnal_id = newJurnal.id
 */
export async function buatDrafJurnalDariMutasiAction(
  payload: BuatDrafJurnalPayload
): Promise<ActionResponse<{ jurnalId: number }>> {
  try {
    const auth = await verifyFinance();
    if (!auth.authorized || !auth.user) {
      return { success: false, error: auth.error };
    }

    if (!payload.mutasiId) {
      return { success: false, error: 'ID mutasi bank tidak valid.' };
    }

    const adminSupabase = createAdminClient();

    // 1. Ambil data mutasi yang dimaksud
    const { data: mutasi, error: mutasiErr } = await adminSupabase
      .from('mutasi_bank')
      .select('id, akun_bank_id, tanggal, deskripsi, jumlah, jurnal_id')
      .eq('id', payload.mutasiId)
      .single();

    if (mutasiErr || !mutasi) {
      return { success: false, error: 'Data mutasi bank tidak ditemukan.' };
    }

    if (mutasi.jurnal_id !== null) {
      return {
        success: false,
        error: 'Baris mutasi ini telah diproses sebelumnya dan sudah terhubung dengan jurnal.',
      };
    }

    // 2. Validasi Periode Akuntansi Berdasarkan Tanggal Mutasi (BR-05)
    const tglDate = new Date(payload.tanggal);
    if (isNaN(tglDate.getTime())) {
      return { success: false, error: 'Format tanggal mutasi tidak valid.' };
    }

    const tahun = tglDate.getFullYear();
    const bulan = tglDate.getMonth() + 1;

    const { data: periodeData, error: periodeErr } = await adminSupabase
      .from('periode')
      .select('id, status')
      .eq('tahun', tahun)
      .eq('bulan', bulan)
      .single();

    if (periodeErr || !periodeData) {
      return {
        success: false,
        error: `Periode akuntansi ${bulan}/${tahun} belum dibuka di sistem. Pembuatan draf jurnal memerlukan periode yang valid (BR-05).`,
      };
    }

    if (periodeData.status !== 'terbuka') {
      return {
        success: false,
        error: `Periode akuntansi ${bulan}/${tahun} telah ditutup. Tidak dapat membuat jurnal pada periode tertutup (BR-05).`,
      };
    }

    // 3. Validasi Baris Jurnal (BR-02: Min 2 baris, seimbang)
    if (!payload.baris || payload.baris.length < 2) {
      return {
        success: false,
        error: 'Jurnal minimal harus terdiri dari 2 baris akun (Akun Kas/Bank dan Akun Lawan).',
      };
    }

    let totalDebit = 0;
    let totalKredit = 0;

    for (let i = 0; i < payload.baris.length; i++) {
      const b = payload.baris[i];
      if (!b.akun_id) {
        return { success: false, error: `Baris ke-${i + 1}: Akun belum dipilih.` };
      }

      const deb = Number(b.debit || 0);
      const kre = Number(b.kredit || 0);

      if (deb < 0 || kre < 0) {
        return { success: false, error: `Baris ke-${i + 1}: Nominal tidak boleh negatif.` };
      }

      if ((deb > 0 && kre > 0) || (deb === 0 && kre === 0)) {
        return {
          success: false,
          error: `Baris ke-${i + 1}: Isi salah satu antara kolom Debit atau Kredit saja.`,
        };
      }

      totalDebit += deb;
      totalKredit += kre;
    }

    if (totalDebit !== totalKredit || totalDebit <= 0) {
      return {
        success: false,
        error: `Jurnal tidak seimbang. Total Debit (Rp${totalDebit.toLocaleString('id-ID')}) harus sama dengan Total Kredit (Rp${totalKredit.toLocaleString('id-ID')}).`,
      };
    }

    // 4. Simpan Kepala Jurnal dengan Status 'draf' (Sesuai PRD)
    const { data: newJurnal, error: jurnalErr } = await adminSupabase
      .from('jurnal')
      .insert({
        tanggal: payload.tanggal,
        periode_id: periodeData.id,
        keterangan: payload.keterangan.trim() || mutasi.deskripsi,
        sumber: 'manual',
        status: 'draf',
        dibuat_oleh: auth.user.id,
        nomor: null, // Nomor resmi gapless di-generate saat diposting
      })
      .select('id, status')
      .single();

    if (jurnalErr || !newJurnal) {
      return { success: false, error: 'Gagal membuat kepala draf jurnal: ' + (jurnalErr?.message || '') };
    }

    // 5. Simpan Rincian Baris Jurnal
    const rowsToInsert = payload.baris.map((b, idx) => ({
      jurnal_id: newJurnal.id,
      urutan: idx + 1,
      akun_id: b.akun_id,
      debit: Math.round(Number(b.debit || 0)),
      kredit: Math.round(Number(b.kredit || 0)),
      keterangan: b.keterangan?.trim() || payload.keterangan.trim(),
    }));

    const { error: linesErr } = await adminSupabase
      .from('jurnal_baris')
      .insert(rowsToInsert);

    if (linesErr) {
      // Hapus header jika gagal insert baris agar tidak orphan
      await adminSupabase.from('jurnal').delete().eq('id', newJurnal.id);
      return { success: false, error: 'Gagal menyimpan baris draf jurnal: ' + linesErr.message };
    }

    // 6. Hubungkan Baris Mutasi Bank ke Draf Jurnal yang Baru Saja Dibuat
    const { error: updateMutasiErr } = await adminSupabase
      .from('mutasi_bank')
      .update({ jurnal_id: newJurnal.id })
      .eq('id', payload.mutasiId);

    if (updateMutasiErr) {
      console.error('Peringatan: Gagal menautkan mutasi_bank.jurnal_id:', updateMutasiErr);
    }

    // 7. Catat ke Audit Log
    await adminSupabase.from('audit_log').insert({
      waktu: new Date().toISOString(),
      pelaku_id: auth.user.id,
      aksi: 'CREATE_JURNAL_DRAF_FROM_MUTASI',
      nama_tabel: 'jurnal',
      id_data: String(newJurnal.id),
      data_baru: {
        mutasi_id: payload.mutasiId,
        status: 'draf',
        total_nominal: totalDebit,
        keterangan: payload.keterangan.trim(),
      },
    });

    revalidatePath('/import-mutasi');
    revalidatePath('/jurnal');
    revalidatePath('/buku-besar');
    revalidatePath('/');

    return {
      success: true,
      data: { jurnalId: newJurnal.id },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat membuat draf jurnal.';
    return { success: false, error: msg };
  }
}
