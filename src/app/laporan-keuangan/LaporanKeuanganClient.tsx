'use client';

import { useState, useTransition } from 'react';
import {
  TrendingUp,
  Scale,
  BookOpen,
  Printer,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import { formatRupiah, formatTanggalIndo, formatTeksPuebi } from '@/lib/utils';
import {
  LabaRugiData,
  NeracaData,
  NeracaSaldoData,
  getLabaRugiAction,
  getNeracaAction,
  getNeracaSaldoAction,
} from './actions';

interface LaporanKeuanganClientProps {
  initialLabaRugi: LabaRugiData;
  initialNeraca: NeracaData;
  initialNeracaSaldo: NeracaSaldoData;
  profile: {
    id: string;
    nama_lengkap: string;
    peran: string;
  };
}

type TabType = 'laba-rugi' | 'neraca' | 'neraca-saldo';

export function LaporanKeuanganClient({
  initialLabaRugi,
  initialNeraca,
  initialNeracaSaldo,
  profile,
}: LaporanKeuanganClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>('laba-rugi');
  const [isPending, startTransition] = useTransition();

  // State Laba Rugi
  const [labaRugiData, setLabaRugiData] = useState<LabaRugiData>(initialLabaRugi);
  const [lrTanggalMulai, setLrTanggalMulai] = useState<string>(initialLabaRugi.tanggal_mulai);
  const [lrTanggalSelesai, setLrTanggalSelesai] = useState<string>(initialLabaRugi.tanggal_selesai);

  // State Neraca
  const [neracaData, setNeracaData] = useState<NeracaData>(initialNeraca);
  const [neracaPerTanggal, setNeracaPerTanggal] = useState<string>(initialNeraca.per_tanggal);

  // State Neraca Saldo
  const [neracaSaldoData, setNeracaSaldoData] = useState<NeracaSaldoData>(initialNeracaSaldo);
  const [nsPerTanggal, setNsPerTanggal] = useState<string>(initialNeracaSaldo.per_tanggal);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Helper format saldo dalam kurung bila negatif (standar akuntansi)
  const formatAngkaAkuntansi = (val: number) => {
    if (val < 0) {
      return `(${formatRupiah(Math.abs(val))})`;
    }
    return formatRupiah(val);
  };

  // Muat Laba Rugi
  const handleFetchLabaRugi = (mulai: string, selesai: string) => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await getLabaRugiAction({
        tanggal_mulai: mulai,
        tanggal_selesai: selesai,
      });
      if (res.success && res.data) {
        setLabaRugiData(res.data);
      } else {
        setErrorMessage(res.error || 'Gagal memuat Laporan Laba Rugi.');
      }
    });
  };

  // Muat Neraca
  const handleFetchNeraca = (tgl: string) => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await getNeracaAction({ per_tanggal: tgl });
      if (res.success && res.data) {
        setNeracaData(res.data);
      } else {
        setErrorMessage(res.error || 'Gagal memuat Laporan Neraca.');
      }
    });
  };

  // Muat Neraca Saldo
  const handleFetchNeracaSaldo = (tgl: string) => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await getNeracaSaldoAction({ per_tanggal: tgl });
      if (res.success && res.data) {
        setNeracaSaldoData(res.data);
      } else {
        setErrorMessage(res.error || 'Gagal memuat Neraca Saldo.');
      }
    });
  };

  // Preset Laba Rugi
  const applyLrPreset = (preset: 'bulan_ini' | 'bulan_lalu' | 'tahun_ini') => {
    let m = '';
    let s = '';
    if (preset === 'bulan_ini') {
      m = '2026-10-01';
      s = '2026-10-31';
    } else if (preset === 'bulan_lalu') {
      m = '2026-09-01';
      s = '2026-09-30';
    } else if (preset === 'tahun_ini') {
      m = '2026-01-01';
      s = '2026-12-31';
    }
    setLrTanggalMulai(m);
    setLrTanggalSelesai(s);
    handleFetchLabaRugi(m, s);
  };

  // Preset Neraca
  const applyNeracaPreset = (tgl: string) => {
    setNeracaPerTanggal(tgl);
    handleFetchNeraca(tgl);
  };

  // Preset Neraca Saldo
  const applyNsPreset = (tgl: string) => {
    setNsPerTanggal(tgl);
    handleFetchNeracaSaldo(tgl);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. Header Utama & Tombol Cetak */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#d4af37]/30 dark:border-[#d4af37]/25 print:border-none print:pb-0">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#0b2419] border border-[#d4af37]/30 dark:border-[#d4af37]/40 flex items-center justify-center text-[#06130D] dark:text-[#d4af37] shadow-xs print:hidden">
              <FileSpreadsheet className="w-5 h-5 text-[#06130D] dark:text-[#d4af37]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#06130D] dark:text-[#f3c853] tracking-tight print:text-black">
                Laporan Keuangan
              </h1>
              <p className="text-xs sm:text-sm text-[#06130D]/70 dark:text-slate-400 mt-0.5 print:text-gray-600">
                Laporan Laba Rugi, Neraca Keuangan, dan Neraca Saldo CV Batik Larasati
              </p>
            </div>
          </div>
        </div>

        {/* Tombol Cetak Laporan */}
        <div className="flex items-center gap-3 self-start md:self-auto print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-[#06130D] hover:bg-[#0b2419] text-white border border-[#06130D] dark:border-[#d4af37] shadow-xs active:bg-[#06130D] transition-all flex items-center gap-2 cursor-pointer"
            title="Cetak Halaman Laporan Saat Ini"
          >
            <Printer className="w-4 h-4 text-[#d4af37]" />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* Pesan Kesalahan */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/40 text-rose-900 dark:text-rose-200 text-xs sm:text-sm flex items-center justify-between print:hidden">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-200 font-bold ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Navigasi Tab (Laba Rugi, Neraca, Neraca Saldo) */}
      <div className="bg-[#fdfbf7] dark:bg-[#071c15] p-1.5 rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs flex flex-wrap sm:flex-nowrap gap-1.5 print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab('laba-rugi')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'laba-rugi'
              ? 'bg-white dark:bg-[#0b2419] text-[#06130D] dark:text-[#f3c853] border border-[#d4af37]/30 dark:border-[#d4af37]/60 shadow-xs'
              : 'text-[#06130D]/70 dark:text-slate-400 hover:text-[#06130D] dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-[#06150f]'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-[#06130D] dark:text-[#d4af37]" />
          <span>Laporan Laba Rugi</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('neraca')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'neraca'
              ? 'bg-white dark:bg-[#0b2419] text-[#06130D] dark:text-[#f3c853] border border-[#d4af37]/30 dark:border-[#d4af37]/60 shadow-xs'
              : 'text-[#06130D]/70 dark:text-slate-400 hover:text-[#06130D] dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-[#06150f]'
          }`}
        >
          <Scale className="w-4 h-4 text-[#06130D] dark:text-[#d4af37]" />
          <span>Laporan Neraca</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('neraca-saldo')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'neraca-saldo'
              ? 'bg-white dark:bg-[#0b2419] text-[#06130D] dark:text-[#f3c853] border border-[#d4af37]/30 dark:border-[#d4af37]/60 shadow-xs'
              : 'text-[#06130D]/70 dark:text-slate-400 hover:text-[#06130D] dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-[#06150f]'
          }`}
        >
          <BookOpen className="w-4 h-4 text-[#06130D] dark:text-[#d4af37]" />
          <span>Neraca Saldo</span>
        </button>
      </div>

      {/* Header Saat Cetak (Print Header Khusus) */}
      <div className="hidden print:block text-center border-b-2 border-black pb-4 mb-6">
        <h2 className="text-xl font-bold uppercase tracking-wider text-black">CV Batik Larasati</h2>
        <p className="text-xs text-gray-700">Laporan Akuntansi & Keuangan Resmi</p>
        <p className="text-sm font-bold mt-1 text-black">
          {activeTab === 'laba-rugi' &&
            `Laporan Laba Rugi (${formatTanggalIndo(lrTanggalMulai)} s/d ${formatTanggalIndo(
              lrTanggalSelesai
            )})`}
          {activeTab === 'neraca' && `Laporan Neraca per ${formatTanggalIndo(neracaPerTanggal)}`}
          {activeTab === 'neraca-saldo' &&
            `Neraca Saldo per ${formatTanggalIndo(nsPerTanggal)}`}
        </p>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LAPORAN LABA RUGI (INCOME STATEMENT)                               */}
      {/* ========================================================================= */}
      {activeTab === 'laba-rugi' && (
        <div className="space-y-6">
          {/* Filter Bar Rentang Tanggal */}
          <div className="bg-white dark:bg-[#071c15] p-4 sm:p-5 rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs space-y-3 print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#06130D] dark:text-[#d4af37]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#06130D] dark:text-[#d4af37]">
                  Rentang Waktu Laba Rugi
                </span>
                {isPending && (
                  <span className="text-[11px] text-[#06130D] dark:text-[#f3c853] animate-pulse flex items-center gap-1 ml-2 font-medium">
                    <Clock className="w-3 h-3" /> Memuat...
                  </span>
                )}
              </div>

              {/* Preset Cepat */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-[#06130D]/70 dark:text-slate-400 mr-1">Preset:</span>
                <button
                  type="button"
                  onClick={() => applyLrPreset('bulan_ini')}
                  className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all cursor-pointer shadow-xs ${
                    lrTanggalMulai === '2026-10-01' && lrTanggalSelesai === '2026-10-31'
                      ? 'bg-[#06130D] border-[#06130D] text-white dark:bg-[#0b2419] dark:border-[#d4af37] dark:text-[#f3c853] font-bold'
                      : 'border-[#d4af37]/30 dark:border-slate-800 bg-white dark:bg-[#06150f] text-[#06130D]/70 dark:text-slate-300 hover:bg-[#fdfbf7] dark:hover:border-[#d4af37]/40'
                  }`}
                >
                  Bulan Ini (Okt 2026)
                </button>
                <button
                  type="button"
                  onClick={() => applyLrPreset('bulan_lalu')}
                  className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all cursor-pointer shadow-xs ${
                    lrTanggalMulai === '2026-09-01' && lrTanggalSelesai === '2026-09-30'
                      ? 'bg-[#06130D] border-[#06130D] text-white dark:bg-[#0b2419] dark:border-[#d4af37] dark:text-[#f3c853] font-bold'
                      : 'border-[#d4af37]/30 dark:border-slate-800 bg-white dark:bg-[#06150f] text-[#06130D]/70 dark:text-slate-300 hover:bg-[#fdfbf7] dark:hover:border-[#d4af37]/40'
                  }`}
                >
                  Bulan Lalu (Sep 2026)
                </button>
                <button
                  type="button"
                  onClick={() => applyLrPreset('tahun_ini')}
                  className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all cursor-pointer shadow-xs ${
                    lrTanggalMulai === '2026-01-01' && lrTanggalSelesai === '2026-12-31'
                      ? 'bg-[#06130D] border-[#06130D] text-white dark:bg-[#0b2419] dark:border-[#d4af37] dark:text-[#f3c853] font-bold'
                      : 'border-[#d4af37]/30 dark:border-slate-800 bg-white dark:bg-[#06150f] text-[#06130D]/70 dark:text-slate-300 hover:bg-[#fdfbf7] dark:hover:border-[#d4af37]/40'
                  }`}
                >
                  Tahun 2026 (YTD)
                </button>
              </div>
            </div>

            {/* Input Tanggal Mulai & Selesai */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#d4af37]/30 dark:border-[#d4af37]/15">
              <div>
                <label className="block text-[11px] font-semibold text-[#06130D] dark:text-slate-300 mb-1">
                  Tanggal Mulai
                </label>
                <input
                  type="date"
                  value={lrTanggalMulai}
                  onChange={(e) => {
                    setLrTanggalMulai(e.target.value);
                    handleFetchLabaRugi(e.target.value, lrTanggalSelesai);
                  }}
                  className="w-full p-2.5 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/35 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] cursor-pointer dark:[color-scheme:dark] shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#06130D] dark:text-slate-300 mb-1">
                  Tanggal Selesai
                </label>
                <input
                  type="date"
                  value={lrTanggalSelesai}
                  onChange={(e) => {
                    setLrTanggalSelesai(e.target.value);
                    handleFetchLabaRugi(lrTanggalMulai, e.target.value);
                  }}
                  className="w-full p-2.5 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/35 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] cursor-pointer dark:[color-scheme:dark] shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Kartu Ringkasan Laba Rugi */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 print:hidden">
            {/* Total Pendapatan */}
            <div className="bg-white dark:bg-[#071c15] p-4 rounded-xl border border-emerald-500/30 dark:border-emerald-500/30 shadow-xs">
              <div className="text-xs text-emerald-800 dark:text-emerald-400 font-semibold">Total Pendapatan</div>
              <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono mt-1.5">
                {formatRupiah(labaRugiData.total_pendapatan)}
              </div>
              <div className="text-[11px] text-[#06130D]/60 dark:text-slate-400 mt-1">
                Akumulasi seluruh akun pendapatan
              </div>
            </div>

            {/* Total Beban */}
            <div className="bg-white dark:bg-[#071c15] p-4 rounded-xl border border-rose-500/30 dark:border-rose-500/30 shadow-xs">
              <div className="text-xs text-rose-800 dark:text-rose-400 font-semibold">Total Beban Operasional</div>
              <div className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-300 font-mono mt-1.5">
                {formatRupiah(labaRugiData.total_beban)}
              </div>
              <div className="text-[11px] text-[#06130D]/60 dark:text-slate-400 mt-1">
                Akumulasi seluruh pos beban operasional
              </div>
            </div>

            {/* Laba / (Rugi) Bersih */}
            <div
              className={`p-4 rounded-xl border shadow-xs ${
                labaRugiData.laba_bersih >= 0
                  ? 'bg-white dark:bg-[#0b2419] border-[#d4af37]/40 dark:border-[#d4af37]/60'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-500/60'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span
                  className={`font-bold ${
                    labaRugiData.laba_bersih >= 0 ? 'text-[#06130D] dark:text-[#f3c853]' : 'text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {labaRugiData.laba_bersih >= 0 ? 'Laba Bersih' : 'Rugi Bersih'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                    labaRugiData.laba_bersih >= 0
                      ? 'bg-emerald-50 dark:bg-[#06150f] text-emerald-800 dark:text-[#f3c853] border-emerald-300 dark:border-[#d4af37]/40'
                      : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-400/40'
                  }`}
                >
                  {labaRugiData.laba_bersih >= 0 ? 'SURPLUS' : 'DEFISIT'}
                </span>
              </div>
              <div
                className={`text-xl sm:text-2xl font-black font-mono mt-1.5 ${
                  labaRugiData.laba_bersih >= 0 ? 'text-[#06130D] dark:text-[#f3c853]' : 'text-rose-800 dark:text-rose-300'
                }`}
              >
                {formatAngkaAkuntansi(labaRugiData.laba_bersih)}
              </div>
              <div className="text-[11px] text-[#06130D]/60 dark:text-slate-300 mt-1">
                Pendapatan dikurangi total beban
              </div>
            </div>
          </div>

          {/* Tabel Rincian Laba Rugi */}
          <div className="bg-white dark:bg-[#071c15] rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs overflow-hidden print:bg-white print:border-black print:text-black">
            {/* Header Laporan */}
            <div className="p-4 sm:p-5 bg-[#fdfbf7] dark:bg-[#0b2419] border-b border-[#d4af37]/30 dark:border-[#d4af37]/25 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 print:bg-gray-100 print:text-black print:border-black">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#06130D] dark:text-slate-100 print:text-black">
                  Rincian Laba Rugi Periode
                </h2>
                <div className="text-xs text-[#06130D]/60 dark:text-slate-400 print:text-gray-600 mt-0.5">
                  Periode: {formatTanggalIndo(labaRugiData.tanggal_mulai)} s/d{' '}
                  {formatTanggalIndo(labaRugiData.tanggal_selesai)}
                </div>
              </div>
              <div className="text-right text-xs text-[#06130D]/60 dark:text-slate-400 print:text-gray-600">
                <span>Dihitung dari jurnal berstatus <em>diposting</em></span>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              {/* Bagian 1: PENDAPATAN */}
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-500/30 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-400 font-bold text-sm uppercase tracking-wider print:text-black print:border-black">
                  <span>I. Pendapatan Usaha</span>
                  <span>Nominal (Rp)</span>
                </div>

                <div className="divide-y divide-[#d4af37]/20 dark:divide-[#d4af37]/10 text-xs">
                  {labaRugiData.pendapatan.map((item) => (
                    <div
                      key={item.id}
                      className="py-2.5 px-2 flex items-center justify-between hover:bg-[#fdfbf7]/80 dark:hover:bg-[#0b2419]/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[#06130D]/60 dark:text-slate-400 print:text-gray-600 w-16">
                          {item.kode}
                        </span>
                        <span className="font-medium text-[#06130D] dark:text-slate-200 print:text-black">
                          {formatTeksPuebi(item.nama)}
                        </span>
                      </div>
                      <div className="font-mono font-semibold text-[#06130D] dark:text-slate-100 print:text-black">
                        {item.nominal > 0 ? formatRupiah(item.nominal) : '-'}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 pb-1 px-3 py-2 flex items-center justify-between bg-[#fdfbf7] dark:bg-[#06150f] rounded-xl border border-emerald-500/30 dark:border-emerald-500/30 text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-300 print:bg-gray-100 print:text-black print:border-black">
                  <span className="uppercase">Total Pendapatan</span>
                  <span className="font-mono text-base font-extrabold">
                    {formatRupiah(labaRugiData.total_pendapatan)}
                  </span>
                </div>
              </div>

              {/* Bagian 2: BEBAN OPERASIONAL */}
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-rose-500/30 dark:border-rose-500/30 text-rose-800 dark:text-rose-400 font-bold text-sm uppercase tracking-wider print:text-black print:border-black">
                  <span>II. Beban Operasional</span>
                  <span>Nominal (Rp)</span>
                </div>

                <div className="divide-y divide-[#d4af37]/20 dark:divide-[#d4af37]/10 text-xs max-h-[420px] overflow-y-auto">
                  {labaRugiData.beban.map((item) => (
                    <div
                      key={item.id}
                      className="py-2.5 px-2 flex items-center justify-between hover:bg-[#fdfbf7]/80 dark:hover:bg-[#0b2419]/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[#06130D]/60 dark:text-slate-400 print:text-gray-600 w-16">
                          {item.kode}
                        </span>
                        <span className="font-medium text-[#06130D] dark:text-slate-200 print:text-black">
                          {formatTeksPuebi(item.nama)}
                        </span>
                      </div>
                      <div className="font-mono font-semibold text-[#06130D] dark:text-slate-100 print:text-black">
                        {item.nominal > 0 ? formatRupiah(item.nominal) : '-'}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 pb-1 px-3 py-2 flex items-center justify-between bg-[#fdfbf7] dark:bg-[#06150f] rounded-xl border border-rose-500/30 dark:border-rose-500/30 text-xs sm:text-sm font-bold text-rose-900 dark:text-rose-300 print:bg-gray-100 print:text-black print:border-black">
                  <span className="uppercase">Total Beban Operasional</span>
                  <span className="font-mono text-base font-extrabold">
                    {formatRupiah(labaRugiData.total_beban)}
                  </span>
                </div>
              </div>

              {/* Bagian 3: LABA / (RUGI) BERSIH */}
              <div className="pt-4 border-t-2 border-[#d4af37]/40 dark:border-[#d4af37]/50">
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between ${
                    labaRugiData.laba_bersih >= 0
                      ? 'bg-[#fdfbf7] dark:bg-[#0b2419] border-[#d4af37]/40 dark:border-[#d4af37] text-[#06130D] dark:text-[#f3c853]'
                      : 'bg-rose-50 dark:bg-rose-950/60 border-rose-400 text-rose-900 dark:text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-lg font-black uppercase tracking-wider">
                      {labaRugiData.laba_bersih >= 0 ? 'Laba Bersih Periode' : 'Rugi Bersih Periode'}
                    </span>
                    <span className="text-xs opacity-75">
                      (Total Pendapatan - Total Beban)
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono">
                    {formatAngkaAkuntansi(labaRugiData.laba_bersih)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LAPORAN NERACA (BALANCE SHEET)                                     */}
      {/* ========================================================================= */}
      {activeTab === 'neraca' && (
        <div className="space-y-6">
          {/* Filter Bar "Per Tanggal" */}
          <div className="bg-white dark:bg-[#071c15] p-4 sm:p-5 rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs space-y-3 print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#06130D] dark:text-[#d4af37]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#06130D] dark:text-[#d4af37]">
                  Neraca Posisi Keuangan (Per Tanggal)
                </span>
                {isPending && (
                  <span className="text-[11px] text-[#06130D] dark:text-[#f3c853] animate-pulse flex items-center gap-1 ml-2 font-medium">
                    <Clock className="w-3 h-3" /> Memuat...
                  </span>
                )}
              </div>

              {/* Preset Cepat Neraca */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-[#06130D]/70 dark:text-slate-400 mr-1">Preset:</span>
                <button
                  type="button"
                  onClick={() => applyNeracaPreset('2026-10-31')}
                  className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all cursor-pointer shadow-xs ${
                    neracaPerTanggal === '2026-10-31'
                      ? 'bg-[#06130D] border-[#06130D] text-white dark:bg-[#0b2419] dark:border-[#d4af37] dark:text-[#f3c853] font-bold'
                      : 'border-[#d4af37]/30 dark:border-slate-800 bg-[#fdfbf7] dark:bg-[#06150f] text-[#06130D] dark:text-slate-300 hover:bg-[#fdfbf7]/80 dark:hover:border-[#d4af37]/40'
                  }`}
                >
                  Per 31 Okt 2026
                </button>
                <button
                  type="button"
                  onClick={() => applyNeracaPreset('2026-09-30')}
                  className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all cursor-pointer shadow-xs ${
                    neracaPerTanggal === '2026-09-30'
                      ? 'bg-[#06130D] border-[#06130D] text-white dark:bg-[#0b2419] dark:border-[#d4af37] dark:text-[#f3c853] font-bold'
                      : 'border-[#d4af37]/30 dark:border-slate-800 bg-[#fdfbf7] dark:bg-[#06150f] text-[#06130D] dark:text-slate-300 hover:bg-[#fdfbf7]/80 dark:hover:border-[#d4af37]/40'
                  }`}
                >
                  Per 30 Sep 2026
                </button>
                <button
                  type="button"
                  onClick={() => applyNeracaPreset('2026-08-31')}
                  className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all cursor-pointer shadow-xs ${
                    neracaPerTanggal === '2026-08-31'
                      ? 'bg-[#06130D] border-[#06130D] text-white dark:bg-[#0b2419] dark:border-[#d4af37] dark:text-[#f3c853] font-bold'
                      : 'border-[#d4af37]/30 dark:border-slate-800 bg-[#fdfbf7] dark:bg-[#06150f] text-[#06130D] dark:text-slate-300 hover:bg-[#fdfbf7]/80 dark:hover:border-[#d4af37]/40'
                  }`}
                >
                  Per 31 Agu 2026
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-[#d4af37]/30 dark:border-[#d4af37]/15">
              <label className="block text-[11px] font-semibold text-[#06130D] dark:text-slate-300 mb-1">
                Pilih Tanggal Neraca
              </label>
              <input
                type="date"
                value={neracaPerTanggal}
                onChange={(e) => {
                  setNeracaPerTanggal(e.target.value);
                  handleFetchNeraca(e.target.value);
                }}
                className="w-full sm:w-72 p-2.5 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/35 bg-[#fdfbf7] dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] cursor-pointer dark:[color-scheme:dark] shadow-xs"
              />
            </div>
          </div>

          {/* Banner Validasi Keseimbangan (Balance Indicator) */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs ${
              neracaData.is_balanced
                ? 'bg-[#fdfbf7] dark:bg-[#071c15] border-emerald-500/40 dark:border-emerald-500/50 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/70 border-rose-300 dark:border-rose-500 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {neracaData.is_balanced ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <div>
                <div className="text-sm font-bold text-[#06130D] dark:text-slate-100">
                  {neracaData.is_balanced
                    ? 'Neraca Seimbang (Balanced)'
                    : 'Peringatan: Neraca Tidak Seimbang'}
                </div>
                <div className="text-xs text-[#06130D]/70 dark:text-slate-300 mt-0.5">
                  {neracaData.is_balanced
                    ? `Total Aset (${formatRupiah(neracaData.total_aset)}) = Total Kewajiban & Ekuitas (${formatRupiah(
                        neracaData.total_pasiva
                      )})`
                    : `Terdapat selisih nominal sebesar ${formatRupiah(
                        neracaData.selisih
                      )} antara Aset dan Pasiva.`}
                </div>
              </div>
            </div>

            <div className="text-right font-mono text-xs">
              <span className="opacity-75 text-[#06130D]/60 dark:text-slate-400">Posisi: </span>
              <strong className="text-[#06130D] dark:text-slate-100">
                {formatTanggalIndo(neracaData.per_tanggal)}
              </strong>
            </div>
          </div>

          {/* Tabel Ganda Neraca (Kiri: ASET, Kanan: KEWAJIBAN & EKUITAS) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2">
            {/* ================= KOLOM KIRI: ASET (AKTIVA) ================= */}
            <div className="bg-white dark:bg-[#071c15] rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs overflow-hidden flex flex-col justify-between print:bg-white print:border-black print:text-black">
              <div>
                <div className="p-4 bg-[#fdfbf7] dark:bg-[#0b2419] border-b border-[#d4af37]/30 dark:border-[#d4af37]/25 flex items-center justify-between print:bg-gray-100 print:border-black">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#06130D] dark:text-[#d4af37] print:text-black">
                    Aset (Aktiva)
                  </h3>
                  <span className="text-xs text-[#06130D]/60 dark:text-slate-400 print:text-gray-600">Saldo Debit Normal</span>
                </div>

                <div className="p-4 divide-y divide-[#d4af37]/20 dark:divide-[#d4af37]/10 text-xs">
                  {neracaData.aset.map((item) => (
                    <div
                      key={item.id}
                      className="py-2.5 px-2 flex items-center justify-between hover:bg-[#fdfbf7]/80 dark:hover:bg-[#0b2419]/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-[#06130D]/60 dark:text-slate-400 print:text-gray-600 w-14">
                          {item.kode}
                        </span>
                        <span className="font-medium text-[#06130D] dark:text-slate-200 print:text-black">
                          {formatTeksPuebi(item.nama)}
                        </span>
                      </div>
                      <div className="font-mono font-semibold text-[#06130D] dark:text-slate-100 print:text-black">
                        {item.saldo !== 0 ? formatAngkaAkuntansi(item.saldo) : '-'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Aset Footer */}
              <div className="p-4 bg-[#fdfbf7] dark:bg-[#06150f] border-t-2 border-[#d4af37]/40 flex items-center justify-between text-xs sm:text-sm font-bold text-[#06130D] dark:text-[#f3c853] print:bg-gray-200 print:text-black print:border-black">
                <span className="uppercase tracking-wider">Total Aset (Aktiva)</span>
                <span className="font-mono text-base sm:text-lg font-black text-[#06130D] dark:text-[#f3c853]">
                  {formatRupiah(neracaData.total_aset)}
                </span>
              </div>
            </div>

            {/* ================= KOLOM KANAN: KEWAJIBAN & EKUITAS (PASIVA) ================= */}
            <div className="bg-white dark:bg-[#071c15] rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs overflow-hidden flex flex-col justify-between print:bg-white print:border-black print:text-black">
              <div>
                {/* 1. Kewajiban */}
                <div className="p-4 bg-[#fdfbf7] dark:bg-[#0b2419] border-b border-[#d4af37]/30 dark:border-[#d4af37]/25 flex items-center justify-between print:bg-gray-100 print:border-black">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 print:text-black">
                    Kewajiban (Liabilitas)
                  </h3>
                  <span className="text-xs text-[#06130D]/60 dark:text-slate-400 print:text-gray-600">Saldo Kredit Normal</span>
                </div>

                <div className="p-4 divide-y divide-[#d4af37]/20 dark:divide-[#d4af37]/10 text-xs">
                  {neracaData.kewajiban.map((item) => (
                    <div
                      key={item.id}
                      className="py-2.5 px-2 flex items-center justify-between hover:bg-[#fdfbf7]/80 dark:hover:bg-[#0b2419]/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-[#06130D]/60 dark:text-slate-400 print:text-gray-600 w-14">
                          {item.kode}
                        </span>
                        <span className="font-medium text-[#06130D] dark:text-slate-200 print:text-black">
                          {formatTeksPuebi(item.nama)}
                        </span>
                      </div>
                      <div className="font-mono font-semibold text-[#06130D] dark:text-slate-100 print:text-black">
                        {item.saldo !== 0 ? formatAngkaAkuntansi(item.saldo) : '-'}
                      </div>
                    </div>
                  ))}

                  <div className="pt-2 px-2 flex items-center justify-between font-bold text-amber-800 dark:text-amber-300 text-xs">
                    <span>Subtotal Kewajiban</span>
                    <span className="font-mono">{formatRupiah(neracaData.total_kewajiban)}</span>
                  </div>
                </div>

                {/* 2. Ekuitas */}
                <div className="p-4 bg-[#fdfbf7] dark:bg-[#0b2419] border-t border-b border-[#d4af37]/30 dark:border-[#d4af37]/25 flex items-center justify-between print:bg-gray-100 print:border-black">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 print:text-black">
                    Ekuitas (Modal)
                  </h3>
                  <span className="text-xs text-[#06130D]/60 dark:text-slate-400 print:text-gray-600">Termasuk Laba Berjalan</span>
                </div>

                <div className="p-4 divide-y divide-[#d4af37]/20 dark:divide-[#d4af37]/10 text-xs space-y-1">
                  {neracaData.ekuitas.map((item) => (
                    <div
                      key={item.id}
                      className="py-2.5 px-2 flex items-center justify-between hover:bg-[#fdfbf7]/80 dark:hover:bg-[#0b2419]/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-[#06130D]/60 dark:text-slate-400 print:text-gray-600 w-14">
                          {item.kode}
                        </span>
                        <span className="font-medium text-[#06130D] dark:text-slate-200 print:text-black">
                          {formatTeksPuebi(item.nama)}
                        </span>
                      </div>
                      <div className="font-mono font-semibold text-[#06130D] dark:text-slate-100 print:text-black">
                        {item.saldo !== 0 ? formatAngkaAkuntansi(item.saldo) : '-'}
                      </div>
                    </div>
                  ))}

                  {/* INJEKSI LABA / (RUGI) BERJALAN SESUAI PRD & SPESIFIKASI */}
                  <div className="py-2.5 px-2 flex items-center justify-between bg-[#fdfbf7] dark:bg-[#0b2419]/60 rounded-lg border border-[#d4af37]/30 text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white dark:bg-[#06150f] text-[#06130D] dark:text-[#f3c853] border border-[#d4af37]/30 dark:border-[#d4af37]/40">
                        RE
                      </span>
                      <span className="text-[#06130D] dark:text-[#f3c853]">Laba (Rugi) Berjalan Kumulatif</span>
                    </div>
                    <div className="font-mono font-bold text-[#06130D] dark:text-[#f3c853]">
                      {formatAngkaAkuntansi(neracaData.laba_berjalan)}
                    </div>
                  </div>

                  <div className="pt-2 px-2 flex items-center justify-between font-bold text-indigo-800 dark:text-indigo-300 text-xs">
                    <span>Subtotal Ekuitas</span>
                    <span className="font-mono">{formatRupiah(neracaData.total_ekuitas)}</span>
                  </div>
                </div>
              </div>

              {/* Total Pasiva Footer */}
              <div className="p-4 bg-[#fdfbf7] dark:bg-[#06150f] border-t-2 border-[#d4af37]/40 flex items-center justify-between text-xs sm:text-sm font-bold text-[#06130D] dark:text-[#f3c853] print:bg-gray-200 print:text-black print:border-black">
                <span className="uppercase tracking-wider">
                  Total Kewajiban & Ekuitas (Pasiva)
                </span>
                <span className="font-mono text-base sm:text-lg font-black text-[#06130D] dark:text-[#f3c853]">
                  {formatRupiah(neracaData.total_pasiva)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: NERACA SALDO (TRIAL BALANCE)                                       */}
      {/* ========================================================================= */}
      {activeTab === 'neraca-saldo' && (
        <div className="space-y-6">
          {/* Filter Bar "Per Tanggal" */}
          <div className="bg-white dark:bg-[#071c15] p-4 sm:p-5 rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs space-y-3 print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#06130D] dark:text-[#d4af37]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#06130D] dark:text-[#d4af37]">
                  Neraca Saldo Akuntansi (Trial Balance)
                </span>
                {isPending && (
                  <span className="text-[11px] text-[#06130D] dark:text-[#f3c853] animate-pulse flex items-center gap-1 ml-2 font-medium">
                    <Clock className="w-3 h-3" /> Memuat...
                  </span>
                )}
              </div>

              {/* Preset Cepat */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-[#06130D]/70 dark:text-slate-400 mr-1">Preset:</span>
                <button
                  type="button"
                  onClick={() => applyNsPreset('2026-10-31')}
                  className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all cursor-pointer shadow-xs ${
                    nsPerTanggal === '2026-10-31'
                      ? 'bg-[#06130D] border-[#06130D] text-white dark:bg-[#0b2419] dark:border-[#d4af37] dark:text-[#f3c853] font-bold'
                      : 'border-[#d4af37]/30 dark:border-slate-800 bg-[#fdfbf7] dark:bg-[#06150f] text-[#06130D] dark:text-slate-300 hover:bg-[#fdfbf7]/80 dark:hover:border-[#d4af37]/40'
                  }`}
                >
                  Per 31 Okt 2026
                </button>
                <button
                  type="button"
                  onClick={() => applyNsPreset('2026-09-30')}
                  className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all cursor-pointer shadow-xs ${
                    nsPerTanggal === '2026-09-30'
                      ? 'bg-[#06130D] border-[#06130D] text-white dark:bg-[#0b2419] dark:border-[#d4af37] dark:text-[#f3c853] font-bold'
                      : 'border-[#d4af37]/30 dark:border-slate-800 bg-[#fdfbf7] dark:bg-[#06150f] text-[#06130D] dark:text-slate-300 hover:bg-[#fdfbf7]/80 dark:hover:border-[#d4af37]/40'
                  }`}
                >
                  Per 30 Sep 2026
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-[#d4af37]/30 dark:border-[#d4af37]/15">
              <label className="block text-[11px] font-semibold text-[#06130D] dark:text-slate-300 mb-1">
                Pilih Tanggal Neraca Saldo
              </label>
              <input
                type="date"
                value={nsPerTanggal}
                onChange={(e) => {
                  setNsPerTanggal(e.target.value);
                  handleFetchNeracaSaldo(e.target.value);
                }}
                className="w-full sm:w-72 p-2.5 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/35 bg-[#fdfbf7] dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] cursor-pointer dark:[color-scheme:dark] shadow-xs"
              />
            </div>
          </div>

          {/* Banner Validasi Keseimbangan Debit vs Kredit */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs ${
              neracaSaldoData.is_balanced
                ? 'bg-[#fdfbf7] dark:bg-[#071c15] border-emerald-500/40 dark:border-emerald-500/50 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/70 border-rose-300 dark:border-rose-500 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {neracaSaldoData.is_balanced ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <div>
                <div className="text-sm font-bold text-[#06130D] dark:text-slate-100">
                  {neracaSaldoData.is_balanced
                    ? 'Neraca Saldo Seimbang (Balanced)'
                    : 'Peringatan: Neraca Saldo Tidak Seimbang'}
                </div>
                <div className="text-xs text-[#06130D]/70 dark:text-slate-300 mt-0.5">
                  {neracaSaldoData.is_balanced
                    ? `Total Debit (${formatRupiah(neracaSaldoData.total_debit)}) = Total Kredit (${formatRupiah(
                        neracaSaldoData.total_kredit
                      )})`
                    : `Terdapat selisih nominal sebesar ${formatRupiah(
                        neracaSaldoData.selisih
                      )} antara Debit dan Kredit.`}
                </div>
              </div>
            </div>

            <div className="text-right font-mono text-xs">
              <span className="opacity-75 text-[#06130D]/60 dark:text-slate-400">Per Tanggal: </span>
              <strong className="text-[#06130D] dark:text-slate-100">
                {formatTanggalIndo(neracaSaldoData.per_tanggal)}
              </strong>
            </div>
          </div>

          {/* Tabel Neraca Saldo */}
          <div className="bg-white dark:bg-[#071c15] rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs overflow-hidden print:bg-white print:border-black print:text-black">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#fdfbf7] dark:bg-[#06150f] text-[#06130D] dark:text-[#d4af37] border-b border-[#d4af37]/30 dark:border-[#d4af37]/25 uppercase text-[11px] tracking-wider font-bold print:bg-gray-100 print:text-black print:border-black">
                    <th scope="col" className="px-4 py-3.5 w-24">
                      Kode
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Nama Akun
                    </th>
                    <th scope="col" className="px-4 py-3.5 w-32">
                      Kategori
                    </th>
                    <th scope="col" className="px-4 py-3.5 w-44 text-right">
                      Debit (Rp)
                    </th>
                    <th scope="col" className="px-4 py-3.5 w-44 text-right">
                      Kredit (Rp)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d4af37]/20 dark:divide-[#d4af37]/10">
                  {neracaSaldoData.items.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-[#fdfbf7]/80 dark:hover:bg-[#0c2b1e]/60 transition-colors text-[#06130D] dark:text-slate-200 print:text-black"
                    >
                      <td className="px-4 py-3 font-mono text-[#06130D]/70 dark:text-slate-300 print:text-gray-700 whitespace-nowrap">
                        {item.kode}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#06130D] dark:text-slate-100 print:text-black">
                        {formatTeksPuebi(item.nama)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#fdfbf7] dark:bg-[#06150f] text-[#06130D] dark:text-[#d4af37] border border-[#d4af37]/30 print:border-gray-400 print:text-black">
                          {item.tipe}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono whitespace-nowrap">
                        {item.debit > 0 ? (
                          <span className="text-emerald-700 dark:text-emerald-300 font-semibold print:text-black">
                            {formatRupiah(item.debit)}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-slate-500 print:text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono whitespace-nowrap">
                        {item.kredit > 0 ? (
                          <span className="text-amber-700 dark:text-amber-300 font-semibold print:text-black">
                            {formatRupiah(item.kredit)}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-slate-500 print:text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Footer Total Neraca Saldo */}
                <tfoot>
                  <tr className="bg-[#fdfbf7] dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 font-bold border-t-2 border-[#d4af37]/40 text-xs sm:text-sm print:bg-gray-200 print:text-black print:border-black">
                    <td colSpan={3} className="px-4 py-4 uppercase tracking-wider text-[#06130D] dark:text-[#f3c853] print:text-black font-extrabold">
                      Total Saldo Neraca
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-emerald-800 dark:text-emerald-400 print:text-black font-black whitespace-nowrap">
                      {formatRupiah(neracaSaldoData.total_debit)}
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-amber-800 dark:text-amber-400 print:text-black font-black whitespace-nowrap">
                      {formatRupiah(neracaSaldoData.total_kredit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
