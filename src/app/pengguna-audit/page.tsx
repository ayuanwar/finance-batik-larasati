import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Navbar } from '@/components/Navbar';
import { PenggunaAuditClient, UserProfileItem } from './PenggunaAuditClient';
import { AuditLogItem } from './actions';

export const dynamic = 'force-dynamic';

export default async function PenggunaAuditPage() {
  const supabase = await createClient();

  // 1. Verifikasi Sesi Pengguna
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/masuk');
  }

  // 2. Ambil Profil Pengguna
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.aktif) {
    redirect('/masuk');
  }

  // 3. Hak Akses Eksklusif: Hanya Direktur yang diizinkan!
  // Akuntan & Staf DIBLOKIR TOTAL dan di-redirect ke /
  if (profile.peran !== 'direktur') {
    redirect('/');
  }

  const adminSupabase = createAdminClient();

  // 4. Ambil Daftar Pengguna
  const { data: rawUsers, error: usersErr } = await adminSupabase
    .from('profiles')
    .select('id, nama_lengkap, email, peran, jabatan, aktif, dibuat_pada')
    .order('nama_lengkap', { ascending: true });

  if (usersErr) {
    console.error('Error fetching users for audit module:', usersErr);
  }

  const userList: UserProfileItem[] = (rawUsers || []).map((u) => ({
    id: u.id,
    nama_lengkap: u.nama_lengkap,
    email: u.email,
    peran: u.peran,
    jabatan: u.jabatan,
    aktif: u.aktif,
    dibuat_pada: u.dibuat_pada,
  }));

  // 5. Ambil 200 Audit Log Terbaru
  const { data: rawLogs, error: logsErr } = await adminSupabase
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
    .order('waktu', { ascending: false })
    .limit(200);

  if (logsErr) {
    console.error('Error fetching audit logs:', logsErr);
  }

  const unwrapSingle = <T,>(item: T | T[] | null | undefined): T | null => {
    if (Array.isArray(item)) return (item[0] as T) || null;
    return (item as T) || null;
  };

  const logList: AuditLogItem[] = (rawLogs || []).map((l: any) => ({
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

  return (
    <div className="min-h-screen bg-[#081c15] text-slate-100 flex flex-col font-sans">
      <Navbar profile={profile} />

      {/* Kontainer Terpusat: max-w-[1440px] mx-auto w-full px-4 sm:px-6 lg:px-8 */}
      <main className="flex-1 max-w-[1440px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <PenggunaAuditClient
          initialUsers={userList}
          initialLogs={logList}
          profile={profile}
        />
      </main>
    </div>
  );
}
