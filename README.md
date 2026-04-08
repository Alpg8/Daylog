# Daylog — Lojistik Operasyon Paneli

Daylog is a production-ready full-stack logistics CRM and operations tracking system built with Next.js 14, TypeScript, PostgreSQL, Prisma, TailwindCSS, and shadcn/ui.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Database | PostgreSQL |
| ORM | Prisma 5 |
| Auth | jose (JWT, httpOnly cookie) |
| UI | TailwindCSS 3 + shadcn/ui (Radix) |
| Forms | react-hook-form + Zod |
| Tables | @tanstack/react-table v8 |
| Excel | SheetJS (xlsx) |
| Toasts | Sonner |
| Dark Mode | next-themes |

## Features

- **Role-based access**: Admin, Dispatcher, Driver
- **Orders (Seferler)**: Full CRUD, Domestic / Import / Export categories, status tracking
- **Vehicles (Araçlar)**: Fleet management with usage/ownership types
- **Trailers (Dorseler)**: Trailer inventory and status
- **Drivers (Sürücüler)**: Driver management with document expiry dates
- **Fuel Records (Yakıt)**: Fuel tracking with automatic distance calculation
- **Notifications (Bildirimler)**: In-app notification system
- **Users (Kullanıcılar)**: Admin-only user management
- **Excel Export**: Every list view supports one-click Excel download
- **Dark/Light Mode**: System-aware theme toggle
- **Mobile API**: Dedicated `/api/driver/*` routes for future mobile app

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Installation

```bash
# 1. Clone the repo
git clone <repo-url>
cd Daylog

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env and set DATABASE_URL to your PostgreSQL connection string
# Example: DATABASE_URL="postgresql://postgres:password@localhost:5432/daylog"

# 4. Also set a strong JWT secret in .env:
# JWT_SECRET="your-super-secret-key-min-32-chars"

# 5. Run database migrations
npx prisma migrate dev --name init

# 6. Seed the database with sample data
npm run db:seed

# 7. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Default Admin Account

| Field | Value |
|---|---|
| E-mail | `admin@example.com` |
| Password | `Admin12345!` |

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio
```

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT signing (min 32 chars) |
| `NEXT_PUBLIC_APP_URL` | Public app URL (optional, for absolute links) |

## Project Structure

```
Daylog/
├── app/
│   ├── (auth)/login/        # Login page
│   ├── (dashboard)/         # Protected dashboard layout + all pages
│   └── api/                 # All API routes
├── components/
│   ├── ui/                  # shadcn/ui base components
│   ├── layout/              # Sidebar, Header, Providers
│   ├── shared/              # DataTable, PageHeader, StatusBadge, ExcelExport...
│   ├── orders/              # Order form + table
│   ├── vehicles/            # Vehicle form + table
│   ├── trailers/            # Trailer form + table
│   ├── drivers/             # Driver form + table
│   ├── fuel/                # Fuel form + table
│   ├── users/               # User form + table
│   └── dashboard/           # Stats cards
├── lib/
│   ├── auth/                # JWT, password hashing, session
│   ├── db/                  # Prisma client singleton
│   ├── services/            # Notification service
│   ├── utils/               # Permissions, Excel helpers, cn()
│   └── validators/          # Zod schemas per resource
├── hooks/
│   └── use-auth.ts          # Client-side auth state
├── types/
│   └── index.ts             # Extended Prisma types + API interfaces
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Seed data (Turkish logistics sample data)
└── middleware.ts             # JWT route protection
```

## Database Models

- **User** — Authentication with role (ADMIN / DISPATCHER / DRIVER)
- **Vehicle** — Fleet vehicles with plate, brand, model, usage/ownership type
- **Trailer** — Trailers with type and status
- **Driver** — Drivers with document expiry dates, assigned vehicle
- **Order** — Shipment orders with 30+ fields, linked to vehicle/trailer/driver/user
- **FuelRecord** — Fuel log per vehicle with KM tracking and cost calculation
- **Notification** — In-app notifications per user

## API Routes

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user |
| GET/POST | `/api/orders` | List / create orders |
| GET/PUT/DELETE | `/api/orders/[id]` | Single order CRUD |
| GET/POST | `/api/vehicles` | List / create vehicles |
| GET/PUT/DELETE | `/api/vehicles/[id]` | Single vehicle CRUD |
| GET/POST | `/api/trailers` | List / create trailers |
| GET/PUT/DELETE | `/api/trailers/[id]` | Single trailer CRUD |
| GET/POST | `/api/drivers` | List / create drivers |
| GET/PUT/DELETE | `/api/drivers/[id]` | Single driver CRUD |
| GET/POST | `/api/fuel` | List / create fuel records |
| GET/PUT/DELETE | `/api/fuel/[id]` | Single fuel record CRUD |
| GET/POST | `/api/notifications` | List / create notifications |
| PATCH | `/api/notifications/[id]/read` | Mark notification as read |
| GET/POST | `/api/users` | List / create users (admin) |
| GET/PUT/DELETE | `/api/users/[id]` | Single user CRUD (admin) |
| GET | `/api/dashboard/stats` | Dashboard statistics |
| GET | `/api/driver/tasks` | Driver tasks (mobile) |
| GET | `/api/driver/notifications` | Driver notifications (mobile) |
| POST | `/api/driver/update-status` | Driver status update (mobile) |

## License

MIT
