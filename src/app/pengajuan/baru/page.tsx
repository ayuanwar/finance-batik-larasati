import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { MainCanvas } from '@/components/MainCanvas';
import { PengajuanFormClient } from './PengajuanFormClient';

export const dynamic = 'force-dynamic';

export default async function BuatPengajuanBaruPage() {
  const supabase = await createClient();

  // 1. Verifikasi Sesi
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/masuk');
  }

  // 2. Ambil Profil
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.aktif) {
    redirect('/masuk');
  }

  // Direktur tidak membuat pengajuan
  if (profile.peran === 'direktur') {
    redirect('/pengajuan');
  }

  // Server Action untuk Keluar
  async function handleKeluar() {
    'use server';
    const supabaseServer = await createClient();
    await supabaseServer.auth.signOut();
    redirect('/masuk');
  }

  // 3. Ambil Daftar Akun Beban yang Aktif
  const { data: akunBebanList } = await supabase
    .from('akun')
    .select('id, kode, nama, tipe, aktif')
    .eq('tipe', 'beban')
    .eq('aktif', true)
    .order('kode', { ascending: true });

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col">
      <Navbar profile={profile} onLogout={handleKeluar} />

      <MainCanvas maxWidth="max-w-4xl">
        <PengajuanFormClient
          profile={profile}
          akunBebanList={akunBebanList || []}
        />
      </MainCanvas>

      <Footer />
    </div>
  );
}
