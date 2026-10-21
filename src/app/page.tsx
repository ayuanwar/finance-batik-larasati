import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/Navbar';
import { DashboardFinance, KasBankBreakdown, PengajuanItem, PeriodeItem } from '@/components/DashboardFinance';
import { DashboardStaf, StafPengajuanItem } from '@/components/DashboardStaf';
import { Profile } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function BerandaPage() {
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

  // Server Action untuk Keluar (Logout)
  async function handleKeluar() {
    'use server';
    const supabaseServer = await createClient();
    await supabaseServer.auth.signOut();
    redirect('/masuk');
  }

  const isFinance = profile.peran === 'direktur' || profile.peran === 'akuntan';

  // ============================================================================
  // CABANG 1: DASBOR KHUSUS DIREKTUR & AKUNTAN (PRD Bagian 9)
  // ============================================================================
  if (isFinance) {
    // A. Ambil seluruh akun kas & bank yang aktif
    const { data: kasAkunList } = await supabase
      .from('akun')
      .select('id, kode, nama')
      .eq('is_kas_bank', true)
      .eq('aktif', true)
      .order('kode', { ascending: true });

    // B. Hitung saldo per akun kas/bank dari mutasi jurnal yang sudah diposting
    const kasBankBreakdown: KasBankBreakdown[] = [];
    let totalKasBank = 0;

    if (kasAkunList && kasAkunList.length > 0) {
      for (const akun of kasAkunList) {
        const { data: lines } = await supabase
          .from('jurnal_baris')
          .select('debit, kredit, jurnal!inner(status)')
          .eq('akun_id', akun.id)
          .eq('jurnal.status', 'diposting');

        let saldo = 0;
        if (lines) {
          for (const l of lines) {
            saldo += Number(l.debit) - Number(l.kredit);
          }
        }
        totalKasBank += saldo;
        kasBankBreakdown.push({
          id: akun.id,
          kode: akun.kode,
          nama: akun.nama,
          saldo: saldo,
        });
      }
    }

    // C. Ambil periode berjalan aktif (Bulan Oktober 2026 / periode_id = 4)
    const { data: periodeAktif } = await supabase
      .from('periode')
      .select('id, tahun, bulan, status')
      .eq('status', 'terbuka')
      .order('tahun', { ascending: false })
      .order('bulan', { ascending: false })
      .limit(1)
      .single();

    const periodeIdAktif = periodeAktif ? periodeAktif.id : 4;
    const namaBulanAktif = periodeAktif
      ? new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
          new Date(periodeAktif.tahun, periodeAktif.bulan - 1, 1)
        )
      : 'Oktober 2026';

    // D. Hitung Pendapatan & Beban Bulan Berjalan
    const { data: linesBulanIni } = await supabase
      .from('jurnal_baris')
      .select('debit, kredit, akun!inner(tipe), jurnal!inner(status, periode_id)')
      .eq('jurnal.status', 'diposting')
      .eq('jurnal.periode_id', periodeIdAktif);

    let pendapatanBulanIni = 0;
    let bebanBulanIni = 0;

    if (linesBulanIni) {
      for (const item of linesBulanIni) {
        const tipe = (item.akun as unknown as { tipe: string }).tipe;
        if (tipe === 'pendapatan') {
          pendapatanBulanIni += Number(item.kredit) - Number(item.debit);
        } else if (tipe === 'beban') {
          bebanBulanIni += Number(item.debit) - Number(item.kredit);
        }
      }
    }
    const labaBulanIni = pendapatanBulanIni - bebanBulanIni;

    // E. Ambil Daftar Pengajuan Menunggu Tindakan
    const { data: rawPengajuanMenunggu } = await supabase
      .from('pengajuan')
      .select(`
        id,
        nomor,
        status,
        jumlah,
        keterangan,
        tanggal_transaksi,
        profiles!pengajuan_pengaju_id_fkey (nama_lengkap)
      `)
      .in('status', ['diajukan', 'menunggu_direktur', 'disetujui'])
      .order('dibuat_pada', { ascending: false });

    // F. Ambil Status Periode Akuntansi
    const { data: rawPeriodeList } = await supabase
      .from('periode')
      .select(`
        id,
        tahun,
        bulan,
        status,
        ditutup_pada,
        profiles:ditutup_oleh (nama_lengkap)
      `)
      .order('tahun', { ascending: true })
      .order('bulan', { ascending: true });

    return (
      <div className="min-h-screen bg-[#081c15] text-slate-100 flex flex-col">
        <Navbar profile={profile} onLogout={handleKeluar} />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <DashboardFinance
            profile={profile}
            totalKasBank={totalKasBank}
            kasBankList={kasBankBreakdown}
            pendapatanBulanIni={pendapatanBulanIni}
            bebanBulanIni={bebanBulanIni}
            labaBulanIni={labaBulanIni}
            namaBulanAktif={namaBulanAktif}
            pengajuanMenunggu={(rawPengajuanMenunggu as unknown as PengajuanItem[]) || []}
            periodeList={(rawPeriodeList as unknown as PeriodeItem[]) || []}
          />
        </main>
        <footer className="bg-[#06150f] border-t border-[#d4af37]/20 py-4 text-center text-xs text-[#d4af37]/75">
          CV Batik Larasati · Sistem Keuangan Internal UMKM Surakarta
        </footer>
      </div>
    );
  }

  // ============================================================================
  // CABANG 2: DASBOR KHUSUS STAF (PRD Bagian 3 & 7)
  // ============================================================================
  const { data: stafPengajuanRaw } = await supabase
    .from('pengajuan')
    .select(`
      id,
      nomor,
      jenis,
      status,
      jumlah,
      keterangan,
      tanggal_transaksi,
      catatan_peninjau,
      bukti_path,
      dibuat_pada
    `)
    .eq('pengaju_id', user.id)
    .order('dibuat_pada', { ascending: false });

  return (
    <div className="min-h-screen bg-[#081c15] text-slate-100 flex flex-col">
      <Navbar profile={profile} onLogout={handleKeluar} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <DashboardStaf
          profile={profile}
          pengajuanList={(stafPengajuanRaw as unknown as StafPengajuanItem[]) || []}
        />
      </main>
      <footer className="bg-[#06150f] border-t border-[#d4af37]/20 py-4 text-center text-xs text-[#d4af37]/75">
        CV Batik Larasati · Sistem Keuangan Internal UMKM Surakarta
      </footer>
    </div>
  );
}
