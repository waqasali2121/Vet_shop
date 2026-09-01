-- Migration: Customer Payments Table
-- Created: 2026-08-31

create table public.customer_payments (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references public.customers on delete restrict,
    amount numeric(14, 2) not null check (amount > 0),
    payment_method text not null check (payment_method in ('CASH', 'CREDIT', 'EASYPAISA', 'JAZZCASH', 'BANK_TRANSFER', 'CARD', 'OTHER')),
    previous_balance numeric(14, 2) not null,
    new_balance numeric(14, 2) not null,
    reference_number text,
    notes text,
    received_by uuid references public.profiles(id),
    payment_date timestamp with time zone not null default now(),
    created_at timestamp with time zone not null default now()
);

alter table public.customer_payments enable row level security;

create policy "Allow active users to view customer payments"
    on public.customer_payments for select
    using ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true) );

create policy "Allow active users to insert customer payments"
    on public.customer_payments for insert
    with check ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true) );

-- Add indexes for performance
create index idx_customer_payments_customer_id on public.customer_payments (customer_id);
create index idx_customer_payments_payment_date on public.customer_payments (payment_date);

comment on table public.customer_payments is 'Records payments received towards a customer''s overall balance';
comment on column public.customer_payments.amount is 'Payment amount received';
comment on column public.customer_payments.previous_balance is 'Outstanding balance before this payment';
comment on column public.customer_payments.new_balance is 'Outstanding balance after this payment';
