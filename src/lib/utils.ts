/**
 * Utilitas format mata uang Rupiah dan tanggal pelokalan Indonesia
 */

export function formatRupiah(amount: number | bigint | null | undefined): string {
  if (amount === null || amount === undefined) return 'Rp0';
  const val = typeof amount === 'bigint' ? Number(amount) : amount;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

export function formatTanggalIndo(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatTanggalWaktuIndo(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Utilitas format teks peran, jabatan, atau akun sesuai Pedoman Umum Ejaan Bahasa Indonesia (PUEBI).
 * Mengubah kata hubung, preposisi, dan partikel (dan, atau, serta, di, ke, dari, pada, untuk, dengan, dll.)
 * menjadi huruf kecil jika tidak berada di posisi awal kata.
 * Contoh: 'Direktur Dan Pemilik' -> 'Direktur dan Pemilik'
 *         'Kas Dan Bank' -> 'Kas dan Bank'
 *         'Beban Listrik, Air, Dan Internet' -> 'Beban Listrik, Air, dan Internet'
 */
export function formatTeksPuebi(text: string | null | undefined): string {
  if (!text) return '';

  const kataHubung = new Set([
    'dan', 'atau', 'serta', 'di', 'ke', 'dari', 'pada', 'dalam', 'atas', 'untuk', 'dengan', 'tanpa', 'yang', 'oleh'
  ]);

  // Pisahkan catatan dalam tanda kurung jika ada (misal: "(sudah tidak bekerja)")
  const matchParen = text.match(/\((.*?)\)/);
  const parenContent = matchParen ? matchParen[0] : null;
  const mainPart = text.replace(/\s*\(.*?\)/, '');

  const formattedMain = mainPart
    .split(/\s+/)
    .map((word, idx) => {
      const trailingPunct = word.match(/[,;:.]$/)?.[0] || '';
      const cleanWord = trailingPunct ? word.slice(0, -1) : word;
      const lower = cleanWord.toLowerCase();

      let resultWord = cleanWord;
      if (idx > 0 && kataHubung.has(lower)) {
        resultWord = lower;
      } else if (cleanWord.length > 0) {
        resultWord = cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1);
      }

      return resultWord + trailingPunct;
    })
    .join(' ');

  return parenContent ? `${formattedMain} ${parenContent}` : formattedMain;
}
