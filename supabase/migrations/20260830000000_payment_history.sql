-- Migration: Add Payment History Fields to sale_payments Table
-- Created: 2026-08-30

alter table public.sale_payments
add column if not exists previous_balance numeric(14, 2) default 0.00,
add column if not exists new_balance numeric(14, 2) default 0.00,
add column if not exists received_by uuid references public.profiles(id),
add column if not exists notes text;

comment on column public.sale_payments.previous_balance is 'Outstanding balance before this payment was recorded';
comment on column public.sale_payments.new_balance is 'Outstanding balance after this payment was recorded';
comment on column public.sale_payments.received_by is 'Cashier account who collected this payment';
comment on column public.sale_payments.notes is 'Optional payment memo/notes';
