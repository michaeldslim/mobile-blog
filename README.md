# Daily

A React Native / Expo mobile journal for writing, reading, and browsing posts. Sign in with Google via Supabase Auth, then publish Markdown entries with images and tags, browse a searchable feed, explore posts on a calendar, and manage drafts from your profile.

**Stack:** Supabase (Postgres + pg_graphql, Storage, RLS), TanStack Query, React Navigation, and EAS Build/Update for production releases and OTA updates.

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
  short_code text,
  title text not null,
  content text not null default '',
  is_good boolean not null default false,
  likes_count integer not null default 0,
  dislikes_count integer not null default 0,
  view_count integer not null default 0,
  image_url text,
  author_id text,
  author_name text,
  status text not null default 'published',
  published_at timestamptz,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table mobile_blogs is '@graphql({"name": "MobileBlog"})';
```

> **Existing projects:** if the table already exists, add any missing columns:
>
> ```sql
> alter table mobile_blogs add column if not exists short_code text;
> alter table mobile_blogs add column if not exists is_good boolean not null default false;
> alter table mobile_blogs add column if not exists published_at timestamptz;
> alter table mobile_blogs add column if not exists view_count integer not null default 0;
> ```

Also create the view count RPC function:

```sql
create or replace function increment_blog_view_count(post_id uuid)
returns void as $$
  update mobile_blogs set view_count = view_count + 1 where id = post_id;
$$ language sql security definer;
```

And the reactions RPC (allows any signed-in user to like/dislike published posts, bypassing author-only RLS):

```sql
create or replace function increment_blog_reaction(
  post_id uuid,
  delta_likes int,
  delta_dislikes int
)
returns table (likes_count int, dislikes_count int)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_likes int;
  new_dislikes int;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if delta_likes not between -1 and 1 or delta_dislikes not between -1 and 1 then
    raise exception 'Invalid reaction delta';
  end if;

  update mobile_blogs
  set
    likes_count = greatest(0, mobile_blogs.likes_count + delta_likes),
    dislikes_count = greatest(0, mobile_blogs.dislikes_count + delta_dislikes),
    updated_at = now()
  where mobile_blogs.id = post_id
    and (status = 'published' or author_id = auth.uid()::text)
  returning mobile_blogs.likes_count, mobile_blogs.dislikes_count
  into new_likes, new_dislikes;

  if not found then
    raise exception 'Post not found or not reactable';
  end if;

  return query select new_likes, new_dislikes;
end;
$$;

grant execute on function increment_blog_reaction(uuid, int, int) to authenticated;
```

> **Existing projects:** run the `increment_blog_reaction` block above in the Supabase SQL editor.

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

In Supabase → Authentication → URL Configuration:
- Add `mobile-blog://auth/callback` to **Redirect URLs**

In Google Cloud Console → OAuth client → Authorized redirect URIs:
- Add `https://your-project.supabase.co/auth/v1/callback`
- Add your Google account email to **Test users** (while app is in testing)

In [app.json](app.json), the deep link scheme is configured as `mobile-blog` (must match `src/constants/auth.ts`).

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
