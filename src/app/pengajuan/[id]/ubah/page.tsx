import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/Navbar';
import { PengajuanEditFormClient } from './PengajuanEditFormClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UbahPengajuanPage({ params }: PageProps) {
  const { id } = await params;
  const docId = Number(id);

  if (isNaN(docId)) {
    notFound();
  }

  const supabase = await createClient();

  // 1. Verifikasi Sesi
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

  // Server Action untuk Keluar
  async function handleKeluar() {
    'use server';
    const supabaseServer = await createClient();
    await supabaseServer.auth.signOut();
    redirect('/masuk');
  }

  // 3. Ambil Detail Pengajuan yang akan diubah
  const { data: pengajuan, error } = await supabase
    .from('pengajuan')
    .select(`
      *,
      akun_beban:akun_beban_id (id, kode, nama, tipe)
    `)
    .eq('id', docId)
    .single();

  if (error || !pengajuan) {
    notFound();
  }

  // Validasi Hak Akses & Status:
  // Hanya pemilik pengajuan yang boleh mengubah dan hanya saat status 'draf' atau 'perlu_revisi'
  const isOwner = pengajuan.pengaju_id === user.id;
  const isEditable = ['draf', 'perlu_revisi'].includes(pengajuan.status);

  if (!isOwner || !isEditable) {
    redirect(`/pengajuan/${docId}`);
  }

  // 4. Generate Signed URL untuk Bukti Nota yang sudah ada jika ada
  let signedBuktiUrl: string | null = null;
  if (pengajuan.bukti_path) {
    const { data: signedData } = await supabase.storage
      .from('bukti-pengajuan')
      .createSignedUrl(pengajuan.bukti_path, 3600);

    signedBuktiUrl = signedData?.signedUrl || null;
  }

  // 5. Ambil Daftar Akun Beban yang Aktif
  const { data: akunBebanList } = await supabase
    .from('akun')
    .select('id, kode, nama, tipe, aktif')
    .eq('tipe', 'beban')
    .eq('aktif', true)
    .order('kode', { ascending: true });

  return (
    <div className="min-h-screen bg-[#081c15] text-slate-100 flex flex-col">
      <Navbar profile={profile} onLogout={handleKeluar} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PengajuanEditFormClient
          profile={profile}
          pengajuan={pengajuan}
          signedBuktiUrl={signedBuktiUrl}
          akunBebanList={akunBebanList || []}
        />
      </main>

      <footer className="bg-[#06150f] border-t border-[#d4af37]/20 py-4 text-center text-xs text-[#d4af37]/75">
        CV Batik Larasati · Sistem Keuangan Internal UMKM Surakarta
      </footer>
    </div>
  );
}
