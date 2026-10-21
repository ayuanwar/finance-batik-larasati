'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { simpanPengajuanAction } from '../actions';
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
  Sparkles,
  X
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { Profile } from '@/types/database';

interface AkunBeban {
  id: number;
  kode: string;
  nama: string;
  tipe: string;
  aktif: boolean;
}

interface PengajuanFormClientProps {
  profile: Profile;
  akunBebanList: AkunBeban[];
}

export function PengajuanFormClient({ profile, akunBebanList }: PengajuanFormClientProps) {
  const router = useRouter();
  const supabase = createClient();

  // Hitung batas tanggal nota
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const minDateStr = thirtyDaysAgo.toISOString().split('T')[0];

  const [jenis, setJenis] = useState<'reimburse' | 'pengeluaran'>('reimburse');
  const [tanggalTransaksi, setTanggalTransaksi] = useState(todayStr);
  const [akunBebanId, setAkunBebanId] = useState<number | ''>(
    akunBebanList.length > 0 ? akunBebanList[0].id : ''
  );
  const [jumlah, setJumlah] = useState<number | ''>('');
  const [keterangan, setKeterangan] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle upload file preview
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
    if (isSubmittingDirect && !file) {
      return 'Bukti nota wajib diunggah untuk mengirimkan pengajuan.';
    }
    return null;
  };

  // Submit Handler
  const handleSubmit = async (targetStatus: 'draf' | 'kirim') => {
    setErrorMessage(null);
    const isKirim = targetStatus === 'kirim';

    const valError = validateForm(isKirim);
    if (valError) {
      setErrorMessage(valError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);

    try {
      let buktiPath: string | null = null;

      // 1. Unggah File Bukti jika ada
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
          throw new Error(`Gagal mengunggah berkas nota ke penyimpanan: ${uploadError.message}`);
        }

        buktiPath = storagePath;
      }

      // 2. Simpan Pengajuan melalui Server Action
      const result = await simpanPengajuanAction({
        jenis,
        tanggal_transaksi: tanggalTransaksi,
        akun_beban_id: Number(akunBebanId),
        jumlah: Number(jumlah),
        keterangan: keterangan.trim(),
        bukti_path: buktiPath,
        target_status: targetStatus,
      });

      if (!result.success || !result.docId) {
        throw new Error(result.error || 'Gagal menyimpan pengajuan ke sistem.');
      }

      // 3. Sukses -> Arahkan ke Halaman Detail Pengajuan
      router.push(`/pengajuan/${result.docId}`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kendala sistem saat memproses formulir.';
      setErrorMessage(msg);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tombol Kembali & Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/pengajuan"
          className="p-2 rounded-xl bg-[#0b2419] border border-[#d4af37]/30 text-slate-300 hover:text-[#d4af37] hover:border-[#d4af37] transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#fdfbf7] font-serif tracking-tight">
            Formulir Pengajuan Biaya
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
            Buat klaim penggantian biaya (*reimburse*) atau pengeluaran operasional CV Batik Larasati.
          </p>
        </div>
      </div>

      {/* Alert Kesalahan */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/50 flex items-start gap-3 text-rose-200 text-xs sm:text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
          <div className="leading-snug">{errorMessage}</div>
        </div>
      )}

      {/* Formulir Card */}
      <div className="bg-[#0b2419] rounded-2xl border border-[#d4af37]/30 shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Banner Info Peran Pengaju */}
        {profile.peran === 'akuntan' && (
          <div className="p-3.5 rounded-xl bg-[#123524] border border-[#d4af37]/40 text-[#fdfbf7] text-xs flex items-center gap-2.5">
            <Info className="w-4 h-4 text-[#d4af37] shrink-0" />
            <span>
              <strong>Perhatian:</strong> Sebagai Akuntan, pengajuan yang Anda kirim akan otomatis dialihkan ke <strong>Direktur</strong> untuk persetujuan (tidak bisa disetujui sendiri).
            </span>
          </div>
        )}

        {/* 1. Jenis Pengajuan */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#d4af37] mb-2">
            Jenis Transaksi
          </label>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <button
              type="button"
              onClick={() => setJenis('reimburse')}
              className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                jenis === 'reimburse'
                  ? 'bg-[#123524] border-[#d4af37] text-[#d4af37] shadow-md shadow-[#d4af37]/10'
                  : 'bg-[#06150f] border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              <span>Reimburse (Talangan Pribadi)</span>
            </button>
            <button
              type="button"
              onClick={() => setJenis('pengeluaran')}
              className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                jenis === 'pengeluaran'
                  ? 'bg-[#123524] border-[#d4af37] text-[#d4af37] shadow-md shadow-[#d4af37]/10'
                  : 'bg-[#06150f] border-slate-700 text-slate-400 hover:border-slate-500'
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
            <label htmlFor="tanggal" className="block text-xs font-bold uppercase tracking-wider text-[#d4af37] mb-1.5">
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
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#d4af37]/25 bg-[#06150f] text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] transition-all cursor-pointer [color-scheme:dark]"
              />
              <Calendar className="w-4 h-4 text-[#d4af37] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Maksimal 30 hari ke belakang (tidak boleh di masa depan).
            </p>
          </div>

          {/* Akun Beban */}
          <div>
            <label htmlFor="akun-beban" className="block text-xs font-bold uppercase tracking-wider text-[#d4af37] mb-1.5">
              Akun Beban Operasional
            </label>
            <select
              id="akun-beban"
              required
              value={akunBebanId}
              onChange={(e) => setAkunBebanId(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#d4af37]/25 bg-[#06150f] text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] transition-all cursor-pointer"
            >
              {akunBebanList.map((akun) => (
                <option key={akun.id} value={akun.id}>
                  {akun.kode} — {akun.nama}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Hanya akun beban (5xxx) aktif yang dapat dipilih.
            </p>
          </div>
        </div>

        {/* 3. Jumlah Nominal Rupiah */}
        <div>
          <label htmlFor="jumlah" className="block text-xs font-bold uppercase tracking-wider text-[#d4af37] mb-1.5">
            Jumlah Uang (Rupiah Bulat)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#d4af37] font-bold text-xs">
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
              className="w-full pl-10 pr-4 py-2.5 text-sm font-mono font-bold rounded-xl border border-[#d4af37]/25 bg-[#06150f] text-[#fdfbf7] placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] transition-all"
            />
          </div>
          <div className="flex items-center justify-between mt-1 text-[11px]">
            <span className="text-slate-400">Batas: Rp10.000 s/d Rp25.000.000</span>
            <span className="text-[#f3c853] font-bold">
              {jumlah ? formatRupiah(jumlah) : 'Rp0'}
            </span>
          </div>
        </div>

        {/* 4. Keperluan / Keterangan */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="keterangan" className="block text-xs font-bold uppercase tracking-wider text-[#d4af37]">
              Keperluan Transaksi (Minimal 10 Karakter)
            </label>
            <span className={`text-[11px] font-mono ${keterangan.trim().length >= 10 ? 'text-emerald-400' : 'text-slate-400'}`}>
              {keterangan.trim().length}/10 karakter
            </span>
          </div>
          <textarea
            id="keterangan"
            rows={3}
            required
            placeholder="Jelaskan tujuan pengeluaran ini secara rinci (contoh: Pembelian lilin batik klowong 5 kg di Pasar Klewer)..."
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            className="w-full p-3 text-xs rounded-xl border border-[#d4af37]/25 bg-[#06150f] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] transition-all"
          />
        </div>

        {/* 5. Unggah Bukti Nota Fisik */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#d4af37]">
              Bukti Nota Fisik (JPG, PNG, atau PDF - Maks. 5 MB)
            </label>
            <span className="text-[11px] text-slate-400">
              *Wajib untuk kirim, opsional untuk draf
            </span>
          </div>

          <div
            className={`border-2 border-dashed rounded-2xl p-5 text-center bg-[#06150f] transition-colors ${
              errorMessage && errorMessage.includes('Bukti nota')
                ? 'border-rose-500 bg-rose-950/20'
                : 'border-[#d4af37]/30 hover:border-[#d4af37]/60'
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
              <Upload className="w-8 h-8 mx-auto text-[#d4af37]" />
              <div className="text-xs font-bold text-[#fdfbf7]">
                {file ? file.name : 'Klik untuk memilih foto nota atau seret ke sini'}
              </div>
              <p className="text-[11px] text-slate-400">
                Format diperbolehkan: JPG, PNG, atau PDF (Maksimal 5 MB)
              </p>
            </label>

            {file && (
              <div className="mt-3 flex items-center justify-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <FileCheck className="w-4 h-4" />
                  <span>Berkas terpilih: {file.name} ({(file.size / 1024).toFixed(0)} KB)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setFilePreview(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 hover:text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Batalkan pilihan berkas ini"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Batal Pilih</span>
                </button>
              </div>
            )}

            {filePreview && (
              <div className="mt-4 max-w-xs mx-auto rounded-xl overflow-hidden border border-[#d4af37]/30 shadow-md">
                <img src={filePreview} alt="Pratinjau Nota" className="w-full h-auto object-cover max-h-48" />
              </div>
            )}
          </div>

          {errorMessage && errorMessage.includes('Bukti nota') && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 flex items-center gap-2 text-rose-200 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* 6. Tombol Aksi */}
        <div className="pt-4 border-t border-[#d4af37]/20 flex flex-col sm:flex-row items-center justify-end gap-3">
          <Link
            href="/pengajuan"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-[#06150f] text-xs font-bold text-center transition-colors"
          >
            Batal
          </Link>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleSubmit('draf')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#d4af37]/40 bg-[#06150f] text-[#d4af37] hover:bg-[#123524] text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
          >
            Simpan sebagai Draf
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleSubmit('kirim')}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3c853] to-[#d4af37] text-[#081c15] text-xs font-extrabold shadow-lg shadow-[#d4af37]/20 hover:brightness-110 active:brightness-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#081c15]" />
                <span>Memproses...</span>
              </>
            ) : (
              <span>Kirim Pengajuan</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
