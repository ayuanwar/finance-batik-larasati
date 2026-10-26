'use client';

import { useState, useTransition, useMemo } from 'react';
import {
  Users,
  ScrollText,
  ShieldCheck,
  Search,
  Filter,
  Calendar,
  Eye,
  SquarePen,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  UserX,
  X,
  ChevronLeft,
  ChevronRight,
  Database,
  ArrowRight,
  Code,
  FileText,
} from 'lucide-react';
import { formatTanggalIndo, formatTanggalWaktuIndo, formatTeksPuebi } from '@/lib/utils';
import {
  AuditLogItem,
  updateUserAction,
  getFilteredAuditLogsAction,
} from './actions';

export interface UserProfileItem {
  id: string;
  nama_lengkap: string;
  email: string;
  peran: 'staf' | 'akuntan' | 'direktur';
  jabatan: string | null;
  aktif: boolean;
  dibuat_pada: string;
}

interface PenggunaAuditClientProps {
  initialUsers: UserProfileItem[];
  initialLogs: AuditLogItem[];
  profile: {
    id: string;
    nama_lengkap: string;
    peran: string;
  };
}

const ITEMS_PER_PAGE = 10;

export function PenggunaAuditClient({
  initialUsers,
  initialLogs,
  profile,
}: PenggunaAuditClientProps) {
  const [activeTab, setActiveTab] = useState<'pengguna' | 'audit'>('pengguna');
  const [isPending, startTransition] = useTransition();

  // State Pengguna
  const [userList, setUserList] = useState<UserProfileItem[]>(initialUsers);
  const [searchUser, setSearchUser] = useState('');
  const [filterPeran, setFilterPeran] = useState<string>('semua');
  const [filterStatusUser, setFilterStatusUser] = useState<string>('semua');

  // Modal Kelola Pengguna
  const [selectedUser, setSelectedUser] = useState<UserProfileItem | null>(null);
  const [modalUserOpen, setModalUserOpen] = useState(false);
  const [formPeran, setFormPeran] = useState<'staf' | 'akuntan' | 'direktur'>('staf');
  const [formJabatan, setFormJabatan] = useState('');
  const [formAktif, setFormAktif] = useState(true);
  const [userModalError, setUserModalError] = useState<string | null>(null);

  // State Audit Log
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(initialLogs);
  const [tglMulai, setTglMulai] = useState('');
  const [tglSelesai, setTglSelesai] = useState('');
  const [namaTabel, setNamaTabel] = useState('semua');
  const [pelakuId, setPelakuId] = useState('semua');
  const [searchLog, setSearchLog] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal Rincian Audit Log
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [modalLogOpen, setModalLogOpen] = useState(false);
  const [viewJsonRaw, setViewJsonRaw] = useState(false);

  // Global Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Buka Modal Kelola Pengguna
  const handleOpenEditUser = (u: UserProfileItem) => {
    setSelectedUser(u);
    setFormPeran(u.peran);
    setFormJabatan(u.jabatan || '');
    setFormAktif(u.aktif);
    setUserModalError(null);
    setModalUserOpen(true);
  };

  // Simpan Perubahan Pengguna
  const handleSaveUser = () => {
    if (!selectedUser) return;
    if (!formJabatan.trim()) {
      setUserModalError('Jabatan wajib diisi.');
      return;
    }
    setUserModalError(null);

    startTransition(async () => {
      const res = await updateUserAction({
        userId: selectedUser.id,
        peran: formPeran,
        aktif: formAktif,
        jabatan: formJabatan.trim(),
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: `Data pengguna ${selectedUser.nama_lengkap} berhasil diperbarui.`,
        });
        setModalUserOpen(false);
        setUserList((prev) =>
          prev.map((item) =>
            item.id === selectedUser.id
              ? { ...item, peran: formPeran, aktif: formAktif, jabatan: formJabatan.trim() }
              : item
          )
        );
      } else {
        setUserModalError(res.error || 'Gagal memperbarui pengguna.');
      }
    });
  };

  // Filter Pengguna (Client-Side)
  const filteredUsers = useMemo(() => {
    return userList.filter((item) => {
      if (searchUser.trim()) {
        const q = searchUser.toLowerCase();
        const matchNama = item.nama_lengkap.toLowerCase().includes(q);
        const matchEmail = item.email.toLowerCase().includes(q);
        if (!matchNama && !matchEmail) return false;
      }
      if (filterPeran !== 'semua' && item.peran !== filterPeran) return false;
      if (filterStatusUser === 'aktif' && !item.aktif) return false;
      if (filterStatusUser === 'nonaktif' && item.aktif) return false;
      return true;
    });
  }, [userList, searchUser, filterPeran, filterStatusUser]);

  // Eksekusi Filter Audit Log (Server Action)
  const handleFetchAuditLogs = (
    newMulai: string,
    newSelesai: string,
    newTabel: string,
    newPelaku: string
  ) => {
    startTransition(async () => {
      const res = await getFilteredAuditLogsAction({
        tanggalMulai: newMulai || undefined,
        tanggalSelesai: newSelesai || undefined,
        namaTabel: newTabel !== 'semua' ? newTabel : undefined,
        pelakuId: newPelaku !== 'semua' ? newPelaku : undefined,
      });

      if (res.success && res.data) {
        setAuditLogs(res.data);
        setCurrentPage(1);
      } else {
        setNotification({
          type: 'error',
          message: res.error || 'Gagal memuat log audit.',
        });
      }
    });
  };

  // Preset Tanggal Audit Log
  const applyLogPreset = (preset: 'hari_ini' | '7_hari' | '30_hari' | 'semua') => {
    let m = '';
    let s = '';
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'hari_ini') {
      m = toYMD(now);
      s = toYMD(now);
    } else if (preset === '7_hari') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      m = toYMD(past);
      s = toYMD(now);
    } else if (preset === '30_hari') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      m = toYMD(past);
      s = toYMD(now);
    } else if (preset === 'semua') {
      m = '';
      s = '';
    }

    setTglMulai(m);
    setTglSelesai(s);
    handleFetchAuditLogs(m, s, namaTabel, pelakuId);
  };

  // Reset Filter Audit Log
  const handleResetLogFilters = () => {
    setTglMulai('');
    setTglSelesai('');
    setNamaTabel('semua');
    setPelakuId('semua');
    setSearchLog('');
    handleFetchAuditLogs('', '', 'semua', 'semua');
  };

  // Filter Pencarian Lokal untuk Log Audit
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((item) => {
      if (!searchLog.trim()) return true;
      const q = searchLog.toLowerCase();
      const matchAksi = item.aksi.toLowerCase().includes(q);
      const matchTabel = item.nama_tabel.toLowerCase().includes(q);
      const matchId = item.id_data?.toLowerCase().includes(q);
      const matchPelaku = item.pelaku?.nama_lengkap.toLowerCase().includes(q);
      return matchAksi || matchTabel || matchId || matchPelaku;
    });
  }, [auditLogs, searchLog]);

  // Paginasi Audit Log
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedLogs = useMemo(() => {
    return filteredLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredLogs, startIndex]);

  // Badge Peran
  const getBadgePeran = (peran: string) => {
    switch (peran) {
      case 'direktur':
        return 'bg-amber-50 dark:bg-amber-950/80 text-amber-900 dark:text-[#f3c853] border-amber-400 dark:border-[#d4af37]/60 font-black';
      case 'akuntan':
        return 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 border-emerald-400 dark:border-emerald-500/50 font-bold';
      case 'staf':
        return 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-300 border-indigo-400 dark:border-indigo-500/50 font-medium';
      default:
        return 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    }
  };

  // Badge Aksi Audit
  const getBadgeAksi = (aksi: string) => {
    const upper = aksi.toUpperCase();
    if (upper.includes('INSERT') || upper.includes('BUAT') || upper.includes('CREATE')) {
      return 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-400 dark:border-emerald-500/40';
    }
    if (upper.includes('UPDATE') || upper.includes('UBAH')) {
      return 'bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-400 dark:border-amber-500/40';
    }
    if (upper.includes('DELETE') || upper.includes('HAPUS') || upper.includes('TUTUP')) {
      return 'bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-400 dark:border-rose-500/40';
    }
    return 'bg-[#FDFBF7] dark:bg-[#06150f] text-[#8a6b10] dark:text-[#d4af37] border border-[#d4af37]/40 dark:border-[#d4af37]/35';
  };

  // Helper diff viewer
  const diffKeys = useMemo(() => {
    if (!selectedLog) return [];
    const oldObj = selectedLog.data_lama || {};
    const newObj = selectedLog.data_baru || {};
    const all = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
    return Array.from(all);
  }, [selectedLog]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. Header Utama Halaman */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#d4af37]/30 dark:border-[#d4af37]/25">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#0b2419] border border-[#d4af37]/30 dark:border-[#d4af37]/40 flex items-center justify-center text-[#06130D] dark:text-[#d4af37] shadow-xs">
              <ShieldCheck className="w-5 h-5 text-[#06130D] dark:text-[#f3c853]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#11301B] dark:text-[#fdfbf7] tracking-tight">
                Pengguna & Audit Log
              </h1>
              <p className="text-xs sm:text-sm text-[#06130D]/70 dark:text-slate-400 mt-0.5">
                Pengawasan otorisasi pengguna dan jejak rekam audit transaksi keuangan
              </p>
            </div>
          </div>
        </div>

        {/* Badge Otoritas Direktur */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#071c15] border border-[#d4af37]/30 dark:border-[#d4af37]/50 text-xs flex items-center gap-2 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            <span className="text-[#06130D]/70 dark:text-slate-300">Hak Akses:</span>
            <span className="font-bold text-[#06130D] dark:text-[#f3c853] uppercase">Direktur (Penuh)</span>
          </div>
        </div>
      </div>

      {/* Pesan Notifikasi Global */}
      {notification && (
        <div
          className={`p-4 rounded-xl border text-xs sm:text-sm flex items-center justify-between shadow-xs ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-[#0b2419] border-emerald-400 dark:border-emerald-500/50 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/70 border-rose-400 dark:border-rose-500/60 text-rose-900 dark:text-rose-200'
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
            className="text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Navigasi Tab */}
      <div className="bg-[#fdfbf7] dark:bg-[#071c15] p-1.5 rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs flex gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('pengguna')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'pengguna'
              ? 'bg-white dark:bg-[#0b2419] text-[#06130D] dark:text-[#f3c853] border border-[#d4af37]/40 dark:border-[#d4af37]/60 shadow-xs'
              : 'text-[#06130D]/70 dark:text-slate-400 hover:text-[#06130D] dark:hover:text-slate-200 hover:bg-white dark:hover:bg-[#06150f]'
          }`}
        >
          <Users className="w-4 h-4 text-[#06130D] dark:text-[#d4af37]" />
          <span>Manajemen Pengguna</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-white dark:bg-[#06150f] text-[#06130D] dark:text-[#d4af37] border border-[#d4af37]/30 dark:border-[#d4af37]/30">
            {userList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-white dark:bg-[#0b2419] text-[#06130D] dark:text-[#f3c853] border border-[#d4af37]/40 dark:border-[#d4af37]/60 shadow-xs'
              : 'text-[#06130D]/70 dark:text-slate-400 hover:text-[#06130D] dark:hover:text-slate-200 hover:bg-white dark:hover:bg-[#06150f]'
          }`}
        >
          <ScrollText className="w-4 h-4 text-[#06130D] dark:text-[#d4af37]" />
          <span>Audit Log (Jejak Rekam)</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-white dark:bg-[#06150f] text-[#06130D] dark:text-[#d4af37] border border-[#d4af37]/30 dark:border-[#d4af37]/30">
            {auditLogs.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MANAJEMEN PENGGUNA                                                 */}
      {/* ========================================================================= */}
      <div className={activeTab === 'pengguna' ? 'space-y-6' : 'hidden'}>
        {/* Filter Bar Pengguna */}
        <div className="bg-white dark:bg-[#071c15] p-4 sm:p-5 rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Cari Nama atau Email */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#06130D]/60 dark:text-[#d4af37]/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                placeholder="Cari nama atau email pengguna..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/35 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 placeholder:text-[#06130D]/40 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37]"
              />
            </div>

            {/* Filter Peran */}
            <div>
              <select
                value={filterPeran}
                onChange={(e) => setFilterPeran(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/35 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] cursor-pointer"
              >
                <option value="semua">Semua Peran</option>
                <option value="direktur">Direktur</option>
                <option value="akuntan">Akuntan</option>
                <option value="staf">Staf</option>
              </select>
            </div>

            {/* Filter Status Aktif */}
            <div>
              <select
                value={filterStatusUser}
                onChange={(e) => setFilterStatusUser(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/35 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] cursor-pointer"
              >
                <option value="semua">Semua Status</option>
                <option value="aktif">Hanya Aktif</option>
                <option value="nonaktif">Hanya Nonaktif</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabel Pengguna */}
        <div className="bg-white dark:bg-[#071c15] rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#fdfbf7] dark:bg-[#06150f] text-[#06130D] dark:text-[#d4af37] border-b border-[#d4af37]/30 dark:border-[#d4af37]/25 uppercase text-[11px] tracking-wider font-bold">
                  <th scope="col" className="px-4 py-3.5">
                    Pengguna
                  </th>
                  <th scope="col" className="px-4 py-3.5 w-60">
                    Email
                  </th>
                  <th scope="col" className="px-4 py-3.5 w-32">
                    Peran
                  </th>
                  <th scope="col" className="px-4 py-3.5 w-28 text-center">
                    Status Akun
                  </th>
                  <th scope="col" className="px-4 py-3.5 w-40">
                    Terdaftar Pada
                  </th>
                  <th scope="col" className="px-4 py-3.5 w-24 text-center">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d4af37]/15 dark:divide-[#d4af37]/10">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500 dark:text-slate-400">
                      Tidak ada pengguna yang sesuai dengan kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = u.id === profile.id;

                    return (
                      <tr
                        key={u.id}
                        className={`hover:bg-[#fdfbf7] dark:hover:bg-[#0c2b1e]/60 transition-colors ${
                          !u.aktif ? 'opacity-60 bg-gray-100/60 dark:bg-[#06150f]/60' : 'text-[#06130D] dark:text-slate-200'
                        }`}
                      >
                        {/* Nama & Jabatan */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#06130D] dark:text-slate-100">{u.nama_lengkap}</span>
                            {isSelf && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#fdfbf7] dark:bg-[#0b2419] text-[#06130D] dark:text-[#f3c853] border border-[#d4af37]/30 dark:border-[#d4af37]/40">
                                Anda
                              </span>
                            )}
                          </div>
                          {u.jabatan && (
                            <div className="text-[11px] text-[#06130D]/70 dark:text-slate-400 mt-0.5">{formatTeksPuebi(u.jabatan)}</div>
                          )}
                        </td>

                        {/* Email */}
                        <td className="px-4 py-3.5 font-mono text-[#06130D]/80 dark:text-slate-300 whitespace-nowrap">
                          {u.email}
                        </td>

                        {/* Peran */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] uppercase border ${getBadgePeran(
                              u.peran
                            )}`}
                          >
                            {u.peran}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {u.aktif ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-400 dark:border-emerald-500/40">
                              Aktif
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                              Nonaktif
                            </span>
                          )}
                        </td>

                        {/* Tanggal Terdaftar */}
                        <td className="px-4 py-3.5 font-mono text-[#06130D]/70 dark:text-slate-400 whitespace-nowrap">
                          {formatTanggalIndo(u.dibuat_pada)}
                        </td>

                        {/* Aksi: Ubah Akses */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOpenEditUser(u)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#d4af37]/30 dark:border-[#d4af37]/40 bg-white dark:bg-[#071c15] hover:bg-[#fdfbf7] dark:hover:bg-[#0b2419] transition-all duration-200 cursor-pointer shadow-xs mx-auto text-[#06130D] dark:text-[#d4af37]"
                            title="Ubah Peran & Status Pengguna"
                          >
                            <SquarePen className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* TAB 2: AUDIT LOG (JEJAK REKAM)                                            */}
      {/* ========================================================================= */}
      <div className={activeTab === 'audit' ? 'space-y-6' : 'hidden'}>
        {/* Panel 3 Filter Utama Audit Log (Rentang Tanggal, Nama Tabel, Pelaku) */}
        <div className="bg-white dark:bg-[#071c15] p-5 sm:p-6 rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#06130D] dark:text-[#d4af37] flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#06130D] dark:text-[#d4af37]" />
              Filter Log Jejak Rekam
            </span>
            {isPending && (
              <span className="text-[11px] text-[#06130D] dark:text-[#f3c853] animate-pulse flex items-center gap-1">
                <Clock className="w-3 h-3" /> Memuat data log...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-end">
            {/* 1. Filter Rentang Tanggal (Dari - Sampai) */}
            <div className="md:col-span-5 space-y-1.5">
              <label className="block text-[11px] font-bold text-[#06130D] dark:text-slate-300">
                1. Rentang Tanggal Aktivitas
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={tglMulai}
                  onChange={(e) => {
                    setTglMulai(e.target.value);
                    handleFetchAuditLogs(e.target.value, tglSelesai, namaTabel, pelakuId);
                  }}
                  className="w-full p-2 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/35 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] cursor-pointer dark:[color-scheme:dark]"
                  title="Tanggal Mulai"
                />
                <input
                  type="date"
                  value={tglSelesai}
                  onChange={(e) => {
                    setTglSelesai(e.target.value);
                    handleFetchAuditLogs(tglMulai, e.target.value, namaTabel, pelakuId);
                  }}
                  className="w-full p-2 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/35 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] cursor-pointer dark:[color-scheme:dark]"
                  title="Tanggal Selesai"
                />
              </div>
            </div>

            {/* 2. Filter Nama Tabel yang Dipantau */}
            <div className="md:col-span-3 space-y-1.5">
              <label className="block text-[11px] font-bold text-[#06130D] dark:text-slate-300">
                2. Nama Tabel
              </label>
              <select
                value={namaTabel}
                onChange={(e) => {
                  setNamaTabel(e.target.value);
                  handleFetchAuditLogs(tglMulai, tglSelesai, e.target.value, pelakuId);
                }}
                className="w-full p-2 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/35 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] cursor-pointer"
              >
                <option value="semua">Semua Tabel</option>
                <option value="pengajuan">pengajuan (Pengajuan Biaya)</option>
                <option value="jurnal">jurnal (Kepala Jurnal)</option>
                <option value="jurnal_baris">jurnal_baris (Baris Jurnal)</option>
                <option value="akun">akun (Bagan Akun)</option>
                <option value="periode">periode (Periode Akuntansi)</option>
                <option value="profiles">profiles (Data Pengguna)</option>
              </select>
            </div>

            {/* 3. Filter Pelaku / Pengguna */}
            <div className="md:col-span-4 space-y-1.5">
              <label className="block text-[11px] font-bold text-[#06130D] dark:text-slate-300">
                3. Pelaku / Pengguna
              </label>
              <select
                value={pelakuId}
                onChange={(e) => {
                  setPelakuId(e.target.value);
                  handleFetchAuditLogs(tglMulai, tglSelesai, namaTabel, e.target.value);
                }}
                className="w-full p-2 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/35 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] cursor-pointer"
              >
                <option value="semua">Semua Pelaku</option>
                <option value="sistem">Sistem (Otomatis/Trigger)</option>
                {userList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nama_lengkap} ({u.peran.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Baris Preset Cepat & Reset */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#d4af37]/30 dark:border-[#d4af37]/15">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-[#06130D]/70 dark:text-slate-400 font-medium mr-1">Preset Rentang:</span>
              <button
                type="button"
                onClick={() => applyLogPreset('hari_ini')}
                className="px-2.5 py-1 text-[11px] rounded-lg border border-[#d4af37]/30 dark:border-slate-800 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-300 hover:bg-[#fdfbf7] dark:hover:border-[#d4af37]/40 cursor-pointer shadow-xs"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => applyLogPreset('7_hari')}
                className="px-2.5 py-1 text-[11px] rounded-lg border border-[#d4af37]/30 dark:border-slate-800 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-300 hover:bg-[#fdfbf7] dark:hover:border-[#d4af37]/40 cursor-pointer shadow-xs"
              >
                7 Hari Terakhir
              </button>
              <button
                type="button"
                onClick={() => applyLogPreset('30_hari')}
                className="px-2.5 py-1 text-[11px] rounded-lg border border-[#d4af37]/30 dark:border-slate-800 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-300 hover:bg-[#fdfbf7] dark:hover:border-[#d4af37]/40 cursor-pointer shadow-xs"
              >
                30 Hari Terakhir
              </button>
              <button
                type="button"
                onClick={() => applyLogPreset('semua')}
                className="px-2.5 py-1 text-[11px] rounded-lg border border-[#d4af37]/30 dark:border-slate-800 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-300 hover:bg-[#fdfbf7] dark:hover:border-[#d4af37]/40 cursor-pointer shadow-xs"
              >
                Semua Waktu
              </button>
            </div>

            {/* Pencarian Teks & Reset */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#06130D]/60 dark:text-[#d4af37]/70 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchLog}
                  onChange={(e) => {
                    setSearchLog(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Saring aksi atau ID data..."
                  className="w-48 pl-8 pr-2.5 py-1 text-[11px] rounded-lg border border-[#d4af37]/30 dark:border-[#d4af37]/30 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 placeholder:text-[#06130D]/40 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37]"
                />
              </div>

              <button
                type="button"
                onClick={handleResetLogFilters}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-[#d4af37]/30 dark:border-slate-700 bg-white dark:bg-[#071c15] text-[#06130D] dark:text-slate-300 hover:bg-[#fdfbf7] dark:hover:bg-[#0b2419] transition-all cursor-pointer shadow-xs"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Tabel Log Audit */}
        <div className="bg-white dark:bg-[#071c15] rounded-2xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#fdfbf7] dark:bg-[#06150f] text-[#06130D] dark:text-[#d4af37] border-b border-[#d4af37]/30 dark:border-[#d4af37]/25 uppercase text-[11px] tracking-wider font-bold">
                  <th scope="col" className="px-4 py-3.5 w-44">
                    Waktu Aktivitas
                  </th>
                  <th scope="col" className="px-4 py-3.5 w-52">
                    Pelaku
                  </th>
                  <th scope="col" className="px-4 py-3.5 w-40">
                    Aksi
                  </th>
                  <th scope="col" className="px-4 py-3.5 w-32">
                    Nama Tabel
                  </th>
                  <th scope="col" className="px-4 py-3.5 w-28">
                    ID Data
                  </th>
                  <th scope="col" className="px-4 py-3.5 w-32 text-center">
                    Rincian
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d4af37]/15 dark:divide-[#d4af37]/10">
                {paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500 dark:text-slate-400">
                      Tidak ada riwayat aktivitas yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log) => {
                    const namaPelaku = log.pelaku?.nama_lengkap || 'Sistem (Otomatis)';
                    const peranPelaku = log.pelaku?.peran || null;

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-[#fdfbf7] dark:hover:bg-[#0c2b1e]/60 transition-colors text-[#06130D] dark:text-slate-200"
                      >
                        {/* Waktu */}
                        <td className="px-4 py-3 font-mono text-[#06130D]/80 dark:text-slate-300 whitespace-nowrap">
                          {formatTanggalWaktuIndo(log.waktu)}
                        </td>

                        {/* Pelaku */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#06130D] dark:text-slate-100">{namaPelaku}</div>
                          {peranPelaku && (
                            <div className="text-[10px] text-[#06130D]/70 dark:text-slate-400 uppercase font-bold">
                              {peranPelaku}
                            </div>
                          )}
                        </td>

                        {/* Aksi */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getBadgeAksi(
                              log.aksi
                            )}`}
                          >
                            {log.aksi}
                          </span>
                        </td>

                        {/* Nama Tabel */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-mono text-xs text-[#06130D] dark:text-slate-300 font-semibold px-2 py-0.5 rounded bg-[#fdfbf7] dark:bg-[#06150f] border border-[#d4af37]/30 dark:border-[#d4af37]/25">
                            {log.nama_tabel}
                          </span>
                        </td>

                        {/* ID Data */}
                        <td className="px-4 py-3 font-mono text-[#06130D] dark:text-[#f3c853] font-bold whitespace-nowrap">
                          {log.id_data}
                        </td>

                        {/* Tombol Lihat Rincian (Ikon Eye) */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLog(log);
                              setViewJsonRaw(false);
                              setModalLogOpen(true);
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#d4af37]/30 dark:border-[#d4af37]/40 bg-white dark:bg-[#071c15] hover:bg-[#fdfbf7] dark:hover:bg-[#0b2419] transition-all duration-200 cursor-pointer shadow-xs mx-auto text-[#06130D] dark:text-[#d4af37]"
                            title="Lihat Perubahan Data"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginasi Audit Log (Maksimal 10 Baris per Halaman) */}
          {filteredLogs.length > 0 && (
            <div className="p-4 bg-[#fdfbf7] dark:bg-[#06150f] border-t border-[#d4af37]/30 dark:border-[#d4af37]/25 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              <div className="text-[#06130D]/75 dark:text-slate-400">
                Menampilkan{' '}
                <span className="font-bold text-[#06130D] dark:text-slate-200">
                  {startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, filteredLogs.length)}
                </span>{' '}
                dari <span className="font-bold text-[#06130D] dark:text-slate-200">{filteredLogs.length}</span> log
              </div>

              <div className="flex items-center gap-2 self-center sm:self-auto">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-[#d4af37]/30 dark:border-[#d4af37]/30 bg-white dark:bg-[#071c15] text-[#06130D] dark:text-slate-200 hover:bg-[#fdfbf7] dark:hover:bg-[#0b2419] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
                >
                  <ChevronLeft className="w-4 h-4 text-[#06130D] dark:text-[#d4af37]" />
                </button>

                <span className="font-mono text-[#06130D] dark:text-slate-300 px-2 font-bold">
                  Halaman {currentPage} dari {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-[#d4af37]/30 dark:border-[#d4af37]/30 bg-white dark:bg-[#071c15] text-[#06130D] dark:text-slate-200 hover:bg-[#fdfbf7] dark:hover:bg-[#0b2419] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
                >
                  <ChevronRight className="w-4 h-4 text-[#06130D] dark:text-[#d4af37]" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: KELOLA PENGGUNA (UBAH PERAN & STATUS AKTIF)                       */}
      {/* ========================================================================= */}
      {modalUserOpen && selectedUser && (
        <div className="fixed inset-0 w-full h-full z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto overflow-x-hidden">
          <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col bg-white dark:bg-[#071c15] rounded-2xl border border-[#d4af37]/40 dark:border-[#d4af37]/50 shadow-2xl overflow-hidden my-auto">
            <div className="p-4 sm:p-5 bg-[#fdfbf7] dark:bg-[#0b2419] border-b border-[#d4af37]/30 dark:border-[#d4af37]/30 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#06130D] dark:text-[#d4af37]" />
                <h3 className="text-sm sm:text-base font-bold text-[#06130D] dark:text-[#f3c853]">
                  Kelola Akses Pengguna
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalUserOpen(false)}
                className="text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {/* Info Pengguna */}
              <div className="p-3.5 rounded-xl bg-[#fdfbf7] dark:bg-[#06150f] border border-[#d4af37]/30 dark:border-[#d4af37]/25 space-y-1">
                <div className="text-sm font-bold text-[#06130D] dark:text-slate-100">
                  {selectedUser.nama_lengkap}
                </div>
                <div className="text-xs font-mono text-[#06130D]/70 dark:text-slate-400">{selectedUser.email}</div>
                {selectedUser.jabatan && (
                  <div className="text-[11px] font-semibold text-[#06130D] dark:text-[#f3c853] mt-1">{formatTeksPuebi(selectedUser.jabatan)}</div>
                )}
              </div>

              {/* Peringatan Akun Sendiri */}
              {selectedUser.id === profile.id && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/40 text-xs text-amber-900 dark:text-amber-200">
                  Anda sedang mengelola akun Anda sendiri. Demi keamanan, Anda tidak dapat mencabut peran Direktur atau menonaktifkan akun sendiri.
                </div>
              )}

              {/* Input Teks Jabatan (Wajib Diisi) */}
              <div>
                <label className="block text-xs font-bold text-[#06130D] dark:text-slate-300 uppercase tracking-wider mb-2">
                  Jabatan <span className="text-rose-500 dark:text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formJabatan}
                  onChange={(e) => setFormJabatan(e.target.value)}
                  placeholder="Contoh: Staf Gudang, Akuntan Senior, Direktur Utama"
                  className="w-full p-2.5 text-xs rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/35 bg-white dark:bg-[#06150f] text-[#06130D] dark:text-slate-100 placeholder:text-[#06130D]/40 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#06130D] dark:focus:ring-[#d4af37] transition-all"
                  required
                />
                <p className="text-[11px] text-[#06130D]/70 dark:text-slate-400 mt-1">
                  Nama jabatan fungsional atau divisi kerja operasional pengguna.
                </p>
              </div>

              {/* Pilihan Peran */}
              <div>
                <label className="block text-xs font-bold text-[#06130D] dark:text-slate-300 uppercase tracking-wider mb-2">
                  Tingkat Peran (Role)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={selectedUser.id === profile.id}
                    onClick={() => setFormPeran('staf')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                      formPeran === 'staf'
                        ? 'bg-emerald-50 dark:bg-[#0b2419] border-[#06130D] dark:border-[#d4af37] text-[#06130D] dark:text-[#f3c853] shadow-xs'
                        : 'bg-white dark:bg-[#06150f] border-[#d4af37]/30 dark:border-slate-800 text-[#06130D] dark:text-slate-300 hover:border-[#d4af37] dark:hover:border-[#d4af37]/40'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <span>Staf</span>
                    <span className={`text-[10px] font-normal ${formPeran === 'staf' ? 'text-[#06130D] dark:text-slate-400' : 'text-[#06130D]/70 dark:text-slate-400'}`}>Pengajuan</span>
                  </button>

                  <button
                    type="button"
                    disabled={selectedUser.id === profile.id}
                    onClick={() => setFormPeran('akuntan')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                      formPeran === 'akuntan'
                        ? 'bg-emerald-50 dark:bg-[#0b2419] border-[#06130D] dark:border-[#d4af37] text-[#06130D] dark:text-[#f3c853] shadow-xs'
                        : 'bg-white dark:bg-[#06150f] border-[#d4af37]/30 dark:border-slate-800 text-[#06130D] dark:text-slate-300 hover:border-[#d4af37] dark:hover:border-[#d4af37]/40'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <span>Akuntan</span>
                    <span className={`text-[10px] font-normal ${formPeran === 'akuntan' ? 'text-[#06130D] dark:text-slate-400' : 'text-[#06130D]/70 dark:text-slate-400'}`}>Jurnal & Buku</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormPeran('direktur')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                      formPeran === 'direktur'
                        ? 'bg-emerald-50 dark:bg-[#0b2419] border-[#06130D] dark:border-[#d4af37] text-[#06130D] dark:text-[#f3c853] shadow-xs'
                        : 'bg-white dark:bg-[#06150f] border-[#d4af37]/30 dark:border-slate-800 text-[#06130D] dark:text-slate-300 hover:border-[#d4af37] dark:hover:border-[#d4af37]/40'
                    }`}
                  >
                    <span>Direktur</span>
                    <span className={`text-[10px] font-normal ${formPeran === 'direktur' ? 'text-[#06130D] dark:text-slate-400' : 'text-[#06130D]/70 dark:text-slate-400'}`}>Audit & Otoritas</span>
                  </button>
                </div>
              </div>

              {/* Status Akun Aktif / Nonaktif */}
              <div className="pt-2 border-t border-[#d4af37]/30 dark:border-[#d4af37]/20">
                <label className="block text-xs font-bold text-[#06130D] dark:text-slate-300 uppercase tracking-wider mb-2">
                  Status Akses Akun
                </label>
                <div className="flex items-center gap-3">
                  <label
                    className={`flex-1 p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      formAktif
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-500/50 text-emerald-900 dark:text-emerald-300'
                        : 'bg-white dark:bg-[#06150f] border-[#d4af37]/30 dark:border-slate-800 text-[#06130D] dark:text-slate-400'
                    } ${
                      selectedUser.id === profile.id
                        ? 'opacity-60 cursor-not-allowed'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-bold">Akun Aktif (Bisa Masuk)</span>
                    </div>
                    <input
                      type="radio"
                      name="status_aktif"
                      checked={formAktif}
                      disabled={selectedUser.id === profile.id}
                      onChange={() => setFormAktif(true)}
                      className="text-[#06130D] dark:text-[#d4af37] focus:ring-[#06130D] dark:focus:ring-[#d4af37]"
                    />
                  </label>

                  <label
                    className={`flex-1 p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      !formAktif
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-500/60 text-rose-900 dark:text-rose-300'
                        : 'bg-white dark:bg-[#06150f] border-[#d4af37]/30 dark:border-slate-800 text-[#06130D] dark:text-slate-400'
                    } ${
                      selectedUser.id === profile.id
                        ? 'opacity-60 cursor-not-allowed'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <UserX className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span className="text-xs font-bold">Nonaktifkan</span>
                    </div>
                    <input
                      type="radio"
                      name="status_aktif"
                      checked={!formAktif}
                      disabled={selectedUser.id === profile.id}
                      onChange={() => setFormAktif(false)}
                      className="text-rose-600 dark:text-rose-500 focus:ring-rose-500"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 z-20 bg-[#fdfbf7] dark:bg-[#06130D] border-t border-[#d4af37]/30 dark:border-[#d4af37]/20 p-4 mt-auto flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setModalUserOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#d4af37]/30 dark:border-slate-700 bg-white dark:bg-[#071c15] text-[#06130D] dark:text-slate-300 hover:bg-[#fdfbf7] dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleSaveUser}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-[#06130D] dark:border-[#d4af37] bg-[#06130D] dark:bg-[#0b2419] text-white dark:text-[#f3c853] hover:bg-[#0b2419] dark:hover:bg-[#0e2f21] transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RINCIAN LOG AUDIT & KOMPARASI DATA LAMA VS BARU                  */}
      {/* ========================================================================= */}
      {modalLogOpen && selectedLog && (
        <div className="fixed inset-0 w-full h-full z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto overflow-x-hidden">
          <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white dark:bg-[#071c15] rounded-2xl border border-[#d4af37]/40 dark:border-[#d4af37]/50 shadow-2xl overflow-hidden my-auto">
            <div className="p-4 sm:p-5 bg-[#fdfbf7] dark:bg-[#0b2419] border-b border-[#d4af37]/30 dark:border-[#d4af37]/30 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-[#06130D] dark:text-[#d4af37]" />
                <h3 className="text-sm sm:text-base font-bold text-[#06130D] dark:text-[#f3c853]">
                  Rincian Jejak Rekam Audit #{selectedLog.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalLogOpen(false)}
                className="text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {/* Meta Informasi Log */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-xl bg-[#fdfbf7] dark:bg-[#06150f] border border-[#d4af37]/30 dark:border-[#d4af37]/25 text-xs">
                <div>
                  <span className="text-[#06130D]/70 dark:text-slate-400 text-[10px] uppercase font-bold block">
                    Waktu Aktivitas
                  </span>
                  <span className="font-mono text-[#06130D] dark:text-slate-200 mt-0.5 block font-semibold">
                    {formatTanggalWaktuIndo(selectedLog.waktu)}
                  </span>
                </div>

                <div>
                  <span className="text-[#06130D]/70 dark:text-slate-400 text-[10px] uppercase font-bold block">
                    Pelaku
                  </span>
                  <span className="text-[#06130D] dark:text-slate-200 mt-0.5 block font-bold">
                    {selectedLog.pelaku?.nama_lengkap || 'Sistem (Otomatis)'}
                  </span>
                </div>

                <div>
                  <span className="text-[#06130D]/70 dark:text-slate-400 text-[10px] uppercase font-bold block">
                    Aksi
                  </span>
                  <span
                    className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getBadgeAksi(
                      selectedLog.aksi
                    )}`}
                  >
                    {selectedLog.aksi}
                  </span>
                </div>

                <div>
                  <span className="text-[#06130D]/70 dark:text-slate-400 text-[10px] uppercase font-bold block">
                    Tabel & ID
                  </span>
                  <span className="font-mono text-[#06130D] dark:text-[#f3c853] mt-0.5 block font-bold">
                    {selectedLog.nama_tabel} #{selectedLog.id_data}
                  </span>
                </div>
              </div>

              {/* Mode Tampilan Komparasi vs JSON Mentah */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-[#06130D] dark:text-slate-300 uppercase tracking-wider">
                  Perbandingan Nilai Data
                </span>
                <div className="flex items-center gap-1.5 bg-[#fdfbf7] dark:bg-[#06150f] p-1 rounded-lg border border-[#d4af37]/30 dark:border-[#d4af37]/25">
                  <button
                    type="button"
                    onClick={() => setViewJsonRaw(false)}
                    className={`px-2.5 py-1 text-[11px] rounded font-semibold transition-all cursor-pointer ${
                      !viewJsonRaw
                        ? 'bg-white dark:bg-[#0b2419] text-[#06130D] dark:text-[#f3c853] border border-[#d4af37]/40 dark:border-[#d4af37]/40 shadow-xs'
                        : 'text-[#06130D]/70 dark:text-slate-400 hover:text-[#06130D] dark:hover:text-slate-200'
                    }`}
                  >
                    Tabel Komparasi
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewJsonRaw(true)}
                    className={`px-2.5 py-1 text-[11px] rounded font-semibold transition-all cursor-pointer ${
                      viewJsonRaw
                        ? 'bg-white dark:bg-[#0b2419] text-[#06130D] dark:text-[#f3c853] border border-[#d4af37]/40 dark:border-[#d4af37]/40 shadow-xs'
                        : 'text-[#06130D]/70 dark:text-slate-400 hover:text-[#06130D] dark:hover:text-slate-200'
                    }`}
                  >
                    JSON Mentah
                  </button>
                </div>
              </div>

              {/* Tampilan JSON Mentah */}
              {viewJsonRaw && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 bg-rose-50/70 dark:bg-[#06150f] rounded-xl border border-rose-300 dark:border-rose-500/30">
                    <div className="text-[10px] font-bold uppercase text-rose-800 dark:text-rose-300 mb-2">
                      Data Lama (Sebelumnya)
                    </div>
                    <pre className="text-rose-950 dark:text-slate-300 whitespace-pre-wrap overflow-x-auto text-[11px]">
                      {selectedLog.data_lama
                        ? JSON.stringify(selectedLog.data_lama, null, 2)
                        : '(Kosong / Data Baru)'}
                    </pre>
                  </div>

                  <div className="p-3 bg-emerald-50/70 dark:bg-[#06150f] rounded-xl border border-emerald-300 dark:border-emerald-500/30">
                    <div className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300 mb-2">
                      Data Baru (Sesudahnya)
                    </div>
                    <pre className="text-emerald-950 dark:text-slate-300 whitespace-pre-wrap overflow-x-auto text-[11px]">
                      {selectedLog.data_baru
                        ? JSON.stringify(selectedLog.data_baru, null, 2)
                        : '(Kosong / Dihapus)'}
                    </pre>
                  </div>
                </div>
              )}

              {/* Tampilan Tabel Komparasi Field-by-Field */}
              {!viewJsonRaw && (
                <div className="bg-white dark:bg-[#06150f] rounded-xl border border-[#d4af37]/30 dark:border-[#d4af37]/25 overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#fdfbf7] dark:bg-[#0b2419] text-[#06130D] dark:text-[#d4af37] border-b border-[#d4af37]/30 dark:border-[#d4af37]/25 uppercase text-[10px] tracking-wider font-bold">
                        <th className="px-3.5 py-2.5 w-36">Nama Bidang (Field)</th>
                        <th className="px-3.5 py-2.5">Nilai Lama</th>
                        <th className="px-3.5 py-2.5">Nilai Baru</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#d4af37]/15 dark:divide-[#d4af37]/10">
                      {diffKeys.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-gray-500 dark:text-slate-400">
                            Tidak ada rincian data perbandingan.
                          </td>
                        </tr>
                      ) : (
                        diffKeys.map((key) => {
                          const oldVal = selectedLog.data_lama ? selectedLog.data_lama[key] : undefined;
                          const newVal = selectedLog.data_baru ? selectedLog.data_baru[key] : undefined;
                          const isChanged =
                            JSON.stringify(oldVal) !== JSON.stringify(newVal);

                          const formatVal = (v: any) => {
                            if (v === undefined || v === null) return '-';
                            if (typeof v === 'boolean') return v ? 'true' : 'false';
                            if (typeof v === 'object') return JSON.stringify(v);
                            return String(v);
                          };

                          return (
                            <tr
                              key={key}
                              className={`transition-colors ${
                                isChanged ? 'bg-amber-50/70 dark:bg-[#0b2419]/70 font-medium' : 'text-[#06130D] dark:text-slate-300'
                              }`}
                            >
                              <td className="px-3.5 py-2 font-mono text-[#06130D] dark:text-[#f3c853]">
                                {key}
                              </td>
                              <td className="px-3.5 py-2 font-mono text-rose-700 dark:text-rose-300/90 break-all">
                                {formatVal(oldVal)}
                              </td>
                              <td className="px-3.5 py-2 font-mono text-emerald-700 dark:text-emerald-300/90 break-all">
                                {formatVal(newVal)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 z-20 bg-[#fdfbf7] dark:bg-[#06130D] border-t border-[#d4af37]/30 dark:border-[#d4af37]/20 p-4 mt-auto flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setModalLogOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#d4af37]/30 dark:border-slate-700 bg-white dark:bg-[#071c15] text-[#06130D] dark:text-slate-200 hover:bg-[#fdfbf7] dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
