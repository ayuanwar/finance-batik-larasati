'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sun,
  Moon,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { PeranPengguna } from '@/types/database';
import { syncUserProfileBaruAction } from './actions';

// Peran default untuk pendaftaran akun baru
const DEFAULT_PERAN: PeranPengguna = 'staf';

// Syarat kata sandi: minimal 6 karakter, wajib kombinasi huruf besar, huruf kecil, angka, dan simbol
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;

export default function HalamanMasuk() {
  const router = useRouter();
  const supabase = createClient();

  // Mode aktif: 'masuk' atau 'daftar'
  const [mode, setMode] = useState<'masuk' | 'daftar'>('masuk');

  // State Form Masuk (Login)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // State Form Registrasi
  const [regEmail, setRegEmail] = useState('');
  const [regNamaLengkap, setRegNamaLengkap] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [regPasswordTouched, setRegPasswordTouched] = useState(false);

  // State Status & Notifikasi
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Inisialisasi tema aktif sesuai preferensi sistem / localStorage
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light') {
        setTheme('light');
        document.documentElement.classList.remove('dark');
      } else {
        setTheme('dark');
        document.documentElement.classList.add('dark');
      }
    } catch {
      // Fallback aman jika localStorage tidak dapat diakses
    }
  }, []);

  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('light');
      document.documentElement.classList.remove('dark');
      try {
        localStorage.setItem('theme', 'light');
      } catch {}
    } else {
      setTheme('dark');
      document.documentElement.classList.add('dark');
      try {
        localStorage.setItem('theme', 'dark');
      } catch {}
    }
  };

  // Validasi format kata sandi registrasi
  const isPasswordValid = PASSWORD_REGEX.test(regPassword);
  const showPasswordWarning = regPasswordTouched && regPassword.length > 0 && !isPasswordValid;

  // Handler Masuk (Login)
  const handleMasuk = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const emailTrim = email.trim();
    if (!emailTrim || !password) {
      setErrorMessage('Silakan masukkan alamat email dan kata sandi Anda.');
      return;
    }

    setLoading(true);

    try {
      // 1. Otentikasi Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailTrim,
        password: password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setErrorMessage('Alamat email atau kata sandi yang Anda masukkan salah. Silakan periksa kembali.');
        } else {
          setErrorMessage(`Gagal masuk: ${authError.message}`);
        }
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setErrorMessage('Terjadi kendala saat memverifikasi sesi pengguna.');
        setLoading(false);
        return;
      }

      // 2. Periksa status aktif pengguna di tabel profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, nama_lengkap, peran, aktif')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setErrorMessage('Profil pengguna tidak ditemukan dalam basis data sistem.');
        setLoading(false);
        return;
      }

      // Jika akun dinonaktifkan
      if (!profile.aktif) {
        await supabase.auth.signOut();
        setErrorMessage('Akun Anda saat ini berstatus NONAKTIF. Silakan hubungi Direktur untuk mengaktifkan kembali akun Anda.');
        setLoading(false);
        return;
      }

      // 3. Login sukses -> arahkan ke Dashboard
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem yang tidak terduga.';
      setErrorMessage(msg);
      setLoading(false);
    }
  };

  // Handler Registrasi Akun Baru
  const handleDaftar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const emailTrim = regEmail.trim();
    const namaTrim = regNamaLengkap.trim();

    if (!emailTrim) {
      setErrorMessage('Silakan masukkan alamat email yang valid.');
      return;
    }

    if (!namaTrim || namaTrim.length < 3) {
      setErrorMessage('Username / Nama Lengkap wajib diisi minimal 3 karakter.');
      return;
    }

    // Validasi Keamanan Kata Sandi sebelum memanggil Supabase Auth
    if (!PASSWORD_REGEX.test(regPassword)) {
      setRegPasswordTouched(true);
      setErrorMessage('Kata sandi belum memenuhi syarat keamanan: minimal 6 karakter, wajib kombinasi huruf besar, huruf kecil, angka, dan simbol.');
      return;
    }

    setLoading(true);

    try {
      // 1. Eksekusi Supabase Auth signUp
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: emailTrim,
        password: regPassword,
        options: {
          data: {
            nama_lengkap: namaTrim,
            peran: DEFAULT_PERAN,
          },
        },
      });

      if (signUpError) {
        setErrorMessage(`Pendaftaran gagal: ${signUpError.message}`);
        setLoading(false);
        return;
      }

      const newUser = signUpData.user;
      if (!newUser) {
        setErrorMessage('Gagal membuat pengguna baru. Silakan coba kembali.');
        setLoading(false);
        return;
      }

      // 2. Insert & Sinkronisasi data ke tabel profiles (via Server Action dengan hak admin)
      const syncResult = await syncUserProfileBaruAction({
        userId: newUser.id,
        namaLengkap: namaTrim,
        email: emailTrim,
        peran: DEFAULT_PERAN,
      });

      if (!syncResult.success) {
        console.warn('[handleDaftar] Gagal sinkronisasi profil via admin action:', syncResult.error);
        // Fallback: coba insert langsung via client
        await supabase.from('profiles').upsert({
          id: newUser.id,
          nama_lengkap: namaTrim,
          email: emailTrim,
          peran: DEFAULT_PERAN,
          jabatan: 'Staf Operasional',
          aktif: true,
        });
      }

      // 3. Evaluasi sesi
      if (signUpData.session) {
        // Otomatis login jika Supabase dikonfigurasi auto-confirm
        router.push('/');
        router.refresh();
      } else {
        // Alihkan ke form login dengan notifikasi sukses
        setSuccessMessage('Pendaftaran akun berhasil! Silakan masuk menggunakan email dan kata sandi baru Anda.');
        setMode('masuk');
        setEmail(emailTrim);
        setPassword('');
        setRegEmail('');
        setRegNamaLengkap('');
        setRegPassword('');
        setRegPasswordTouched(false);
        setLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat mendaftarkan akun.';
      setErrorMessage(msg);
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#E9E9E1] dark:bg-[#06130D] min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden font-sans text-[#11301B] dark:text-slate-100 antialiased selection:bg-[#D3BC5F] selection:text-[#11301B] px-4 py-8 transition-colors duration-200">
      {/* Tombol Toggle Tema (Mode Siang / Malam) di Pojok Kanan Atas */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 sm:p-2.5 rounded-xl bg-[#F7F7ED] dark:bg-[#0b281e] border border-[#D3BC5F]/40 dark:border-[#D3BC5F]/50 text-[#11301B] dark:text-[#D3BC5F] hover:bg-[#E9E9E1] dark:hover:bg-[#123524] transition-colors cursor-pointer shadow-none flex items-center justify-center"
          title={theme === 'dark' ? 'Beralih ke Mode Siang (Light Mode)' : 'Beralih ke Mode Malam (Dark Mode)'}
          aria-label="Toggle tema siang/malam"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-[#D3BC5F]" />
          ) : (
            <Moon className="w-4 h-4 text-[#11301B]" />
          )}
        </button>
      </div>

      {/* =========================================================
           KARTU UTAMA DENGAN ATAP JOGLO KLASIK MINIMALIS & BERSIH
           ========================================================= */}
      <div className="relative z-10 w-full max-w-[480px] flex flex-col items-center my-auto">
        
        {/* SVG ATAP JOGLO MINIMALIS TEGAS (BERSIH TANPA ORNAMEN SUDUT) */}
        <div className="w-full relative -mb-[7px] z-10 pointer-events-none">
          <svg
            viewBox="0 0 500 90"
            className="w-full h-auto block"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {/* 1. Siluet Utama Atap Joglo Bersih & Tegas */}
            <path
              d="
                M 70,82
                L 15,88
                C 12,89 12,87 14,86
                L 170,58
                L 205,24
                L 198,17
                L 204,21
                L 296,21
                L 302,17
                L 295,24
                L 330,58
                L 486,86
                C 488,87 488,89 485,88
                L 430,82
                Z
              "
              className="fill-[#F7F7ED] dark:fill-[#081a12] stroke-[#D3BC5F]"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* 2. Garis Rangka Dalam Arsitektur Joglo Bersih */}
            <path
              d="
                M 212,27
                L 288,27
                M 212,27
                L 178,59
                L 40,84
                M 288,27
                L 322,59
                L 460,84
              "
              fill="none"
              className="stroke-[#D3BC5F]"
              strokeWidth="1"
              opacity="0.8"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* PAPAN KARTU UTAMA DENGAN BINGKAI BERSIH */}
        <div className="w-[72%] sm:w-[72%] bg-[#F7F7ED] dark:bg-[#081a12] border-2 border-[#D3BC5F] border-t-0 p-2 sm:p-2.5 pb-6 flex flex-col items-center relative overflow-hidden">
          
          {/* Bingkai Dalam Tipis (Inner Border Line) */}
          <div className="relative z-10 w-full border border-[#D3BC5F]/40 dark:border-[#D3BC5F]/80 p-4 sm:p-5 flex flex-col items-center">
            
            {/* Header Judul Resmi: CV Batik Larasati - Sistem Keuangan dan Akuntansi */}
            <div className="text-center mt-1 mb-3.5 flex flex-col items-center">
              <Logo
                variant="transparent-monogram"
                size="md"
                className="w-12 h-12 mb-2"
                priority
              />
              <h1 className="text-xl sm:text-2xl font-bold text-[#11301B] dark:text-[#D3BC5F] tracking-wide mb-1">
                CV Batik Larasati
              </h1>
              <p className="text-[#11301B]/80 dark:text-[#D3BC5F] text-[9.5px] sm:text-[10px] tracking-[0.2em] font-medium uppercase">
                Sistem Keuangan dan Akuntansi
              </p>
            </div>

            {/* Tab Pilihan: Masuk / Daftar Akun */}
            <div className="w-full flex p-1 mb-3 rounded-lg bg-[#E9E9E1] dark:bg-[#05140d] border border-[#D3BC5F]/35">
              <button
                type="button"
                onClick={() => {
                  setMode('masuk');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  mode === 'masuk'
                    ? 'bg-[#11301B] text-[#E4C588] shadow-2xs border border-[#D3BC5F]/50'
                    : 'text-[#11301B]/70 dark:text-[#D3BC5F]/70 hover:text-[#11301B] dark:hover:text-[#D3BC5F]'
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('daftar');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  mode === 'daftar'
                    ? 'bg-[#11301B] text-[#E4C588] shadow-2xs border border-[#D3BC5F]/50'
                    : 'text-[#11301B]/70 dark:text-[#D3BC5F]/70 hover:text-[#11301B] dark:hover:text-[#D3BC5F]'
                }`}
              >
                Daftar Akun
              </button>
            </div>

            {/* Notifikasi Galat Jika Ada */}
            {errorMessage && (
              <div className="w-full mb-3.5 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-500/40 flex items-start gap-2 text-rose-800 dark:text-rose-200 text-xs animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            {/* Notifikasi Berhasil Jika Ada */}
            {successMessage && (
              <div className="w-full mb-3.5 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/40 flex items-start gap-2 text-emerald-800 dark:text-emerald-200 text-xs animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <span className="leading-snug">{successMessage}</span>
              </div>
            )}

            {/* =======================================================
                 KONTEN 1: FORMULIR MASUK (LOGIN)
                 ======================================================= */}
            {mode === 'masuk' && (
              <div className="w-full mt-1">
                <form onSubmit={handleMasuk} className="flex flex-col gap-3.5">
                  {/* Field Alamat Email */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="email-input"
                      className="text-[9px] uppercase tracking-wider text-[#11301B]/85 dark:text-[#D3BC5F] font-bold"
                    >
                      Alamat Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#11301B]/60 dark:text-[#D3BC5F]/60">
                        <Mail className="h-3.5 w-3.5" />
                      </div>
                      <input
                        id="email-input"
                        type="email"
                        placeholder="nama@larasati.test"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        className="login-input w-full bg-white dark:bg-[#05140d] border border-gray-300 dark:border-[#D3BC5F]/40 rounded-lg pl-8 pr-3 py-2 text-[#11301B] dark:text-slate-100 outline-none focus:border-[#11301B] dark:focus:border-[#D3BC5F] focus:ring-0 shadow-none text-xs placeholder:text-gray-400 dark:placeholder:text-slate-600 disabled:opacity-50 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Field Kata Sandi */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="password-input"
                      className="text-[9px] uppercase tracking-wider text-[#11301B]/85 dark:text-[#D3BC5F] font-bold"
                    >
                      Kata Sandi
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#11301B]/60 dark:text-[#D3BC5F]/60">
                        <Lock className="h-3.5 w-3.5" />
                      </div>
                      <input
                        id="password-input"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        className="login-input w-full bg-white dark:bg-[#05140d] border border-gray-300 dark:border-[#D3BC5F]/40 rounded-lg pl-8 pr-8 py-2 text-[#11301B] dark:text-slate-100 outline-none focus:border-[#11301B] dark:focus:border-[#D3BC5F] focus:ring-0 shadow-none text-xs placeholder:text-gray-400 dark:placeholder:text-slate-600 tracking-wider disabled:opacity-50 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center cursor-pointer text-[#11301B]/60 dark:text-[#D3BC5F]/60 hover:text-[#11301B] dark:hover:text-[#D3BC5F] transition-colors focus:outline-none"
                        aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Tombol Masuk */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 w-full flex items-center justify-center gap-2 bg-[#11301B] hover:bg-[#11301B]/90 active:bg-[#11301B] text-[#E4C588] border border-[#D3BC5F] font-bold text-xs uppercase tracking-widest py-2.5 rounded-lg transition-all shadow-none disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E4C588]" />
                        <span>Memverifikasi...</span>
                      </>
                    ) : (
                      <span>Masuk ke Akun</span>
                    )}
                  </button>
                </form>

                {/* Link Switch ke Form Registrasi */}
                <div className="mt-3.5 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('daftar');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] text-[#11301B]/75 dark:text-[#D3BC5F] hover:underline font-semibold cursor-pointer"
                  >
                    Belum memiliki akun? Daftar akun baru
                  </button>
                </div>
              </div>
            )}

            {/* =======================================================
                 KONTEN 2: FORMULIR REGISTRASI AKUN BARU
                 ======================================================= */}
            {mode === 'daftar' && (
              <div className="w-full mt-1">
                <form onSubmit={handleDaftar} className="flex flex-col gap-3">
                  {/* 1. Alamat Email */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="reg-email-input"
                      className="text-[9px] uppercase tracking-wider text-[#11301B]/85 dark:text-[#D3BC5F] font-bold"
                    >
                      Alamat Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#11301B]/60 dark:text-[#D3BC5F]/60">
                        <Mail className="h-3.5 w-3.5" />
                      </div>
                      <input
                        id="reg-email-input"
                        type="email"
                        placeholder="nama@larasati.test"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        disabled={loading}
                        className="login-input w-full bg-white dark:bg-[#05140d] border border-gray-300 dark:border-[#D3BC5F]/40 rounded-lg pl-8 pr-3 py-2 text-[#11301B] dark:text-slate-100 outline-none focus:border-[#11301B] dark:focus:border-[#D3BC5F] focus:ring-0 shadow-none text-xs placeholder:text-gray-400 dark:placeholder:text-slate-600 disabled:opacity-50 transition-colors"
                      />
                    </div>
                  </div>

                  {/* 2. Username / Nama Lengkap */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="reg-name-input"
                      className="text-[9px] uppercase tracking-wider text-[#11301B]/85 dark:text-[#D3BC5F] font-bold"
                    >
                      Username / Nama Lengkap
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#11301B]/60 dark:text-[#D3BC5F]/60">
                        <User className="h-3.5 w-3.5" />
                      </div>
                      <input
                        id="reg-name-input"
                        type="text"
                        placeholder="Contoh: Ayu Anwar / Budi Santoso"
                        required
                        value={regNamaLengkap}
                        onChange={(e) => setRegNamaLengkap(e.target.value)}
                        disabled={loading}
                        className="login-input w-full bg-white dark:bg-[#05140d] border border-gray-300 dark:border-[#D3BC5F]/40 rounded-lg pl-8 pr-3 py-2 text-[#11301B] dark:text-slate-100 outline-none focus:border-[#11301B] dark:focus:border-[#D3BC5F] focus:ring-0 shadow-none text-xs placeholder:text-gray-400 dark:placeholder:text-slate-600 disabled:opacity-50 transition-colors"
                      />
                    </div>
                  </div>

                  {/* 3. Kata Sandi + Validasi Regex Keamanan */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="reg-password-input"
                      className="text-[9px] uppercase tracking-wider text-[#11301B]/85 dark:text-[#D3BC5F] font-bold"
                    >
                      Kata Sandi
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#11301B]/60 dark:text-[#D3BC5F]/60">
                        <Lock className="h-3.5 w-3.5" />
                      </div>
                      <input
                        id="reg-password-input"
                        type={regShowPassword ? 'text' : 'password'}
                        placeholder="Minimal 6 karakter kombinasi"
                        required
                        value={regPassword}
                        onChange={(e) => {
                          setRegPassword(e.target.value);
                          if (!regPasswordTouched) setRegPasswordTouched(true);
                        }}
                        onBlur={() => setRegPasswordTouched(true)}
                        disabled={loading}
                        className={`login-input w-full bg-white dark:bg-[#05140d] border rounded-lg pl-8 pr-8 py-2 text-[#11301B] dark:text-slate-100 outline-none focus:ring-0 shadow-none text-xs placeholder:text-gray-400 dark:placeholder:text-slate-600 tracking-wider disabled:opacity-50 transition-colors ${
                          showPasswordWarning
                            ? 'border-rose-400 dark:border-rose-500 focus:border-rose-500'
                            : 'border-gray-300 dark:border-[#D3BC5F]/40 focus:border-[#11301B] dark:focus:border-[#D3BC5F]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setRegShowPassword(!regShowPassword)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center cursor-pointer text-[#11301B]/60 dark:text-[#D3BC5F]/60 hover:text-[#11301B] dark:hover:text-[#D3BC5F] transition-colors focus:outline-none"
                        aria-label={regShowPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                      >
                        {regShowPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>

                    {/* Pesan Peringatan Visual Keamanan Kata Sandi */}
                    {showPasswordWarning && (
                      <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 font-medium leading-tight animate-in fade-in duration-150">
                        Kata sandi minimal 6 karakter, wajib mengandung kombinasi huruf besar, huruf kecil, angka, dan simbol.
                      </p>
                    )}
                  </div>

                  {/* Tombol Submit Registrasi */}
                  <button
                    type="submit"
                    disabled={loading || (regPassword.length > 0 && !isPasswordValid)}
                    className="mt-2 w-full flex items-center justify-center gap-2 bg-[#11301B] hover:bg-[#11301B]/90 active:bg-[#11301B] text-[#E4C588] border border-[#D3BC5F] font-bold text-xs uppercase tracking-widest py-2.5 rounded-lg transition-all shadow-none disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E4C588]" />
                        <span>Mendaftarkan...</span>
                      </>
                    ) : (
                      <span>Daftar Akun Baru</span>
                    )}
                  </button>
                </form>

                {/* Link Switch ke Form Masuk */}
                <div className="mt-3.5 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('masuk');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] text-[#11301B]/75 dark:text-[#D3BC5F] hover:underline font-semibold cursor-pointer"
                  >
                    Sudah memiliki akun? Masuk ke akun
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer Hak Cipta Sederhana */}
        <p className="text-[10px] text-[#11301B]/70 dark:text-[#D3BC5F]/80 tracking-[0.2em] uppercase font-medium mt-4">
          © 2026 CV BATIK LARASATI
        </p>

      </div>
    </div>
  );
}
