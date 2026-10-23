import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { JurnalListClient, JurnalRow } from './JurnalListClient';

export const dynamic = 'force-dynamic';

export default async function JurnalPage() {
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

  // 3. Hak Akses (Staf DILARANG mengakses data keuangan rahasia)
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

  // 4. Ambil Seluruh Data Jurnal Beserta Baris Transaksinya
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
        akun:akun_id (id, kode, nama)
      ),
      periode:periode_id (id, tahun, bulan, status),
      pembuat:profiles!dibuat_oleh (id, nama_lengkap)
    `)
    .order('tanggal', { ascending: false })
    .order('id', { ascending: false });

  if (error) {
    console.error('Error fetching jurnal list:', error);
  }

  const unwrapSingle = <T,>(item: T | T[] | null | undefined): T | null => {
    if (Array.isArray(item)) return (item[0] as T) || null;
    return (item as T) || null;
  };

  // Casting data ke tipe antarmuka JurnalRow
  const jurnalList: JurnalRow[] = (rawJurnal || []).map((j: any) => ({
    id: j.id,
    nomor: j.nomor,
    tanggal: j.tanggal,
    keterangan: j.keterangan,
    sumber: j.sumber,
    status: j.status,
    pengajuan_id: j.pengajuan_id,
    jurnal_dibalik_id: j.jurnal_dibalik_id,
    dibuat_oleh: j.dibuat_oleh,
    diposting_oleh: j.diposting_oleh,
    diposting_pada: j.diposting_pada,
    dibuat_pada: j.dibuat_pada,
    jurnal_baris: (j.jurnal_baris || []).map((b: any) => ({
      id: b.id,
      urutan: b.urutan,
      debit: Number(b.debit || 0),
      kredit: Number(b.kredit || 0),
      akun: unwrapSingle(b.akun),
    })),
    periode: unwrapSingle(j.periode),
    pembuat: unwrapSingle(j.pembuat),
  }));

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col font-sans">
      <Navbar profile={profile} onLogout={handleKeluar} />

      <main className="flex-1 max-w-[1100px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <JurnalListClient initialData={jurnalList} profile={profile} />
      </main>

      <Footer />
    </div>
  );
}
