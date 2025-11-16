# Travunited - Premium Travel Website

A modern, premium travel website for visa services and tour packages, built with Next.js, TypeScript, and Tailwind CSS.

## Features

- 🎨 Premium, modern UI with glassmorphism effects
- 📱 Fully responsive design
- 🎯 Conversion-focused user experience
- 🛂 Visa application flow (6 steps)
- ✈️ Tour booking flow (5 steps)
- 📊 Customer dashboard
- 💳 Payment integration ready (Razorpay)
- 📄 Document upload system
- 🗄️ PostgreSQL database with Prisma
- 📦 MinIO for file storage

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Storage**: MinIO (S3-compatible)
- **Payment**: Razorpay (ready for integration)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Docker Desktop (for local database and storage)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file in the root directory:
   ```env
   DATABASE_URL=postgresql://travunited:localpassword@localhost:5433/travunited_db?schema=public
   MINIO_ENDPOINT=http://localhost:9000
   MINIO_ACCESS_KEY=minioadmin
   MINIO_SECRET_KEY=miniolocalpassword
   MINIO_BUCKET=visa-documents

   NEXTAUTH_SECRET=your-secret-key
   NEXTAUTH_URL=http://localhost:3000

   RAZORPAY_KEY_ID=rzp_test_key
   RAZORPAY_KEY_SECRET=rzp_test_secret
   RAZORPAY_WEBHOOK_SECRET=whsec_test_secret
   NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_key

   RESEND_API_KEY=your-resend-api-key
   EMAIL_FROM="Travunited <noreply@travunited.com>"
   ```

3. **Start Docker services:**
   ```bash
   docker compose up -d
   ```

4. **Set up the database:**
   ```bash
   npx prisma migrate dev
   ```

5. **Set up MinIO bucket:**
   - Open http://localhost:9001
   - Login with `minioadmin` / `miniolocalpassword`
   - Create a bucket named `visa-documents`

6. **Run the development server:**
   ```bash
   npm run dev
   ```

7. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   ├── apply/             # Visa application flow
│   ├── book/              # Tour booking flow
│   ├── dashboard/         # Customer dashboard
│   ├── help/              # Help & support
│   ├── login/             # Login page
│   ├── signup/            # Signup page
│   ├── tours/             # Tour pages
│   ├── visas/             # Visa pages
│   └── page.tsx           # Homepage
├── components/            # React components
│   ├── home/              # Homepage components
│   ├── layout/            # Layout components
│   └── ui/                # UI components
└── lib/                   # Utility functions
    ├── prisma.ts          # Prisma client
    └── minio.ts           # MinIO/S3 client
```

## Key Pages

- **Homepage** (`/`) - Hero section, popular destinations, featured tours
- **Visas** (`/visas`) - Browse visa options by country
- **Visa Detail** (`/visas/[country]/[type]`) - Detailed visa information
- **Tours** (`/tours`) - Browse tour packages
- **Tour Detail** (`/tours/[id]`) - Detailed tour information
- **Visa Application** (`/apply/visa/[country]/[type]`) - 6-step application flow
- **Tour Booking** (`/book/tour/[id]`) - 5-step booking flow
- **Dashboard** (`/dashboard`) - Customer portal
- **Help** (`/help`) - FAQ and support

## Design System

### Colors
- **Primary**: Blue (#1677ff) - Trust and professionalism
- **Accent**: Orange (#ff8c00) - CTAs and highlights
- **Neutral**: Gray scale for backgrounds and text

### Typography
- **Font**: Inter (Google Fonts)
- **Headings**: Bold, large sizes
- **Body**: Regular weight, readable sizes

### Components
- Glassmorphism effects for hero sections
- Rounded corners (rounded-lg, rounded-2xl)
- Soft shadows for depth
- Smooth animations and transitions

## Development

### Database Migrations
```bash
npx prisma migrate dev
```

### View Database
```bash
npx prisma studio
```

### Build for Production
```bash
npm run build
npm start
```

### Quality Checks
```bash
npm run check   # Runs linting + TypeScript type checks
```

## Docker Services

- **PostgreSQL**: `localhost:5433`
- **MinIO Console**: `http://localhost:9001`
- **MinIO API**: `http://localhost:9000`

## Next Steps

1. Connect production-grade email/SMS providers (beyond Resend)
2. Expand analytics & tracking dashboards
3. Add localized content & multilingual support
4. Implement loyalty / referral programs
5. Harden infra with CDN, WAF, and autoscaling
6. Automate E2E regression suites (Playwright/Cypress)
7. Set up CI/CD pipeline with preview environments

## License

This project is proprietary and confidential.

