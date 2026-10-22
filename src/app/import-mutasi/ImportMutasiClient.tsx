'use client';

import React, { useState, useTransition, useMemo, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Building2,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { formatRupiah, formatTanggalIndo } from '@/lib/utils';
import {
  MutasiBankItem,
  MutasiRowInput,
  importMutasiAction,
  buatDrafJurnalDariMutasiAction,
} from './actions';

export interface AkunKasBankItem {
  id: number;
  kode: string;
  nama: string;
  tipe: string;
  saldo_normal: string;
  is_kas_bank: boolean;
  aktif: boolean;
}

export interface AkunItem {
  id: number;
  kode: string;
  nama: string;
  tipe: string;
  saldo_normal: string;
  aktif: boolean;
}

interface ImportMutasiClientProps {
  initialMutasi: MutasiBankItem[];
  kasBankList: AkunKasBankItem[];
  semuaAkunList: AkunItem[];
  profile: {
    id: string;
    nama_lengkap: string;
    peran: string;
  };
}

interface BarisJurnalForm {
  id: string;
  akun_id: number;
  debit: number;
  kredit: number;
  keterangan: string;
}

const ITEMS_PER_PAGE = 10;

export function ImportMutasiClient({
  initialMutasi,
  kasBankList,
  semuaAkunList,
  profile,
}: ImportMutasiClientProps) {
  const [mutasiList, setMutasiList] = useState<MutasiBankItem[]>(initialMutasi);
  const [activeTab, setActiveTab] = useState<'belum' | 'semua' | 'sudah'>('belum');
  const [isPending, startTransition] = useTransition();

  // Filter state
  const [filterAkun, setFilterAkun] = useState<string>('semua');
  const [tglMulai, setTglMulai] = useState('');
  const [tglSelesai, setTglSelesai] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Global Notification
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // ============================================================================
  // 1. STATE & HANDLER UNGGAH FILE (CSV & XLSX)
  // ============================================================================
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedAkunId, setSelectedAkunId] = useState<number>(
    kasBankList[0]?.id || 0
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewRows, setPreviewRows] = useState<MutasiRowInput[]>([]);
  const [previewFileName, setPreviewFileName] = useState('');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Helper normalisasi nama kolom
  const findColumnValue = (
    row: Record<string, unknown>,
    candidates: string[]
  ): unknown => {
    const keys = Object.keys(row);
    for (const cand of candidates) {
      const match = keys.find(
        (k) =>
          k.toLowerCase().trim() === cand.toLowerCase().trim() ||
          k.toLowerCase().trim().includes(cand.toLowerCase().trim())
      );
      if (match && row[match] !== undefined && row[match] !== null) {
        return row[match];
      }
    }
    return undefined;
  };

  // Helper normalisasi tanggal ke YYYY-MM-DD
  const normalizeDate = (val: unknown): string => {
    if (!val) return '';
    if (val instanceof Date && !isNaN(val.getTime())) {
      return val.toISOString().slice(0, 10);
    }
    const str = String(val).trim();

    // Format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

    // Format DD/MM/YYYY atau DD-MM-YYYY
    const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmy) {
      const day = dmy[1].padStart(2, '0');
      const month = dmy[2].padStart(2, '0');
      const year = dmy[3];
      return `${year}-${month}-${day}`;
    }

    // Format Excel Serial Number
    const num = Number(str);
    if (!isNaN(num) && num > 30000 && num < 60000) {
      const date = new Date(Math.round((num - 25569) * 86400 * 1000));
      return date.toISOString().slice(0, 10);
    }

    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
    return '';
  };

  // Helper normalisasi nominal Rupiah
  const parseNominal = (val: unknown): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    let s = String(val).trim().replace(/Rp/gi, '').replace(/\s/g, '');

    // Format negatif (1000)
    let isNeg = false;
    if (s.startsWith('(') && s.endsWith(')')) {
      isNeg = true;
      s = s.slice(1, -1);
    } else if (s.startsWith('-')) {
      isNeg = true;
      s = s.slice(1);
    } else if (s.endsWith('DB') || s.endsWith('D')) {
      isNeg = true;
      s = s.replace(/DB|D/gi, '');
    } else if (s.endsWith('CR') || s.endsWith('C')) {
      s = s.replace(/CR|C/gi, '');
    }

    // Tangani separator desimal & ribuan
    if (s.includes('.') && s.includes(',')) {
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
        s = s.replace(/\./g, '').replace(',', '.');
      } else {
        s = s.replace(/,/g, '');
      }
    } else if (s.includes(',')) {
      if (/,\d{2}$/.test(s)) {
        s = s.replace(',', '.');
      } else {
        s = s.replace(/,/g, '');
      }
    }

    const n = parseFloat(s);
    if (isNaN(n)) return 0;
    return isNeg ? -Math.abs(n) : n;
  };

  // Parsing file mentah ke array mutasi terstruktur
  const parseFileContent = (file: File) => {
    setUploadError(null);
    const fileName = file.name;
    const isCsv = fileName.toLowerCase().endsWith('.csv');
    const isExcel =
      fileName.toLowerCase().endsWith('.xlsx') ||
      fileName.toLowerCase().endsWith('.xls');

    if (!isCsv && !isExcel) {
      setUploadError(
        'Format file tidak didukung. Mohon unggah file dengan ekstensi .csv, .xls, atau .xlsx.'
      );
      return;
    }

    const reader = new FileReader();

    if (isCsv) {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false,
          complete: (results) => {
            processParsedData(
              results.data as Record<string, unknown>[],
              fileName
            );
          },
          error: (err: Error) => {
            setUploadError('Gagal membaca file CSV: ' + err.message);
          },
        });
      };
      reader.readAsText(file);
    } else {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(
            worksheet,
            {
              raw: false,
              defval: '',
            }
          );
          processParsedData(json, fileName);
        } catch (err: unknown) {
          const msg =
            err instanceof Error ? err.message : 'Kesalahan file Excel.';
          setUploadError('Gagal membaca file Excel: ' + msg);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const processParsedData = (
    data: Record<string, unknown>[],
    fileName: string
  ) => {
    if (!data || data.length === 0) {
      setUploadError('File tidak memiliki baris data atau kosong.');
      return;
    }

    const parsedRows: MutasiRowInput[] = [];

    for (const row of data) {
      const rawDate = findColumnValue(row, [
        'tanggal',
        'date',
        'tgl',
        'post date',
        'trans date',
        'waktu',
      ]);
      const rawDesc = findColumnValue(row, [
        'deskripsi',
        'keterangan',
        'description',
        'uraian',
        'transaksi',
        'remark',
        'narration',
      ]);
      const rawAmount = findColumnValue(row, [
        'jumlah',
        'nominal',
        'amount',
        'mutasi',
        'total',
      ]);
      const rawDebit = findColumnValue(row, [
        'debit',
        'deb',
        'db',
        'keluar',
        'pengeluaran',
      ]);
      const rawCredit = findColumnValue(row, [
        'kredit',
        'credit',
        'cr',
        'masuk',
        'penerimaan',
      ]);
      const rawSaldo = findColumnValue(row, [
        'saldo',
        'balance',
        'sisa saldo',
      ]);
      const rawType = findColumnValue(row, ['tipe', 'type', 'd/c', 'cr/db']);

      const tanggal = normalizeDate(rawDate);
      const deskripsi = String(rawDesc || '').trim();

      if (!tanggal || !deskripsi) continue;

      let jumlah = 0;
      if (rawDebit !== undefined && rawCredit !== undefined) {
        const deb = parseNominal(rawDebit);
        const kre = parseNominal(rawCredit);
        if (deb > 0) jumlah = -deb; // Uang keluar
        else if (kre > 0) jumlah = kre; // Uang masuk
      } else if (rawAmount !== undefined) {
        jumlah = parseNominal(rawAmount);
        const typeStr = String(rawType || '').toUpperCase().trim();
        if (typeStr === 'DB' || typeStr === 'D' || typeStr === 'KELUAR') {
          jumlah = -Math.abs(jumlah);
        } else if (typeStr === 'CR' || typeStr === 'C' || typeStr === 'MASUK') {
          jumlah = Math.abs(jumlah);
        }
      }

      if (jumlah === 0) continue;

      const saldo = rawSaldo !== undefined ? parseNominal(rawSaldo) : null;

      parsedRows.push({
        tanggal,
        deskripsi,
        jumlah,
        saldo: saldo !== 0 || rawSaldo !== undefined ? saldo : null,
      });
    }

    if (parsedRows.length === 0) {
      setUploadError(
        'Tidak dapat mengenali kolom transaksi. Pastikan file memiliki kolom Tanggal, Deskripsi/Keterangan, dan Jumlah/Mutasi.'
      );
      return;
    }

    setPreviewRows(parsedRows);
    setPreviewFileName(fileName);
    setPreviewModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFileContent(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFileContent(file);
  };

  // Konfirmasi & Eksekusi Simpan Impor ke Database
  const handleConfirmImport = () => {
    if (!selectedAkunId) {
      setUploadError('Silakan pilih Akun Kas/Bank tujuan terlebih dahulu.');
      return;
    }

    startTransition(async () => {
      const res = await importMutasiAction({
        akunId: selectedAkunId,
        namaFile: previewFileName,
        rows: previewRows,
      });

      if (res.success && res.data) {
        const { totalInserted, totalDuplicate } = res.data;
        let msg = `Berhasil mengimpor ${totalInserted} baris mutasi bank baru.`;
        if (totalDuplicate > 0) {
          msg += ` (${totalDuplicate} baris duplikat otomatis dilewati).`;
        }

        setNotification({ type: 'success', message: msg });
        setPreviewModalOpen(false);
        setPreviewRows([]);

        // Refresh mutasi list dari database
        const selectedAkunObj = kasBankList.find((a) => a.id === selectedAkunId);
        const newInsertedItems: MutasiBankItem[] = previewRows.slice(0, totalInserted).map((r, i) => ({
          id: Date.now() + i,
          akun_bank_id: selectedAkunId,
          tanggal: r.tanggal,
          deskripsi: r.deskripsi,
          jumlah: r.jumlah,
          saldo: r.saldo,
          nama_file: previewFileName,
          jurnal_id: null,
          diimpor_oleh: profile.id,
          diimpor_pada: new Date().toISOString(),
          akun: selectedAkunObj ? { id: selectedAkunObj.id, kode: selectedAkunObj.kode, nama: selectedAkunObj.nama } : null,
        }));

        setMutasiList((prev) => [...newInsertedItems, ...prev]);
        setActiveTab('belum');
      } else {
        setUploadError(res.error || 'Gagal menyimpan mutasi bank.');
      }
    });
  };

  // ============================================================================
  // 2. STATE & HANDLER MODAL BUAT DRAF JURNAL (PRE-FILLED)
  // ============================================================================
  const [modalJurnalOpen, setModalJurnalOpen] = useState(false);
  const [selectedMutasiForJurnal, setSelectedMutasiForJurnal] =
    useState<MutasiBankItem | null>(null);
  const [formTanggalJurnal, setFormTanggalJurnal] = useState('');
  const [formKeteranganJurnal, setFormKeteranganJurnal] = useState('');
  const [barisJurnal, setBarisJurnal] = useState<BarisJurnalForm[]>([]);
  const [jurnalModalError, setJurnalModalError] = useState<string | null>(null);

  const handleOpenBuatJurnal = (mutasi: MutasiBankItem) => {
    setSelectedMutasiForJurnal(mutasi);
    setFormTanggalJurnal(mutasi.tanggal);
    setFormKeteranganJurnal(mutasi.deskripsi);
    setJurnalModalError(null);

    const isUangMasuk = mutasi.jumlah > 0;
    const nominalMutasi = Math.abs(mutasi.jumlah);

    // Baris 1: Akun Kas/Bank terkait mutasi
    // Uang Masuk: Kas bertambah di DEBIT
    // Uang Keluar: Kas berkurang di KREDIT
    const baris1: BarisJurnalForm = {
      id: 'baris-kas-bank',
      akun_id: mutasi.akun_bank_id,
      debit: isUangMasuk ? nominalMutasi : 0,
      kredit: isUangMasuk ? 0 : nominalMutasi,
      keterangan: mutasi.deskripsi,
    };

    // Baris 2: Akun Lawan (Default nominal berlawanan agar seimbang/balance)
    const baris2: BarisJurnalForm = {
      id: 'baris-lawan-1',
      akun_id: 0, // Akuntan tinggal memilih akun lawan
      debit: isUangMasuk ? 0 : nominalMutasi,
      kredit: isUangMasuk ? nominalMutasi : 0,
      keterangan: mutasi.deskripsi,
    };

    setBarisJurnal([baris1, baris2]);
    setModalJurnalOpen(true);
  };

  const handleTambahBaris = () => {
    const newBaris: BarisJurnalForm = {
      id: `baris-${Date.now()}`,
      akun_id: 0,
      debit: 0,
      kredit: 0,
      keterangan: formKeteranganJurnal,
    };
    setBarisJurnal((prev) => [...prev, newBaris]);
  };

  const handleHapusBaris = (index: number) => {
    if (barisJurnal.length <= 2) {
      setJurnalModalError('Jurnal minimal harus memiliki 2 baris akun (BR-02).');
      return;
    }
    setBarisJurnal((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateBaris = (
    index: number,
    field: keyof BarisJurnalForm,
    value: unknown
  ) => {
    setBarisJurnal((prev) =>
      prev.map((b, idx) => {
        if (idx !== index) return b;
        if (field === 'debit') {
          const deb = Math.max(0, Number(value || 0));
          return { ...b, debit: deb, kredit: deb > 0 ? 0 : b.kredit };
        }
        if (field === 'kredit') {
          const kre = Math.max(0, Number(value || 0));
          return { ...b, kredit: kre, debit: kre > 0 ? 0 : b.debit };
        }
        return { ...b, [field]: value };
      })
    );
  };

  // Kalkulasi Real-Time Saldo Jurnal
  const totalDebitJurnal = useMemo(() => {
    return barisJurnal.reduce((sum, b) => sum + (Number(b.debit) || 0), 0);
  }, [barisJurnal]);

  const totalKreditJurnal = useMemo(() => {
    return barisJurnal.reduce((sum, b) => sum + (Number(b.kredit) || 0), 0);
  }, [barisJurnal]);

  const selisihJurnal = Math.abs(totalDebitJurnal - totalKreditJurnal);
  const isJurnalBalanced =
    totalDebitJurnal > 0 &&
    totalKreditJurnal > 0 &&
    totalDebitJurnal === totalKreditJurnal;

  // Simpan Draf Jurnal dari Mutasi
  const handleSaveDrafJurnal = () => {
    if (!selectedMutasiForJurnal) return;
    setJurnalModalError(null);

    if (!formKeteranganJurnal.trim() || formKeteranganJurnal.trim().length < 5) {
      setJurnalModalError('Keterangan jurnal wajib diisi minimal 5 karakter.');
      return;
    }

    if (!isJurnalBalanced) {
      setJurnalModalError(
        `Jurnal belum seimbang. Total Debit (Rp${totalDebitJurnal.toLocaleString(
          'id-ID'
        )}) harus sama dengan Total Kredit (Rp${totalKreditJurnal.toLocaleString(
          'id-ID'
        )}).`
      );
      return;
    }

    // Pastikan seluruh baris memiliki akun
    const akunKosong = barisJurnal.some((b) => !b.akun_id || b.akun_id === 0);
    if (akunKosong) {
      setJurnalModalError('Seluruh baris transaksi wajib memilih akun akuntansi.');
      return;
    }

    startTransition(async () => {
      const res = await buatDrafJurnalDariMutasiAction({
        mutasiId: selectedMutasiForJurnal.id,
        tanggal: formTanggalJurnal,
        keterangan: formKeteranganJurnal.trim(),
        baris: barisJurnal.map((b) => ({
          akun_id: b.akun_id,
          debit: b.debit,
          kredit: b.kredit,
          keterangan: b.keterangan || formKeteranganJurnal,
        })),
      });

      if (res.success && res.data) {
        setNotification({
          type: 'success',
          message: `Draf Jurnal berhasil dibuat untuk mutasi "${selectedMutasiForJurnal.deskripsi}". Baris mutasi kini telah ditandai diproses.`,
        });

        // Update mutasi state secara lokal agar langsung berpindah status
        setMutasiList((prev) =>
          prev.map((m) =>
            m.id === selectedMutasiForJurnal.id
              ? {
                  ...m,
                  jurnal_id: res.data!.jurnalId,
                  jurnal: {
                    id: res.data!.jurnalId,
                    nomor: null,
                    status: 'draf',
                  },
                }
              : m
          )
        );

        setModalJurnalOpen(false);
      } else {
        setJurnalModalError(res.error || 'Gagal menyimpan draf jurnal.');
      }
    });
  };

  // ============================================================================
  // 3. STATISTIK KPI
  // ============================================================================
  const stats = useMemo(() => {
    let belumCount = 0;
    let sudahCount = 0;
    let totalMasuk = 0;
    let totalKeluar = 0;

    mutasiList.forEach((m) => {
      if (m.jurnal_id === null) belumCount++;
      else sudahCount++;

      if (m.jumlah > 0) totalMasuk += m.jumlah;
      else totalKeluar += Math.abs(m.jumlah);
    });

    return {
      total: mutasiList.length,
      belumCount,
      sudahCount,
      totalMasuk,
      totalKeluar,
    };
  }, [mutasiList]);

  // ============================================================================
  // 4. PENYARINGAN & PAGINASI MUTASI
  // ============================================================================
  const filteredMutasi = useMemo(() => {
    return mutasiList.filter((item) => {
      // 1. Filter Tab
      if (activeTab === 'belum' && item.jurnal_id !== null) return false;
      if (activeTab === 'sudah' && item.jurnal_id === null) return false;

      // 2. Filter Akun Kas/Bank
      if (filterAkun !== 'semua' && String(item.akun_bank_id) !== filterAkun) {
        return false;
      }

      // 3. Filter Rentang Tanggal
      if (tglMulai && item.tanggal < tglMulai) return false;
      if (tglSelesai && item.tanggal > tglSelesai) return false;

      // 4. Pencarian Teks
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = item.deskripsi.toLowerCase().includes(q);
        const matchAkun =
          item.akun?.nama.toLowerCase().includes(q) ||
          item.akun?.kode.toLowerCase().includes(q);
        const matchNominal = String(Math.abs(item.jumlah)).includes(q);
        if (!matchDesc && !matchAkun && !matchNominal) return false;
      }

      return true;
    });
  }, [mutasiList, activeTab, filterAkun, tglMulai, tglSelesai, searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMutasi.length / ITEMS_PER_PAGE)
  );
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedMutasi = useMemo(() => {
    return filteredMutasi.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredMutasi, startIndex]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. Header Judul & Deskripsi Nuansa Keraton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#d4af37]/25 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#0b2419] border border-[#d4af37]/40 text-[#d4af37]">
              <Building2 className="w-5 h-5 text-[#d4af37]" />
            </span>
            <span className="text-xs uppercase tracking-widest text-[#d4af37] font-bold">
              Rekonsiliasi Kas & Bank
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#fdfbf7] font-serif tracking-tight mt-1">
            Import Mutasi Bank
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Unggah rekening koran (CSV / Excel) untuk menyelaraskan catatan kas
            dan buat draf jurnal transaksi perantara secara otomatis.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1.5 rounded-xl border border-[#d4af37]/30 bg-[#071c15] text-[#d4af37] text-xs font-semibold flex items-center gap-1.5 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-[#d4af37]" />
            Anti-Duplikasi Aktif
          </span>
        </div>
      </div>

      {/* Global Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs sm:text-sm shadow-md transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Kartu Metrik Ringkasan (KPI) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#071c15] p-4 sm:p-5 rounded-2xl border border-[#d4af37]/25 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#d4af37]">
              Belum Diproses
            </span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-300 font-serif">
            {stats.belumCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">
            Mutasi memerlukan draf jurnal
          </span>
        </div>

        <div className="bg-[#071c15] p-4 sm:p-5 rounded-2xl border border-[#d4af37]/25 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#d4af37]">
              Sudah Dijurnal
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-300 font-serif">
            {stats.sudahCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">
            Terhubung ke jurnal draf/resmi
          </span>
        </div>

        <div className="bg-[#071c15] p-4 sm:p-5 rounded-2xl border border-[#d4af37]/25 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#d4af37]">
              Total Uang Masuk
            </span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-emerald-300 font-mono">
            {formatRupiah(stats.totalMasuk)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">
            Penerimaan kas/bank tercatat
          </span>
        </div>

        <div className="bg-[#071c15] p-4 sm:p-5 rounded-2xl border border-[#d4af37]/25 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#d4af37]">
              Total Uang Keluar
            </span>
            <ArrowUpRight className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-rose-300 font-mono">
            {formatRupiah(stats.totalKeluar)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">
            Pengeluaran kas/bank tercatat
          </span>
        </div>
      </div>

      {/* 3. Panel Area Unggah File Rekening Koran (CSV / XLSX / XLS) */}
      <div className="bg-[#071c15] p-5 sm:p-6 rounded-2xl border border-[#d4af37]/35 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#d4af37]/20 pb-4">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-[#d4af37]" />
            <h2 className="text-sm sm:text-base font-bold text-[#f3c853]">
              Unggah Rekening Koran / Berkas Mutasi
            </h2>
          </div>
          <span className="text-[11px] text-[#d4af37] font-medium bg-[#0b2419] px-3 py-1 rounded-full border border-[#d4af37]/30 self-start sm:self-auto">
            Mendukung .CSV, .XLS, .XLSX
          </span>
        </div>

        {uploadError && (
          <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-500/50 flex items-start gap-2.5 text-rose-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>{uploadError}</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Pilihan Akun Kas/Bank (Wajib) */}
          <div className="md:col-span-4 space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Pilih Akun Kas/Bank <span className="text-rose-400">*</span>
            </label>
            <select
              value={selectedAkunId}
              onChange={(e) => setSelectedAkunId(Number(e.target.value))}
              className="w-full p-2.5 text-xs rounded-xl border border-[#d4af37]/40 bg-[#06150f] text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#d4af37] cursor-pointer"
            >
              {kasBankList.map((ak) => (
                <option key={ak.id} value={ak.id}>
                  {ak.kode} - {ak.nama}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">
              Mutasi akan dipetakan ke rekening kas/bank terpilih.
            </p>
          </div>

          {/* Area Drag & Drop File */}
          <div className="md:col-span-8">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left ${
                isDragging
                  ? 'border-[#d4af37] bg-[#0b2419]'
                  : 'border-[#d4af37]/35 bg-[#06150f] hover:border-[#d4af37]/70 hover:bg-[#081c15]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-[#0b2419] border border-[#d4af37]/30 flex items-center justify-center shrink-0 text-[#d4af37]">
                <FileSpreadsheet className="w-6 h-6 text-[#d4af37]" />
              </div>
              <div className="space-y-1">
                <div className="text-xs sm:text-sm font-bold text-slate-200">
                  <span className="text-[#f3c853] underline underline-offset-2">
                    Klik untuk pilih berkas
                  </span>{' '}
                  atau seret berkas ke sini
                </div>
                <div className="text-[11px] text-slate-400">
                  Format tabel dengan kolom: Tanggal, Deskripsi, Jumlah/Debit/Kredit, dan Saldo.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Filter Bar & Navigasi Tab Status Mutasi */}
      <div className="space-y-4">
        {/* Tab Pilihan Status */}
        <div className="bg-[#071c15] p-1.5 rounded-2xl border border-[#d4af37]/25 shadow-lg flex gap-1.5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('belum');
              setCurrentPage(1);
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'belum'
                ? 'bg-[#0b2419] text-[#f3c853] border border-[#d4af37]/60 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#06150f]'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Belum Diproses</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-[#06150f] text-amber-300 border border-amber-500/30">
              {stats.belumCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('semua');
              setCurrentPage(1);
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'semua'
                ? 'bg-[#0b2419] text-[#f3c853] border border-[#d4af37]/60 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#06150f]'
            }`}
          >
            <Layers className="w-4 h-4 text-[#d4af37]" />
            <span>Semua Mutasi</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-[#06150f] text-[#d4af37] border border-[#d4af37]/30">
              {stats.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('sudah');
              setCurrentPage(1);
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'sudah'
                ? 'bg-[#0b2419] text-[#f3c853] border border-[#d4af37]/60 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#06150f]'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Sudah Dijurnal</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-[#06150f] text-emerald-300 border border-emerald-500/30">
              {stats.sudahCount}
            </span>
          </button>
        </div>

        {/* Filter Bar Lengkap */}
        <div className="bg-[#071c15] p-4 rounded-2xl border border-[#d4af37]/25 shadow-md">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
            {/* Pencarian Deskripsi */}
            <div className="lg:col-span-4 relative">
              <Search className="w-4 h-4 text-[#d4af37]/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari transaksi, nominal, rekening..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#d4af37]/30 bg-[#06150f] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
              />
            </div>

            {/* Filter Akun Kas/Bank */}
            <div className="lg:col-span-3">
              <select
                value={filterAkun}
                onChange={(e) => {
                  setFilterAkun(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2 text-xs rounded-xl border border-[#d4af37]/30 bg-[#06150f] text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#d4af37] cursor-pointer"
              >
                <option value="semua">Semua Rekening Kas/Bank</option>
                {kasBankList.map((ak) => (
                  <option key={ak.id} value={ak.id}>
                    {ak.kode} - {ak.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Rentang Tanggal */}
            <div className="lg:col-span-4 grid grid-cols-2 gap-2">
              <input
                type="date"
                value={tglMulai}
                onChange={(e) => {
                  setTglMulai(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2 text-xs rounded-xl border border-[#d4af37]/30 bg-[#06150f] text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#d4af37] cursor-pointer [color-scheme:dark]"
                title="Tanggal Mulai"
              />
              <input
                type="date"
                value={tglSelesai}
                onChange={(e) => {
                  setTglSelesai(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2 text-xs rounded-xl border border-[#d4af37]/30 bg-[#06150f] text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#d4af37] cursor-pointer [color-scheme:dark]"
                title="Tanggal Selesai"
              />
            </div>

            {/* Tombol Reset Filter */}
            <div className="lg:col-span-1 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setFilterAkun('semua');
                  setTglMulai('');
                  setTglSelesai('');
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="p-2 rounded-xl border border-[#d4af37]/30 bg-[#06150f] text-slate-300 hover:text-white hover:bg-[#0b2419] transition-all cursor-pointer"
                title="Reset Filter"
              >
                <RotateCcw className="w-4 h-4 text-[#d4af37]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Tabel Daftar Mutasi Bank */}
      <div className="bg-[#071c15] rounded-2xl border border-[#d4af37]/25 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#0b2419] border-b border-[#d4af37]/30 text-[#d4af37] uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Rekening Bank</th>
                <th className="py-3 px-4">Deskripsi / Uraian Mutasi</th>
                <th className="py-3 px-4 text-right">Mutasi Nominal</th>
                <th className="py-3 px-4 text-right">Saldo</th>
                <th className="py-3 px-4 text-center">Status Jurnal</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d4af37]/15">
              {paginatedMutasi.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-slate-400 bg-[#06150f]/50"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="w-8 h-8 text-[#d4af37]/40" />
                      <span className="font-semibold text-slate-300">
                        Tidak ada catatan mutasi bank yang sesuai dengan kriteria penyaringan.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedMutasi.map((item) => {
                  const isMasuk = item.jumlah > 0;
                  const isBelumDijurnal = item.jurnal_id === null;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[#0b2419]/50 transition-colors"
                    >
                      {/* Tanggal */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-200 font-medium">
                        {formatTanggalIndo(item.tanggal)}
                      </td>

                      {/* Rekening Kas/Bank */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#d4af37]" />
                          <span className="font-semibold text-slate-100">
                            {item.akun?.nama || `Akun ID ${item.akun_bank_id}`}
                          </span>
                        </div>
                      </td>

                      {/* Deskripsi */}
                      <td className="py-3 px-4 text-slate-200 min-w-[220px]">
                        <div className="font-medium">{item.deskripsi}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          File: {item.nama_file}
                        </div>
                      </td>

                      {/* Mutasi Nominal */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono">
                        <span
                          className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-lg border text-xs ${
                            isMasuk
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                              : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                          }`}
                        >
                          {isMasuk ? (
                            <>
                              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                              <span>+{formatRupiah(item.jumlah)}</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                              <span>-{formatRupiah(Math.abs(item.jumlah))}</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Saldo Rekening */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-slate-300">
                        {item.saldo !== null && item.saldo !== undefined
                          ? formatRupiah(item.saldo)
                          : '-'}
                      </td>

                      {/* Status Jurnal */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isBelumDijurnal ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-950/60 text-amber-300 border border-amber-500/40">
                            <Clock className="w-3 h-3 text-amber-400" />
                            Belum Dijurnal
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/40">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            {item.jurnal?.nomor || `Jurnal #${item.jurnal_id}`}
                          </span>
                        )}
                      </td>

                      {/* Aksi: Buat Draf Jurnal */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isBelumDijurnal ? (
                          <button
                            type="button"
                            onClick={() => handleOpenBuatJurnal(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#d4af37] bg-[#0b2419] text-[#f3c853] hover:bg-[#0e2f21] hover:scale-105 transition-all text-xs font-bold cursor-pointer shadow-xs"
                            title="Buat draf jurnal dari mutasi ini"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-[#d4af37]" />
                            <span>Buat Jurnal</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Sudah diproses
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginasi */}
        {filteredMutasi.length > ITEMS_PER_PAGE && (
          <div className="p-4 bg-[#0b2419] border-t border-[#d4af37]/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300">
            <div>
              Menampilkan {startIndex + 1} -{' '}
              {Math.min(startIndex + ITEMS_PER_PAGE, filteredMutasi.length)} dari{' '}
              {filteredMutasi.length} baris mutasi
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-[#d4af37]/30 bg-[#071c15] text-slate-200 hover:bg-[#0b2419] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-[#d4af37]" />
              </button>
              <span className="font-bold text-[#f3c853] px-2">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-[#d4af37]/30 bg-[#071c15] text-slate-200 hover:bg-[#0b2419] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-[#d4af37]" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: PREVIEW IMPOR MUTASI SEBELUM TERSIMPAN                            */}
      {/* ========================================================================= */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-[#071c15] rounded-2xl border border-[#d4af37]/50 shadow-2xl overflow-hidden my-8">
            <div className="p-4 sm:p-5 bg-[#0b2419] border-b border-[#d4af37]/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#d4af37]" />
                <h3 className="text-sm sm:text-base font-bold text-[#f3c853]">
                  Pratinjau Impor Mutasi ({previewFileName})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {/* Ringkasan File */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-[#06150f] border border-[#d4af37]/20">
                  <div className="text-[11px] text-slate-400">Total Transaksi Terbaca</div>
                  <div className="text-lg font-bold text-[#f3c853]">
                    {previewRows.length} baris
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#06150f] border border-[#d4af37]/20">
                  <div className="text-[11px] text-slate-400">Rekening Kas/Bank Tujuan</div>
                  <div className="text-xs font-bold text-slate-100 truncate mt-1">
                    {kasBankList.find((a) => a.id === selectedAkunId)?.nama || '-'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#06150f] border border-[#d4af37]/20">
                  <div className="text-[11px] text-slate-400">Validasi Anti-Duplikasi</div>
                  <div className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Otomatis Dicek Sistem
                  </div>
                </div>
              </div>

              {/* Tabel Pratinjau Baris */}
              <div className="border border-[#d4af37]/25 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0b2419] text-[#d4af37] sticky top-0 font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Deskripsi Transaksi</th>
                      <th className="py-2.5 px-3 text-right">Jumlah (Rp)</th>
                      <th className="py-2.5 px-3 text-right">Saldo (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d4af37]/15">
                    {previewRows.slice(0, 50).map((r, idx) => (
                      <tr key={idx} className="hover:bg-[#0b2419]/40">
                        <td className="py-2 px-3 whitespace-nowrap text-slate-300">
                          {r.tanggal}
                        </td>
                        <td className="py-2 px-3 text-slate-200">{r.deskripsi}</td>
                        <td
                          className={`py-2 px-3 text-right font-mono font-bold whitespace-nowrap ${
                            r.jumlah > 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {r.jumlah > 0 ? '+' : ''}
                          {formatRupiah(r.jumlah)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-400 whitespace-nowrap">
                          {r.saldo !== null ? formatRupiah(r.saldo) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {previewRows.length > 50 && (
                <div className="text-[11px] text-slate-400 text-center italic">
                  Menampilkan 50 baris pertama dari total {previewRows.length} baris.
                </div>
              )}
            </div>

            <div className="p-4 bg-[#0b2419] border-t border-[#d4af37]/25 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-700 bg-[#071c15] text-slate-300 hover:bg-slate-800 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmImport}
                className="px-5 py-2 text-xs font-bold rounded-xl border border-[#d4af37] bg-[#0b2419] text-[#f3c853] hover:bg-[#0e2f21] transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                {isPending ? 'Mengimpor Data...' : 'Konfirmasi & Simpan Mutasi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: FORM BUAT DRAF JURNAL DARI BARIS MUTASI (PRE-FILLED)             */}
      {/* ========================================================================= */}
      {modalJurnalOpen && selectedMutasiForJurnal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-[#071c15] rounded-2xl border border-[#d4af37]/50 shadow-2xl overflow-hidden my-8">
            <div className="p-4 sm:p-5 bg-[#0b2419] border-b border-[#d4af37]/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#d4af37]" />
                <h3 className="text-sm sm:text-base font-bold text-[#f3c853]">
                  Buat Draf Jurnal dari Mutasi
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalJurnalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-5">
              {/* Info Mutasi Asli */}
              <div className="p-3.5 rounded-xl bg-[#06150f] border border-[#d4af37]/25 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#d4af37] uppercase tracking-wider">
                    Sumber Mutasi Bank
                  </span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded-lg border text-[11px] ${
                      selectedMutasiForJurnal.jumlah > 0
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    {selectedMutasiForJurnal.jumlah > 0
                      ? `+${formatRupiah(selectedMutasiForJurnal.jumlah)} (Uang Masuk)`
                      : `-${formatRupiah(Math.abs(selectedMutasiForJurnal.jumlah))} (Uang Keluar)`}
                  </span>
                </div>
                <div className="text-slate-200 font-medium">
                  {selectedMutasiForJurnal.deskripsi}
                </div>
                <div className="text-[11px] text-slate-400">
                  Tanggal: {formatTanggalIndo(selectedMutasiForJurnal.tanggal)} ·
                  Rekening: {selectedMutasiForJurnal.akun?.nama} (
                  {selectedMutasiForJurnal.akun?.kode})
                </div>
              </div>

              {jurnalModalError && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>{jurnalModalError}</div>
                </div>
              )}

              {/* Form Header Jurnal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Tanggal Transaksi <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={formTanggalJurnal}
                    onChange={(e) => setFormTanggalJurnal(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-[#d4af37]/40 bg-[#06150f] text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#d4af37] [color-scheme:dark]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Status Dokumen
                  </label>
                  <div className="p-2.5 rounded-xl border border-[#d4af37]/25 bg-[#06150f] text-[#f3c853] text-xs font-bold flex items-center justify-between">
                    <span>Draf Jurnal (Wajib Draf Sesuai PRD)</span>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Keterangan Jurnal <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formKeteranganJurnal}
                    onChange={(e) => setFormKeteranganJurnal(e.target.value)}
                    placeholder="Keterangan lengkap transaksi..."
                    className="w-full p-2.5 text-xs rounded-xl border border-[#d4af37]/40 bg-[#06150f] text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                    required
                  />
                </div>
              </div>

              {/* Tabel Dinamis Baris Jurnal */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#d4af37]">
                    Rincian Baris Jurnal (Minimal 2 Baris Seimbang)
                  </span>
                  <button
                    type="button"
                    onClick={handleTambahBaris}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#d4af37]/40 text-[#f3c853] bg-[#06150f] hover:bg-[#0b2419] text-xs font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#d4af37]" />
                    <span>Tambah Baris Akun</span>
                  </button>
                </div>

                <div className="border border-[#d4af37]/25 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0b2419] text-[#d4af37] font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Akun Akuntansi</th>
                        <th className="py-2.5 px-3">Keterangan Baris</th>
                        <th className="py-2.5 px-3 text-right w-32">Debit (Rp)</th>
                        <th className="py-2.5 px-3 text-right w-32">Kredit (Rp)</th>
                        <th className="py-2.5 px-2 text-center w-10">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#d4af37]/15">
                      {barisJurnal.map((baris, idx) => {
                        const isKasBankLine = idx === 0;

                        return (
                          <tr key={baris.id} className="bg-[#071c15]">
                            {/* Dropdown Akun */}
                            <td className="py-2 px-3">
                              <select
                                value={baris.akun_id}
                                onChange={(e) =>
                                  handleUpdateBaris(idx, 'akun_id', Number(e.target.value))
                                }
                                className={`w-full p-1.5 text-xs rounded-lg border bg-[#06150f] text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#d4af37] ${
                                  !baris.akun_id
                                    ? 'border-rose-500/60'
                                    : 'border-[#d4af37]/30'
                                }`}
                              >
                                <option value={0}>-- Pilih Akun --</option>
                                {semuaAkunList.map((ak) => (
                                  <option key={ak.id} value={ak.id}>
                                    {ak.kode} - {ak.nama} ({ak.tipe})
                                  </option>
                                ))}
                              </select>
                              {isKasBankLine && (
                                <span className="text-[10px] text-[#f3c853] block mt-0.5">
                                  ★ Akun Kas/Bank Mutasi
                                </span>
                              )}
                            </td>

                            {/* Keterangan Baris */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={baris.keterangan}
                                onChange={(e) =>
                                  handleUpdateBaris(idx, 'keterangan', e.target.value)
                                }
                                placeholder="Uraian baris..."
                                className="w-full p-1.5 text-xs rounded-lg border border-[#d4af37]/30 bg-[#06150f] text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                              />
                            </td>

                            {/* Debit */}
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                min={0}
                                value={baris.debit || ''}
                                onChange={(e) =>
                                  handleUpdateBaris(idx, 'debit', e.target.value)
                                }
                                placeholder="0"
                                className="w-full p-1.5 text-xs rounded-lg border border-[#d4af37]/30 bg-[#06150f] text-slate-100 text-right font-mono focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                              />
                            </td>

                            {/* Kredit */}
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                min={0}
                                value={baris.kredit || ''}
                                onChange={(e) =>
                                  handleUpdateBaris(idx, 'kredit', e.target.value)
                                }
                                placeholder="0"
                                className="w-full p-1.5 text-xs rounded-lg border border-[#d4af37]/30 bg-[#06150f] text-slate-100 text-right font-mono focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                              />
                            </td>

                            {/* Tombol Hapus Baris */}
                            <td className="py-2 px-2 text-center">
                              {barisJurnal.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleHapusBaris(idx)}
                                  className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer"
                                  title="Hapus Baris"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Kalkulasi Ringkasan Saldo Real-Time */}
              <div className="p-4 rounded-xl bg-[#06150f] border border-[#d4af37]/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Total Debit</span>
                    <span className="font-mono font-bold text-slate-100 text-sm">
                      {formatRupiah(totalDebitJurnal)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Total Kredit</span>
                    <span className="font-mono font-bold text-slate-100 text-sm">
                      {formatRupiah(totalKreditJurnal)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Status Keseimbangan:</span>
                  {isJurnalBalanced ? (
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Seimbang (Balance)
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-rose-950/80 text-rose-300 border border-rose-500/50 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      Selisih {formatRupiah(selisihJurnal)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#0b2419] border-t border-[#d4af37]/25 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setModalJurnalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-700 bg-[#071c15] text-slate-300 hover:bg-slate-800 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPending || !isJurnalBalanced}
                onClick={handleSaveDrafJurnal}
                className="px-5 py-2 text-xs font-bold rounded-xl border border-[#d4af37] bg-[#0b2419] text-[#f3c853] hover:bg-[#0e2f21] transition-all cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPending ? 'Menyimpan Draf...' : 'Simpan Draf Jurnal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
