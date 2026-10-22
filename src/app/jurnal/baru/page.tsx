import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/Navbar';
import { JurnalFormClient, AkunOption, PeriodeOption } from './JurnalFormClient';

export const dynamic = 'force-dynamic';

export default async function JurnalBaruPage() {
  const supabase = await createClient();

  // 1. Verifikasi Sesi Pengguna
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/masuk');
  }

  // 2. Ambil Profil & Validasi Hak Akses (Hanya Akuntan yang bisa buat jurnal)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.aktif) {
    redirect('/masuk');
  }

  if (profile.peran !== 'akuntan') {
    redirect('/jurnal');
  }

  // Server Action untuk Keluar
  async function handleKeluar() {
    'use server';
    const supabaseServer = await createClient();
    await supabaseServer.auth.signOut();
    redirect('/masuk');
  }

  // 3. Ambil Daftar Seluruh Akun yang Aktif
  const { data: akunData } = await supabase
    .from('akun')
    .select('id, kode, nama, tipe, saldo_normal')
    .eq('aktif', true)
    .order('kode', { ascending: true });

  const akunList: AkunOption[] = (akunData || []).map((ak) => ({
    id: ak.id,
    kode: ak.kode,
    nama: ak.nama,
    tipe: ak.tipe,
    saldo_normal: ak.saldo_normal,
  }));

  // 4. Ambil Daftar Periode Akuntansi
  const { data: periodeData } = await supabase
    .from('periode')
    .select('id, tahun, bulan, status')
    .order('tahun', { ascending: false })
    .order('bulan', { ascending: false });

  const openPeriods: PeriodeOption[] = (periodeData || []).map((p) => ({
    id: p.id,
    tahun: p.tahun,
    bulan: p.bulan,
    status: p.status,
  }));

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col font-sans">
      <Navbar profile={profile} onLogout={handleKeluar} />

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <JurnalFormClient akunList={akunList} openPeriods={openPeriods} />
      </main>
    </div>
  );
}
