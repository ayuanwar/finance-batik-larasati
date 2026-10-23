import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ImportMutasiClient } from './ImportMutasiClient';
import { MutasiBankItem } from './actions';

export const dynamic = 'force-dynamic';

export default async function ImportMutasiPage() {
  const supabase = await createClient();

  // 1. Verifikasi Sesi Pengguna
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/masuk');
  }

  // 2. Ambil Profil Pengguna
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.aktif) {
    redirect('/masuk');
  }

  // 3. Hak Akses RBAC: Staf DIBLOKIR TOTAL dan dialihkan ke Dasbor (/)
  if (profile.peran === 'staf') {
    redirect('/');
  }

  const adminSupabase = createAdminClient();

  // 4. Ambil Daftar Akun Kas/Bank (is_kas_bank = true)
  const { data: rawKasBank } = await adminSupabase
    .from('akun')
    .select('id, kode, nama, tipe, saldo_normal, is_kas_bank, aktif')
    .eq('is_kas_bank', true)
    .eq('aktif', true)
    .order('kode', { ascending: true });

  // 5. Ambil Seluruh Bagan Akun Aktif (untuk pilihan akun lawan di modal jurnal)
  const { data: rawSemuaAkun } = await adminSupabase
    .from('akun')
    .select('id, kode, nama, tipe, saldo_normal, aktif')
    .eq('aktif', true)
    .order('kode', { ascending: true });

  // 6. Ambil Seluruh Data Mutasi Bank beserta Relasi Akun dan Jurnal
  const { data: rawMutasi, error: mutasiErr } = await adminSupabase
    .from('mutasi_bank')
    .select(`
      id,
      akun_bank_id,
      tanggal,
      deskripsi,
      jumlah,
      saldo,
      nama_file,
      jurnal_id,
      diimpor_oleh,
      diimpor_pada,
      akun:akun_bank_id (id, kode, nama),
      jurnal:jurnal_id (id, nomor, status)
    `)
    .order('tanggal', { ascending: false })
    .order('id', { ascending: false });

  if (mutasiErr) {
    console.error('Error fetching mutasi_bank data:', mutasiErr);
  }

  const unwrapSingle = <T,>(item: T | T[] | null | undefined): T | null => {
    if (Array.isArray(item)) return (item[0] as T) || null;
    return (item as T) || null;
  };

  const mutasiList: MutasiBankItem[] = (rawMutasi || []).map((m: any) => ({
    id: m.id,
    akun_bank_id: m.akun_bank_id,
    akun_id: m.akun_bank_id,
    tanggal: m.tanggal,
    deskripsi: m.deskripsi,
    jumlah: Number(m.jumlah),
    saldo: m.saldo !== null && m.saldo !== undefined ? Number(m.saldo) : null,
    nama_file: m.nama_file,
    jurnal_id: m.jurnal_id,
    diimpor_oleh: m.diimpor_oleh,
    diimpor_pada: m.diimpor_pada,
    akun: unwrapSingle(m.akun),
    jurnal: unwrapSingle(m.jurnal),
  }));

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col font-sans">
      <Navbar profile={profile} />

      {/* Kontainer Terpusat: max-w-[1100px] mx-auto w-full px-4 sm:px-6 */}
      <main className="flex-1 max-w-[1100px] mx-auto w-full px-4 sm:px-6 py-8 sm:py-10">
        <ImportMutasiClient
          initialMutasi={mutasiList}
          kasBankList={rawKasBank || []}
          semuaAkunList={rawSemuaAkun || []}
          profile={profile}
        />
      </main>

      <Footer />
    </div>
  );
}
