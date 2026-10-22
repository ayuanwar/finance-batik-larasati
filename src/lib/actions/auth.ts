'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * Server Action terpusat untuk proses keluar (logout) pengguna.
 * Menghapus sesi otentikasi di sisi server dan mengarahkan ke /masuk.
 */
export async function keluarAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/masuk');
}
