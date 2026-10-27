'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { PeranPengguna } from '@/types/database';

export interface RegisterProfilePayload {
  userId: string;
  namaLengkap: string;
  email: string;
  peran: PeranPengguna;
}

export interface RegisterProfileResponse {
  success: boolean;
  error?: string;
}

/**
 * Server Action pembantu untuk memastikan data akun baru masuk ke tabel profiles
 * dengan hak akses admin (service role), menjaga konsistensi data dari pembatasan RLS.
 */
export async function syncUserProfileBaruAction(
  payload: RegisterProfilePayload
): Promise<RegisterProfileResponse> {
  try {
    const adminSupabase = createAdminClient();

    const jabatanDefault = {
      direktur: 'Direktur Utama',
      akuntan: 'Staf Akuntansi & Keuangan',
      staf: 'Staf Operasional',
    }[payload.peran];

    const { error } = await adminSupabase.from('profiles').upsert(
      {
        id: payload.userId,
        nama_lengkap: payload.namaLengkap.trim(),
        email: payload.email.trim().toLowerCase(),
        peran: payload.peran,
        jabatan: jabatanDefault,
        aktif: true,
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.error('[syncUserProfileBaruAction] Gagal menyimpan profil:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kegagalan server.';
    console.error('[syncUserProfileBaruAction] Error tak terduga:', err);
    return { success: false, error: message };
  }
}
