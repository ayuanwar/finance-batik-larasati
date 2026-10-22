'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface UpdateUserPayload {
  userId: string;
  peran: 'staf' | 'akuntan' | 'direktur';
  aktif: boolean;
  jabatan: string;
}

export interface AuditLogItem {
  id: number;
  waktu: string;
  pelaku_id: string | null;
  aksi: string;
  nama_tabel: string;
  id_data: string;
  data_lama: Record<string, unknown> | null;
  data_baru: Record<string, unknown> | null;
  pelaku?: {
    id: string;
    nama_lengkap: string;
    email: string;
    peran: string;
  } | null;
}

export interface AuditLogFilterPayload {
  tanggalMulai?: string;
  tanggalSelesai?: string;
  namaTabel?: string;
  pelakuId?: string;
}

/**
 * Validasi otorisasi: Hanya Direktur yang berhak mengelola pengguna dan audit log
 */
async function verifyDirektur() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, error: 'Sesi Anda telah berakhir. Silakan masuk kembali.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, peran, aktif')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.aktif) {
    return { authorized: false, error: 'Akun Anda tidak aktif atau tidak ditemukan.' };
  }

  if (profile.peran !== 'direktur') {
    return {
      authorized: false,
      error: 'Akses Ditolak: Fitur ini hanya dapat diakses secara eksklusif oleh Direktur.',
    };
  }

  return { authorized: true, user, profile, supabase };
}

/**
 * 1. Server Action: Mengubah Peran, Status Aktif, dan Jabatan Pengguna
 * Hak Akses: Eksklusif Direktur
 */
export async function updateUserAction(
  payload: UpdateUserPayload
): Promise<ActionResponse> {
  try {
    const auth = await verifyDirektur();
    if (!auth.authorized || !auth.user) {
      return { success: false, error: auth.error };
    }

    if (!payload.jabatan || !payload.jabatan.trim()) {
      return { success: false, error: 'Jabatan wajib diisi.' };
    }

    // Perlindungan Diri: Direktur dilarang menonaktifkan atau mengubah perannya sendiri
    if (payload.userId === auth.user.id) {
      if (!payload.aktif || payload.peran !== 'direktur') {
        return {
          success: false,
          error: 'Demi keamanan sistem, Anda tidak dapat menonaktifkan akun atau mencabut peran Direktur dari diri sendiri.',
        };
      }
    }

    const adminSupabase = createAdminClient();

    // Pastikan target pengguna ada
    const { data: targetUser, error: getErr } = await adminSupabase
      .from('profiles')
      .select('id, nama_lengkap, email, peran, jabatan, aktif')
      .eq('id', payload.userId)
      .single();

    if (getErr || !targetUser) {
      return { success: false, error: 'Pengguna yang dimaksud tidak ditemukan.' };
    }

    // Update profil pengguna (peran, aktif, dan jabatan)
    const { error: updateErr } = await adminSupabase
      .from('profiles')
      .update({
        peran: payload.peran,
        aktif: payload.aktif,
        jabatan: payload.jabatan.trim(),
      })
      .eq('id', payload.userId);

    if (updateErr) {
      return { success: false, error: 'Gagal memperbarui profil pengguna: ' + updateErr.message };
    }

    revalidatePath('/pengguna-audit');
    revalidatePath('/');

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
    return { success: false, error: msg };
  }
}

/**
 * 2. Server Action: Mengambil Data Audit Log dengan Filter Lengkap
 * Hak Akses: Eksklusif Direktur
 */
export async function getFilteredAuditLogsAction(
  payload: AuditLogFilterPayload
): Promise<ActionResponse<AuditLogItem[]>> {
  try {
    const auth = await verifyDirektur();
    if (!auth.authorized || !auth.supabase) {
      return { success: false, error: auth.error };
    }

    const adminSupabase = createAdminClient();

    let query = adminSupabase
      .from('audit_log')
      .select(`
        id,
        waktu,
        pelaku_id,
        aksi,
        nama_tabel,
        id_data,
        data_lama,
        data_baru,
        pelaku:profiles!pelaku_id (
          id,
          nama_lengkap,
          email,
          peran
        )
      `)
      .order('waktu', { ascending: false });

    // Filter Rentang Tanggal
    if (payload.tanggalMulai) {
      query = query.gte('waktu', `${payload.tanggalMulai}T00:00:00.000Z`);
    }
    if (payload.tanggalSelesai) {
      query = query.lte('waktu', `${payload.tanggalSelesai}T23:59:59.999Z`);
    }

    // Filter Nama Tabel
    if (payload.namaTabel && payload.namaTabel !== 'semua') {
      query = query.eq('nama_tabel', payload.namaTabel);
    }

    // Filter Pelaku
    if (payload.pelakuId && payload.pelakuId !== 'semua') {
      if (payload.pelakuId === 'sistem') {
        query = query.is('pelaku_id', null);
      } else {
        query = query.eq('pelaku_id', payload.pelakuId);
      }
    }

    // Batasi 200 log terbaru untuk performa
    query = query.limit(200);

    const { data: logs, error: logsErr } = await query;

    if (logsErr) {
      return { success: false, error: 'Gagal mengambil data log audit: ' + logsErr.message };
    }

    const unwrapSingle = <T,>(item: T | T[] | null | undefined): T | null => {
      if (Array.isArray(item)) return (item[0] as T) || null;
      return (item as T) || null;
    };

    const formattedLogs: AuditLogItem[] = (logs || []).map((l: any) => ({
      id: l.id,
      waktu: l.waktu,
      pelaku_id: l.pelaku_id,
      aksi: l.aksi,
      nama_tabel: l.nama_tabel,
      id_data: l.id_data,
      data_lama: l.data_lama,
      data_baru: l.data_baru,
      pelaku: unwrapSingle(l.pelaku),
    }));

    return { success: true, data: formattedLogs };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
    return { success: false, error: msg };
  }
}
