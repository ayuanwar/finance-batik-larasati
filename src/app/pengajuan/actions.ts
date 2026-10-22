'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface SimpanPengajuanPayload {
  id?: number;
  jenis: 'reimburse' | 'pengeluaran';
  tanggal_transaksi: string;
  akun_beban_id: number;
  jumlah: number;
  keterangan: string;
  bukti_path: string | null;
  target_status: 'draf' | 'kirim' | 'diajukan';
}

export interface SimpanPengajuanResult {
  success: boolean;
  docId?: number;
  nomor?: string;
  error?: string;
}

export async function simpanPengajuanAction(
  payload: SimpanPengajuanPayload
): Promise<SimpanPengajuanResult> {
  try {
    const supabase = await createClient();

    // 1. Verifikasi Sesi Pengguna
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Sesi Anda telah berakhir. Silakan masuk kembali.' };
    }

    // 2. Ambil Profil & Validasi Status Aktif
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.aktif) {
      return { success: false, error: 'Akun Anda tidak aktif atau tidak ditemukan.' };
    }

    // Direktur tidak boleh membuat pengajuan biaya
    if (profile.peran === 'direktur') {
      return { success: false, error: 'Peran Direktur tidak memiliki izin membuat pengajuan biaya.' };
    }

    // 3. Validasi Aturan Bisnis Input
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const minDateStr = thirtyDaysAgo.toISOString().split('T')[0];

    if (!payload.tanggal_transaksi) {
      return { success: false, error: 'Tanggal transaksi nota fisik wajib diisi.' };
    }
    if (payload.tanggal_transaksi > todayStr) {
      return { success: false, error: 'Tanggal nota tidak boleh berada di masa depan.' };
    }
    if (payload.tanggal_transaksi < minDateStr) {
      return { success: false, error: 'Tanggal nota maksimal 30 hari sebelum pengajuan dikirim.' };
    }
    if (!payload.akun_beban_id) {
      return { success: false, error: 'Pilih akun beban operasional.' };
    }
    if (!payload.jumlah || payload.jumlah < 10000 || payload.jumlah > 25000000) {
      return { success: false, error: 'Nilai pengajuan harus berada di antara Rp10.000 dan Rp25.000.000.' };
    }
    if (!payload.keterangan || payload.keterangan.trim().length < 10) {
      return { success: false, error: 'Keperluan pengajuan wajib diisi minimal 10 karakter.' };
    }

    const isKirim = payload.target_status === 'kirim' || payload.target_status === 'diajukan';
    if (isKirim && (!payload.bukti_path || !payload.bukti_path.trim())) {
      return {
        success: false,
        error: 'Bukti nota wajib diunggah untuk mengirimkan pengajuan.',
      };
    }

    const adminClient = createAdminClient();

    // 4. Kasus A: Buat Pengajuan Baru
    if (!payload.id) {
      // Generate Nomor Dokumen Pengajuan Otomatis (PG-YYYYMM-NNN)
      const { data: generatedNumber, error: numError } = await supabase.rpc(
        'generate_document_number',
        {
          p_jenis: 'PG',
          p_date: payload.tanggal_transaksi,
        }
      );

      if (numError || !generatedNumber) {
        return {
          success: false,
          error: `Gagal menghasilkan nomor dokumen: ${numError?.message || 'Nomor kosong'}`,
        };
      }

      let finalStatus: string = 'draf';
      let diajukanPada: string | null = null;

      if (isKirim) {
        if (profile.peran === 'akuntan') {
          finalStatus = 'menunggu_direktur';
        } else {
          finalStatus = 'diajukan';
        }
        diajukanPada = new Date().toISOString();
      }

      // Hitung ID berikutnya secara aman dari database untuk mencegah bentrok sequence identity
      const { data: maxRows } = await adminClient
        .from('pengajuan')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);

      const nextId = (maxRows?.[0]?.id || 0) + 1;

      const { data: newDoc, error: insertError } = await adminClient
        .from('pengajuan')
        .insert({
          id: nextId,
          nomor: generatedNumber,
          pengaju_id: user.id,
          jenis: payload.jenis,
          tanggal_transaksi: payload.tanggal_transaksi,
          akun_beban_id: Number(payload.akun_beban_id),
          jumlah: Number(payload.jumlah),
          keterangan: payload.keterangan.trim(),
          bukti_path: payload.bukti_path,
          status: finalStatus,
          diajukan_pada: diajukanPada,
        })
        .select('id, nomor, status')
        .single();

      if (insertError) {
        return { success: false, error: `Gagal menyimpan ke database: ${insertError.message}` };
      }

      revalidatePath('/pengajuan');
      revalidatePath('/');
      return { success: true, docId: newDoc.id, nomor: newDoc.nomor };
    }

    // 5. Kasus B: Ubah Pengajuan yang Ada
    const { data: existingDoc, error: fetchError } = await adminClient
      .from('pengajuan')
      .select('id, pengaju_id, status, diajukan_pada')
      .eq('id', payload.id)
      .single();

    if (fetchError || !existingDoc) {
      return { success: false, error: 'Data pengajuan tidak ditemukan.' };
    }

    if (existingDoc.pengaju_id !== user.id) {
      return { success: false, error: 'Anda hanya dapat mengubah pengajuan milik sendiri.' };
    }

    if (!['draf', 'perlu_revisi'].includes(existingDoc.status)) {
      return { success: false, error: 'Pengajuan hanya dapat diubah saat status Draf atau Perlu Revisi.' };
    }

    let nextStatus = existingDoc.status;
    let diajukanPada = existingDoc.diajukan_pada;

    if (isKirim) {
      if (profile.peran === 'akuntan') {
        nextStatus = 'menunggu_direktur';
      } else {
        nextStatus = 'diajukan';
      }
      diajukanPada = new Date().toISOString();
    }

    const { error: updateError } = await adminClient
      .from('pengajuan')
      .update({
        jenis: payload.jenis,
        tanggal_transaksi: payload.tanggal_transaksi,
        akun_beban_id: Number(payload.akun_beban_id),
        jumlah: Number(payload.jumlah),
        keterangan: payload.keterangan.trim(),
        bukti_path: payload.bukti_path,
        status: nextStatus,
        diajukan_pada: diajukanPada,
      })
      .eq('id', payload.id);

    if (updateError) {
      return { success: false, error: `Gagal memperbarui pengajuan: ${updateError.message}` };
    }

    revalidatePath(`/pengajuan/${payload.id}`);
    revalidatePath('/pengajuan');
    revalidatePath('/');

    return { success: true, docId: payload.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kendala sistem tak terduga.';
    return { success: false, error: msg };
  }
}

export async function kirimPengajuanAction(
  id: number
): Promise<{ success: boolean; error?: string }> {
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
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.aktif) {
      return { success: false, error: 'Akun Anda tidak aktif atau tidak ditemukan.' };
    }

    const adminClient = createAdminClient();
    const { data: pengajuan, error: fetchError } = await adminClient
      .from('pengajuan')
      .select('id, pengaju_id, status, bukti_path')
      .eq('id', id)
      .single();

    if (fetchError || !pengajuan) {
      return { success: false, error: 'Data pengajuan tidak ditemukan.' };
    }

    if (pengajuan.pengaju_id !== user.id) {
      return { success: false, error: 'Anda hanya dapat mengirimkan pengajuan milik sendiri.' };
    }

    if (!pengajuan.bukti_path || !pengajuan.bukti_path.trim()) {
      return {
        success: false,
        error: 'Bukti nota wajib diunggah untuk mengirimkan pengajuan.',
      };
    }

    const nextStatus = profile.peran === 'akuntan' ? 'menunggu_direktur' : 'diajukan';
    const now = new Date().toISOString();

    const { error: updateError } = await adminClient
      .from('pengajuan')
      .update({
        status: nextStatus,
        diajukan_pada: now,
      })
      .eq('id', id);

    if (updateError) {
      return { success: false, error: `Gagal mengirimkan pengajuan: ${updateError.message}` };
    }

    revalidatePath(`/pengajuan/${id}`);
    revalidatePath('/pengajuan');
    revalidatePath('/');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kendala sistem.';
    return { success: false, error: msg };
  }
}

