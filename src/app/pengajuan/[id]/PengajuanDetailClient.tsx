'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  kirimPengajuanAction,
  verifikasiPengajuanAction,
  setujuiPengajuanDirekturAction,
  revisiAtauTolakPengajuanAction,
  bayarPengajuanAction,
} from '../actions';
import {
  ArrowLeft,
  Calendar,
  User,
  CreditCard,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck,
  ExternalLink,
  Loader2,
  AlertCircle,
  Send,
  Ban,
  Check,
  Sparkles,
  ArrowRight,
  Wallet,
  Receipt
} from 'lucide-react';
import { formatRupiah, formatTanggalIndo, formatTanggalWaktuIndo, formatTeksPuebi } from '@/lib/utils';
import { Profile } from '@/types/database';

interface PengajuanDetailClientProps {
  profile: Profile;
  pengajuan: any;
  signedBuktiUrl: string | null;
  akunKasList: Array<{
    id: number;
    kode: string;
    nama: string;
    tipe: string;
  }>;
  jurnalPembayaran: any;
}

export function PengajuanDetailClient({
  profile,
  pengajuan: initialDoc,
  signedBuktiUrl,
  akunKasList,
  jurnalPembayaran: initialJurnal,
}: PengajuanDetailClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [doc, setDoc] = useState(initialDoc);
  const [jurnal, setJurnal] = useState(initialJurnal);

  // State untuk form pembayaran
  const [selectedAkunKasId, setSelectedAkunKasId] = useState<number | ''>(
    akunKasList.length > 0 ? akunKasList[0].id : ''
  );
  const [saldoKasTerpilih, setSaldoKasTerpilih] = useState<number | null>(null);
  const [loadingSaldo, setLoadingSaldo] = useState(false);
  const [tanggalBayar, setTanggalBayar] = useState(
    new Date().toISOString().split('T')[0]
  );

  // State Modal Catatan Peninjau (Revisi / Tolak)
  const [modalMode, setModalMode] = useState<'revisi' | 'tolak' | null>(null);
  const [catatanText, setCatatanText] = useState('');

  // Status loading & feedback
  const [loadingAction, setLoadingAction] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isOwner = profile.id === doc.pengaju_id;
  const isAkuntan = profile.peran === 'akuntan';
  const isDirektur = profile.peran === 'direktur';

  // Ambil saldo akun kas terpilih secara real-time saat dropdown berubah
  useEffect(() => {
    async function fetchSaldo() {
      if (!selectedAkunKasId) return;
      setLoadingSaldo(true);
      try {
        const { data: saldoVal, error } = await supabase.rpc('get_saldo_akun', {
          p_akun_id: Number(selectedAkunKasId),
        });
        if (!error && saldoVal !== null && saldoVal !== undefined) {
          setSaldoKasTerpilih(Number(saldoVal));
        } else {
          setSaldoKasTerpilih(0);
        }
      } catch {
        setSaldoKasTerpilih(0);
      } finally {
        setLoadingSaldo(false);
      }
    }

    if (doc.status === 'disetujui' && isAkuntan) {
      fetchSaldo();
    }
  }, [selectedAkunKasId, doc.status, isAkuntan]);

  // Handler: Kirim Pengajuan dari Draf/Revisi
  const handleKirimUlang = async () => {
    if (!doc.bukti_path) {
      setErrorMessage(
        'Bukti nota wajib diunggah untuk mengirimkan pengajuan. Silakan klik tombol "Ubah Formulir" untuk melampirkan berkas nota.'
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoadingAction(true);
    setErrorMessage(null);
    try {
      const res = await kirimPengajuanAction(doc.id);
      if (!res.success) {
        throw new Error(res.error || 'Gagal mengirimkan pengajuan.');
      }

      const nextStatus = profile.peran === 'akuntan' ? 'menunggu_direktur' : 'diajukan';
      const now = new Date().toISOString();

      setDoc({ ...doc, status: nextStatus, diajukan_pada: now });
      setSuccessMessage('Pengajuan berhasil dikirim untuk diverifikasi.');
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal mengirim pengajuan.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Handler: Batalkan Pengajuan (oleh pemilik)
  const handleBatalkan = async () => {
    if (!confirm('Apakah Anda yakin ingin membatalkan pengajuan ini?')) return;
    setLoadingAction(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase
        .from('pengajuan')
        .update({ status: 'dibatalkan' })
        .eq('id', doc.id);

      if (error) throw new Error(error.message);

      setDoc({ ...doc, status: 'dibatalkan' });
      setSuccessMessage('Pengajuan telah dibatalkan.');
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal membatalkan pengajuan.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Handler: Verifikasi oleh Akuntan (Setujui <= 1jt ATAU Teruskan > 1jt)
  const handleVerifikasiAkuntan = async () => {
    setLoadingAction(true);
    setErrorMessage(null);
    try {
      const res = await verifikasiPengajuanAction(doc.id);
      if (!res.success) throw new Error(res.error || 'Gagal memverifikasi pengajuan.');

      const nextStatus = res.status as 'disetujui' | 'menunggu_direktur';
      const isAutoApprove = nextStatus === 'disetujui';

      setDoc({
        ...doc,
        status: nextStatus,
        diverifikasi: { nama_lengkap: profile.nama_lengkap, peran: profile.peran },
        ...(isAutoApprove
          ? { disetujui: { nama_lengkap: profile.nama_lengkap, peran: profile.peran } }
          : {}),
      });

      setSuccessMessage(
        isAutoApprove
          ? 'Pengajuan disetujui (nilai ≤ Rp1.000.000 siap dibayar).'
          : 'Pengajuan diteruskan ke Direktur (notifikasi email telah dikirimkan).'
      );
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal memverifikasi pengajuan.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Handler: Persetujuan oleh Direktur
  const handleSetujuiDirektur = async () => {
    setLoadingAction(true);
    setErrorMessage(null);
    try {
      const res = await setujuiPengajuanDirekturAction(doc.id);
      if (!res.success) throw new Error(res.error || 'Gagal menyetujui pengajuan.');

      setDoc({
        ...doc,
        status: 'disetujui',
        disetujui_oleh: profile.id,
        disetujui_pada: new Date().toISOString(),
        disetujui: { nama_lengkap: profile.nama_lengkap, peran: profile.peran },
      });

      setSuccessMessage('Pengajuan telah disetujui oleh Direktur dan siap dibayar.');
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal menyetujui pengajuan.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Handler: Submit Catatan Revisi atau Tolak (Minimal 10 karakter)
  const handleSubmitCatatan = async () => {
    if (catatanText.trim().length < 10) {
      setErrorMessage('Catatan wajib diisi minimal 10 karakter.');
      return;
    }

    setLoadingAction(true);
    setErrorMessage(null);
    try {
      const mode = modalMode as 'revisi' | 'tolak';
      const res = await revisiAtauTolakPengajuanAction(doc.id, mode, catatanText.trim());
      if (!res.success) throw new Error(res.error || 'Gagal memperbarui status pengajuan.');

      const nextStatus = mode === 'revisi' ? 'perlu_revisi' : 'ditolak';

      setDoc({
        ...doc,
        status: nextStatus,
        catatan_peninjau: catatanText.trim(),
      });

      setSuccessMessage(
        mode === 'revisi'
          ? 'Pengajuan dikembalikan ke pengaju dengan status Perlu Revisi (email pemberitahuan telah dikirim).'
          : 'Pengajuan telah ditolak (email pemberitahuan telah dikirim ke pengaju).'
      );
      setModalMode(null);
      setCatatanText('');
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal memperbarui status pengajuan.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Handler: Eksekusi Pembayaran Atomik (FOR UPDATE Lock)
  const handleBayarPengajuan = async () => {
    if (!selectedAkunKasId) {
      setErrorMessage('Silakan pilih akun kas atau bank sumber pembayaran.');
      return;
    }
    if (!tanggalBayar) {
      setErrorMessage('Tanggal pembayaran wajib diisi.');
      return;
    }

    setLoadingAction(true);
    setErrorMessage(null);
    try {
      const res = await bayarPengajuanAction(doc.id, Number(selectedAkunKasId), tanggalBayar);
      if (!res.success) throw new Error(res.error || 'Gagal memproses pembayaran.');

      // Ambil data akun kas terpilih
      const kasTerpilih = akunKasList.find((k) => k.id === Number(selectedAkunKasId));

      setDoc({
        ...doc,
        status: 'dibayar',
        akun_kas_id: Number(selectedAkunKasId),
        akun_kas: kasTerpilih,
        dibayar_oleh: profile.id,
        dibayar_pada: new Date().toISOString(),
        dibayar: { nama_lengkap: profile.nama_lengkap, peran: profile.peran },
      });

      setJurnal({
        id: res.result?.jurnal_id,
        nomor: res.result?.nomor_jurnal,
        tanggal: tanggalBayar,
        status: 'diposting',
      });

      setSuccessMessage(
        `Pembayaran berhasil! Jurnal otomatis ${res.result?.nomor_jurnal || ''} telah diposting & email konfirmasi dikirim ke pengaju.`
      );
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal memproses pembayaran.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Status Badge Styling
  const badgeStatusMap: Record<string, string> = {
    draf: 'bg-[#18231e] text-slate-400 border-slate-700',
    diajukan: 'bg-blue-950/80 text-blue-300 border-blue-500/40 font-semibold',
    menunggu_direktur: 'bg-purple-950/80 text-purple-300 border-purple-500/40 font-bold',
    disetujui: 'bg-[#123524] text-emerald-300 border-emerald-500/40 font-bold',
    dibayar: 'bg-[#0f2e1f] text-emerald-300 border-emerald-500/50 font-bold',
    perlu_revisi: 'bg-amber-950/80 text-[#f3c853] border-amber-500/50 font-bold',
    ditolak: 'bg-rose-950/80 text-rose-300 border-rose-500/40 font-semibold',
    dibatalkan: 'bg-[#18231e] text-slate-500 border-slate-800',
  };

  const labelStatusMap: Record<string, string> = {
    draf: 'Draf',
    diajukan: 'Menunggu Verifikasi Akuntan',
    menunggu_direktur: 'Menunggu Persetujuan Direktur',
    disetujui: 'Disetujui (Siap Dibayar)',
    dibayar: 'Selesai Dibayar',
    perlu_revisi: 'Perlu Revisi',
    ditolak: 'Ditolak',
    dibatalkan: 'Dibatalkan',
  };

  const badgeStatus = badgeStatusMap[doc.status] || 'bg-[#081c15] text-slate-300 border-slate-700';
  const labelStatus = labelStatusMap[doc.status] || doc.status;

  return (
    <div className="space-y-6">
      {/* 1. Header & Tombol Navigasi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#d4af37]/20">
        <div className="flex items-center gap-3">
          <Link
            href="/pengajuan"
            className="p-2 rounded-xl bg-[#0b2419] border border-[#d4af37]/30 text-slate-300 hover:text-[#d4af37] hover:border-[#d4af37] transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl sm:text-2xl font-extrabold text-[#fdfbf7]">
                {doc.nomor}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] border ${badgeStatus}`}>
                {labelStatus}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Dibuat pada {formatTanggalWaktuIndo(doc.dibuat_pada)}
            </p>
          </div>
        </div>

        {/* Edit Link jika draf/perlu revisi & pemilik */}
        {isOwner && ['draf', 'perlu_revisi'].includes(doc.status) && (
          <Link
            href={`/pengajuan/${doc.id}/ubah`}
            className="px-4 py-2 rounded-xl border border-[#d4af37]/40 bg-[#06150f] text-[#d4af37] hover:bg-[#123524] text-xs font-bold transition-all w-fit cursor-pointer"
          >
            Ubah Formulir
          </Link>
        )}
      </div>

      {/* Alert Notifikasi Sukses / Gagal */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-start gap-3 text-emerald-200 text-xs sm:text-sm animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
          <div className="leading-snug">{successMessage}</div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/50 flex items-start gap-3 text-rose-200 text-xs sm:text-sm animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
          <div className="leading-snug">{errorMessage}</div>
        </div>
      )}

      {/* 2. Grid Dua Kolom: Detail Dokumen & Panel Aksi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri (2 Kolom): Rincian Pengajuan & Bukti Nota */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card Rincian Keuangan */}
          <div className="bg-[#0b2419] rounded-2xl border border-[#d4af37]/25 shadow-xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-[#d4af37]/15">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#d4af37]">
                  Nilai Pengajuan
                </span>
                <div className="text-3xl font-extrabold text-[#fdfbf7] font-mono mt-1">
                  {formatRupiah(doc.jumlah)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                  Jenis Transaksi
                </span>
                <span className="text-xs font-bold text-[#f3c853] capitalize mt-0.5 inline-block">
                  {doc.jenis === 'reimburse' ? 'Reimburse (Talangan)' : 'Pengeluaran Langsung Toko'}
                </span>
              </div>
            </div>

            {/* Keperluan */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#d4af37] block mb-1">
                Keperluan / Uraian
              </span>
              <p className="text-sm text-slate-200 leading-relaxed bg-[#06150f] p-3.5 rounded-xl border border-[#d4af37]/15">
                {doc.keterangan}
              </p>
            </div>

            {/* Grid Detail Transaksi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-3 bg-[#06150f] rounded-xl border border-[#d4af37]/15">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Pengaju (Karyawan)
                </span>
                <div className="text-xs font-bold text-slate-200 mt-1">
                  {doc.pengaju?.nama_lengkap || '-'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {formatTeksPuebi(doc.pengaju?.jabatan || doc.pengaju?.peran)} ({doc.pengaju?.email})
                </div>
              </div>

              <div className="p-3 bg-[#06150f] rounded-xl border border-[#d4af37]/15">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Akun Beban Operasional
                </span>
                <div className="text-xs font-bold text-[#f3c853] mt-1 font-mono">
                  {doc.akun_beban?.kode} — {doc.akun_beban?.nama}
                </div>
                <div className="text-[11px] text-slate-400">
                  Tipe: {doc.akun_beban?.tipe}
                </div>
              </div>

              <div className="p-3 bg-[#06150f] rounded-xl border border-[#d4af37]/15">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Tanggal Nota Fisik
                </span>
                <div className="text-xs font-bold text-slate-200 mt-1">
                  {formatTanggalIndo(doc.tanggal_transaksi)}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {doc.tanggal_transaksi}
                </div>
              </div>

              <div className="p-3 bg-[#06150f] rounded-xl border border-[#d4af37]/15">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Waktu Pengiriman
                </span>
                <div className="text-xs font-bold text-slate-200 mt-1">
                  {doc.diajukan_pada ? formatTanggalWaktuIndo(doc.diajukan_pada) : 'Belum diajukan'}
                </div>
              </div>
            </div>

            {/* Catatan Peninjau jika ada */}
            {doc.catatan_peninjau && (
              <div className="p-4 rounded-xl bg-amber-950/70 border border-amber-500/50 text-amber-200 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-[#f3c853]">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Catatan Peninjau:</span>
                </div>
                <p className="leading-relaxed pl-5">{doc.catatan_peninjau}</p>
              </div>
            )}
          </div>

          {/* Card Bukti Nota Fisik */}
          <div className="bg-[#0b2419] rounded-2xl border border-[#d4af37]/25 shadow-xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#d4af37]/15 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#d4af37]">
                Bukti Nota Fisik (Foto / Dokumen)
              </span>
              {signedBuktiUrl && (
                <a
                  href={signedBuktiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-[#d4af37] hover:text-[#f3c853] inline-flex items-center gap-1"
                >
                  <span>Buka di Tab Baru</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {doc.bukti_path ? (
              signedBuktiUrl ? (
                doc.bukti_path.endsWith('.pdf') ? (
                  <div className="p-6 bg-[#06150f] rounded-xl border border-[#d4af37]/20 text-center space-y-2">
                    <FileCheck className="w-12 h-12 mx-auto text-[#d4af37]" />
                    <div className="text-xs font-bold text-slate-200">Dokumen Nota (PDF)</div>
                    <a
                      href={signedBuktiUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#123524] text-[#d4af37] border border-[#d4af37]/30 text-xs font-bold hover:bg-[#18442e] transition-all"
                    >
                      <span>Unduh / Tinjau Berkas PDF</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ) : (
                  <div className="rounded-xl overflow-hidden border border-[#d4af37]/20 bg-[#06150f] text-center p-2">
                    <img
                      src={signedBuktiUrl}
                      alt="Bukti Nota Fisik"
                      className="max-h-96 w-auto mx-auto rounded-lg object-contain shadow-md"
                    />
                  </div>
                )
              ) : (
                <div className="p-4 bg-[#06150f] rounded-xl text-xs text-slate-400">
                  Memuat tautan bukti nota...
                </div>
              )
            ) : (
              <div className="p-8 bg-[#06150f] rounded-xl text-center text-xs text-slate-400 space-y-1">
                <Receipt className="w-8 h-8 mx-auto text-slate-600 mb-1" />
                <p>Belum ada bukti nota yang dilampirkan.</p>
              </div>
            )}
          </div>
        </div>

        {/* Kolom Kanan (1 Kolom): Alur Status & Panel Aksi */}
        <div className="space-y-6">
          {/* Timeline Riwayat Status */}
          <div className="bg-[#0b2419] rounded-2xl border border-[#d4af37]/25 shadow-xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#d4af37] pb-3 border-b border-[#d4af37]/15">
              Alur Riwayat Status
            </h3>

            <div className="space-y-3.5 text-xs">
              {/* Dibuat */}
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-900/60 border border-emerald-500 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <div>
                  <div className="font-bold text-slate-200">Dibuat</div>
                  <div className="text-[11px] text-slate-400">
                    Oleh {doc.pengaju?.nama_lengkap}
                  </div>
                </div>
              </div>

              {/* Diajukan */}
              <div className="flex items-start gap-2.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                    doc.diajukan_pada
                      ? 'bg-emerald-900/60 border-emerald-500 text-emerald-400'
                      : 'bg-[#06150f] border-slate-700 text-slate-600'
                  }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <div>
                  <div className={`font-bold ${doc.diajukan_pada ? 'text-slate-200' : 'text-slate-500'}`}>
                    Diajukan
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {doc.diajukan_pada ? formatTanggalWaktuIndo(doc.diajukan_pada) : 'Menunggu pengiriman'}
                  </div>
                </div>
              </div>

              {/* Diverifikasi / Direktur */}
              <div className="flex items-start gap-2.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                    ['disetujui', 'dibayar'].includes(doc.status)
                      ? 'bg-emerald-900/60 border-emerald-500 text-emerald-400'
                      : doc.status === 'menunggu_direktur'
                      ? 'bg-purple-900/60 border-purple-500 text-purple-300 animate-pulse'
                      : 'bg-[#06150f] border-slate-700 text-slate-600'
                  }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <div>
                  <div className="font-bold text-slate-200">
                    {doc.diverifikasi_oleh
                      ? `Diverifikasi (${doc.diverifikasi?.nama_lengkap || 'Akuntan'})`
                      : 'Verifikasi Akuntan'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {doc.disetujui_oleh
                      ? `Disetujui (${doc.disetujui?.nama_lengkap || 'Direktur'})`
                      : doc.status === 'menunggu_direktur'
                      ? 'Menunggu persetujuan Direktur'
                      : '-'}
                  </div>
                </div>
              </div>

              {/* Dibayar */}
              <div className="flex items-start gap-2.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                    doc.status === 'dibayar'
                      ? 'bg-emerald-900/60 border-emerald-500 text-emerald-400'
                      : 'bg-[#06150f] border-slate-700 text-slate-600'
                  }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <div>
                  <div className={`font-bold ${doc.status === 'dibayar' ? 'text-emerald-300' : 'text-slate-500'}`}>
                    Dibayar & Terjurnal
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {doc.status === 'dibayar'
                      ? `Oleh ${doc.dibayar?.nama_lengkap || 'Akuntan'} (${doc.akun_kas?.nama || 'Kas'})`
                      : 'Belum dibayar'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel Aksi Kontekstual */}
          <div className="bg-[#0b2419] rounded-2xl border border-[#d4af37]/30 shadow-xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#d4af37] pb-3 border-b border-[#d4af37]/15">
              Panel Aksi Persetujuan
            </h3>

            {/* CASE 1: PEMILIK (Draf / Perlu Revisi) */}
            {isOwner && ['draf', 'perlu_revisi'].includes(doc.status) && (
              <div className="space-y-3">
                <button
                  type="button"
                  disabled={loadingAction}
                  onClick={handleKirimUlang}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#d4af37] text-[#081c15] text-xs font-extrabold flex items-center justify-center gap-2 shadow-md hover:bg-[#e0bc46] transition-all cursor-pointer disabled:opacity-50"
                >
                  {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Kirimkan Pengajuan Sekarang</span>
                </button>

                <button
                  type="button"
                  disabled={loadingAction}
                  onClick={handleBatalkan}
                  className="w-full py-2 px-3 rounded-xl border border-rose-500/40 text-rose-300 hover:bg-rose-950/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Batalkan Pengajuan</span>
                </button>
              </div>
            )}

            {/* CASE 2: AKUNTAN (Diajukan & Bukan Pemilik) */}
            {isAkuntan && !isOwner && doc.status === 'diajukan' && (
              <div className="space-y-3">
                <div className="text-[11px] text-slate-300 bg-[#06150f] p-2.5 rounded-lg border border-[#d4af37]/20">
                  {Number(doc.jumlah) <= 1000000 ? (
                    <span>Pengajuan <strong>≤ Rp1.000.000</strong> dapat langsung disetujui oleh Akuntan.</span>
                  ) : (
                    <span>Pengajuan <strong>&gt; Rp1.000.000</strong> diteruskan ke Direktur untuk persetujuan.</span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={loadingAction}
                  onClick={handleVerifikasiAkuntan}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#d4af37] text-[#081c15] text-xs font-extrabold flex items-center justify-center gap-2 shadow-md hover:bg-[#e0bc46] transition-all cursor-pointer disabled:opacity-50"
                >
                  {loadingAction ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : Number(doc.jumlah) <= 1000000 ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Setujui Pengajuan</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4 stroke-[3]" />
                      <span>Teruskan ke Direktur</span>
                    </>
                  )}
                </button>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    disabled={loadingAction}
                    onClick={() => setModalMode('revisi')}
                    className="py-2 px-2.5 rounded-xl border border-amber-500/40 text-[#f3c853] hover:bg-amber-950/40 text-xs font-bold transition-all cursor-pointer"
                  >
                    Minta Revisi
                  </button>
                  <button
                    type="button"
                    disabled={loadingAction}
                    onClick={() => setModalMode('tolak')}
                    className="py-2 px-2.5 rounded-xl border border-rose-500/40 text-rose-300 hover:bg-rose-950/40 text-xs font-bold transition-all cursor-pointer"
                  >
                    Tolak
                  </button>
                </div>
              </div>
            )}

            {/* CASE 3: DIREKTUR (Menunggu Direktur) */}
            {isDirektur && doc.status === 'menunggu_direktur' && (
              <div className="space-y-3">
                <div className="text-[11px] text-slate-300 bg-[#06150f] p-2.5 rounded-lg border border-[#d4af37]/20">
                  Persetujuan akhir oleh <strong>Direktur</strong> untuk pengajuan di atas Rp1.000.000 atau milik Akuntan.
                </div>

                <button
                  type="button"
                  disabled={loadingAction}
                  onClick={handleSetujuiDirektur}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#d4af37] text-[#081c15] text-xs font-extrabold flex items-center justify-center gap-2 shadow-md hover:bg-[#e0bc46] transition-all cursor-pointer disabled:opacity-50"
                >
                  {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                  <span>Setujui Pengajuan</span>
                </button>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    disabled={loadingAction}
                    onClick={() => setModalMode('revisi')}
                    className="py-2 px-2.5 rounded-xl border border-amber-500/40 text-[#f3c853] hover:bg-amber-950/40 text-xs font-bold transition-all cursor-pointer"
                  >
                    Minta Revisi
                  </button>
                  <button
                    type="button"
                    disabled={loadingAction}
                    onClick={() => setModalMode('tolak')}
                    className="py-2 px-2.5 rounded-xl border border-rose-500/40 text-rose-300 hover:bg-rose-950/40 text-xs font-bold transition-all cursor-pointer"
                  >
                    Tolak
                  </button>
                </div>
              </div>
            )}

            {/* CASE 4: AKUNTAN (Disetujui -> Bayar Pengajuan dengan Saldo & Jurnal Otomatis) */}
            {isAkuntan && doc.status === 'disetujui' && (
              <div className="space-y-3 pt-1">
                <div className="text-[11px] text-slate-300 bg-[#06150f] p-2.5 rounded-lg border border-[#d4af37]/20">
                  Pengajuan telah <strong>disetujui</strong>. Pilih akun kas/bank untuk mengeksekusi pembayaran dan memposting jurnal otomatis.
                </div>

                {/* Pilih Kas/Bank */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#d4af37] mb-1">
                    Sumber Kas / Bank
                  </label>
                  <select
                    value={selectedAkunKasId}
                    onChange={(e) => setSelectedAkunKasId(Number(e.target.value))}
                    className="w-full p-2 text-xs rounded-xl border border-[#d4af37]/25 bg-[#06150f] text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#d4af37] cursor-pointer"
                  >
                    {akunKasList.map((ak) => (
                      <option key={ak.id} value={ak.id}>
                        {ak.kode} — {ak.nama}
                      </option>
                    ))}
                  </select>

                  {/* Tampilkan Saldo Terpilih Real-time */}
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Saldo saat ini:</span>
                    <span
                      className={`font-bold font-mono ${
                        saldoKasTerpilih !== null && saldoKasTerpilih < Number(doc.jumlah)
                          ? 'text-rose-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {loadingSaldo ? 'Memuat saldo...' : formatRupiah(saldoKasTerpilih || 0)}
                    </span>
                  </div>

                  {saldoKasTerpilih !== null && saldoKasTerpilih < Number(doc.jumlah) && (
                    <div className="text-[10px] text-rose-300 mt-1 bg-rose-950/50 p-1.5 rounded border border-rose-500/30">
                      Saldo akun ini tidak cukup untuk membayar Rp{Number(doc.jumlah).toLocaleString('id-ID')}. Pilih rekening lain.
                    </div>
                  )}
                </div>

                {/* Tanggal Bayar */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#d4af37] mb-1">
                    Tanggal Bayar
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={tanggalBayar}
                      onChange={(e) => setTanggalBayar(e.target.value)}
                      onClick={(e) => {
                        try {
                          e.currentTarget.showPicker?.();
                        } catch {}
                      }}
                      className="w-full p-2 text-xs rounded-xl border border-[#d4af37]/25 bg-[#06150f] text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#d4af37] cursor-pointer [color-scheme:dark]"
                    />
                    <Calendar className="w-3.5 h-3.5 text-[#d4af37] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Tombol Eksekusi Bayar Atomik */}
                <button
                  type="button"
                  disabled={loadingAction}
                  onClick={handleBayarPengajuan}
                  className="w-full mt-2 py-2.5 px-4 rounded-xl bg-emerald-600 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md hover:bg-emerald-500 active:bg-emerald-700 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loadingAction ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <>
                      <Wallet className="w-4 h-4" />
                      <span>Bayar & Posting Jurnal</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* CASE 5: SUDAH DIBAYAR */}
            {doc.status === 'dibayar' && (
              <div className="p-4 rounded-xl bg-[#0e3522] border border-emerald-500/40 text-emerald-200 text-xs space-y-2">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Pengajuan Selesai Dibayar</span>
                </div>
                <div className="text-[11px] text-emerald-200/90 leading-relaxed">
                  Dana telah dicairkan melalui <strong>{doc.akun_kas?.nama || 'Kas/Bank'}</strong> oleh{' '}
                  <strong>{doc.dibayar?.nama_lengkap || 'Akuntan'}</strong> pada{' '}
                  {doc.dibayar_pada ? formatTanggalWaktuIndo(doc.dibayar_pada) : '-'}.
                </div>

                {jurnal && (
                  <div className="pt-2 border-t border-emerald-500/30 flex items-center justify-between text-[11px]">
                    <span className="text-emerald-300 font-semibold">Jurnal Terkait:</span>
                    <Link
                      href={`/jurnal`}
                      className="font-mono font-bold text-[#f3c853] hover:underline"
                    >
                      {jurnal.nomor}
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* CASE 6: PERINGATAN SELF-APPROVAL */}
            {isAkuntan && isOwner && doc.status === 'menunggu_direktur' && (
              <div className="p-3 bg-[#06150f] rounded-xl border border-amber-500/40 text-xs text-slate-300">
                <strong>Pemberitahuan:</strong> Pengajuan yang Anda buat wajib disetujui oleh Direktur.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Dialog Catatan Peninjau (Revisi / Tolak) */}
      {modalMode && (
        <div className="fixed inset-0 w-full h-full z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto overflow-x-hidden">
          <div className="relative bg-[#0b2419] rounded-2xl border border-[#d4af37]/40 shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden my-auto">
            <div className="p-5 sm:p-6 pb-3 border-b border-[#d4af37]/20 shrink-0">
              <h3 className="text-base font-bold text-[#fdfbf7] flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#f3c853]" />
                <span>
                  {modalMode === 'revisi' ? 'Minta Revisi Pengajuan' : 'Tolak Pengajuan'}
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Wajib memberikan catatan peninjau minimal 10 karakter agar pengaju mengetahui alasan perbaikan atau penolakan.
              </p>
            </div>

            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <div className="flex justify-between text-[11px] mb-1 font-semibold text-[#d4af37]">
                  <span>Catatan Peninjau</span>
                  <span className={catatanText.trim().length >= 10 ? 'text-emerald-400' : 'text-slate-400'}>
                    {catatanText.trim().length}/10 karakter
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={catatanText}
                  onChange={(e) => setCatatanText(e.target.value)}
                  placeholder="Tuliskan catatan perbaikan (contoh: Foto nota buram dan tanggal transaksi tidak terlihat jelas)..."
                  className="w-full p-3 text-xs rounded-xl border border-[#d4af37]/30 bg-[#06150f] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                />
              </div>
            </div>

            <div className="sticky bottom-0 z-20 bg-[#06130D] border-t border-[#d4af37]/20 p-4 mt-auto flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setModalMode(null);
                  setCatatanText('');
                }}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-[#06150f]"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={loadingAction || catatanText.trim().length < 10}
                onClick={handleSubmitCatatan}
                className="px-5 py-2 rounded-xl bg-[#d4af37] text-[#081c15] text-xs font-extrabold disabled:opacity-50 hover:bg-[#e0bc46] cursor-pointer"
              >
                {loadingAction ? 'Menyimpan...' : 'Kirim Catatan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
