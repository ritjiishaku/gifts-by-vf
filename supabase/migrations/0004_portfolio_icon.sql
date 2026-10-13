-- Optional icon badge for portfolio pieces.
-- Run in the Supabase SQL editor (or via `supabase db push`).
alter table portfolio add column if not exists icon text;
