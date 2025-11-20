# Fixing PostgreSQL Database Permissions (P1010 Error)

If you're seeing this error:
```
Error: P1010: User was denied access on the database
```

This means Prisma can connect to PostgreSQL, but the database user doesn't have sufficient privileges.

## Quick Fix (Recommended)

### Step 1: Find your database credentials

Check your `.env` file for `DATABASE_URL`. It should look like:
```
DATABASE_URL="postgresql://travunited:YOUR_PASSWORD@localhost:5432/travunited_db"
```

From this, extract:
- **Username**: `travunited` (or whatever comes after `postgresql://` and before `:`)
- **Password**: `YOUR_PASSWORD` (between `:` and `@`)
- **Database**: `travunited_db` (after the last `/`)

### Step 2: Edit the SQL script

Open `scripts/grant-permissions-simple.sql` and replace:
- `YOUR_PASSWORD_HERE` with your actual password
- `travunited` with your username if different
- `travunited_db` with your database name if different

### Step 3: Run as superuser

Try one of these commands (use whichever works):

```bash
# Option 1: If 'postgres' superuser exists
psql -U postgres -f scripts/grant-permissions-simple.sql

# Option 2: If using your macOS username
psql -U $(whoami) -f scripts/grant-permissions-simple.sql

# Option 3: If Postgres.app is installed
psql -f scripts/grant-permissions-simple.sql
```

If you're prompted for a password, enter the superuser password (often empty or your macOS password).

### Step 4: Test the connection

```bash
# Load your .env file
set -a
source .env
set +a

# Test connection
psql "$DATABASE_URL" -c "SELECT version();"
```

If this works, you're done! Now run:

```bash
npx prisma migrate dev --name add_tour_fields
npx prisma generate
```

## Alternative: Manual SQL Commands

If the script doesn't work, connect as superuser and run these commands manually:

```bash
psql -U postgres  # or psql -U $(whoami)
```

Then in the psql prompt:

```sql
-- Replace these values with your actual credentials
\set DB_USER 'travunited'
\set DB_NAME 'travunited_db'
\set DB_PASS 'your_password_here'

-- Create/update role
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'DB_USER') THEN
    EXECUTE format('CREATE ROLE %I WITH LOGIN PASSWORD %L', :'DB_USER', :'DB_PASS');
  ELSE
    EXECUTE format('ALTER ROLE %I WITH PASSWORD %L', :'DB_USER', :'DB_PASS');
  END IF;
END
$$;

-- Create database
SELECT 'CREATE DATABASE ' || quote_ident(:'DB_NAME') || ' OWNER ' || quote_ident(:'DB_USER')
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'DB_NAME')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE :DB_NAME TO :DB_USER;
\c :DB_NAME
GRANT USAGE, CREATE ON SCHEMA public TO :DB_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO :DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO :DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO :DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO :DB_USER;
ALTER DATABASE :DB_NAME OWNER TO :DB_USER;
\q
```

## Troubleshooting

### "psql: command not found"
Install PostgreSQL client tools:
```bash
# macOS with Homebrew
brew install postgresql

# Or install Postgres.app from https://postgresapp.com/
```

### "FATAL: password authentication failed"
- Check your password in `.env` matches what you set in PostgreSQL
- Try connecting without password: `psql -U postgres` (might use peer authentication)

### "FATAL: database does not exist"
The script will create it automatically. If it doesn't, create manually:
```sql
CREATE DATABASE travunited_db OWNER travunited;
```

### Still having issues?
1. Verify PostgreSQL is running: `pg_isready`
2. Check PostgreSQL version: `psql --version`
3. Verify your `.env` file has correct `DATABASE_URL` format

## What These Commands Do

1. **CREATE ROLE**: Creates the database user if it doesn't exist
2. **CREATE DATABASE**: Creates the database if missing
3. **GRANT ALL PRIVILEGES**: Gives full access to the database
4. **GRANT USAGE/CREATE**: Allows using and creating objects in the schema
5. **ALTER DEFAULT PRIVILEGES**: Ensures future objects are accessible
6. **ALTER DATABASE OWNER**: Makes the user the owner (full control)

After running these, Prisma should be able to create tables, run migrations, and manage your database schema.

