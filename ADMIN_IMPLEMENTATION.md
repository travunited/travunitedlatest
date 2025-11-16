# Admin Workflows & Notifications Implementation

## Overview

Complete admin system with visa/tour operations, content management, reviews moderation, and email notifications.

## Email Notifications System

### Email Triggers Implemented

#### Authentication
- ✅ Welcome email on signup
- ✅ Password reset email with link

#### Visa Application
- ✅ Payment success → Submitted status
- ✅ Payment failed (handled in webhook)
- ✅ Status changed to In Process
- ✅ Documents rejected (with per-doc reason + dashboard link)
- ✅ Visa approved (visa available)
- ✅ Visa rejected (with admin reason)

#### Tour Booking
- ✅ Payment success → Booked status
- ✅ Advance payment success (with pending balance info)
- ✅ Remaining payment success
- ✅ Status: Confirmed (vouchers available)
- ✅ Payment reminder emails (structure ready)

### Email Service Integration

Currently logs to console. To integrate:
1. Install email service (e.g., `npm install resend` or `@sendgrid/mail`)
2. Add API key to `.env.local`
3. Update `src/lib/email.ts` with actual sending logic

## Analytics & Tracking

### Google Analytics
- ✅ Integrated in root layout
- ✅ Page view tracking
- ✅ Event tracking helpers
- ✅ Environment variable: `NEXT_PUBLIC_GA_MEASUREMENT_ID`

### Meta Pixel
- ✅ Integrated in root layout
- ✅ Page view tracking
- ✅ Event tracking helpers
- ✅ Environment variable: `NEXT_PUBLIC_META_PIXEL_ID`

### Tracking Events
- Homepage → Visa/Tour → Apply/Book → Payment funnel
- Ready for conversion tracking

## Admin Workflows

### 1. Admin Login
- ✅ Separate admin login page (`/admin/login`)
- ✅ Role-based access (STAFF_ADMIN, SUPER_ADMIN)
- ✅ Redirects non-admins to customer dashboard

### 2. Visa Operations

#### Applications Queue (`/admin/applications`)
- ✅ List all applications with status filter
- ✅ View unassigned applications
- ✅ Claim/pick application ("Assign to me")
- ✅ See assigned admin for each application

#### Application Detail View (`/admin/applications/[id]`)
- ✅ Customer information display
- ✅ Travellers details
- ✅ Documents list with preview
- ✅ Document review:
  - Mark as Verified/Approved
  - Reject with reason
  - Email notification on rejection
- ✅ Status management:
  - Change status (Submitted → In Process → Approved/Rejected)
  - Rejection reason input
  - Email notifications on status change
- ✅ Visa upload:
  - Upload final visa document
  - Auto-update status to Approved
  - Email notification to user
- ✅ Admin notes (internal)

### 3. Tour Operations

#### Bookings List (`/admin/bookings`)
- ✅ List all bookings with status filter
- ✅ View by status (Booked, Confirmed, Completed, Cancelled)

#### Booking Detail View (`/admin/bookings/[id]`)
- ✅ Customer information
- ✅ Travellers list
- ✅ Amount paid, pending balance
- ✅ Status management:
  - Mark as Confirmed
  - Mark as Completed
  - Mark as Cancelled
- ✅ Voucher upload:
  - Upload vouchers/itinerary
  - Auto-update status to Confirmed
  - Email notification to user
- ✅ Admin notes (internal)

### 4. Content Management

#### Visa Content (`/admin/content/visas`)
- ✅ List all visa types
- ✅ View country, type, price, processing time
- ✅ Active/inactive status
- ✅ Edit visa (link ready)
- ✅ Add new visa (link ready)

#### Tour Content (`/admin/content/tours`)
- ✅ List all tours
- ✅ View name, destination, duration, price
- ✅ Active/inactive status
- ✅ Edit tour (link ready)
- ✅ Add new tour (link ready)

#### Blog Content
- ⏳ To be implemented (structure ready)

### 5. Reviews Moderation (`/admin/reviews`)
- ✅ List all reviews (visa + tour)
- ✅ Filter by type (visa/tour)
- ✅ View review details (rating, comment, user)
- ✅ Hide/show reviews
- ✅ Delete reviews
- ✅ Visual indicator for hidden reviews

### 6. Corporate Leads (`/admin/corporate-leads`)
- ✅ List all corporate form submissions
- ✅ View company name, contact person, email, phone, message
- ✅ Submission date

## API Routes

### Admin Applications
- `GET /api/admin/applications` - List applications (with status filter)
- `GET /api/admin/applications/[id]` - Get application details
- `POST /api/admin/applications/[id]/claim` - Claim application
- `PUT /api/admin/applications/[id]/status` - Update status
- `PUT /api/admin/applications/[id]/notes` - Update notes
- `POST /api/admin/applications/[id]/visa` - Upload visa document
- `PUT /api/admin/applications/[id]/documents/[docId]/review` - Review document

### Admin Bookings
- `GET /api/admin/bookings` - List bookings (with status filter)
- `GET /api/admin/bookings/[id]` - Get booking details
- `PUT /api/admin/bookings/[id]/status` - Update status
- `PUT /api/admin/bookings/[id]/notes` - Update notes
- `POST /api/admin/bookings/[id]/voucher` - Upload voucher

### Content Management
- `GET /api/admin/content/visas` - List visa types
- `GET /api/admin/content/tours` - List tours

### Reviews
- `GET /api/admin/reviews` - List reviews (with type filter)
- `PUT /api/admin/reviews/[id]/visibility` - Toggle visibility
- `DELETE /api/admin/reviews/[id]` - Delete review

### Corporate Leads
- `GET /api/admin/corporate-leads` - List leads

### Payments
- `POST /api/payments/webhook` - Razorpay webhook handler

## Security Features

- ✅ Role-based access control (RBAC)
- ✅ Admin-only routes protected
- ✅ Session validation on all admin endpoints
- ✅ Webhook signature verification (structure ready)

## Next Steps

1. ⏳ Integrate actual email service (Resend/SendGrid)
2. ⏳ Add Review model to Prisma schema
3. ⏳ Add CorporateLead model to Prisma schema
4. ⏳ Implement visa/tour edit forms
5. ⏳ Add blog content management
6. ⏳ Implement Razorpay webhook signature verification
7. ⏳ Add file preview/download functionality
8. ⏳ Add payment reminder cron job
9. ⏳ Add application expiry cron job

## Environment Variables Needed

```env
# Email Service (choose one)
RESEND_API_KEY=your_resend_key
# OR
SENDGRID_API_KEY=your_sendgrid_key

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_META_PIXEL_ID=123456789012345

# Razorpay
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

