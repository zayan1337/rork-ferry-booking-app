# Ferry Booking App

A comprehensive ferry booking application built with React Native, Expo, and Supabase.

## Features

- **Customer Booking**: Complete booking flow with seat selection and payment
- **Agent Management**: Agent-specific booking and client management
- **Admin Dashboard**: Comprehensive admin panel for operations management
- **MIB Payment Integration**: Secure payment processing via MIB (Maldives Islamic Bank)
- **Real-time Updates**: Live seat availability and booking status updates
- **QR Code Generation**: Automatic QR code generation for tickets

## MIB Payment Flow

The app integrates with MIB (Maldives Islamic Bank) payment gateway for secure payment processing.

### Payment Flow:

1. **Customer selects MIB payment** during booking
2. **Booking is created** with `pending_payment` status
3. **MIB session is created** via Supabase Edge Function
4. **Payment modal opens** with booking summary
5. **Customer proceeds to MIB gateway** for payment
6. **Payment completion** redirects to success page
7. **Booking status updated** to `confirmed` on successful payment

### Testing MIB Payment:

1. **Environment Setup**:
   - Copy `env.example` to `.env`
   - Update MIB credentials in `.env`
   - Ensure Supabase Edge Function is deployed

2. **Test Payment Flow**:
   - Create a booking with MIB payment method
   - Complete the payment flow
   - Verify redirection to success page
   - Check booking status updates

3. **Debugging**:
   - Check console logs for payment flow
   - Monitor Supabase Edge Function logs
   - Verify return URLs are correct

### Return URLs:

The app uses custom URL scheme for payment redirection:

- Success: `ferrybookingapp://payment-success?bookingId={id}&result=SUCCESS`
- Cancel: `ferrybookingapp://payment-success?bookingId={id}&result=CANCELLED`

**Note**: If automatic redirection doesn't work, the payment modal includes a "Check Payment Status" button for manual verification.

## Installation

1. Clone the repository
2. Install dependencies: `yarn install`
3. Copy environment variables: `cp env.example .env`
4. Update environment variables in `.env`
5. Start the development server: `yarn start`

**Important**: For MIB payment testing, use a development build (`expo run:android` or `expo run:ios`) as URL schemes work better with development builds than Expo Go.

## Environment Variables

See `env.example` for required environment variables.

## Supabase Setup

1. Create a Supabase project
2. Run the database migrations from `table_structure.sql`
3. Deploy the Edge Functions from `supabase/functions/`
4. Configure Row Level Security (RLS) policies

## Development

- **Frontend**: React Native with Expo
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Payment**: MIB Gateway Integration
- **State Management**: Zustand
- **Navigation**: Expo Router

## License

This project is proprietary software.
