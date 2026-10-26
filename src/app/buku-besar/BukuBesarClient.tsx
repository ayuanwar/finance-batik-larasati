'use client';

import { useState, useTransition, useId } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Calendar,
  Filter,
  RotateCcw,
  Printer,
  FileText,
  Search,
  ExternalLink,
  ChevronDown,
  Clock,
  Sparkles,
  X,
} from 'lucide-react';
import { formatRupiah, formatTanggalIndo, formatTeksPuebi } from '@/lib/utils';
import {
  AkunDetail,
  BukuBesarResponseData,
  MutasiBukuBesarRow,
  getBukuBesarDataAction,
} from './actions';

export interface AkunOptionItem {
  id: number;
  kode: string;
  nama: string;
  tipe: 'aset' | 'kewajiban' | 'ekuitas' | 'pendapatan' | 'beban';
  saldo_normal: 'debit' | 'kredit';
  is_kas_bank: boolean;
}

interface BukuBesarClientProps {
  initialData: BukuBesarResponseData;
  akunList: AkunOptionItem[];
  profile: {
    id: string;
    nama_lengkap: string;
    peran: string;
  };
}

export function BukuBesarClient({
  initialData,
  akunList,
  profile,
}: BukuBesarClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [ledgerData, setLedgerData] = useState<BukuBesarResponseData>(initialData);
  const [selectedAkunId, setSelectedAkunId] = useState<number>(initialData.akun.id);
  const [tanggalMulai, setTanggalMulai] = useState<string>(initialData.tanggal_mulai);
  const [tanggalSelesai, setTanggalSelesai] = useState<string>(initialData.tanggal_selesai);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filterDatalistId = useId();

  // Helper format saldo (tanda kurung jika negatif sesuai standar akuntansi)
  const formatSaldo = (val: number) => {
    if (val < 0) {
      return `(${formatRupiah(Math.abs(val))})`;
    }
    return formatRupiah(val);
  };

  // Muat data buku besar saat filter berubah
  const fetchData = (newAkunId: number, tglMulai: string, tglSelesai: string) => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await getBukuBesarDataAction({
        akun_id: newAkunId,
        tanggal_mulai: tglMulai,
        tanggal_selesai: tglSelesai,
      });

      if (res.success && res.data) {
        setLedgerData(res.data);
      } else {
        setErrorMessage(res.error || 'Gagal memuat data buku besar.');
      }
    });
  };

  const handleAkunChange = (newId: number) => {
    setSelectedAkunId(newId);
    fetchData(newId, tanggalMulai, tanggalSelesai);
  };

  const handleTanggalMulaiChange = (val: string) => {
    setTanggalMulai(val);
    fetchData(selectedAkunId, val, tanggalSelesai);
  };

  const handleTanggalSelesaiChange = (val: string) => {
    setTanggalSelesai(val);
    fetchData(selectedAkunId, tanggalMulai, val);
  };

  // Preset Rentang Waktu
  const applyPreset = (preset: 'bulan_ini' | 'bulan_lalu' | 'tahun_ini' | 'semua') => {
    let tglMulai = '';
    let tglSelesai = '';

    if (preset === 'bulan_ini') {
      tglMulai = '2026-10-01';
      tglSelesai = '2026-10-31';
    } else if (preset === 'bulan_lalu') {
      tglMulai = '2026-09-01';
      tglSelesai = '2026-09-30';
    } else if (preset === 'tahun_ini') {
      tglMulai = '2026-01-01';
      tglSelesai = '2026-12-31';
    } else if (preset === 'semua') {
      tglMulai = '';
      tglSelesai = '';
    }

    setTanggalMulai(tglMulai);
    setTanggalSelesai(tglSelesai);
    fetchData(selectedAkunId, tglMulai, tglSelesai);
  };

  const handleReset = () => {
    const defaultAkun = akunList[0]?.id || initialData.akun.id;
    const defaultMulai = '2026-10-01';
    const defaultSelesai = '2026-10-31';
    setSelectedAkunId(defaultAkun);
    setTanggalMulai(defaultMulai);
    setTanggalSelesai(defaultSelesai);
    setSearchFilter('');
    fetchData(defaultAkun, defaultMulai, defaultSelesai);
  };

  const currentAkun = ledgerData.akun;

  // Filter pencarian baris mutasi
  const filteredMutasi = ledgerData.mutasi.filter((item) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    const matchNomor = item.nomor_jurnal?.toLowerCase().includes(q);
    const matchBaris = item.keterangan_baris.toLowerCase().includes(q);
    const matchJurnal = item.keterangan_jurnal.toLowerCase().includes(q);
    return matchNomor || matchBaris || matchJurnal;
  });

  // Label badge tipe akun
  const getTipeBadge = (tipe: string) => {
    switch (tipe) {
      case 'aset':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';
      case 'kewajiban':
        return 'bg-amber-950/80 text-amber-300 border-amber-500/40';
      case 'ekuitas':
        return 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40';
      case 'pendapatan':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40';
      case 'beban':
        return 'bg-rose-950/80 text-rose-300 border-rose-500/40';
      default:
        return 'bg-slate-900 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#d4af37]/25">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0b2419] border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#f3c853] tracking-tight">
                Buku Besar
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Rincian mutasi debit, kredit, dan saldo berjalan akun buku besar
              </p>
            </div>
          </div>
        </div>

        {/* Tombol Cetak & Aksi */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#d4af37]/40 bg-[#071c15] text-[#d4af37] hover:bg-[#0b2419] hover:text-[#f3c853] transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            title="Cetak Buku Besar"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-700 bg-[#071c15] text-slate-300 hover:bg-[#0b2419] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Reset Filter"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Pesan Kesalahan Jika Ada */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs sm:text-sm flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-200 font-bold ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Panel Filter Utama */}
      <div className="bg-[#071c15] p-5 sm:p-6 rounded-2xl border border-[#d4af37]/25 shadow-xl space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          {/* A. Dropdown Pemilihan Akun */}
          <div className="lg:col-span-5 space-y-1.5">
            <label
              htmlFor="akun-select"
              className="block text-[11px] font-bold uppercase tracking-wider text-[#d4af37]"
            >
              Pilih Akun Buku Besar
            </label>
            <div className="relative">
              <select
                id="akun-select"
                value={selectedAkunId}
                onChange={(e) => handleAkunChange(Number(e.target.value))}
                className="w-full appearance-none pl-3.5 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-[#d4af37]/35 bg-[#06150f] text-slate-100 font-medium focus:outline-none focus:ring-1 focus:ring-[#d4af37] transition-all cursor-pointer"
              >
                {akunList.map((ak) => (
                  <option key={ak.id} value={ak.id} className="bg-[#071c15] text-slate-100 py-1">
                    {ak.kode} - {formatTeksPuebi(ak.nama)} ({ak.tipe.toUpperCase()})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#d4af37] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* B. Date Picker Rentang Tanggal (Dari - Sampai) */}
          <div className="lg:col-span-5 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#d4af37]">
                Rentang Tanggal Mutasi
              </label>
              {isPending && (
                <span className="text-[11px] text-[#f3c853] animate-pulse flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Memuat data...
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <input
                  type="date"
                  value={tanggalMulai}
                  onChange={(e) => handleTanggalMulaiChange(e.target.value)}
                  onClick={(e) => {
                    try {
                      e.currentTarget.showPicker?.();
                    } catch {}
                  }}
                  className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-[#d4af37]/35 bg-[#06150f] text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#d4af37] cursor-pointer [color-scheme:dark]"
                  title="Tanggal Mulai"
                  placeholder="Dari Tanggal"
                />
              </div>

              <div className="relative">
                <input
                  type="date"
                  value={tanggalSelesai}
                  onChange={(e) => handleTanggalSelesaiChange(e.target.value)}
                  onClick={(e) => {
                    try {
                      e.currentTarget.showPicker?.();
                    } catch {}
                  }}
                  className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-[#d4af37]/35 bg-[#06150f] text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#d4af37] cursor-pointer [color-scheme:dark]"
                  title="Tanggal Selesai"
                  placeholder="Sampai Tanggal"
                />
              </div>
            </div>
          </div>

          {/* C. Pencarian Cepat di Tabel */}
          <div className="lg:col-span-2 space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#d4af37]">
              Cari Keterangan
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[#d4af37]/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Cari transaksi..."
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-[#d4af37]/35 bg-[#06150f] text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
              />
            </div>
          </div>
        </div>

        {/* Preset Cepat Rentang Waktu */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#d4af37]/15">
          <span className="text-[11px] text-slate-400 font-medium mr-1">Preset Cepat:</span>
          <button
            type="button"
            onClick={() => applyPreset('bulan_ini')}
            className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all cursor-pointer ${
              tanggalMulai === '2026-10-01' && tanggalSelesai === '2026-10-31'
                ? 'bg-[#0b2419] border-[#d4af37] text-[#f3c853] font-bold'
                : 'border-slate-800 bg-[#06150f] text-slate-300 hover:border-[#d4af37]/40'
            }`}
          >
            Bulan Ini (Okt 2026)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('bulan_lalu')}
            className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all cursor-pointer ${
              tanggalMulai === '2026-09-01' && tanggalSelesai === '2026-09-30'
                ? 'bg-[#0b2419] border-[#d4af37] text-[#f3c853] font-bold'
                : 'border-slate-800 bg-[#06150f] text-slate-300 hover:border-[#d4af37]/40'
            }`}
          >
            Bulan Lalu (Sep 2026)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('tahun_ini')}
            className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all cursor-pointer ${
              tanggalMulai === '2026-01-01' && tanggalSelesai === '2026-12-31'
                ? 'bg-[#0b2419] border-[#d4af37] text-[#f3c853] font-bold'
                : 'border-slate-800 bg-[#06150f] text-slate-300 hover:border-[#d4af37]/40'
            }`}
          >
            Tahun 2026
          </button>
          <button
            type="button"
            onClick={() => applyPreset('semua')}
            className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all cursor-pointer ${
              !tanggalMulai && !tanggalSelesai
                ? 'bg-[#0b2419] border-[#d4af37] text-[#f3c853] font-bold'
                : 'border-slate-800 bg-[#06150f] text-slate-300 hover:border-[#d4af37]/40'
            }`}
          >
            Semua Mutasi
          </button>
        </div>
      </div>

      {/* 3. Header Informasi Akun & Ringkasan Saldo (Kartu Eksekutif) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* A. Info Akun & Saldo Awal */}
        <div className="bg-[#071c15] p-4 rounded-xl border border-[#d4af37]/30 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-[#d4af37]">Saldo Awal</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${getTipeBadge(
                currentAkun.tipe
              )}`}
            >
              {currentAkun.tipe}
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-slate-100 font-mono tracking-tight">
              {formatSaldo(ledgerData.saldo_awal)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 truncate">
              {tanggalMulai ? `Per ${formatTanggalIndo(tanggalMulai)}` : 'Saldo Awal Awal Waktu'}
            </div>
          </div>
        </div>

        {/* B. Total Mutasi Debit */}
        <div className="bg-[#071c15] p-4 rounded-xl border border-emerald-500/30 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-emerald-400">
            <span className="font-semibold">Total Mutasi Debit</span>
            <span className="text-[10px] font-mono text-emerald-300">
              {currentAkun.saldo_normal === 'debit' ? '(+ Menambah)' : '(- Mengurang)'}
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono tracking-tight">
              {formatRupiah(ledgerData.total_debit)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {ledgerData.mutasi.length} transaksi di rentang ini
            </div>
          </div>
        </div>

        {/* C. Total Mutasi Kredit */}
        <div className="bg-[#071c15] p-4 rounded-xl border border-amber-500/30 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-amber-400">
            <span className="font-semibold">Total Mutasi Kredit</span>
            <span className="text-[10px] font-mono text-amber-300">
              {currentAkun.saldo_normal === 'kredit' ? '(+ Menambah)' : '(- Mengurang)'}
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono tracking-tight">
              {formatRupiah(ledgerData.total_kredit)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Saldo Normal: {currentAkun.saldo_normal.toUpperCase()}
            </div>
          </div>
        </div>

        {/* D. Saldo Akhir */}
        <div className="bg-[#0b2419] p-4 rounded-xl border border-[#d4af37]/60 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#d4af37]">
            <span className="font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#f3c853]" /> Saldo Akhir
            </span>
            <span className="text-[10px] font-mono text-[#f3c853]">
              {tanggalSelesai ? formatTanggalIndo(tanggalSelesai) : 'Saat Ini'}
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-[#f3c853] font-mono tracking-tight">
              {formatSaldo(ledgerData.saldo_akhir)}
            </div>
            <div className="text-[11px] text-slate-300 mt-1 truncate">
              {currentAkun.kode} - {formatTeksPuebi(currentAkun.nama)}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Tabel Buku Besar Utama */}
      <div className="bg-[#071c15] rounded-2xl border border-[#d4af37]/25 shadow-xl overflow-hidden">
        {/* Header Tabel Keterangan Akun */}
        <div className="p-4 sm:p-5 bg-[#0b2419] border-b border-[#d4af37]/25 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-lg bg-[#06150f] border border-[#d4af37]/40 text-[#f3c853] font-mono font-bold text-sm">
              {currentAkun.kode}
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100">{formatTeksPuebi(currentAkun.nama)}</h2>
              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>Kategori: {currentAkun.tipe.toUpperCase()}</span>
                <span>•</span>
                <span>Posisi Normal: {currentAkun.saldo_normal.toUpperCase()}</span>
                {currentAkun.is_kas_bank && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-400 font-semibold">Kas / Bank Operasional</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="text-right text-xs text-slate-400">
            <div>
              Periode:{' '}
              <span className="font-semibold text-slate-200">
                {tanggalMulai ? formatTanggalIndo(tanggalMulai) : 'Awal Waktu'} s/d{' '}
                {tanggalSelesai ? formatTanggalIndo(tanggalSelesai) : 'Hari Ini'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Hanya menampilkan transaksi jurnal berstatus <em>diposting</em>
            </div>
          </div>
        </div>

        {/* Tabel Data Mutasi */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#06150f] text-[#d4af37] border-b border-[#d4af37]/25 uppercase text-[11px] tracking-wider font-bold">
                <th scope="col" className="px-4 py-3.5 w-32">
                  Tanggal
                </th>
                <th scope="col" className="px-4 py-3.5 w-44">
                  No. Jurnal
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Keterangan Transaksi
                </th>
                <th scope="col" className="px-4 py-3.5 w-36 text-right">
                  Debit (Rp)
                </th>
                <th scope="col" className="px-4 py-3.5 w-36 text-right">
                  Kredit (Rp)
                </th>
                <th scope="col" className="px-4 py-3.5 w-44 text-right">
                  Saldo Berjalan (Rp)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d4af37]/10 font-normal">
              {/* Baris Pertama: Saldo Awal */}
              <tr className="bg-[#092218]/80 text-slate-200 font-semibold border-b border-[#d4af37]/25">
                <td className="px-4 py-3 font-mono text-slate-400">
                  {tanggalMulai ? formatTanggalIndo(tanggalMulai) : '-'}
                </td>
                <td className="px-4 py-3 text-slate-400 font-mono">-</td>
                <td className="px-4 py-3 text-slate-200 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#06150f] text-[#d4af37] border border-[#d4af37]/30">
                      AWAL
                    </span>
                    <span>
                      {tanggalMulai
                        ? `Saldo Awal sebelum ${formatTanggalIndo(tanggalMulai)}`
                        : 'Saldo Awal Awal Waktu'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-500">-</td>
                <td className="px-4 py-3 text-right font-mono text-slate-500">-</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-[#f3c853]">
                  {formatSaldo(ledgerData.saldo_awal)}
                </td>
              </tr>

              {/* Baris Transaksi (Mutasi Berjalan) */}
              {filteredMutasi.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="w-8 h-8 text-slate-500" />
                      <div className="text-sm font-semibold text-slate-300">
                        Tidak ada transaksi mutasi pada rentang tanggal ini.
                      </div>
                      <div className="text-xs text-slate-500">
                        Saldo tidak mengalami perubahan selama periode yang dipilih.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMutasi.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[#0c2b1e]/70 transition-colors text-slate-200"
                  >
                    {/* Tanggal */}
                    <td className="px-4 py-3 font-mono text-slate-300 whitespace-nowrap">
                      {formatTanggalIndo(item.tanggal)}
                    </td>

                    {/* No Jurnal */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.nomor_jurnal ? (
                        <Link
                          href={`/jurnal/${item.jurnal_id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-[#06150f] border border-[#d4af37]/35 text-[#d4af37] hover:border-[#d4af37] hover:text-[#f3c853] transition-all"
                          title="Buka detail jurnal"
                        >
                          <span>{item.nomor_jurnal}</span>
                          <ExternalLink className="w-3 h-3 text-[#d4af37]/70" />
                        </Link>
                      ) : (
                        <span className="font-mono text-slate-500">-</span>
                      )}
                    </td>

                    {/* Keterangan */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-100">{item.keterangan_baris}</div>
                      {item.keterangan_jurnal &&
                        item.keterangan_jurnal !== item.keterangan_baris && (
                          <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                            {item.keterangan_jurnal}
                          </div>
                        )}
                    </td>

                    {/* Debit */}
                    <td className="px-4 py-3 text-right font-mono whitespace-nowrap">
                      {item.debit > 0 ? (
                        <span className="text-emerald-300 font-semibold">
                          {formatRupiah(item.debit)}
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    {/* Kredit */}
                    <td className="px-4 py-3 text-right font-mono whitespace-nowrap">
                      {item.kredit > 0 ? (
                        <span className="text-amber-300 font-semibold">
                          {formatRupiah(item.kredit)}
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    {/* Saldo Berjalan */}
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-100 whitespace-nowrap">
                      {formatSaldo(item.saldo_berjalan)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Baris Terakhir: Total Mutasi & Saldo Akhir */}
            <tfoot>
              <tr className="bg-[#06150f] text-slate-100 font-bold border-t-2 border-[#d4af37]/40 text-xs">
                <td colSpan={3} className="px-4 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0b2419] text-[#f3c853] border border-[#d4af37]/40">
                      AKHIR
                    </span>
                    <span className="text-slate-100 uppercase tracking-wider text-[11px]">
                      Total Mutasi Periode & Saldo Akhir
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 text-right font-mono text-emerald-400 text-sm whitespace-nowrap">
                  {formatRupiah(ledgerData.total_debit)}
                </td>
                <td className="px-4 py-4 text-right font-mono text-amber-400 text-sm whitespace-nowrap">
                  {formatRupiah(ledgerData.total_kredit)}
                </td>
                <td className="px-4 py-4 text-right font-mono font-extrabold text-[#f3c853] text-sm whitespace-nowrap">
                  {formatSaldo(ledgerData.saldo_akhir)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
