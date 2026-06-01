# Comment Scraper Desktop App 🚀

Aplikasi desktop premium berbasis Electron untuk melakukan scraping (pengambilan data) komentar media sosial secara aman dan terorganisir. Aplikasi ini dilengkapi dengan manajemen proyek otomatis dan fitur ekspor data dalam format CSV yang kompatibel dengan Microsoft Excel.

---

## ✨ Fitur Utama
- **Multi-Platform Scraping**: Mendukung berbagai platform media sosial utama.
- **Project Auto-Save**: Daftar proyek dan histori scraping Anda disimpan secara otomatis dan persisten di lokal komputer.
- **Live Progress Monitor**: Memantau progress scraping secara real-time.
- **CSV Data Exporter**: Mengekspor komentar ke dalam file `.csv` dengan dukungan UTF-8 BOM agar tulisan khusus dan emoji terbaca dengan benar di Excel.
- **Portable & Installer**: Dapat didistribusikan dalam bentuk Installer Setup tunggal atau folder portable mandiri.

---

## 📥 Panduan Instalasi untuk Pengguna Biasa (End-User)

Jika Anda hanya ingin langsung memakai aplikasi ini tanpa perlu menyentuh kode program, ikuti langkah mudah berikut:

1. Pergi ke halaman **Releases** di repositori GitHub ini.
2. Unduh file installer terbaru yang berakhiran `.exe` (contoh: `Comment Scraper Setup 1.0.0.exe`).
3. Jalankan file `.exe` yang sudah diunduh.
4. Ikuti panduan pemasangan di layar (Anda bisa memilih lokasi folder instalasi).
5. Setelah instalasi selesai, aplikasi akan terpasang di komputer Anda. Anda bisa langsung menjalankannya melalui **shortcut di Desktop** atau **Start Menu**.

> [!NOTE]
> Aplikasi ini berjalan sepenuhnya secara lokal dan portable, sehingga data scraping Anda aman disimpan langsung di komputer Anda.

---

## 💻 Panduan Setup untuk Pengembang (Developer)

Jika Anda ingin mengembangkan atau menjalankan aplikasi ini dari source code, silakan ikuti alur instalasi berikut.

### Prasyarat
Pastikan komputer Anda sudah terinstal:
- [Node.js](https://nodejs.org/) (versi LTS terbaru / minimal v18.x)
- [Git](https://git-scm.com/)

### Langkah Setup

1. **Kloning Repositori ini:**
   ```bash
   git clone https://github.com/Fatt-dev/Webscaping.Comment.git
   cd Webscaping.Comment
   ```

2. **Instal Dependencies:**
   Jalankan perintah berikut di terminal untuk memasang semua library yang dibutuhkan (termasuk Electron):
   ```bash
   npm install
   ```

3. **Jalankan Aplikasi dalam Mode Pengembangan:**
   Untuk mengetes dan menjalankan aplikasi secara langsung:
   ```bash
   npm start
   ```

---

## 🛠️ Membuat File Installer & Portable Executable

Bagi pengembang yang ingin membuat installer atau portable executable baru untuk dibagikan ke orang lain:

### 1. Membuat Setup Installer (.exe) - *Sangat Direkomendasikan*
Untuk memaketkan aplikasi menjadi file installer tunggal (`dist-installer/Comment Scraper Setup [versi].exe`):
```bash
npm run dist
```
*Installer ini akan secara otomatis membuat shortcut di Desktop dan Start Menu komputer pengguna.*

### 2. Membuat Folder Portable (Tanpa Install)
Jika Anda hanya ingin membuat versi portable (tidak perlu diinstal, cukup jalankan `Comment Scraper.exe` di dalam folder hasil build):
```bash
npm run build
```
Hasil build portable akan terletak di folder `dist/Comment Scraper-win32-x64/`.

---

## 📦 Cara Mempublikasikan Aplikasi di GitHub

Bagi pemilik repositori yang ingin membagikan installer ke pengguna lain via GitHub:
1. Jalankan perintah `npm run dist` untuk memproduksi file installer `.exe`.
2. Buka halaman repositori Anda di GitHub.
3. Di sisi kanan halaman, klik **Releases** -> **Create a new release**.
4. Tentukan nama versi (misal: `v1.0.0`) dan buat judul release.
5. Drag-and-drop file **`Comment Scraper Setup 1.0.0.exe`** (yang ada di dalam folder `dist-installer/`) ke kotak upload aset di bagian bawah halaman release.
6. Klik **Publish release**. Sekarang semua pengguna dapat mengunduh installer tersebut dengan mudah!
