'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export default function HalamanMasuk() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleMasuk = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

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

      // 2. Periksa status aktif pengguna di tabel profiles (BR-12 & TC-AUTH-02)
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

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 bg-[#081c15] relative overflow-hidden">
      {/* Aksen Latar Belakang Cahaya Keemasan Keraton */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#d4af37]/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header Identitas Usaha Nuansa Keraton */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#0f2d1e] text-[#d4af37] shadow-xl shadow-[#081c15] mb-4 border border-[#d4af37]/40">
            <Sparkles className="w-8 h-8 text-[#d4af37]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#fdfbf7] font-serif">
            CV Batik Larasati
          </h1>
          <p className="text-xs sm:text-sm text-[#d4af37]/90 mt-1 font-medium tracking-wide">
            Sistem Keuangan & Pembukuan Kas Keraton Surakarta
          </p>
        </div>

        {/* Card Formulir Masuk Nuansa Deep Forest Green & Gold */}
        <div className="bg-[#0b2419]/90 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl border border-[#d4af37]/30">
          <div className="mb-6 pb-4 border-b border-[#d4af37]/15">
            <h2 className="text-lg font-bold text-[#fdfbf7] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#d4af37]" />
              Masuk ke Sistem
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Gunakan email terdaftar dan kata sandi Anda.
            </p>
          </div>

          {/* Notifikasi Pesan Kesalahan */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/40 flex items-start gap-3 text-rose-200 text-xs sm:text-sm animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
              <div className="leading-snug">{errorMessage}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleMasuk} className="space-y-4">
            {/* Input Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-[#d4af37] mb-1.5">
                Alamat Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4 text-[#d4af37]/70" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@larasati.test"
                  disabled={loading}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-[#d4af37]/25 bg-[#06150f] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Input Kata Sandi */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="kata-sandi" className="block text-xs font-bold uppercase tracking-wider text-[#d4af37]">
                  Kata Sandi
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4 text-[#d4af37]/70" />
                </div>
                <input
                  id="kata-sandi"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-[#d4af37]/25 bg-[#06150f] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-[#d4af37] focus:outline-none"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Tombol Masuk */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-2.5 px-4 rounded-xl font-bold text-sm text-[#081c15] bg-[#d4af37] hover:bg-[#e0bc46] active:bg-[#c49f2e] shadow-md focus:outline-none focus:ring-2 focus:ring-[#d4af37] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#081c15]" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                  <span>Masuk ke Akun</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-slate-400">
          <p className="font-medium text-[#d4af37]/80">© 2026 CV Batik Larasati · Surakarta</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Aplikasi internal operasional UMKM. Pendaftaran akun hanya melalui Direktur.
          </p>
        </div>
      </div>
    </div>
  );
}
