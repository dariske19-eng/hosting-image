# Image Hosting – Siap Deploy ke Vercel

Layanan hosting gambar dengan **API Key** yang bisa dipakai dari website eksternal.  
Gambar disimpan di **Vercel Blob** (persistent & CDN).

---

## Cara Deploy ke Vercel

### 1. Siapkan Project

```bash
# Clone / download folder ini
cd image-hosting-vercel

# Install dependency (opsional, Vercel akan install otomatis)
npm install
```

### 2. Deploy

**Cara termudah:**

1. Push folder ini ke GitHub
2. Buka [vercel.com](https://vercel.com) → **Add New Project**
3. Import repository tersebut
4. Deploy

**Atau via CLI:**

```bash
npm i -g vercel
vercel login
vercel          # preview
vercel --prod   # production
```

### 3. Setup Environment Variables (WAJIB)

Masuk ke **Vercel Dashboard** → Project → **Settings** → **Environment Variables**

| Name | Value | Keterangan |
|------|-------|------------|
| `BLOB_READ_WRITE_TOKEN` | `vercel_blob_rw_...` | Dari Vercel Blob Store |
| `API_KEYS` | `key1,key2,key3` | Daftar API Key (pisahkan koma) |

#### Cara dapatkan `BLOB_READ_WRITE_TOKEN`:

1. Di Vercel Dashboard → **Storage** → **Create Database** → pilih **Blob**
2. Setelah dibuat, klik store tersebut → tab **`.env.local`**
3. Copy nilai `BLOB_READ_WRITE_TOKEN`
4. Paste ke Environment Variables project

Setelah menambah env var, **Redeploy** project.

---

## Cara Pakai API

### Endpoint

```
POST https://YOUR-PROJECT.vercel.app/api/upload
```

### Header

```
X-API-Key: YOUR_API_KEY
```

atau

```
Authorization: Bearer YOUR_API_KEY
```

### Body

`multipart/form-data` dengan field `file` atau `image`

### Contoh cURL

```bash
curl -X POST https://YOUR-PROJECT.vercel.app/api/upload \
  -H "X-API-Key: key1" \
  -F "file=@foto.jpg"
```

### Contoh JavaScript

```js
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const res = await fetch('https://YOUR-PROJECT.vercel.app/api/upload', {
  method: 'POST',
  headers: {
    'X-API-Key': 'key1'
  },
  body: formData
});

const data = await res.json();
console.log(data.url); // URL gambar siap pakai
```

### Response Sukses

```json
{
  "success": true,
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "url": "https://xxxx.public.blob.vercel-storage.com/images/550e....jpg",
  "size": 245760,
  "contentType": "image/jpeg",
  "filename": "foto.jpg"
}
```

---

## Mode Demo

Jika `API_KEYS` belum di-set, server menerima key:

```
demo-key-change-me
```

**Ganti segera** setelah deploy production.

---

## Struktur File

```
image-hosting-vercel/
├── api/
│   ├── upload.js     ← Endpoint upload utama
│   └── keys.js       ← Info status API Key
├── public/
│   └── index.html    ← Web UI
├── package.json
├── vercel.json
└── README.md
```

---

## Limit & Catatan

- Max ukuran file: **10 MB**
- Format: JPEG, PNG, GIF, WebP, SVG, BMP
- Vercel Blob Free Tier: cukup untuk testing & traffic ringan
- CORS sudah diaktifkan (`*`)
- Gambar bersifat **public** (siapa saja bisa akses URL-nya)

---

## Troubleshooting

| Error | Solusi |
|-------|--------|
| `BLOB_READ_WRITE_TOKEN not configured` | Buat Blob Store & tambahkan env var, lalu redeploy |
| `Invalid or missing API Key` | Pastikan header `X-API-Key` benar & key ada di `API_KEYS` |
| Upload gagal di local | Jalankan `vercel dev` (bukan `node` biasa) |

---

Selamat deploy! 🚀
