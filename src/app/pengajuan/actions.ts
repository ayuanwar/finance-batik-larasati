'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  kirimEmailPengajuanRevisi,
  kirimEmailPengajuanDitolak,
  kirimEmailPengajuanDibayar,
  kirimEmailMenungguDirektur,
} from '@/lib/email';

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

// Helper: Ambil seluruh email Direktur yang aktif
async function getActiveDirectorEmails(adminClient: ReturnType<typeof createAdminClient>): Promise<string[]> {
  try {
    const { data: direkturList } = await adminClient
      .from('profiles')
      .select('email')
      .eq('peran', 'direktur')
      .eq('aktif', true);

    return (direkturList || []).map((d) => d.email).filter(Boolean);
  } catch (err) {
    console.error('Gagal mengambil email Direktur:', err);
    return [];
  }
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

      // Notifikasi Email ke Direktur jika status langsung 'menunggu_direktur'
      if (finalStatus === 'menunggu_direktur') {
        const directorEmails = await getActiveDirectorEmails(adminClient);
        if (directorEmails.length > 0) {
          kirimEmailMenungguDirektur({
            directorEmails,
            nomor: newDoc.nomor,
            jenis: payload.jenis,
            jumlah: Number(payload.jumlah),
            keterangan: payload.keterangan.trim(),
            namaPengaju: profile.nama_lengkap,
            docId: newDoc.id,
          }).catch((err) => console.error('Gagal kirim email ke Direktur:', err));
        }
      }

      revalidatePath('/pengajuan');
      revalidatePath('/');
      return { success: true, docId: newDoc.id, nomor: newDoc.nomor };
    }

    // 5. Kasus B: Ubah Pengajuan yang Ada
    const { data: existingDoc, error: fetchError } = await adminClient
      .from('pengajuan')
      .select('id, pengaju_id, status, diajukan_pada, nomor')
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

    // Notifikasi ke Direktur jika berubah status menjadi menunggu_direktur
    if (nextStatus === 'menunggu_direktur') {
      const directorEmails = await getActiveDirectorEmails(adminClient);
      if (directorEmails.length > 0) {
        kirimEmailMenungguDirektur({
          directorEmails,
          nomor: existingDoc.nomor,
          jenis: payload.jenis,
          jumlah: Number(payload.jumlah),
          keterangan: payload.keterangan.trim(),
          namaPengaju: profile.nama_lengkap,
          docId: payload.id,
        }).catch((err) => console.error('Gagal kirim email ke Direktur:', err));
      }
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
      .select('id, pengaju_id, status, bukti_path, nomor, jenis, jumlah, keterangan')
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

    if (nextStatus === 'menunggu_direktur') {
      const directorEmails = await getActiveDirectorEmails(adminClient);
      if (directorEmails.length > 0) {
        kirimEmailMenungguDirektur({
          directorEmails,
          nomor: pengajuan.nomor,
          jenis: pengajuan.jenis,
          jumlah: Number(pengajuan.jumlah),
          keterangan: pengajuan.keterangan,
          namaPengaju: profile.nama_lengkap,
          docId: id,
        }).catch((err) => console.error('Gagal kirim email ke Direktur:', err));
      }
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

// ==============================================================================
// 6. SERVER ACTION: VERIFIKASI OLEH AKUNTAN
// ==============================================================================
export async function verifikasiPengajuanAction(
  id: number
): Promise<{ success: boolean; error?: string; status?: string }> {
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

    if (!profile || !profile.aktif || profile.peran !== 'akuntan') {
      return { success: false, error: 'Hanya Akuntan yang berwenang memverifikasi pengajuan.' };
    }

    const adminClient = createAdminClient();
    const { data: doc, error: fetchError } = await adminClient
      .from('pengajuan')
      .select('id, nomor, jenis, jumlah, keterangan, status, pengaju_id')
      .eq('id', id)
      .single();

    if (fetchError || !doc) {
      return { success: false, error: 'Data pengajuan tidak ditemukan.' };
    }

    const now = new Date().toISOString();
    const isAutoApprove = Number(doc.jumlah) <= 1000000;
    const nextStatus = isAutoApprove ? 'disetujui' : 'menunggu_direktur';

    const updatePayload: Record<string, unknown> = {
      status: nextStatus,
      diverifikasi_oleh: profile.id,
      diverifikasi_pada: now,
    };

    if (isAutoApprove) {
      updatePayload.disetujui_oleh = profile.id;
      updatePayload.disetujui_pada = now;
    }

    const { error: updateError } = await adminClient
      .from('pengajuan')
      .update(updatePayload)
      .eq('id', id);

    if (updateError) {
      return { success: false, error: `Gagal memperbarui status: ${updateError.message}` };
    }

    // Jika diteruskan ke Direktur (nilai > Rp1.000.000), kirim email ke Direktur
    if (nextStatus === 'menunggu_direktur') {
      const directorEmails = await getActiveDirectorEmails(adminClient);
      const { data: pengajuProfile } = await adminClient
        .from('profiles')
        .select('nama_lengkap')
        .eq('id', doc.pengaju_id)
        .single();

      if (directorEmails.length > 0) {
        kirimEmailMenungguDirektur({
          directorEmails,
          nomor: doc.nomor,
          jenis: doc.jenis,
          jumlah: Number(doc.jumlah),
          keterangan: doc.keterangan,
          namaPengaju: pengajuProfile?.nama_lengkap || 'Staf',
          docId: doc.id,
        }).catch((err) => console.error('Gagal kirim email ke Direktur:', err));
      }
    }

    revalidatePath(`/pengajuan/${id}`);
    revalidatePath('/pengajuan');
    revalidatePath('/');
    return { success: true, status: nextStatus };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kendala sistem.';
    return { success: false, error: msg };
  }
}

// ==============================================================================
// 7. SERVER ACTION: PERSETUJUAN OLEH DIREKTUR
// ==============================================================================
export async function setujuiPengajuanDirekturAction(
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

    if (!profile || !profile.aktif || profile.peran !== 'direktur') {
      return { success: false, error: 'Hanya Direktur yang berwenang menyetujui pengajuan ini.' };
    }

    const adminClient = createAdminClient();
    const now = new Date().toISOString();

    const { error: updateError } = await adminClient
      .from('pengajuan')
      .update({
        status: 'disetujui',
        disetujui_oleh: profile.id,
        disetujui_pada: now,
      })
      .eq('id', id);

    if (updateError) {
      return { success: false, error: `Gagal menyetujui pengajuan: ${updateError.message}` };
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

// ==============================================================================
// 8. SERVER ACTION: MINTA REVISI ATAU TOLAK PENGAJUAN (DENGAN EMAIL KE PENGAJU)
// ==============================================================================
export async function revisiAtauTolakPengajuanAction(
  id: number,
  mode: 'revisi' | 'tolak',
  catatan: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const catatanTrim = catatan.trim();
    if (catatanTrim.length < 10) {
      return { success: false, error: 'Catatan peninjau wajib diisi minimal 10 karakter.' };
    }

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

    if (!profile || !profile.aktif || (profile.peran !== 'akuntan' && profile.peran !== 'direktur')) {
      return { success: false, error: 'Anda tidak memiliki hak akses untuk meninjau pengajuan ini.' };
    }

    const adminClient = createAdminClient();
    const { data: doc, error: fetchError } = await adminClient
      .from('pengajuan')
      .select('id, nomor, jenis, jumlah, keterangan, status, pengaju_id')
      .eq('id', id)
      .single();

    if (fetchError || !doc) {
      return { success: false, error: 'Data pengajuan tidak ditemukan.' };
    }

    const nextStatus = mode === 'revisi' ? 'perlu_revisi' : 'ditolak';
    const now = new Date().toISOString();

    const updatePayload: Record<string, unknown> = {
      status: nextStatus,
      catatan_peninjau: catatanTrim,
    };

    if (profile.peran === 'akuntan') {
      updatePayload.diverifikasi_oleh = profile.id;
      updatePayload.diverifikasi_pada = now;
    } else if (profile.peran === 'direktur') {
      updatePayload.disetujui_oleh = profile.id;
      updatePayload.disetujui_pada = now;
    }

    const { error: updateError } = await adminClient
      .from('pengajuan')
      .update(updatePayload)
      .eq('id', id);

    if (updateError) {
      return { success: false, error: `Gagal memperbarui status: ${updateError.message}` };
    }

    // Ambil data kontak Pengaju untuk pengiriman email
    const { data: pengajuProfile } = await adminClient
      .from('profiles')
      .select('email, nama_lengkap')
      .eq('id', doc.pengaju_id)
      .single();

    if (pengajuProfile?.email) {
      if (mode === 'revisi') {
        kirimEmailPengajuanRevisi({
          toEmail: pengajuProfile.email,
          namaPengaju: pengajuProfile.nama_lengkap,
          nomor: doc.nomor,
          jenis: doc.jenis,
          jumlah: Number(doc.jumlah),
          keterangan: doc.keterangan,
          catatanPeninjau: catatanTrim,
          peninjauNama: profile.nama_lengkap,
          peninjauPeran: profile.peran,
          docId: doc.id,
        }).catch((err) => console.error('Gagal kirim email revisi ke pengaju:', err));
      } else {
        kirimEmailPengajuanDitolak({
          toEmail: pengajuProfile.email,
          namaPengaju: pengajuProfile.nama_lengkap,
          nomor: doc.nomor,
          jenis: doc.jenis,
          jumlah: Number(doc.jumlah),
          keterangan: doc.keterangan,
          catatanPeninjau: catatanTrim,
          peninjauNama: profile.nama_lengkap,
          peninjauPeran: profile.peran,
          docId: doc.id,
        }).catch((err) => console.error('Gagal kirim email tolak ke pengaju:', err));
      }
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

// ==============================================================================
// 9. SERVER ACTION: EKSEKUSI PEMBAYARAN PENGAJUAN (DENGAN EMAIL KE PENGAJU)
// ==============================================================================
export async function bayarPengajuanAction(
  id: number,
  akunKasId: number,
  tanggalBayar: string
): Promise<{ success: boolean; error?: string; result?: { jurnal_id: number; nomor_jurnal: string } }> {
  try {
    if (!akunKasId) {
      return { success: false, error: 'Silakan pilih akun kas atau bank sumber pembayaran.' };
    }
    if (!tanggalBayar) {
      return { success: false, error: 'Tanggal pembayaran wajib diisi.' };
    }

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

    if (!profile || !profile.aktif || profile.peran !== 'akuntan') {
      return { success: false, error: 'Hanya Akuntan yang berwenang mengeksekusi pencairan pembayaran.' };
    }

    // Panggil RPC execute_pembayaran_pengajuan
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'execute_pembayaran_pengajuan',
      {
        p_pengajuan_id: id,
        p_akun_kas_id: Number(akunKasId),
        p_tanggal_bayar: tanggalBayar,
      }
    );

    if (rpcError) {
      return { success: false, error: rpcError.message };
    }

    const adminClient = createAdminClient();

    // Ambil data pengajuan & pengaju untuk kirim email
    const { data: doc } = await adminClient
      .from('pengajuan')
      .select('id, nomor, jenis, jumlah, keterangan, pengaju_id')
      .eq('id', id)
      .single();

    const { data: akunKas } = await adminClient
      .from('akun')
      .select('nama')
      .eq('id', Number(akunKasId))
      .single();

    if (doc) {
      const { data: pengajuProfile } = await adminClient
        .from('profiles')
        .select('email, nama_lengkap')
        .eq('id', doc.pengaju_id)
        .single();

      if (pengajuProfile?.email) {
        kirimEmailPengajuanDibayar({
          toEmail: pengajuProfile.email,
          namaPengaju: pengajuProfile.nama_lengkap,
          nomor: doc.nomor,
          jenis: doc.jenis,
          jumlah: Number(doc.jumlah),
          keterangan: doc.keterangan,
          namaAkunKas: akunKas?.nama || 'Kas/Bank Operasional',
          tanggalBayar,
          nomorJurnal: rpcResult?.nomor_jurnal,
          docId: id,
        }).catch((err) => console.error('Gagal kirim email pembayaran ke pengaju:', err));
      }
    }

    revalidatePath(`/pengajuan/${id}`);
    revalidatePath('/pengajuan');
    revalidatePath('/jurnal');
    revalidatePath('/buku-besar');
    revalidatePath('/');

    return {
      success: true,
      result: {
        jurnal_id: rpcResult?.jurnal_id,
        nomor_jurnal: rpcResult?.nomor_jurnal,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal memproses pembayaran.';
    return { success: false, error: msg };
  }
}
