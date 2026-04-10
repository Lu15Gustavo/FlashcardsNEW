create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  plan text not null default 'basic',
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  extracted_text text,
  created_at timestamptz not null default now()
);

create table if not exists public.flashcards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
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
alter table public.flashcards enable row level security;
alter table public.flashcard_reviews enable row level security;

create policy "profiles owner" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "documents owner" on public.documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "flashcards owner" on public.flashcards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "flashcard reviews owner" on public.flashcard_reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
