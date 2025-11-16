# Roles & Access Control Implementation

## Overview

The Travunited platform now supports three user roles with distinct permissions and access levels.

## User Roles

### 1. Customer (CUSTOMER)
- **Default role** for all new signups
- Can browse visas & tours without login
- Can start visa/tour application as guest
- Must sign up (email + password) at payment step or via navigation
- Optional mobile number during signup
- Can access dashboard only after login
- Can view their own applications and bookings

### 2. Staff Admin (STAFF_ADMIN)
- Handles day-to-day operations
- Full control over:
  - ✅ Visa applications (view, claim, verify docs, update status, upload visa)
  - ✅ Tour bookings (view, confirm, complete, upload vouchers)
  - ✅ Content management (visa descriptions, tours, blog, prices)
  - ✅ Payments (view list)
  - ✅ Reviews (hide/delete)
- ❌ Cannot manage other admins
- ❌ Cannot access global settings

### 3. Super Admin (SUPER_ADMIN)
- Everything Staff Admin can do +
- ✅ Manage admin accounts
- ✅ Manage user roles
- ✅ Access critical global settings
- ✅ Full system administration

## Implementation Details

### Database Schema

The Prisma schema includes:
- `UserRole` enum: `CUSTOMER`, `STAFF_ADMIN`, `SUPER_ADMIN`
- User model with `role` field (default: `CUSTOMER`)
- `isActive` flag for user management
- `processedBy` relations on Applications and Bookings to track admin actions
- Content management models: `VisaType`, `Tour`, `Payment`

### Authentication

- **NextAuth.js** for session management
- JWT-based sessions
- Credentials provider for email/password login
- Role stored in JWT token and session

### Middleware

- Route protection based on roles
- Public routes: `/`, `/visas`, `/tours`, `/blog`, `/help`, `/login`, `/signup`
- Protected routes:
  - `/dashboard` - Requires authentication
  - `/admin/*` - Requires STAFF_ADMIN or SUPER_ADMIN
  - `/admin/settings`, `/admin/users` - Requires SUPER_ADMIN only

### API Routes

- `/api/auth/signup` - User registration
- `/api/auth/[...nextauth]` - NextAuth endpoints
- `/api/admin/applications` - Admin application management (protected)

### UI Components

#### Navbar
- Shows user menu when logged in
- Displays admin shield icon for admins
- "Admin Panel" link visible only to admins
- Sign out functionality

#### Admin Dashboard (`/admin`)
- Overview with statistics
- Quick access to:
  - Visa Applications
  - Tour Bookings
  - Content Management
  - Payments
  - User Management (Super Admin only)
  - Settings (Super Admin only)

#### Admin Applications (`/admin/applications`)
- List all visa applications
- Filter by status
- Search functionality
- View individual application details

## Access Control Helpers

Located in `src/lib/auth-helpers.ts`:
- `getCurrentUser()` - Get current session user
- `requireAuth()` - Require authentication, redirect if not
- `requireAdmin()` - Require admin role
- `requireSuperAdmin()` - Require super admin role
- `isAdmin(role)` - Check if role is admin
- `isSuperAdmin(role)` - Check if role is super admin

## Guest Checkout Flow

1. User can browse and start application/booking without login
2. At payment step, user is prompted to:
   - Sign up (if new user)
   - Login (if existing user)
3. After authentication, payment proceeds
4. Application/booking is linked to user account

## Creating Admin Users

To create an admin user, you can:

1. **Via Database** (direct SQL):
```sql
UPDATE "User" SET role = 'STAFF_ADMIN' WHERE email = 'admin@example.com';
UPDATE "User" SET role = 'SUPER_ADMIN' WHERE email = 'superadmin@example.com';
```

2. **Via Prisma Studio**:
```bash
npx prisma studio
```
Then update the user's role field.

3. **Via API** (to be implemented):
- Super Admin can create/manage admin accounts through `/admin/users`

## Security Considerations

- Passwords are hashed using bcryptjs
- JWT tokens contain role information
- Middleware validates roles on protected routes
- API routes check authentication and authorization
- Session-based authentication with secure cookies

## Next Steps

1. ✅ Database schema with roles
2. ✅ Authentication system
3. ✅ Middleware for route protection
4. ✅ Admin dashboard structure
5. ✅ Basic admin interfaces
6. ⏳ Complete admin application management
7. ⏳ Complete admin booking management
8. ⏳ Content management interface
9. ⏳ Payment management interface
10. ⏳ User management (Super Admin)
11. ⏳ Settings page (Super Admin)
12. ⏳ Guest checkout with signup at payment

## Testing Roles

1. **Create a customer account**: Sign up normally
2. **Create an admin account**: Sign up, then update role in database
3. **Test access**: Try accessing `/admin` as customer (should redirect)
4. **Test admin access**: Login as admin, should see admin panel

