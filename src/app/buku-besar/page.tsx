import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { MainCanvas } from '@/components/MainCanvas';
import { BukuBesarClient, AkunOptionItem } from './BukuBesarClient';
import { getBukuBesarDataAction, BukuBesarResponseData } from './actions';

export const dynamic = 'force-dynamic';

interface BukuBesarPageProps {
  searchParams: Promise<{
    akun_id?: string;
    dari?: string;
    sampai?: string;
  }>;
}

export default async function BukuBesarPage({ searchParams }: BukuBesarPageProps) {
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

  // 4. Ambil Seluruh Daftar Akun yang Aktif (Urut Kode Akun)
  const { data: akunData, error: akunErr } = await supabase
    .from('akun')
    .select('id, kode, nama, tipe, saldo_normal, is_kas_bank')
    .eq('aktif', true)
    .order('kode', { ascending: true });

  if (akunErr || !akunData || akunData.length === 0) {
    return (
      <div className="min-h-screen bg-transparent text-slate-100 flex flex-col font-sans">
        <Navbar profile={profile} onLogout={handleKeluar} />
        <main className="flex-1 max-w-[1100px] mx-auto w-full px-4 sm:px-6 py-8 sm:py-10">
          <div className="p-6 rounded-2xl bg-[#071c15] border border-[#d4af37]/30 text-center text-slate-300">
            Daftar akun belum tersedia. Silakan hubungi administrator.
          </div>
        </main>
      </div>
    );
  }

  const akunList: AkunOptionItem[] = akunData.map((ak) => ({
    id: ak.id,
    kode: ak.kode,
    nama: ak.nama,
    tipe: ak.tipe,
    saldo_normal: ak.saldo_normal,
    is_kas_bank: ak.is_kas_bank,
  }));

  // 5. Tentukan Akun & Rentang Tanggal Default
  const resolvedParams = await searchParams;
  const initialAkunId = resolvedParams.akun_id
    ? Number(resolvedParams.akun_id)
    : akunList[0].id;
  const initialDari = resolvedParams.dari ?? '2026-10-01';
  const initialSampai = resolvedParams.sampai ?? '2026-10-31';

  // 6. Ambil Data Buku Besar Awal
  const ledgerResult = await getBukuBesarDataAction({
    akun_id: initialAkunId,
    tanggal_mulai: initialDari,
    tanggal_selesai: initialSampai,
  });

  // Fallback data jika terjadi error
  const fallbackAkun = akunList.find((a) => a.id === initialAkunId) || akunList[0];
  const initialData: BukuBesarResponseData =
    ledgerResult.success && ledgerResult.data
      ? ledgerResult.data
      : {
          akun: {
            id: fallbackAkun.id,
            kode: fallbackAkun.kode,
            nama: fallbackAkun.nama,
            tipe: fallbackAkun.tipe,
            saldo_normal: fallbackAkun.saldo_normal,
            is_kas_bank: fallbackAkun.is_kas_bank,
            keterangan: null,
          },
          tanggal_mulai: initialDari,
          tanggal_selesai: initialSampai,
          saldo_awal: 0,
          mutasi: [],
          total_debit: 0,
          total_kredit: 0,
          saldo_akhir: 0,
        };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col font-sans">
      <Navbar profile={profile} onLogout={handleKeluar} />

      <MainCanvas>
        <BukuBesarClient
          initialData={initialData}
          akunList={akunList}
          profile={profile}
        />
      </MainCanvas>

      <Footer />
    </div>
  );
}
