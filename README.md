# SaaS App

A modern SaaS application built with Next.js, Supabase, and TypeScript.

## Features

- 🔐 Authentication with Supabase
- 💳 Stripe integration for payments
- 🏢 Multi-tenant organization support
- 📊 Project management
- 🎨 Modern UI with Tailwind CSS
- 📧 Email system with Resend
- 🔒 Row Level Security (RLS)
- 📱 Responsive design

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm
- Supabase CLI

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   cp frontend/.env.local.example frontend/.env.local
   ```

4. Start Supabase:
   ```bash
   cd supabase && supabase start
   ```

5. Run the development server:
   ```bash
   cd frontend && pnpm dev
   ```

### Database Setup

The project includes migrations and seed data:

```bash
# Reset database with migrations
supabase db reset

# Or apply migrations manually
supabase db push

# Seed with sample data
supabase db seed
```

## Project Structure

```
├── frontend/          # Next.js application
├── supabase/         # Supabase configuration
│   ├── functions/    # Edge functions
│   ├── migrations/   # Database migrations
│   ├── policies/     # RLS policies
│   └── seed/         # Seed data
├── shared/           # Shared types and utilities
│   ├── types/        # TypeScript types
│   ├── constants/    # App constants
│   ├── schemas/      # Zod schemas
│   └── utils/        # Utility functions
└── docs/             # Documentation
```

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Payments**: Stripe
- **Email**: Resend
- **Validation**: Zod
- **Testing**: Jest, Testing Library

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if needed
5. Submit a pull request

## License

MIT License - see LICENSE file for details
