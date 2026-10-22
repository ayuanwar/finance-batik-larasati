import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/Navbar';
import { JurnalDetailClient, DetailJurnalData } from './JurnalDetailClient';

export const dynamic = 'force-dynamic';

interface JurnalDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function JurnalDetailPage({ params }: JurnalDetailPageProps) {
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

  // 2. Ambil Profil & Validasi Hak Akses (Staf dilarang mengakses modul jurnal)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.aktif) {
    redirect('/masuk');
  }

  if (profile.peran === 'staf') {
    redirect('/');
  }

  // Server Action untuk Keluar
  async function handleKeluar() {
    'use server';
    const supabaseServer = await createClient();
    await supabaseServer.auth.signOut();
    redirect('/masuk');
  }

  // 3. Ambil Detail Jurnal Beserta Seluruh Relasinya
  const { data: rawJurnal, error } = await supabase
    .from('jurnal')
    .select(`
      id,
      nomor,
      tanggal,
      keterangan,
      sumber,
      status,
      pengajuan_id,
      jurnal_dibalik_id,
      dibuat_oleh,
      diposting_oleh,
      diposting_pada,
      dibuat_pada,
      jurnal_baris (
        id,
        urutan,
        akun_id,
        debit,
        kredit,
        keterangan,
        akun:akun_id (id, kode, nama, tipe)
      ),
      periode:periode_id (id, tahun, bulan, status),
      pembuat:profiles!dibuat_oleh (id, nama_lengkap, email, peran),
      pemosting:profiles!diposting_oleh (id, nama_lengkap, email, peran),
      pengajuan:pengajuan_id (id, nomor, keterangan, jumlah)
    `)
    .eq('id', jurnalId)
    .single();

  if (error || !rawJurnal) {
    notFound();
  }

  // 4. Jika Jurnal ini merupakan Jurnal Pembalik, ambil data Jurnal Asal
  let jurnalAsal = null;
  if (rawJurnal.jurnal_dibalik_id) {
    const { data: asal } = await supabase
      .from('jurnal')
      .select('id, nomor, keterangan, tanggal')
      .eq('id', rawJurnal.jurnal_dibalik_id)
      .single();
    jurnalAsal = asal || null;
  }

  // 5. Jika Jurnal ini telah dibalik oleh jurnal lain, cari Jurnal Pembaliknya
  let pembalikTerkait = null;
  const { data: pembalikRows } = await supabase
    .from('jurnal')
    .select('id, nomor, keterangan, tanggal')
    .eq('jurnal_dibalik_id', rawJurnal.id)
    .limit(1);

  if (pembalikRows && pembalikRows.length > 0) {
    pembalikTerkait = pembalikRows[0];
  }

  // 6. Ambil Periode Akuntansi yang Terbuka
  const { data: openPeriodsData } = await supabase
    .from('periode')
    .select('id, tahun, bulan, status')
    .order('tahun', { ascending: false })
    .order('bulan', { ascending: false });

  const unwrapSingle = <T,>(item: T | T[] | null | undefined): T | null => {
    if (Array.isArray(item)) return (item[0] as T) || null;
    return (item as T) || null;
  };

  // Urutkan baris jurnal berdasarkan urutan / id
  const sortedBaris: any[] = (rawJurnal.jurnal_baris || [])
    .sort((a: any, b: any) => (a.urutan || 0) - (b.urutan || 0))
    .map((b: any) => ({
      id: b.id,
      urutan: b.urutan,
      akun_id: b.akun_id,
      debit: Number(b.debit || 0),
      kredit: Number(b.kredit || 0),
      keterangan: b.keterangan || null,
      akun: unwrapSingle(b.akun),
    }));

  const formattedJurnal: DetailJurnalData = {
    id: rawJurnal.id,
    nomor: rawJurnal.nomor,
    tanggal: rawJurnal.tanggal,
    keterangan: rawJurnal.keterangan,
    sumber: rawJurnal.sumber,
    status: rawJurnal.status,
    pengajuan_id: rawJurnal.pengajuan_id,
    jurnal_dibalik_id: rawJurnal.jurnal_dibalik_id,
    dibuat_oleh: rawJurnal.dibuat_oleh,
    diposting_oleh: rawJurnal.diposting_oleh,
    diposting_pada: rawJurnal.diposting_pada,
    dibuat_pada: rawJurnal.dibuat_pada,
    jurnal_baris: sortedBaris,
    periode: unwrapSingle(rawJurnal.periode),
    pembuat: unwrapSingle(rawJurnal.pembuat),
    pemosting: unwrapSingle(rawJurnal.pemosting),
    pengajuan: unwrapSingle(rawJurnal.pengajuan),
    jurnal_asal: jurnalAsal,
    pembalik_terkait: pembalikTerkait,
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col font-sans">
      <Navbar profile={profile} onLogout={handleKeluar} />

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <JurnalDetailClient
          jurnal={formattedJurnal}
          profile={profile}
          openPeriods={openPeriodsData || []}
        />
      </main>
    </div>
  );
}
