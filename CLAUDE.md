# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A platform where daylily growers can build and manage their online presence. Connect with database of 90,000+ registered cultivars to showcase and sell daylilies.

**Key Features:**
- Daylily listings with database integration (AHS cultivar data)
- Photo management with S3 storage and Cloudflare processing
- Lists to organize daylilies (gardens, sales, favorites)
- Garden profiles for growers
- Authentication via Clerk, payments via Stripe

## Development Commands

```bash
# Development
npm run dev                    # Start development server
npm run dev:tunnel            # Start dev server with cloudflare tunnel
npm run build                 # Build for production
npm run start                 # Start production server
npm run lint                  # Run ESLint

# Database
npm run db:push               # Push schema changes to database
npm run db:generate           # Generate Prisma client
npm run db:studio             # Open Prisma Studio
npm run migrate               # Run custom migration script
npm run migrate:generate      # Generate new Prisma migration
npm run migrate:apply         # Apply migrations using script

# Testing
npm run test                  # Run Playwright tests
npm run test:headed           # Run tests in headed mode
npm run test:ui               # Run tests with Playwright UI

# Environment-specific commands
npm run env:dev -- <command>  # Run command with .env.development
npm run env:prod -- <command> # Run command with .env.production
```

## Tech Stack & Architecture

**Frontend:** Next.js 14 (App Router), Tailwind CSS, shadcn/ui, Radix UI  
**Backend:** tRPC, Prisma ORM, SQLite (Turso for production)  
**Auth:** Clerk  
**Payments:** Stripe  
**Storage:** AWS S3 (images), Cloudflare (image processing)  
**Deployment:** Vercel  
**Monitoring:** Sentry  
**Testing:** Playwright  

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (public)/          # Public routes (user profiles, listings)
│   ├── (routes)/          # App routes
│   ├── api/               # API routes (webhooks, feeds)
│   └── dashboard/         # Protected dashboard routes
├── components/            # Shared components
│   ├── ui/               # shadcn/ui components only
│   └── forms/            # Form components
├── server/               # Server-side code
│   ├── api/              # tRPC API
│   │   └── routers/      # Domain-specific tRPC routers
│   ├── db/               # Database utilities
│   └── clerk/            # Clerk auth utilities
├── hooks/                # Custom React hooks
├── lib/                  # Shared utilities
└── types/                # TypeScript type definitions
```

## Database Schema

**Key Models:**
- `User` - User accounts (linked to Clerk)
- `UserProfile` - Public garden profiles
- `Listing` - Daylily listings
- `List` - Collections of listings
- `AhsListing` - American Hemerocallis Society cultivar database
- `Image` - S3 stored images linked to listings/profiles

**Path Aliases:**
- `@/*` → `src/*`
- `@prisma/client` → Custom generated client in `prisma/generated/sqlite-client`

## Development Guidelines

### Component Organization
- Route-specific components: `app/<route>/_components/`
- Shared components: `components/`
- Use kebab-case for file names
- Always include `"use server"` or `"use client"` directive

### Data Fetching Patterns
- Server components: Fetch data directly, pass to client components as props
- Client components: Use tRPC hooks from `@/trpc/react`
- Server actions: Use tRPC procedures from `@/trpc/server`

### tRPC Router Structure
Routers organized by domain in `src/server/api/routers/`:
- `listing.ts` - Listing CRUD operations
- `list.ts` - List management
- `user-profile.ts` - Profile management
- `dashboard.ts` - Dashboard data
- `public.ts` - Public-facing data
- `ahs.ts` - AHS cultivar database queries
- `stripe.ts` - Payment operations
- `image.ts` - Image upload/management

### Authentication
- Uses Clerk for authentication
- User creation handled automatically via tRPC middleware
- Protected procedures require authentication
- Database stores `user.id` (not Clerk user ID) for relations

### Environment Setup
- Development: `.env.development`
- Production: `.env.production`
- Use `NEXT_PUBLIC_` prefix for client-accessible env vars
- Import server env vars via `import { env } from "@/env"`

### Testing
- Playwright for E2E testing
- Test files in `tests/` directory
- Custom fixtures in `tests/fixtures.ts`
- Run tests with `npm run test`

## Key Configuration

**TypeScript:** Strict mode enabled, path aliases configured  
**ESLint:** Next.js config with TypeScript support  
**Tailwind:** Configured with shadcn/ui presets  
**Prisma:** SQLite with Turso adapter for production  
**Next.js:** App Router, image optimization, legacy URL redirects