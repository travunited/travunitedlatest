# Roles & Access Control Implementation

## Overview

Complete role-based access control system with single login page and role-based redirects.

## Roles

### 1. Customer (CUSTOMER)
- **Login**: Uses `/login` (same as admins)
- **Dashboard**: Customer dashboard only (`/dashboard`)
- **Access**:
  - View own applications and bookings
  - Manage traveller profiles
  - Account settings
  - Cannot access admin panel

### 2. Staff Admin (STAFF_ADMIN)
- **Login**: Uses `/login` (same as customers)
- **Dashboard**: Admin dashboard (`/admin`)
- **Can Access**:
  - ✅ Visa applications (queue, detail, document review, status management, visa upload)
  - ✅ Tour bookings (list, detail, status management, voucher upload)
  - ✅ Reviews moderation (hide/show, delete)
  - ✅ Corporate leads (view)
  - ✅ Day-to-day operations
- **Cannot Access**:
  - ❌ Content Management (Visa Config, Tours, Blog)
  - ❌ Admin Management (manage other admins)
  - ❌ General Settings
  - ❌ Reports & Audit Logs

### 3. Super Admin (SUPER_ADMIN)
- **Login**: Uses `/login` (same as everyone)
- **Dashboard**: Admin dashboard (`/admin`)
- **Access**:
  - ✅ Everything Staff Admin can do
  - ✅ Content Management (Visa Config, Tours, Blog)
  - ✅ Admin Management (manage admin accounts, roles)
  - ✅ General Settings
  - ✅ Full reports & audit logs (structure ready)

## Login Logic

### Single Login Page (`/login`)
- ✅ Used by everyone (customers and admins)
- ✅ After successful login:
  - If role = `CUSTOMER` → Redirect to `/dashboard`
  - If role = `STAFF_ADMIN` or `SUPER_ADMIN` → Redirect to `/admin`
- ✅ Middleware handles redirects if already logged in

### Admin Login Page (`/admin/login`)
- ✅ Redirects to `/login` (deprecated, kept for compatibility)
- ✅ No longer used, all users use `/login`

## Access Control Implementation

### Middleware Protection
- ✅ Admin routes (`/admin/*`) require `STAFF_ADMIN` or `SUPER_ADMIN`
- ✅ Super Admin only routes:
  - `/admin/content/*` - Content Management
  - `/admin/settings` - Admin Settings
  - `/admin/users` - Admin Management
- ✅ Auto-redirect based on role

### API Route Protection
- ✅ All admin API routes check role
- ✅ Content management APIs require `SUPER_ADMIN`
- ✅ Operations APIs allow both `STAFF_ADMIN` and `SUPER_ADMIN`

### Page-Level Protection
- ✅ All admin pages check role on mount
- ✅ Content management pages redirect Staff Admin to `/admin`
- ✅ Operations pages allow both admin types

## Admin Dashboard Sections

### Visible to All Admins (Staff Admin + Super Admin)
- ✅ Visa Applications
- ✅ Tour Bookings
- ✅ Reviews Moderation
- ✅ Corporate Leads

### Visible to Super Admin Only
- ✅ Content Management
- ✅ Admin Settings

## Route Protection Matrix

| Route | Customer | Staff Admin | Super Admin |
|-------|----------|-------------|-------------|
| `/dashboard` | ✅ | ❌ | ❌ |
| `/admin` | ❌ | ✅ | ✅ |
| `/admin/applications` | ❌ | ✅ | ✅ |
| `/admin/bookings` | ❌ | ✅ | ✅ |
| `/admin/reviews` | ❌ | ✅ | ✅ |
| `/admin/corporate-leads` | ❌ | ✅ | ✅ |
| `/admin/content/*` | ❌ | ❌ | ✅ |
| `/admin/settings` | ❌ | ❌ | ✅ |
| `/admin/users` | ❌ | ❌ | ✅ |

## API Protection Matrix

| API Route | Customer | Staff Admin | Super Admin |
|-----------|----------|-------------|-------------|
| `/api/admin/applications` | ❌ | ✅ | ✅ |
| `/api/admin/bookings` | ❌ | ✅ | ✅ |
| `/api/admin/reviews` | ❌ | ✅ | ✅ |
| `/api/admin/corporate-leads` | ❌ | ✅ | ✅ |
| `/api/admin/content/*` | ❌ | ❌ | ✅ |
| `/api/admin/settings` | ❌ | ❌ | ✅ |

## Security Features

- ✅ Role-based redirects after login
- ✅ Middleware protection for routes
- ✅ API route authorization checks
- ✅ Page-level role validation
- ✅ Protected content management from Staff Admin
- ✅ Session validation on all admin endpoints

## User Experience

### For Customers
1. Go to `/login`
2. Enter email + password
3. Redirected to `/dashboard`
4. Can access customer features only

### For Staff Admin
1. Go to `/login`
2. Enter email + password
3. Redirected to `/admin`
4. Can access operations (visas, tours, reviews, leads)
5. Cannot access content management or admin settings

### For Super Admin
1. Go to `/login`
2. Enter email + password
3. Redirected to `/admin`
4. Can access everything including content management and admin settings

## Testing Scenarios

### Customer Login
- ✅ Should redirect to `/dashboard`
- ✅ Should not see admin panel link
- ✅ Should not access `/admin` routes

### Staff Admin Login
- ✅ Should redirect to `/admin`
- ✅ Should see operations sections
- ✅ Should NOT see Content Management link
- ✅ Should NOT see Admin Settings link
- ✅ Should be redirected if accessing `/admin/content/*`

### Super Admin Login
- ✅ Should redirect to `/admin`
- ✅ Should see all sections including Content Management
- ✅ Should see Admin Settings link
- ✅ Should access all admin routes

## Next Steps

- ⏳ Implement Admin Settings page
- ⏳ Implement Admin Management (CRUD admins)
- ⏳ Add audit logging
- ⏳ Add reports & analytics for Super Admin

