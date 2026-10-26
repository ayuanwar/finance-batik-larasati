import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { MainCanvas } from '@/components/MainCanvas';
import { PengajuanListClient, PengajuanRow } from './PengajuanListClient';

export const dynamic = 'force-dynamic';

export default async function PengajuanPage() {
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

  // Server Action untuk Keluar
  async function handleKeluar() {
    'use server';
    const supabaseServer = await createClient();
    await supabaseServer.auth.signOut();
    redirect('/masuk');
  }

  const isFinance = profile.peran === 'direktur' || profile.peran === 'akuntan';

  // 3. Ambil Data Pengajuan Sesuai Hak Akses
  // Staf hanya melihat miliknya, Manajemen (Akuntan & Direktur) melihat semua
  let query = supabase
    .from('pengajuan')
    .select(`
      id,
      nomor,
      pengaju_id,
      jenis,
      tanggal_transaksi,
      akun_beban_id,
      jumlah,
      keterangan,
      bukti_path,
      status,
      catatan_peninjau,
      diajukan_pada,
      diverifikasi_oleh,
      disetujui_oleh,
      akun_kas_id,
      dibayar_oleh,
      dibayar_pada,
      dibuat_pada,
      pengaju:pengaju_id (nama_lengkap, email, peran),
      akun_beban:akun_beban_id (kode, nama),
      akun_kas:akun_kas_id (kode, nama)
    `)
    .order('dibuat_pada', { ascending: false });

  if (!isFinance) {
    query = query.eq('pengaju_id', user.id);
  }

  const { data: pengajuanList, error } = await query;

  if (error) {
    console.error('Error fetching pengajuan list:', error.message);
  }

  // 4. Ambil Periode untuk Filter Bulan
  const { data: periodeList } = await supabase
    .from('periode')
    .select('id, tahun, bulan, status')
    .order('tahun', { ascending: false })
    .order('bulan', { ascending: false });

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col">
      <Navbar profile={profile} onLogout={handleKeluar} />

      <MainCanvas>
        <PengajuanListClient
          profile={profile}
          initialPengajuan={(pengajuanList as unknown as PengajuanRow[]) || []}
          periodeList={periodeList || []}
        />
      </MainCanvas>

      <Footer />
    </div>
  );
}
