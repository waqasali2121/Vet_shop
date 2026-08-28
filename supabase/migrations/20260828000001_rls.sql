-- Salman Farsy Veterinary Store POS - RLS Policies
-- Created: 2026-08-28

-- 1. Helper Function to get current user's role
create or replace function public.get_user_role()
returns text as $$
declare
  user_role text;
begin
  select role into user_role from public.profiles where id = auth.uid();
  return user_role;
end;
$$ language plpgsql security definer;

-- 2. Helper to check if user is active
create or replace function public.is_active_user()
returns boolean as $$
declare
  active boolean;
begin
  select is_active into active from public.profiles where id = auth.uid();
  return coalesce(active, false);
end;
$$ language plpgsql security definer;


-- PROFILES POLICIES
create policy "Allow active users to read all profiles"
    on public.profiles for select
    using (auth.uid() is not null and is_active_user());

create policy "Allow users to update their own profile"
    on public.profiles for update
    using (auth.uid() = id and is_active_user());

create policy "Allow OWNER and MANAGER to manage all profiles"
    on public.profiles for all
    using (auth.uid() is not null and is_active_user() and get_user_role() in ('OWNER', 'MANAGER'));


-- CATEGORIES POLICIES
create policy "Allow active users to view categories"
    on public.categories for select
    using (auth.uid() is not null and is_active_user());

create policy "Allow OWNER, MANAGER, INVENTORY to create categories"
    on public.categories for insert
    with check (auth.uid() is not null and is_active_user() and get_user_role() in ('OWNER', 'MANAGER', 'INVENTORY'));

create policy "Allow OWNER, MANAGER to update categories"
    on public.categories for update
    using (auth.uid() is not null and is_active_user() and get_user_role() in ('OWNER', 'MANAGER'));


-- BRANDS POLICIES
create policy "Allow active users to view brands"
    on public.brands for select
    using (auth.uid() is not null and is_active_user());

create policy "Allow OWNER, MANAGER, INVENTORY to create brands"
    on public.brands for insert
    with check (auth.uid() is not null and is_active_user() and get_user_role() in ('OWNER', 'MANAGER', 'INVENTORY'));

create policy "Allow OWNER, MANAGER to update brands"
    on public.brands for update
    using (auth.uid() is not null and is_active_user() and get_user_role() in ('OWNER', 'MANAGER'));


-- UNITS POLICIES
create policy "Allow active users to view units"
    on public.units for select
    using (auth.uid() is not null and is_active_user());

create policy "Allow OWNER, MANAGER to manage units"
    on public.units for all
    using (auth.uid() is not null and is_active_user() and get_user_role() in ('OWNER', 'MANAGER'));


-- PRODUCTS POLICIES
create policy "Allow active users to view products"
    on public.products for select
    using (auth.uid() is not null and is_active_user());

create policy "Allow OWNER, MANAGER, INVENTORY to create and update products"
    on public.products for all
    using (auth.uid() is not null and is_active_user() and get_user_role() in ('OWNER', 'MANAGER', 'INVENTORY'));


-- SUPPLIERS POLICIES
create policy "Allow active users to view suppliers"
    on public.suppliers for select
    using (auth.uid() is not null and is_active_user());

create policy "Allow OWNER, MANAGER, INVENTORY to manage suppliers"
    on public.suppliers for all
    using (auth.uid() is not null and is_active_user() and get_user_role() in ('OWNER', 'MANAGER', 'INVENTORY'));


-- PRODUCT BATCHES POLICIES
create policy "Allow active users to view batches"
    on public.product_batches for select
    using (auth.uid() is not null and is_active_user());

create policy "Allow OWNER, MANAGER, INVENTORY to manage batches"
    on public.product_batches for all
    using (auth.uid() is not null and is_active_user() and get_user_role() in ('OWNER', 'MANAGER', 'INVENTORY'));


-- CUSTOMERS POLICIES
create policy "Allow active users to view customers"
    on public.customers for select
    using (auth.uid() is not null and is_active_user());

create policy "Allow active users to create and update customers"
    on public.customers for all
    using (auth.uid() is not null and is_active_user());


-- CASH REGISTER SESSIONS POLICIES
create policy "Allow active users to view register sessions"
    on public.cash_register_sessions for select
    using (auth.uid() is not null and is_active_user());

create policy "Allow active users to create and update sessions"
    on public.cash_register_sessions for all
    using (auth.uid() is not null and is_active_user());


-- SALES POLICIES
create policy "Allow active users to view sales"
    on public.sales for select
    using (auth.uid() is not null and is_active_user());

create policy "Allow active users to create sales"
    on public.sales for insert
    with check (auth.uid() is not null and is_active_user());

create policy "Allow OWNER, MANAGER to void sales"
    on public.sales for update
    using (auth.uid() is not null and is_active_user() and get_user_role() in ('OWNER', 'MANAGER'));


-- SALE ITEMS & ALLOCATIONS POLICIES
create policy "Allow active users to view sale items"
    on public.sale_items for select
    using (auth.uid() is not null and is_active_user());

create policy "Allow active users to create sale items"
    on public.sale_items for insert
    with check (auth.uid() is not null and is_active_user());

create policy "Allow active users to view sale batch allocations"
    on public.sale_batch_allocations for select
    using (auth.uid() is not null and is_active_user());

create policy "Allow active users to create sale batch allocations"
    on public.sale_batch_allocations for insert
    with check (auth.uid() is not null and is_active_user());


-- SALE PAYMENTS POLICIES
create policy "Allow active users to view sale payments"
    on public.sale_payments for select
    using (auth.uid() is not null and is_active_user());

create policy "Allow active users to create sale payments"
    on public.sale_payments for insert
    with check (auth.uid() is not null and is_active_user());


-- CUSTOMER LEDGER POLICIES
create policy "Allow active users to view customer ledger"
    on public.customer_ledger for select
    using (auth.uid() is not null and is_active_user());

create policy "Allow active users to create customer ledger entries"
    on public.customer_ledger for insert
    with check (auth.uid() is not null and is_active_user());


-- PURCHASES & ITEMS & PAYMENTS POLICIES
create policy "Allow OWNER, MANAGER, INVENTORY to view purchases"
    on public.purchases for select
    using (auth.uid() is not null and is_active_user() and get_user_role() in ('OWNER', 'MANAGER', 'INVENTORY'));

create policy "Allow OWNER, MANAGER, INVENTORY to create purchases"
    on public.purchases for insert
    with check (auth.uid() is not null and is_active_user() and get_user_role() in ('OWNER', 'MANAGER', 'INVENTORY'));

create policy "Allow OWNER, MANAGER, INVENTORY to view purchase items"
    on public.purchase_items for select
    using (auth.uid() is not null and is_active_user() and get_user_role() in ('OWNER', 'MANAGER', 'INVENTORY'));

create policy "Allow OWNER, MANAGER, INVENTORY to create purchase items"
    on public.purchase_items for insert
    with check (auth.uid() is not null and is_active_user() and get_user_role() in ('OWNER', 'MANAGER', 'INVENTORY'));

create policy "Allow OWNER, MANAGER, INVENTORY to view purchase payments"
    on public.purchase_payments for select
    using (auth.uid() is not null and is_active_user() and get_user_role() in ('OWNER', 'MANAGER', 'INVENTORY'));

create policy "Allow OWNER, MANAGER, INVENTORY to create purchase payments"
    on public.purchase_payments for insert
    with check (auth.uid() is not null and is_active_user() and get_user_role() in ('OWNER', 'MANAGER', 'INVENTORY'));


-- SUPPLIER LEDGER POLICIES
create policy "Allow OWNER, MANAGER, INVENTORY to view supplier ledger"
    on public.supplier_ledger for select
    using (auth.uid() is not null and is_active_user() and get_user_role() in ('OWNER', 'MANAGER', 'INVENTORY'));

create policy "Allow OWNER, MANAGER, INVENTORY to create supplier ledger entries"
    on public.supplier_ledger for insert
    with check (auth.uid() is not null and is_active_user() and get_user_role() in ('OWNER', 'MANAGER', 'INVENTORY'));


-- EXPENSE CATEGORIES & EXPENSES POLICIES
create policy "Allow active users to view expense categories"
    on public.expense_categories for select
    using (auth.uid() is not null and is_active_user());

create policy "Allow OWNER, MANAGER to manage expense categories"
    on public.expense_categories for all
    using (auth.uid() is not null and is_active_user() and get_user_role() in ('OWNER', 'MANAGER'));

create policy "Allow OWNER, MANAGER to view expenses"
    on public.expenses for select
    using (auth.uid() is not null and is_active_user() and get_user_role() in ('OWNER', 'MANAGER'));

create policy "Allow active users to create expenses"
    on public.expenses for insert
    with check (auth.uid() is not null and is_active_user());


-- INVENTORY MOVEMENTS POLICIES
create policy "Allow active users to view inventory movements"
    on public.inventory_movements for select
    using (auth.uid() is not null and is_active_user());

create policy "Allow active users to create inventory movements"
    on public.inventory_movements for insert
    with check (auth.uid() is not null and is_active_user());


-- STOCK ADJUSTMENTS POLICIES
create policy "Allow active users to view stock adjustments"
    on public.stock_adjustments for select
    using (auth.uid() is not null and is_active_user());

create policy "Allow OWNER, MANAGER, INVENTORY to create stock adjustments"
    on public.stock_adjustments for insert
    with check (auth.uid() is not null and is_active_user() and get_user_role() in ('OWNER', 'MANAGER', 'INVENTORY'));


-- CASH REGISTER MOVEMENTS POLICIES
create policy "Allow active users to view register movements"
    on public.cash_register_movements for select
    using (auth.uid() is not null and is_active_user());

create policy "Allow active users to create register movements"
    on public.cash_register_movements for insert
    with check (auth.uid() is not null and is_active_user());


-- SALE & PURCHASE RETURNS POLICIES
create policy "Allow active users to view sale returns"
    on public.sale_returns for select
    using (auth.uid() is not null and is_active_user());

create policy "Allow OWNER, MANAGER to create sale returns"
    on public.sale_returns for insert
    with check (auth.uid() is not null and is_active_user() and get_user_role() in ('OWNER', 'MANAGER'));

create policy "Allow active users to view sale return items"
    on public.sale_return_items for select
    using (auth.uid() is not null and is_active_user());

create policy "Allow OWNER, MANAGER to create sale return items"
    on public.sale_return_items for insert
    with check (auth.uid() is not null and is_active_user() and get_user_role() in ('OWNER', 'MANAGER'));

create policy "Allow OWNER, MANAGER to view purchase returns"
    on public.purchase_returns for select
    using (auth.uid() is not null and is_active_user() and get_user_role() in ('OWNER', 'MANAGER'));

create policy "Allow OWNER, MANAGER to create purchase returns"
    on public.purchase_returns for insert
    with check (auth.uid() is not null and is_active_user() and get_user_role() in ('OWNER', 'MANAGER'));

create policy "Allow OWNER, MANAGER to view purchase return items"
    on public.purchase_return_items for select
    using (auth.uid() is not null and is_active_user() and get_user_role() in ('OWNER', 'MANAGER'));

create policy "Allow OWNER, MANAGER to create purchase return items"
    on public.purchase_return_items for insert
    with check (auth.uid() is not null and is_active_user() and get_user_role() in ('OWNER', 'MANAGER'));


-- DAILY CLOSINGS POLICIES
create policy "Allow OWNER, MANAGER to view daily closings"
    on public.daily_closings for select
    using (auth.uid() is not null and is_active_user() and get_user_role() in ('OWNER', 'MANAGER'));

create policy "Allow OWNER, MANAGER to create daily closings"
    on public.daily_closings for insert
    with check (auth.uid() is not null and is_active_user() and get_user_role() in ('OWNER', 'MANAGER'));


-- AUDIT LOGS POLICIES
create policy "Allow OWNER, MANAGER to view audit logs"
    on public.audit_logs for select
    using (auth.uid() is not null and is_active_user() and get_user_role() in ('OWNER', 'MANAGER'));

create policy "Allow active users to write audit logs"
    on public.audit_logs for insert
    with check (auth.uid() is not null and is_active_user());


-- STORE SETTINGS POLICIES
create policy "Allow active users to view settings"
    on public.store_settings for select
    using (auth.uid() is not null and is_active_user());

create policy "Allow OWNER to manage settings"
    on public.store_settings for all
    using (auth.uid() is not null and is_active_user() and get_user_role() = 'OWNER');
