'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Eye,
  SquarePen,
  ArrowUpDown,
  User,
  X
} from 'lucide-react';
import { formatRupiah, formatTanggalIndo, formatTeksPuebi } from '@/lib/utils';
import { Profile } from '@/types/database';

export interface PengajuanRow {
  id: number;
  nomor: string;
  pengaju_id: string;
  jenis: 'reimburse' | 'pengeluaran';
  tanggal_transaksi: string;
  akun_beban_id: number;
  jumlah: number;
  keterangan: string;
  bukti_path: string | null;
  status: string;
  catatan_peninjau: string | null;
  diajukan_pada: string | null;
  diverifikasi_oleh: string | null;
  disetujui_oleh: string | null;
  akun_kas_id: number | null;
  dibayar_oleh: string | null;
  dibayar_pada: string | null;
  dibuat_pada: string;
  pengaju?: {
    nama_lengkap: string;
    email: string;
    peran: string;
  } | null;
  akun_beban?: {
    kode: string;
    nama: string;
  } | null;
  akun_kas?: {
    kode: string;
    nama: string;
  } | null;
}

interface PeriodeOption {
  id: number;
  tahun: number;
  bulan: number;
  status: string;
}

interface PengajuanListClientProps {
  profile: Profile;
  initialPengajuan: PengajuanRow[];
  periodeList: PeriodeOption[];
}

export function PengajuanListClient({
  profile,
  initialPengajuan,
  periodeList,
}: PengajuanListClientProps) {
  const isDirektur = profile.peran === 'direktur';
  const isFinance = profile.peran === 'direktur' || profile.peran === 'akuntan';

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('semua');
  const [selectedJenis, setSelectedJenis] = useState('semua');
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');

  // Konfigurasi Paginasi (Maksimal 10 Baris per Halaman)
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  // Filter Data
  const filteredData = useMemo(() => {
    return initialPengajuan.filter((item) => {
      // 1. Filter Pencarian (Nomor Dokumen, Nama Pengaju, Keperluan, Akun Beban)
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchNomor = item.nomor?.toLowerCase().includes(query);
        const matchKet = item.keterangan?.toLowerCase().includes(query);
        const matchNama = item.pengaju?.nama_lengkap?.toLowerCase().includes(query);
        const matchBeban =
          item.akun_beban?.nama?.toLowerCase().includes(query) ||
          item.akun_beban?.kode?.toLowerCase().includes(query);
        if (!matchNomor && !matchKet && !matchNama && !matchBeban) return false;
      }

      // 2. Filter Status
      if (selectedStatus !== 'semua' && item.status !== selectedStatus) {
        return false;
      }

      // 3. Filter Jenis
      if (selectedJenis !== 'semua' && item.jenis !== selectedJenis) {
        return false;
      }

      // 4. Filter Rentang Tanggal Transaksi (Date Picker)
      if (tanggalMulai && item.tanggal_transaksi < tanggalMulai) {
        return false;
      }
      if (tanggalSelesai && item.tanggal_transaksi > tanggalSelesai) {
        return false;
      }

      return true;
    });
  }, [initialPengajuan, search, selectedStatus, selectedJenis, tanggalMulai, tanggalSelesai]);

  // Reset nomor halaman ke halaman 1 saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedStatus, selectedJenis, tanggalMulai, tanggalSelesai]);

  // Hitung Data Halaman Terpilih
  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredData.length);
  const paginatedData = useMemo(() => {
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, startIndex, endIndex]);

  // Statistik Ringkas
  const stats = useMemo(() => {
    const total = filteredData.length;
    const nominal = filteredData.reduce((acc, curr) => acc + Number(curr.jumlah), 0);
    const draf = filteredData.filter((p) => p.status === 'draf').length;
    const pending = filteredData.filter((p) =>
      ['diajukan', 'menunggu_direktur'].includes(p.status)
    ).length;
    const siapBayar = filteredData.filter((p) => p.status === 'disetujui').length;
    const dibayar = filteredData.filter((p) => p.status === 'dibayar').length;
    const perluRevisi = filteredData.filter((p) => p.status === 'perlu_revisi').length;

    return { total, nominal, draf, pending, siapBayar, dibayar, perluRevisi };
  }, [filteredData]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Tombol Aksi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#d4af37]/30 dark:border-[#d4af37]/20">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#06130D] dark:text-[#fdfbf7] font-serif tracking-tight">
            Daftar Pengajuan Biaya
          </h1>
          <p className="text-xs sm:text-sm text-[#06130D]/70 dark:text-slate-300 mt-1">
            {isFinance
              ? 'Kelola alur persetujuan bertingkat, verifikasi bukti nota, dan eksekusi pembayaran kas/bank.'
              : 'Pantau status pencairan reimburse dan pengeluaran operasional Anda secara real-time.'}
          </p>
        </div>

        {/* Tombol Buat Pengajuan (Hanya untuk Staf & Akuntan) */}
        {!isDirektur && (
          <div>
            <Link
              href="/pengajuan/baru"
              className="px-4 py-2.5 rounded-xl bg-[#06130D] hover:bg-[#0b2419] text-white border border-[#06130D] dark:border-[#d4af37] text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Buat Pengajuan Baru</span>
            </Link>
          </div>
        )}
      </div>

      {/* 2. Kartu Metrik Ringkas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total */}
        <button
          type="button"
          onClick={() => setSelectedStatus('semua')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedStatus === 'semua'
              ? 'bg-[#fdfbf7] dark:bg-[#123524] border-[#06130D] dark:border-[#d4af37] shadow-xs'
              : 'bg-white dark:bg-[#0b2419] border-[#d4af37]/30 dark:border-[#d4af37]/25 hover:border-[#d4af37] shadow-xs'
          }`}
        >
          <div className="text-[10px] font-bold uppercase text-[#06130D]/70 dark:text-[#d4af37]">Total Semua</div>
          <div className="text-lg sm:text-xl font-extrabold text-[#06130D] dark:text-[#fdfbf7] mt-0.5">{stats.total}</div>
          <div className="text-[10px] text-[#06130D]/60 dark:text-slate-300 truncate">{formatRupiah(stats.nominal)}</div>
        </button>

        {/* Draf */}
        <button
          type="button"
          onClick={() => setSelectedStatus('draf')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedStatus === 'draf'
              ? 'bg-[#fdfbf7] dark:bg-[#1a2b22] border-[#d4af37] shadow-xs'
              : 'bg-white dark:bg-[#0b2419] border-[#d4af37]/30 dark:border-slate-700/60 hover:border-[#d4af37] shadow-xs'
          }`}
        >
          <div className="text-[10px] font-bold uppercase text-[#06130D]/70 dark:text-slate-400">Draf</div>
          <div className="text-lg sm:text-xl font-extrabold text-[#06130D] dark:text-slate-300 mt-0.5">{stats.draf}</div>
          <div className="text-[10px] text-[#06130D]/60 dark:text-slate-400">Belum diajukan</div>
        </button>

        {/* Menunggu Review */}
        <button
          type="button"
          onClick={() => setSelectedStatus(selectedStatus === 'diajukan' ? 'menunggu_direktur' : 'diajukan')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            ['diajukan', 'menunggu_direktur'].includes(selectedStatus)
              ? 'bg-blue-50 dark:bg-[#0f2d3d] border-blue-400 shadow-xs'
              : 'bg-white dark:bg-[#0b2419] border-[#d4af37]/30 dark:border-blue-500/30 hover:border-blue-300 shadow-xs'
          }`}
        >
          <div className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-300">Menunggu Review</div>
          <div className="text-lg sm:text-xl font-extrabold text-blue-700 dark:text-blue-400 mt-0.5">{stats.pending}</div>
          <div className="text-[10px] text-[#06130D]/60 dark:text-slate-300">Verifikasi/Direktur</div>
        </button>

        {/* Siap Dibayar */}
        <button
          type="button"
          onClick={() => setSelectedStatus('disetujui')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedStatus === 'disetujui'
              ? 'bg-emerald-50 dark:bg-[#123524] border-emerald-400 shadow-xs'
              : 'bg-white dark:bg-[#0b2419] border-[#d4af37]/30 dark:border-emerald-500/30 hover:border-emerald-300 shadow-xs'
          }`}
        >
          <div className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">Siap Dibayar</div>
          <div className="text-lg sm:text-xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5">{stats.siapBayar}</div>
          <div className="text-[10px] text-[#06130D]/60 dark:text-slate-300">Disetujui</div>
        </button>

        {/* Selesai Dibayar */}
        <button
          type="button"
          onClick={() => setSelectedStatus('dibayar')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedStatus === 'dibayar'
              ? 'bg-emerald-50 dark:bg-[#123524] border-emerald-300 shadow-xs'
              : 'bg-white dark:bg-[#0b2419] border-[#d4af37]/30 dark:border-emerald-600/40 hover:border-emerald-300 shadow-xs'
          }`}
        >
          <div className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-200">Selesai Dibayar</div>
          <div className="text-lg sm:text-xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">{stats.dibayar}</div>
          <div className="text-[10px] text-[#06130D]/60 dark:text-slate-300">Terposting jurnal</div>
        </button>

        {/* Perlu Revisi */}
        <button
          type="button"
          onClick={() => setSelectedStatus('perlu_revisi')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedStatus === 'perlu_revisi'
              ? 'bg-amber-50 dark:bg-[#2b1f0e] border-amber-400 shadow-xs'
              : 'bg-white dark:bg-[#0b2419] border-[#d4af37]/30 dark:border-amber-500/30 hover:border-amber-300 shadow-xs'
          }`}
        >
          <div className="text-[10px] font-bold uppercase text-amber-800 dark:text-amber-300">Perlu Revisi</div>
          <div className={`text-lg sm:text-xl font-extrabold mt-0.5 ${stats.perluRevisi > 0 ? 'text-amber-700 dark:text-[#f3c853]' : 'text-[#06130D] dark:text-slate-200'}`}>
            {stats.perluRevisi}
          </div>
          <div className="text-[10px] text-[#06130D]/60 dark:text-slate-300">Koreksi data</div>
        </button>
      </div>

      {/* 3. Panel Filter & Pencarian */}
      <div className="bg-white dark:bg-[#0b2419] p-4 sm:p-5 rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs space-y-3.5 transition-colors">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Input Pencarian */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8a6b10] dark:text-[#d4af37]/70 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nomor dokumen (PG-...), keperluan, akun, atau nama pengaju..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 placeholder:text-[#06130D]/40 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#d4af37] dark:focus:ring-[#d4af37] transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#06130D] dark:hover:text-white text-xs p-1"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Status & Jenis */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2.5 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#d4af37] dark:focus:ring-[#d4af37] transition-all cursor-pointer flex-1 sm:flex-initial"
            >
              <option value="semua">Semua Status</option>
              <option value="diajukan">Diajukan</option>
              <option value="menunggu_direktur">Menunggu Direktur</option>
              <option value="disetujui">Disetujui</option>
              <option value="dibayar">Dibayar</option>
              <option value="perlu_revisi">Perlu Revisi</option>
              <option value="ditolak">Ditolak</option>
              <option value="draf">Draf</option>
              <option value="dibatalkan">Dibatalkan</option>
            </select>

            <select
              value={selectedJenis}
              onChange={(e) => setSelectedJenis(e.target.value)}
              className="px-3 py-2.5 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#d4af37] dark:focus:ring-[#d4af37] transition-all cursor-pointer flex-1 sm:flex-initial"
            >
              <option value="semua">Semua Jenis</option>
              <option value="reimburse">Reimburse</option>
              <option value="pengeluaran">Pengeluaran</option>
            </select>
          </div>
        </div>

        {/* Baris Kedua: Date Picker (Pemilih Rentang Tanggal) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-[#d4af37]/20 dark:border-[#d4af37]/15 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[#06130D]/70 dark:text-[#d4af37] font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#8a6b10]" />
              <span>Filter Tanggal Nota:</span>
            </span>

            <div className="flex items-center gap-1.5 bg-[#fdfbf7] dark:bg-[#06150f] px-3 py-1.5 rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 text-xs shadow-xs">
              <span className="text-[#06130D]/60 dark:text-slate-400 text-[11px]">Dari:</span>
              <input
                type="date"
                value={tanggalMulai}
                onChange={(e) => setTanggalMulai(e.target.value)}
                className="bg-transparent text-[#06130D] dark:text-slate-100 text-xs focus:outline-none cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
                title="Pilih tanggal awal"
              />
              <span className="text-gray-400 dark:text-slate-500 text-xs mx-0.5">s/d</span>
              <span className="text-[#06130D]/60 dark:text-slate-400 text-[11px]">Sampai:</span>
              <input
                type="date"
                value={tanggalSelesai}
                onChange={(e) => setTanggalSelesai(e.target.value)}
                className="bg-transparent text-[#06130D] dark:text-slate-100 text-xs focus:outline-none cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
                title="Pilih tanggal akhir"
              />
            </div>

            {(tanggalMulai || tanggalSelesai) && (
              <button
                type="button"
                onClick={() => {
                  setTanggalMulai('');
                  setTanggalSelesai('');
                }}
                className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                title="Hapus filter rentang tanggal"
              >
                <X className="w-3.5 h-3.5" />
                <span>Hapus Tanggal</span>
              </button>
            )}
          </div>

          {(search || selectedStatus !== 'semua' || selectedJenis !== 'semua' || tanggalMulai || tanggalSelesai) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedStatus('semua');
                setSelectedJenis('semua');
                setTanggalMulai('');
                setTanggalSelesai('');
              }}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer w-fit self-end sm:self-auto font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Semua Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Tabel Daftar Pengajuan */}
      <div className="bg-white dark:bg-[#0b2419] rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs overflow-hidden">
        {filteredData.length === 0 ? (
          <div className="py-20 text-center text-[#06130D]/60 dark:text-slate-400">
            <FileText className="w-12 h-12 mx-auto text-[#8a6b10]/40 dark:text-[#d4af37]/40 mb-3" />
            <p className="text-base font-bold text-[#06130D] dark:text-slate-200">Tidak ada pengajuan ditemukan</p>
            <p className="text-xs text-[#06130D]/60 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {search || selectedStatus !== 'semua' || tanggalMulai || tanggalSelesai
                ? 'Coba atur ulang filter atau kata kunci pencarian Anda.'
                : 'Belum ada dokumen pengajuan yang tercatat.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#fdfbf7] dark:bg-[#081c15] text-[#06130D] dark:text-[#d4af37] uppercase text-[10px] font-bold tracking-wider border-b border-[#d4af37]/30 dark:border-[#d4af37]/20">
                <tr>
                  <th className="py-3.5 px-4">No. Dokumen</th>
                  <th className="py-3.5 px-3">Tgl Nota</th>
                  {isFinance && <th className="py-3.5 px-3">Pengaju</th>}
                  <th className="py-3.5 px-3">Jenis</th>
                  <th className="py-3.5 px-3">Akun Beban</th>
                  <th className="py-3.5 px-3">Keperluan</th>
                  <th className="py-3.5 px-4 text-right">Jumlah</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d4af37]/15 dark:divide-[#d4af37]/10 text-[#06130D] dark:text-slate-200">
                {paginatedData.map((item) => {
                  const badgeStatus = {
                    draf: 'bg-[#fdfbf7] dark:bg-[#18231e] text-[#06130D]/70 dark:text-slate-400 border-[#d4af37]/30 dark:border-slate-700',
                    diajukan: 'bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-500/40 font-semibold',
                    menunggu_direktur: 'bg-purple-50 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-500/40 font-bold',
                    disetujui: 'bg-emerald-50 dark:bg-[#123524] text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/40 font-bold',
                    dibayar: 'bg-emerald-100 dark:bg-[#0f2e1f] text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/50 font-bold',
                    perlu_revisi: 'bg-amber-50 dark:bg-amber-950/80 text-amber-900 dark:text-[#f3c853] border-amber-200 dark:border-amber-500/50 font-bold',
                    ditolak: 'bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-500/40 font-semibold',
                    dibatalkan: 'bg-[#fdfbf7] dark:bg-[#18231e] text-[#06130D]/50 border-[#d4af37]/30 dark:border-slate-800',
                  }[item.status] || 'bg-[#fdfbf7] dark:bg-[#081c15] text-[#06130D]/70 dark:text-slate-300 border-[#d4af37]/30 dark:border-slate-700';

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
                      {/* Nomor Dokumen */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#06130D] dark:text-[#fdfbf7] whitespace-nowrap">
                        <Link
                          href={`/pengajuan/${item.id}`}
                          className="hover:text-[#8a6b10] dark:hover:text-[#d4af37] underline decoration-[#d4af37]/40"
                        >
                          {item.nomor}
                        </Link>
                      </td>

                      {/* Tanggal Nota */}
                      <td className="py-3.5 px-3 text-[#06130D]/80 dark:text-slate-300 whitespace-nowrap">
                        {formatTanggalIndo(item.tanggal_transaksi)}
                      </td>

                      {/* Pengaju (hanya tampil di Manajemen) */}
                      {isFinance && (
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="font-semibold text-[#06130D] dark:text-slate-200">
                            {item.pengaju?.nama_lengkap || '-'}
                          </div>
                          <div className="text-[10px] text-[#06130D]/60 dark:text-slate-400">
                            {formatTeksPuebi(item.pengaju?.peran || '')}
                          </div>
                        </td>
                      )}

                      {/* Jenis */}
                      <td className="py-3.5 px-3 whitespace-nowrap capitalize">
                        <span className="bg-[#fdfbf7] dark:bg-[#06150f] border border-[#d4af37]/30 dark:border-[#d4af37]/20 px-2 py-0.5 rounded text-[11px] font-medium text-[#06130D] dark:text-slate-300">
                          {item.jenis}
                        </span>
                      </td>

                      {/* Akun Beban */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {item.akun_beban ? (
                          <div className="text-[11px]" title={item.akun_beban.nama}>
                            <span className="font-mono text-[#06130D] dark:text-[#d4af37] font-semibold">{item.akun_beban.kode}</span>
                            <span className="text-[#06130D]/80 dark:text-slate-300 ml-1 truncate max-w-[140px] inline-block align-bottom">
                              {item.akun_beban.nama}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-slate-500">-</span>
                        )}
                      </td>

                      {/* Keperluan */}
                      <td className="py-3.5 px-3 max-w-[220px] truncate text-[#06130D]/80 dark:text-slate-300" title={item.keterangan}>
                        {item.keterangan}
                      </td>

                      {/* Jumlah Nominal */}
                      <td className="py-3.5 px-4 text-right font-extrabold text-[#06130D] dark:text-[#fdfbf7] whitespace-nowrap font-mono">
                        {formatRupiah(item.jumlah)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] border ${badgeStatus}`}>
                          {labelStatus}
                        </span>
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/pengajuan/${item.id}`}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#d4af37]/30 dark:border-[#d4af37]/35 bg-white dark:bg-[#071c15] hover:bg-[#fdfbf7] dark:hover:bg-[#0b2419] transition-all duration-200 cursor-pointer shadow-xs"
                            title="Lihat Detail Pengajuan"
                          >
                            <Eye className="w-4 h-4 text-[#06130D] dark:text-[#d4af37]" />
                          </Link>

                          {(item.status === 'draf' || item.status === 'perlu_revisi') && (item.pengaju_id === profile.id || profile.peran === 'staf') && (
                            <Link
                              href={`/pengajuan/${item.id}/ubah`}
                              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#d4af37]/30 dark:border-[#d4af37]/35 bg-white dark:bg-[#071c15] hover:bg-[#fdfbf7] dark:hover:bg-[#0b2419] transition-all duration-200 cursor-pointer shadow-xs"
                              title="Ubah Formulir Pengajuan"
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

        {/* Paginasi Kontrol (Maksimal 10 Baris per Halaman) */}
        {filteredData.length > 0 && (
          <div className="bg-[#fdfbf7] dark:bg-[#081c15] px-4 py-3 border-t border-[#d4af37]/30 dark:border-[#d4af37]/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#06130D]/75 dark:text-slate-300">
            <div>
              Menampilkan <span className="font-bold text-[#06130D] dark:text-[#fdfbf7]">{startIndex + 1}</span>–<span className="font-bold text-[#06130D] dark:text-[#fdfbf7]">{endIndex}</span> dari{' '}
              <span className="font-bold text-[#06130D] dark:text-[#d4af37]">{filteredData.length}</span> pengajuan
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/30 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-200 hover:bg-[#fdfbf7] hover:text-[#8a6b10] dark:hover:text-[#d4af37] disabled:opacity-35 transition-all font-semibold cursor-pointer disabled:cursor-not-allowed flex items-center gap-1 shadow-xs"
              >
                <ChevronLeft className="w-4 h-4 text-[#8a6b10]" />
                <span>Sebelumnya</span>
              </button>

              <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#123524] border border-[#d4af37]/40 dark:border-[#d4af37]/40 text-[#06130D] dark:text-[#d4af37] font-bold shadow-xs">
                Halaman {currentPage} dari {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/30 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-200 hover:bg-[#fdfbf7] hover:text-[#8a6b10] dark:hover:text-[#d4af37] disabled:opacity-35 transition-all font-semibold cursor-pointer disabled:cursor-not-allowed flex items-center gap-1 shadow-xs"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="w-4 h-4 text-[#8a6b10]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
