import { z } from "zod"

export const saleItemSchema = z.object({
  product_id: z.string().uuid("Please select a valid product"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  unit_price: z.coerce.number().min(0, "Price cannot be negative"),
  discount_amount: z.coerce.number().min(0, "Discount cannot be negative").default(0),
})

export type SaleItemValues = z.infer<typeof saleItemSchema>

export const salePaymentSchema = z.object({
  payment_method: z.enum(['CASH', 'CREDIT', 'EASYPAISA', 'JAZZCASH', 'BANK_TRANSFER', 'CARD', 'OTHER']),
  amount: z.coerce.number().min(0, "Amount cannot be negative"),
  transaction_reference: z.string().optional().nullable().or(z.literal("")),
})

export type SalePaymentValues = z.infer<typeof salePaymentSchema>

export const saleSchema = z.object({
  customer_id: z.string().uuid("Please select a valid customer"),
  items: z.array(saleItemSchema).min(1, "Sale must include at least one item"),
  payments: z.array(salePaymentSchema).min(1, "Please provide at least one payment method"),
  subtotal: z.coerce.number().min(0),
  discount_amount: z.coerce.number().min(0).default(0),
  tax_amount: z.coerce.number().min(0).default(0),
  grand_total: z.coerce.number().min(0),
  paid_amount: z.coerce.number().min(0).default(0),
  balance_amount: z.coerce.number().default(0),
  notes: z.string().optional().nullable().or(z.literal("")),
}).refine(data => {
  // If customer is Walk-in Customer (UUID: 00000000-0000-0000-0000-000000000000), they cannot buy on CREDIT
  const isWalkIn = data.customer_id === '00000000-0000-0000-0000-000000000000'
  const hasCredit = data.payments.some(p => p.payment_method === 'CREDIT')
  if (isWalkIn && (hasCredit || data.balance_amount > 0)) {
    return false
  }
  return true
}, {
  message: "Walk-in customers cannot purchase on credit. Balance must be Rs. 0.",
  path: ["customer_id"]
})

export type SaleFormValues = z.infer<typeof saleSchema>
