import { z } from "zod"

export const stockAdjustmentSchema = z.object({
  product_id: z.string().uuid("Please select a valid product"),
  batch_id: z.string().uuid("Please select a valid batch"),
  adjustment_type: z.enum([
    "PHYSICAL_COUNT",
    "DAMAGED",
    "EXPIRED",
    "MISSING",
    "CORRECTION",
    "OPENING_STOCK",
    "OTHER"
  ]),
  quantity: z.coerce.number().int().refine(val => val !== 0, {
    message: "Quantity adjustment cannot be zero"
  }),
  reason: z.string().min(3, "Reason must be at least 3 characters"),
  notes: z.string().optional().nullable().or(z.literal("")),
})

export type StockAdjustmentFormValues = z.infer<typeof stockAdjustmentSchema>
