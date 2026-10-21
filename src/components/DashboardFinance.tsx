import React from 'react';
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
  ChevronRight
} from 'lucide-react';
import { formatRupiah, formatTanggalIndo } from '@/lib/utils';
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

  // Hitung pengajuan yang relevan dengan peran yang masuk (PRD Bagian 9.1)
  const jumlahMenungguPeran = isDirektur
    ? pengajuanMenunggu.filter((p) => p.status === 'menunggu_direktur').length
    : pengajuanMenunggu.filter((p) => p.status === 'diajukan' || p.status === 'disetujui').length;

  return (
    <div className="space-y-8">
      {/* 1. Header Banner Sambutan Nuansa Keraton */}
      <div className="bg-gradient-to-r from-[#0b2419] via-[#0e2c1e] to-[#081c15] rounded-2xl p-6 sm:p-8 text-white shadow-xl border border-[#d4af37]/30 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#d4af37]/15 text-[#f3c853] border border-[#d4af37]/35 mb-2.5">
              <span>Dasbor Eksekutif & Akuntansi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#fdfbf7] font-serif">
              Halo, {profile.nama_lengkap} ({profile.peran.toUpperCase()})
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
              Berikut ikhtisar posisi kas/bank, performa laba rugi bulan berjalan ({namaBulanAktif}), dan daftar pengajuan yang memerlukan tindakan persetujuan Anda.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/pengajuan"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3c853] to-[#d4af37] text-[#081c15] text-xs font-extrabold shadow-md hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4 stroke-[2.5]" />
              <span>Daftar Pengajuan ({pengajuanMenunggu.length})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Kartu Ringkasan Finansial Utama (PRD Bagian 9.1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Kas & Bank */}
        <div className="bg-[#0b2419] p-5 rounded-2xl border border-[#d4af37]/25 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#d4af37]">
              Saldo Kas & Bank
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#123524] text-[#d4af37] flex items-center justify-center border border-[#d4af37]/30">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xl sm:text-2xl font-extrabold text-[#fdfbf7] tracking-tight">
              {formatRupiah(totalKasBank)}
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-[#d4af37]/15 space-y-1">
              {kasBankList.map((kb) => (
                <div key={kb.id} className="flex justify-between text-[11px] text-slate-300">
                  <span className="truncate pr-2">{kb.nama}</span>
                  <span className="font-bold text-[#f3c853]">{formatRupiah(kb.saldo)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pendapatan Bulan Berjalan */}
        <div className="bg-[#0b2419] p-5 rounded-2xl border border-[#d4af37]/25 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#d4af37]">
              Pendapatan ({namaBulanAktif})
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#0e3522] text-emerald-300 flex items-center justify-center border border-emerald-500/30">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 tracking-tight">
              {formatRupiah(pendapatanBulanIni)}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Batik tulis, cap, seragam & paket wisata
            </p>
          </div>
        </div>

        {/* Beban Bulan Berjalan */}
        <div className="bg-[#0b2419] p-5 rounded-2xl border border-[#d4af37]/25 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#d4af37]">
              Beban ({namaBulanAktif})
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#321318] text-rose-300 flex items-center justify-center border border-rose-500/30">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xl sm:text-2xl font-extrabold text-rose-400 tracking-tight">
              {formatRupiah(bebanBulanIni)}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Bahan baku, gaji, listrik & operasional
            </p>
          </div>
        </div>

        {/* Laba Bersih Bulan Berjalan */}
        <div className="bg-[#0b2419] p-5 rounded-2xl border border-[#d4af37]/25 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#d4af37]">
              Laba (Rugi) {namaBulanAktif}
            </span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                labaBulanIni >= 0
                  ? 'bg-[#123524] text-[#d4af37] border-[#d4af37]/40'
                  : 'bg-[#321318] text-rose-400 border-rose-500/40'
              }`}
            >
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div
              className={`text-xl sm:text-2xl font-extrabold tracking-tight ${
                labaBulanIni >= 0 ? 'text-[#fdfbf7]' : 'text-rose-400'
              }`}
            >
              {labaBulanIni < 0
                ? `(${formatRupiah(Math.abs(labaBulanIni))})`
                : formatRupiah(labaBulanIni)}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              {labaBulanIni >= 0 ? 'Surplus operasional' : 'Defisit operasional berjalan'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Grid Dua Kolom: Pengajuan Menunggu & Status Periode */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Kolom Kiri: Tabel Pengajuan Menunggu Tindakan (2 Kolom) */}
        <div className="lg:col-span-2 bg-[#0b2419] rounded-2xl border border-[#d4af37]/25 shadow-lg p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#d4af37]/15">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#123524] text-[#d4af37] flex items-center justify-center border border-[#d4af37]/30">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#fdfbf7] text-base">
                    Pengajuan Menunggu Tindakan
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isDirektur
                      ? 'Pengajuan bernilai > Rp1.000.000 atau milik Akuntan'
                      : 'Pengajuan menunggu verifikasi atau siap dibayar'}
                  </p>
                </div>
              </div>

              <span className="text-xs font-bold bg-[#d4af37]/15 text-[#f3c853] px-2.5 py-1 rounded-full border border-[#d4af37]/35">
                {jumlahMenungguPeran} Perlu Tindakan
              </span>
            </div>

            {/* List Tabel */}
            {pengajuanMenunggu.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Tidak ada pengajuan yang sedang menunggu saat ini.
              </div>
            ) : (
              <div className="divide-y divide-[#d4af37]/10 mt-2 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[#d4af37]/80 uppercase text-[10px] font-bold tracking-wider">
                      <th className="py-3 px-2">Dokumen</th>
                      <th className="py-3 px-2">Pengaju</th>
                      <th className="py-3 px-2">Keperluan</th>
                      <th className="py-3 px-2 text-right">Jumlah</th>
                      <th className="py-3 px-2 text-center">Status</th>
                      <th className="py-3 px-2 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d4af37]/10 text-slate-200">
                    {pengajuanMenunggu.map((item) => {
                      const badgeStatus = {
                        diajukan: 'bg-blue-950/80 text-blue-300 border-blue-500/40',
                        menunggu_direktur: 'bg-purple-950/80 text-purple-300 border-purple-500/40 font-bold',
                        disetujui: 'bg-[#123524] text-emerald-300 border-emerald-500/40 font-bold',
                      }[item.status] || 'bg-[#081c15] text-slate-300 border-slate-700';

                      const labelStatus = {
                        diajukan: 'Diajukan',
                        menunggu_direktur: 'Menunggu Direktur',
                        disetujui: 'Siap Dibayar',
                      }[item.status] || item.status;

                      return (
                        <tr key={item.id} className="hover:bg-[#102d20]/60 transition-colors">
                          <td className="py-3 px-2 font-mono font-bold text-[#fdfbf7]">
                            {item.nomor}
                          </td>
                          <td className="py-3 px-2 font-medium">
                            {item.profiles?.nama_lengkap || '-'}
                          </td>
                          <td className="py-3 px-2 max-w-[200px] truncate text-slate-300" title={item.keterangan}>
                            {item.keterangan}
                          </td>
                          <td className="py-3 px-2 text-right font-bold text-[#fdfbf7]">
                            {formatRupiah(item.jumlah)}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] border ${badgeStatus}`}>
                              {labelStatus}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <Link
                              href={`/pengajuan?id=${item.id}`}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#d4af37] hover:text-[#f3c853] hover:underline"
                            >
                              <span>Tinjau</span>
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

          <div className="mt-4 pt-3 border-t border-[#d4af37]/15 text-right">
            <Link
              href="/pengajuan"
              className="text-xs font-bold text-[#d4af37] hover:text-[#f3c853] inline-flex items-center gap-1"
            >
              <span>Lihat Seluruh 35 Pengajuan</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Kolom Kanan: Status Periode Akuntansi (1 Kolom) */}
        <div className="bg-[#0b2419] rounded-2xl border border-[#d4af37]/25 shadow-lg p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-4 border-b border-[#d4af37]/15">
              <div className="w-8 h-8 rounded-lg bg-[#123524] text-[#d4af37] flex items-center justify-center border border-[#d4af37]/30">
                <CalendarCheck2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-[#fdfbf7] text-base">Status Periode Bulanan</h3>
                <p className="text-xs text-slate-400">Tutup buku berurutan (BR-06)</p>
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
                    className="p-3 rounded-xl border border-[#d4af37]/15 bg-[#081c15]/70 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#fdfbf7]">
                        {namaBulan} {per.tahun}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {isTutup
                          ? `Ditutup ${per.profiles?.nama_lengkap ? 'oleh ' + per.profiles.nama_lengkap : ''}`
                          : 'Terbuka untuk posting jurnal'}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isTutup
                          ? 'bg-[#18231e] text-slate-400 border-slate-600'
                          : 'bg-[#123524] text-[#d4af37] border-[#d4af37]/50'
                      }`}
                    >
                      {isTutup ? 'DITUTUP' : 'TERBUKA'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#d4af37]/15">
            <Link
              href="/akun-periode"
              className="w-full py-2 px-3 rounded-xl border border-[#d4af37]/30 bg-[#081c15] text-[#d4af37] hover:bg-[#123524] text-xs font-bold flex items-center justify-center gap-1 transition-colors"
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
