import { z } from "zod"

export const saleReturnItemSchema = z.object({
  sale_item_id: z.string().uuid("Invalid sale item reference"),
  product_id: z.string().uuid("Invalid product reference"),
  batch_id: z.string().uuid("Invalid batch reference"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  unit_price: z.coerce.number().min(0),
  restocked: z.boolean().default(true),
})

export type SaleReturnItemValues = z.infer<typeof saleReturnItemSchema>

export const saleReturnSchema = z.object({
  sale_id: z.string().uuid("Invalid sale reference"),
  refund_amount: z.coerce.number().min(0),
  refund_method: z.enum(['CASH', 'CREDIT_OFFSET', 'EASYPAISA', 'JAZZCASH', 'BANK_TRANSFER', 'CARD', 'OTHER']).default('CASH'),
  return_reason: z.string().min(3, "Reason must be at least 3 characters"),
  items: z.array(saleReturnItemSchema).min(1, "Return must include at least one item"),
})

export type SaleReturnFormValues = z.infer<typeof saleReturnSchema>
