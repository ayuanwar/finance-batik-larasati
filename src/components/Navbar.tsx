'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  X,
  Search,
  LogOut,
  Loader2,
  LayoutDashboard,
  FileText,
  BookOpen,
  Layers,
  BarChart3,
  Settings2,
  UploadCloud,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react';
import { Profile } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { keluarAction } from '@/lib/actions/auth';
import { Logo } from '@/components/Logo';
import { formatTeksPuebi } from '@/lib/utils';

interface NavbarProps {
  profile: Profile;
  onLogout?: () => Promise<void>;
}

export function Navbar({ profile, onLogout }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Inisialisasi tema saat mount
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      try {
        localStorage.setItem('theme', 'dark');
      } catch {}
    } else {
      document.documentElement.classList.remove('dark');
      try {
        localStorage.setItem('theme', 'light');
      } catch {}
    }
  };

  // Kunci scroll body dan tangani tombol Escape saat sidebar terbuka
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSidebarOpen(false);
      }
    };

    if (isSidebarOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSidebarOpen]);

  const handleLogout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      if (onLogout) {
        await onLogout();
      } else {
        await keluarAction();
      }
    } catch {
      // Fallback aman jika terjadi kendala respon sesi server
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // Abaikan error client signout
      }
      window.location.href = '/masuk';
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/cari?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const isFinance = profile.peran === 'direktur' || profile.peran === 'akuntan';

  const roleBadgeStyle = {
    direktur: 'bg-[#11301B] text-[#E4C588] border-[#D3BC5F]/60',
    akuntan: 'bg-[#0e2c38] text-sky-200 border-sky-400/40',
    staf: 'bg-[#123524] text-emerald-200 border-emerald-400/40',
  }[profile.peran] || 'bg-[#11301B] text-slate-300 border-slate-700';

  const getSidebarLinkClasses = (href: string, exact: boolean = false) => {
    const isActive = exact
      ? pathname === href
      : pathname === href || (href !== '/' && pathname.startsWith(href));

    if (isActive) {
      return 'flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-[#11301B] text-[#E4C588] font-bold text-xs transition-colors border border-[#D3BC5F]/60 shadow-sm';
    }
    return 'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[#11301B] dark:text-slate-200 hover:text-[#11301B] dark:hover:text-[#D3BC5F] hover:bg-[#E4C588]/25 dark:hover:bg-[#0c2419] font-medium text-xs transition-colors';
  };

  return (
    <>
      {/* =========================================================
          BILAH NAVIGASI UTAMA (NAVBAR)
         ========================================================= */}
      <header className="relative bg-[#E9E9E1] dark:bg-[#071c15] border-b border-[#D3BC5F]/40 dark:border-[#D3BC5F]/35 sticky top-0 z-30 shadow-xs dark:shadow-black/40 transition-colors duration-200 overflow-hidden">
        {/* Latar Belakang Tekstur Motif Batik Parang pada Navbar Atas */}
        <div
          className="absolute inset-0 pointer-events-none z-0 print:hidden opacity-10 dark:opacity-20 transition-all duration-200"
          style={{
            backgroundImage: "url('/batik-parang-gold.png?v=parang_mangkunegaran_v2')",
            backgroundRepeat: 'repeat',
            backgroundPosition: 'center',
            backgroundSize: '320px auto',
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 w-full max-w-[1360px] mx-auto px-3 sm:px-5 lg:px-6">
          <div className="flex items-center justify-between h-16 gap-2 sm:gap-4 lg:gap-6">
            
            {/* 1. SISI KIRI: TOMBOL HAMBURGER + LOGO + TEKS MEREK */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
              {/* Tombol Hamburger (Garis Tiga) untuk Toggle Sidebar */}
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-lg bg-white dark:bg-[#0b281e] border border-[#D3BC5F]/40 dark:border-[#D3BC5F]/50 text-[#11301B] dark:text-[#D3BC5F] hover:bg-[#E4C588]/20 dark:hover:bg-[#123524] transition-all cursor-pointer shrink-0 focus:outline-none focus:ring-1 focus:ring-[#D3BC5F]/50 dark:focus:ring-[#D3BC5F]"
                title="Buka Navigasi Menu"
                aria-label="Buka Navigasi Menu"
              >
                <Menu className="w-5 h-5 stroke-[2.2]" />
              </button>

              {/* Logo Brand & Teks Merek */}
              <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group shrink-0">
                <Logo variant="transparent-monogram" size="sm" className="w-8 h-8 shrink-0 group-hover:scale-105 transition-transform" priority />
                <div className="flex flex-col justify-center">
                  <span className="font-bold text-[#11301B] dark:text-[#fdfbf7] text-xs sm:text-sm leading-tight tracking-tight whitespace-nowrap">
                    CV Batik Larasati
                  </span>
                  <span className="text-[9px] text-[#11301B]/80 dark:text-[#D3BC5F] font-semibold tracking-wider uppercase leading-tight whitespace-nowrap">
                    Keuangan &amp; Akuntansi
                  </span>
                </div>
              </Link>
            </div>

            {/* 2. TENGAH: KOLOM PENCARIAN (SEARCH BAR) */}
            <div className="flex-1 min-w-0 max-w-xs sm:max-w-sm md:max-w-[320px] mx-2 sm:mx-3 md:mx-4 lg:mr-8">
              <form onSubmit={handleSearchSubmit} className="relative w-full m-0">
                <Search className="w-3.5 h-3.5 text-[#11301B]/60 dark:text-[#D3BC5F] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari transaksi, pengajuan, nomor..."
                  className="w-full pl-8 pr-3 py-1 text-xs rounded-lg bg-white dark:bg-[#05140e] border border-[#D3BC5F]/40 dark:border-[#D3BC5F]/50 text-[#11301B] dark:text-[#fdfbf7] placeholder-[#11301B]/40 dark:placeholder-slate-500 focus:outline-none focus:border-[#11301B] dark:focus:border-[#D3BC5F] focus:ring-1 focus:ring-[#D3BC5F]/40 dark:focus:ring-[#D3BC5F] transition-all shadow-xs"
                />
              </form>
            </div>

            {/* 3. SISI KANAN: IDENTITAS PENGGUNA LENGKAP & RAPI HORIZONTAL SEJAJAR */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Tombol Toggle Tema (Mode Siang / Malam) */}
              <button
                type="button"
                onClick={toggleTheme}
                className="p-1.5 rounded-lg bg-white dark:bg-[#0b281e] border border-[#D3BC5F]/40 dark:border-[#D3BC5F]/50 text-[#11301B] dark:text-[#D3BC5F] hover:bg-[#E4C588]/20 dark:hover:bg-[#123524] transition-colors cursor-pointer shrink-0"
                title={theme === 'dark' ? 'Beralih ke Mode Siang (Light Mode)' : 'Beralih ke Mode Malam (Dark Mode)'}
                aria-label="Toggle tema siang/malam"
              >
                {theme === 'dark' ? (
                  <Sun className="w-3.5 h-3.5 text-[#D3BC5F]" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-[#11301B]" />
                )}
              </button>

              {/* Nama Lengkap & Jabatan */}
              <div className="flex flex-col justify-center items-end text-right shrink-0">
                <span className="text-xs font-bold text-[#11301B] dark:text-[#fdfbf7] leading-tight whitespace-nowrap">
                  {profile.nama_lengkap}
                </span>
                <span className="text-[10px] text-[#11301B]/80 dark:text-[#D3BC5F] leading-tight whitespace-nowrap mt-0.5 font-medium">
                  {formatTeksPuebi(profile.jabatan || profile.peran)}
                </span>
              </div>

              {/* Lencana Peran (Role Badge) */}
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 whitespace-nowrap self-center ${roleBadgeStyle}`}
              >
                {profile.peran}
              </span>

              {/* Garis Pemisah Vertikal Halus */}
              <div className="h-4 w-px bg-[#D3BC5F]/30 shrink-0 hidden sm:block" />

              {/* Tombol Keluar Ringkas & Minimalis */}
              <form onSubmit={handleLogout} className="shrink-0 flex items-center m-0">
                <button
                  type="submit"
                  disabled={isLoggingOut}
                  className="h-7 px-1.5 sm:px-2 rounded-md bg-white dark:bg-[#0b281e] border border-[#D3BC5F]/35 dark:border-[#D3BC5F]/35 text-[#11301B]/80 dark:text-[#D3BC5F] hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-500/40 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 cursor-pointer whitespace-nowrap disabled:opacity-50 shrink-0 shadow-2xs"
                  title="Keluar dari Akun"
                  aria-label="Keluar dari Akun"
                >
                  {isLoggingOut ? (
                    <Loader2 className="w-3 h-3 animate-spin text-[#D3BC5F]" />
                  ) : (
                    <LogOut className="w-3 h-3" />
                  )}
                  <span className="hidden sm:inline">
                    {isLoggingOut ? '...' : 'Keluar'}
                  </span>
                </button>
              </form>
            </div>

          </div>
        </div>
      </header>

      {/* =========================================================
          SIDEBAR KIRI TERSEMBUNYI (COLLAPSIBLE SIDEBAR)
         ========================================================= */}
      {/* 1. Backdrop Gelap Transparan */}
      <div
        className={`fixed inset-0 w-full h-full bg-black/60 z-40 transition-opacity duration-300 backdrop-blur-xs ${
          isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* 2. Panel Sidebar Geser */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 sm:w-80 max-w-[85vw] bg-[#E9E9E1] dark:bg-[#071c15] border-r border-[#D3BC5F]/40 dark:border-[#D3BC5F]/35 shadow-xl flex flex-col transform transition-transform duration-300 ease-in-out overflow-hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Sidebar Navigasi"
      >
        {/* Latar Belakang Tekstur Motif Batik Parang pada Sidebar */}
        <div
          className="absolute inset-0 pointer-events-none z-0 print:hidden opacity-10 dark:opacity-20 transition-all duration-200"
          style={{
            backgroundImage: "url('/batik-parang-gold.png?v=parang_mangkunegaran_v2')",
            backgroundRepeat: 'repeat',
            backgroundPosition: 'center',
            backgroundSize: '320px auto',
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col h-full">
          {/* Header Sidebar: Brand + Tombol Tutup */}
          <div className="flex items-center justify-between p-4 border-b border-[#D3BC5F]/40 dark:border-[#D3BC5F]/30 bg-[#E9E9E1]/85 dark:bg-[#05150f]/85 backdrop-blur-xs">
            <div className="flex items-center gap-2.5">
              <Logo variant="transparent-monogram" size="sm" className="w-7 h-7 shrink-0" priority />
              <div className="flex flex-col">
                <span className="font-bold text-[#11301B] dark:text-[#fdfbf7] text-sm leading-tight tracking-tight">
                  CV Batik Larasati
                </span>
                <span className="text-[9px] text-[#11301B]/80 dark:text-[#D3BC5F] font-semibold tracking-wider leading-tight">
                  Keuangan dan Akuntansi
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 rounded-lg border border-[#D3BC5F]/40 dark:border-[#D3BC5F]/40 text-[#11301B]/80 dark:text-slate-300 hover:text-[#11301B] dark:hover:text-[#D3BC5F] hover:bg-[#E4C588]/20 dark:hover:bg-[#0b281e] transition-colors cursor-pointer"
              title="Tutup Menu"
              aria-label="Tutup Menu Navigasi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Daftar Menu Navigasi Utama */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Kelompok Menu Utama */}
            <div>
              <p className="text-[10px] font-bold text-[#11301B]/75 dark:text-[#D3BC5F]/80 uppercase tracking-widest px-3 mb-2">
                Menu Utama
              </p>
              <div className="space-y-1">
                <Link
                  href="/"
                  onClick={() => setIsSidebarOpen(false)}
                  className={getSidebarLinkClasses('/', true)}
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  <span className="flex-1">Dashboard</span>
                </Link>
                <Link
                  href="/pengajuan"
                  onClick={() => setIsSidebarOpen(false)}
                  className={getSidebarLinkClasses('/pengajuan')}
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="flex-1">Pengajuan Biaya</span>
                </Link>
              </div>
            </div>

            {/* Kelompok Akuntansi & Pembukuan */}
            {isFinance && (
              <div>
                <p className="text-[10px] font-bold text-[#11301B]/75 dark:text-[#D3BC5F]/70 uppercase tracking-widest px-3 mb-2">
                  Akuntansi & Pembukuan
                </p>
                <div className="space-y-1">
                  <Link
                    href="/jurnal"
                    onClick={() => setIsSidebarOpen(false)}
                    className={getSidebarLinkClasses('/jurnal')}
                  >
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <span className="flex-1">Jurnal Umum</span>
                  </Link>
                  <Link
                    href="/buku-besar"
                    onClick={() => setIsSidebarOpen(false)}
                    className={getSidebarLinkClasses('/buku-besar')}
                  >
                    <Layers className="w-4 h-4 shrink-0" />
                    <span className="flex-1">Buku Besar</span>
                  </Link>
                  <Link
                    href="/laporan-keuangan"
                    onClick={() => setIsSidebarOpen(false)}
                    className={getSidebarLinkClasses('/laporan-keuangan')}
                  >
                    <BarChart3 className="w-4 h-4 shrink-0" />
                    <span className="flex-1">Laporan Keuangan</span>
                  </Link>
                  <Link
                    href="/akun-periode"
                    onClick={() => setIsSidebarOpen(false)}
                    className={getSidebarLinkClasses('/akun-periode')}
                  >
                    <Settings2 className="w-4 h-4 shrink-0" />
                    <span className="flex-1">Akun & Periode</span>
                  </Link>
                  <Link
                    href="/import-mutasi"
                    onClick={() => setIsSidebarOpen(false)}
                    className={getSidebarLinkClasses('/import-mutasi')}
                  >
                    <UploadCloud className="w-4 h-4 shrink-0" />
                    <span className="flex-1">Import Mutasi Bank</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Kelompok Administrasi (Khusus Direktur) */}
            {profile.peran === 'direktur' && (
              <div>
                <p className="text-[10px] font-bold text-[#11301B]/75 dark:text-[#D3BC5F]/70 uppercase tracking-widest px-3 mb-2">
                  Administrasi Sistem
                </p>
                <div className="space-y-1">
                  <Link
                    href="/pengguna-audit"
                    onClick={() => setIsSidebarOpen(false)}
                    className={getSidebarLinkClasses('/pengguna-audit')}
                  >
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span className="flex-1">Pengguna & Audit Log</span>
                  </Link>
                </div>
              </div>
            )}
          </nav>

          {/* Bagian Bawah Sidebar (Footer Sidebar: Ringkasan Pengguna Aktif) */}
          <div className="p-4 border-t border-[#D3BC5F]/40 dark:border-[#D3BC5F]/25 bg-[#E9E9E1]/85 dark:bg-[#05150f]/85 backdrop-blur-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#11301B] dark:bg-[#123524] border border-[#D3BC5F]/50 dark:border-[#D3BC5F]/40 flex items-center justify-center text-[#E4C588] dark:text-[#D3BC5F] font-bold text-sm shrink-0">
                {profile.nama_lengkap.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-bold text-[#11301B] dark:text-[#fdfbf7] truncate">
                  {profile.nama_lengkap}
                </span>
                <span className="text-[10px] text-[#11301B]/80 dark:text-[#D3BC5F] truncate font-medium">
                  {formatTeksPuebi(profile.jabatan || profile.peran)}
                </span>
              </div>
              <span
                className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border shrink-0 ${roleBadgeStyle}`}
              >
                {profile.peran}
              </span>
            </div>
          </div>

        </div>
      </aside>
    </>
  );
}

export default Navbar;
