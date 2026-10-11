-- Rep PINs for the sales portal.
-- The rep code stays public (it appears in referral links); the PIN is the
-- secret credential required to view a rep's payout history.
-- Run in the Supabase SQL editor (or via `supabase db push`).
alter table sales_reps add column if not exists pin_hash text;