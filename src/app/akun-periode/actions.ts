'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SimpanAkunPayload {
  id?: number;
  kode: string;
  nama: string;
  tipe: 'aset' | 'kewajiban' | 'ekuitas' | 'pendapatan' | 'beban';
  is_kas_bank?: boolean;
  keterangan?: string;
}

export interface BukaPeriodePayload {
  periode_id: number;
  alasan: string;
}

export interface TambahPeriodePayload {
  tahun: number;
  bulan: number;
}

/**
 * 1. Server Action: Tambah atau Ubah Akun (Bagan Akun)
 * Hak Akses: Hanya Akuntan yang berhak mengelola akun. Direktur & Staf DITOLAK.
 */
export async function simpanAkunAction(
  payload: SimpanAkunPayload
): Promise<ActionResponse<{ id: number }>> {
  try {
    const supabase = await createClient();

    // Verifikasi sesi pengguna
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Sesi Anda telah berakhir. Silakan masuk kembali.' };
    }

    // Verifikasi peran (Hanya Akuntan)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, peran, aktif')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.aktif) {
      return { success: false, error: 'Akun Anda tidak aktif atau tidak ditemukan.' };
    }

    if (profile.peran !== 'akuntan') {
      return { success: false, error: 'Hanya peran Akuntan yang berhak menambah atau mengubah bagan akun.' };
    }

    // Validasi Kode Akun (4 Digit angka, awalan 1-5 sesuai tipe)
    const kodeClean = payload.kode.trim();
    if (!/^[1-5][0-9]{3}$/.test(kodeClean)) {
      return {
        success: false,
        error: 'Kode akun harus berupa 4 digit angka dengan awalan 1 (Aset), 2 (Kewajiban), 3 (Ekuitas), 4 (Pendapatan), atau 5 (Beban).',
      };
    }

    // Validasi Prefiks Kode sesuai Tipe Akun
    const expectedPrefix: Record<string, string> = {
      aset: '1',
      kewajiban: '2',
      ekuitas: '3',
      pendapatan: '4',
      beban: '5',
    };
    if (kodeClean[0] !== expectedPrefix[payload.tipe]) {
      return {
        success: false,
        error: `Kode akun untuk tipe ${payload.tipe.toUpperCase()} harus diawali dengan angka '${expectedPrefix[payload.tipe]}'.`,
      };
    }

    // Validasi Nama Akun (minimal 3 karakter)
    const namaClean = payload.nama.trim();
    if (namaClean.length < 3) {
      return { success: false, error: 'Nama akun wajib diisi minimal 3 karakter.' };
    }

    // Aturan Saldo Normal Otomatis Sesuai Tipe Akun
    const saldoNormal =
      payload.tipe === 'aset' || payload.tipe === 'beban' ? 'debit' : 'kredit';

    // Kas/Bank hanya boleh aktif jika tipe aset
    const isKasBank = payload.tipe === 'aset' ? Boolean(payload.is_kas_bank) : false;

    const keteranganClean = payload.keterangan ? payload.keterangan.trim() : null;

    const adminSupabase = createAdminClient();

    if (payload.id) {
      // Operasi UPDATE Akun
      const { data: existing, error: getErr } = await adminSupabase
        .from('akun')
        .select('id, kode')
        .eq('id', payload.id)
        .single();

      if (getErr || !existing) {
        return { success: false, error: 'Akun yang ingin diubah tidak ditemukan.' };
      }

      // Cek keunikan kode jika kode diubah
      if (existing.kode !== kodeClean) {
        const { data: duplicate } = await adminSupabase
          .from('akun')
          .select('id')
          .eq('kode', kodeClean)
          .single();

        if (duplicate) {
          return { success: false, error: `Kode akun ${kodeClean} sudah digunakan oleh akun lain.` };
        }
      }

      const { error: updateErr } = await adminSupabase
        .from('akun')
        .update({
          kode: kodeClean,
          nama: namaClean,
          tipe: payload.tipe,
          saldo_normal: saldoNormal,
          is_kas_bank: isKasBank,
          keterangan: keteranganClean,
        })
        .eq('id', payload.id);

      if (updateErr) {
        return { success: false, error: 'Gagal memperbarui akun: ' + updateErr.message };
      }

      revalidatePath('/akun-periode');
      revalidatePath('/jurnal');
      revalidatePath('/buku-besar');
      revalidatePath('/laporan-keuangan');

      return { success: true, data: { id: payload.id } };
    } else {
      // Operasi INSERT Akun Baru
      const { data: duplicate } = await adminSupabase
        .from('akun')
        .select('id')
        .eq('kode', kodeClean)
        .single();

      if (duplicate) {
        return { success: false, error: `Kode akun ${kodeClean} sudah digunakan. Harap gunakan kode lain.` };
      }

      // Hitung ID berikutnya secara aman dari database untuk mencegah bentrok sequence identity
      const { data: maxRows } = await adminSupabase
        .from('akun')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);

      const nextId = (Number(maxRows?.[0]?.id) || 0) + 1;

      const { data: inserted, error: insertErr } = await adminSupabase
        .from('akun')
        .insert({
          id: nextId,
          kode: kodeClean,
          nama: namaClean,
          tipe: payload.tipe,
          saldo_normal: saldoNormal,
          is_kas_bank: isKasBank,
          aktif: true,
          keterangan: keteranganClean,
        })
        .select('id')
        .single();

      if (insertErr || !inserted) {
        return { success: false, error: 'Gagal menambahkan akun baru: ' + (insertErr?.message || '') };
      }

      revalidatePath('/akun-periode');
      revalidatePath('/jurnal');
      revalidatePath('/buku-besar');
      revalidatePath('/laporan-keuangan');

      return { success: true, data: { id: inserted.id } };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
    return { success: false, error: msg };
  }
}

/**
 * 2. Server Action: Nonaktifkan / Aktifkan Kembali Akun (Soft-Delete)
 * Sesuai aturan: JANGAN gunakan perintah DELETE SQL agar relasi jurnal tidak rusak.
 * Hak Akses: Hanya Akuntan.
 */
export async function toggleStatusAkunAction(
  akun_id: number,
  target_aktif: boolean
): Promise<ActionResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Sesi Anda telah berakhir. Silakan masuk kembali.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, peran, aktif')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.aktif || profile.peran !== 'akuntan') {
      return { success: false, error: 'Hanya peran Akuntan yang dapat mengubah status aktif akun.' };
    }

    const adminSupabase = createAdminClient();

    const { error: updateErr } = await adminSupabase
      .from('akun')
      .update({ aktif: target_aktif })
      .eq('id', akun_id);

    if (updateErr) {
      return { success: false, error: 'Gagal memperbarui status akun: ' + updateErr.message };
    }

    revalidatePath('/akun-periode');
    revalidatePath('/jurnal');
    revalidatePath('/buku-besar');
    revalidatePath('/laporan-keuangan');

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
    return { success: false, error: msg };
  }
}

/**
 * 3. Server Action: Tutup Periode Akuntansi
 * Hak Akses: Akuntan.
 * Syarat: Tidak boleh ada jurnal draf di periode yang ingin ditutup.
 */
export async function tutupPeriodeAction(periode_id: number): Promise<ActionResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Sesi Anda telah berakhir. Silakan masuk kembali.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, peran, aktif')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.aktif || profile.peran !== 'akuntan') {
      return { success: false, error: 'Hanya peran Akuntan yang berhak menutup periode akuntansi.' };
    }

    const adminSupabase = createAdminClient();

    // 1. Ambil detail periode
    const { data: periode, error: getErr } = await adminSupabase
      .from('periode')
      .select('*')
      .eq('id', periode_id)
      .single();

    if (getErr || !periode) {
      return { success: false, error: 'Periode tidak ditemukan.' };
    }

    if (periode.status === 'ditutup') {
      return { success: false, error: 'Periode ini sudah dalam status ditutup.' };
    }

    // 2. Periksa apakah masih ada jurnal draf pada periode ini
    const { count: draftCount, error: countErr } = await adminSupabase
      .from('jurnal')
      .select('id', { count: 'exact', head: true })
      .eq('periode_id', periode_id)
      .eq('status', 'draf');

    if (countErr) {
      return { success: false, error: 'Gagal memeriksa status draf jurnal: ' + countErr.message };
    }

    if (draftCount && draftCount > 0) {
      return {
        success: false,
        error: `Tidak dapat menutup periode: Masih terdapat ${draftCount} jurnal berstatus draf pada periode ini. Harap posting atau hapus draf terlebih dahulu.`,
      };
    }

    // 3. Eksekusi Tutup Periode
    const { error: updateErr } = await adminSupabase
      .from('periode')
      .update({
        status: 'ditutup',
        ditutup_oleh: user.id,
        ditutup_pada: new Date().toISOString(),
      })
      .eq('id', periode_id);

    if (updateErr) {
      return { success: false, error: 'Gagal menutup periode: ' + updateErr.message };
    }

    revalidatePath('/akun-periode');
    revalidatePath('/jurnal');
    revalidatePath('/');

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
    return { success: false, error: msg };
  }
}

/**
 * 4. Server Action: Buka Kembali Periode Akuntansi
 * Hak Akses: Eksklusif Direktur (Akuntan dilarang membuka kembali).
 * Syarat: Wajib menyertakan alasan buka ulang minimal 20 karakter.
 */
export async function bukaKembaliPeriodeAction(
  payload: BukaPeriodePayload
): Promise<ActionResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Sesi Anda telah berakhir. Silakan masuk kembali.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, peran, aktif')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.aktif || profile.peran !== 'direktur') {
      return {
        success: false,
        error: 'Hak Akses Ditolak: Hanya Direktur yang berhak membuka kembali periode yang sudah ditutup.',
      };
    }

    // Validasi Alasan Buka Ulang (minimal 20 karakter)
    const alasanClean = (payload.alasan || '').trim();
    if (alasanClean.length < 20) {
      return {
        success: false,
        error: 'Alasan pembukaan kembali periode wajib diisi dengan jelas (minimal 20 karakter).',
      };
    }

    const adminSupabase = createAdminClient();

    const { data: periode, error: getErr } = await adminSupabase
      .from('periode')
      .select('*')
      .eq('id', payload.periode_id)
      .single();

    if (getErr || !periode) {
      return { success: false, error: 'Periode tidak ditemukan.' };
    }

    if (periode.status === 'terbuka') {
      return { success: false, error: 'Periode ini sudah dalam status terbuka.' };
    }

    // Eksekusi Buka Kembali Periode
    const { error: updateErr } = await adminSupabase
      .from('periode')
      .update({
        status: 'terbuka',
        alasan_buka_ulang: alasanClean,
        ditutup_oleh: null,
        ditutup_pada: null,
      })
      .eq('id', payload.periode_id);

    if (updateErr) {
      return { success: false, error: 'Gagal membuka kembali periode: ' + updateErr.message };
    }

    revalidatePath('/akun-periode');
    revalidatePath('/jurnal');
    revalidatePath('/');

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
    return { success: false, error: msg };
  }
}

/**
 * 5. Server Action: Tambah Periode Akuntansi Baru
 * Hak Akses: Akuntan.
 */
export async function tambahPeriodeAction(
  payload: TambahPeriodePayload
): Promise<ActionResponse<{ id: number }>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Sesi Anda telah berakhir. Silakan masuk kembali.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, peran, aktif')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.aktif || profile.peran !== 'akuntan') {
      return { success: false, error: 'Hanya peran Akuntan yang dapat membuat periode akuntansi baru.' };
    }

    const { tahun, bulan } = payload;
    if (!tahun || tahun < 2020 || tahun > 2050 || !bulan || bulan < 1 || bulan > 12) {
      return { success: false, error: 'Tahun atau bulan periode tidak valid.' };
    }

    const adminSupabase = createAdminClient();

    // Cek duplikasi periode
    const { data: existing } = await adminSupabase
      .from('periode')
      .select('id')
      .eq('tahun', tahun)
      .eq('bulan', bulan)
      .single();

    if (existing) {
      return { success: false, error: `Periode untuk bulan ${bulan}/${tahun} sudah terdaftar sebelumnya.` };
    }

    const padBulan = String(bulan).padStart(2, '0');
    const tanggalMulai = `${tahun}-${padBulan}-01`;

    // Hitung ID berikutnya secara aman dari database untuk mencegah bentrok sequence identity
    const { data: maxPeriode } = await adminSupabase
      .from('periode')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);

    const nextPeriodeId = (Number(maxPeriode?.[0]?.id) || 0) + 1;

    const { data: inserted, error: insertErr } = await adminSupabase
      .from('periode')
      .insert({
        id: nextPeriodeId,
        tahun,
        bulan,
        tanggal_mulai: tanggalMulai,
        status: 'terbuka',
      })
      .select('id')
      .single();

    if (insertErr || !inserted) {
      return { success: false, error: 'Gagal menambahkan periode baru: ' + (insertErr?.message || '') };
    }

    revalidatePath('/akun-periode');
    revalidatePath('/jurnal');

    return { success: true, data: { id: inserted.id } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
    return { success: false, error: msg };
  }
}
