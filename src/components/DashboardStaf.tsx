'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  ChevronRight,
  ChevronLeft,
  Info,
  Sparkles,
  Search,
  Calendar,
  RotateCcw,
  Eye,
  SquarePen,
  X,
} from 'lucide-react';
import { formatRupiah, formatTanggalIndo, formatTeksPuebi } from '@/lib/utils';
import { Profile } from '@/types/database';

export interface StafPengajuanItem {
  id: number;
  nomor: string;
  jenis: 'reimburse' | 'pengeluaran';
  status: string;
  jumlah: number;
  keterangan: string;
  tanggal_transaksi: string;
  catatan_peninjau: string | null;
  bukti_path: string | null;
  dibuat_pada: string;
}

interface DashboardStafProps {
  profile: Profile;
  pengajuanList: StafPengajuanItem[];
}

export function DashboardStaf({ profile, pengajuanList }: DashboardStafProps) {
  const [search, setSearch] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('semua');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Filter Data
  const filteredList = useMemo(() => {
    return pengajuanList.filter((item) => {
      // 1. Pencarian (Nomor Dokumen & Keperluan)
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchNomor = item.nomor?.toLowerCase().includes(q);
        const matchKet = item.keterangan?.toLowerCase().includes(q);
        if (!matchNomor && !matchKet) return false;
      }

      // 2. Status
      if (selectedStatus !== 'semua' && item.status !== selectedStatus) {
        return false;
      }

      // 3. Rentang Tanggal
      if (tanggalMulai && item.tanggal_transaksi < tanggalMulai) {
        return false;
      }
      if (tanggalSelesai && item.tanggal_transaksi > tanggalSelesai) {
        return false;
      }

      return true;
    });
  }, [pengajuanList, search, selectedStatus, tanggalMulai, tanggalSelesai]);

  // Reset nomor halaman saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedStatus, tanggalMulai, tanggalSelesai]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredList.length);
  const paginatedList = useMemo(() => {
    return filteredList.slice(startIndex, endIndex);
  }, [filteredList, startIndex, endIndex]);

  const totalPengajuan = pengajuanList.length;
  const totalNominal = pengajuanList.reduce((acc, curr) => acc + Number(curr.jumlah), 0);
  const drafList = pengajuanList.filter((p) => p.status === 'draf');

  const dalamProsesList = pengajuanList.filter((p) =>
    ['diajukan', 'menunggu_direktur', 'disetujui'].includes(p.status)
  );
  const perluRevisiList = pengajuanList.filter((p) => p.status === 'perlu_revisi');
  const dibayarList = pengajuanList.filter((p) => p.status === 'dibayar');

  return (
    <div className="space-y-6">
      {/* 1. Header Ringkas Dasbor Staf */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D3BC5F]/30 dark:border-[#D3BC5F]/20">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#11301B] dark:text-[#fdfbf7]">
            Operasional & Klaim Biaya
          </h1>
          <p className="text-[#11301B]/75 dark:text-slate-400 text-xs mt-0.5">
            Daftar pengeluaran dan status persetujuan klaim operasional Anda
          </p>
        </div>

        <div>
          <Link
            href="/pengajuan/baru"
            className="px-4 py-2 rounded-xl bg-[#11301B] hover:bg-[#11301B]/90 text-[#E4C588] border border-[#D3BC5F] text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Buat Pengajuan Baru</span>
          </Link>
        </div>
      </div>

      {/* 2. Kartu Statistik Pengajuan Pribadi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Pengajuan */}
        <div className="bg-[#F7F7ED] dark:bg-[#0b2419] p-5 rounded-2xl border border-[#D3BC5F]/40 dark:border-[#D3BC5F]/25 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#11301B]/80 dark:text-[#D3BC5F]">
              Total Dokumen
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#ECE4B7]/40 dark:bg-[#123524] text-[#11301B] dark:text-[#D3BC5F] flex items-center justify-center border border-[#D3BC5F]/40 dark:border-[#D3BC5F]/30">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-[#11301B] dark:text-[#fdfbf7] tracking-tight">
              {totalPengajuan} <span className="text-xs font-normal text-gray-500 dark:text-slate-400">dokumen</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 font-medium">
              Total nilai: <span className="text-[#11301B] dark:text-[#f3c853] font-bold">{formatRupiah(totalNominal)}</span>
            </p>
          </div>
        </div>

        {/* Draf Tersimpan */}
        <div className="bg-[#F7F7ED] dark:bg-[#0b2419] p-5 rounded-2xl border border-[#D3BC5F]/40 dark:border-slate-700/60 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#11301B]/80 dark:text-slate-400">
              Draf Tersimpan
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#ECE4B7]/40 dark:bg-[#18231e] text-[#11301B] dark:text-slate-300 flex items-center justify-center border border-[#D3BC5F]/40 dark:border-slate-700">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-[#11301B] dark:text-slate-200 tracking-tight">
              {drafList.length} <span className="text-xs font-normal text-gray-500 dark:text-slate-400">draf</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">
              {drafList.length > 0 ? 'Siap dilengkapi & dikirim' : 'Belum ada draf'}
            </p>
          </div>
        </div>

        {/* Dalam Proses */}
        <div className="bg-[#F7F7ED] dark:bg-[#0b2419] p-5 rounded-2xl border border-[#D3BC5F]/40 dark:border-sky-500/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#11301B]/80 dark:text-[#D3BC5F]">
              Sedang Diproses
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-[#0e2c38] text-sky-700 dark:text-sky-300 flex items-center justify-center border border-sky-200 dark:border-sky-500/30">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-[#11301B] dark:text-sky-400 tracking-tight">
              {dalamProsesList.length} <span className="text-xs font-normal text-gray-500 dark:text-slate-400">pengajuan</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">
              Menunggu verifikasi Akuntan / Direktur
            </p>
          </div>
        </div>

        {/* Perlu Revisi */}
        <div className="bg-[#F7F7ED] dark:bg-[#0b2419] p-5 rounded-2xl border border-[#D3BC5F]/40 dark:border-amber-500/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#11301B]/80 dark:text-[#D3BC5F]">
              Perlu Revisi
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-[#322312] text-amber-700 dark:text-amber-300 flex items-center justify-center border border-amber-200 dark:border-amber-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className={`text-2xl font-extrabold tracking-tight ${perluRevisiList.length > 0 ? 'text-amber-700 dark:text-[#f3c853]' : 'text-[#11301B] dark:text-slate-200'}`}>
              {perluRevisiList.length} <span className="text-xs font-normal text-gray-500 dark:text-slate-400">pengajuan</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">
              {perluRevisiList.length > 0 ? 'Perlu perbaikan data / nota' : 'Tidak ada revisi pending'}
            </p>
          </div>
        </div>

        {/* Selesai Dibayar */}
        <div className="bg-[#F7F7ED] dark:bg-[#0b2419] p-5 rounded-2xl border border-[#D3BC5F]/40 dark:border-emerald-500/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#11301B]/80 dark:text-[#D3BC5F]">
              Selesai Dibayar
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-[#0e3522] text-emerald-700 dark:text-emerald-300 flex items-center justify-center border border-emerald-200 dark:border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-[#11301B] dark:text-emerald-400 tracking-tight">
              {dibayarList.length} <span className="text-xs font-normal text-gray-500 dark:text-slate-400">pengajuan</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">
              Dana sudah dicairkan & terjurnal
            </p>
          </div>
        </div>
      </div>

      {/* 3. Banner Panduan Aturan Pengajuan Nuansa Keraton */}
      <div className="bg-[#F7F7ED] dark:bg-[#0b2419] border border-[#D3BC5F]/40 dark:border-[#D3BC5F]/35 rounded-2xl p-4 sm:p-5 text-[#11301B] dark:text-slate-200 flex items-start gap-3.5 shadow-xs">
        <Info className="w-5 h-5 shrink-0 text-[#11301B] dark:text-[#D3BC5F] mt-0.5" />
        <div className="text-xs leading-relaxed">
          <span className="font-bold text-[#11301B] dark:text-[#D3BC5F]">Ketentuan Pengajuan Biaya:</span>
          <ul className="list-disc list-inside mt-1 space-y-0.5 text-gray-600 dark:text-slate-300">
            <li>Nominal pengajuan antara <strong className="text-[#11301B] dark:text-[#fdfbf7]">Rp10.000</strong> sampai <strong className="text-[#11301B] dark:text-[#fdfbf7]">Rp25.000.000</strong> (rupiah bulat).</li>
            <li>Wajib mengunggah foto nota fisik asli (format JPG, PNG, atau PDF, maksimal 5 MB).</li>
            <li>Tanggal nota tidak boleh di masa depan dan maksimal 30 hari ke belakang.</li>
          </ul>
        </div>
      </div>

      {/* 4. Tabel Riwayat Pengajuan Milik Staf */}
      <div className="bg-[#F7F7ED] dark:bg-[#0b2419] rounded-2xl border border-[#D3BC5F]/40 dark:border-[#D3BC5F]/25 shadow-xs p-6 flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#D3BC5F]/30 dark:border-[#D3BC5F]/15 gap-2">
            <div>
              <h3 className="font-bold text-[#11301B] dark:text-[#fdfbf7] text-base">
                Riwayat Pengajuan Pribadi Anda
              </h3>
              <p className="text-xs text-[#11301B]/75 dark:text-slate-400">
                Daftar seluruh klaim reimburse & pengeluaran yang pernah Anda buat
              </p>
            </div>

            <Link
              href="/pengajuan/baru"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E4C588] bg-[#11301B] hover:bg-[#11301B]/90 border border-[#D3BC5F] px-3.5 py-1.5 rounded-xl shadow-xs transition-all w-fit cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Pengajuan Baru</span>
            </Link>
          </div>

          {/* Filter & Kolom Pencarian Dasbor Staf */}
          <div className="my-3 space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-[#11301B]/50 dark:text-[#D3BC5F]/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nomor dokumen pengajuan atau keperluan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-[#D3BC5F]/40 dark:border-[#D3BC5F]/25 bg-white dark:bg-[#06150f] text-[#11301B] dark:text-slate-100 placeholder:text-[#11301B]/40 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#D3BC5F] dark:focus:ring-[#D3BC5F] shadow-xs transition-all"
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
                  <Calendar className="w-3.5 h-3.5 text-gray-500 dark:text-[#d4af37]" />
                  <span className="text-gray-500 dark:text-slate-400">Dari:</span>
                  <input
                    type="date"
                    value={tanggalMulai}
                    onChange={(e) => setTanggalMulai(e.target.value)}
                    className="bg-transparent text-gray-900 dark:text-slate-200 text-xs focus:outline-none cursor-pointer dark:[color-scheme:dark]"
                    title="Tanggal Mulai"
                  />
                  <span className="text-gray-400 dark:text-slate-500">s/d</span>
                  <span className="text-gray-500 dark:text-slate-400">Sampai:</span>
                  <input
                    type="date"
                    value={tanggalSelesai}
                    onChange={(e) => setTanggalSelesai(e.target.value)}
                    className="bg-transparent text-gray-900 dark:text-slate-200 text-xs focus:outline-none cursor-pointer dark:[color-scheme:dark]"
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
                  className="text-[11px] text-[#06130D] dark:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer self-end sm:self-auto font-semibold"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>
          </div>

          {filteredList.length === 0 ? (
            <div className="py-14 text-center text-gray-500 dark:text-slate-400">
              <Receipt className="w-10 h-10 mx-auto text-gray-400 dark:text-slate-600 mb-2.5" />
              <p className="text-sm font-bold text-gray-900 dark:text-slate-300">
                {search || tanggalMulai || tanggalSelesai ? 'Tidak ada pengajuan ditemukan' : 'Belum ada pengajuan'}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {search || tanggalMulai || tanggalSelesai
                  ? 'Coba atur ulang kata kunci pencarian atau rentang tanggal Anda.'
                  : 'Anda belum pernah membuat pengajuan reimburse atau pengeluaran. Tekan tombol di atas untuk membuat yang pertama.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto mt-1 border border-[#d4af37]/30 dark:border-[#d4af37]/20 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#fdfbf7] dark:bg-[#071c15] border-b border-[#d4af37]/30 dark:border-[#d4af37]/20">
                  <tr className="text-[#06130D]/75 dark:text-[#d4af37]/80 uppercase text-[10px] font-bold tracking-wider">
                    <th className="py-3 px-3">No. Pengajuan</th>
                    <th className="py-3 px-3">Tgl Nota</th>
                    <th className="py-3 px-3">Jenis</th>
                    <th className="py-3 px-3">Keperluan</th>
                    <th className="py-3 px-3 text-right">Jumlah</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Catatan Peninjau</th>
                    <th className="py-3 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d4af37]/15 dark:divide-[#d4af37]/10 text-[#06130D] dark:text-slate-200">
                  {paginatedList.map((item) => {
                    const badgeStatus = {
                      draf: 'bg-gray-100 dark:bg-[#18231e] text-gray-700 dark:text-slate-400 border-gray-300 dark:border-slate-700',
                      diajukan: 'bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-500/40 font-semibold',
                      menunggu_direktur: 'bg-purple-50 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-500/40 font-semibold',
                      disetujui: 'bg-emerald-50 dark:bg-[#123524] text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/40 font-semibold',
                      dibayar: 'bg-emerald-100 dark:bg-[#0f2e1f] text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/50 font-bold',
                      perlu_revisi: 'bg-amber-50 dark:bg-amber-950/80 text-amber-900 dark:text-[#f3c853] border-amber-200 dark:border-amber-500/50 font-bold',
                      ditolak: 'bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-500/40 font-semibold',
                      dibatalkan: 'bg-gray-100 dark:bg-[#18231e] text-gray-500 border-gray-300 dark:border-slate-800',
                    }[item.status] || 'bg-gray-100 dark:bg-[#081c15] text-gray-700 dark:text-slate-300 border-gray-300 dark:border-slate-700';

                    const labelStatus = {
                      draf: 'Draf',
                      diajukan: 'Diajukan',
                      menunggu_direktur: 'Menunggu Direktur',
                      disetujui: 'Disetujui',
                      dibayar: 'Dibayar',
                      perlu_revisi: 'Perlu Revisi',
                      ditolak: 'Ditolak',
                      dibatalkan: 'Dibatalkan',
                    }[item.status] || item.status;

                    return (
                      <tr key={item.id} className="hover:bg-[#fdfbf7] dark:hover:bg-[#102d20]/60 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-[#06130D] dark:text-[#fdfbf7]">
                          <Link href={`/pengajuan/${item.id}`} className="hover:text-[#06130D] dark:hover:text-[#d4af37] underline decoration-[#d4af37]/40">
                            {item.nomor}
                          </Link>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-[#06130D]/80 dark:text-slate-300">
                          {formatTanggalIndo(item.tanggal_transaksi)}
                        </td>
                        <td className="py-3 px-3 capitalize">
                          <span className="bg-[#fdfbf7] dark:bg-[#081c15] border border-[#d4af37]/30 dark:border-[#d4af37]/20 px-2 py-0.5 rounded text-[11px] font-medium text-[#06130D] dark:text-slate-300 shadow-xs">
                            {item.jenis}
                          </span>
                        </td>
                        <td className="py-3 px-3 max-w-[200px] truncate text-gray-600 dark:text-slate-300" title={item.keterangan}>
                          {item.keterangan}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-[#06130D] dark:text-[#fdfbf7] whitespace-nowrap">
                          {formatRupiah(item.jumlah)}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] border ${badgeStatus}`}>
                            {labelStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center max-w-[140px] truncate">
                          {item.catatan_peninjau ? (
                            <span className="text-amber-800 dark:text-[#f3c853] bg-amber-50 dark:bg-[#221708] px-2 py-0.5 rounded border border-amber-200 dark:border-[#d4af37]/30 text-[11px] block truncate" title={item.catatan_peninjau}>
                              {item.catatan_peninjau}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-slate-500">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              href={`/pengajuan/${item.id}`}
                              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#d4af37]/30 dark:border-[#d4af37]/35 bg-[#fdfbf7] dark:bg-[#071c15] hover:bg-white dark:hover:bg-[#0b2419] transition-all duration-200 cursor-pointer shadow-xs"
                              title="Lihat Detail Pengajuan"
                            >
                              <Eye className="w-4 h-4 text-gray-700 dark:text-[#d4af37]" />
                            </Link>

                            {(item.status === 'draf' || item.status === 'perlu_revisi') && (
                              <Link
                                href={`/pengajuan/${item.id}/ubah`}
                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#d4af37]/30 dark:border-[#d4af37]/35 bg-[#fdfbf7] dark:bg-[#071c15] hover:bg-white dark:hover:bg-[#0b2419] transition-all duration-200 cursor-pointer shadow-xs"
                                title="Ubah Pengajuan"
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
        </div>

        {/* Kontrol Paginasi Tabel Dasbor Staf (Maks. 10 baris per halaman) */}
        {filteredList.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[#d4af37]/30 dark:border-[#d4af37]/15 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#06130D]/75 dark:text-slate-300">
            <div>
              Menampilkan <span className="font-bold text-[#06130D] dark:text-[#fdfbf7]">{startIndex + 1}</span>–<span className="font-bold text-[#06130D] dark:text-[#fdfbf7]">{endIndex}</span> dari{' '}
              <span className="font-bold text-[#06130D] dark:text-[#d4af37]">{filteredList.length}</span> pengajuan
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
              <span>Lihat Seluruh Pengajuan</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
