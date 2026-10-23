# Konfigurasi & Daftar MCP (Model Context Protocol) di Antigravity

Seluruh konfigurasi dan skema MCP bawaan Antigravity telah berhasil disalin ke dalam workspace proyek Anda di folder [`.agents/mcp/`](file:///d:/BOOTCAMP/finance-batik-larasati/.agents/mcp) dan file konfigurasi [`mcp_config.json`](file:///d:/BOOTCAMP/finance-batik-larasati/mcp_config.json).

---

## 1. Daftar MCP Server Bawaan Antigravity

Antigravity IDE memiliki 3 MCP Server utama:

### 1. Supabase MCP Server (`supabase`)
- **Lokasi Skema Tool**: [`.agents/mcp/supabase/`](file:///d:/BOOTCAMP/finance-batik-larasati/.agents/mcp/supabase)
- **Total Tools**: 30 Tools
- **Daftar Fitur**:
  - `execute_sql`: Menjalankan query SQL langsung ke database Supabase
  - `list_tables`: Memeriksa skema tabel
  - `list_migrations` & `apply_migration`: Mengelola migrasi skema
  - `create_branch`, `list_branches`, `merge_branch`, `rebase_branch`: Supabase branching
  - `list_edge_functions`, `deploy_edge_function`: Mengelola Edge Functions
  - `query_logs`: Memeriksa log server/query
  - `get_advisors`: Analisis performa & keamanan Supabase

### 2. Firebase MCP Server (`firebase-mcp-server`)
- **Lokasi Skema Tool**: [`.agents/mcp/firebase-mcp-server/`](file:///d:/BOOTCAMP/finance-batik-larasati/.agents/mcp/firebase-mcp-server)
- **Total Tools**: 53 Tools
- **Daftar Fitur**:
  - Firestore (`firestore_get_document`, `firestore_add_document`, `firestore_query_collection`, dll)
  - Auth (`auth_get_users`, `auth_update_user`)
  - Realtime Database (`realtimedatabase_get_data`, `realtimedatabase_set_data`)
  - Storage (`storage_get_object_download_url`)
  - Deploy & Project (`firebase_deploy`, `firebase_list_projects`, dll)

### 3. Netlify MCP Server (`netlify`)
- **Lokasi Skema Tool**: [`.agents/mcp/netlify/`](file:///d:/BOOTCAMP/finance-batik-larasati/.agents/mcp/netlify)
- **Total Tools**: 10 Tools
- **Daftar Fitur**:
  - `netlify-deploy-services-reader` / `updater`: Memeriksa & memicu deploy
  - `netlify-project-services-reader` / `updater`: Mengelola proyek
  - `netlify-observability-services-reader`: Monitoring & log Netlify
  - `netlify-team-services-reader`: Mengelola tim & akses

---

## 2. Format JSON Konfigurasi MCP (Tinggal Salin)

File konfigurasi ini dapat Anda gunakan di berbagai platform MCP client (Antigravity, Claude Desktop, Cursor, VS Code Cline / Roo Code):

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "KUNCI_AKSES_SUPABASE_ANDA"
      }
    },
    "firebase": {
      "command": "npx",
      "args": [
        "-y",
        "firebase-tools",
        "mcp"
      ]
    },
    "netlify": {
      "command": "npx",
      "args": [
        "-y",
        "@netlify/mcp"
      ],
      "env": {
        "NETLIFY_AUTH_TOKEN": "KUNCI_AUTH_NETLIFY_ANDA"
      }
    }
  }
}
```

---

## 3. Lokasi Penyimpanan di Proyek Anda:
1. **[`.agents/mcp_config.json`](file:///d:/BOOTCAMP/finance-batik-larasati/.agents/mcp_config.json)**: Standar konfigurasi kustomisasi Antigravity untuk workspace ini.
2. **[`mcp_config.json`](file:///d:/BOOTCAMP/finance-batik-larasati/mcp_config.json)**: File konfigurasi di root direktori untuk kemudahan export/copy.
3. **[`.agents/mcp/`](file:///d:/BOOTCAMP/finance-batik-larasati/.agents/mcp)**: Folder salinan lengkap seluruh skema JSON dan instruksi tool bawaan.
