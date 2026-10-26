'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  BookOpen,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  SquarePen,
  RotateCcw,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
} from 'lucide-react';
import { Profile } from '@/types/database';

export interface JurnalRowBaris {
  id: number;
  debit: number;
  kredit: number;
  urutan: number;
  akun?: {
    id: number;
    kode: string;
    nama: string;
  } | null;
}

export interface JurnalRow {
  id: number;
  nomor: string | null;
  tanggal: string;
  keterangan: string;
  sumber: 'saldo_awal' | 'manual' | 'pengajuan' | 'pembalik' | 'impor_bank';
  status: 'draf' | 'diposting' | 'dibalik';
  pengajuan_id: number | null;
  jurnal_dibalik_id: number | null;
  dibuat_oleh: string;
  diposting_oleh: string | null;
  diposting_pada: string | null;
  dibuat_pada: string;
  jurnal_baris: JurnalRowBaris[];
  periode?: {
    id: number;
    tahun: number;
    bulan: number;
    status: 'terbuka' | 'ditutup';
  } | null;
  pembuat?: {
    id: string;
    nama_lengkap: string;
  } | null;
}

interface JurnalListClientProps {
  initialData: JurnalRow[];
  profile: Profile;
}

const ITEMS_PER_PAGE = 10;

function formatRupiah(val: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

function formatTanggalIndo(tglStr: string) {
  try {
    const d = new Date(tglStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return tglStr;
  }
}

export function JurnalListClient({ initialData, profile }: JurnalListClientProps) {
  const isAkuntan = profile.peran === 'akuntan';

  // State Filter & Pencarian
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('semua');
  const [selectedSumber, setSelectedSumber] = useState<string>('semua');
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');

  // Paginasi
  const [currentPage, setCurrentPage] = useState(1);

  // Filter Data
  const filteredData = useMemo(() => {
    return initialData.filter((item) => {
      // 1. Status Filter
      if (selectedStatus !== 'semua' && item.status !== selectedStatus) {
        return false;
      }

      // 2. Sumber Filter
      if (selectedSumber !== 'semua' && item.sumber !== selectedSumber) {
        return false;
      }

      // 3. Rentang Tanggal Filter
      if (tanggalMulai && item.tanggal < tanggalMulai) {
        return false;
      }
      if (tanggalSelesai && item.tanggal > tanggalSelesai) {
        return false;
      }

      // 4. Kata Kunci Pencarian (Nomor, Keterangan, Sumber, atau Nama Akun yang Terlibat)
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchNomor = item.nomor?.toLowerCase().includes(q);
        const matchKet = item.keterangan?.toLowerCase().includes(q);
        const matchSumber = item.sumber?.toLowerCase().includes(q);
        const matchPembuat = item.pembuat?.nama_lengkap?.toLowerCase().includes(q);
        const matchAkun = item.jurnal_baris?.some(
          (b) =>
            b.akun?.nama?.toLowerCase().includes(q) ||
            b.akun?.kode?.toLowerCase().includes(q)
        );

        if (!matchNomor && !matchKet && !matchSumber && !matchPembuat && !matchAkun) {
          return false;
        }
      }

      return true;
    });
  }, [initialData, selectedStatus, selectedSumber, tanggalMulai, tanggalSelesai, search]);

  // Reset nomor halaman saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedStatus, selectedSumber, tanggalMulai, tanggalSelesai]);

  // Data Terpaginasi
  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredData.length);
  const paginatedData = useMemo(() => {
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, startIndex, endIndex]);

  const resetFilter = () => {
    setSearch('');
    setSelectedStatus('semua');
    setSelectedSumber('semua');
    setTanggalMulai('');
    setTanggalSelesai('');
    setCurrentPage(1);
  };

  const isFilterActive =
    search ||
    selectedStatus !== 'semua' ||
    selectedSumber !== 'semua' ||
    tanggalMulai ||
    tanggalSelesai;

  // Hitung ringkasan statistik
  const totalJurnal = initialData.length;
  const totalDiposting = initialData.filter((j) => j.status === 'diposting').length;
  const totalDraf = initialData.filter((j) => j.status === 'draf').length;
  const totalDibalik = initialData.filter((j) => j.status === 'dibalik').length;

  return (
    <div className="space-y-6">
      {/* 1. Header & Statistik Ringkas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#d4af37]/30 dark:border-[#d4af37]/20">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#11301B] dark:text-[#fdfbf7] tracking-tight">
            Daftar Jurnal Umum
          </h1>
          <p className="text-xs sm:text-sm text-[#06130D]/70 dark:text-slate-300 mt-1 max-w-xl">
            Pencatatan kronologis debit dan kredit transaksi keuangan, jurnal draf, hingga jurnal pembalik.
          </p>
        </div>

        {isAkuntan && (
          <div>
            <Link
              href="/jurnal/baru"
              className="px-5 py-2.5 rounded-xl bg-[#06130D] hover:bg-[#0b2419] text-white border border-[#06130D] dark:border-[#d4af37] text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Buat Jurnal Baru</span>
            </Link>
          </div>
        )}
      </div>

      {/* 2. Kartu Ringkasan Status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#0b2419] p-4 rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs">
          <div className="flex items-center justify-between text-[#06130D]/70 dark:text-slate-400 text-xs">
            <span>Total Jurnal</span>
            <BookOpen className="w-4 h-4 text-[#06130D]/60 dark:text-[#d4af37]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#06130D] dark:text-[#fdfbf7] mt-1.5 font-mono">
            {totalJurnal}
          </div>
        </div>

        <div className="bg-white dark:bg-[#0b2419] p-4 rounded-xl border border-emerald-500/30 dark:border-emerald-500/30 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 text-xs">
            <span>Diposting</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-1.5 font-mono">
            {totalDiposting}
          </div>
        </div>

        <div className="bg-white dark:bg-[#0b2419] p-4 rounded-xl border border-amber-500/30 dark:border-amber-500/30 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 dark:text-[#f3c853] text-xs">
            <span>Draf</span>
            <Clock className="w-4 h-4 text-amber-600 dark:text-[#f3c853]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-700 dark:text-[#f3c853] mt-1.5 font-mono">
            {totalDraf}
          </div>
        </div>

        <div className="bg-white dark:bg-[#0b2419] p-4 rounded-xl border border-rose-500/30 dark:border-rose-500/30 shadow-xs">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-300 text-xs">
            <span>Dibalik (Reversed)</span>
            <ArrowRightLeft className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-rose-700 dark:text-rose-300 mt-1.5 font-mono">
            {totalDibalik}
          </div>
        </div>
      </div>

      {/* 3. Panel Filter & Pencarian Cepat */}
      <div className="bg-white dark:bg-[#0b2419] p-4 sm:p-5 rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-end">
          {/* A. Pencarian Keyword */}
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#06130D] dark:text-[#d4af37] mb-1.5">
              Pencarian Jurnal
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[#06130D]/60 dark:text-[#d4af37] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nomor JU, keterangan, akun..."
                className="w-full pl-9 pr-9 py-2 text-xs rounded-xl bg-white dark:bg-[#06150f] border border-[#d4af37]/30 dark:border-[#d4af37]/30 text-[#06130D] dark:text-slate-100 placeholder:text-[#06130D]/30 dark:placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] transition-all shadow-xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* B. Date Picker Rentang Waktu */}
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#06130D] dark:text-[#d4af37] mb-1.5">
              Rentang Tanggal Jurnal
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <input
                  type="date"
                  value={tanggalMulai}
                  onChange={(e) => setTanggalMulai(e.target.value)}
                  onClick={(e) => {
                    try {
                      e.currentTarget.showPicker?.();
                    } catch {}
                  }}
                  className="w-full p-2 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/30 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] cursor-pointer [color-scheme:light] dark:[color-scheme:dark] shadow-xs"
                  title="Tanggal Mulai"
                />
                <Calendar className="w-3.5 h-3.5 text-[#06130D]/60 dark:text-[#d4af37] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative">
                <input
                  type="date"
                  value={tanggalSelesai}
                  onChange={(e) => setTanggalSelesai(e.target.value)}
                  onClick={(e) => {
                    try {
                      e.currentTarget.showPicker?.();
                    } catch {}
                  }}
                  className="w-full p-2 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/30 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] cursor-pointer [color-scheme:light] dark:[color-scheme:dark] shadow-xs"
                  title="Tanggal Selesai"
                />
                <Calendar className="w-3.5 h-3.5 text-[#06130D]/60 dark:text-[#d4af37] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* C. Filter Status */}
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#06130D] dark:text-[#d4af37] mb-1.5">
              Status Jurnal
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full p-2 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/30 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] cursor-pointer shadow-xs"
            >
              <option value="semua">Semua Status</option>
              <option value="diposting">Diposting</option>
              <option value="draf">Draf</option>
              <option value="dibalik">Dibalik</option>
            </select>
          </div>

          {/* D. Filter Sumber */}
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#06130D] dark:text-[#d4af37] mb-1.5">
              Sumber Jurnal
            </label>
            <select
              value={selectedSumber}
              onChange={(e) => setSelectedSumber(e.target.value)}
              className="w-full p-2 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/30 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] cursor-pointer shadow-xs"
            >
              <option value="semua">Semua Sumber</option>
              <option value="manual">Manual</option>
              <option value="pengajuan">Pengajuan Biaya</option>
              <option value="pembalik">Jurnal Pembalik</option>
              <option value="saldo_awal">Saldo Awal</option>
            </select>
          </div>
        </div>

        {/* Status Filter Aktif & Reset */}
        {isFilterActive && (
          <div className="pt-2 border-t border-[#d4af37]/30 dark:border-[#d4af37]/15 flex items-center justify-between text-xs">
            <span className="text-[#06130D]/70 dark:text-slate-300">
              Menemukan <strong className="text-[#06130D] dark:text-[#f3c853]">{filteredData.length}</strong> jurnal sesuai filter
            </span>
            <button
              type="button"
              onClick={resetFilter}
              className="inline-flex items-center gap-1.5 text-xs text-[#06130D] dark:text-[#d4af37] hover:underline font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. Tabel Daftar Jurnal Umum */}
      <div className="bg-white dark:bg-[#0b2419] rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs overflow-hidden">
        {filteredData.length === 0 ? (
          <div className="py-20 text-center text-[#06130D]/60 dark:text-slate-400">
            <BookOpen className="w-12 h-12 mx-auto text-[#06130D]/40 dark:text-[#d4af37]/40 mb-3" />
            <p className="text-base font-bold text-[#06130D] dark:text-slate-200">Tidak ada jurnal ditemukan</p>
            <p className="text-xs text-[#06130D]/60 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {isFilterActive
                ? 'Coba atur ulang kata kunci pencarian, rentang tanggal, atau status filter Anda.'
                : 'Belum ada catatan jurnal umum yang tersimpan.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#fdfbf7] dark:bg-[#081c15] text-[#06130D]/80 dark:text-[#d4af37] uppercase text-[10px] font-bold tracking-wider border-b border-[#d4af37]/30 dark:border-[#d4af37]/20">
                <tr>
                  <th className="py-3.5 px-4">No. Jurnal</th>
                  <th className="py-3.5 px-3">Tanggal</th>
                  <th className="py-3.5 px-4">Keterangan</th>
                  <th className="py-3.5 px-3 text-center">Sumber</th>
                  <th className="py-3.5 px-4 text-right">Total Debit / Kredit</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d4af37]/20 dark:divide-[#d4af37]/10 text-[#06130D] dark:text-slate-200">
                {paginatedData.map((item) => {
                  // Hitung total debit dari baris jurnal
                  const totalDebit = item.jurnal_baris.reduce(
                    (acc, b) => acc + Number(b.debit || 0),
                    0
                  );

                  // Sumber Badge
                  const sumberBadgeStyle = {
                    manual: 'bg-[#fdfbf7] dark:bg-[#123524] text-[#06130D] dark:text-[#d4af37] border-[#d4af37]/30',
                    pengajuan: 'bg-sky-50 dark:bg-[#0e2c38] text-sky-800 dark:text-sky-200 border-sky-200 dark:border-sky-400/40',
                    pembalik: 'bg-amber-50 dark:bg-[#2d1b0d] text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-400/40',
                    saldo_awal: 'bg-purple-50 dark:bg-[#251838] text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-400/40',
                    impor_bank: 'bg-teal-50 dark:bg-[#1a2d24] text-teal-800 dark:text-teal-200 border-teal-200 dark:border-teal-400/40',
                  }[item.sumber] || 'bg-[#fdfbf7] dark:bg-[#123524] text-[#06130D]/70 dark:text-slate-300 border-[#d4af37]/30 dark:border-slate-700';

                  // Status Badge
                  const statusBadgeStyle = {
                    diposting: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/40',
                    draf: 'bg-amber-50 dark:bg-amber-950/70 text-amber-900 dark:text-[#f3c853] border-amber-200 dark:border-amber-500/40',
                    dibalik: 'bg-rose-50 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-500/40',
                  }[item.status] || 'bg-[#fdfbf7] dark:bg-slate-900 text-[#06130D]/70 dark:text-slate-300 border-[#d4af37]/30 dark:border-slate-700';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[#fdfbf7]/80 dark:hover:bg-[#123524]/50 transition-colors group"
                    >
                      {/* Nomor Jurnal */}
                      <td className="py-3.5 px-4 font-mono font-bold whitespace-nowrap">
                        {item.nomor ? (
                          <Link
                            href={`/jurnal/${item.id}`}
                            className="text-[#06130D] dark:text-[#f3c853] hover:underline flex items-center gap-1.5"
                          >
                            <span>{item.nomor}</span>
                          </Link>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-400/90 italic font-sans text-[11px]">
                            Draf (Belum Bernomor)
                          </span>
                        )}
                      </td>

                      {/* Tanggal */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-[#06130D]/70 dark:text-slate-300 font-mono">
                        {formatTanggalIndo(item.tanggal)}
                      </td>

                      {/* Keterangan */}
                      <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                        <div className="font-semibold text-[#06130D] dark:text-slate-100 line-clamp-1">
                          {item.keterangan}
                        </div>
                        <div className="text-[11px] text-[#06130D]/60 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>{item.jurnal_baris.length} baris akun</span>
                          {item.pembuat && (
                            <>
                              <span>•</span>
                              <span>Oleh: {item.pembuat.nama_lengkap}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Sumber */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${sumberBadgeStyle}`}
                        >
                          {item.sumber === 'saldo_awal' ? 'Saldo Awal' : item.sumber}
                        </span>
                      </td>

                      {/* Total Debit/Kredit */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#06130D] dark:text-slate-100 whitespace-nowrap">
                        {formatRupiah(totalDebit)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusBadgeStyle}`}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/jurnal/${item.id}`}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#d4af37]/30 dark:border-[#d4af37]/35 bg-white dark:bg-[#071c15] hover:bg-[#fdfbf7] dark:hover:bg-[#0b2419] transition-all duration-200 cursor-pointer shadow-xs"
                            title="Lihat Rincian Jurnal"
                          >
                            <Eye className="w-4 h-4 text-[#06130D] dark:text-[#d4af37]" />
                          </Link>

                          {isAkuntan && item.status === 'draf' && (
                            <Link
                              href={`/jurnal/${item.id}/ubah`}
                              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#d4af37]/30 dark:border-[#d4af37]/35 bg-white dark:bg-[#071c15] hover:bg-[#fdfbf7] dark:hover:bg-[#0b2419] transition-all duration-200 cursor-pointer shadow-xs"
                              title="Ubah Jurnal Draf"
                            >
                              <SquarePen className="w-4 h-4 text-[#06130D] dark:text-[#d4af37]" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Kontrol Paginasi (Maksimal 10 Baris per Halaman) */}
        {filteredData.length > 0 && (
          <div className="p-4 border-t border-[#d4af37]/30 dark:border-[#d4af37]/20 bg-[#fdfbf7] dark:bg-[#081c15] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#06130D]/70 dark:text-slate-400">
            <span>
              Menampilkan{' '}
              <strong className="text-[#06130D] dark:text-slate-200">
                {startIndex + 1} - {endIndex}
              </strong>{' '}
              dari <strong className="text-[#06130D] dark:text-[#d4af37]">{filteredData.length}</strong> jurnal
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/30 bg-white dark:bg-[#071c15] text-[#06130D] dark:text-slate-300 hover:text-[#06130D] dark:hover:text-[#d4af37] hover:bg-[#fdfbf7] dark:hover:bg-[#123524] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Sebelumnya</span>
              </button>

              <span className="px-3 py-1.5 font-bold font-mono text-[#06130D] dark:text-[#d4af37] bg-white dark:bg-[#06150f] rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/20">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/30 bg-white dark:bg-[#071c15] text-[#06130D] dark:text-slate-300 hover:text-[#06130D] dark:hover:text-[#d4af37] hover:bg-[#fdfbf7] dark:hover:bg-[#123524] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
