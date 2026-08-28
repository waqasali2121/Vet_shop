-- Salman Farsy Veterinary Store POS Database Schema
-- Created: 2026-08-28

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create updated_at utility function
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- 1. PROFILES TABLE (Linked to auth.users)
create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    email text not null unique,
    first_name text,
    last_name text,
    role text not null check (role in ('OWNER', 'MANAGER', 'CASHIER', 'INVENTORY')),
    is_active boolean not null default true,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Trigger to auto-update updated_at on profiles
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function update_updated_at_column();


-- 2. CATEGORIES TABLE
create table public.categories (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    description text,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

alter table public.categories enable row level security;

create trigger set_categories_updated_at
before update on public.categories
for each row execute function update_updated_at_column();


-- 3. BRANDS TABLE
create table public.brands (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    description text,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

alter table public.brands enable row level security;

create trigger set_brands_updated_at
before update on public.brands
for each row execute function update_updated_at_column();


-- 4. UNITS TABLE
create table public.units (
    id uuid primary key default gen_random_uuid(),
    name text not null unique, -- Vial, Box, Tab, bottle, kg etc.
    abbreviation text not null unique,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

alter table public.units enable row level security;

create trigger set_units_updated_at
before update on public.units
for each row execute function update_updated_at_column();


-- 5. PRODUCTS TABLE
create table public.products (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    generic_name text,
    sku text unique,
    barcode text unique,
    category_id uuid references public.categories on delete restrict,
    brand_id uuid references public.brands on delete restrict,
    manufacturer text,
    dosage_form text, -- Injection, Powder, Tablet, Liquid, etc.
    strength text, -- 10%, 100mg, etc.
    pack_size text, -- 100ml, 10x10 tabs, etc.
    unit_id uuid references public.units on delete restrict,
    purchase_price_reference numeric(14, 2) not null default 0.00 check (purchase_price_reference >= 0),
    retail_price numeric(14, 2) not null check (retail_price >= 0),
    wholesale_price numeric(14, 2) not null check (wholesale_price >= 0),
    minimum_sale_price numeric(14, 2) not null check (minimum_sale_price >= 0),
    minimum_stock integer not null default 5 check (minimum_stock >= 0),
    reorder_quantity integer not null default 10 check (reorder_quantity >= 0),
    track_batch boolean not null default true,
    track_expiry boolean not null default true,
    is_active boolean not null default true,
    created_by uuid references public.profiles,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint chk_min_sale_price check (minimum_sale_price <= retail_price)
);

alter table public.products enable row level security;

create trigger set_products_updated_at
before update on public.products
for each row execute function update_updated_at_column();


-- 6. SUPPLIERS TABLE
create table public.suppliers (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    phone text not null,
    email text,
    address text,
    contact_person text,
    opening_balance numeric(14, 2) not null default 0.00,
    current_balance numeric(14, 2) not null default 0.00,
    notes text,
    is_active boolean not null default true,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

alter table public.suppliers enable row level security;

create trigger set_suppliers_updated_at
before update on public.suppliers
for each row execute function update_updated_at_column();


-- 7. PRODUCT BATCHES TABLE
create table public.product_batches (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.products on delete restrict,
    batch_number text not null,
    manufacturing_date date,
    expiry_date date,
    purchase_item_id uuid, -- Link to purchase item if purchased later
    initial_quantity integer not null check (initial_quantity >= 0),
    available_quantity integer not null check (available_quantity >= 0),
    unit_cost numeric(14, 2) not null check (unit_cost >= 0),
    supplier_id uuid references public.suppliers on delete restrict,
    status text not null default 'ACTIVE' check (status in ('ACTIVE', 'EXPIRED', 'DAMAGED', 'RETURNED')),
    created_at timestamp with time zone not null default now(),
    constraint unique_product_batch unique (product_id, batch_number)
);

alter table public.product_batches enable row level security;


-- 8. CUSTOMERS TABLE
create table public.customers (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    phone text not null unique,
    customer_type text not null default 'WALK_IN' check (customer_type in ('WALK_IN', 'FARMER', 'DAIRY_FARM', 'POULTRY_FARM', 'VETERINARIAN', 'DEALER', 'PET_OWNER', 'OTHER')),
    credit_limit numeric(14, 2) not null default 0.00 check (credit_limit >= 0),
    current_balance numeric(14, 2) not null default 0.00, -- Debit (+) means customer owes us money (receivable)
    address text,
    is_active boolean not null default true,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

alter table public.customers enable row level security;

create trigger set_customers_updated_at
before update on public.customers
for each row execute function update_updated_at_column();


-- 9. CASH REGISTER SESSIONS
create table public.cash_register_sessions (
    id uuid primary key default gen_random_uuid(),
    cashier_id uuid not null references public.profiles,
    opened_at timestamp with time zone not null default now(),
    closed_at timestamp with time zone,
    opening_cash numeric(14, 2) not null check (opening_cash >= 0),
    expected_closing_cash numeric(14, 2) not null default 0.00 check (expected_closing_cash >= 0),
    actual_closing_cash numeric(14, 2),
    difference numeric(14, 2) not null default 0.00,
    status text not null default 'OPEN' check (status in ('OPEN', 'CLOSED')),
    notes text
);

alter table public.cash_register_sessions enable row level security;


-- 10. SALES TABLE
create table public.sales (
    id uuid primary key default gen_random_uuid(),
    invoice_number text not null unique,
    customer_id uuid not null references public.customers on delete restrict,
    cashier_id uuid not null references public.profiles,
    register_session_id uuid references public.cash_register_sessions,
    subtotal numeric(14, 2) not null check (subtotal >= 0),
    discount_amount numeric(14, 2) not null default 0.00 check (discount_amount >= 0),
    tax_amount numeric(14, 2) not null default 0.00 check (tax_amount >= 0),
    grand_total numeric(14, 2) not null check (grand_total >= 0),
    paid_amount numeric(14, 2) not null default 0.00 check (paid_amount >= 0),
    balance_amount numeric(14, 2) not null default 0.00,
    payment_status text not null check (payment_status in ('PAID', 'PARTIAL', 'CREDIT')),
    sale_status text not null default 'COMPLETED' check (sale_status in ('COMPLETED', 'VOIDED', 'RETURNED', 'PARTIALLY_RETURNED')),
    notes text,
    voided_at timestamp with time zone,
    voided_by uuid references public.profiles,
    void_reason text,
    created_at timestamp with time zone not null default now()
);

alter table public.sales enable row level security;


-- 11. SALE ITEMS TABLE
create table public.sale_items (
    id uuid primary key default gen_random_uuid(),
    sale_id uuid not null references public.sales on delete cascade,
    product_id uuid not null references public.products on delete restrict,
    quantity integer not null check (quantity > 0),
    unit_price numeric(14, 2) not null check (unit_price >= 0),
    unit_cost numeric(14, 2) not null check (unit_cost >= 0), -- COGS at the time of sale
    discount_amount numeric(14, 2) not null default 0.00 check (discount_amount >= 0),
    line_total numeric(14, 2) not null check (line_total >= 0)
);

alter table public.sale_items enable row level security;


-- 12. SALE BATCH ALLOCATIONS (Links sale items to specific batches)
create table public.sale_batch_allocations (
    id uuid primary key default gen_random_uuid(),
    sale_item_id uuid not null references public.sale_items on delete cascade,
    batch_id uuid not null references public.product_batches on delete restrict,
    quantity integer not null check (quantity > 0)
);

alter table public.sale_batch_allocations enable row level security;


-- 13. SALE PAYMENTS TABLE
create table public.sale_payments (
    id uuid primary key default gen_random_uuid(),
    sale_id uuid not null references public.sales on delete cascade,
    payment_method text not null check (payment_method in ('CASH', 'CREDIT', 'EASYPAISA', 'JAZZCASH', 'BANK_TRANSFER', 'CARD', 'OTHER')),
    amount numeric(14, 2) not null check (amount >= 0),
    transaction_reference text,
    created_at timestamp with time zone not null default now()
);

alter table public.sale_payments enable row level security;


-- 14. CUSTOMER LEDGER TABLE
create table public.customer_ledger (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references public.customers on delete restrict,
    transaction_type text not null check (transaction_type in ('OPENING_BALANCE', 'SALE', 'PAYMENT', 'RETURN', 'ADJUSTMENT')),
    reference_id uuid, -- ID of sale, payment collection etc.
    reference_number text, -- Invoice #, payment receipt #
    debit numeric(14, 2) not null default 0.00 check (debit >= 0),  -- Increase receivable (sales)
    credit numeric(14, 2) not null default 0.00 check (credit >= 0), -- Decrease receivable (payments, returns)
    running_balance numeric(14, 2) not null default 0.00,
    description text,
    created_at timestamp with time zone not null default now()
);

alter table public.customer_ledger enable row level security;


-- 15. PURCHASES TABLE
create table public.purchases (
    id uuid primary key default gen_random_uuid(),
    purchase_number text not null unique, -- PUR-YYYY-MM-XXXX
    supplier_id uuid not null references public.suppliers on delete restrict,
    supplier_invoice_number text,
    purchase_date date not null,
    subtotal numeric(14, 2) not null check (subtotal >= 0),
    discount_total numeric(14, 2) not null default 0.00 check (discount_total >= 0),
    grand_total numeric(14, 2) not null check (grand_total >= 0),
    paid_amount numeric(14, 2) not null default 0.00 check (paid_amount >= 0),
    balance_amount numeric(14, 2) not null default 0.00,
    payment_status text not null check (payment_status in ('PAID', 'PARTIAL', 'UNPAID')),
    status text not null default 'COMPLETED' check (status in ('COMPLETED', 'VOIDED', 'RETURNED')),
    notes text,
    created_by uuid references public.profiles,
    created_at timestamp with time zone not null default now()
);

alter table public.purchases enable row level security;


-- 16. PURCHASE ITEMS TABLE
create table public.purchase_items (
    id uuid primary key default gen_random_uuid(),
    purchase_id uuid not null references public.purchases on delete cascade,
    product_id uuid not null references public.products on delete restrict,
    quantity integer not null check (quantity > 0),
    bonus_quantity integer not null default 0 check (bonus_quantity >= 0),
    unit_cost numeric(14, 2) not null check (unit_cost >= 0),
    discount_amount numeric(14, 2) not null default 0.00 check (discount_amount >= 0),
    line_total numeric(14, 2) not null check (line_total >= 0),
    batch_number text not null,
    expiry_date date
);

alter table public.purchase_items enable row level security;


-- 17. PURCHASE PAYMENTS TABLE
create table public.purchase_payments (
    id uuid primary key default gen_random_uuid(),
    purchase_id uuid not null references public.purchases on delete cascade,
    payment_method text not null check (payment_method in ('CASH', 'EASYPAISA', 'JAZZCASH', 'BANK_TRANSFER', 'CARD', 'OTHER')),
    amount numeric(14, 2) not null check (amount >= 0),
    transaction_reference text,
    created_at timestamp with time zone not null default now()
);

alter table public.purchase_payments enable row level security;


-- 18. SUPPLIER LEDGER TABLE
create table public.supplier_ledger (
    id uuid primary key default gen_random_uuid(),
    supplier_id uuid not null references public.suppliers on delete restrict,
    transaction_type text not null check (transaction_type in ('OPENING_BALANCE', 'PURCHASE', 'PAYMENT', 'PURCHASE_RETURN', 'ADJUSTMENT')),
    reference_id uuid, -- purchase_id or payment_id
    reference_number text,
    debit numeric(14, 2) not null default 0.00 check (debit >= 0),  -- We paid supplier (decreases balance)
    credit numeric(14, 2) not null default 0.00 check (credit >= 0), -- Purchase (increases balance)
    running_balance numeric(14, 2) not null default 0.00,
    description text,
    created_at timestamp with time zone not null default now()
);

alter table public.supplier_ledger enable row level security;


-- 19. EXPENSE CATEGORIES TABLE
create table public.expense_categories (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    description text
);

alter table public.expense_categories enable row level security;


-- 20. EXPENSES TABLE
create table public.expenses (
    id uuid primary key default gen_random_uuid(),
    category_id uuid not null references public.expense_categories on delete restrict,
    amount numeric(14, 2) not null check (amount > 0),
    payment_method text not null check (payment_method in ('CASH', 'EASYPAISA', 'JAZZCASH', 'BANK_TRANSFER', 'CARD', 'OTHER')),
    description text,
    expense_date date not null default current_date,
    attachment_url text,
    register_session_id uuid references public.cash_register_sessions,
    created_by uuid references public.profiles,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

alter table public.expenses enable row level security;

create trigger set_expenses_updated_at
before update on public.expenses
for each row execute function update_updated_at_column();


-- 21. INVENTORY MOVEMENTS TABLE (Historical stock tracking)
create table public.inventory_movements (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.products on delete restrict,
    batch_id uuid not null references public.product_batches on delete restrict,
    movement_type text not null check (movement_type in ('OPENING_STOCK', 'PURCHASE', 'SALE', 'SALE_RETURN', 'PURCHASE_RETURN', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE', 'EXPIRY', 'TRANSFER_IN', 'TRANSFER_OUT')),
    quantity integer not null, -- Positive for addition, negative for reduction
    unit_cost numeric(14, 2) not null check (unit_cost >= 0),
    reference_type text not null check (reference_type in ('PURCHASE', 'SALE', 'SALE_RETURN', 'PURCHASE_RETURN', 'ADJUSTMENT', 'MANUAL')),
    reference_id uuid, -- sale_id, purchase_id, adjustment_id etc.
    notes text,
    created_by uuid references public.profiles,
    created_at timestamp with time zone not null default now()
);

alter table public.inventory_movements enable row level security;


-- 22. STOCK ADJUSTMENTS TABLE
create table public.stock_adjustments (
    id uuid primary key default gen_random_uuid(),
    adjustment_number text not null unique, -- ADJ-YYYY-MM-XXXX
    product_id uuid not null references public.products on delete restrict,
    batch_id uuid not null references public.product_batches on delete restrict,
    adjustment_type text not null check (adjustment_type in ('PHYSICAL_COUNT', 'DAMAGED', 'EXPIRED', 'MISSING', 'CORRECTION', 'OPENING_STOCK', 'OTHER')),
    quantity integer not null, -- Positive or negative
    reason text not null,
    notes text,
    created_by uuid references public.profiles,
    created_at timestamp with time zone not null default now()
);

alter table public.stock_adjustments enable row level security;


-- 23. CASH REGISTER MOVEMENTS (Tracks cash in/out during active sessions)
create table public.cash_register_movements (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.cash_register_sessions on delete cascade,
    movement_type text not null check (movement_type in ('CASH_SALE', 'CUSTOMER_COLLECTION', 'CASH_EXPENSE', 'SUPPLIER_PAYMENT', 'CASH_REFUND', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT')),
    amount numeric(14, 2) not null, -- Positive for inflow, negative for outflow
    reference_id uuid, -- sale_id, expense_id, payment_id etc.
    notes text,
    created_at timestamp with time zone not null default now()
);

alter table public.cash_register_movements enable row level security;


-- 24. SALE RETURNS TABLE
create table public.sale_returns (
    id uuid primary key default gen_random_uuid(),
    return_number text not null unique, -- SR-YYYY-MM-XXXX
    sale_id uuid not null references public.sales on delete restrict,
    cashier_id uuid not null references public.profiles,
    register_session_id uuid references public.cash_register_sessions,
    refund_amount numeric(14, 2) not null default 0.00 check (refund_amount >= 0),
    refund_method text not null check (refund_method in ('CASH', 'CREDIT_OFFSET', 'EASYPAISA', 'JAZZCASH', 'BANK_TRANSFER', 'CARD', 'OTHER')),
    return_reason text,
    created_at timestamp with time zone not null default now()
);

alter table public.sale_returns enable row level security;


-- 25. SALE RETURN ITEMS TABLE
create table public.sale_return_items (
    id uuid primary key default gen_random_uuid(),
    return_id uuid not null references public.sale_returns on delete cascade,
    sale_item_id uuid not null references public.sale_items on delete restrict,
    product_id uuid not null references public.products on delete restrict,
    batch_id uuid not null references public.product_batches on delete restrict,
    quantity integer not null check (quantity > 0),
    unit_price numeric(14, 2) not null check (unit_price >= 0),
    refund_total numeric(14, 2) not null check (refund_total >= 0),
    restocked boolean not null default true
);

alter table public.sale_return_items enable row level security;


-- 26. PURCHASE RETURNS TABLE
create table public.purchase_returns (
    id uuid primary key default gen_random_uuid(),
    return_number text not null unique, -- PR-YYYY-MM-XXXX
    purchase_id uuid not null references public.purchases on delete restrict,
    return_date date not null default current_date,
    refund_amount numeric(14, 2) not null default 0.00 check (refund_amount >= 0),
    refund_method text not null check (refund_method in ('CASH', 'CREDIT_OFFSET', 'EASYPAISA', 'JAZZCASH', 'BANK_TRANSFER', 'CARD', 'OTHER')),
    return_reason text,
    created_by uuid references public.profiles,
    created_at timestamp with time zone not null default now()
);

alter table public.purchase_returns enable row level security;


-- 27. PURCHASE RETURN ITEMS TABLE
create table public.purchase_return_items (
    id uuid primary key default gen_random_uuid(),
    return_id uuid not null references public.purchase_returns on delete cascade,
    purchase_item_id uuid not null references public.purchase_items on delete restrict,
    product_id uuid not null references public.products on delete restrict,
    batch_id uuid not null references public.product_batches on delete restrict,
    quantity integer not null check (quantity > 0),
    unit_cost numeric(14, 2) not null check (unit_cost >= 0),
    refund_total numeric(14, 2) not null check (refund_total >= 0)
);

alter table public.purchase_return_items enable row level security;


-- 28. DAILY CLOSINGS
create table public.daily_closings (
    id uuid primary key default gen_random_uuid(),
    closing_date date not null unique,
    total_sales numeric(14, 2) not null default 0.00,
    cash_sales numeric(14, 2) not null default 0.00,
    credit_sales numeric(14, 2) not null default 0.00,
    digital_payments numeric(14, 2) not null default 0.00,
    sales_returns numeric(14, 2) not null default 0.00,
    cogs numeric(14, 2) not null default 0.00,
    gross_profit numeric(14, 2) not null default 0.00,
    expenses numeric(14, 2) not null default 0.00,
    customer_collections numeric(14, 2) not null default 0.00,
    supplier_payments numeric(14, 2) not null default 0.00,
    invoices_count integer not null default 0,
    items_sold integer not null default 0,
    opening_cash numeric(14, 2) not null default 0.00,
    expected_closing_cash numeric(14, 2) not null default 0.00,
    actual_cash numeric(14, 2) not null default 0.00,
    cash_difference numeric(14, 2) not null default 0.00,
    closed_by uuid references public.profiles,
    created_at timestamp with time zone not null default now()
);

alter table public.daily_closings enable row level security;


-- 29. AUDIT LOGS TABLE
create table public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles,
    action text not null,
    module text not null,
    entity_type text,
    entity_id uuid,
    old_data jsonb,
    new_data jsonb,
    reason text,
    created_at timestamp with time zone not null default now()
);

alter table public.audit_logs enable row level security;


-- 30. STORE SETTINGS TABLE
create table public.store_settings (
    id uuid primary key default gen_random_uuid(),
    store_name text not null default 'Salman Farsy Veterinary Store',
    logo_url text,
    phone text not null default '0300-0000000',
    address text not null default 'Salman Farsy Vet Store, Pakistan',
    currency text not null default 'PKR',
    timezone text not null default 'Asia/Karachi',
    invoice_prefix text not null default 'SFV',
    purchase_prefix text not null default 'PUR',
    allow_negative_stock boolean not null default false,
    allow_expired_sale boolean not null default false,
    enable_fefo boolean not null default true,
    default_customer_id uuid, -- Reference to Walk-in customer ID
    default_receipt_size text not null default '80mm',
    updated_at timestamp with time zone not null default now()
);

alter table public.store_settings enable row level security;

create trigger set_store_settings_updated_at
before update on public.store_settings
for each row execute function update_updated_at_column();
