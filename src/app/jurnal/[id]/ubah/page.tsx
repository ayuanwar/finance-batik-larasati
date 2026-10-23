import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/Navbar';
import { JurnalFormClient, AkunOption, PeriodeOption, BarisFormItem } from '../../baru/JurnalFormClient';

export const dynamic = 'force-dynamic';

interface JurnalUbahPageProps {
  params: Promise<{ id: string }>;
}

export default async function JurnalUbahPage({ params }: JurnalUbahPageProps) {
  const { id } = await params;
  const jurnalId = parseInt(id, 10);

  if (isNaN(jurnalId)) {
    notFound();
  }

  const supabase = await createClient();

  // 1. Verifikasi Sesi Pengguna
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/masuk');
  }

  // 2. Ambil Profil & Validasi Hak Akses (Hanya Akuntan yang bisa ubah draf)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.aktif) {
    redirect('/masuk');
  }

  if (profile.peran !== 'akuntan') {
    redirect(`/jurnal/${jurnalId}`);
  }

  // Server Action untuk Keluar
  async function handleKeluar() {
    'use server';
    const supabaseServer = await createClient();
    await supabaseServer.auth.signOut();
    redirect('/masuk');
  }

  // 3. Ambil Data Jurnal Draf
  const { data: rawJurnal, error } = await supabase
    .from('jurnal')
    .select('*, jurnal_baris(*)')
    .eq('id', jurnalId)
    .single();

  if (error || !rawJurnal) {
    notFound();
  }

  // Hanya jurnal draf yang boleh diubah
  if (rawJurnal.status !== 'draf') {
    redirect(`/jurnal/${jurnalId}`);
  }

  // 4. Ambil Daftar Akun Aktif
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

  // 5. Ambil Daftar Periode Akuntansi
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

  const sortedBaris: BarisFormItem[] = (rawJurnal.jurnal_baris || [])
    .sort((a: any, b: any) => (a.urutan || 0) - (b.urutan || 0))
    .map((b: any) => ({
      id: b.id,
      akun_id: b.akun_id,
      debit: Number(b.debit || 0),
      kredit: Number(b.kredit || 0),
      keterangan: b.keterangan || '',
    }));

  const initialJurnal = {
    id: rawJurnal.id,
    tanggal: rawJurnal.tanggal,
    keterangan: rawJurnal.keterangan,
    sumber: rawJurnal.sumber,
    status: rawJurnal.status,
    baris: sortedBaris,
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col font-sans">
      <Navbar profile={profile} onLogout={handleKeluar} />

      <main className="flex-1 max-w-[1100px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <JurnalFormClient
          initialJurnal={initialJurnal}
          akunList={akunList}
          openPeriods={openPeriods}
          isEdit={true}
        />
      </main>
    </div>
  );
}
