# The Async Journal

A React Native / Expo mobile blog app built with Google OAuth, Supabase, GraphQL, and TanStack Query.

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Expo SDK 55 (blank TypeScript) |
| Navigation | React Navigation 7 — bottom tabs + native stack |
| Auth | Supabase Google OAuth (implicit flow) + `expo-web-browser` |
| Database | Supabase `mobile_blogs` table via `pg_graphql` |
| Data fetching | TanStack Query v5 — infinite scroll, mutations, optimistic updates |
| GraphQL client | `graphql-request` |
| Storage | Supabase Storage (`blog-images` bucket) |
| Image handling | `expo-image-picker` (legacy mode) + `expo-image-manipulator` + `expo-file-system` |
| PDF generation | `expo-print` — renders post as HTML → system print/PDF dialog |
| Session persistence | `@react-native-async-storage/async-storage` |
| Themes | 3 built-in — Dark Green (default), Dark Teal, Light Neutral |

---

## Features

| Feature | Status |
|---|---|
| Google OAuth login (implicit flow via Supabase) | ✅ |
| Blog feed with infinite scroll | ✅ |
| Full-text search with debounce (300ms) + clear button | ✅ |
| Tag filtering | ✅ |
| Image lightbox (tap to expand) | ✅ |
| Like / Dislike toggle with AsyncStorage persistence | ✅ |
| Create / Edit post (title, body, image, tags, status) | ✅ |
| Delete post (with image cleanup from Storage) | ✅ |
| Draft / Published status toggle | ✅ |
| Image upload (compress → base64 → Supabase Storage) | ✅ |
| Post detail — title → body → image → tags → date | ✅ |
| Feed cards — title → preview → image → tags → date | ✅ |
| Share post as PDF via system print dialog | ✅ |
| 3-theme switcher (persisted) | ✅ |
| Author-based access control | ✅ |
| Admin override via `EXPO_PUBLIC_ADMIN_EMAILS` | ✅ |
| Custom safe Markdown renderer | ✅ |
| Profile screen (my posts, theme picker, sign out) | ✅ |

---

## Setup

### 1. Clone & install

```bash
cd mobile-blog
npm install
```

### 2. Configure environment

Create a `.env.local` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_ADMIN_EMAILS=you@example.com
```

### 3. Supabase setup

#### 3.1 Database

Create the `mobile_blogs` table with pg_graphql rename annotations for clean camelCase GraphQL names:

```sql
create table mobile_blogs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null default '',
  likes_count integer not null default 0,
  dislikes_count integer not null default 0,
  image_url text,
  author_id text,
  author_name text,
  status text not null default 'published',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table mobile_blogs is '@graphql({"name": "MobileBlog"})';
```

#### 3.2 RLS Policies

```sql
alter table mobile_blogs enable row level security;

create policy "Public blogs viewable by everyone"
  on mobile_blogs for select using (status = 'published');

create policy "Users can view their own drafts"
  on mobile_blogs for select using (auth.uid()::text = author_id);

create policy "Users can create blogs"
  on mobile_blogs for insert with check (auth.uid()::text = author_id);

create policy "Authors can update own posts"
  on mobile_blogs for update using (auth.uid()::text = author_id);

create policy "Authors can delete own posts"
  on mobile_blogs for delete using (auth.uid()::text = author_id);
```

#### 3.3 Storage bucket

In Supabase → Storage → New bucket:
- Name: `blog-images`
- Public: ✅

Add policies: `SELECT` for everyone, `INSERT/UPDATE/DELETE` for authenticated users.

#### 3.4 Google OAuth

In Supabase → Authentication → Providers → Google:
- Enable Google provider, add Client ID and Secret
- Add `https://your-project.supabase.co/auth/v1/callback` to Google Cloud OAuth allowed redirects
- Add `mobile-blog://auth/callback` to Google Cloud OAuth allowed redirects
- Add your Google account email to **Test users** in Google Cloud Console (while app is in testing)

In [app.json](app.json), the deep link scheme is already configured as `mobile-blog`.

### 4. Run

```bash
npm run android  # Android emulator
npm run ios      # iOS simulator
npm start        # Expo Go / dev build
```

---

## Notes

- **Image upload on Android:** `expo-file-system/legacy` is required to read files as base64 on Android. The standard `expo-file-system` import does not expose `readAsStringAsync`.
- **Image picker legacy mode:** `expo-image-picker` is configured with `legacy: true` in app.json to avoid the new UI that breaks on some Android versions.
- **OAuth implicit flow:** The app uses Supabase's implicit OAuth flow (token in URL fragment). PKCE is not used. After redirect, the app parses the `#access_token=...` fragment from the deep link and calls `supabase.auth.setSession()`.
- **Like/dislike persistence:** Likes and dislikes are stored in `AsyncStorage` on-device only — they do not write back to the database. The `likes_count` / `dislikes_count` columns in Supabase are not mutated by the app.
- **PDF share:** The share button in PostDetailScreen calls `expo-print`'s `printAsync({ html })`. It builds a styled HTML document from the post content (title, author, date, body, tags, footer) and opens the Android system print dialog, which includes a "Save as PDF" option. `expo-print` is a JS-only package — it does **not** need an entry in the `plugins` array of app.json.
