'use client';

import React, { useState, useMemo } from 'react';
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
  Eye,
  ArrowUpDown,
  User,
  Sparkles
} from 'lucide-react';
import { formatRupiah, formatTanggalIndo } from '@/lib/utils';
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
  const [selectedBulan, setSelectedBulan] = useState('semua');
  const [selectedJenis, setSelectedJenis] = useState('semua');

  // Filter Data
  const filteredData = useMemo(() => {
    return initialPengajuan.filter((item) => {
      // 1. Filter Pencarian
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchNomor = item.nomor?.toLowerCase().includes(query);
        const matchKet = item.keterangan?.toLowerCase().includes(query);
        const matchNama = item.pengaju?.nama_lengkap?.toLowerCase().includes(query);
        const matchBeban = item.akun_beban?.nama?.toLowerCase().includes(query);
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

      // 4. Filter Bulan/Tahun (berdasarkan tanggal_transaksi)
      if (selectedBulan !== 'semua') {
        const itemMonth = item.tanggal_transaksi ? item.tanggal_transaksi.slice(0, 7) : '';
        if (itemMonth !== selectedBulan) return false;
      }

      return true;
    });
  }, [initialPengajuan, search, selectedStatus, selectedBulan, selectedJenis]);

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

  // Daftar nama bulan Bahasa Indonesia
  const NAMA_BULAN = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Format opsi bulan deskriptif (misal: "Oktober 2026", "September 2026")
  const bulanOptions = useMemo(() => {
    const monthsMap = new Map<string, string>();

    // 1. Dari periode akuntansi
    periodeList.forEach((p) => {
      const val = `${p.tahun}-${String(p.bulan).padStart(2, '0')}`;
      const namaBulan = NAMA_BULAN[p.bulan - 1] || `Bulan ${p.bulan}`;
      monthsMap.set(val, `${namaBulan} ${p.tahun}`);
    });

    // 2. Dari transaksi pengajuan yang ada
    initialPengajuan.forEach((item) => {
      if (item.tanggal_transaksi) {
        const val = item.tanggal_transaksi.slice(0, 7); // YYYY-MM
        if (!monthsMap.has(val)) {
          const [tahunStr, bulanStr] = val.split('-');
          const bIdx = parseInt(bulanStr, 10) - 1;
          const namaBulan = NAMA_BULAN[bIdx] || bulanStr;
          monthsMap.set(val, `${namaBulan} ${tahunStr}`);
        }
      }
    });

    // Urutkan dari bulan terbaru ke terlama
    return Array.from(monthsMap.entries())
      .map(([val, label]) => ({ val, label }))
      .sort((a, b) => b.val.localeCompare(a.val));
  }, [periodeList, initialPengajuan]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Tombol Aksi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#d4af37]/20">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#123524] text-[#d4af37] border border-[#d4af37]/30 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>{isFinance ? 'Manajemen Pengajuan Finansial' : 'Klaim & Pengajuan Saya'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#fdfbf7] font-serif tracking-tight">
            Daftar Pengajuan Biaya
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
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
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3c853] to-[#d4af37] text-[#081c15] text-xs sm:text-sm font-extrabold shadow-lg shadow-[#d4af37]/20 hover:brightness-110 active:brightness-95 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
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
              ? 'bg-[#123524] border-[#d4af37] shadow-md shadow-[#d4af37]/10'
              : 'bg-[#0b2419] border-[#d4af37]/25 hover:border-[#d4af37]/50'
          }`}
        >
          <div className="text-[10px] font-bold uppercase text-[#d4af37]">Total Semua</div>
          <div className="text-lg sm:text-xl font-extrabold text-[#fdfbf7] mt-0.5">{stats.total}</div>
          <div className="text-[10px] text-slate-300 truncate">{formatRupiah(stats.nominal)}</div>
        </button>

        {/* Draf */}
        <button
          type="button"
          onClick={() => setSelectedStatus('draf')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedStatus === 'draf'
              ? 'bg-[#1a2b22] border-slate-400 shadow-md'
              : 'bg-[#0b2419] border-slate-700/60 hover:border-slate-500'
          }`}
        >
          <div className="text-[10px] font-bold uppercase text-slate-400">Draf</div>
          <div className="text-lg sm:text-xl font-extrabold text-slate-300 mt-0.5">{stats.draf}</div>
          <div className="text-[10px] text-slate-400">Belum diajukan</div>
        </button>

        {/* Menunggu Review */}
        <button
          type="button"
          onClick={() => setSelectedStatus(selectedStatus === 'diajukan' ? 'menunggu_direktur' : 'diajukan')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            ['diajukan', 'menunggu_direktur'].includes(selectedStatus)
              ? 'bg-[#0f2d3d] border-blue-400 shadow-md'
              : 'bg-[#0b2419] border-blue-500/30 hover:border-blue-400/60'
          }`}
        >
          <div className="text-[10px] font-bold uppercase text-blue-300">Menunggu Review</div>
          <div className="text-lg sm:text-xl font-extrabold text-blue-400 mt-0.5">{stats.pending}</div>
          <div className="text-[10px] text-slate-300">Verifikasi/Direktur</div>
        </button>

        {/* Siap Dibayar */}
        <button
          type="button"
          onClick={() => setSelectedStatus('disetujui')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedStatus === 'disetujui'
              ? 'bg-[#123524] border-emerald-400 shadow-md'
              : 'bg-[#0b2419] border-emerald-500/30 hover:border-emerald-400/60'
          }`}
        >
          <div className="text-[10px] font-bold uppercase text-emerald-300">Siap Dibayar</div>
          <div className="text-lg sm:text-xl font-extrabold text-emerald-400 mt-0.5">{stats.siapBayar}</div>
          <div className="text-[10px] text-slate-300">Disetujui</div>
        </button>

        {/* Selesai Dibayar */}
        <button
          type="button"
          onClick={() => setSelectedStatus('dibayar')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedStatus === 'dibayar'
              ? 'bg-[#123524] border-emerald-300 shadow-md'
              : 'bg-[#0b2419] border-emerald-600/40 hover:border-emerald-400/60'
          }`}
        >
          <div className="text-[10px] font-bold uppercase text-emerald-200">Selesai Dibayar</div>
          <div className="text-lg sm:text-xl font-extrabold text-emerald-300 mt-0.5">{stats.dibayar}</div>
          <div className="text-[10px] text-slate-300">Terposting jurnal</div>
        </button>

        {/* Perlu Revisi */}
        <button
          type="button"
          onClick={() => setSelectedStatus('perlu_revisi')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedStatus === 'perlu_revisi'
              ? 'bg-[#2b1f0e] border-amber-400 shadow-md'
              : 'bg-[#0b2419] border-amber-500/30 hover:border-amber-400/60'
          }`}
        >
          <div className="text-[10px] font-bold uppercase text-amber-300">Perlu Revisi</div>
          <div className={`text-lg sm:text-xl font-extrabold mt-0.5 ${stats.perluRevisi > 0 ? 'text-[#f3c853]' : 'text-slate-200'}`}>
            {stats.perluRevisi}
          </div>
          <div className="text-[10px] text-slate-300">Koreksi data</div>
        </button>
      </div>

      {/* 3. Panel Filter & Pencarian */}
      <div className="bg-[#0b2419] p-4 sm:p-5 rounded-2xl border border-[#d4af37]/25 shadow-md space-y-3.5">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Input Pencarian */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#d4af37]/70 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nomor pengajuan (PG-...), keperluan, atau nama pengaju..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-[#d4af37]/25 bg-[#06150f] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Status Dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-[#d4af37]/25 bg-[#06150f] text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#d4af37] transition-all w-full md:w-auto cursor-pointer"
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

            {/* Filter Bulan */}
            <select
              value={selectedBulan}
              onChange={(e) => setSelectedBulan(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-[#d4af37]/25 bg-[#06150f] text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#d4af37] transition-all w-full md:w-auto cursor-pointer"
            >
              <option value="semua">Semua Bulan</option>
              {bulanOptions.map((b) => (
                <option key={b.val} value={b.val}>
                  {b.label}
                </option>
              ))}
            </select>

            {/* Filter Jenis */}
            <select
              value={selectedJenis}
              onChange={(e) => setSelectedJenis(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-[#d4af37]/25 bg-[#06150f] text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#d4af37] transition-all w-full md:w-auto cursor-pointer"
            >
              <option value="semua">Semua Jenis</option>
              <option value="reimburse">Reimburse</option>
              <option value="pengeluaran">Pengeluaran</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Tabel Daftar Pengajuan */}
      <div className="bg-[#0b2419] rounded-2xl border border-[#d4af37]/25 shadow-xl overflow-hidden">
        {filteredData.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <FileText className="w-12 h-12 mx-auto text-[#d4af37]/40 mb-3" />
            <p className="text-base font-bold text-slate-200">Tidak ada pengajuan ditemukan</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {search || selectedStatus !== 'semua' || selectedBulan !== 'semua'
                ? 'Coba atur ulang filter atau kata kunci pencarian Anda.'
                : 'Belum ada dokumen pengajuan yang tercatat.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#081c15] text-[#d4af37] uppercase text-[10px] font-bold tracking-wider border-b border-[#d4af37]/20">
                  <th className="py-3.5 px-4">No. Dokumen</th>
                  <th className="py-3.5 px-3">Tgl Nota</th>
                  {isFinance && <th className="py-3.5 px-3">Pengaju</th>}
                  <th className="py-3.5 px-3">Jenis</th>
                  <th className="py-3.5 px-3">Akun Beban</th>
                  <th className="py-3.5 px-3">Keperluan</th>
                  <th className="py-3.5 px-4 text-right">Jumlah</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d4af37]/10 text-slate-200">
                {filteredData.map((item) => {
                  const badgeStatus = {
                    draf: 'bg-[#18231e] text-slate-400 border-slate-700',
                    diajukan: 'bg-blue-950/80 text-blue-300 border-blue-500/40 font-semibold',
                    menunggu_direktur: 'bg-purple-950/80 text-purple-300 border-purple-500/40 font-bold',
                    disetujui: 'bg-[#123524] text-emerald-300 border-emerald-500/40 font-bold',
                    dibayar: 'bg-[#0f2e1f] text-emerald-300 border-emerald-500/50 font-bold',
                    perlu_revisi: 'bg-amber-950/80 text-[#f3c853] border-amber-500/50 font-bold animate-pulse',
                    ditolak: 'bg-rose-950/80 text-rose-300 border-rose-500/40 font-semibold',
                    dibatalkan: 'bg-[#18231e] text-slate-500 border-slate-800',
                  }[item.status] || 'bg-[#081c15] text-slate-300 border-slate-700';

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
                    <tr key={item.id} className="hover:bg-[#102d20]/60 transition-colors">
                      {/* Nomor Dokumen */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#fdfbf7] whitespace-nowrap">
                        <Link
                          href={`/pengajuan/${item.id}`}
                          className="hover:text-[#d4af37] transition-colors"
                        >
                          {item.nomor}
                        </Link>
                      </td>

                      {/* Tanggal Nota */}
                      <td className="py-3.5 px-3 text-slate-300 whitespace-nowrap">
                        {formatTanggalIndo(item.tanggal_transaksi)}
                      </td>

                      {/* Pengaju (hanya tampil di Manajemen) */}
                      {isFinance && (
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-200">
                            {item.pengaju?.nama_lengkap || '-'}
                          </div>
                          <div className="text-[10px] text-slate-400 capitalize">
                            {item.pengaju?.peran || ''}
                          </div>
                        </td>
                      )}

                      {/* Jenis */}
                      <td className="py-3.5 px-3 whitespace-nowrap capitalize">
                        <span className="bg-[#06150f] border border-[#d4af37]/20 px-2 py-0.5 rounded text-[11px] font-medium text-slate-300">
                          {item.jenis}
                        </span>
                      </td>

                      {/* Akun Beban */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {item.akun_beban ? (
                          <div className="text-[11px]" title={item.akun_beban.nama}>
                            <span className="font-mono text-[#d4af37] font-semibold">{item.akun_beban.kode}</span>
                            <span className="text-slate-300 ml-1 truncate max-w-[140px] inline-block align-bottom">
                              {item.akun_beban.nama}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>

                      {/* Keperluan */}
                      <td className="py-3.5 px-3 max-w-[220px] truncate text-slate-300" title={item.keterangan}>
                        {item.keterangan}
                      </td>

                      {/* Jumlah Nominal */}
                      <td className="py-3.5 px-4 text-right font-extrabold text-[#fdfbf7] whitespace-nowrap font-mono">
                        {formatRupiah(item.jumlah)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] border ${badgeStatus}`}>
                          {labelStatus}
                        </span>
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link
                          href={`/pengajuan/${item.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#d4af37] hover:text-[#f3c853] hover:underline"
                        >
                          <span>Buka</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
