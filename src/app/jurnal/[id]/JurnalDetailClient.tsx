'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  BookOpen,
  SquarePen,
  Trash2,
  RotateCcw,
  Loader2,
  AlertCircle,
  Scale,
  FileText,
  User,
  ShieldAlert,
} from 'lucide-react';
import { Profile } from '@/types/database';
import { hapusJurnalAction, buatJurnalPembalikAction } from '../actions';

export interface DetailBarisAkun {
  id: number;
  kode: string;
  nama: string;
  tipe: string;
}

export interface DetailBarisItem {
  id: number;
  urutan: number;
  akun_id: number;
  debit: number;
  kredit: number;
  keterangan: string | null;
  akun?: DetailBarisAkun | null;
}

export interface DetailJurnalData {
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
  jurnal_baris: DetailBarisItem[];
  periode?: {
    id: number;
    tahun: number;
    bulan: number;
    status: 'terbuka' | 'ditutup';
  } | null;
  pembuat?: {
    id: string;
    nama_lengkap: string;
    email: string;
    peran: string;
  } | null;
  pemosting?: {
    id: string;
    nama_lengkap: string;
    email: string;
    peran: string;
  } | null;
  pengajuan?: {
    id: number;
    nomor: string;
    keterangan: string;
    jumlah: number;
  } | null;
  jurnal_asal?: {
    id: number;
    nomor: string | null;
    keterangan: string;
    tanggal: string;
  } | null;
  pembalik_terkait?: {
    id: number;
    nomor: string | null;
    keterangan: string;
    tanggal: string;
  } | null;
}

interface JurnalDetailClientProps {
  jurnal: DetailJurnalData;
  profile: Profile;
  openPeriods: {
    id: number;
    tahun: number;
    bulan: number;
    status: 'terbuka' | 'ditutup';
  }[];
}

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
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return tglStr;
  }
}

export function JurnalDetailClient({
  jurnal,
  profile,
  openPeriods,
}: JurnalDetailClientProps) {
  const router = useRouter();
  const isAkuntan = profile.peran === 'akuntan';

  // Modal State
  const [showHapusModal, setShowHapusModal] = useState(false);
  const [showPembalikModal, setShowPembalikModal] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form Pembalik State
  const [tanggalPembalik, setTanggalPembalik] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [alasanPembalik, setAlasanPembalik] = useState('');

  // Total Debit & Kredit
  const totalDebit = jurnal.jurnal_baris.reduce((acc, b) => acc + Number(b.debit || 0), 0);
  const totalKredit = jurnal.jurnal_baris.reduce((acc, b) => acc + Number(b.kredit || 0), 0);
  const isBalanced = totalDebit === totalKredit && totalDebit > 0;

  // Cek apakah jurnal ini memenuhi syarat untuk dibalik (BR-04)
  const canBeReversed =
    isAkuntan &&
    jurnal.status === 'diposting' &&
    jurnal.sumber !== 'pembalik' &&
    jurnal.sumber !== 'pengajuan' &&
    jurnal.pengajuan_id === null &&
    !jurnal.pembalik_terkait;

  // Handle Hapus Draf
  const handleHapusDraf = async () => {
    setActionError(null);
    setLoadingAction(true);

    try {
      const res = await hapusJurnalAction(jurnal.id);
      if (!res.success) {
        setActionError(res.error || 'Gagal menghapus draf jurnal.');
        setLoadingAction(false);
        return;
      }
      setShowHapusModal(false);
      router.push('/jurnal');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kegagalan jaringan.';
      setActionError(msg);
      setLoadingAction(false);
    }
  };

  // Handle Buat Jurnal Pembalik
  const handleBuatPembalik = async () => {
    setActionError(null);
    if (!tanggalPembalik) {
      setActionError('Tanggal jurnal pembalik wajib ditentukan.');
      return;
    }

    setLoadingAction(true);

    try {
      const res = await buatJurnalPembalikAction({
        jurnal_id: jurnal.id,
        tanggal_pembalik: tanggalPembalik,
        alasan: alasanPembalik.trim() || undefined,
      });

      if (!res.success) {
        setActionError(res.error || 'Gagal membuat jurnal pembalik.');
        setLoadingAction(false);
        return;
      }

      setShowPembalikModal(false);
      router.push(`/jurnal/${res.data?.pembalikId}`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
      setActionError(msg);
      setLoadingAction(false);
    }
  };

  // Badge Status Styling
  const statusBadgeStyle = {
    diposting: 'bg-emerald-950 text-emerald-300 border-emerald-500/40',
    draf: 'bg-amber-950 text-[#f3c853] border-amber-500/40',
    dibalik: 'bg-rose-950 text-rose-300 border-rose-500/40',
  }[jurnal.status] || 'bg-slate-900 text-slate-300 border-slate-700';

  const sumberBadgeStyle = {
    manual: 'bg-[#123524] text-[#d4af37] border-[#d4af37]/40',
    pengajuan: 'bg-[#0e2c38] text-sky-200 border-sky-400/40',
    pembalik: 'bg-[#2d1b0d] text-amber-200 border-amber-400/40',
    saldo_awal: 'bg-[#251838] text-purple-200 border-purple-400/40',
    impor_bank: 'bg-[#1a2d24] text-teal-200 border-teal-400/40',
  }[jurnal.sumber] || 'bg-[#123524] text-slate-300 border-slate-700';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Navigasi Atas & Judul */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/jurnal"
            className="p-2 rounded-xl bg-[#0b2419] border border-[#d4af37]/30 text-[#d4af37] hover:bg-[#123524] transition-colors"
            title="Kembali ke Daftar Jurnal"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#fdfbf7] font-serif tracking-tight font-mono">
                {jurnal.nomor || 'Draf Jurnal (Belum Bernomor)'}
              </h1>
              <span
                className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${statusBadgeStyle}`}
              >
                {jurnal.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Dicatat pada: {formatTanggalIndo(jurnal.tanggal)}
            </p>
          </div>
        </div>

        {/* Tombol Aksi Kontekstual */}
        <div className="flex items-center gap-2">
          {/* Aksi Jurnal Draf: Ubah & Hapus */}
          {isAkuntan && jurnal.status === 'draf' && (
            <>
              <Link
                href={`/jurnal/${jurnal.id}/ubah`}
                className="px-4 py-2 rounded-xl border border-amber-500/40 text-[#f3c853] hover:bg-amber-950/40 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <SquarePen className="w-3.5 h-3.5" />
                <span>Ubah Draf</span>
              </Link>

              <button
                type="button"
                onClick={() => setShowHapusModal(true)}
                className="px-4 py-2 rounded-xl border border-rose-500/40 text-rose-300 hover:bg-rose-950/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Draf</span>
              </button>
            </>
          )}

          {/* Aksi Jurnal Diposting: Buat Jurnal Pembalik (BR-04) */}
          {canBeReversed && (
            <button
              type="button"
              onClick={() => setShowPembalikModal(true)}
              className="px-4 py-2 rounded-xl bg-[#d4af37] text-[#081c15] text-xs font-extrabold shadow-md hover:bg-[#e0bc46] active:bg-[#c49f2e] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Buat Jurnal Pembalik</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Banner Informasi Khusus Relasi Pembalik / Pengajuan */}
      {jurnal.status === 'dibalik' && jurnal.pembalik_terkait && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-3">
          <ArrowRightLeft className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-sm block text-rose-100">
              Jurnal ini telah dibalik (Reversed)
            </span>
            <p className="mt-0.5 leading-relaxed">
              Jurnal ini telah dikoreksi melalui jurnal pembalik nomor{' '}
              <Link
                href={`/jurnal/${jurnal.pembalik_terkait.id}`}
                className="font-mono font-bold text-amber-300 underline hover:text-amber-200"
              >
                {jurnal.pembalik_terkait.nomor || `JU #${jurnal.pembalik_terkait.id}`}
              </Link>{' '}
              pada tanggal {formatTanggalIndo(jurnal.pembalik_terkait.tanggal)}.
            </p>
          </div>
        </div>
      )}

      {jurnal.sumber === 'pembalik' && jurnal.jurnal_asal && (
        <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-3">
          <RotateCcw className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-sm block text-amber-100">
              Jurnal ini merupakan Jurnal Pembalik
            </span>
            <p className="mt-0.5 leading-relaxed">
              Menghapus dampak pembukuan dari jurnal asal nomor{' '}
              <Link
                href={`/jurnal/${jurnal.jurnal_asal.id}`}
                className="font-mono font-bold text-[#f3c853] underline hover:text-white"
              >
                {jurnal.jurnal_asal.nomor || `JU #${jurnal.jurnal_asal.id}`}
              </Link>{' '}
              ({jurnal.jurnal_asal.keterangan}).
            </p>
          </div>
        </div>
      )}

      {jurnal.pengajuan && (
        <div className="p-4 rounded-2xl bg-[#0e2c38] border border-sky-400/40 text-sky-200 text-xs flex items-start gap-3">
          <FileText className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-sm block text-sky-100">
              Jurnal Otomatis Pembayaran Pengajuan Biaya
            </span>
            <p className="mt-0.5 leading-relaxed">
              Diterbitkan otomatis dari pencairan dokumen pengajuan{' '}
              <Link
                href={`/pengajuan/${jurnal.pengajuan.id}`}
                className="font-mono font-bold text-white underline hover:text-sky-300"
              >
                {jurnal.pengajuan.nomor}
              </Link>{' '}
              sebesar {formatRupiah(jurnal.pengajuan.jumlah)} ({jurnal.pengajuan.keterangan}). Sesuai aturan PRD BR-04, jurnal pembayaran pengajuan tidak dapat dibalik.
            </p>
          </div>
        </div>
      )}

      {/* 3. Panel Ringkasan Kepala Jurnal */}
      <div className="bg-[#0b2419] rounded-2xl border border-[#d4af37]/25 p-5 sm:p-6 shadow-xl space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#d4af37] flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          <span>Informasi Dokumen</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Tanggal */}
          <div className="p-3.5 rounded-xl bg-[#06150f] border border-[#d4af37]/20">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Tanggal Transaksi
            </span>
            <span className="text-sm font-bold text-slate-100 font-mono mt-0.5 block">
              {formatTanggalIndo(jurnal.tanggal)}
            </span>
          </div>

          {/* Sumber */}
          <div className="p-3.5 rounded-xl bg-[#06150f] border border-[#d4af37]/20">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Sumber Jurnal
            </span>
            <div className="mt-1">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${sumberBadgeStyle}`}
              >
                {jurnal.sumber === 'saldo_awal' ? 'Saldo Awal' : jurnal.sumber}
              </span>
            </div>
          </div>

          {/* Periode Akuntansi */}
          <div className="p-3.5 rounded-xl bg-[#06150f] border border-[#d4af37]/20">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Periode Akuntansi
            </span>
            <span className="text-sm font-bold text-slate-100 mt-0.5 block">
              {jurnal.periode
                ? `Bulan ${jurnal.periode.bulan} / ${jurnal.periode.tahun} (${jurnal.periode.status})`
                : 'Tidak Terikat'}
            </span>
          </div>

          {/* Pembuat & Pemosting */}
          <div className="p-3.5 rounded-xl bg-[#06150f] border border-[#d4af37]/20">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Pencatat / Pemosting
            </span>
            <span className="text-xs font-bold text-slate-100 mt-0.5 block">
              {jurnal.pembuat?.nama_lengkap || 'Sistem'}
            </span>
            {jurnal.pemosting && (
              <span className="text-[11px] text-[#d4af37] block mt-0.5">
                Diposting: {jurnal.pemosting.nama_lengkap}
              </span>
            )}
          </div>
        </div>

        {/* Keterangan Transaksi */}
        <div className="p-3.5 rounded-xl bg-[#06150f] border border-[#d4af37]/20 text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Keterangan Transaksi
          </span>
          <p className="text-sm text-slate-100 leading-relaxed font-medium">
            {jurnal.keterangan}
          </p>
        </div>
      </div>

      {/* 4. Tabel Rincian Baris Transaksi (Debit & Kredit) */}
      <div className="bg-[#0b2419] rounded-2xl border border-[#d4af37]/25 shadow-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#d4af37]/20 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#d4af37] flex items-center gap-2">
            <Scale className="w-4 h-4" />
            <span>Ayat Jurnal Debit & Kredit ({jurnal.jurnal_baris.length} Baris)</span>
          </h2>
          <span className="text-xs text-slate-400">
            Koreksi saldo buku besar otomatis sesuai saldo normal
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#081c15] text-[#d4af37] uppercase text-[10px] font-bold tracking-wider border-b border-[#d4af37]/20">
                <th className="py-3.5 px-3 text-center w-12">#</th>
                <th className="py-3.5 px-4 w-32 font-mono">Kode Akun</th>
                <th className="py-3.5 px-4">Nama Akun Rekening</th>
                <th className="py-3.5 px-4">Keterangan Baris</th>
                <th className="py-3.5 px-4 text-right w-44">Debit (Rp)</th>
                <th className="py-3.5 px-4 text-right w-44">Kredit (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d4af37]/10 text-slate-200">
              {jurnal.jurnal_baris.map((b, idx) => {
                const isDebit = Number(b.debit) > 0;
                return (
                  <tr key={b.id || idx} className="hover:bg-[#123524]/40 transition-colors">
                    <td className="py-3.5 px-3 text-center font-mono text-slate-400">
                      {idx + 1}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-[#f3c853]">
                      {b.akun?.kode || '-'}
                    </td>

                    <td className="py-3.5 px-4 font-semibold">
                      <div className={isDebit ? 'pl-0' : 'pl-6 sm:pl-8 text-slate-300'}>
                        {b.akun?.nama || 'Akun'}
                        <span className="text-[10px] font-normal text-slate-400 ml-2 uppercase">
                          ({b.akun?.tipe || ''})
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 italic">
                      {b.keterangan || '-'}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                      {Number(b.debit) > 0 ? formatRupiah(Number(b.debit)) : '-'}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-400">
                      {Number(b.kredit) > 0 ? formatRupiah(Number(b.kredit)) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Footer Total */}
            <tfoot>
              <tr className="bg-[#081c15] text-slate-100 font-bold border-t-2 border-[#d4af37]/30">
                <td colSpan={4} className="py-3.5 px-4 text-right uppercase text-[11px] text-[#d4af37]">
                  Total Neraca Saldo Jurnal:
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-extrabold text-emerald-400 text-sm">
                  {formatRupiah(totalDebit)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-extrabold text-rose-400 text-sm">
                  {formatRupiah(totalKredit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Indikator Keseimbangan */}
        <div className="p-4 bg-[#06150f] border-t border-[#d4af37]/15 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {isBalanced ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Jurnal Seimbang (Total Debit = Total Kredit)</span>
              </span>
            ) : (
              <span className="text-rose-400 font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>
                  Jurnal Tidak Seimbang (Selisih: {formatRupiah(Math.abs(totalDebit - totalKredit))})
                </span>
              </span>
            )}
          </div>

          <span className="text-slate-400 font-mono text-[11px]">
            ID Internal: #{jurnal.id}
          </span>
        </div>
      </div>

      {/* MODAL 1: Konfirmasi Hapus Jurnal Draf */}
      {showHapusModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0b2419] rounded-2xl border border-rose-500/50 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-100">
                Konfirmasi Hapus Jurnal Draf
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus jurnal draf ini? Dokumen dan seluruh baris rinciannya akan dihapus permanen dari sistem.
            </p>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs">
                {actionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowHapusModal(false);
                  setActionError(null);
                }}
                disabled={loadingAction}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-[#06150f]"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleHapusDraf}
                disabled={loadingAction}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-extrabold hover:bg-rose-500 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Ya, Hapus Jurnal Draf</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Buat Jurnal Pembalik (BR-04) */}
      {showPembalikModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0b2419] rounded-2xl border border-[#d4af37]/40 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[#d4af37]">
              <RotateCcw className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-100">
                Buat Jurnal Pembalik (BR-04)
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Sesuai aturan pembukuan (BR-04), jurnal yang sudah diposting tidak dapat diubah atau dihapus. Kesalahan dikoreksi dengan menerbitkan <strong>Jurnal Pembalik</strong> yang menukar posisi Debit dan Kredit dari jurnal ini, serta mengubah status jurnal ini menjadi <em>Dibalik</em>.
            </p>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#d4af37] mb-1">
                  Tanggal Jurnal Pembalik <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={tanggalPembalik}
                    onChange={(e) => setTanggalPembalik(e.target.value)}
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker?.();
                      } catch {}
                    }}
                    className="w-full p-2.5 text-xs rounded-xl border border-[#d4af37]/30 bg-[#06150f] text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#d4af37] cursor-pointer [color-scheme:dark]"
                  />
                  <Calendar className="w-4 h-4 text-[#d4af37] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Tanggal harus berada pada periode akuntansi yang berstatus terbuka (BR-05).
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#d4af37] mb-1">
                  Alasan Koreksi / Pembalikan (Opsional)
                </label>
                <input
                  type="text"
                  value={alasanPembalik}
                  onChange={(e) => setAlasanPembalik(e.target.value)}
                  placeholder="Misal: Salah memilih akun kas atau salah nominal..."
                  className="w-full p-2.5 text-xs rounded-xl border border-[#d4af37]/30 bg-[#06150f] text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                />
              </div>
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs">
                {actionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => {
                  setShowPembalikModal(false);
                  setActionError(null);
                }}
                disabled={loadingAction}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-[#06150f]"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleBuatPembalik}
                disabled={loadingAction}
                className="px-5 py-2.5 rounded-xl bg-[#d4af37] text-[#081c15] text-xs font-extrabold hover:bg-[#e0bc46] active:bg-[#c49f2e] flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loadingAction ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#081c15]" />
                    <span>Menerbitkan Pembalik...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Terbitkan Jurnal Pembalik</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
