-- الفتح لتجارة الورق: مخطط قاعدة البيانات الأولي
-- نفّذ الملف بالكامل من Supabase Dashboard > SQL Editor.
-- Row Level Security تجعل كل سجل تابعاً للمستخدم الذي سجّل دخوله.

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  kind text not null check (kind in ('income','expense')),
  amount numeric(12,2) not null check (amount > 0),
  party text,
  description text,
  transaction_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists employees_owner_id_idx on public.employees(owner_id);
create index if not exists transactions_owner_date_idx on public.transactions(owner_id, transaction_date desc);
create index if not exists transactions_employee_idx on public.transactions(employee_id);

alter table public.employees enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "owner manages employees" on public.employees;
create policy "owner manages employees" on public.employees
for all to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists "owner manages transactions" on public.transactions;
create policy "owner manages transactions" on public.transactions
for all to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.employees e
    where e.id = employee_id and e.owner_id = (select auth.uid())
  )
);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.employees to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
