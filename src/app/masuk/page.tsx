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
  CheckCircle2
} from 'lucide-react';

// Akun uji cepat untuk pengujian evaluasi bootcamp
const AKUN_UJI_PRESET = [
  {
    peran: 'Direktur',
    nama: 'Laras Prameswari',
    email: 'laras@larasati.test',
    warna: 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200',
    icon: '👑'
  },
  {
    peran: 'Akuntan',
    nama: 'Dimas Arya Nugroho',
    email: 'dimas@larasati.test',
    warna: 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200',
    icon: '💼'
  },
  {
    peran: 'Staf',
    nama: 'Rina Anggraini',
    email: 'rina@larasati.test',
    warna: 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200',
    icon: '🧵'
  },
  {
    peran: 'Nonaktif',
    nama: 'Yoga Pratama',
    email: 'yoga@larasati.test',
    warna: 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200',
    icon: '🚫'
  }
];

const DEFAULT_TEST_PASSWORD = 'Latihan#2026';

export default function HalamanMasuk() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fungsi pengisian cepat akun uji
  const handlePilihAkunUji = (emailUji: string) => {
    setEmail(emailUji);
    setPassword(DEFAULT_TEST_PASSWORD);
    setErrorMessage(null);
  };

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
        // Jika profil tidak ditemukan, keluarkan sesi
        await supabase.auth.signOut();
        setErrorMessage('Profil pengguna tidak ditemukan dalam basis data sistem.');
        setLoading(false);
        return;
      }

      // Jika akun dinonaktifkan (seperti Yoga Pratama)
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
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 bg-gradient-to-br from-amber-50 via-slate-50 to-amber-100/50">
      <div className="w-full max-w-md">
        {/* Header Logo & Identitas Usaha */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-700 text-amber-50 shadow-lg shadow-amber-700/25 mb-4 border border-amber-600/30">
            <Sparkles className="w-8 h-8 text-amber-200" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            CV Batik Larasati
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Sistem Informasi Keuangan & Pembukuan UMKM
          </p>
        </div>

        {/* Card Formulir Masuk */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-200/80">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-800">Masuk ke Akun Anda</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Masukkan email terdaftar dan kata sandi yang telah diberikan.
            </p>
          </div>

          {/* Notifikasi Pesan Kesalahan */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 flex items-start gap-3 text-rose-700 text-sm animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <div className="leading-snug">{errorMessage}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleMasuk} className="space-y-4">
            {/* Input Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Alamat Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
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
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Input Kata Sandi */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="kata-sandi" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Kata Sandi
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
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
                  className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
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
              className="w-full mt-2 py-2.5 px-4 rounded-xl font-medium text-sm text-white bg-amber-700 hover:bg-amber-800 active:bg-amber-900 shadow-md shadow-amber-700/20 focus:outline-none focus:ring-2 focus:ring-amber-700/40 focus:ring-offset-2 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Masuk</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Preset: Memudahkan Evaluasi Bootcamp */}
          <div className="mt-8 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                Uji Cepat (Pilih Akun Uji)
              </span>
              <span className="text-[10px] text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/50">
                Data Latihan
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {AKUN_UJI_PRESET.map((akun) => (
                <button
                  key={akun.email}
                  type="button"
                  onClick={() => handlePilihAkunUji(akun.email)}
                  className={`text-left p-2 rounded-lg border text-xs transition-all flex flex-col justify-between cursor-pointer ${akun.warna}`}
                >
                  <div className="flex items-center gap-1.5 font-semibold">
                    <span>{akun.icon}</span>
                    <span>{akun.peran}</span>
                  </div>
                  <div className="text-[11px] opacity-80 truncate mt-0.5 font-normal">
                    {akun.nama}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 mt-2 text-[11px] text-slate-500">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Kata sandi bawaan otomatis diisi: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-semibold">{DEFAULT_TEST_PASSWORD}</code></span>
            </div>
          </div>
        </div>

        {/* Footer Hak Cipta & Catatan Akses Internal */}
        <div className="text-center mt-6 text-xs text-slate-500">
          <p>© 2026 CV Batik Larasati · Surakarta</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Aplikasi internal operasional UMKM. Pendaftaran akun hanya melalui Direktur.
          </p>
        </div>
      </div>
    </div>
  );
}
