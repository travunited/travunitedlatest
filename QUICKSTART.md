# Quick Start Guide

Get Travunited up and running in 5 minutes!

## Prerequisites Check

Make sure you have:
- ✅ Node.js 18+ (`node -v`)
- ✅ Docker Desktop running
- ✅ npm installed (`npm -v`)

## Quick Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start Docker services:**
   ```bash
   docker compose up -d
   ```

3. **Set up MinIO bucket:**
   - Open http://localhost:9001
   - Login: `minioadmin` / `miniolocalpassword`
   - Create bucket: `visa-documents`

4. **Set up database:**
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Start dev server:**
   ```bash
   npm run dev
   ```

6. **Open browser:**
   http://localhost:3000

## What's Included

✅ Complete homepage with hero section  
✅ Visa browsing and detail pages  
✅ Tour browsing and detail pages  
✅ 6-step visa application flow  
✅ 5-step tour booking flow  
✅ Customer dashboard  
✅ Help & support page with FAQ  
✅ Login/Signup pages  
✅ Responsive design  
✅ Modern UI with animations  

## Key Features

- **Premium Design**: Clean, modern, conversion-focused UI
- **Glassmorphism**: Beautiful glass effects on hero sections
- **Smooth Animations**: Framer Motion for delightful interactions
- **Fully Responsive**: Works perfectly on mobile, tablet, and desktop
- **Database Ready**: PostgreSQL with Prisma ORM
- **File Storage**: MinIO for document uploads
- **Payment Ready**: Razorpay integration structure in place

## Project Structure

```
Travunited/
├── src/
│   ├── app/              # Next.js pages
│   ├── components/       # React components
│   └── lib/              # Utilities (Prisma, MinIO)
├── prisma/               # Database schema
├── docker-compose.yml    # Docker services
└── package.json          # Dependencies
```

## Next Steps

1. Explore the website
2. Try the visa application flow
3. Test the tour booking process
4. Check out the dashboard
5. Customize the design and content
6. Add your own visa/tour data
7. Integrate payment gateway
8. Set up authentication

## Need Help?

Check `SETUP.md` for detailed setup instructions or `README.md` for full documentation.

