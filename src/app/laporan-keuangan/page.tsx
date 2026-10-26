import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { MainCanvas } from '@/components/MainCanvas';
import { LaporanKeuanganClient } from './LaporanKeuanganClient';
import {
  getLabaRugiAction,
  getNeracaAction,
  getNeracaSaldoAction,
  LabaRugiData,
  NeracaData,
  NeracaSaldoData,
} from './actions';

export const dynamic = 'force-dynamic';

export default async function LaporanKeuanganPage() {
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

  // 3. Keamanan: Data keuangan rahasia, Staf DILARANG mengakses -> dialihkan ke Dasbor
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

  // 4. Default Periode & Tanggal
  const defaultTanggalMulai = '2026-10-01';
  const defaultTanggalSelesai = '2026-10-31';
  const defaultPerTanggal = '2026-10-31';

  // 5. Muat Data Awal Ketiga Laporan Secara Paralel
  const [labaRugiRes, neracaRes, neracaSaldoRes] = await Promise.all([
    getLabaRugiAction({
      tanggal_mulai: defaultTanggalMulai,
      tanggal_selesai: defaultTanggalSelesai,
    }),
    getNeracaAction({
      per_tanggal: defaultPerTanggal,
    }),
    getNeracaSaldoAction({
      per_tanggal: defaultPerTanggal,
    }),
  ]);

  const initialLabaRugi: LabaRugiData =
    labaRugiRes.success && labaRugiRes.data
      ? labaRugiRes.data
      : {
          tanggal_mulai: defaultTanggalMulai,
          tanggal_selesai: defaultTanggalSelesai,
          pendapatan: [],
          total_pendapatan: 0,
          beban: [],
          total_beban: 0,
          laba_bersih: 0,
        };

  const initialNeraca: NeracaData =
    neracaRes.success && neracaRes.data
      ? neracaRes.data
      : {
          per_tanggal: defaultPerTanggal,
          aset: [],
          total_aset: 0,
          kewajiban: [],
          total_kewajiban: 0,
          ekuitas: [],
          subtotal_ekuitas: 0,
          laba_berjalan: 0,
          total_ekuitas: 0,
          total_pasiva: 0,
          is_balanced: true,
          selisih: 0,
        };

  const initialNeracaSaldo: NeracaSaldoData =
    neracaSaldoRes.success && neracaSaldoRes.data
      ? neracaSaldoRes.data
      : {
          per_tanggal: defaultPerTanggal,
          items: [],
          total_debit: 0,
          total_kredit: 0,
          is_balanced: true,
          selisih: 0,
        };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col font-sans print:bg-white print:text-black">
      <div className="print:hidden">
        <Navbar profile={profile} onLogout={handleKeluar} />
      </div>

      <MainCanvas
        className="print:bg-white print:border-none print:shadow-none print:p-0 print:m-0"
        wrapperClassName="print:max-w-none print:px-0 print:py-0"
      >
        <LaporanKeuanganClient
          initialLabaRugi={initialLabaRugi}
          initialNeraca={initialNeraca}
          initialNeracaSaldo={initialNeracaSaldo}
          profile={profile}
        />
      </MainCanvas>

      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}
