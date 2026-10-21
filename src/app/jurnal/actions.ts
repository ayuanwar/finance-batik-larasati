'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface BarisJurnalInput {
  id?: number;
  urutan: number;
  akun_id: number;
  debit: number;
  kredit: number;
  keterangan?: string;
}

export interface SimpanJurnalPayload {
  id?: number;
  tanggal: string; // YYYY-MM-DD
  keterangan: string; // min 5 chars
  sumber?: 'manual' | 'saldo_awal' | 'pembalik';
  target_status: 'draf' | 'diposting';
  baris: BarisJurnalInput[];
}

export interface ActionResponse<T = Record<string, unknown>> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Server Action untuk membuat atau memperbarui Jurnal Umum (Draf / Posting)
 */
export async function simpanJurnalAction(
  payload: SimpanJurnalPayload
): Promise<ActionResponse<{ jurnalId: number; nomor?: string | null }>> {
  try {
    const supabase = await createClient();

    // 1. Verifikasi Sesi Pengguna
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Sesi Anda telah berakhir. Silakan masuk kembali.' };
    }

    // 2. Ambil Profil & Validasi Hak Akses (Hanya Akuntan yang bisa tulis/edit)
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.aktif) {
      return { success: false, error: 'Akun Anda tidak aktif atau tidak ditemukan.' };
    }

    if (profile.peran !== 'akuntan') {
      return {
        success: false,
        error: 'Hanya peran Akuntan yang memiliki izin untuk membuat atau mengubah jurnal umum.',
      };
    }

    // 3. Validasi Tanggal & Periode Akuntansi (BR-05)
    if (!payload.tanggal) {
      return { success: false, error: 'Tanggal transaksi jurnal wajib diisi.' };
    }

    const tgl = new Date(payload.tanggal);
    if (isNaN(tgl.getTime())) {
      return { success: false, error: 'Format tanggal transaksi tidak valid.' };
    }

    const tahun = tgl.getFullYear();
    const bulan = tgl.getMonth() + 1;

    // Cari periode akuntansi terkait
    const { data: periodeData, error: periodeErr } = await supabase
      .from('periode')
      .select('*')
      .eq('tahun', tahun)
      .eq('bulan', bulan)
      .single();

    if (periodeErr || !periodeData) {
      return {
        success: false,
        error: `Periode akuntansi untuk bulan ${bulan}/${tahun} belum dibuat dalam sistem (BR-05).`,
      };
    }

    if (periodeData.status !== 'terbuka') {
      return {
        success: false,
        error: `Periode akuntansi ${bulan}/${tahun} telah ditutup. Jurnal hanya dapat dibuat pada periode terbuka (BR-05).`,
      };
    }

    // 4. Validasi Keterangan Header
    if (!payload.keterangan || payload.keterangan.trim().length < 5) {
      return {
        success: false,
        error: 'Keterangan jurnal wajib diisi minimal 5 karakter.',
      };
    }

    // 5. Validasi Baris Jurnal (BR-02)
    if (!payload.baris || payload.baris.length < 2) {
      return {
        success: false,
        error: 'Jurnal minimal harus terdiri dari 2 baris transaksi (BR-02).',
      };
    }

    let totalDebit = 0;
    let totalKredit = 0;

    for (let i = 0; i < payload.baris.length; i++) {
      const b = payload.baris[i];
      if (!b.akun_id) {
        return { success: false, error: `Baris ke-${i + 1}: Pilih akun akuntansi yang valid.` };
      }

      const debitVal = Number(b.debit || 0);
      const kreditVal = Number(b.kredit || 0);

      if (debitVal < 0 || kreditVal < 0) {
        return { success: false, error: `Baris ke-${i + 1}: Nilai debit atau kredit tidak boleh negatif.` };
      }

      if ((debitVal > 0 && kreditVal > 0) || (debitVal === 0 && kreditVal === 0)) {
        return {
          success: false,
          error: `Baris ke-${i + 1}: Setiap baris harus diisi salah satu antara Debit saja atau Kredit saja (BR-02).`,
        };
      }

      totalDebit += debitVal;
      totalKredit += kreditVal;
    }

    // 6. Validasi Keseimbangan untuk Status Posting (BR-02)
    const isDiposting = payload.target_status === 'diposting';
    if (isDiposting) {
      if (totalDebit !== totalKredit || totalDebit <= 0) {
        return {
          success: false,
          error: `Jurnal tidak seimbang. Total Debit (Rp${totalDebit.toLocaleString('id-ID')}) harus sama dengan Total Kredit (Rp${totalKredit.toLocaleString('id-ID')}) untuk dapat diposting (BR-02).`,
        };
      }
    }

    const adminSupabase = createAdminClient();

    // 7. Penanganan Update Jurnal Draf yang Sudah Ada
    if (payload.id) {
      // Ambil jurnal lama
      const { data: existingJurnal, error: getErr } = await supabase
        .from('jurnal')
        .select('*')
        .eq('id', payload.id)
        .single();

      if (getErr || !existingJurnal) {
        return { success: false, error: 'Jurnal yang akan diubah tidak ditemukan.' };
      }

      if (existingJurnal.status !== 'draf') {
        return {
          success: false,
          error: `Jurnal berstatus '${existingJurnal.status}' tidak dapat diubah (BR-04).`,
        };
      }

      let nomorJurnal = existingJurnal.nomor;

      // Jika berpindah dari draf ke diposting, generate nomor dokumen gapless (BR-03)
      if (isDiposting && !nomorJurnal) {
        const { data: generatedNo, error: rpcErr } = await adminSupabase.rpc('generate_document_number', {
          p_jenis: 'JU',
          p_date: payload.tanggal,
        });

        if (rpcErr || !generatedNo) {
          return { success: false, error: 'Gagal men-generate nomor jurnal resmi: ' + (rpcErr?.message || '') };
        }
        nomorJurnal = generatedNo;
      }

      // Update Header Jurnal
      const updateData: Record<string, unknown> = {
        tanggal: payload.tanggal,
        periode_id: periodeData.id,
        keterangan: payload.keterangan.trim(),
        sumber: payload.sumber || existingJurnal.sumber || 'manual',
        status: isDiposting ? 'diposting' : 'draf',
      };

      if (isDiposting) {
        updateData.nomor = nomorJurnal;
        updateData.diposting_oleh = user.id;
        updateData.diposting_pada = new Date().toISOString();
      }

      const { error: updateErr } = await adminSupabase
        .from('jurnal')
        .update(updateData)
        .eq('id', payload.id);

      if (updateErr) {
        return { success: false, error: 'Gagal memperbarui jurnal: ' + updateErr.message };
      }

      // Hapus baris lama & masukkan baris baru
      await adminSupabase.from('jurnal_baris').delete().eq('jurnal_id', payload.id);

      const rowsToInsert = payload.baris.map((b, idx) => ({
        jurnal_id: payload.id!,
        urutan: idx + 1,
        akun_id: b.akun_id,
        debit: Number(b.debit || 0),
        kredit: Number(b.kredit || 0),
        keterangan: b.keterangan?.trim() || null,
      }));

      const { error: insertRowsErr } = await adminSupabase
        .from('jurnal_baris')
        .insert(rowsToInsert);

      if (insertRowsErr) {
        return { success: false, error: 'Gagal memperbarui baris jurnal: ' + insertRowsErr.message };
      }

      revalidatePath('/jurnal');
      revalidatePath(`/jurnal/${payload.id}`);
      revalidatePath('/');

      return {
        success: true,
        data: {
          jurnalId: payload.id,
          nomor: nomorJurnal,
        },
      };
    }

    // 8. Penanganan Jurnal Baru
    let nomorJurnal: string | null = null;
    if (isDiposting) {
      const { data: generatedNo, error: rpcErr } = await adminSupabase.rpc('generate_document_number', {
        p_jenis: 'JU',
        p_date: payload.tanggal,
      });

      if (rpcErr || !generatedNo) {
        return { success: false, error: 'Gagal men-generate nomor jurnal resmi: ' + (rpcErr?.message || '') };
      }
      nomorJurnal = generatedNo;
    }

    const insertHeaderData: Record<string, unknown> = {
      tanggal: payload.tanggal,
      periode_id: periodeData.id,
      keterangan: payload.keterangan.trim(),
      sumber: payload.sumber || 'manual',
      status: isDiposting ? 'diposting' : 'draf',
      dibuat_oleh: user.id,
      nomor: nomorJurnal,
    };

    if (isDiposting) {
      insertHeaderData.diposting_oleh = user.id;
      insertHeaderData.diposting_pada = new Date().toISOString();
    }

    const { data: insertedJurnal, error: insertHeaderErr } = await adminSupabase
      .from('jurnal')
      .insert(insertHeaderData)
      .select('id, nomor')
      .single();

    if (insertHeaderErr || !insertedJurnal) {
      return { success: false, error: 'Gagal menyimpan kepala jurnal: ' + (insertHeaderErr?.message || '') };
    }

    // Insert baris-baris jurnal
    const rowsToInsert = payload.baris.map((b, idx) => ({
      jurnal_id: insertedJurnal.id,
      urutan: idx + 1,
      akun_id: b.akun_id,
      debit: Number(b.debit || 0),
      kredit: Number(b.kredit || 0),
      keterangan: b.keterangan?.trim() || null,
    }));

    const { error: insertRowsErr } = await adminSupabase
      .from('jurnal_baris')
      .insert(rowsToInsert);

    if (insertRowsErr) {
      // Hapus header jika gagal menyimpan baris agar tidak meninggalkan orphan record
      await adminSupabase.from('jurnal').delete().eq('id', insertedJurnal.id);
      return { success: false, error: 'Gagal menyimpan rincian baris jurnal: ' + insertRowsErr.message };
    }

    revalidatePath('/jurnal');
    revalidatePath('/');

    return {
      success: true,
      data: {
        jurnalId: insertedJurnal.id,
        nomor: insertedJurnal.nomor,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan sistem yang tidak diharapkan.';
    return { success: false, error: message };
  }
}

/**
 * Server Action untuk menghapus Jurnal Draf (BR-04)
 */
export async function hapusJurnalAction(jurnalId: number): Promise<ActionResponse> {
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

    if (!profile || profile.peran !== 'akuntan') {
      return { success: false, error: 'Hanya peran Akuntan yang dapat menghapus jurnal draf.' };
    }

    const { data: jurnal, error: getErr } = await supabase
      .from('jurnal')
      .select('*')
      .eq('id', jurnalId)
      .single();

    if (getErr || !jurnal) {
      return { success: false, error: 'Jurnal tidak ditemukan.' };
    }

    if (jurnal.status !== 'draf') {
      return {
        success: false,
        error: `Jurnal berstatus '${jurnal.status}' tidak dapat dihapus. Koreksi harus lewat Jurnal Pembalik (BR-04).`,
      };
    }

    const adminSupabase = createAdminClient();
    const { error: delErr } = await adminSupabase.from('jurnal').delete().eq('id', jurnalId);

    if (delErr) {
      return { success: false, error: 'Gagal menghapus jurnal: ' + delErr.message };
    }

    revalidatePath('/jurnal');
    revalidatePath('/');

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menghapus jurnal draf.';
    return { success: false, error: message };
  }
}

export interface BuatJurnalPembalikPayload {
  jurnal_id: number;
  tanggal_pembalik: string;
  alasan?: string;
}

/**
 * Server Action untuk membuat Jurnal Pembalik sesuai aturan PRD BR-04 & BR-05
 */
export async function buatJurnalPembalikAction(
  payload: BuatJurnalPembalikPayload
): Promise<ActionResponse<{ pembalikId: number; nomorPembalik: string }>> {
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

    if (!profile || profile.peran !== 'akuntan') {
      return { success: false, error: 'Hanya peran Akuntan yang dapat membuat jurnal pembalik (BR-04).' };
    }

    // 1. Ambil Jurnal Asal beserta baris-barisnya
    const { data: original, error: getErr } = await supabase
      .from('jurnal')
      .select('*, jurnal_baris(*)')
      .eq('id', payload.jurnal_id)
      .single();

    if (getErr || !original) {
      return { success: false, error: 'Jurnal sumber yang ingin dibalik tidak ditemukan.' };
    }

    // 2. Validasi Kelayakan Jurnal untuk Dibalik (BR-04)
    if (original.status !== 'diposting') {
      return {
        success: false,
        error: `Hanya jurnal berstatus 'diposting' yang dapat dibalik. Status jurnal saat ini: '${original.status}'.`,
      };
    }

    if (original.sumber === 'pembalik') {
      return {
        success: false,
        error: 'Jurnal pembalik tidak dapat dibalik kembali (BR-04).',
      };
    }

    if (original.sumber === 'pengajuan' || original.pengajuan_id !== null) {
      return {
        success: false,
        error: 'Jurnal otomatis dari pembayaran pengajuan tidak dapat dibalik (BR-04).',
      };
    }

    // Cek apakah sudah pernah dibalik sebelumnya (BR-04: satu jurnal hanya bisa dibalik satu kali)
    const { data: existingPembalik } = await supabase
      .from('jurnal')
      .select('id, nomor')
      .eq('jurnal_dibalik_id', original.id)
      .limit(1);

    if (existingPembalik && existingPembalik.length > 0) {
      return {
        success: false,
        error: `Jurnal ini telah dibalik sebelumnya oleh jurnal nomor ${existingPembalik[0].nomor || existingPembalik[0].id} (BR-04).`,
      };
    }

    // 3. Validasi Tanggal Pembalik & Periode Terbuka (BR-05)
    if (!payload.tanggal_pembalik) {
      return { success: false, error: 'Tanggal jurnal pembalik wajib diisi.' };
    }

    const tgl = new Date(payload.tanggal_pembalik);
    if (isNaN(tgl.getTime())) {
      return { success: false, error: 'Format tanggal jurnal pembalik tidak valid.' };
    }

    const tahun = tgl.getFullYear();
    const bulan = tgl.getMonth() + 1;

    const { data: periodeData, error: periodeErr } = await supabase
      .from('periode')
      .select('*')
      .eq('tahun', tahun)
      .eq('bulan', bulan)
      .single();

    if (periodeErr || !periodeData) {
      return {
        success: false,
        error: `Periode akuntansi ${bulan}/${tahun} belum terdaftar di sistem.`,
      };
    }

    if (periodeData.status !== 'terbuka') {
      return {
        success: false,
        error: `Periode akuntansi ${bulan}/${tahun} telah ditutup. Jurnal pembalik hanya dapat diposting pada periode terbuka (BR-04, BR-05).`,
      };
    }

    if (!original.jurnal_baris || original.jurnal_baris.length < 2) {
      return { success: false, error: 'Jurnal asal tidak memiliki baris transaksi yang valid untuk dibalik.' };
    }

    const adminSupabase = createAdminClient();

    // 4. Generate Nomor Dokumen Gapless untuk Jurnal Pembalik (JU-YYYYMM-NNNN)
    const { data: nomorPembalik, error: rpcErr } = await adminSupabase.rpc('generate_document_number', {
      p_jenis: 'JU',
      p_date: payload.tanggal_pembalik,
    });

    if (rpcErr || !nomorPembalik) {
      return { success: false, error: 'Gagal membuat nomor dokumen jurnal pembalik: ' + (rpcErr?.message || '') };
    }

    const alasanText = payload.alasan?.trim() ? ` (Alasan: ${payload.alasan.trim()})` : '';
    const keteranganPembalik = `Pembalik ${original.nomor || 'JU'}: ${original.keterangan}${alasanText}`;

    // 5. Buat Header Jurnal Pembalik (status langsung diposting)
    const { data: pembalikHeader, error: insertPembalikErr } = await adminSupabase
      .from('jurnal')
      .insert({
        nomor: nomorPembalik,
        tanggal: payload.tanggal_pembalik,
        periode_id: periodeData.id,
        keterangan: keteranganPembalik,
        sumber: 'pembalik',
        status: 'diposting',
        jurnal_dibalik_id: original.id,
        dibuat_oleh: user.id,
        diposting_oleh: user.id,
        diposting_pada: new Date().toISOString(),
      })
      .select('id, nomor')
      .single();

    if (insertPembalikErr || !pembalikHeader) {
      return {
        success: false,
        error: 'Gagal membuat kepala jurnal pembalik: ' + (insertPembalikErr?.message || ''),
      };
    }

    // 6. Buat Baris Jurnal dengan Membalikkan Posisi Debit dan Kredit (BR-04)
    const reversedRows = original.jurnal_baris.map((b: { id: number; urutan: number; akun_id: number; debit: number; kredit: number; keterangan: string | null }, idx: number) => ({
      jurnal_id: pembalikHeader.id,
      urutan: idx + 1,
      akun_id: b.akun_id,
      debit: Number(b.kredit || 0), // DITUKAR: kredit lama menjadi debit baru
      kredit: Number(b.debit || 0), // DITUKAR: debit lama menjadi kredit baru
      keterangan: b.keterangan ? `Pembalik: ${b.keterangan}` : `Pembalik ${original.nomor || 'JU'}`,
    }));

    const { error: insertRowsErr } = await adminSupabase
      .from('jurnal_baris')
      .insert(reversedRows);

    if (insertRowsErr) {
      // Rollback header jika baris gagal disimpan
      await adminSupabase.from('jurnal').delete().eq('id', pembalikHeader.id);
      return { success: false, error: 'Gagal menyisipkan baris jurnal pembalik: ' + insertRowsErr.message };
    }

    // 7. Ubah Status Jurnal Asal menjadi 'dibalik' (diizinkan oleh trigger BR-04)
    const { error: updateOriginalErr } = await adminSupabase
      .from('jurnal')
      .update({ status: 'dibalik' })
      .eq('id', original.id);

    if (updateOriginalErr) {
      console.error('Peringatan: Gagal memperbarui status jurnal asal menjadi dibalik:', updateOriginalErr);
    }

    revalidatePath('/jurnal');
    revalidatePath(`/jurnal/${original.id}`);
    revalidatePath(`/jurnal/${pembalikHeader.id}`);
    revalidatePath('/');

    return {
      success: true,
      data: {
        pembalikId: pembalikHeader.id,
        nomorPembalik: pembalikHeader.nomor,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal mengeksekusi pembuatan jurnal pembalik.';
    return { success: false, error: message };
  }
}
