create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  name text,
  plan text not null default 'basic',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_email on public.profiles(email);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, plan)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), ''),
    'basic'
  )
  on conflict (id) do update
    set email = excluded.email,
        name = coalesce(excluded.name, public.profiles.name),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
    set email = new.email,
        updated_at = now()
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;

create trigger on_auth_user_email_updated
after update of email on auth.users
for each row execute function public.handle_user_email_update();

create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  extracted_text text,
  created_at timestamptz not null default now()
);

create table if not exists public.decks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  color text default '#3b82f6',
  created_at timestamptz not null default now()
);

create table if not exists public.flashcards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  deck_id uuid references public.decks(id) on delete set null,
  question text not null,
  answer text not null,
  notes text,
  tags text[] not null default '{}'::text[],
  repetition int not null default 0,
  interval_days int not null default 1,
  ease_factor numeric not null default 2.5,
  knowledge_level text not null default 'normal',
  due_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.flashcard_reviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  flashcard_id uuid not null references public.flashcards(id) on delete cascade,
  quality int not null,
  response_time_ms int not null default 0,
  previous_repetition int not null,
  next_repetition int not null,
  previous_interval_days int not null,
  next_interval_days int not null,
  previous_knowledge_level text not null,
  next_knowledge_level text not null,
  reviewed_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.decks enable row level security;
alter table public.flashcards enable row level security;
alter table public.flashcard_reviews enable row level security;

create policy "profiles owner" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "documents owner" on public.documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "decks owner" on public.decks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "flashcards owner" on public.flashcards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "flashcard reviews owner" on public.flashcard_reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Índices para performance
create index if not exists idx_flashcards_user_deck on public.flashcards(user_id, deck_id);
create index if not exists idx_flashcards_user_due_at on public.flashcards(user_id, due_at);
create index if not exists idx_flashcards_user_knowledge on public.flashcards(user_id, knowledge_level);
create index if not exists idx_decks_user_id on public.decks(user_id);
create index if not exists idx_reviews_flashcard_id on public.flashcard_reviews(flashcard_id);
