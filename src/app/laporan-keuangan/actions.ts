'use server';

import { createClient } from '@/lib/supabase/server';

export interface LabaRugiAkunItem {
  id: number;
  kode: string;
  nama: string;
  tipe: 'pendapatan' | 'beban';
  nominal: number;
}

export interface LabaRugiData {
  tanggal_mulai: string;
  tanggal_selesai: string;
  pendapatan: LabaRugiAkunItem[];
  total_pendapatan: number;
  beban: LabaRugiAkunItem[];
  total_beban: number;
  laba_bersih: number; // total_pendapatan - total_beban
}

export interface NeracaAkunItem {
  id: number;
  kode: string;
  nama: string;
  tipe: 'aset' | 'kewajiban' | 'ekuitas';
  saldo: number;
}

export interface NeracaData {
  per_tanggal: string;
  aset: NeracaAkunItem[];
  total_aset: number;
  kewajiban: NeracaAkunItem[];
  total_kewajiban: number;
  ekuitas: NeracaAkunItem[];
  subtotal_ekuitas: number;
  laba_berjalan: number;
  total_ekuitas: number;
  total_pasiva: number;
  is_balanced: boolean;
  selisih: number;
}

export interface NeracaSaldoItem {
  id: number;
  kode: string;
  nama: string;
  tipe: 'aset' | 'kewajiban' | 'ekuitas' | 'pendapatan' | 'beban';
  saldo_normal: 'debit' | 'kredit';
  debit: number;
  kredit: number;
}

export interface NeracaSaldoData {
  per_tanggal: string;
  items: NeracaSaldoItem[];
  total_debit: number;
  total_kredit: number;
  is_balanced: boolean;
  selisih: number;
}

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validasi otorisasi: Hanya Akuntan dan Direktur yang boleh mengakses laporan keuangan (BR-11)
 */
async function verifyFinanceUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, error: 'Sesi Anda telah berakhir. Silakan masuk kembali.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, peran, aktif')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.aktif) {
    return { authorized: false, error: 'Akun Anda tidak aktif atau tidak ditemukan.' };
  }

  if (profile.peran === 'staf') {
    return {
      authorized: false,
      error: 'Akses Ditolak: Staf dilarang mengakses laporan keuangan (BR-11).',
    };
  }

  return { authorized: true, supabase, profile, user };
}

/**
 * 1. Ambil Data Laporan Laba Rugi (Income Statement)
 * Khusus akun tipe 'pendapatan' dan 'beban' yang terjadi di dalam rentang tanggal terpilih.
 */
export async function getLabaRugiAction(payload: {
  tanggal_mulai: string;
  tanggal_selesai: string;
}): Promise<ActionResponse<LabaRugiData>> {
  try {
    const auth = await verifyFinanceUser();
    if (!auth.authorized || !auth.supabase) {
      return { success: false, error: auth.error };
    }
    const supabase = auth.supabase;

    const { tanggal_mulai, tanggal_selesai } = payload;
    if (!tanggal_mulai || !tanggal_selesai) {
      return { success: false, error: 'Rentang tanggal harus diisi lengkap.' };
    }

    // Ambil semua akun pendapatan & beban
    const { data: akunList, error: akunErr } = await supabase
      .from('akun')
      .select('id, kode, nama, tipe, saldo_normal')
      .in('tipe', ['pendapatan', 'beban'])
      .order('kode', { ascending: true });

    if (akunErr || !akunList) {
      return { success: false, error: 'Gagal mengambil daftar akun: ' + akunErr?.message };
    }

    // Ambil mutasi jurnal yang sudah diposting dalam rentang tanggal
    const { data: lines, error: linesErr } = await supabase
      .from('jurnal_baris')
      .select('debit, kredit, akun_id, jurnal!inner(status, tanggal)')
      .in('jurnal.status', ['diposting', 'dibalik'])
      .gte('jurnal.tanggal', tanggal_mulai)
      .lte('jurnal.tanggal', tanggal_selesai);

    if (linesErr) {
      return { success: false, error: 'Gagal mengambil data mutasi: ' + linesErr.message };
    }

    // Akumulasikan per akun
    const totalsByAkun: Record<number, { debit: number; kredit: number }> = {};
    (lines || []).forEach((l: any) => {
      if (!totalsByAkun[l.akun_id]) {
        totalsByAkun[l.akun_id] = { debit: 0, kredit: 0 };
      }
      totalsByAkun[l.akun_id].debit += Number(l.debit || 0);
      totalsByAkun[l.akun_id].kredit += Number(l.kredit || 0);
    });

    const pendapatanItems: LabaRugiAkunItem[] = [];
    const bebanItems: LabaRugiAkunItem[] = [];
    let totalPendapatan = 0;
    let totalBeban = 0;

    akunList.forEach((ak: any) => {
      const tot = totalsByAkun[ak.id] || { debit: 0, kredit: 0 };
      if (ak.tipe === 'pendapatan') {
        const net = tot.kredit - tot.debit;
        // Hanya masukkan yang bernilai atau seluruh akun pendapatan aktif
        totalPendapatan += net;
        pendapatanItems.push({
          id: ak.id,
          kode: ak.kode,
          nama: ak.nama,
          tipe: 'pendapatan',
          nominal: net,
        });
      } else if (ak.tipe === 'beban') {
        const net = tot.debit - tot.kredit;
        totalBeban += net;
        bebanItems.push({
          id: ak.id,
          kode: ak.kode,
          nama: ak.nama,
          tipe: 'beban',
          nominal: net,
        });
      }
    });

    const labaBersih = totalPendapatan - totalBeban;

    return {
      success: true,
      data: {
        tanggal_mulai,
        tanggal_selesai,
        pendapatan: pendapatanItems,
        total_pendapatan: totalPendapatan,
        beban: bebanItems,
        total_beban: totalBeban,
        laba_bersih: labaBersih,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
    return { success: false, error: message };
  }
}

/**
 * 2. Ambil Data Laporan Neraca (Balance Sheet)
 * Akumulasi saldo akun Aset, Kewajiban, Ekuitas dari awal pencatatan hingga 'per_tanggal'
 * Ditambah injeksi Laba/Rugi Berjalan kumulatif ke dalam Ekuitas.
 */
export async function getNeracaAction(payload: {
  per_tanggal: string;
}): Promise<ActionResponse<NeracaData>> {
  try {
    const auth = await verifyFinanceUser();
    if (!auth.authorized || !auth.supabase) {
      return { success: false, error: auth.error };
    }
    const supabase = auth.supabase;

    const { per_tanggal } = payload;
    if (!per_tanggal) {
      return { success: false, error: 'Tanggal neraca harus diisi.' };
    }

    // Ambil seluruh akun
    const { data: akunList, error: akunErr } = await supabase
      .from('akun')
      .select('id, kode, nama, tipe, saldo_normal')
      .order('kode', { ascending: true });

    if (akunErr || !akunList) {
      return { success: false, error: 'Gagal mengambil daftar akun: ' + akunErr?.message };
    }

    // Ambil seluruh mutasi jurnal yang sudah diposting hingga 'per_tanggal'
    const { data: lines, error: linesErr } = await supabase
      .from('jurnal_baris')
      .select('debit, kredit, akun_id, jurnal!inner(status, tanggal)')
      .in('jurnal.status', ['diposting', 'dibalik'])
      .lte('jurnal.tanggal', per_tanggal);

    if (linesErr) {
      return { success: false, error: 'Gagal mengambil data mutasi: ' + linesErr.message };
    }

    // Akumulasikan per akun
    const totalsByAkun: Record<number, { debit: number; kredit: number }> = {};
    (lines || []).forEach((l: any) => {
      if (!totalsByAkun[l.akun_id]) {
        totalsByAkun[l.akun_id] = { debit: 0, kredit: 0 };
      }
      totalsByAkun[l.akun_id].debit += Number(l.debit || 0);
      totalsByAkun[l.akun_id].kredit += Number(l.kredit || 0);
    });

    const asetItems: NeracaAkunItem[] = [];
    const kewajibanItems: NeracaAkunItem[] = [];
    const ekuitasItems: NeracaAkunItem[] = [];

    let totalAset = 0;
    let totalKewajiban = 0;
    let subtotalEkuitas = 0;

    let kumulatifPendapatan = 0;
    let kumulatifBeban = 0;

    akunList.forEach((ak: any) => {
      const tot = totalsByAkun[ak.id] || { debit: 0, kredit: 0 };
      const netDebit = tot.debit - tot.kredit;
      const netKredit = tot.kredit - tot.debit;

      if (ak.tipe === 'aset') {
        totalAset += netDebit;
        asetItems.push({
          id: ak.id,
          kode: ak.kode,
          nama: ak.nama,
          tipe: 'aset',
          saldo: netDebit,
        });
      } else if (ak.tipe === 'kewajiban') {
        totalKewajiban += netKredit;
        kewajibanItems.push({
          id: ak.id,
          kode: ak.kode,
          nama: ak.nama,
          tipe: 'kewajiban',
          saldo: netKredit,
        });
      } else if (ak.tipe === 'ekuitas') {
        subtotalEkuitas += netKredit;
        ekuitasItems.push({
          id: ak.id,
          kode: ak.kode,
          nama: ak.nama,
          tipe: 'ekuitas',
          saldo: netKredit,
        });
      } else if (ak.tipe === 'pendapatan') {
        kumulatifPendapatan += netKredit;
      } else if (ak.tipe === 'beban') {
        kumulatifBeban += netDebit;
      }
    });

    // Injeksi Laba/Rugi Berjalan ke dalam Ekuitas
    const labaBerjalan = kumulatifPendapatan - kumulatifBeban;
    const totalEkuitas = subtotalEkuitas + labaBerjalan;
    const totalPasiva = totalKewajiban + totalEkuitas;

    const isBalanced = totalAset === totalPasiva;
    const selisih = Math.abs(totalAset - totalPasiva);

    return {
      success: true,
      data: {
        per_tanggal,
        aset: asetItems,
        total_aset: totalAset,
        kewajiban: kewajibanItems,
        total_kewajiban: totalKewajiban,
        ekuitas: ekuitasItems,
        subtotal_ekuitas: subtotalEkuitas,
        laba_berjalan: labaBerjalan,
        total_ekuitas: totalEkuitas,
        total_pasiva: totalPasiva,
        is_balanced: isBalanced,
        selisih,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
    return { success: false, error: message };
  }
}

/**
 * 3. Ambil Data Neraca Saldo (Trial Balance)
 * Menampilkan seluruh akun beserta saldo akhir masing-masing (Debit atau Kredit) hingga tanggal tersebut.
 */
export async function getNeracaSaldoAction(payload: {
  per_tanggal: string;
}): Promise<ActionResponse<NeracaSaldoData>> {
  try {
    const auth = await verifyFinanceUser();
    if (!auth.authorized || !auth.supabase) {
      return { success: false, error: auth.error };
    }
    const supabase = auth.supabase;

    const { per_tanggal } = payload;
    if (!per_tanggal) {
      return { success: false, error: 'Tanggal neraca saldo harus diisi.' };
    }

    // Ambil seluruh akun
    const { data: akunList, error: akunErr } = await supabase
      .from('akun')
      .select('id, kode, nama, tipe, saldo_normal')
      .order('kode', { ascending: true });

    if (akunErr || !akunList) {
      return { success: false, error: 'Gagal mengambil daftar akun: ' + akunErr?.message };
    }

    // Ambil seluruh mutasi jurnal yang sudah diposting hingga 'per_tanggal'
    const { data: lines, error: linesErr } = await supabase
      .from('jurnal_baris')
      .select('debit, kredit, akun_id, jurnal!inner(status, tanggal)')
      .in('jurnal.status', ['diposting', 'dibalik'])
      .lte('jurnal.tanggal', per_tanggal);

    if (linesErr) {
      return { success: false, error: 'Gagal mengambil data mutasi: ' + linesErr.message };
    }

    // Akumulasikan debit dan kredit per akun
    const totalsByAkun: Record<number, { debit: number; kredit: number }> = {};
    (lines || []).forEach((l: any) => {
      if (!totalsByAkun[l.akun_id]) {
        totalsByAkun[l.akun_id] = { debit: 0, kredit: 0 };
      }
      totalsByAkun[l.akun_id].debit += Number(l.debit || 0);
      totalsByAkun[l.akun_id].kredit += Number(l.kredit || 0);
    });

    let totalDebit = 0;
    let totalKredit = 0;

    const items: NeracaSaldoItem[] = akunList.map((ak: any) => {
      const tot = totalsByAkun[ak.id] || { debit: 0, kredit: 0 };
      const net = tot.debit - tot.kredit;

      let deb = 0;
      let kre = 0;

      if (net > 0) {
        deb = net;
      } else if (net < 0) {
        kre = Math.abs(net);
      }

      totalDebit += deb;
      totalKredit += kre;

      return {
        id: ak.id,
        kode: ak.kode,
        nama: ak.nama,
        tipe: ak.tipe,
        saldo_normal: ak.saldo_normal,
        debit: deb,
        kredit: kre,
      };
    });

    const isBalanced = totalDebit === totalKredit;
    const selisih = Math.abs(totalDebit - totalKredit);

    return {
      success: true,
      data: {
        per_tanggal,
        items,
        total_debit: totalDebit,
        total_kredit: totalKredit,
        is_balanced: isBalanced,
        selisih,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
    return { success: false, error: message };
  }
}
