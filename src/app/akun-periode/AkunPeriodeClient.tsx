'use client';

import { useState, useTransition } from 'react';
import {
  Layers,
  Calendar,
  Plus,
  SquarePen,
  Power,
  PowerOff,
  Lock,
  Unlock,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Building2,
  Info,
  X,
} from 'lucide-react';
import { formatTanggalIndo, formatTeksPuebi } from '@/lib/utils';
import {
  simpanAkunAction,
  toggleStatusAkunAction,
  tutupPeriodeAction,
  bukaKembaliPeriodeAction,
  tambahPeriodeAction,
  SimpanAkunPayload,
} from './actions';

export interface AkunItem {
  id: number;
  kode: string;
  nama: string;
  tipe: 'aset' | 'kewajiban' | 'ekuitas' | 'pendapatan' | 'beban';
  saldo_normal: 'debit' | 'kredit';
  is_kas_bank: boolean;
  aktif: boolean;
  keterangan: string | null;
}

export interface PeriodeItem {
  id: number;
  tahun: number;
  bulan: number;
  tanggal_mulai: string;
  status: 'terbuka' | 'ditutup';
  ditutup_oleh: string | null;
  ditutup_pada: string | null;
  alasan_buka_ulang: string | null;
  penutup?: {
    id: string;
    nama_lengkap: string;
  } | null;
}

interface AkunPeriodeClientProps {
  initialAkun: AkunItem[];
  initialPeriode: PeriodeItem[];
  profile: {
    id: string;
    nama_lengkap: string;
    peran: 'akuntan' | 'direktur' | 'staf';
  };
}

const NAMA_BULAN = [
  '',
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function AkunPeriodeClient({
  initialAkun,
  initialPeriode,
  profile,
}: AkunPeriodeClientProps) {
  const [activeTab, setActiveTab] = useState<'akun' | 'periode'>('akun');
  const [isPending, startTransition] = useTransition();

  // State Data
  const [akunList, setAkunList] = useState<AkunItem[]>(initialAkun);
  const [periodeList, setPeriodeList] = useState<PeriodeItem[]>(initialPeriode);

  // Filter Bagan Akun
  const [searchAkun, setSearchAkun] = useState('');
  const [filterTipe, setFilterTipe] = useState<string>('semua');
  const [filterStatus, setFilterStatus] = useState<string>('semua');

  // Modal State Bagan Akun
  const [modalAkunOpen, setModalAkunOpen] = useState(false);
  const [modalAkunMode, setModalAkunMode] = useState<'tambah' | 'ubah'>('tambah');
  const [selectedAkunId, setSelectedAkunId] = useState<number | undefined>(undefined);
  const [formKode, setFormKode] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formTipe, setFormTipe] = useState<'aset' | 'kewajiban' | 'ekuitas' | 'pendapatan' | 'beban'>('aset');
  const [formIsKasBank, setFormIsKasBank] = useState(false);
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Modal Buka Kembali Periode (Direktur Only)
  const [modalBukaPeriodeOpen, setModalBukaPeriodeOpen] = useState(false);
  const [selectedPeriode, setSelectedPeriode] = useState<PeriodeItem | null>(null);
  const [alasanBukaUlang, setAlasanBukaUlang] = useState('');
  const [bukaPeriodeError, setBukaPeriodeError] = useState<string | null>(null);

  // Modal Tambah Periode (Akuntan Only)
  const [modalTambahPeriodeOpen, setModalTambahPeriodeOpen] = useState(false);
  const [formTahun, setFormTahun] = useState<number>(2026);
  const [formBulan, setFormBulan] = useState<number>(11);
  const [tambahPeriodeError, setTambahPeriodeError] = useState<string | null>(null);

  // Alert Global
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isAkuntan = profile.peran === 'akuntan';
  const isDirektur = profile.peran === 'direktur';

  // Otomatis tentukan saldo normal berdasarkan tipe
  const getSaldoNormalByTipe = (tipe: string) => {
    return tipe === 'aset' || tipe === 'beban' ? 'debit' : 'kredit';
  };

  // Prefiks kode yang valid per tipe
  const getPrefixByTipe = (tipe: string) => {
    switch (tipe) {
      case 'aset':
        return '1';
      case 'kewajiban':
        return '2';
      case 'ekuitas':
        return '3';
      case 'pendapatan':
        return '4';
      case 'beban':
        return '5';
      default:
        return '1';
    }
  };

  // Buka Modal Tambah Akun
  const handleOpenTambahAkun = () => {
    setModalAkunMode('tambah');
    setSelectedAkunId(undefined);
    setFormTipe('aset');
    setFormKode('1');
    setFormNama('');
    setFormIsKasBank(false);
    setFormKeterangan('');
    setFormError(null);
    setModalAkunOpen(true);
  };

  // Buka Modal Ubah Akun
  const handleOpenUbahAkun = (ak: AkunItem) => {
    setModalAkunMode('ubah');
    setSelectedAkunId(ak.id);
    setFormTipe(ak.tipe);
    setFormKode(ak.kode);
    setFormNama(ak.nama);
    setFormIsKasBank(ak.is_kas_bank);
    setFormKeterangan(ak.keterangan || '');
    setFormError(null);
    setModalAkunOpen(true);
  };

  // Handler Ganti Tipe Akun di Modal
  const handleTipeChange = (newTipe: 'aset' | 'kewajiban' | 'ekuitas' | 'pendapatan' | 'beban') => {
    setFormTipe(newTipe);
    if (newTipe !== 'aset') {
      setFormIsKasBank(false);
    }
    // Jika menambah baru, sesuaikan angka awalan kode akun
    if (modalAkunMode === 'tambah') {
      const prefix = getPrefixByTipe(newTipe);
      setFormKode((prev) => {
        if (!prev || prev.length <= 1) return prefix;
        return prefix + prev.slice(1);
      });
    }
  };

  // Submit Simpan Akun
  const handleSaveAkun = () => {
    setFormError(null);
    startTransition(async () => {
      const payload: SimpanAkunPayload = {
        id: selectedAkunId,
        kode: formKode.trim(),
        nama: formNama.trim(),
        tipe: formTipe,
        is_kas_bank: formTipe === 'aset' ? formIsKasBank : false,
        keterangan: formKeterangan.trim(),
      };

      const res = await simpanAkunAction(payload);
      if (res.success) {
        setNotification({
          type: 'success',
          message:
            modalAkunMode === 'tambah'
              ? `Akun ${payload.kode} - ${payload.nama} berhasil ditambahkan.`
              : `Akun ${payload.kode} berhasil diperbarui.`,
        });
        setModalAkunOpen(false);

        // Update local list
        setAkunList((prev) => {
          if (modalAkunMode === 'tambah' && res.data) {
            const newItem: AkunItem = {
              id: res.data.id,
              kode: payload.kode,
              nama: payload.nama,
              tipe: payload.tipe,
              saldo_normal: getSaldoNormalByTipe(payload.tipe),
              is_kas_bank: Boolean(payload.is_kas_bank),
              aktif: true,
              keterangan: payload.keterangan || null,
            };
            return [...prev, newItem].sort((a, b) => a.kode.localeCompare(b.kode));
          } else {
            return prev.map((item) =>
              item.id === selectedAkunId
                ? {
                    ...item,
                    kode: payload.kode,
                    nama: payload.nama,
                    tipe: payload.tipe,
                    saldo_normal: getSaldoNormalByTipe(payload.tipe),
                    is_kas_bank: Boolean(payload.is_kas_bank),
                    keterangan: payload.keterangan || null,
                  }
                : item
            );
          }
        });
      } else {
        setFormError(res.error || 'Gagal menyimpan akun.');
      }
    });
  };

  // Soft Delete / Toggle Status Akun
  const handleToggleStatusAkun = (ak: AkunItem) => {
    const targetStatus = !ak.aktif;
    const confirmText = targetStatus
      ? `Aktifkan kembali akun ${ak.kode} - ${ak.nama}?`
      : `Nonaktifkan akun ${ak.kode} - ${ak.nama}? Akun yang dinonaktifkan tidak dapat dipilih pada jurnal baru.`;

    if (!window.confirm(confirmText)) return;

    startTransition(async () => {
      const res = await toggleStatusAkunAction(ak.id, targetStatus);
      if (res.success) {
        setNotification({
          type: 'success',
          message: `Status akun ${ak.kode} berhasil diubah menjadi ${
            targetStatus ? 'Aktif' : 'Nonaktif'
          }.`,
        });
        setAkunList((prev) =>
          prev.map((item) => (item.id === ak.id ? { ...item, aktif: targetStatus } : item))
        );
      } else {
        setNotification({
          type: 'error',
          message: res.error || 'Gagal mengubah status akun.',
        });
      }
    });
  };

  // Tutup Periode (Akuntan Only)
  const handleTutupPeriode = (p: PeriodeItem) => {
    const namaBulan = NAMA_BULAN[p.bulan] || p.bulan;
    if (
      !window.confirm(
        `Apakah Anda yakin ingin menutup periode akuntansi ${namaBulan} ${p.tahun}? Setelah ditutup, jurnal baru tidak dapat diposting pada periode ini.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await tutupPeriodeAction(p.id);
      if (res.success) {
        setNotification({
          type: 'success',
          message: `Periode ${namaBulan} ${p.tahun} berhasil ditutup.`,
        });
        setPeriodeList((prev) =>
          prev.map((item) =>
            item.id === p.id
              ? {
                  ...item,
                  status: 'ditutup',
                  ditutup_oleh: profile.id,
                  ditutup_pada: new Date().toISOString(),
                }
              : item
          )
        );
      } else {
        setNotification({
          type: 'error',
          message: res.error || 'Gagal menutup periode.',
        });
      }
    });
  };

  // Buka Modal Buka Kembali Periode (Direktur Only)
  const handleOpenBukaPeriode = (p: PeriodeItem) => {
    setSelectedPeriode(p);
    setAlasanBukaUlang('');
    setBukaPeriodeError(null);
    setModalBukaPeriodeOpen(true);
  };

  // Submit Buka Kembali Periode (Direktur Only)
  const handleSubmitBukaPeriode = () => {
    if (!selectedPeriode) return;
    setBukaPeriodeError(null);

    startTransition(async () => {
      const res = await bukaKembaliPeriodeAction({
        periode_id: selectedPeriode.id,
        alasan: alasanBukaUlang,
      });

      if (res.success) {
        const namaBulan = NAMA_BULAN[selectedPeriode.bulan];
        setNotification({
          type: 'success',
          message: `Periode ${namaBulan} ${selectedPeriode.tahun} berhasil dibuka kembali oleh Direktur.`,
        });
        setModalBukaPeriodeOpen(false);
        setPeriodeList((prev) =>
          prev.map((item) =>
            item.id === selectedPeriode.id
              ? {
                  ...item,
                  status: 'terbuka',
                  alasan_buka_ulang: alasanBukaUlang,
                  ditutup_oleh: null,
                  ditutup_pada: null,
                }
              : item
          )
        );
      } else {
        setBukaPeriodeError(res.error || 'Gagal membuka kembali periode.');
      }
    });
  };

  // Submit Tambah Periode (Akuntan Only)
  const handleSaveTambahPeriode = () => {
    setTambahPeriodeError(null);
    startTransition(async () => {
      const res = await tambahPeriodeAction({
        tahun: Number(formTahun),
        bulan: Number(formBulan),
      });

      if (res.success && res.data) {
        const namaBulan = NAMA_BULAN[formBulan];
        setNotification({
          type: 'success',
          message: `Periode akuntansi ${namaBulan} ${formTahun} berhasil dibuat.`,
        });
        setModalTambahPeriodeOpen(false);

        const padBulan = String(formBulan).padStart(2, '0');
        const newP: PeriodeItem = {
          id: res.data.id,
          tahun: formTahun,
          bulan: formBulan,
          tanggal_mulai: `${formTahun}-${padBulan}-01`,
          status: 'terbuka',
          ditutup_oleh: null,
          ditutup_pada: null,
          alasan_buka_ulang: null,
        };
        setPeriodeList((prev) =>
          [newP, ...prev].sort((a, b) => b.tahun - a.tahun || b.bulan - a.bulan)
        );
      } else {
        setTambahPeriodeError(res.error || 'Gagal menambahkan periode baru.');
      }
    });
  };

  // Filter List Akun
  const filteredAkun = akunList.filter((item) => {
    if (searchAkun.trim()) {
      const q = searchAkun.toLowerCase();
      const matchKode = item.kode.toLowerCase().includes(q);
      const matchNama = item.nama.toLowerCase().includes(q);
      if (!matchKode && !matchNama) return false;
    }
    if (filterTipe !== 'semua' && item.tipe !== filterTipe) return false;
    if (filterStatus === 'aktif' && !item.aktif) return false;
    if (filterStatus === 'nonaktif' && item.aktif) return false;
    return true;
  });

  // Badge Tipe Akun
  const getBadgeTipe = (tipe: string) => {
    switch (tipe) {
      case 'aset':
        return 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-400 dark:border-emerald-500/40';
      case 'kewajiban':
        return 'bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-400 dark:border-amber-500/40';
      case 'ekuitas':
        return 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border-indigo-400 dark:border-indigo-500/40';
      case 'pendapatan':
        return 'bg-cyan-50 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border-cyan-400 dark:border-cyan-500/40';
      case 'beban':
        return 'bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-400 dark:border-rose-500/40';
      default:
        return 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. Header Utama Halaman */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#d4af37]/30 dark:border-[#d4af37]/25">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#fdfbf7] dark:bg-[#0b2419] border border-[#d4af37]/30 dark:border-[#d4af37]/40 flex items-center justify-center text-[#06130D] dark:text-[#d4af37] shadow-xs">
              <Building2 className="w-5 h-5 text-[#06130D] dark:text-[#d4af37]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#11301B] dark:text-[#fdfbf7] tracking-tight">
                Akun & Periode
              </h1>
              <p className="text-xs sm:text-sm text-[#06130D]/70 dark:text-slate-400 mt-0.5">
                Kelola bagan akun akuntansi dan siklus status periode pembukuan
              </p>
            </div>
          </div>
        </div>

        {/* Info Peran Pengguna */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="px-3.5 py-1.5 rounded-xl bg-[#fdfbf7] dark:bg-[#071c15] border border-[#d4af37]/30 dark:border-[#d4af37]/40 text-xs flex items-center gap-2 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-[#06130D] dark:text-[#d4af37]" />
            <span className="text-[#06130D]/70 dark:text-slate-300">Akses Pengguna:</span>
            <span className="font-bold text-[#06130D] dark:text-[#f3c853] uppercase">{profile.peran}</span>
          </div>
        </div>
      </div>

      {/* Notifikasi Global */}
      {notification && (
        <div
          className={`p-4 rounded-xl border text-xs sm:text-sm flex items-center justify-between shadow-xs ${
            notification.type === 'success'
              ? 'bg-[#fdfbf7] dark:bg-[#0b2419] border-emerald-500/40 dark:border-emerald-500/50 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/70 border-rose-300 dark:border-rose-500/60 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-[#06130D]/60 dark:text-slate-400 hover:text-[#06130D] dark:hover:text-white font-bold ml-4 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Navigasi Tab (Bagan Akun vs Manajemen Periode) */}
      <div className="bg-[#fdfbf7] dark:bg-[#071c15] p-1.5 rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs flex gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('akun')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'akun'
              ? 'bg-white dark:bg-[#0b2419] text-[#06130D] dark:text-[#f3c853] border border-[#d4af37]/30 dark:border-[#d4af37]/60 shadow-xs'
              : 'text-[#06130D]/70 dark:text-slate-400 hover:text-[#06130D] dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-[#06150f]'
          }`}
        >
          <Layers className="w-4 h-4 text-[#06130D] dark:text-[#d4af37]" />
          <span>Bagan Akun (Chart of Accounts)</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-white dark:bg-[#06150f] text-[#06130D] dark:text-[#d4af37] border border-[#d4af37]/30">
            {akunList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('periode')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'periode'
              ? 'bg-white dark:bg-[#0b2419] text-[#06130D] dark:text-[#f3c853] border border-[#d4af37]/30 dark:border-[#d4af37]/60 shadow-xs'
              : 'text-[#06130D]/70 dark:text-slate-400 hover:text-[#06130D] dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-[#06150f]'
          }`}
        >
          <Calendar className="w-4 h-4 text-[#06130D] dark:text-[#d4af37]" />
          <span>Manajemen Periode Akuntansi</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-white dark:bg-[#06150f] text-[#06130D] dark:text-[#d4af37] border border-[#d4af37]/30">
            {periodeList.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BAGAN AKUN (CHART OF ACCOUNTS)                                     */}
      {/* ========================================================================= */}
      {activeTab === 'akun' && (
        <div className="space-y-6">
          {/* Panel Filter & Tombol Tambah Akun */}
          <div className="bg-white dark:bg-[#071c15] p-4 sm:p-5 rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                {/* Pencarian Akun */}
                <div className="relative">
                  <Search className="w-4 h-4 text-[#06130D]/40 dark:text-[#d4af37]/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchAkun}
                    onChange={(e) => setSearchAkun(e.target.value)}
                    placeholder="Cari kode atau nama akun..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/35 bg-[#fdfbf7] dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 placeholder:text-[#06130D]/40 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37]"
                  />
                </div>

                {/* Filter Kategori Tipe */}
                <div>
                  <select
                    value={filterTipe}
                    onChange={(e) => setFilterTipe(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/35 bg-[#fdfbf7] dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] cursor-pointer"
                  >
                    <option value="semua">Semua Tipe Akun</option>
                    <option value="aset">Aset (1xxx)</option>
                    <option value="kewajiban">Kewajiban (2xxx)</option>
                    <option value="ekuitas">Ekuitas (3xxx)</option>
                    <option value="pendapatan">Pendapatan (4xxx)</option>
                    <option value="beban">Beban (5xxx)</option>
                  </select>
                </div>

                {/* Filter Status Aktif */}
                <div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/35 bg-[#fdfbf7] dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] cursor-pointer"
                  >
                    <option value="semua">Semua Status</option>
                    <option value="aktif">Hanya Aktif</option>
                    <option value="nonaktif">Hanya Nonaktif</option>
                  </select>
                </div>
              </div>

              {/* Aksi Akuntan: Tombol Tambah Akun Baru */}
              {isAkuntan && (
                <button
                  type="button"
                  onClick={handleOpenTambahAkun}
                  className="px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-[#06130D] hover:bg-[#0b2419] text-white border border-[#06130D] dark:border-[#d4af37] shadow-xs active:bg-[#06130D] transition-all flex items-center justify-center gap-2 cursor-pointer self-start lg:self-auto shrink-0"
                >
                  <Plus className="w-4 h-4 text-[#d4af37]" />
                  <span>Tambah Akun Baru</span>
                </button>
              )}

              {/* Mode Baca Direktur */}
              {isDirektur && (
                <div className="text-xs text-[#06130D]/60 dark:text-slate-400 italic flex items-center gap-1 self-center">
                  <Info className="w-3.5 h-3.5 text-[#06130D] dark:text-[#d4af37]" />
                  <span>Mode Hanya-Baca: Perubahan bagan akun dikelola oleh Akuntan</span>
                </div>
              )}
            </div>
          </div>

          {/* Tabel Bagan Akun */}
          <div className="bg-white dark:bg-[#071c15] rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#fdfbf7] dark:bg-[#06150f] text-[#06130D] dark:text-[#d4af37] border-b border-[#d4af37]/30 dark:border-[#d4af37]/25 uppercase text-[11px] tracking-wider font-bold">
                    <th scope="col" className="px-4 py-3.5 w-24">
                      Kode
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Nama Akun
                    </th>
                    <th scope="col" className="px-4 py-3.5 w-36">
                      Tipe Akun
                    </th>
                    <th scope="col" className="px-4 py-3.5 w-32">
                      Saldo Normal
                    </th>
                    <th scope="col" className="px-4 py-3.5 w-36">
                      Kategori Kas/Bank
                    </th>
                    <th scope="col" className="px-4 py-3.5 w-28 text-center">
                      Status
                    </th>
                    {isAkuntan && (
                      <th scope="col" className="px-4 py-3.5 w-28 text-center">
                        Aksi
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d4af37]/20 dark:divide-[#d4af37]/10">
                  {filteredAkun.length === 0 ? (
                    <tr>
                      <td colSpan={isAkuntan ? 7 : 6} className="px-4 py-12 text-center text-[#06130D]/60 dark:text-slate-400">
                        Tidak ada akun yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredAkun.map((ak) => (
                      <tr
                        key={ak.id}
                        className={`hover:bg-[#fdfbf7]/80 dark:hover:bg-[#0c2b1e]/60 transition-colors ${
                          !ak.aktif ? 'opacity-60 bg-[#fdfbf7]/60 dark:bg-[#06150f]/60' : 'text-[#06130D] dark:text-slate-200'
                        }`}
                      >
                        {/* Kode */}
                        <td className="px-4 py-3.5 font-mono font-bold text-[#06130D] dark:text-[#f3c853] whitespace-nowrap">
                          {ak.kode}
                        </td>

                        {/* Nama */}
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-[#06130D] dark:text-slate-100">{formatTeksPuebi(ak.nama)}</div>
                          {ak.keterangan && (
                            <div className="text-[11px] text-[#06130D]/60 dark:text-slate-400 mt-0.5">{ak.keterangan}</div>
                          )}
                        </td>

                        {/* Tipe */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getBadgeTipe(
                              ak.tipe
                            )}`}
                          >
                            {ak.tipe}
                          </span>
                        </td>

                        {/* Saldo Normal */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`font-mono text-xs font-semibold ${
                              ak.saldo_normal === 'debit' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {ak.saldo_normal === 'debit' ? 'Debit (D)' : 'Kredit (K)'}
                          </span>
                        </td>

                        {/* Kas / Bank */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {ak.is_kas_bank ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40">
                              Kas / Bank
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-slate-500">-</span>
                          )}
                        </td>

                        {/* Status Aktif */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {ak.aktif ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40">
                              Aktif
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fdfbf7] dark:bg-slate-900 text-[#06130D]/60 dark:text-slate-400 border border-[#d4af37]/30 dark:border-slate-700">
                              Nonaktif
                            </span>
                          )}
                        </td>

                        {/* Aksi Akuntan: Ubah & Nonaktifkan (Rounded-Square) */}
                        {isAkuntan && (
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              {/* Tombol Ubah */}
                              <button
                                type="button"
                                onClick={() => handleOpenUbahAkun(ak)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#d4af37]/30 dark:border-[#d4af37]/40 bg-[#fdfbf7] dark:bg-[#071c15] hover:bg-white dark:hover:bg-[#0b2419] transition-all duration-200 cursor-pointer shadow-xs"
                                title="Ubah Akun"
                              >
                                <SquarePen className="w-3.5 h-3.5 text-[#06130D] dark:text-[#d4af37]" />
                              </button>

                              {/* Tombol Toggle Status (Soft-Delete) */}
                              <button
                                type="button"
                                onClick={() => handleToggleStatusAkun(ak)}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all duration-200 cursor-pointer shadow-xs ${
                                  ak.aktif
                                    ? 'border-[#d4af37]/30 dark:border-rose-500/35 bg-[#fdfbf7] dark:bg-[#071c15] hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                                    : 'border-[#d4af37]/30 dark:border-emerald-500/35 bg-[#fdfbf7] dark:bg-[#071c15] hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                                }`}
                                title={ak.aktif ? 'Nonaktifkan Akun' : 'Aktifkan Kembali Akun'}
                              >
                                {ak.aktif ? (
                                  <PowerOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Power className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MANAJEMEN PERIODE AKUNTANSI                                        */}
      {/* ========================================================================= */}
      {activeTab === 'periode' && (
        <div className="space-y-6">
          {/* Header Panel Periode */}
          <div className="bg-white dark:bg-[#071c15] p-4 sm:p-5 rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-[#06130D] dark:text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#06130D] dark:text-[#d4af37]" />
                <span>Siklus Pembukuan Bulanan</span>
              </div>
              <div className="text-xs text-[#06130D]/70 dark:text-slate-400 mt-1">
                Akuntan dapat menutup periode yang telah selesai. Direktur memiliki wewenang untuk membuka kembali periode tertutup.
              </div>
            </div>

            {/* Aksi Akuntan: Tombol Tambah Periode Baru */}
            {isAkuntan && (
              <button
                type="button"
                onClick={() => {
                  setTambahPeriodeError(null);
                  setModalTambahPeriodeOpen(true);
                }}
                className="px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-[#06130D] hover:bg-[#0b2419] text-white border border-[#06130D] dark:border-[#d4af37] shadow-xs active:bg-[#06130D] transition-all flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto shrink-0"
              >
                <Plus className="w-4 h-4 text-[#d4af37]" />
                <span>Buka Periode Baru</span>
              </button>
            )}
          </div>

          {/* Tabel Periode */}
          <div className="bg-white dark:bg-[#071c15] rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#fdfbf7] dark:bg-[#06150f] text-[#06130D] dark:text-[#d4af37] border-b border-[#d4af37]/30 dark:border-[#d4af37]/25 uppercase text-[11px] tracking-wider font-bold">
                    <th scope="col" className="px-4 py-3.5 w-44">
                      Periode
                    </th>
                    <th scope="col" className="px-4 py-3.5 w-36">
                      Tanggal Mulai
                    </th>
                    <th scope="col" className="px-4 py-3.5 w-32 text-center">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Informasi Penutupan / Buka Ulang
                    </th>
                    <th scope="col" className="px-4 py-3.5 w-40 text-center">
                      Aksi Otorisasi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d4af37]/20 dark:divide-[#d4af37]/10">
                  {periodeList.map((p) => {
                    const namaBulan = NAMA_BULAN[p.bulan] || p.bulan;
                    const isBuka = p.status === 'terbuka';

                    return (
                      <tr key={p.id} className="hover:bg-[#fdfbf7]/80 dark:hover:bg-[#0c2b1e]/60 transition-colors text-[#06130D] dark:text-slate-200">
                        {/* Periode */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-bold text-[#06130D] dark:text-slate-100 text-sm">
                          {namaBulan} {p.tahun}
                        </td>

                        {/* Tanggal Mulai */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-mono text-[#06130D]/70 dark:text-slate-300">
                          {formatTanggalIndo(p.tanggal_mulai)}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {isBuka ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40">
                              Terbuka
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-[#fdfbf7] dark:bg-slate-900 text-[#06130D]/60 dark:text-slate-400 border border-[#d4af37]/30 dark:border-slate-700">
                              Ditutup
                            </span>
                          )}
                        </td>

                        {/* Informasi Penutupan & Buka Ulang */}
                        <td className="px-4 py-3.5">
                          {!isBuka && (
                            <div className="space-y-0.5">
                              <div className="text-[#06130D]/80 dark:text-slate-300">
                                Ditutup pada: {formatTanggalIndo(p.ditutup_pada)}
                              </div>
                            </div>
                          )}
                          {p.alasan_buka_ulang && (
                            <div className="text-[11px] text-[#06130D] dark:text-[#f3c853] mt-1 p-2 rounded-lg bg-[#fdfbf7] dark:bg-[#06150f] border border-[#d4af37]/30">
                              <span className="font-semibold text-[#06130D] dark:text-slate-300">Alasan Dibuka Kembali:</span>{' '}
                              {p.alasan_buka_ulang}
                            </div>
                          )}
                          {isBuka && !p.alasan_buka_ulang && (
                            <span className="text-[#06130D]/50 dark:text-slate-500 italic">Periode pembukuan sedang aktif</span>
                          )}
                        </td>

                        {/* Aksi Kontekstual Sesuai Peran */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {/* 1. AKUNTAN: Hanya tombol Tutup Periode untuk periode terbuka */}
                          {isAkuntan && isBuka && (
                            <button
                              type="button"
                              onClick={() => handleTutupPeriode(p)}
                              className="px-3 py-1.5 rounded-lg border border-[#d4af37]/30 dark:border-amber-500/40 bg-[#fdfbf7] dark:bg-[#071c15] text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-all font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs mx-auto"
                              title="Tutup Periode Ini"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>Tutup Periode</span>
                            </button>
                          )}

                          {isAkuntan && !isBuka && (
                            <span className="text-xs text-[#06130D]/50 dark:text-slate-500 font-medium">
                              Terkunci
                            </span>
                          )}

                          {/* 2. DIREKTUR: Hak Eksklusif tombol Buka Kembali untuk periode ditutup */}
                          {isDirektur && !isBuka && (
                            <button
                              type="button"
                              onClick={() => handleOpenBukaPeriode(p)}
                              className="px-3 py-1.5 rounded-lg border border-[#d4af37]/30 dark:border-[#d4af37] bg-[#fdfbf7] dark:bg-[#071c15] text-[#06130D] dark:text-[#f3c853] hover:bg-white dark:hover:bg-[#0b2419] transition-all font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs mx-auto"
                              title="Buka Kembali Periode Tertutup"
                            >
                              <Unlock className="w-3.5 h-3.5 text-[#06130D] dark:text-[#d4af37]" />
                              <span>Buka Kembali</span>
                            </button>
                          )}

                          {isDirektur && isBuka && (
                            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                              Aktif
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* MODAL 1: TAMBAH / UBAH AKUN (AKUNTAN ONLY)                                */}
      {/* ========================================================================= */}
      {modalAkunOpen && (
        <div className="fixed inset-0 w-full h-full z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto overflow-x-hidden">
          <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col bg-white dark:bg-[#071c15] rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/50 shadow-2xl overflow-hidden my-auto">
            <div className="p-4 sm:p-5 bg-[#fdfbf7] dark:bg-[#0b2419] border-b border-[#d4af37]/30 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#06130D] dark:text-[#d4af37]" />
                <h3 className="text-sm sm:text-base font-bold text-[#06130D] dark:text-[#f3c853]">
                  {modalAkunMode === 'tambah' ? 'Tambah Akun Baru' : `Ubah Akun ${formKode}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalAkunOpen(false)}
                className="text-[#06130D]/60 hover:text-[#06130D] dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-500/50 text-rose-900 dark:text-rose-200 text-xs">
                  {formError}
                </div>
              )}

              {/* Tipe Akun */}
              <div>
                <label className="block text-xs font-bold text-[#06130D] dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Tipe Akun
                </label>
                <select
                  value={formTipe}
                  onChange={(e) =>
                    handleTipeChange(
                      e.target.value as 'aset' | 'kewajiban' | 'ekuitas' | 'pendapatan' | 'beban'
                    )
                  }
                  className="w-full p-2.5 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/35 bg-[#fdfbf7] dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] cursor-pointer"
                >
                  <option value="aset">Aset (Awalan 1xxx)</option>
                  <option value="kewajiban">Kewajiban (Awalan 2xxx)</option>
                  <option value="ekuitas">Ekuitas (Awalan 3xxx)</option>
                  <option value="pendapatan">Pendapatan (Awalan 4xxx)</option>
                  <option value="beban">Beban (Awalan 5xxx)</option>
                </select>
              </div>

              {/* Saldo Normal (Otomatis menyesuaikan dengan tipe akun) */}
              <div>
                <label className="block text-xs font-bold text-[#06130D] dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Posisi Saldo Normal (Otomatis)
                </label>
                <div className="p-2.5 rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 bg-[#fdfbf7] dark:bg-[#0b2419]/70 text-xs flex items-center justify-between font-mono">
                  <span className="text-[#06130D]/80 dark:text-slate-300">Posisi Akuntansi:</span>
                  <span
                    className={`font-bold uppercase ${
                      getSaldoNormalByTipe(formTipe) === 'debit'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {getSaldoNormalByTipe(formTipe).toUpperCase()}
                  </span>
                </div>
                <p className="text-[11px] text-[#06130D]/60 dark:text-slate-400 mt-1">
                  {formTipe === 'aset' || formTipe === 'beban'
                    ? 'Akun bertipe Aset dan Beban secara baku memiliki saldo normal Debit.'
                    : 'Akun bertipe Kewajiban, Ekuitas, dan Pendapatan secara baku memiliki saldo normal Kredit.'}
                </p>
              </div>

              {/* Kode Akun */}
              <div>
                <label className="block text-xs font-bold text-[#06130D] dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Kode Akun (4 Digit)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={formKode}
                  onChange={(e) => setFormKode(e.target.value.replace(/\D/g, ''))}
                  placeholder={`Contoh: ${getPrefixByTipe(formTipe)}101`}
                  className="w-full p-2.5 text-xs font-mono font-bold rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/35 bg-[#fdfbf7] dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 placeholder:text-[#06130D]/40 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37]"
                />
                <p className="text-[11px] text-[#06130D]/60 dark:text-slate-400 mt-1">
                  Harus diawali angka {getPrefixByTipe(formTipe)} sesuai tipe {formTipe.toUpperCase()}.
                </p>
              </div>

              {/* Nama Akun */}
              <div>
                <label className="block text-xs font-bold text-[#06130D] dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Nama Akun
                </label>
                <input
                  type="text"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Contoh: Kas Kecil Operasional"
                  className="w-full p-2.5 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/35 bg-[#fdfbf7] dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 placeholder:text-[#06130D]/40 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37]"
                />
              </div>

              {/* Opsi Kas/Bank (Khusus Aset) */}
              {formTipe === 'aset' && (
                <div className="pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsKasBank}
                      onChange={(e) => setFormIsKasBank(e.target.checked)}
                      className="rounded border-[#d4af37]/40 bg-[#fdfbf7] text-[#06130D] focus:ring-[#06130D]"
                    />
                    <span className="text-xs text-[#06130D] dark:text-slate-200 font-medium">
                      Tandai sebagai Rekening Kas atau Bank Operasional
                    </span>
                  </label>
                </div>
              )}

              {/* Keterangan */}
              <div>
                <label className="block text-xs font-bold text-[#06130D] dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Keterangan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  placeholder="Catatan peruntukan akun..."
                  className="w-full p-2.5 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/35 bg-[#fdfbf7] dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 placeholder:text-[#06130D]/40 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37]"
                />
              </div>
            </div>

            <div className="sticky bottom-0 z-20 bg-[#fdfbf7] dark:bg-[#06130D] border-t border-[#d4af37]/30 dark:border-[#d4af37]/20 p-4 mt-auto flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setModalAkunOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#d4af37]/30 dark:border-slate-700 bg-white dark:bg-[#071c15] text-[#06130D] dark:text-slate-300 hover:bg-[#fdfbf7] dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleSaveAkun}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#06130D] hover:bg-[#0b2419] text-white border border-[#06130D] dark:border-[#d4af37] shadow-xs active:bg-[#06130D] transition-all cursor-pointer disabled:opacity-50"
              >
                {isPending ? 'Menyimpan...' : 'Simpan Akun'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: BUKA KEMBALI PERIODE (DIREKTUR ONLY)                             */}
      {/* ========================================================================= */}
      {modalBukaPeriodeOpen && selectedPeriode && (
        <div className="fixed inset-0 w-full h-full z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto overflow-x-hidden">
          <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col bg-white dark:bg-[#071c15] rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/50 shadow-2xl overflow-hidden my-auto">
            <div className="p-4 sm:p-5 bg-[#fdfbf7] dark:bg-[#0b2419] border-b border-[#d4af37]/30 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Unlock className="w-4 h-4 text-[#06130D] dark:text-[#d4af37]" />
                <h3 className="text-sm sm:text-base font-bold text-[#06130D] dark:text-[#f3c853]">
                  Buka Kembali Periode {NAMA_BULAN[selectedPeriode.bulan]} {selectedPeriode.tahun}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalBukaPeriodeOpen(false)}
                className="text-[#06130D]/60 hover:text-[#06130D] dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/40 text-xs text-amber-900 dark:text-amber-200">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-900 dark:text-[#f3c853]">
                  <Info className="w-4 h-4" />
                  <span>Otorisasi Khusus Direktur</span>
                </div>
                <span>
                  Sesuai prosedur kepatuhan keuangan, pembukaan kembali periode akuntansi yang telah ditutup membutuhkan alasan resmi dan akan dicatat secara permanen pada log audit.
                </span>
              </div>

              {bukaPeriodeError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-500/50 text-rose-900 dark:text-rose-200 text-xs">
                  {bukaPeriodeError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#06130D] dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Alasan Pembukaan Kembali (Minimal 20 Karakter)
                </label>
                <textarea
                  rows={4}
                  value={alasanBukaUlang}
                  onChange={(e) => setAlasanBukaUlang(e.target.value)}
                  placeholder="Jelaskan kebutuhan audit, penyesuaian jurnal, atau alasan bisnis terkait..."
                  className="w-full p-2.5 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/35 bg-[#fdfbf7] dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 placeholder:text-[#06130D]/40 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37]"
                />
                <div className="flex items-center justify-between text-[11px] text-[#06130D]/60 dark:text-slate-400 mt-1">
                  <span>Panjang teks saat ini:</span>
                  <span
                    className={`font-mono font-bold ${
                      alasanBukaUlang.trim().length >= 20 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {alasanBukaUlang.trim().length} / 20 karakter minimum
                  </span>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 z-20 bg-[#fdfbf7] dark:bg-[#06130D] border-t border-[#d4af37]/30 dark:border-[#d4af37]/20 p-4 mt-auto flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setModalBukaPeriodeOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#d4af37]/30 dark:border-slate-700 bg-white dark:bg-[#071c15] text-[#06130D] dark:text-slate-300 hover:bg-[#fdfbf7] dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPending || alasanBukaUlang.trim().length < 20}
                onClick={handleSubmitBukaPeriode}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#06130D] hover:bg-[#0b2419] text-white border border-[#06130D] dark:border-[#d4af37] shadow-xs active:bg-[#06130D] transition-all cursor-pointer disabled:opacity-40"
              >
                {isPending ? 'Memproses...' : 'Buka Kembali Periode'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: TAMBAH PERIODE BARU (AKUNTAN ONLY)                               */}
      {/* ========================================================================= */}
      {modalTambahPeriodeOpen && (
        <div className="fixed inset-0 w-full h-full z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto overflow-x-hidden">
          <div className="relative w-full max-w-md max-h-[92vh] flex flex-col bg-white dark:bg-[#071c15] rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/50 shadow-2xl overflow-hidden my-auto">
            <div className="p-4 sm:p-5 bg-[#fdfbf7] dark:bg-[#0b2419] border-b border-[#d4af37]/30 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#06130D] dark:text-[#d4af37]" />
                <h3 className="text-sm sm:text-base font-bold text-[#06130D] dark:text-[#f3c853]">
                  Buka Periode Akuntansi Baru
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalTambahPeriodeOpen(false)}
                className="text-[#06130D]/60 hover:text-[#06130D] dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {tambahPeriodeError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-500/50 text-rose-900 dark:text-rose-200 text-xs">
                  {tambahPeriodeError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#06130D] dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Bulan
                </label>
                <select
                  value={formBulan}
                  onChange={(e) => setFormBulan(Number(e.target.value))}
                  className="w-full p-2.5 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/35 bg-[#fdfbf7] dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] cursor-pointer"
                >
                  {NAMA_BULAN.slice(1).map((nama, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {nama} (Bulan {idx + 1})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#06130D] dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Tahun
                </label>
                <input
                  type="number"
                  min={2020}
                  max={2050}
                  value={formTahun}
                  onChange={(e) => setFormTahun(Number(e.target.value))}
                  className="w-full p-2.5 text-xs font-mono font-bold rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/35 bg-[#fdfbf7] dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37]"
                />
              </div>
            </div>

            <div className="sticky bottom-0 z-20 bg-[#fdfbf7] dark:bg-[#06130D] border-t border-[#d4af37]/30 dark:border-[#d4af37]/20 p-4 mt-auto flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setModalTambahPeriodeOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#d4af37]/30 dark:border-slate-700 bg-white dark:bg-[#071c15] text-[#06130D] dark:text-slate-300 hover:bg-[#fdfbf7] dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleSaveTambahPeriode}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#06130D] hover:bg-[#0b2419] text-white border border-[#06130D] dark:border-[#d4af37] shadow-xs active:bg-[#06130D] transition-all cursor-pointer disabled:opacity-50"
              >
                {isPending ? 'Menyimpan...' : 'Buka Periode'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
