import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/Navbar';
import { PengajuanDetailClient } from './PengajuanDetailClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DetailPengajuanPage({ params }: PageProps) {
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

  // 3. Ambil Detail Pengajuan
  const { data: pengajuan, error } = await supabase
    .from('pengajuan')
    .select(`
      *,
      pengaju:pengaju_id (id, nama_lengkap, email, peran, jabatan),
      akun_beban:akun_beban_id (id, kode, nama, tipe),
      akun_kas:akun_kas_id (id, kode, nama),
      diverifikasi:diverifikasi_oleh (nama_lengkap, peran),
      disetujui:disetujui_oleh (nama_lengkap, peran),
      dibayar:dibayar_oleh (nama_lengkap, peran)
    `)
    .eq('id', docId)
    .single();

  if (error || !pengajuan) {
    notFound();
  }

  // Hak Akses: Staf hanya boleh melihat pengajuan miliknya
  if (profile.peran === 'staf' && pengajuan.pengaju_id !== user.id) {
    redirect('/pengajuan');
  }

  // 4. Generate Signed URL untuk Bukti Nota jika ada
  let signedBuktiUrl: string | null = null;
  if (pengajuan.bukti_path) {
    const { data: signedData } = await supabase.storage
      .from('bukti-pengajuan')
      .createSignedUrl(pengajuan.bukti_path, 3600); // 1 jam

    signedBuktiUrl = signedData?.signedUrl || null;
  }

  // 5. Ambil Akun Kas & Bank Aktif untuk Pembayaran
  const { data: akunKasList } = await supabase
    .from('akun')
    .select('id, kode, nama, tipe, saldo_normal')
    .eq('is_kas_bank', true)
    .eq('aktif', true)
    .order('kode', { ascending: true });

  // 6. Ambil Jurnal Pembayaran Terkait jika status 'dibayar'
  let jurnalPembayaran = null;
  if (pengajuan.status === 'dibayar') {
    const { data: jrn } = await supabase
      .from('jurnal')
      .select('id, nomor, tanggal, status, keterangan')
      .eq('pengajuan_id', docId)
      .maybeSingle();

    jurnalPembayaran = jrn;
  }

  return (
    <div className="min-h-screen bg-[#081c15] text-slate-100 flex flex-col">
      <Navbar profile={profile} onLogout={handleKeluar} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PengajuanDetailClient
          profile={profile}
          pengajuan={pengajuan}
          signedBuktiUrl={signedBuktiUrl}
          akunKasList={akunKasList || []}
          jurnalPembayaran={jurnalPembayaran}
        />
      </main>

      <footer className="bg-[#06150f] border-t border-[#d4af37]/20 py-4 text-center text-xs text-[#d4af37]/75">
        CV Batik Larasati · Sistem Keuangan Internal UMKM Surakarta
      </footer>
    </div>
  );
}
