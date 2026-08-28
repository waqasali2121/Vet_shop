import { z } from "zod"

export const supplierSchema = z.object({
  name: z.string().min(2, "Supplier name must be at least 2 characters"),
  phone: z.string().min(7, "Phone number must be at least 7 characters"),
  email: z.string().email("Invalid email address").optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  contact_person: z.string().optional().nullable(),
  opening_balance: z.coerce.number().default(0.00),
  notes: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
})

export type SupplierFormValues = z.infer<typeof supplierSchema>

export const purchaseItemSchema = z.object({
  product_id: z.string().uuid("Please select a valid product"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  bonus_quantity: z.coerce.number().int().min(0, "Bonus quantity cannot be negative").default(0),
  unit_cost: z.coerce.number().min(0, "Unit cost cannot be negative"),
  discount_amount: z.coerce.number().min(0, "Discount cannot be negative").default(0),
  batch_number: z.string().min(1, "Batch number is required"),
  manufacturing_date: z.string().optional().nullable().or(z.literal("")),
  expiry_date: z.string().min(1, "Expiry date is required for FEFO tracking"),
})

export type PurchaseItemValues = z.infer<typeof purchaseItemSchema>

export const purchaseSchema = z.object({
  supplier_id: z.string().uuid("Please select a supplier"),
  supplier_invoice_number: z.string().optional().nullable().or(z.literal("")),
  purchase_date: z.string().min(1, "Purchase date is required"),
  items: z.array(purchaseItemSchema).min(1, "Purchase must include at least one item"),
  subtotal: z.coerce.number().min(0),
  discount_total: z.coerce.number().min(0).default(0),
  grand_total: z.coerce.number().min(0),
  paid_amount: z.coerce.number().min(0).default(0),
  payment_method: z.enum(['CASH', 'EASYPAISA', 'JAZZCASH', 'BANK_TRANSFER', 'CARD', 'OTHER']).default('CASH'),
  notes: z.string().optional().nullable().or(z.literal("")),
}).refine(data => data.paid_amount <= data.grand_total, {
  message: "Paid amount cannot exceed the grand total",
  path: ["paid_amount"]
})

export type PurchaseFormValues = z.infer<typeof purchaseSchema>
