# Tour Booking - Customer Workflow Implementation

## Overview

Complete 5-step tour booking workflow with advance payment support, voucher downloads, and booking management.

## User Flow

### Starting the Flow
1. User clicks "Book This Tour" on tour detail page
2. Navigates to `/book/tour/[id]`
3. Tour is pre-selected from detail page

## 5-Step Tour Booking Wizard

### Step 1: Select Tour & Date
- Tour name and price displayed (pre-filled)
- Travel date selection (required)
- Number of adults (required, minimum 1)
- Number of children (optional)
- Total travellers and price calculation shown
- Auto-updates traveller list based on count

### Step 2: Primary Contact Details
- Full Name *
- Email Address *
- Mobile Number (optional)
- If logged-in: Auto-fills from profile, editable

### Step 3: Travellers
- For each traveller (based on count from Step 1):
  - First Name *
  - Last Name *
  - Age *
  - Gender (optional)
- No passport details required (simpler than visa)
- If logged-in: Can choose from saved Traveller Profiles (future feature)

### Step 4: Review & Confirm
- Summary display:
  - Tour name
  - Travel date
  - Number of travellers
  - Primary contact
  - Traveller list
- Payment option selection:
  - **Full Payment**: Pay complete amount now
  - **Advance Payment**: Pay configured percentage (default 30%), remaining before departure
- Shows amounts for both options
- "Confirm & Continue to Payment" button

### Step 5: Signup/Login & Payment
- **If guest:**
  - Shows auth box with:
    - "Create Account" button (pre-fills email)
    - "Login" button
  - After login/signup: Booking linked to account
- **Payment:**
  - Razorpay checkout integration
  - Amount based on payment type:
    - Full Payment: Complete amount
    - Advance Payment: Configured percentage
  - On success:
    - Booking status: BOOKED (full) or PAYMENT_PENDING (advance)
    - Redirect to Thank You page
    - On-screen invoice with Print option
    - Email confirmation (TODO)
  - On failure:
    - Booking status: PAYMENT_PENDING
    - User can retry from dashboard

## Tour Booking Statuses

- **DRAFT** - Started but not paid, auto-expires after 7 days
- **PAYMENT_PENDING** - Payment failed or advance payment made, expires after 48 hours if no payment
- **BOOKED** - Payment done (full or advance)
- **CONFIRMED** - Admin verified & locked hotels/itinerary, vouchers uploaded
- **COMPLETED** - Trip over / manually marked
- **CANCELLED** - Admin cancelled internally

## Advance & Remaining Payments

### For Advance Payment Bookings
- Dashboard shows:
  - Amount paid
  - Pending balance
  - Due date (if applicable)
  - "Pay Remaining Amount" button
- Email reminders (TODO):
  - Immediately after advance payment (info + link)
  - X days before due date with payment link
- After full payment:
  - Booking status updated
  - Booking proceeds normally

## Final Tour Vouchers/Docs

### When Booking is Confirmed
- Admin uploads:
  - Vouchers / final itinerary PDF to booking
- System sends:
  - Email: "Your tour is confirmed. Download vouchers."
- Dashboard shows:
  - Download section with vouchers
  - Print invoice option
  - Booking details

## Technical Implementation

### API Routes
- `POST /api/bookings/create` - Create booking (requires auth)
- `GET /api/bookings` - List user's bookings
- `GET /api/bookings/[id]` - Get booking details
- `POST /api/payments/create-order` - Create payment order (supports advance/full)
- Payment webhook (TODO) - Handle Razorpay callbacks

### Booking Model
- Stores full tour amount
- Tracks payment status separately
- Links to travellers (simplified - no passport details)
- Stores voucher URL when confirmed

### Payment Flow
1. User selects payment type (full/advance)
2. Booking created with DRAFT status
3. Payment order created
4. On success:
   - Full payment → Status: BOOKED
   - Advance payment → Status: PAYMENT_PENDING, remaining balance tracked
5. User can pay remaining balance from dashboard

### Dashboard Features

#### Booking List
- Shows all bookings
- Status badges with colors
- Quick view of key details
- Link to full booking details

#### Booking Detail Page
- Complete booking information
- Traveller list
- Payment status
- Pending balance (if advance payment)
- Pay remaining amount button
- Download vouchers (when confirmed)
- Print invoice option

## Features

- ✅ 5-step booking flow
- ✅ Date and traveller selection
- ✅ Advance payment option
- ✅ Payment integration structure
- ✅ Booking status tracking
- ✅ Voucher download
- ✅ Invoice printing
- ✅ Dashboard integration
- ⏳ Email notifications
- ⏳ Traveller Profiles (save for reuse)
- ⏳ Payment reminders
- ⏳ Razorpay webhook integration

## Next Steps

1. ✅ Complete 5-step flow
2. ✅ Advance payment option
3. ✅ Booking management
4. ⏳ Integrate actual Razorpay SDK
5. ⏳ Email notifications
6. ⏳ Payment reminders
7. ⏳ Traveller Profiles
8. ⏳ Tour data from database
9. ⏳ Booking expiry cron job

