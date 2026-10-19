-- Rep notifications (new order / deal closed) — run in the Supabase SQL editor.
create table if not exists notifications (
  id bigint generated always as identity primary key,
  rep_id text not null,              -- sales_reps.rep_id (text, matches payouts.rep_id)
  type text not null,                -- 'new_order' | 'deal_closed'
  title text not null,
  body text,
  payout_id bigint references payouts(id) on delete set null,  -- info survives order deletion
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_rep_idx
  on notifications (rep_id, is_read, created_at desc);

alter table notifications enable row level security;  -- deny-all for anon; server uses service role
