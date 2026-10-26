'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { simpanPengajuanAction } from '../../actions';
import {
  FileText,
  Upload,
  Calendar,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Info,
  DollarSign,
  FileCheck,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
  Trash2,
  X,
  Undo2
} from 'lucide-react';
import { formatRupiah, formatTanggalIndo } from '@/lib/utils';
import { Profile } from '@/types/database';

interface AkunBeban {
  id: number;
  kode: string;
  nama: string;
  tipe: string;
  aktif: boolean;
}

interface PengajuanEditFormClientProps {
  profile: Profile;
  pengajuan: any;
  signedBuktiUrl: string | null;
  akunBebanList: AkunBeban[];
}

export function PengajuanEditFormClient({
  profile,
  pengajuan,
  signedBuktiUrl,
  akunBebanList,
}: PengajuanEditFormClientProps) {
  const router = useRouter();
  const supabase = createClient();

  // Hitung batas tanggal nota
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const minDateStr = thirtyDaysAgo.toISOString().split('T')[0];

  const [jenis, setJenis] = useState<'reimburse' | 'pengeluaran'>(
    pengajuan.jenis || 'reimburse'
  );
  const [tanggalTransaksi, setTanggalTransaksi] = useState<string>(
    pengajuan.tanggal_transaksi || todayStr
  );
  const [akunBebanId, setAkunBebanId] = useState<number | ''>(
    pengajuan.akun_beban_id || (akunBebanList.length > 0 ? akunBebanList[0].id : '')
  );
  const [jumlah, setJumlah] = useState<number | ''>(pengajuan.jumlah || '');
  const [keterangan, setKeterangan] = useState<string>(pengajuan.keterangan || '');

  // File upload state (jika ingin mengganti berkas bukti)
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [existingBuktiPath, setExistingBuktiPath] = useState<string | null>(
    pengajuan.bukti_path || null
  );
  const [fileDihapus, setFileDihapus] = useState<boolean>(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleHapusExistingBukti = () => {
    setExistingBuktiPath(null);
    setFileDihapus(true);
    setFile(null);
    setFilePreview(null);
  };

  const handleUrungkanHapus = () => {
    setExistingBuktiPath(pengajuan.bukti_path || null);
    setFileDihapus(false);
  };

  const handleHapusFileBaru = () => {
    setFile(null);
    setFilePreview(null);
  };

  // Handle upload file baru
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const selected = e.target.files?.[0];
    if (!selected) {
      setFile(null);
      setFilePreview(null);
      return;
    }

    // Validasi ukuran maks 5 MB
    if (selected.size > 5 * 1024 * 1024) {
      setErrorMessage('Ukuran file bukti melebihi 5 MB. Silakan kompres atau pilih file lain.');
      return;
    }

    // Validasi format file (JPG, PNG, PDF)
    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(selected.type)) {
      setErrorMessage('Format bukti harus berupa gambar (JPG, PNG) atau dokumen PDF.');
      return;
    }

    setFile(selected);
    if (selected.type.startsWith('image/')) {
      setFilePreview(URL.createObjectURL(selected));
    } else {
      setFilePreview(null);
    }
  };

  // Validasi formulir pengajuan
  const validateForm = (isSubmittingDirect: boolean) => {
    if (!tanggalTransaksi) {
      return 'Tanggal transaksi nota wajib diisi.';
    }
    if (tanggalTransaksi > todayStr) {
      return 'Tanggal transaksi tidak boleh berada di masa depan.';
    }
    if (tanggalTransaksi < minDateStr) {
      return 'Tanggal transaksi maksimal 30 hari sebelum pengajuan dikirim.';
    }
    if (!akunBebanId) {
      return 'Pilih akun beban operasional.';
    }
    if (!jumlah || Number(jumlah) < 10000 || Number(jumlah) > 25000000) {
      return 'Nilai pengajuan harus berada di antara Rp10.000 dan Rp25.000.000 (rupiah bulat).';
    }
    if (keterangan.trim().length < 10) {
      return 'Keperluan pengajuan wajib diisi minimal 10 karakter.';
    }
    if (isSubmittingDirect && !file && !existingBuktiPath) {
      return 'Bukti nota wajib diunggah untuk mengirimkan pengajuan.';
    }
    return null;
  };

  // Submit Handler: Simpan Perubahan (tetap draf) atau Kirim Ulang
  const handleSubmit = async (actionType: 'simpan' | 'kirim') => {
    setErrorMessage(null);
    const isKirim = actionType === 'kirim';

    const valError = validateForm(isKirim);
    if (valError) {
      setErrorMessage(valError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);

    try {
      let finalBuktiPath = existingBuktiPath;

      // 1. Unggah File Bukti Baru jika pengguna memilih file baru
      if (file) {
        const fileExt = file.name.split('.').pop() || 'jpg';
        const sanitizedBase = file.name.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${Date.now()}_${sanitizedBase}.${fileExt}`;
        const storagePath = `${profile.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('bukti-pengajuan')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Gagal mengunggah berkas nota baru: ${uploadError.message}`);
        }

        finalBuktiPath = storagePath;
      } else if (!existingBuktiPath) {
        // Berkas nota sengaja dihapus/dikosongkan oleh pengguna
        finalBuktiPath = null;
      }

      // 2. Simpan Perubahan melalui Server Action
      const result = await simpanPengajuanAction({
        id: pengajuan.id,
        jenis,
        tanggal_transaksi: tanggalTransaksi,
        akun_beban_id: Number(akunBebanId),
        jumlah: Number(jumlah),
        keterangan: keterangan.trim(),
        bukti_path: finalBuktiPath,
        target_status: actionType === 'kirim' ? 'kirim' : 'draf',
      });

      if (!result.success) {
        throw new Error(result.error || 'Gagal memperbarui pengajuan ke sistem.');
      }

      // 3. Sukses -> Arahkan ke Detail Pengajuan
      router.push(`/pengajuan/${pengajuan.id}`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kendala sistem saat menyimpan data.';
      setErrorMessage(msg);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Back Button */}
      <div className="flex items-center gap-3">
        <Link
          href={`/pengajuan/${pengajuan.id}`}
          className="p-2 rounded-xl bg-white dark:bg-[#0b2419] border border-[#d4af37]/30 text-[#06130D] dark:text-slate-300 hover:text-[#06130D] dark:hover:text-[#d4af37] hover:border-[#d4af37]/50 transition-all shadow-xs"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#06130D] dark:text-[#fdfbf7] font-serif tracking-tight">
              Ubah Pengajuan Biaya
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#fdfbf7] dark:bg-[#123524] text-[#06130D] dark:text-[#d4af37] border border-[#d4af37]/30">
              {pengajuan.nomor}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#06130D]/70 dark:text-slate-400 mt-0.5">
            Perbarui data transaksi atau unggah nota pengganti sebelum dikirimkan ulang untuk verifikasi.
          </p>
        </div>
      </div>

      {/* Catatan Peninjau jika status adalah perlu_revisi */}
      {pengajuan.status === 'perlu_revisi' && pengajuan.catatan_peninjau && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-[#d4af37]/50 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-700 dark:text-[#f3c853] mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-amber-900 dark:text-[#f3c853] block">
              Catatan Peninjau (Alasan Perlu Revisi):
            </span>
            <p className="text-gray-700 dark:text-slate-200 italic leading-relaxed">
              &ldquo;{pengajuan.catatan_peninjau}&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* Alert Kesalahan */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-500/50 flex items-start gap-3 text-rose-900 dark:text-rose-200 text-xs sm:text-sm shadow-xs">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          <div className="leading-snug">{errorMessage}</div>
        </div>
      )}

      {/* Formulir Card */}
      <div className="bg-white dark:bg-[#0b2419] rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/30 shadow-xs p-6 sm:p-8 space-y-6">
        {/* Banner Info Peran Pengaju */}
        {profile.peran === 'akuntan' && (
          <div className="p-3.5 rounded-xl bg-[#fdfbf7] dark:bg-[#123524] border border-[#d4af37]/30 dark:border-[#d4af37]/40 text-[#06130D] dark:text-[#fdfbf7] text-xs flex items-center gap-2.5">
            <Info className="w-4 h-4 text-[#06130D] dark:text-[#d4af37] shrink-0" />
            <span>
              <strong>Perhatian:</strong> Sebagai Akuntan, pengajuan yang Anda kirim akan otomatis dialihkan ke <strong>Direktur</strong> untuk persetujuan.
            </span>
          </div>
        )}

        {/* 1. Jenis Pengajuan */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#06130D] dark:text-[#d4af37] mb-2">
            Jenis Transaksi
          </label>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <button
              type="button"
              onClick={() => setJenis('reimburse')}
              className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                jenis === 'reimburse'
                  ? 'bg-[#fdfbf7] dark:bg-[#123524] border-[#06130D] dark:border-[#d4af37] text-[#06130D] dark:text-[#d4af37] shadow-xs'
                  : 'bg-white dark:bg-[#06150f] border-[#d4af37]/30 dark:border-slate-700 text-[#06130D]/70 dark:text-slate-400 hover:border-[#d4af37]/60'
              }`}
            >
              <span>Reimburse (Talangan Pribadi)</span>
            </button>
            <button
              type="button"
              onClick={() => setJenis('pengeluaran')}
              className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                jenis === 'pengeluaran'
                  ? 'bg-[#fdfbf7] dark:bg-[#123524] border-[#06130D] dark:border-[#d4af37] text-[#06130D] dark:text-[#d4af37] shadow-xs'
                  : 'bg-white dark:bg-[#06150f] border-[#d4af37]/30 dark:border-slate-700 text-[#06130D]/70 dark:text-slate-400 hover:border-[#d4af37]/60'
              }`}
            >
              <span>Pengeluaran Langsung Toko</span>
            </button>
          </div>
        </div>

        {/* 2. Grid Tanggal & Akun Beban */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Tanggal Transaksi */}
          <div>
            <label htmlFor="tanggal" className="block text-xs font-bold uppercase tracking-wider text-[#06130D] dark:text-[#d4af37] mb-1.5">
              Tanggal Nota Fisik
            </label>
            <div className="relative">
              <input
                id="tanggal"
                type="date"
                required
                max={todayStr}
                min={minDateStr}
                value={tanggalTransaksi}
                onChange={(e) => setTanggalTransaksi(e.target.value)}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker?.();
                  } catch {}
                }}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] transition-all cursor-pointer shadow-xs dark:[color-scheme:dark]"
              />
              <Calendar className="w-4 h-4 text-[#06130D]/60 dark:text-[#d4af37] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[11px] text-[#06130D]/60 dark:text-slate-400 mt-1">
              Maksimal 30 hari ke belakang (tidak boleh di masa depan).
            </p>
          </div>

          {/* Akun Beban */}
          <div>
            <label htmlFor="akun-beban" className="block text-xs font-bold uppercase tracking-wider text-[#06130D] dark:text-[#d4af37] mb-1.5">
              Akun Beban Operasional
            </label>
            <select
              id="akun-beban"
              required
              value={akunBebanId}
              onChange={(e) => setAkunBebanId(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] transition-all cursor-pointer shadow-xs"
            >
              {akunBebanList.map((akun) => (
                <option key={akun.id} value={akun.id}>
                  {akun.kode} — {akun.nama}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[#06130D]/60 dark:text-slate-400 mt-1">
              Hanya akun beban (5xxx) aktif yang dapat dipilih.
            </p>
          </div>
        </div>

        {/* 3. Jumlah Nominal Rupiah */}
        <div>
          <label htmlFor="jumlah" className="block text-xs font-bold uppercase tracking-wider text-[#06130D] dark:text-[#d4af37] mb-1.5">
            Jumlah Uang (Rupiah Bulat)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#06130D]/60 dark:text-[#d4af37] font-bold text-xs">
              Rp
            </span>
            <input
              id="jumlah"
              type="number"
              min={10000}
              max={25000000}
              step={1}
              required
              placeholder="Contoh: 150000"
              value={jumlah}
              onChange={(e) => setJumlah(e.target.value ? Number(e.target.value) : '')}
              className="w-full pl-10 pr-4 py-2.5 text-sm font-mono font-bold rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-[#fdfbf7] placeholder:text-[#06130D]/30 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] transition-all shadow-xs"
            />
          </div>
          <div className="flex items-center justify-between mt-1 text-[11px]">
            <span className="text-[#06130D]/60 dark:text-slate-400">Batas: Rp10.000 s/d Rp25.000.000</span>
            <span className="text-[#06130D] dark:text-[#f3c853] font-bold">
              {jumlah ? formatRupiah(jumlah) : 'Rp0'}
            </span>
          </div>
        </div>

        {/* 4. Keperluan / Keterangan */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="keterangan" className="block text-xs font-bold uppercase tracking-wider text-[#06130D] dark:text-[#d4af37]">
              Keperluan Transaksi (Minimal 10 Karakter)
            </label>
            <span className={`text-[11px] font-mono ${keterangan.trim().length >= 10 ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#06130D]/60 dark:text-slate-400'}`}>
              {keterangan.trim().length}/10 karakter
            </span>
          </div>
          <textarea
            id="keterangan"
            rows={3}
            required
            placeholder="Jelaskan tujuan pengeluaran ini secara rinci..."
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            className="w-full p-3 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 placeholder:text-[#06130D]/30 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] transition-all shadow-xs"
          />
        </div>

        {/* 5. Berkas Bukti Nota */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#06130D] dark:text-[#d4af37]">
              Bukti Nota Fisik (JPG, PNG, atau PDF - Maks. 5 MB)
            </label>
            {existingBuktiPath && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <FileCheck className="w-3.5 h-3.5" />
                Ada berkas tersimpan
              </span>
            )}
            {fileDihapus && !file && (
              <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" />
                Berkas ditandai untuk dihapus
              </span>
            )}
          </div>

          {/* Menampilkan bukti yang sudah ada saat ini */}
          {existingBuktiPath && !file && (
            <div className="p-3.5 rounded-xl bg-[#fdfbf7] dark:bg-[#06150f] border border-[#d4af37]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
              <div className="flex items-center gap-2.5">
                <FileCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <span className="text-[#06130D] dark:text-slate-200 font-semibold block">
                    Berkas Nota Saat Ini Tersimpan
                  </span>
                  <span className="text-[11px] text-[#06130D]/60 dark:text-slate-400 font-mono">
                    {existingBuktiPath.split('/').pop()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {signedBuktiUrl && (
                  <a
                    href={signedBuktiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#d4af37]/30 dark:border-[#d4af37]/40 bg-white dark:bg-[#123524] text-[#06130D] dark:text-[#d4af37] hover:bg-[#fdfbf7] dark:hover:bg-[#1b4332] text-xs font-bold transition-all w-fit shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Lihat Berkas Nota</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={handleHapusExistingBukti}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-bold transition-all cursor-pointer shadow-xs"
                  title="Hapus berkas bukti nota dari pengajuan ini"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus File/Bukti</span>
                </button>
              </div>
            </div>
          )}

          {/* Banner notifikasi jika berkas lama telah dihapus */}
          {fileDihapus && !file && !existingBuktiPath && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 shadow-xs">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  Berkas bukti telah ditandai untuk dihapus. Klik <strong>Simpan Perubahan</strong> untuk mengosongkan berkas dari database, atau pilih berkas baru di bawah.
                </span>
              </div>
              {pengajuan.bukti_path && (
                <button
                  type="button"
                  onClick={handleUrungkanHapus}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#123524] border border-[#d4af37]/30 dark:border-[#d4af37]/40 text-[#06130D] dark:text-[#d4af37] text-xs font-bold hover:bg-[#fdfbf7] dark:hover:bg-[#1a442e] transition-all shrink-0 cursor-pointer w-fit shadow-xs"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Urungkan</span>
                </button>
              )}
            </div>
          )}

          {/* Upload form pengganti */}
          <div
            className={`border-2 border-dashed rounded-2xl p-5 text-center bg-[#fdfbf7] dark:bg-[#06150f] transition-colors ${
              errorMessage && errorMessage.includes('Bukti nota')
                ? 'border-rose-400 dark:border-rose-500 bg-rose-50 dark:bg-rose-950/20'
                : 'border-[#d4af37]/30 dark:border-[#d4af37]/30 hover:border-[#d4af37]/60'
            }`}
          >
            <input
              type="file"
              id="file-bukti"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="file-bukti" className="cursor-pointer block space-y-2">
              <Upload className="w-8 h-8 mx-auto text-[#06130D]/60 dark:text-[#d4af37]" />
              <div className="text-xs font-bold text-[#06130D] dark:text-[#fdfbf7]">
                {file
                  ? file.name
                  : existingBuktiPath
                  ? 'Unggah berkas pengganti (opsional)'
                  : 'Klik untuk memilih foto nota atau seret ke sini'}
              </div>
              <p className="text-[11px] text-[#06130D]/60 dark:text-slate-400">
                Format diperbolehkan: JPG, PNG, atau PDF (Maksimal 5 MB)
              </p>
            </label>

            {file && (
              <div className="mt-3 flex items-center justify-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <FileCheck className="w-4 h-4" />
                  <span>Berkas baru dipilih: {file.name} ({(file.size / 1024).toFixed(0)} KB)</span>
                </div>
                <button
                  type="button"
                  onClick={handleHapusFileBaru}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                  title="Batalkan pilihan berkas baru ini"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Batal Pilih</span>
                </button>
              </div>
            )}

            {filePreview && (
              <div className="mt-4 max-w-xs mx-auto rounded-xl overflow-hidden border border-[#d4af37]/30 shadow-xs">
                <img src={filePreview} alt="Pratinjau Nota" className="w-full h-auto object-cover max-h-48" />
              </div>
            )}
          </div>

          {errorMessage && errorMessage.includes('Bukti nota') && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-500/50 flex items-center gap-2 text-rose-900 dark:text-rose-200 text-xs shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* 6. Tombol Aksi */}
        <div className="pt-4 border-t border-[#d4af37]/30 dark:border-[#d4af37]/20 flex flex-col sm:flex-row items-center justify-end gap-3">
          <Link
            href={`/pengajuan/${pengajuan.id}`}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#d4af37]/30 dark:border-slate-700 text-[#06130D] dark:text-slate-300 hover:bg-[#fdfbf7] dark:hover:bg-[#06150f] text-xs font-bold text-center transition-colors shadow-xs"
          >
            Batal
          </Link>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleSubmit('simpan')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/40 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-[#d4af37] hover:bg-[#fdfbf7] dark:hover:bg-[#123524] text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
          >
            Simpan Perubahan
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleSubmit('kirim')}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#06130D] hover:bg-[#0b2419] text-white border border-[#06130D] dark:border-[#d4af37] text-xs font-bold shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <span>Kirimkan Pengajuan</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
