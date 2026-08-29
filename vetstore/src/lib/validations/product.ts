import { z } from "zod"

export const productBaseSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  generic_name: z.string().optional().nullable(),
  sku: z.string().optional().nullable().or(z.literal("")),
  barcode: z.string().optional().nullable().or(z.literal("")),
  category_id: z.string().uuid("Please select a valid category").optional().nullable().or(z.literal("")),
  brand_id: z.string().uuid("Please select a valid brand").optional().nullable().or(z.literal("")),
  manufacturer: z.string().optional().nullable(),
  dosage_form: z.string().optional().nullable(),
  strength: z.string().optional().nullable(),
  pack_size: z.string().optional().nullable(),
  unit_id: z.string().uuid("Please select a valid unit").optional().nullable().or(z.literal("")),
  purchase_price_reference: z.coerce.number().min(0, "Purchase price reference must be at least 0"),
  retail_price: z.coerce.number().min(0, "Retail price must be at least 0"),
  wholesale_price: z.coerce.number().min(0, "Wholesale price must be at least 0"),
  minimum_sale_price: z.coerce.number().min(0, "Minimum sale price must be at least 0"),
  minimum_stock: z.coerce.number().int().min(0, "Minimum stock must be at least 0"),
  reorder_quantity: z.coerce.number().int().min(0, "Reorder quantity must be at least 0"),
  track_batch: z.boolean().default(true),
  track_expiry: z.boolean().default(true),
  is_active: z.boolean().default(true),
  supplier_id: z.string().uuid().optional().nullable().or(z.literal("")),
  initial_quantity: z.coerce.number().min(0).optional().default(0),
  batch_number: z.string().optional().nullable().or(z.literal("")),
  expiry_date: z.string().optional().nullable().or(z.literal("")),
})

export const productSchema = productBaseSchema.refine(data => data.minimum_sale_price <= data.retail_price, {
  message: "Minimum sale price cannot exceed the retail price",
  path: ["minimum_sale_price"]
})

export type ProductFormValues = z.infer<typeof productBaseSchema>

export const categorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters"),
  description: z.string().optional().nullable(),
})

export type CategoryFormValues = z.infer<typeof categorySchema>

export const brandSchema = z.object({
  name: z.string().min(2, "Brand name must be at least 2 characters"),
  description: z.string().optional().nullable(),
})

export type BrandFormValues = z.infer<typeof brandSchema>
