-- Salman Farsy Veterinary Store POS - Indexes for Performance
-- Created: 2026-08-28

-- Products Search Indexes
create index idx_products_name on public.products (name);
create index idx_products_sku on public.products (sku);
create index idx_products_barcode on public.products (barcode);
create index idx_products_generic_name on public.products (generic_name);

-- Product Batches Indexes (Critical for FEFO sorting)
create index idx_product_batches_product_id on public.product_batches (product_id);
create index idx_product_batches_expiry_date on public.product_batches (expiry_date);
create index idx_product_batches_fefo on public.product_batches (product_id, expiry_date, available_quantity);

-- Sales & Items Indexes
create index idx_sales_invoice_number on public.sales (invoice_number);
create index idx_sales_created_at on public.sales (created_at);
create index idx_sales_customer_id on public.sales (customer_id);
create index idx_sale_items_sale_id on public.sale_items (sale_id);
create index idx_sale_items_product_id on public.sale_items (product_id);
create index idx_sale_batch_allocations_item_id on public.sale_batch_allocations (sale_item_id);

-- Purchases & Items Indexes
create index idx_purchases_number on public.purchases (purchase_number);
create index idx_purchases_created_at on public.purchases (created_at);
create index idx_purchases_supplier_id on public.purchases (supplier_id);
create index idx_purchase_items_purchase_id on public.purchase_items (purchase_id);
create index idx_purchase_items_product_id on public.purchase_items (product_id);

-- Ledger Indexes (Fast retrieval of running balances and statement histories)
create index idx_customer_ledger_customer_id on public.customer_ledger (customer_id);
create index idx_customer_ledger_created_at on public.customer_ledger (created_at);
create index idx_supplier_ledger_supplier_id on public.supplier_ledger (supplier_id);
create index idx_supplier_ledger_created_at on public.supplier_ledger (created_at);

-- Inventory Movements Indexes
create index idx_inventory_movements_product_id on public.inventory_movements (product_id);
create index idx_inventory_movements_batch_id on public.inventory_movements (batch_id);
create index idx_inventory_movements_created_at on public.inventory_movements (created_at);

-- Expenses Indexes
create index idx_expenses_category_id on public.expenses (category_id);
create index idx_expenses_date on public.expenses (expense_date);

-- Audit Logs Indexes
create index idx_audit_logs_created_at on public.audit_logs (created_at);
create index idx_audit_logs_user_id on public.audit_logs (user_id);
create index idx_audit_logs_module on public.audit_logs (module);
