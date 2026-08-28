-- Salman Farsy Veterinary Store POS - Seed Data
-- Created: 2026-08-28

-- 1. SEED UNITS
insert into public.units (name, abbreviation) values
('Vial', 'vial'),
('Box', 'box'),
('Tablet', 'tab'),
('Capsule', 'cap'),
('Bottle', 'bottle'),
('Kilogram', 'kg'),
('Gram', 'g'),
('Litre', 'L'),
('Millilitre', 'ml'),
('Piece', 'pc'),
('Sachet', 'sachet')
on conflict (name) do nothing;


-- 2. SEED PRODUCT CATEGORIES
insert into public.categories (name, description) values
('Injections', 'Injectable animal veterinary medicines'),
('Antibiotics', 'Antibacterial and antimicrobial treatments'),
('Dewormers', 'Anthelmintics for internal and external parasite control'),
('Vaccines', 'Immunological protection for livestock and poultry'),
('Vitamins', 'Multi-vitamins and specific vitamin injections/powders'),
('Minerals', 'Essential mineral supplements and mixtures'),
('Feed Supplements', 'Nutritional enhancers for dairy, beef, and poultry feed'),
('Poultry Medicines', 'Treatments formulated specifically for commercial poultry flocks'),
('Pet Medicines', 'Therapeutics for dogs, cats, and other small domestic pets'),
('Surgical Items', 'Bandages, syringes, needles, suturing threads, and tools'),
('Livestock Equipment', 'Ear tags, drench guns, castrators, and farm accessories'),
('Other', 'Uncategorized livestock or veterinary supplies')
on conflict (name) do nothing;


-- 3. SEED EXPENSE CATEGORIES
insert into public.expense_categories (name, description) values
('Rent', 'Store premises lease and rental payments'),
('Electricity', 'Utility bills for power consumption'),
('Salary', 'Wages and salaries for staff members'),
('Fuel', 'Generator fuel or vehicle transport fuel'),
('Transport', 'Delivery and logistics shipping costs'),
('Loading', 'Labour charges for unloading purchases or loading deliveries'),
('Internet', 'Monthly telecom and broadband billing'),
('Maintenance', 'Equipment repairs, painting, and facility upkeep'),
('Refreshments', 'Tea, water, and lunch meals for staff and guests'),
('Courier', 'Postage and parcel dispatch fees'),
('Miscellaneous', 'Unspecified petty expenses')
on conflict (name) do nothing;


-- 4. SEED DEFAULT WALK-IN CUSTOMER
insert into public.customers (id, name, phone, customer_type, credit_limit, current_balance, is_active) values
('00000000-0000-0000-0000-000000000000', 'Walk-in Customer', '0000-0000000', 'WALK_IN', 0.00, 0.00, true)
on conflict (phone) do update set name = excluded.name;


-- 5. SEED INITIAL BRANDS
insert into public.brands (name, description) values
('ICI Pakistan', 'ICI Animal Health Division'),
('Star Laboratories', 'Star Veterinary Products'),
('Selmore Pharmaceuticals', 'Selmore Veterinary Medicines'),
('Ghazi Brothers', 'Ghazi Animal Health Products'),
('MSD Animal Health', 'MSD Animal Health International'),
('Zoetis', 'Zoetis Animal Health Products'),
('Vetafarm', 'Vetafarm Specialized Products'),
('Star Pharma', 'Star Pharmaceutical Division'),
('Zenith Vet Care', 'Zenith Veterinary Laboratories'),
('Biologicals Ltd', 'Biologicals International'),
('Other Brand', 'Generic or unspecified manufacturer')
on conflict (name) do nothing;


-- 6. SEED STORE SETTINGS
insert into public.store_settings (store_name, phone, address, currency, timezone, invoice_prefix, purchase_prefix, allow_negative_stock, allow_expired_sale, enable_fefo, default_customer_id, default_receipt_size) values
('Salman Farsy Veterinary Store', '0300-1234567', 'Opposite Grain Market, Veterinary Hospital Road, Pakistan', 'PKR', 'Asia/Karachi', 'SFV', 'PUR', false, false, true, '00000000-0000-0000-0000-000000000000', '80mm')
on conflict do nothing;
