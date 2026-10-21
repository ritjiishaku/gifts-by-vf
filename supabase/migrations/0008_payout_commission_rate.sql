-- Record the commission rate used for each order, so a stored commission stays
-- explainable even if the rep's rate changes later.
-- Safe to run more than once.
alter table if not exists payouts add column if not exists commission_rate numeric;
