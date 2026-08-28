# Salman Farsy Veterinary Store POS

A complete production-quality, web-based Point of Sale (POS) and inventory control system tailored for veterinary medicine and livestock supplies stores. Built with **Next.js**, **Supabase**, and **Tailwind CSS**.

---

## 🚀 Technology Stack
* **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui styles, Lucide icons.
* **Backend:** Next.js Server Components, Server Actions, Route Handlers.
* **Database & Authentication:** Supabase PostgreSQL, Supabase Auth.
* **Validation & Forms:** Zod, React Hook Form.
* **Date & Tables:** date-fns, custom Radix interfaces.

---

## 🛠️ Environment Setup

Create a `.env.local` file in the root of the project:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🗄️ Database Setup (Supabase)

Execute the PostgreSQL files in your Supabase SQL Editor in the following order:

1. **`supabase/migrations/20260828000000_schema.sql`**
   * Configures tables, UUID primary keys, and auto-updating `updated_at` triggers.
2. **`supabase/migrations/20260828000001_rls.sql`**
   * Enables Row Level Security (RLS) and defines role permissions (`OWNER`, `MANAGER`, `CASHIER`, `INVENTORY`).
3. **`supabase/migrations/20260828000002_indexes.sql`**
   * Creates performance-optimization indexes for barcode/SKU queries, FEFO sorting, and ledgers.
4. **`supabase/migrations/20260828000003_auth_trigger.sql`**
   * Sets up a trigger on `auth.users` to automatically populate `public.profiles`.
5. **`supabase/seed.sql`**
   * Seeds default product categories, units, local brands, expense categories, and the Walk-in Customer.

---

## 🔑 Bootstrapping the Initial OWNER Account

We have implemented an automated bootstrapping trigger:
1. Open your Supabase Dashboard.
2. Navigate to **Authentication** -> **Users** -> **Add User** -> **Create User**.
3. Fill in the Owner's email address and password, then click **Save**.
4. The database trigger detects that the profiles table is empty, automatically provisions the profile record, and grants the **`OWNER`** role.
5. Log in at `/login`. You now have full access to users, settings, and reports.

---

## 🏢 Employee Roles & Permissions Matrix

* **OWNER:** Full system control. Can change store configurations, adjust profiles/roles, and view profit reports.
* **MANAGER:** Full operational access. Can record purchases, manage inventory, view reports, and void/return transactions. Cannot modify owner-level system settings or profiles.
* **INVENTORY STAFF:** Product catalog access. Can update items, create batches, manage expiries, and record purchases. Cannot view profit summaries or cash registers.
* **CASHIER:** Retail access. Can run the POS, search products, receive collections, and close their cash registers. Cannot void sales, adjust historical stock, or view cost/margins.

---

## 📦 Key Business Logic Rules

1. **FEFO (First Expire, First Out):** POS checkouts automatically select inventory from the earliest non-expired batch. If a sale quantity exceeds a single batch's stock, the cart line splits across batches under the hood.
2. **Zero Negative Stock:** Capped at the database level (`available_quantity >= 0`). Attempting to sell more than active stock raises errors atomically during POS checkout.
3. **Quarantined Expiries:** Expired batches (`expiry_date < current_date`) are marked unsellable and blocked at checkout.
4. **Walk-in Credit Block:** Walk-in customers cannot purchase on credit. Balance must resolve to Rs. 0. Registered farmers/dealers are validated against customized credit limits.
5. **No Destructive Deletion:** Voided sales and returned purchases reverse balances and log audit events without deleting historical rows.
6. **Cash Register Audits:** CASH sales, expenses, refunds, and supplier payouts automatically update the cashier's active session expected cash. Discrepancies are logged on session closure.

---

## 💻 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Run local Next.js server
npm run dev

# 3. Production compilation checks
npm run build
```
