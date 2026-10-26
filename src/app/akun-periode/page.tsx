import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { MainCanvas } from '@/components/MainCanvas';
import { keluarAction } from '@/lib/actions/auth';
import { AkunPeriodeClient, AkunItem, PeriodeItem } from './AkunPeriodeClient';

export const dynamic = 'force-dynamic';

export default async function AkunPeriodePage() {
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

  // 3. Hak Akses: Staf DIBLOKIR TOTAL dan dialihkan ke Dasbor
  if (profile.peran === 'staf') {
    redirect('/');
  }

  // 4. Ambil Seluruh Data Akun (Bagan Akun)
  const { data: rawAkun, error: akunErr } = await supabase
    .from('akun')
    .select('id, kode, nama, tipe, saldo_normal, is_kas_bank, aktif, keterangan')
    .order('kode', { ascending: true });

  if (akunErr) {
    console.error('Error fetching akun list:', akunErr);
  }

  const akunList: AkunItem[] = (rawAkun || []).map((ak) => ({
    id: ak.id,
    kode: ak.kode,
    nama: ak.nama,
    tipe: ak.tipe,
    saldo_normal: ak.saldo_normal,
    is_kas_bank: ak.is_kas_bank,
    aktif: ak.aktif,
    keterangan: ak.keterangan,
  }));

  // 5. Ambil Seluruh Data Periode Akuntansi
  const { data: rawPeriode, error: periodeErr } = await supabase
    .from('periode')
    .select(`
      id,
      tahun,
      bulan,
      tanggal_mulai,
      status,
      ditutup_oleh,
      ditutup_pada,
      alasan_buka_ulang,
      penutup:profiles!ditutup_oleh (
        id,
        nama_lengkap
      )
    `)
    .order('tahun', { ascending: false })
    .order('bulan', { ascending: false });

  if (periodeErr) {
    console.error('Error fetching periode list:', periodeErr);
  }

  const unwrapSingle = <T,>(item: T | T[] | null | undefined): T | null => {
    if (Array.isArray(item)) return (item[0] as T) || null;
    return (item as T) || null;
  };

  const periodeList: PeriodeItem[] = (rawPeriode || []).map((p: any) => ({
    id: p.id,
    tahun: p.tahun,
    bulan: p.bulan,
    tanggal_mulai: p.tanggal_mulai,
    status: p.status,
    ditutup_oleh: p.ditutup_oleh,
    ditutup_pada: p.ditutup_pada,
    alasan_buka_ulang: p.alasan_buka_ulang,
    penutup: unwrapSingle(p.penutup),
  }));

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col font-sans">
      <Navbar profile={profile} onLogout={keluarAction} />

      <MainCanvas>
        <AkunPeriodeClient
          initialAkun={akunList}
          initialPeriode={periodeList}
          profile={profile}
        />
      </MainCanvas>

      <Footer />
    </div>
  );
}
