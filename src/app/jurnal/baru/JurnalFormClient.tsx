'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Save,
  Scale,
  BookOpen,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { formatTeksPuebi } from '@/lib/utils';
import { simpanJurnalAction } from '../actions';

export interface AkunOption {
  id: number;
  kode: string;
  nama: string;
  tipe: string;
  saldo_normal: string;
}

export interface PeriodeOption {
  id: number;
  tahun: number;
  bulan: number;
  status: 'terbuka' | 'ditutup';
}

export interface BarisFormItem {
  id?: number;
  akun_id: number;
  debit: number;
  kredit: number;
  keterangan: string;
}

interface JurnalFormClientProps {
  initialJurnal?: {
    id: number;
    tanggal: string;
    keterangan: string;
    sumber: 'manual' | 'saldo_awal' | 'pembalik';
    status: 'draf' | 'diposting' | 'dibalik';
    baris: BarisFormItem[];
  };
  akunList: AkunOption[];
  openPeriods: PeriodeOption[];
  isEdit?: boolean;
}

function formatRupiah(val: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

export function JurnalFormClient({
  initialJurnal,
  akunList,
  openPeriods,
  isEdit = false,
}: JurnalFormClientProps) {
  const router = useRouter();

  // 1. State Header Form
  const defaultDate = initialJurnal?.tanggal || new Date().toISOString().split('T')[0];
  const [tanggal, setTanggal] = useState(defaultDate);
  const [keterangan, setKeterangan] = useState(initialJurnal?.keterangan || '');
  const [sumber, setSumber] = useState<'manual' | 'penyesuaian'>(
    initialJurnal?.keterangan.toLowerCase().includes('penyesuaian') ? 'penyesuaian' : 'manual'
  );

  // 2. State Baris Dinamis (Minimal 2 Baris)
  const [baris, setBaris] = useState<BarisFormItem[]>(() => {
    if (initialJurnal?.baris && initialJurnal.baris.length >= 2) {
      return initialJurnal.baris;
    }
    return [
      { akun_id: akunList[0]?.id || 0, debit: 0, kredit: 0, keterangan: '' },
      { akun_id: akunList[1]?.id || 0, debit: 0, kredit: 0, keterangan: '' },
    ];
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tambah baris baru
  const handleTambahBaris = () => {
    setBaris((prev) => [
      ...prev,
      {
        akun_id: akunList[0]?.id || 0,
        debit: 0,
        kredit: 0,
        keterangan: '',
      },
    ]);
  };

  // Hapus baris (minimal 2 baris tetap ada)
  const handleHapusBaris = (index: number) => {
    if (baris.length <= 2) {
      alert('Jurnal minimal harus terdiri dari 2 baris transaksi.');
      return;
    }
    setBaris((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Ubah Akun
  const handleAkunChange = (index: number, akunId: number) => {
    setBaris((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], akun_id: akunId };
      return next;
    });
  };

  // Ubah Keterangan Baris
  const handleKeteranganBarisChange = (index: number, val: string) => {
    setBaris((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], keterangan: val };
      return next;
    });
  };

  // Ubah Nilai Debit (Otomatis reset Kredit ke 0)
  const handleDebitChange = (index: number, valStr: string) => {
    const cleanNum = Math.max(0, parseInt(valStr.replace(/\D/g, '') || '0', 10));
    setBaris((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        debit: cleanNum,
        kredit: cleanNum > 0 ? 0 : next[index].kredit,
      };
      return next;
    });
  };

  // Ubah Nilai Kredit (Otomatis reset Debit ke 0)
  const handleKreditChange = (index: number, valStr: string) => {
    const cleanNum = Math.max(0, parseInt(valStr.replace(/\D/g, '') || '0', 10));
    setBaris((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        kredit: cleanNum,
        debit: cleanNum > 0 ? 0 : next[index].debit,
      };
      return next;
    });
  };

  // 3. Kalkulasi Real-Time
  const totalDebit = useMemo(() => {
    return baris.reduce((acc, b) => acc + (b.debit || 0), 0);
  }, [baris]);

  const totalKredit = useMemo(() => {
    return baris.reduce((acc, b) => acc + (b.kredit || 0), 0);
  }, [baris]);

  const selisih = Math.abs(totalDebit - totalKredit);
  const isBalanced = totalDebit === totalKredit && totalDebit > 0;

  // Cek Status Periode dari Tanggal yang Dipilih
  const statusPeriodeTanggal = useMemo(() => {
    if (!tanggal) return null;
    const d = new Date(tanggal);
    if (isNaN(d.getTime())) return null;
    const tahun = d.getFullYear();
    const bulan = d.getMonth() + 1;
    const match = openPeriods.find((p) => p.tahun === tahun && p.bulan === bulan);
    return match || null;
  }, [tanggal, openPeriods]);

  // 4. Submit Form (Draf atau Posting)
  const handleSubmit = async (targetStatus: 'draf' | 'diposting') => {
    setErrorMessage(null);

    // Validasi Dasar Tanggal
    if (!tanggal) {
      setErrorMessage('Tanggal transaksi wajib diisi.');
      return;
    }

    if (!statusPeriodeTanggal || statusPeriodeTanggal.status !== 'terbuka') {
      setErrorMessage(
        'Tanggal transaksi berada pada periode akuntansi yang belum dibuka atau sudah ditutup.'
      );
      return;
    }

    // Validasi Keterangan
    if (!keterangan.trim() || keterangan.trim().length < 5) {
      setErrorMessage('Keterangan jurnal wajib diisi minimal 5 karakter.');
      return;
    }

    // Validasi Baris
    if (baris.length < 2) {
      setErrorMessage('Jurnal minimal harus terdiri dari 2 baris transaksi.');
      return;
    }

    // Validasi Baris terisi
    for (let i = 0; i < baris.length; i++) {
      const b = baris[i];
      if (!b.akun_id) {
        setErrorMessage(`Baris ke-${i + 1}: Silakan pilih akun akuntansi.`);
        return;
      }
      if (b.debit === 0 && b.kredit === 0) {
        setErrorMessage(`Baris ke-${i + 1}: Masukkan nilai nominal pada Debit atau Kredit.`);
        return;
      }
    }

    // Validasi Keseimbangan jika Posting
    if (targetStatus === 'diposting') {
      if (!isBalanced) {
        setErrorMessage(
          `Jurnal tidak seimbang. Total Debit (${formatRupiah(totalDebit)}) harus sama persis dengan Total Kredit (${formatRupiah(totalKredit)}) untuk dapat diposting.`
        );
        return;
      }
    }

    setLoading(true);

    try {
      const finalKeterangan =
        sumber === 'penyesuaian' && !keterangan.toLowerCase().includes('penyesuaian')
          ? `[Penyesuaian] ${keterangan.trim()}`
          : keterangan.trim();

      const result = await simpanJurnalAction({
        id: initialJurnal?.id,
        tanggal,
        keterangan: finalKeterangan,
        sumber: 'manual',
        target_status: targetStatus,
        baris: baris.map((b, idx) => ({
          id: b.id,
          urutan: idx + 1,
          akun_id: b.akun_id,
          debit: b.debit,
          kredit: b.kredit,
          keterangan: b.keterangan?.trim() || undefined,
        })),
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Gagal menyimpan jurnal.');
        setLoading(false);
        return;
      }

      // Berhasil disimpan / diposting
      router.push(`/jurnal/${result.data?.jurnalId || ''}`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kegagalan komunikasi jaringan.';
      setErrorMessage(msg);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto overflow-x-hidden">
      {/* Tombol Kembali & Judul */}
      <div className="flex items-center gap-3">
        <Link
          href="/jurnal"
          className="p-2 rounded-xl bg-white dark:bg-[#0b2419] border border-[#d4af37]/30 dark:border-[#d4af37]/25 text-[#06130D] dark:text-[#fdfbf7] hover:bg-[#fdfbf7] dark:hover:text-[#d4af37] transition-all shadow-xs"
          title="Kembali ke Daftar Jurnal"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#06130D] dark:text-[#fdfbf7] font-serif tracking-tight">
            {isEdit ? 'Ubah Jurnal Draf' : 'Formulir Jurnal Umum Baru'}
          </h1>
          <p className="text-xs sm:text-sm text-[#06130D]/70 dark:text-slate-400 mt-0.5">
            {isEdit
              ? 'Perbarui data transaksi pada draf jurnal sebelum diposting ke buku besar.'
              : 'Pencatatan ayat jurnal debit dan kredit manual atau penyesuaian akhir periode.'}
          </p>
        </div>
      </div>

      {/* Alert Error jika Ada */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-500/50 flex items-start gap-3 text-rose-800 dark:text-rose-200 text-xs sm:text-sm shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="leading-snug">{errorMessage}</div>
        </div>
      )}

      {/* 1. Header Informasi Transaksi */}
      <div className="bg-white dark:bg-[#0b2419] rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs p-6 sm:p-8 space-y-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#06130D] dark:text-[#d4af37] flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#06130D] dark:text-[#d4af37]" />
          <span>Informasi Kepala Jurnal</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
          {/* Tanggal Transaksi */}
          <div className="sm:col-span-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#06130D] dark:text-slate-300 mb-1.5">
              Tanggal Transaksi <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker?.();
                  } catch {}
                }}
                className="w-full p-2.5 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] cursor-pointer [color-scheme:light] dark:[color-scheme:dark] shadow-xs"
              />
              <Calendar className="w-4 h-4 text-[#06130D]/60 dark:text-[#d4af37] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Status Periode Tanggal */}
            <div className="mt-1 text-[11px]">
              {statusPeriodeTanggal ? (
                statusPeriodeTanggal.status === 'terbuka' ? (
                  <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-medium">
                    <Check className="w-3.5 h-3.5" />
                    <span>Periode {statusPeriodeTanggal.bulan}/{statusPeriodeTanggal.tahun} Terbuka</span>
                  </span>
                ) : (
                  <span className="text-rose-700 dark:text-rose-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Periode {statusPeriodeTanggal.bulan}/{statusPeriodeTanggal.tahun} Sudah Ditutup</span>
                  </span>
                )
              ) : (
                <span className="text-amber-700 dark:text-amber-400/90 italic">
                  Periode untuk tanggal ini belum dibuat.
                </span>
              )}
            </div>
          </div>

          {/* Jenis Sumber Transaksi */}
          <div className="sm:col-span-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#06130D] dark:text-slate-300 mb-1.5">
              Jenis Jurnal <span className="text-rose-500">*</span>
            </label>
            <select
              value={sumber}
              onChange={(e) => setSumber(e.target.value as 'manual' | 'penyesuaian')}
              className="w-full p-2.5 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] cursor-pointer shadow-xs"
            >
              <option value="manual">Jurnal Umum Manual</option>
              <option value="penyesuaian">Jurnal Penyesuaian (AJP)</option>
            </select>
          </div>

          {/* Keterangan Transaksi */}
          <div className="sm:col-span-5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#06130D] dark:text-slate-300 mb-1.5">
              Keterangan Transaksi <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Pengisian kas kecil toko, beban sewa..."
              className="w-full p-2.5 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 placeholder:text-[#06130D]/30 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] shadow-xs"
            />
            <span className="text-[10px] text-[#06130D]/60 dark:text-slate-400 mt-1 block">Minimal 5 karakter.</span>
          </div>
        </div>
      </div>

      {/* 2. Baris Dinamis Ayat Jurnal */}
      <div className="bg-white dark:bg-[#0b2419] rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#d4af37]/30 dark:border-[#d4af37]/15">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#06130D] dark:text-[#d4af37]">
              Rincian Baris Jurnal (Minimal 2 Baris)
            </h2>
            <p className="text-[11px] text-[#06130D]/70 dark:text-slate-400 mt-0.5">
              Setiap baris diisi Debit saja atau Kredit saja. Mengisi debit akan mengosongkan kredit baris tersebut, dan sebaliknya.
            </p>
          </div>

          <button
            type="button"
            onClick={handleTambahBaris}
            className="px-3 py-1.5 rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/40 bg-white dark:bg-[#123524] text-[#06130D] dark:text-[#d4af37] hover:bg-[#fdfbf7] dark:hover:bg-[#d4af37] dark:hover:text-[#06130D] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Baris</span>
          </button>
        </div>

        {/* Tabel Input Baris */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead>
              <tr className="text-[#06130D]/80 dark:text-[#d4af37] bg-[#fdfbf7] dark:bg-[#06150f] uppercase text-[10px] font-bold border-b border-[#d4af37]/30 dark:border-[#d4af37]/20">
                <th className="py-2.5 px-2 w-10 text-center">#</th>
                <th className="py-2.5 px-3 w-52 sm:w-64">Akun Rekening</th>
                <th className="py-2.5 px-3">Keterangan Baris (Opsional)</th>
                <th className="py-2.5 px-3 w-36 text-right">Debit (Rp)</th>
                <th className="py-2.5 px-3 w-36 text-right">Kredit (Rp)</th>
                <th className="py-2.5 px-2 w-12 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d4af37]/20 dark:divide-[#d4af37]/15">
              {baris.map((b, idx) => (
                <tr key={idx} className="hover:bg-[#fdfbf7]/80 dark:hover:bg-[#123524]/30 transition-colors">
                  {/* Nomor Baris */}
                  <td className="py-3 px-2 text-center font-mono text-[#06130D]/60 dark:text-slate-400">
                    {idx + 1}
                  </td>

                  {/* Dropdown Akun */}
                  <td className="py-3 px-3">
                    <select
                      value={b.akun_id}
                      onChange={(e) => handleAkunChange(idx, Number(e.target.value))}
                      className="w-full p-2 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] cursor-pointer shadow-xs"
                    >
                      {akunList.map((ak) => (
                        <option key={ak.id} value={ak.id}>
                          {ak.kode} — {formatTeksPuebi(ak.nama)} ({ak.tipe})
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Keterangan Baris */}
                  <td className="py-3 px-3">
                    <input
                      type="text"
                      value={b.keterangan || ''}
                      onChange={(e) => handleKeteranganBarisChange(idx, e.target.value)}
                      placeholder="Keterangan baris..."
                      className="w-full p-2 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 placeholder:text-[#06130D]/30 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] shadow-xs"
                    />
                  </td>

                  {/* Input Debit */}
                  <td className="py-3 px-3">
                    <input
                      type="text"
                      value={b.debit ? b.debit.toLocaleString('id-ID') : ''}
                      onChange={(e) => handleDebitChange(idx, e.target.value)}
                      placeholder="0"
                      className="w-full p-2 text-xs text-right font-mono font-bold rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 bg-white dark:bg-[#06150f] text-emerald-700 dark:text-emerald-400 placeholder:text-[#06130D]/30 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] shadow-xs"
                    />
                  </td>

                  {/* Input Kredit */}
                  <td className="py-3 px-3">
                    <input
                      type="text"
                      value={b.kredit ? b.kredit.toLocaleString('id-ID') : ''}
                      onChange={(e) => handleKreditChange(idx, e.target.value)}
                      placeholder="0"
                      className="w-full p-2 text-xs text-right font-mono font-bold rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 bg-white dark:bg-[#06150f] text-rose-700 dark:text-rose-400 placeholder:text-[#06130D]/30 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] shadow-xs"
                    />
                  </td>

                  {/* Tombol Hapus Baris */}
                  <td className="py-3 px-2 text-center">
                    <button
                      type="button"
                      disabled={baris.length <= 2}
                      onClick={() => handleHapusBaris(idx)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer"
                      title={baris.length <= 2 ? 'Minimal 2 baris transaksi' : 'Hapus baris ini'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 3. Panel Kalkulasi Real-Time & Keseimbangan */}
        <div className="pt-4 border-t border-[#d4af37]/30 dark:border-[#d4af37]/25 bg-[#fdfbf7] dark:bg-[#081c15] p-4 rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/20 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Status Keseimbangan */}
            <div className="flex items-center gap-2">
              <Scale className={`w-5 h-5 ${isBalanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`} />
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#06130D]/70 dark:text-slate-400 block">
                  Status Keseimbangan (Balance)
                </span>
                {isBalanced ? (
                  <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Seimbang (Debit = Kredit)</span>
                  </span>
                ) : (
                  <span className="text-xs font-extrabold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    <span>
                      Belum Seimbang (Selisih: {formatRupiah(selisih)})
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Total Debit, Total Kredit, dan Selisih */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-right">
              <div>
                <span className="text-[10px] text-[#06130D]/70 dark:text-slate-400 block uppercase">Total Debit</span>
                <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400">
                  {formatRupiah(totalDebit)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#06130D]/70 dark:text-slate-400 block uppercase">Total Kredit</span>
                <span className="text-sm font-bold font-mono text-rose-700 dark:text-rose-400">
                  {formatRupiah(totalKredit)}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1 border-t sm:border-t-0 sm:border-l border-[#d4af37]/30 dark:border-[#d4af37]/25 pt-1 sm:pt-0 sm:pl-3">
                <span className="text-[10px] text-[#06130D]/70 dark:text-slate-400 block uppercase">Selisih</span>
                <span
                  className={`text-sm font-bold font-mono ${
                    selisih === 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                  }`}
                >
                  {formatRupiah(selisih)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Tombol Aksi: Simpan Draf vs Posting (Sticky Bottom) */}
      <div className="sticky bottom-0 z-20 bg-white dark:bg-[#06130D] border border-[#d4af37]/30 dark:border-[#d4af37]/20 p-4 mt-auto rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <Link
          href="/jurnal"
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#d4af37]/30 dark:border-slate-700 text-[#06130D] dark:text-slate-300 hover:text-[#06130D] dark:hover:text-white hover:bg-[#fdfbf7] dark:hover:bg-[#06150f] text-xs font-semibold text-center transition-all shadow-xs"
        >
          Batalkan
        </Link>

        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2.5">
          {/* Tombol Simpan sebagai Draf (Selalu diperbolehkan walau belum seimbang) */}
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSubmit('draf')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/40 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-[#d4af37] hover:bg-[#fdfbf7] dark:hover:bg-[#123524] text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Simpan sebagai Draf</span>
          </button>

          {/* Tombol Posting Jurnal (HANYA BISA jika seimbang) */}
          <button
            type="button"
            disabled={loading || !isBalanced}
            onClick={() => handleSubmit('diposting')}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#06130D] hover:bg-[#0b2419] text-white border border-[#06130D] dark:border-[#d4af37] text-xs font-extrabold shadow-xs active:bg-[#06130D] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            title={
              !isBalanced
                ? 'Jurnal harus seimbang (Total Debit = Total Kredit) untuk diposting'
                : 'Posting jurnal resmi ke Buku Besar'
            }
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-[#d4af37]" />
                <span>Posting Jurnal Sekarang</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
