import { z } from "zod"

export const storeSettingsSchema = z.object({
  store_name: z.string().min(2, "Store name must be at least 2 characters"),
  phone: z.string().min(7, "Phone number must be at least 7 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  currency: z.string().default("PKR"),
  timezone: z.string().default("Asia/Karachi"),
  invoice_prefix: z.string().min(1, "Invoice prefix is required"),
  purchase_prefix: z.string().min(1, "Purchase prefix is required"),
  allow_negative_stock: z.boolean().default(false),
  allow_expired_sale: z.boolean().default(false),
  enable_fefo: z.boolean().default(true),
  default_receipt_size: z.enum(["80mm", "A4"]).default("80mm"),
})

export type StoreSettingsFormValues = z.infer<typeof storeSettingsSchema>
