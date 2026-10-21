const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Baca environment variable
const envPath = path.resolve(__dirname, '../.env.local');
if (!fs.existsSync(envPath)) {
  console.error('File .env.local tidak ditemukan');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let key = match[1];
    let val = match[2] || '';
    val = val.trim().replace(/^['"]|['"]$/g, '');
    env[key] = val;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function syncAuditLogSequence() {
  console.log('--- Memeriksa dan Menyelaraskan Sequence audit_log ---');
  const { data: maxRows } = await supabase
    .from('audit_log')
    .select('id')
    .order('id', { ascending: false })
    .limit(1);

  const maxId = maxRows && maxRows.length > 0 ? maxRows[0].id : 0;
  console.log(`Max ID saat ini di tabel audit_log: ${maxId}`);

  let success = false;
  let attempts = 0;
  while (!success && attempts < 250) {
    attempts++;
    const { data, error } = await supabase.from('audit_log').insert({
      aksi: 'SINKRONISASI_SEQUENCE',
      nama_tabel: 'audit_log',
      id_data: 'SYSTEM'
    }).select();

    if (error) {
      if (error.code === '23505') {
        process.stdout.write(`.` );
      } else {
        console.error('\nError saat sinkronisasi:', error);
        break;
      }
    } else {
      console.log(`\n✅ Sequence audit_log berhasil sinkron! ID berikutnya kini berada di atas ${maxId} (record uji: ID ${data[0].id})`);
      success = true;
    }
  }
}

async function main() {
  await syncAuditLogSequence();
  console.log('\nSinkronisasi selesai.');
}

main().catch(console.error);
