# SecureTask Portal

SecureTask Portal adalah aplikasi internal untuk mengelola tugas karyawan dengan autentikasi JWT, pembagian role admin/employee, serta antarmuka dashboard yang responsif.

## Fitur Utama

- Login menggunakan email dan password.
- Autentikasi berbasis JWT.
- Role-based access control:
  - **Admin** dapat melihat semua task, mengelola user, mengedit task, dan menghapus task.
  - **Employee** hanya dapat melihat serta mengedit task miliknya sendiri.
- Dashboard ringkasan:
  - Total task.
  - Tanggal saat ini.
  - Jam real-time.
  - Jumlah people/user untuk admin.
- Halaman khusus `/tasks` untuk:
  - Melihat task.
  - Filter berdasarkan status.
  - Membuat task.
  - Mengedit task melalui menu tiga titik.
  - Mengubah status task.
  - Menghapus task sesuai hak akses.
- Halaman `/admin/users` untuk admin:
  - Melihat semua user.
  - Membuat akun employee baru.
- UI menggunakan sidebar, kartu ringkasan, tabel task, modal form, dan layout responsif.

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Router |
| HTTP Client | Axios |
| Backend | Node.js, Express 5 |
| Database | PostgreSQL |
| Authentication | JSON Web Token (JWT) |
| Password Security | bcrypt |
| Security | Helmet, CORS, express-rate-limit, XSS sanitization |

## Struktur Project

```text
secure-task-portal/
├── secure-task-portal-backend/
│   ├── index.js
│   └── src/
│       ├── config/
│       │   ├── db.js
│       │   └── migrate.js
│       ├── controllers/
│       │   ├── adminController.js
│       │   ├── authController.js
│       │   └── taskController.js
│       ├── middlewares/
│       │   ├── authMiddleware.js
│       │   ├── errorHandler.js
│       │   └── rateLimiter.js
│       ├── repositories/
│       │   ├── taskRepository.js
│       │   └── userRepository.js
│       ├── routes/
│       │   ├── adminRoutes.js
│       │   ├── authRoutes.js
│       │   └── taskRoutes.js
│       ├── services/
│       │   ├── adminService.js
│       │   ├── authService.js
│       │   └── taskService.js
│       └── utils/
│           └── seed.js
├── secure-task-portal-frontend/
│   └── src/
│       ├── components/
│       │   ├── Navbar.tsx
│       │   └── ProtectedRoute.tsx
│       ├── context/
│       │   └── AuthContext.tsx
│       ├── pages/
│       │   ├── AdminUsersPage.tsx
│       │   ├── DashboardPage.tsx
│       │   └── LoginPage.tsx
│       ├── services/
│       │   └── api.ts
│       └── utils/
│           └── types.ts
└── README.md
```

## Prasyarat

- Node.js 18 atau lebih baru.
- npm.
- PostgreSQL lokal atau managed database seperti Neon/Supabase.

## Instalasi

### 1. Install dependency backend

```bash
cd secure-task-portal-backend
npm install
```

### 2. Install dependency frontend

```bash
cd ../secure-task-portal-frontend
npm install
```

## Konfigurasi Environment

### Backend

Buat file `secure-task-portal-backend/.env` berdasarkan `.env.example`:

```env
PORT=5000
NODE_ENV=development

DB_USER=postgres
DB_HOST=localhost
DB_NAME=secure_task_db
DB_PASSWORD=your_database_password
DB_PORT=5432
DB_SSL=false

JWT_SECRET=buat_secret_random_yang_panjang
JWT_EXPIRES_IN=8h

FRONTEND_URL=http://localhost:5173
```

Alternatif untuk database cloud, backend juga mendukung:

```env
DATABASE_URL=postgresql://user:password@host/database
```

Jangan commit file `.env` atau kredensial production ke repository.

### Frontend

Buat file `secure-task-portal-frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
```

`VITE_API_URL` harus mengarah ke base URL backend, tanpa tambahan `/api`.

## Database dan Seed Data

Buat database PostgreSQL terlebih dahulu:

```bash
createdb secure_task_db
```

Migrasi tabel akan dijalankan otomatis saat backend mulai. Untuk mengisi akun dan task contoh:

```bash
cd secure-task-portal-backend
npm run seed
```

Seed hanya dijalankan jika akun admin belum tersedia.

## Menjalankan Aplikasi

Jalankan backend dari terminal pertama:

```bash
cd secure-task-portal-backend
npm run dev
```

Jalankan frontend dari terminal kedua:

```bash
cd secure-task-portal-frontend
npm run dev
```

URL default:

- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- Health check: http://localhost:5000/

## Akun Demo

| Role | Email | Password |
|---|---|---|
| Admin | `admin@securetask.com` | `Admin@12345` |
| Employee | `employee@securetask.com` | `Employee@12345` |

Ganti atau hapus akun demo sebelum aplikasi digunakan di production.

## Halaman Frontend

| Route | Akses | Keterangan |
|---|---|---|
| `/login` | Publik | Form login email dan password |
| `/dashboard` | Authenticated | Ringkasan task, tanggal, jam, dan people |
| `/tasks` | Authenticated | CRUD task dan filter status |
| `/admin/users` | Admin | Daftar user dan pembuatan employee |

## API Endpoints

Semua endpoint yang membutuhkan autentikasi menerima header:

```http
Authorization: Bearer <jwt-token>
```

### Authentication

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/api/auth/login` | Publik | Login dan mendapatkan JWT |
| GET | `/api/auth/profile` | Authenticated | Mendapatkan profil user aktif |

Contoh body login:

```json
{
  "email": "employee@securetask.com",
  "password": "Employee@12345"
}
```

### Tasks

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/tasks` | Admin/Employee | Admin melihat semua task, employee melihat task sendiri |
| POST | `/api/tasks` | Admin/Employee | Membuat task untuk user yang sedang login |
| PATCH | `/api/tasks/:id` | Admin/Owner | Mengedit judul dan deskripsi task |
| PATCH | `/api/tasks/:id/status` | Admin/Owner | Mengubah status task |
| DELETE | `/api/tasks/:id` | Admin | Menghapus task |

Status task yang valid:

```text
todo
in_progress
done
```

Contoh body edit task:

```json
{
  "title": "Update project documentation",
  "description": "Review and update the technical documentation."
}
```

### Admin

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/admin/users` | Admin | Melihat semua user |
| POST | `/api/admin/users` | Admin | Membuat akun employee |

## Keamanan

- Password disimpan menggunakan bcrypt.
- JWT diverifikasi pada middleware protected route.
- Endpoint login dilindungi rate limiter untuk mengurangi brute-force.
- Endpoint API memiliki rate limiter umum.
- Query PostgreSQL menggunakan parameterized query.
- Input judul dan deskripsi task disanitasi menggunakan `xss`.
- Helmet digunakan untuk secure HTTP headers.
- CORS hanya menerima origin yang dikonfigurasi.
- Akses endpoint admin dibatasi dengan middleware role authorization.
- Payload JSON dibatasi agar request tidak berukuran berlebihan.

## Perintah Validasi

Frontend:

```bash
cd secure-task-portal-frontend
npm run build
npm run lint
```

Backend:

```bash
cd secure-task-portal-backend
npm start
```

Backend belum memiliki test script otomatis. Validasi sintaks file JavaScript dapat dilakukan dengan:

```bash
node --check index.js
node --check src/controllers/taskController.js
node --check src/services/taskService.js
node --check src/repositories/taskRepository.js
node --check src/routes/taskRoutes.js
```

## Deployment

### Frontend

Frontend dapat di-deploy ke Vercel atau platform static hosting lain.

Set environment variable:

```env
VITE_API_URL=https://your-backend-domain.example.com
```

### Backend

Backend dapat di-deploy ke Render, Railway, atau platform Node.js lain.

Set environment variable database, JWT, port, dan `FRONTEND_URL` sesuai environment deployment. Pastikan origin frontend production ditambahkan ke konfigurasi CORS backend.

### Database

PostgreSQL managed seperti Neon atau Supabase dapat digunakan dengan `DATABASE_URL`, atau dengan konfigurasi `DB_USER`, `DB_HOST`, `DB_NAME`, `DB_PASSWORD`, dan `DB_PORT`.

## Catatan Pengembangan

- Jangan menaruh secret, password database, atau JWT secret di source code.
- Gunakan HTTPS untuk deployment production.
- Ganti kredensial demo sebelum aplikasi dipublikasikan.
- Jalankan `npm run build` dan `npm run lint` sebelum membuat release.
