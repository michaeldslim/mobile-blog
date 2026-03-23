# The Async Journal

A React Native / Expo mobile app based on [react-blog](../react-blog), built with:

- **Expo** (SDK 55, blank TypeScript template)
- **React Navigation** — bottom tabs + native stacks
- **Supabase** — auth (Google OAuth) + storage (image upload)
- **Supabase pg_graphql** — GraphQL endpoint auto-generated from the `blogs` table
- **TanStack Query v5** — infinite scroll, mutations, optimistic updates
- **graphql-request** — lightweight GraphQL client
- **Three themes** — Dark Green (default), Dark Teal, Light Neutral (matches react-blog)

---

## Features

| Feature | Status |
|---|---|
| Google OAuth login (via Supabase) | ✅ |
| Blog feed with infinite scroll | ✅ |
| Full-text search (debounced 300ms) | ✅ |
| Tag filtering | ✅ |
| Post detail with image lightbox | ✅ |
| Like / Dislike (optimistic updates) | ✅ |
| Create post (title, body, image, tags, status) | ✅ |
| Edit post | ✅ |
| Delete post (with image cleanup) | ✅ |
| Draft / Published status toggle | ✅ |
| Image upload (compressed via expo-image-manipulator) | ✅ |
| 3-theme switcher | ✅ |
| Author-based access control | ✅ |
| Admin override via `EXPO_PUBLIC_ADMIN_EMAILS` | ✅ |
| Custom safe Markdown renderer (no vulnerable deps) | ✅ |
| Profile screen (my posts, theme, sign out) | ✅ |

---

## Setup

### 1. Clone & install

```bash
cd mobile-blog
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_ADMIN_EMAILS=you@example.com
```

### 3. Supabase setup

#### 3.1 Database (same schema as react-blog)

```sql
create table blogs (
  id uuid primary key default gen_random_uuid(),
  short_code text unique,
  title text not null,
  content text not null default '',
  is_good boolean not null default false,
  likes_count integer not null default 0,
  dislikes_count integer not null default 0,
  image_url text,
  author_id text,
  author_name text,
  status text not null default 'published',
  published_at timestamptz,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable pg_graphql extension (already enabled in most Supabase projects)
-- The /graphql/v1 endpoint is available automatically.
```

#### 3.2 Storage bucket

Create a public bucket named `blog-images` in Supabase Storage.

#### 3.3 RLS Policies (recommended)

```sql
-- Allow anyone to read published blogs
create policy "Public blogs are viewable by everyone"
  on blogs for select using (status = 'published');

-- Allow authenticated users to read their own drafts
create policy "Users can view their own drafts"
  on blogs for select using (auth.uid()::text = author_id);

-- Allow authenticated users to insert their own blogs
create policy "Users can create blogs"
  on blogs for insert with check (auth.uid()::text = author_id);

-- Allow authors to update/delete their own posts
create policy "Authors can update own posts"
  on blogs for update using (auth.uid()::text = author_id);

create policy "Authors can delete own posts"
  on blogs for delete using (auth.uid()::text = author_id);
```

#### 3.4 Google OAuth

In Supabase → Authentication → Providers → Google:
- Enable Google provider
- Add your Google OAuth Client ID and Secret
- Add the redirect URL to your Google Cloud OAuth credentials:
  `https://your-project.supabase.co/auth/v1/callback`

Also add your Expo redirect URI to the Google allowed list:
- `mobile-blog://auth/callback`

### 4. Run

```bash
npm run ios      # iOS simulator
npm run android  # Android emulator
npm start        # Expo Go / dev build
```

---

## Project Structure

```
src/
├── components/
│   ├── EmptyState.tsx
│   ├── LoadingSpinner.tsx
│   ├── MarkdownContent.tsx       # Custom safe markdown renderer
│   ├── PostCard.tsx
│   └── TagPill.tsx
├── constants/
│   └── theme.ts                  # All 3 themes (dark-green, dark-teal, light-neutral)
├── contexts/
│   ├── AuthContext.tsx           # Supabase auth + Google OAuth
│   └── ThemeContext.tsx          # Theme switching + persistence
├── hooks/
│   └── useBlogs.ts               # All TanStack Query hooks (CRUD + like/dislike)
├── lib/
│   ├── graphql.ts                # pg_graphql queries/mutations + filter builders
│   ├── imageUpload.ts            # Image pick + compress + Supabase upload
│   └── supabase.ts               # Supabase client (AsyncStorage session)
├── navigation/
│   ├── index.tsx                 # Navigator definitions
│   └── types.ts                  # Param list types (separated to avoid circular imports)
├── screens/
│   ├── CreateEditPostScreen.tsx  # Create & edit form (shared)
│   ├── FeedScreen.tsx            # Blog list + search + tag filter
│   ├── LoginScreen.tsx           # Google OAuth login
│   ├── PostDetailScreen.tsx      # Full post + reactions + lightbox
│   └── ProfileScreen.tsx        # User profile + my posts + theme switcher
└── types/
    └── index.ts                  # Shared TypeScript types
```

---

## Suggestions / Known Limitations

See the "Suggestions" section at the end of the chat for full recommendations.
