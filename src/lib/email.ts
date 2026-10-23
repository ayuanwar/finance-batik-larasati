import { Resend } from 'resend';

// Inisialisasi Resend SDK dengan penanganan aman jika API key belum diisi
const resendApiKey = process.env.RESEND_API_KEY;
export const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Konfigurasi Alamat Pengirim & URL Aplikasi
export const SENDER_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'CV Batik Larasati <onboarding@resend.dev>';
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Helper: Menyesuaikan penerima email pada mode Sandbox / Akun Demo (.test)
// Resend free tier membatasi pengiriman hanya ke email terdaftar pemilik akun (ayuaanwar0@gmail.com)
function resolveRecipient(email: string): string {
  const testRecipient = process.env.RESEND_TEST_RECIPIENT || 'ayuaanwar0@gmail.com';
  if (!email || email.endsWith('.test') || email.includes('larasati.test')) {
    return testRecipient;
  }
  return email;
}

function resolveDirectorRecipients(directorEmails: string[]): string[] {
  const testRecipient = process.env.RESEND_TEST_RECIPIENT || 'ayuaanwar0@gmail.com';
  const valid = directorEmails.filter(
    (e) => Boolean(e) && !e.endsWith('.test') && !e.includes('larasati.test')
  );
  if (valid.length > 0) return valid;
  return [testRecipient];
}

interface BaseEmailPengajuanData {
  nomor: string;
  jenis: 'reimburse' | 'pengeluaran';
  jumlah: number;
  keterangan: string;
  docId: number;
}

// Template Wrapper Email Resmi CV Batik Larasati
function renderEmailWrapper({
  title,
  badgeText,
  badgeBg,
  badgeColor,
  contentHtml,
  ctaText,
  ctaUrl,
}: {
  title: string;
  badgeText: string;
  badgeBg: string;
  badgeColor: string;
  contentHtml: string;
  ctaText: string;
  ctaUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f2f5f3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f2f5f3; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Container Kartu Email -->
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          
          <!-- Header Keraton Surakarta -->
          <tr>
            <td style="background-color: #071c15; padding: 25px 30px; text-align: center; border-bottom: 2px solid #d4af37;">
              <h1 style="margin: 0; color: #d4af37; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">CV BATIK LARASATI</h1>
              <p style="margin: 4px 0 0; color: #fdfbf7; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.85;">
                Sistem Keuangan & Akuntansi Keraton Surakarta
              </p>
            </td>
          </tr>

          <!-- Isi Pesan -->
          <tr>
            <td style="padding: 30px 30px 20px;">
              <!-- Lencana Status -->
              <div style="margin-bottom: 20px;">
                <span style="display: inline-block; padding: 6px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; background-color: ${badgeBg}; color: ${badgeColor};">
                  ${badgeText}
                </span>
              </div>

              <!-- Judul Utama -->
              <h2 style="margin: 0 0 16px; color: #071c15; font-size: 18px; font-weight: 700;">
                ${title}
              </h2>

              <!-- Konten Dinamis -->
              ${contentHtml}

              <!-- Tombol Aksi CTA -->
              <div style="margin: 28px 0 10px; text-align: center;">
                <a href="${ctaUrl}" target="_blank" style="display: inline-block; background-color: #d4af37; color: #071c15; font-size: 13px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 6px; letter-spacing: 0.5px;">
                  ${ctaText}
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer Resmi -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; line-height: 1.5;">
              <p style="margin: 0 0 4px; font-weight: 600; color: #071c15;">CV Batik Larasati · Surakarta</p>
              <p style="margin: 0;">Email ini dikirimkan secara otomatis oleh sistem internal pembukuan kas. Mohon tidak membalas langsung ke alamat ini.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// ==============================================================================
// 1. NOTIFIKASI KE PENGAJU: PERLU REVISI
// ==============================================================================
export async function kirimEmailPengajuanRevisi({
  toEmail,
  namaPengaju,
  nomor,
  jenis,
  jumlah,
  keterangan,
  catatanPeninjau,
  peninjauNama,
  peninjauPeran,
  docId,
}: BaseEmailPengajuanData & {
  toEmail: string;
  namaPengaju: string;
  catatanPeninjau: string;
  peninjauNama: string;
  peninjauPeran: string;
}) {
  if (!resend) {
    console.warn('[Resend Email] RESEND_API_KEY belum dikonfigurasi. Notifikasi email dilewati.');
    return { success: false, error: 'RESEND_API_KEY belum dikonfigurasi.' };
  }

  const targetEmail = resolveRecipient(toEmail);

  const contentHtml = `
    <p style="margin: 0 0 14px; font-size: 14px; line-height: 1.6; color: #334155;">
      Halo <strong>${namaPengaju}</strong>, pengajuan biaya Anda memerlukan tindakan perbaikan dari Anda sebelum dapat disetujui.
    </p>

    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 16px; margin: 16px 0; border-radius: 4px;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #b45309; margin-bottom: 4px;">
        Catatan Peninjau (${peninjauNama} - ${peninjauPeran.toUpperCase()}):
      </div>
      <div style="font-size: 13px; color: #78350f; line-height: 1.5;">
        ${catatanPeninjau}
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px;">
      <tr>
        <td style="padding: 8px 0; color: #64748b; width: 140px;">Nomor Pengajuan</td>
        <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">#${nomor}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b;">Pengaju Asli</td>
        <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${namaPengaju} (${toEmail})</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b;">Jenis Biaya</td>
        <td style="padding: 8px 0; font-weight: 600; color: #0f172a; text-transform: capitalize;">${jenis}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b;">Nominal</td>
        <td style="padding: 8px 0; font-weight: 700; color: #0f172a;">${formatRupiah(jumlah)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b;">Keperluan</td>
        <td style="padding: 8px 0; color: #334155;">${keterangan}</td>
      </tr>
    </table>
  `;

  const html = renderEmailWrapper({
    title: `Pengajuan #${nomor} Memerlukan Revisi`,
    badgeText: 'Perlu Revisi',
    badgeBg: '#fef3c7',
    badgeColor: '#b45309',
    contentHtml,
    ctaText: 'Buka & Perbaiki Pengajuan',
    ctaUrl: `${APP_URL}/pengajuan/${docId}/ubah`,
  });

  try {
    const res = await resend.emails.send({
      from: SENDER_EMAIL,
      to: targetEmail,
      subject: `[Perlu Revisi] Pengajuan #${nomor} - CV Batik Larasati`,
      html,
    });
    console.log(`[Resend Success - Revisi] Email terkirim ke ${targetEmail} (ID: ${res.data?.id})`);
    return { success: true, data: res };
  } catch (err: unknown) {
    console.error('[Resend Error - Revisi]:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Gagal mengirim email.' };
  }
}

// ==============================================================================
// 2. NOTIFIKASI KE PENGAJU: DITOLAK
// ==============================================================================
export async function kirimEmailPengajuanDitolak({
  toEmail,
  namaPengaju,
  nomor,
  jenis,
  jumlah,
  keterangan,
  catatanPeninjau,
  peninjauNama,
  peninjauPeran,
  docId,
}: BaseEmailPengajuanData & {
  toEmail: string;
  namaPengaju: string;
  catatanPeninjau: string;
  peninjauNama: string;
  peninjauPeran: string;
}) {
  if (!resend) {
    console.warn('[Resend Email] RESEND_API_KEY belum dikonfigurasi. Notifikasi email dilewati.');
    return { success: false, error: 'RESEND_API_KEY belum dikonfigurasi.' };
  }

  const targetEmail = resolveRecipient(toEmail);

  const contentHtml = `
    <p style="margin: 0 0 14px; font-size: 14px; line-height: 1.6; color: #334155;">
      Halo <strong>${namaPengaju}</strong>, mohon maaf pengajuan biaya Anda telah ditolak setelah melalui proses verifikasi.
    </p>

    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 16px; margin: 16px 0; border-radius: 4px;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #b91c1c; margin-bottom: 4px;">
        Alasan Penolakan (${peninjauNama} - ${peninjauPeran.toUpperCase()}):
      </div>
      <div style="font-size: 13px; color: #991b1b; line-height: 1.5;">
        ${catatanPeninjau}
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px;">
      <tr>
        <td style="padding: 8px 0; color: #64748b; width: 140px;">Nomor Pengajuan</td>
        <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">#${nomor}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b;">Pengaju Asli</td>
        <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${namaPengaju} (${toEmail})</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b;">Jenis Biaya</td>
        <td style="padding: 8px 0; font-weight: 600; color: #0f172a; text-transform: capitalize;">${jenis}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b;">Nominal</td>
        <td style="padding: 8px 0; font-weight: 700; color: #0f172a;">${formatRupiah(jumlah)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b;">Keperluan</td>
        <td style="padding: 8px 0; color: #334155;">${keterangan}</td>
      </tr>
    </table>
  `;

  const html = renderEmailWrapper({
    title: `Pengajuan #${nomor} Ditolak`,
    badgeText: 'Ditolak',
    badgeBg: '#fee2e2',
    badgeColor: '#b91c1c',
    contentHtml,
    ctaText: 'Lihat Rincian Pengajuan',
    ctaUrl: `${APP_URL}/pengajuan/${docId}`,
  });

  try {
    const res = await resend.emails.send({
      from: SENDER_EMAIL,
      to: targetEmail,
      subject: `[Ditolak] Pengajuan #${nomor} - CV Batik Larasati`,
      html,
    });
    console.log(`[Resend Success - Tolak] Email terkirim ke ${targetEmail} (ID: ${res.data?.id})`);
    return { success: true, data: res };
  } catch (err: unknown) {
    console.error('[Resend Error - Tolak]:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Gagal mengirim email.' };
  }
}

// ==============================================================================
// 3. NOTIFIKASI KE PENGAJU: DIBAYAR (DICAIRKAN)
// ==============================================================================
export async function kirimEmailPengajuanDibayar({
  toEmail,
  namaPengaju,
  nomor,
  jenis,
  jumlah,
  keterangan,
  namaAkunKas,
  tanggalBayar,
  nomorJurnal,
  docId,
}: BaseEmailPengajuanData & {
  toEmail: string;
  namaPengaju: string;
  namaAkunKas: string;
  tanggalBayar: string;
  nomorJurnal?: string;
}) {
  if (!resend) {
    console.warn('[Resend Email] RESEND_API_KEY belum dikonfigurasi. Notifikasi email dilewati.');
    return { success: false, error: 'RESEND_API_KEY belum dikonfigurasi.' };
  }

  const targetEmail = resolveRecipient(toEmail);

  const contentHtml = `
    <p style="margin: 0 0 14px; font-size: 14px; line-height: 1.6; color: #334155;">
      Kabar baik! Dana untuk pengajuan biaya <strong>#${nomor}</strong> telah selesai dicairkan oleh bagian Akuntansi.
    </p>

    <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 14px 16px; margin: 16px 0; border-radius: 4px;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #047857; margin-bottom: 4px;">
        Informasi Pembayaran Kas / Bank:
      </div>
      <div style="font-size: 15px; font-weight: 700; color: #065f46;">
        ${formatRupiah(jumlah)}
      </div>
      <div style="font-size: 12px; color: #047857; margin-top: 4px;">
        Sumber: ${namaAkunKas} · Tanggal: ${tanggalBayar}
        ${nomorJurnal ? `· Jurnal: #${nomorJurnal}` : ''}
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px;">
      <tr>
        <td style="padding: 8px 0; color: #64748b; width: 140px;">Nomor Pengajuan</td>
        <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">#${nomor}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b;">Pengaju</td>
        <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${namaPengaju} (${toEmail})</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b;">Jenis Biaya</td>
        <td style="padding: 8px 0; font-weight: 600; color: #0f172a; text-transform: capitalize;">${jenis}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b;">Keperluan</td>
        <td style="padding: 8px 0; color: #334155;">${keterangan}</td>
      </tr>
    </table>
  `;

  const html = renderEmailWrapper({
    title: `Pembayaran Selesai: Pengajuan #${nomor}`,
    badgeText: 'Telah Dibayar',
    badgeBg: '#d1fae5',
    badgeColor: '#047857',
    contentHtml,
    ctaText: 'Lihat Bukti & Detail Pembayaran',
    ctaUrl: `${APP_URL}/pengajuan/${docId}`,
  });

  try {
    const res = await resend.emails.send({
      from: SENDER_EMAIL,
      to: targetEmail,
      subject: `[Telah Dibayar] Pengajuan #${nomor} Telah Dicairkan - CV Batik Larasati`,
      html,
    });
    console.log(`[Resend Success - Dibayar] Email terkirim ke ${targetEmail} (ID: ${res.data?.id})`);
    return { success: true, data: res };
  } catch (err: unknown) {
    console.error('[Resend Error - Dibayar]:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Gagal mengirim email.' };
  }
}

// ==============================================================================
// 4. NOTIFIKASI KE DIREKTUR: PENGAJUAN MENUNGGU PERSETUJUAN
// ==============================================================================
export async function kirimEmailMenungguDirektur({
  directorEmails,
  nomor,
  jenis,
  jumlah,
  keterangan,
  namaPengaju,
  docId,
}: BaseEmailPengajuanData & {
  directorEmails: string[];
  namaPengaju: string;
}) {
  if (!resend) {
    console.warn('[Resend Email] RESEND_API_KEY belum dikonfigurasi. Notifikasi email dilewati.');
    return { success: false, error: 'RESEND_API_KEY belum dikonfigurasi.' };
  }

  const targets = resolveDirectorRecipients(directorEmails);

  const contentHtml = `
    <p style="margin: 0 0 14px; font-size: 14px; line-height: 1.6; color: #334155;">
      Yth. <strong>Ibu Direktur</strong>, terdapat pengajuan pengeluaran kas yang memerlukan persetujuan dan tanda tangan digital Anda untuk pencairan dana.
    </p>

    <div style="background-color: #fefce8; border-left: 4px solid #ca8a04; padding: 14px 16px; margin: 16px 0; border-radius: 4px;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #854d0e; margin-bottom: 4px;">
        Jumlah Yang Diajukan:
      </div>
      <div style="font-size: 18px; font-weight: 700; color: #713f12;">
        ${formatRupiah(jumlah)}
      </div>
      <div style="font-size: 12px; color: #854d0e; margin-top: 4px;">
        Diajukan oleh: <strong>${namaPengaju}</strong>
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px;">
      <tr>
        <td style="padding: 8px 0; color: #64748b; width: 140px;">Nomor Dokumen</td>
        <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">#${nomor}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b;">Kategori</td>
        <td style="padding: 8px 0; font-weight: 600; color: #0f172a; text-transform: capitalize;">${jenis}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b;">Keperluan / Uraian</td>
        <td style="padding: 8px 0; color: #334155;">${keterangan}</td>
      </tr>
    </table>
  `;

  const html = renderEmailWrapper({
    title: `Pengajuan #${nomor} Menunggu Persetujuan Direktur`,
    badgeText: 'Menunggu Persetujuan',
    badgeBg: '#fef9c3',
    badgeColor: '#854d0e',
    contentHtml,
    ctaText: 'Tinjau & Setujui Pengajuan',
    ctaUrl: `${APP_URL}/pengajuan/${docId}`,
  });

  try {
    const res = await resend.emails.send({
      from: SENDER_EMAIL,
      to: targets,
      subject: `[Persetujuan Diperlukan] Pengajuan #${nomor} (${formatRupiah(jumlah)}) - CV Batik Larasati`,
      html,
    });
    console.log(`[Resend Success - Direktur] Email terkirim ke ${targets.join(', ')} (ID: ${res.data?.id})`);
    return { success: true, data: res };
  } catch (err: unknown) {
    console.error('[Resend Error - Menunggu Direktur]:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Gagal mengirim email.' };
  }
}
