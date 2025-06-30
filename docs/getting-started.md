# Getting Started

This guide will help you set up and run the SaaS application locally.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18 or higher)
- **pnpm** (recommended package manager)
- **Supabase CLI** (for local development)
- **Git** (for version control)

## Installation Steps

### 1. Environment Setup

Copy the environment file and configure your variables:

```bash
cp frontend/.env.local.example frontend/.env.local
```

Update the following variables in `frontend/.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key

# Resend (Email)
RESEND_API_KEY=your_resend_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Database Setup

Start Supabase locally:

```bash
cd supabase
supabase start
```

This will:
- Start a local PostgreSQL database
- Apply all migrations
- Set up authentication
- Start the edge functions server

### 3. Install Dependencies

```bash
cd frontend
pnpm install
```

### 4. Start Development Server

```bash
pnpm dev
```

Your application will be available at `http://localhost:3000`.

## Development Workflow

### Database Changes

When making database changes:

1. Create a new migration:
   ```bash
   supabase db diff --schema public --file new_migration
   ```

2. Apply migrations:
   ```bash
   supabase db push
   ```

3. Reset database (if needed):
   ```bash
   supabase db reset
   ```

### Edge Functions

Deploy edge functions:

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy send-email
```

### Testing

Run tests:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage
```

## Troubleshooting

### Common Issues

1. **Supabase CLI not found**
   - Install via: `npm install -g @supabase/cli`

2. **Database connection issues**
   - Ensure PostgreSQL is running
   - Check Supabase status: `supabase status`

3. **Environment variables not loaded**
   - Restart the development server
   - Check `.env.local` file location

### Getting Help

- Check the [documentation](./README.md)
- Review [Supabase docs](https://supabase.com/docs)
- Open an issue on GitHub
