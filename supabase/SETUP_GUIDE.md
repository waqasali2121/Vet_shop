# Salman Farsy Vet Store POS - Database Setup & Owner Account Guide

This document describes how to configure your Supabase instance, apply database schemas, seed initial data, and securely provision the initial **OWNER** account.

---

## 1. Prerequisites
1. Create a free account at [Supabase.com](https://supabase.com).
2. Create a new project named `salman-farsy-vetstore-pos`.
3. Note down the following from the project Settings -> API:
   * **Project URL**
   * **Anon Public Key**
   * **Service Role API Key** (Keep this secure; do not share or commit)

---

## 2. Setting Up Environment Variables
Create a `.env.local` file in the root of your Next.js project:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-never-expose-to-client
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 3. Database Schema Migrations
Apply the migrations in your Supabase project in the following order. You can copy/paste these files into the **Supabase SQL Editor**:

1. **`supabase/migrations/20260828000000_schema.sql`**
   * Defines all tables, primary keys (UUID), check constraints, and `updated_at` triggers.
2. **`supabase/migrations/20260828000001_rls.sql`**
   * Enables Row Level Security (RLS) and configures policy permissions based on employee roles.
3. **`supabase/migrations/20260828000002_indexes.sql`**
   * Creates performance-optimization indexes for products, sales, and ledger histories.
4. **`supabase/migrations/20260828000003_auth_trigger.sql`**
   * Hooks into Supabase Auth to automatically generate a corresponding record in `public.profiles` upon signup.

---

## 4. Seeding Initial Data
Run the contents of **`supabase/seed.sql`** inside the SQL Editor:
* Inserts default product categories (Dewormers, Injections, Vaccines, etc.).
* Inserts standard unit abbreviations (`vial`, `box`, `tab`, etc.).
* Inserts default expense categories (Rent, Electricity, Salary, Refreshments).
* Sets up the critical **Walk-in Customer** placeholder (`00000000-0000-0000-0000-000000000000`).
* Seeds local pharmaceutical manufacturer brands (ICI Pakistan, Star Labs, Selmore, etc.).
* Initializes default store settings.

---

## 5. Bootstrapping the Initial OWNER Account
We have set up an automated trigger (`on_auth_user_created`) to bootstrap the first user:

1. Open the Supabase Dashboard.
2. Navigate to **Authentication** -> **Users**.
3. Click **Add User** -> **Create User**.
4. Input the owner's email address and password.
5. Click **Save**.

### How it works:
* The database trigger detects that `public.profiles` has 0 records.
* It automatically provisions a profile for this user and assigns them the **`OWNER`** role.
* The owner now has full access to dashboards, reports, settings, and employee management.

---

## 6. Registering Employees & Staff
Once the owner account is active:

1. New employees (Managers, Cashiers, Inventory Staff) should be created via the Supabase Auth Dashboard (or eventually through the `/users` management page).
2. By default, the database trigger assigns any new signup the **`CASHIER`** role.
3. The Owner can log in, navigate to **Users & Roles**, and modify the employee's role (`OWNER`, `MANAGER`, `CASHIER`, or `INVENTORY`) or toggle their account status (`is_active` true/false).
