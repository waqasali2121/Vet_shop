import { z } from "zod"

export const customerSchema = z.object({
  name: z.string().min(2, "Customer name must be at least 2 characters"),
  phone: z.string().min(7, "Phone number must be at least 7 characters"),
  customer_type: z.enum([
    "WALK_IN",
    "FARMER",
    "DAIRY_FARM",
    "POULTRY_FARM",
    "VETERINARIAN",
    "DEALER",
    "PET_OWNER",
    "OTHER"
  ]).default("WALK_IN"),
  credit_limit: z.coerce.number().min(0).default(0.00),
  opening_balance: z.coerce.number().default(0.00),
  address: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
})

export type CustomerFormValues = z.infer<typeof customerSchema>
