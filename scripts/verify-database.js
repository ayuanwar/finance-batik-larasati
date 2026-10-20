const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gapnbivzqtekuxnawwte.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhcG5iaXZ6cXRla3V4bmF3d3RlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjQ3NTM5OCwiZXhwIjoyMTA4MDUxMzk4fQ.9xLaukGZllvT13hghSrEMthNwhxhcDd6l7OnVaqF2g0';

const supabase = createClient(supabaseUrl, supabaseKey);

const tables = [
  'profiles',
  'akun',
  'periode',
  'penomoran',
  'pengajuan',
  'jurnal',
  'jurnal_baris',
  'audit_log',
  'mutasi_bank'
];

async function checkTables() {
  console.log('--- Verifikasi Tabel Supabase ---');
  let allExist = true;

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`❌ Tabel '${table}': BELUM DIBUAT (${error.message})`);
      allExist = false;
    } else {
      console.log(`✅ Tabel '${table}': DITEMUKAN & TERHUBUNG`);
    }
  }

  if (allExist) {
    console.log('\n🎉 Semua 9 tabel dan skema berhasil terverifikasi di Supabase!');
  } else {
    console.log('\n⚠️ Beberapa atau seluruh tabel belum terbentuk.');
  }
}

checkTables();
