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
} from 'lucide-react';
import { Profile } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { keluarAction } from '@/lib/actions/auth';
import { Logo } from '@/components/Logo';

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
    direktur: 'bg-[#1a382b] text-[#d4af37] border-[#d4af37]/60',
    akuntan: 'bg-[#0e2c38] text-sky-200 border-sky-400/40',
    staf: 'bg-[#123524] text-emerald-200 border-emerald-400/40',
  }[profile.peran] || 'bg-[#0c2419] text-slate-300 border-slate-700';

  const getSidebarLinkClasses = (href: string, exact: boolean = false) => {
    const isActive = exact
      ? pathname === href
      : pathname === href || (href !== '/' && pathname.startsWith(href));

    if (isActive) {
      return 'flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-[#123524] text-[#d4af37] font-bold text-xs transition-colors';
    }
    return 'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-slate-300 hover:text-[#d4af37] hover:bg-[#0c2419] font-medium text-xs transition-colors';
  };

  return (
    <>
      {/* =========================================================
          BILAH NAVIGASI UTAMA (NAVBAR)
         ========================================================= */}
      <header className="relative bg-[#071c15] border-b border-[#d4af37]/30 sticky top-0 z-30 shadow-md shadow-[#06130D]/80">
        {/* Latar Belakang Motif Batik Parang Mangkunegaran (Emas #d4af37, Opasitas Optimal 20%) */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: "url('/batik-parang-gold.png?v=parang_mangkunegaran_v2')",
            backgroundRepeat: 'repeat',
            backgroundPosition: 'center',
            backgroundSize: '360px auto',
            opacity: 0.20,
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
                className="p-2 rounded-lg bg-[#0b281e] border border-[#d4af37]/35 text-[#d4af37] hover:bg-[#123524] hover:border-[#d4af37] transition-all cursor-pointer shrink-0 focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                title="Buka Navigasi Menu"
                aria-label="Buka Navigasi Menu"
              >
                <Menu className="w-5 h-5 stroke-[2.2]" />
              </button>

              {/* Logo Brand & Teks Merek */}
              <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group shrink-0">
                <div className="w-9 h-9 rounded-lg bg-[#071c14] flex items-center justify-center border border-[#d4af37]/40 group-hover:border-[#d4af37] transition-all shrink-0 p-1 shadow-xs">
                  <Logo variant="transparent-monogram" size="xs" className="w-full h-full" priority />
                </div>
                <div className="flex flex-col justify-center">
                  <span className="font-serif font-bold text-[#fdfbf7] text-xs sm:text-sm leading-tight tracking-tight whitespace-nowrap">
                    CV Batik Larasati
                  </span>
                  <span className="text-[9px] text-[#d4af37] font-semibold tracking-wider uppercase leading-tight whitespace-nowrap">
                    Keuangan & Akuntansi
                  </span>
                </div>
              </Link>
            </div>

            {/* 2. TENGAH: KOLOM PENCARIAN (SEARCH BAR) */}
            <div className="flex-1 min-w-0 max-w-lg mx-1 sm:mx-3 md:mx-6">
              <form onSubmit={handleSearchSubmit} className="relative w-full m-0">
                <Search className="w-4 h-4 text-[#d4af37] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari transaksi, pengajuan, nomor..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-[#05140e] border border-[#d4af37]/35 text-[#fdfbf7] placeholder-slate-400 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all shadow-inner"
                />
              </form>
            </div>

            {/* 3. SISI KANAN: IDENTITAS PENGGUNA LENGKAP & RAPI HORIZONTAL SEJAJAR */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Nama Lengkap & Jabatan */}
              <div className="flex flex-col justify-center items-end text-right shrink-0">
                <span className="text-xs font-bold text-[#fdfbf7] leading-tight whitespace-nowrap">
                  {profile.nama_lengkap}
                </span>
                <span className="text-[10px] text-[#d4af37] capitalize leading-tight whitespace-nowrap mt-0.5 font-medium">
                  {profile.jabatan || profile.peran}
                </span>
              </div>

              {/* Lencana Peran (Role Badge) */}
              <span
                className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 whitespace-nowrap ${roleBadgeStyle}`}
              >
                {profile.peran}
              </span>

              {/* Garis Pemisah Vertikal Halus */}
              <div className="h-6 w-px bg-[#d4af37]/25 shrink-0 hidden sm:block" />

              {/* Tombol Keluar */}
              <form onSubmit={handleLogout} className="shrink-0 flex items-center m-0">
                <button
                  type="submit"
                  disabled={isLoggingOut}
                  className="px-2.5 py-1.5 rounded-md bg-[#0b281e] border border-[#d4af37]/35 text-slate-200 hover:text-rose-300 hover:bg-rose-950/50 hover:border-rose-500/40 transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50 shrink-0"
                  title="Keluar dari Akun"
                >
                  {isLoggingOut ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#d4af37]" />
                  ) : (
                    <LogOut className="w-3.5 h-3.5 text-[#d4af37]" />
                  )}
                  <span className="hidden md:inline">
                    {isLoggingOut ? 'Keluar...' : 'Keluar'}
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
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 backdrop-blur-xs ${
          isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* 2. Panel Sidebar Geser */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 sm:w-80 bg-[#071c15] border-r border-[#d4af37]/30 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out overflow-hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Sidebar Navigasi"
      >
        {/* Latar Belakang Motif Parang di Sidebar (Emas #d4af37, Opasitas Optimal 20%) */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: "url('/batik-parang-gold.png?v=parang_mangkunegaran_v2')",
            backgroundRepeat: 'repeat',
            backgroundPosition: 'center',
            backgroundSize: '360px auto',
            opacity: 0.20,
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col h-full">
          {/* Header Sidebar: Brand + Tombol Tutup */}
          <div className="flex items-center justify-between p-4 border-b border-[#d4af37]/25 bg-[#05150f]/85">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#071c14] flex items-center justify-center border border-[#d4af37]/40 p-1 shadow-xs shrink-0">
                <Logo variant="transparent-monogram" size="xs" className="w-full h-full" priority />
              </div>
              <div className="flex flex-col">
                <span className="font-serif font-bold text-[#fdfbf7] text-sm leading-tight tracking-tight">
                  CV Batik Larasati
                </span>
                <span className="text-[9px] text-[#d4af37] font-semibold tracking-wider uppercase leading-tight">
                  Navigasi Modul
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 rounded-lg border border-[#d4af37]/30 text-slate-300 hover:text-[#d4af37] hover:bg-[#0b281e] transition-colors cursor-pointer"
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
              <p className="text-[10px] font-bold text-[#d4af37]/70 uppercase tracking-widest px-3 mb-2">
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
                <p className="text-[10px] font-bold text-[#d4af37]/70 uppercase tracking-widest px-3 mb-2">
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
                <p className="text-[10px] font-bold text-[#d4af37]/70 uppercase tracking-widest px-3 mb-2">
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
          <div className="p-4 border-t border-[#d4af37]/25 bg-[#05150f]/85">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#123524] border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] font-serif font-bold text-sm shrink-0">
                {profile.nama_lengkap.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-bold text-[#fdfbf7] truncate">
                  {profile.nama_lengkap}
                </span>
                <span className="text-[10px] text-[#d4af37] capitalize truncate font-medium">
                  {profile.jabatan || profile.peran}
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
