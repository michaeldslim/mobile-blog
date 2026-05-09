-- Migration: create mobile_push_tokens table
-- Run this in the Supabase SQL Editor (or via supabase db push)

create table if not exists mobile_push_tokens (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  token       text        not null,
  platform    text        not null check (platform in ('ios', 'android', 'web')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, token)
);

-- Update updated_at automatically on row changes
create or replace function update_mobile_push_tokens_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger trg_mobile_push_tokens_updated_at
  before update on mobile_push_tokens
  for each row execute function update_mobile_push_tokens_updated_at();

-- Row-level security: users can only manage their own tokens
alter table mobile_push_tokens enable row level security;

create policy "Users can manage their own push tokens"
  on mobile_push_tokens
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index for fast lookups by user
create index if not exists mobile_push_tokens_user_id_idx
  on mobile_push_tokens (user_id);
