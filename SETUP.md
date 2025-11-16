# Setup Guide for Travunited

This guide will help you set up the Travunited project on your Mac.

## Prerequisites

Before starting, ensure you have:
- macOS (tested on macOS 14+)
- Homebrew installed
- Terminal access

## Step-by-Step Setup

### 1. Install Homebrew (if not already installed)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Follow the on-screen instructions. After installation, you may need to add Homebrew to your PATH:

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
source ~/.zshrc
```

Verify installation:
```bash
brew --version
```

### 2. Install Git

```bash
xcode-select --install
```

Accept the license and wait for installation to complete.

Verify:
```bash
git --version
```

### 3. Install Node.js using nvm

```bash
brew install nvm
mkdir -p ~/.nvm
```

Add to your shell profile (`~/.zshrc`):
```bash
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
echo '[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && . "/opt/homebrew/opt/nvm/nvm.sh"' >> ~/.zshrc
source ~/.zshrc
```

Install Node.js LTS:
```bash
nvm install --lts
nvm use --lts
```

Verify:
```bash
node -v
npm -v
```

### 4. Install Docker Desktop

1. Download Docker Desktop for Mac from: https://www.docker.com/products/docker-desktop
2. Install the `.dmg` file (drag to Applications)
3. Open Docker Desktop from Applications
4. Wait for Docker to fully start (whale icon in menu bar)

Verify:
```bash
docker --version
docker compose version
```

### 5. Install Project Dependencies

Navigate to the project directory:
```bash
cd /Users/jnaneshshetty/Desktop/Travunited
```

Install npm packages:
```bash
npm install
```

### 6. Set Up Environment Variables

Create `.env.local` file in the project root:
```bash
cat > .env.local << 'EOF'
# Database (local Postgres in Docker)
DATABASE_URL=postgresql://travunited:localpassword@localhost:5433/travunited_db?schema=public

# MinIO (local)
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=miniolocalpassword
MINIO_BUCKET=visa-documents

# NextAuth (for future auth implementation)
NEXTAUTH_SECRET=your-secret-key-change-in-production
NEXTAUTH_URL=http://localhost:3000

# Razorpay
RAZORPAY_KEY_ID=rzp_test_key
RAZORPAY_KEY_SECRET=rzp_test_secret
RAZORPAY_WEBHOOK_SECRET=whsec_test_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_key

# Email (Resend)
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM="Travunited <noreply@travunited.com>"
EOF
```

### 7. Start Docker Services

Start PostgreSQL and MinIO:
```bash
docker compose up -d
```

Verify containers are running:
```bash
docker ps
```

You should see:
- `travunited-postgres-local`
- `travunited-minio-local`

### 8. Set Up MinIO Bucket

1. Open your browser and go to: http://localhost:9001
2. Login with:
   - Username: `minioadmin`
   - Password: `miniolocalpassword`
3. Click "Create Bucket"
4. Name it: `visa-documents`
5. Keep it private (default)
6. Click "Create Bucket"

### 9. Set Up Database

Run Prisma migrations:
```bash
npx prisma migrate dev --name init
```

This will create all the database tables.

(Optional) Open Prisma Studio to view the database:
```bash
npx prisma studio
```

### 10. Run the Development Server

```bash
npm run dev
```

The server will start on http://localhost:3000

Open your browser and navigate to: http://localhost:3000

## Testing the Setup

### Test Database Connection

Visit: http://localhost:3000/api/test-db

You should see: `{"users":[],"count":0}`

### Test File Upload

You can test the file upload endpoint using curl:
```bash
curl -X POST http://localhost:3000/api/test-upload \
  -F "file=@/path/to/any/file.pdf"
```

Or use a tool like Postman or Thunder Client (VS Code extension).

### Run Quality Checks

```bash
npm run check
```

This command runs ESLint and TypeScript type checks to ensure code quality before committing.

## Common Issues

### Docker containers not starting

1. Make sure Docker Desktop is running
2. Check logs: `docker compose logs`
3. Restart Docker Desktop

### Port already in use

If port 3000, 5433, 9000, or 9001 is already in use:

1. Find the process: `lsof -i :PORT_NUMBER`
2. Kill the process: `kill -9 PID`
3. Or change the port in `docker-compose.yml` or `package.json`

### Database connection errors

1. Verify Docker containers are running: `docker ps`
2. Check DATABASE_URL in `.env.local`
3. Try restarting containers: `docker compose restart`

### MinIO connection errors

1. Verify MinIO is running: `docker ps | grep minio`
2. Check MinIO console: http://localhost:9001
3. Verify bucket exists: `visa-documents`

## Next Steps

1. Explore the website at http://localhost:3000
2. Try the visa application flow
3. Try the tour booking flow
4. Check out the dashboard
5. Review the code structure

## Useful Commands

```bash
# Start Docker services
docker compose up -d

# Stop Docker services
docker compose down

# View Docker logs
docker compose logs -f

# Reset database (WARNING: deletes all data)
docker compose down -v
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Open Prisma Studio
npx prisma studio

# Run development server
npm run dev

# Build for production
npm run build

# Run production server
npm start
```

## Development Tips

- Use VS Code with extensions: ESLint, Prettier, Prisma
- Hot reload is enabled - changes reflect immediately
- Check browser console for errors
- Use React DevTools for debugging
- Check Network tab for API calls

## Support

If you encounter any issues:
1. Check the error messages in terminal
2. Check Docker logs: `docker compose logs`
3. Verify all services are running
4. Check environment variables in `.env.local`

