# The Async Journal

A React Native / Expo mobile blog app built with Google OAuth, Supabase, GraphQL, and TanStack Query.

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
  view_count integer not null default 0,
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

Also create the view count RPC function:

```sql
create or replace function increment_blog_view_count(post_id uuid)
returns void as $$
  update mobile_blogs set view_count = view_count + 1 where id = post_id;
$$ language sql security definer;
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

## EAS (Expo Application Services)

This project uses **EAS Build** for cloud builds and **EAS Update** for over-the-air (OTA) JS updates.

### Setup

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Log in to your Expo account
eas login

# Link this project to EAS (first time only)
eas init
```

### Build

```bash
# Build for production (Android AAB + iOS IPA)
eas build --platform android --profile production
eas build --platform ios --profile production

# Build both platforms at once
eas build --platform all --profile production
```

> Builds run on Expo's cloud servers. When complete, a download link for the `.aab` / `.ipa` is provided.

### OTA Update (JS-only changes)

Use this instead of a full store release when only JavaScript/assets changed.

```bash
# Push an OTA update to production
eas update --channel production --message "Fix bug / update description"
```

> OTA updates are only delivered to devices whose `runtimeVersion` matches. A new binary build is required when native code changes.

### Channels

| Profile | Channel | Purpose |
|---|---|---|
| `development` | `development` | Dev client builds |
| `production` | `production` | App Store / Play Store |
