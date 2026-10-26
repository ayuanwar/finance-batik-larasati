'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Scale,
  CalendarCheck2,
  Clock,
  ArrowUpRight,
  FileText,
  ChevronRight,
  ChevronLeft,
  Search,
  Calendar,
  RotateCcw,
  Eye,
  X,
} from 'lucide-react';
import { formatRupiah, formatTanggalIndo, formatTeksPuebi } from '@/lib/utils';
import { Profile } from '@/types/database';

export interface KasBankBreakdown {
  id: number;
  kode: string;
  nama: string;
  saldo: number;
}

export interface PengajuanItem {
  id: number;
  nomor: string;
  status: string;
  jumlah: number;
  keterangan: string;
  tanggal_transaksi: string;
  profiles?: {
    nama_lengkap: string;
  } | null;
}

export interface PeriodeItem {
  id: number;
  tahun: number;
  bulan: number;
  status: 'terbuka' | 'ditutup';
  ditutup_pada: string | null;
  profiles?: {
    nama_lengkap: string;
  } | null;
}

interface DashboardFinanceProps {
  profile: Profile;
  totalKasBank: number;
  kasBankList: KasBankBreakdown[];
  pendapatanBulanIni: number;
  bebanBulanIni: number;
  labaBulanIni: number;
  namaBulanAktif: string;
  pengajuanMenunggu: PengajuanItem[];
  periodeList: PeriodeItem[];
}

export function DashboardFinance({
  profile,
  totalKasBank,
  kasBankList,
  pendapatanBulanIni,
  bebanBulanIni,
  labaBulanIni,
  namaBulanAktif,
  pengajuanMenunggu,
  periodeList,
}: DashboardFinanceProps) {
  const isDirektur = profile.peran === 'direktur';

  // Filter & Paginasi untuk Pengajuan Menunggu
  const [search, setSearch] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Filter Data
  const filteredMenunggu = useMemo(() => {
    return pengajuanMenunggu.filter((item) => {
      // 1. Pencarian (Nomor Dokumen, Nama Pengaju, Keperluan)
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchNomor = item.nomor?.toLowerCase().includes(q);
        const matchNama = item.profiles?.nama_lengkap?.toLowerCase().includes(q);
        const matchKet = item.keterangan?.toLowerCase().includes(q);
        if (!matchNomor && !matchNama && !matchKet) return false;
      }

      // 2. Rentang Tanggal Nota
      if (tanggalMulai && item.tanggal_transaksi < tanggalMulai) {
        return false;
      }
      if (tanggalSelesai && item.tanggal_transaksi > tanggalSelesai) {
        return false;
      }

      return true;
    });
  }, [pengajuanMenunggu, search, tanggalMulai, tanggalSelesai]);

  // Reset nomor halaman saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [search, tanggalMulai, tanggalSelesai]);

  const totalPages = Math.max(1, Math.ceil(filteredMenunggu.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredMenunggu.length);
  const paginatedMenunggu = useMemo(() => {
    return filteredMenunggu.slice(startIndex, endIndex);
  }, [filteredMenunggu, startIndex, endIndex]);

  // Hitung pengajuan yang relevan dengan peran yang masuk (PRD Bagian 9.1)
  const jumlahMenungguPeran = isDirektur
    ? pengajuanMenunggu.filter((p) => p.status === 'menunggu_direktur').length
    : pengajuanMenunggu.filter((p) => p.status === 'diajukan' || p.status === 'disetujui').length;

  return (
    <div className="space-y-6">
      {/* 1. Header Ringkas & Aksi Cepat */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#d4af37]/30 dark:border-[#d4af37]/20">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#06130D] dark:text-[#fdfbf7] font-serif">
            Ikhtisar Keuangan
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
            Posisi kas, performa laba rugi, dan persetujuan pengajuan ({namaBulanAktif})
          </p>
        </div>

        <div>
          <Link
            href="/pengajuan"
            className="px-4 py-2 rounded-xl bg-[#d4af37] text-[#06130D] text-xs font-bold shadow-md hover:bg-[#e0bc46] active:bg-[#c49f2e] transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Daftar Pengajuan ({pengajuanMenunggu.length})</span>
          </Link>
        </div>
      </div>

      {/* 2. Kartu Ringkasan Finansial Utama (PRD Bagian 9.1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Kas & Bank */}
        <div className="bg-white dark:bg-[#0b2419] p-5 rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#06130D]/70 dark:text-[#d4af37]">
              Saldo Kas & Bank
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#fdfbf7] dark:bg-[#123524] text-[#06130D] dark:text-[#d4af37] flex items-center justify-center border border-[#d4af37]/30 dark:border-[#d4af37]/30 shadow-xs">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xl sm:text-2xl font-extrabold text-[#06130D] dark:text-[#fdfbf7] tracking-tight">
              {formatRupiah(totalKasBank)}
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-[#d4af37]/20 dark:border-[#d4af37]/15 space-y-1">
              {kasBankList.map((kb) => (
                <div key={kb.id} className="flex justify-between text-[11px] text-gray-700 dark:text-slate-300">
                  <span className="truncate pr-2">{formatTeksPuebi(kb.nama)}</span>
                  <span className="font-bold text-[#06130D] dark:text-[#f3c853]">{formatRupiah(kb.saldo)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pendapatan Bulan Berjalan */}
        <div className="bg-white dark:bg-[#0b2419] p-5 rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#06130D]/70 dark:text-[#d4af37]">
              Pendapatan ({namaBulanAktif})
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-[#0e3522] text-emerald-800 dark:text-emerald-300 flex items-center justify-center border border-emerald-300 dark:border-emerald-500/30 shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 tracking-tight">
              {formatRupiah(pendapatanBulanIni)}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-2">
              Batik tulis, cap, seragam & paket wisata
            </p>
          </div>
        </div>

        {/* Beban Bulan Berjalan */}
        <div className="bg-white dark:bg-[#0b2419] p-5 rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#06130D]/70 dark:text-[#d4af37]">
              Beban ({namaBulanAktif})
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-[#321318] text-rose-800 dark:text-rose-300 flex items-center justify-center border border-rose-300 dark:border-rose-500/30 shadow-xs">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xl sm:text-2xl font-extrabold text-rose-700 dark:text-rose-400 tracking-tight">
              {formatRupiah(bebanBulanIni)}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-2">
              Bahan baku, gaji, listrik & operasional
            </p>
          </div>
        </div>

        {/* Laba Bersih Bulan Berjalan */}
        <div className="bg-white dark:bg-[#0b2419] p-5 rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#06130D]/70 dark:text-[#d4af37]">
              Laba (Rugi) {namaBulanAktif}
            </span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs ${
                labaBulanIni >= 0
                  ? 'bg-[#fdfbf7] dark:bg-[#123524] text-[#06130D] dark:text-[#d4af37] border-[#d4af37]/30 dark:border-[#d4af37]/40'
                  : 'bg-rose-50 dark:bg-[#321318] text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-500/40'
              }`}
            >
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div
              className={`text-xl sm:text-2xl font-extrabold tracking-tight ${
                labaBulanIni >= 0 ? 'text-[#06130D] dark:text-[#fdfbf7]' : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              {labaBulanIni < 0
                ? `(${formatRupiah(Math.abs(labaBulanIni))})`
                : formatRupiah(labaBulanIni)}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-2">
              {labaBulanIni >= 0 ? 'Surplus operasional' : 'Defisit operasional berjalan'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Grid Dua Kolom: Pengajuan Menunggu & Status Periode */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Kolom Kiri: Tabel Pengajuan Menunggu Tindakan (2 Kolom) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0b2419] rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#d4af37]/30 dark:border-[#d4af37]/15 gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#fdfbf7] dark:bg-[#123524] text-[#06130D] dark:text-[#d4af37] flex items-center justify-center border border-[#d4af37]/30 dark:border-[#d4af37]/30 shadow-xs">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#06130D] dark:text-[#fdfbf7] text-base">
                    Pengajuan Menunggu Tindakan
                  </h3>
                  <p className="text-xs text-[#06130D]/70 dark:text-slate-400">
                    {isDirektur
                      ? 'Pengajuan bernilai > Rp1.000.000 atau milik Akuntan'
                      : 'Pengajuan menunggu verifikasi atau siap dibayar'}
                  </p>
                </div>
              </div>

              <span className="text-xs font-bold bg-[#fdfbf7] dark:bg-[#d4af37]/15 text-[#06130D] dark:text-[#f3c853] px-2.5 py-1 rounded-full border border-[#d4af37]/30 dark:border-[#d4af37]/35 w-fit">
                {jumlahMenungguPeran} Perlu Tindakan
              </span>
            </div>

            {/* Filter & Kolom Pencarian Dasbor */}
            <div className="my-3 space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-[#06130D]/60 dark:text-[#d4af37]/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari nomor dokumen, keperluan, atau nama pengaju..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 placeholder:text-[#06130D]/40 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#d4af37] dark:focus:ring-[#d4af37] shadow-xs transition-all"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-white text-xs p-1"
                    title="Hapus pencarian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Date Picker Rentang Tanggal */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5 bg-[#fdfbf7] dark:bg-[#06150f] px-2.5 py-1 rounded-lg border border-[#d4af37]/30 dark:border-[#d4af37]/20 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-[#06130D]/70 dark:text-[#d4af37]" />
                    <span className="text-[#06130D]/70 dark:text-slate-400">Dari:</span>
                    <input
                      type="date"
                      value={tanggalMulai}
                      onChange={(e) => setTanggalMulai(e.target.value)}
                      className="bg-transparent text-[#06130D] dark:text-slate-200 text-xs focus:outline-none cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
                      title="Tanggal Mulai"
                    />
                    <span className="text-gray-400 dark:text-slate-500">s/d</span>
                    <span className="text-[#06130D]/70 dark:text-slate-400">Sampai:</span>
                    <input
                      type="date"
                      value={tanggalSelesai}
                      onChange={(e) => setTanggalSelesai(e.target.value)}
                      className="bg-transparent text-[#06130D] dark:text-slate-200 text-xs focus:outline-none cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
                      title="Tanggal Selesai"
                    />
                  </div>

                  {(tanggalMulai || tanggalSelesai) && (
                    <button
                      type="button"
                      onClick={() => {
                        setTanggalMulai('');
                        setTanggalSelesai('');
                      }}
                      className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-white text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      <span>Hapus Tanggal</span>
                    </button>
                  )}
                </div>

                {(search || tanggalMulai || tanggalSelesai) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setTanggalMulai('');
                      setTanggalSelesai('');
                    }}
                    className="text-[11px] text-gray-600 dark:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer self-end sm:self-auto font-semibold"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Filter</span>
                  </button>
                )}
              </div>
            </div>

            {/* List Tabel */}
            {filteredMenunggu.length === 0 ? (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs">
                {search || tanggalMulai || tanggalSelesai
                  ? 'Tidak ada pengajuan yang cocok dengan filter atau kata kunci.'
                  : 'Tidak ada pengajuan yang sedang menunggu saat ini.'}
              </div>
            ) : (
              <div className="divide-y divide-[#d4af37]/15 dark:divide-[#d4af37]/10 mt-1 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[#8a6b10] dark:text-[#d4af37]/80 uppercase text-[10px] font-bold tracking-wider">
                      <th className="py-3 px-2">Dokumen</th>
                      <th className="py-3 px-2">Pengaju</th>
                      <th className="py-3 px-2">Keperluan</th>
                      <th className="py-3 px-2 text-right">Jumlah</th>
                      <th className="py-3 px-2 text-center">Status</th>
                      <th className="py-3 px-2 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d4af37]/15 dark:divide-[#d4af37]/10 text-[#06130D] dark:text-slate-200">
                    {paginatedMenunggu.map((item) => {
                      const badgeStatus = {
                        diajukan: 'bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-500/40 font-semibold',
                        menunggu_direktur: 'bg-purple-50 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-500/40 font-bold',
                        disetujui: 'bg-emerald-50 dark:bg-[#123524] text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/40 font-bold',
                      }[item.status] || 'bg-[#fdfbf7] dark:bg-[#081c15] text-[#06130D] dark:text-slate-300 border-[#d4af37]/30 dark:border-slate-700';

                      const labelStatus = {
                        diajukan: 'Diajukan',
                        menunggu_direktur: 'Menunggu Direktur',
                        disetujui: 'Siap Dibayar',
                      }[item.status] || item.status;

                      return (
                        <tr key={item.id} className="hover:bg-[#fdfbf7] dark:hover:bg-[#102d20]/60 transition-colors">
                          <td className="py-3 px-2 font-mono font-bold text-[#06130D] dark:text-[#fdfbf7]">
                            <Link href={`/pengajuan/${item.id}`} className="hover:text-[#06130D] dark:hover:text-[#d4af37] underline decoration-[#d4af37]/40">
                              {item.nomor}
                            </Link>
                          </td>
                          <td className="py-3 px-2 font-medium">
                            {item.profiles?.nama_lengkap || '-'}
                          </td>
                          <td className="py-3 px-2 max-w-[180px] truncate text-[#06130D]/80 dark:text-slate-300" title={item.keterangan}>
                            {item.keterangan}
                          </td>
                          <td className="py-3 px-2 text-right font-bold text-[#06130D] dark:text-[#fdfbf7]">
                            {formatRupiah(item.jumlah)}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] border ${badgeStatus}`}>
                              {labelStatus}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center">
                              <Link
                                href={`/pengajuan/${item.id}`}
                                className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#d4af37]/30 dark:border-[#d4af37]/35 bg-white dark:bg-[#071c15] hover:bg-[#fdfbf7] dark:hover:bg-[#0b2419] transition-all duration-200 cursor-pointer shadow-xs"
                                title="Tinjau Pengajuan"
                              >
                                <Eye className="w-4 h-4 text-[#06130D]/70 dark:text-[#d4af37]" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Kontrol Paginasi Tabel Dasbor (Maks. 10 baris per halaman) */}
          {filteredMenunggu.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[#d4af37]/30 dark:border-[#d4af37]/15 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#06130D]/75 dark:text-slate-300">
              <div>
                Menampilkan <span className="font-bold text-[#06130D] dark:text-[#fdfbf7]">{startIndex + 1}</span>–<span className="font-bold text-[#06130D] dark:text-[#fdfbf7]">{endIndex}</span> dari{' '}
                <span className="font-bold text-[#06130D] dark:text-[#d4af37]">{filteredMenunggu.length}</span> pengajuan
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded-lg border border-[#d4af37]/30 dark:border-[#d4af37]/30 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-200 hover:bg-[#fdfbf7] hover:text-[#06130D] dark:hover:text-[#d4af37] disabled:opacity-35 transition-all font-semibold cursor-pointer disabled:cursor-not-allowed flex items-center gap-0.5 shadow-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Sebelumnya</span>
                </button>

                <span className="px-2.5 py-1 rounded-lg bg-[#fdfbf7] dark:bg-[#123524] border border-[#d4af37]/30 dark:border-[#d4af37]/40 text-[#06130D] dark:text-[#d4af37] font-bold">
                  {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 rounded-lg border border-[#d4af37]/30 dark:border-[#d4af37]/30 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-200 hover:bg-[#fdfbf7] hover:text-[#06130D] dark:hover:text-[#d4af37] disabled:opacity-35 transition-all font-semibold cursor-pointer disabled:cursor-not-allowed flex items-center gap-0.5 shadow-xs"
                >
                  <span>Selanjutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <Link
                href="/pengajuan"
                className="text-xs font-bold text-[#06130D] dark:text-[#d4af37] hover:underline inline-flex items-center gap-1"
              >
                <span>Buka Modul Pengajuan</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Kolom Kanan: Status Periode Akuntansi (1 Kolom) */}
        <div className="bg-white dark:bg-[#0b2419] rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-4 border-b border-[#d4af37]/20 dark:border-[#d4af37]/15">
              <div className="w-8 h-8 rounded-xl bg-[#fdfbf7] dark:bg-[#123524] text-[#06130D] dark:text-[#d4af37] flex items-center justify-center border border-[#d4af37]/30 dark:border-[#d4af37]/30 shadow-xs">
                <CalendarCheck2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-[#06130D] dark:text-[#fdfbf7] text-base">Status Periode Bulanan</h3>
                <p className="text-xs text-[#06130D]/70 dark:text-slate-400">Tutup buku berurutan</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {periodeList.map((per) => {
                const namaBulan = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(
                  new Date(per.tahun, per.bulan - 1, 1)
                );
                const isTutup = per.status === 'ditutup';

                return (
                  <div
                    key={per.id}
                    className="p-3 rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/15 bg-[#fdfbf7] dark:bg-[#081c15]/70 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#06130D] dark:text-[#fdfbf7]">
                        {namaBulan} {per.tahun}
                      </div>
                      <div className="text-[11px] text-[#06130D]/70 dark:text-slate-400 mt-0.5">
                        {isTutup
                          ? `Ditutup ${per.profiles?.nama_lengkap ? 'oleh ' + per.profiles.nama_lengkap : ''}`
                          : 'Terbuka untuk posting jurnal'}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isTutup
                          ? 'bg-[#fdfbf7] dark:bg-[#18231e] text-[#06130D]/60 dark:text-slate-400 border-[#d4af37]/30 dark:border-slate-600'
                          : 'bg-emerald-50 dark:bg-[#123524] text-emerald-800 dark:text-[#d4af37] border-emerald-200 dark:border-[#d4af37]/50'
                      }`}
                    >
                      {isTutup ? 'DITUTUP' : 'TERBUKA'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#d4af37]/30 dark:border-[#d4af37]/15">
            <Link
              href="/akun-periode"
              className="w-full py-2 px-3 rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/30 bg-white dark:bg-[#081c15] text-[#06130D] dark:text-[#d4af37] hover:bg-[#fdfbf7] dark:hover:bg-[#123524] text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-xs"
            >
              <span>Kelola Periode & Bagan Akun</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
