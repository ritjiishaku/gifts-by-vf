-- Record the commission rate used for each order, so a stored commission stays
-- explainable even if the rep's rate changes later.
-- Safe to run more than once.
--
-- NOTE: PostgreSQL has no `ALTER TABLE IF NOT EXISTS` form (only `IF EXISTS`);
-- the idempotency guard for a column is `ADD COLUMN IF NOT EXISTS`.
alter table payouts add column if not exists commission_rate numeric;
