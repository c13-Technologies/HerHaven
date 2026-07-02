# Her Haven

A safe, supportive community platform for women to connect, share, and grow together. Built with TanStack Start, Supabase, and Tailwind CSS.

**🔗 Live site:** [https://her-haven-as5j.vercel.app/](https://her-haven-as5j.vercel.app/)

## Features

- **👤 Authentication** — Email/password and Google OAuth sign-in via Supabase Auth
- **📝 Posts & Categories** — Create, browse, and share posts across 11 categories
- **💬 Threaded Comments** — Nested replies with inline reply forms and collapse/expand
- **❤️ Reactions** — Heart, hug, and more reactions persisted on posts and comments
- **🔔 Real-time Notifications** — Live unread count badge via Supabase Realtime subscriptions
- **🌙 Dark Mode** — Warm dark palette with system preference detection and manual toggle
- **📱 Mobile-first** — Bottom tab bar, floating action button, responsive hamburger menu
- **🖼️ Avatar Upload** — Drag-and-drop image upload with preview to Supabase Storage
- **🔍 Search** — Debounced keyword search across post titles and body with category filter
- **♾️ Infinite Scroll** — Cursor-based pagination on feed and search pages
- **👥 Circles** — Create and join community circles
- **🔄 Animations** — Scroll-triggered reveals, staggered card entrances, skeleton loaders

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (React + SSR) |
| Router | [TanStack Router](https://tanstack.com/router) (file-based) |
| Database & Auth | [Supabase](https://supabase.com) (PostgreSQL) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| UI Components | [Radix UI](https://radix-ui.com) + [shadcn/ui](https://ui.shadcn.com) |
| Icons | [Lucide React](https://lucide.dev) |
| Forms | [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) |
| Animations | [tw-animate-css](https://github.com/jamiebuilds/tw-animate-css) |
| Charts | [Recharts](https://recharts.org) |
| Package Manager | [Bun](https://bun.sh) |
| Build Tool | [Vite](https://vitejs.dev) |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (v1.2+)
- A [Supabase](https://supabase.com) project (free tier works)

### Setup

1. **Clone the repo**

   ```bash
   git clone https://github.com/c13-Technologies/HerHaven.git
   cd HerHaven
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Configure environment**

   Create a `.env` file with your Supabase credentials:

   ```env
   SUPABASE_URL="https://your-project.supabase.co"
   SUPABASE_PUBLISHABLE_KEY="your-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   SUPABASE_PROJECT_ID="your-project-id"

   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
   VITE_SUPABASE_PROJECT_ID="your-project-id"
   ```

4. **Apply database migrations**

   Run the SQL files in `supabase/migrations/` in order via the Supabase SQL Editor. Or use the Supabase CLI:

   ```bash
   supabase db push
   ```

5. **Create the avatars storage bucket**

   In the Supabase dashboard: **Storage → New Bucket → "avatars" → Public bucket**

6. **Start the dev server**

   ```bash
   bun dev
   ```

   The app will be available at `http://localhost:5173`.

### Local Supabase (Optional)

To run Supabase locally instead of the cloud:

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Install the [Supabase CLI](https://supabase.com/docs/guides/local-development)
3. Run `supabase start` in the project root
4. Update your `.env` with the local URLs shown in the output

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/              # shadcn/ui primitives
│   ├── post-card.tsx    # Post display card
│   ├── site-header.tsx  # App header with nav & theme toggle
│   ├── site-footer.tsx  # App footer
│   ├── bottom-nav.tsx   # Mobile bottom tab bar
│   ├── avatar-uploader.tsx  # Drag-and-drop avatar upload
│   └── comment-card.tsx # Threaded comment component
├── hooks/               # Custom React hooks
│   ├── use-auth.ts             # Auth state & profile management
│   ├── use-theme.ts            # Dark mode logic
│   ├── use-mobile.tsx          # Responsive breakpoint detection
│   ├── use-scroll-reveal.ts    # Scroll-triggered animations
│   └── use-notification-count.ts  # Real-time unread badge
├── integrations/
│   ├── supabase/        # Supabase client, middleware & types
│   └── lovable/         # Lovable integration shims
├── lib/                 # Shared utilities
├── routes/              # File-based routes (TanStack Router)
│   ├── index.tsx        # Landing page
│   ├── auth.tsx         # Sign in / sign up
│   ├── about.tsx        # About page
│   ├── contact.tsx      # Contact page
│   ├── rules.tsx        # Community rules
│   └── _authenticated/  # Protected routes (auth required)
│       ├── feed.tsx         # Infinite scroll feed
│       ├── search.tsx       # Keyword & category search
│       ├── categories.tsx   # Browse categories
│       ├── me.tsx           # User profile
│       ├── notifications.tsx # Notification inbox
│       ├── circles.tsx      # Circles list
│       ├── post.new.tsx     # Create post
│       ├── post.$id.tsx     # Post detail + comments
│       └── admin.tsx        # Admin dashboard
├── styles.css           # Global styles & CSS variables
└── router.tsx           # Router setup
supabase/
├── config.toml          # Supabase local config
└── migrations/          # Database migration SQL files
database/
└── schema.sql           # MySQL-compatible schema for local testing (XAMPP)
```

## Available Scripts

| Command | Description |
|---|---|
| `bun dev` | Start development server |
| `bun run build` | Production build |
| `bun run preview` | Preview production build |
| `bun run lint` | Run ESLint |
| `bun run format` | Format with Prettier |

## License

Private — all rights reserved.
