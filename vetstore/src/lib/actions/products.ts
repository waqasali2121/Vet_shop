"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { productSchema, categorySchema, brandSchema, type ProductFormValues, type CategoryFormValues, type BrandFormValues } from "../validations/product"

// --- CATEGORIES CRUD ---
export async function getCategories() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true })

    if (error) throw error
    return { data: data || [] }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch categories" }
  }
}

export async function createCategory(values: CategoryFormValues) {
  const result = categorySchema.safeParse(values)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("categories")
      .insert(values)
      .select()
      .single()

    if (error) throw error
    revalidatePath("/inventory/categories")
    return { success: true, data }
  } catch (err: any) {
    return { error: err.message || "Failed to create category" }
  }
}

export async function updateCategory(id: string, values: CategoryFormValues) {
  const result = categorySchema.safeParse(values)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("categories")
      .update(values)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    revalidatePath("/inventory/categories")
    return { success: true, data }
  } catch (err: any) {
    return { error: err.message || "Failed to update category" }
  }
}

// --- BRANDS CRUD ---
export async function getBrands() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .order("name", { ascending: true })

    if (error) throw error
    return { data: data || [] }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch brands" }
  }
}

export async function createBrand(values: BrandFormValues) {
  const result = brandSchema.safeParse(values)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("brands")
      .insert(values)
      .select()
      .single()

    if (error) throw error
    revalidatePath("/inventory/brands")
    return { success: true, data }
  } catch (err: any) {
    return { error: err.message || "Failed to create brand" }
  }
}

export async function updateBrand(id: string, values: BrandFormValues) {
  const result = brandSchema.safeParse(values)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("brands")
      .update(values)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    revalidatePath("/inventory/brands")
    return { success: true, data }
  } catch (err: any) {
    return { error: err.message || "Failed to update brand" }
  }
}

// --- UNITS QUERY ---
export async function getUnits() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("units")
      .select("*")
      .order("name", { ascending: true })

    if (error) throw error
    return { data: data || [] }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch units" }
  }
}

// --- PRODUCTS CRUD ---
export interface GetProductsParams {
  search?: string
  categoryId?: string
  brandId?: string
  page?: number
  limit?: number
}

export async function getProducts({
  search = "",
  categoryId = "",
  brandId = "",
  page = 1,
  limit = 10,
}: GetProductsParams = {}) {
  try {
    const supabase = await createClient()

    // Build query
    let query = supabase
      .from("products")
      .select(`
        *,
        category:categories(id, name),
        brand:brands(id, name),
        unit:units(id, name, abbreviation)
      `, { count: "exact" })

    // Apply search filter (name, sku, barcode, generic_name)
    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%,generic_name.ilike.%${search}%`)
    }

    // Apply category/brand filters
    if (categoryId) {
      query = query.eq("category_id", categoryId)
    }
    if (brandId) {
      query = query.eq("brand_id", brandId)
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to)

    if (error) throw error

    return {
      data: data || [],
      count: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      currentPage: page,
    }
  } catch (err: any) {
    return {
      error: err.message || "Failed to fetch products",
      data: [],
      count: 0,
      totalPages: 0,
      currentPage: page,
    }
  }
}

export async function getProductById(id: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        category:categories(id, name),
        brand:brands(id, name),
        unit:units(id, name, abbreviation)
      `)
      .eq("id", id)
      .single()

    if (error) throw error
    return { data }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch product details" }
  }
}

export async function createProduct(values: ProductFormValues) {
  const result = productSchema.safeParse(values)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const {
    supplier_id,
    initial_quantity,
    batch_number,
    expiry_date,
    ...dbProductValues
  } = values

  try {
    const supabase = await createClient()

    // Get currently authenticated user to set created_by
    const { data: { user } } = await supabase.auth.getUser()

    // Resolve defaults if values are not provided
    let catId = dbProductValues.category_id
    if (!catId || catId.trim() === "") {
      const { data: cat } = await supabase.from("categories").select("id").limit(1).maybeSingle()
      catId = cat?.id || null
    }

    let brId = dbProductValues.brand_id
    if (!brId || brId.trim() === "") {
      const { data: brand } = await supabase.from("brands").select("id").limit(1).maybeSingle()
      brId = brand?.id || null
    }

    let unId = dbProductValues.unit_id
    if (!unId || unId.trim() === "") {
      const { data: unit } = await supabase.from("units").select("id").limit(1).maybeSingle()
      unId = unit?.id || null
    }

    const productData = {
      ...dbProductValues,
      category_id: catId,
      brand_id: brId,
      unit_id: unId,
      created_by: user?.id || null,
    }

    const { data, error } = await supabase
      .from("products")
      .insert(productData)
      .select()
      .single()

    if (error) throw error

    // Create stock batch and inventory movement if initial quantity is set
    if (initial_quantity && initial_quantity > 0) {
      const defaultExpiry = new Date()
      defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 2) // 2 years default

      const { data: batchData, error: batchError } = await supabase
        .from("product_batches")
        .insert({
          product_id: data.id,
          batch_number: batch_number || `BAT-${Math.floor(100000 + Math.random() * 900000)}`,
          manufacturing_date: new Date().toISOString().split("T")[0],
          expiry_date: expiry_date || defaultExpiry.toISOString().split("T")[0],
          initial_quantity: initial_quantity,
          available_quantity: initial_quantity,
          unit_cost: dbProductValues.purchase_price_reference || 0,
          supplier_id: supplier_id || null,
          status: "ACTIVE"
        })
        .select()
        .single()

      if (batchError) {
        console.error("Failed to create initial stock batch:", batchError.message)
      } else if (batchData) {
        // Log inventory movement (positive stock in)
        const { error: moveError } = await supabase
          .from("inventory_movements")
          .insert({
            product_id: data.id,
            batch_id: batchData.id,
            movement_type: "OPENING_STOCK",
            quantity: initial_quantity,
            unit_cost: dbProductValues.purchase_price_reference || 0,
            reference_type: "MANUAL",
            notes: "Initial stock setup on product creation",
            created_by: user?.id || null
          })
        if (moveError) {
          console.error("Failed to log inventory movement:", moveError.message)
        }
      }
    }

    revalidatePath("/products")
    return { success: true, data }
  } catch (err: any) {
    return { error: err.message || "Failed to create product" }
  }
}

export async function updateProduct(id: string, values: ProductFormValues) {
  const result = productSchema.safeParse(values)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("products")
      .update(values)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    revalidatePath("/products")
    revalidatePath(`/products/${id}`)
    return { success: true, data }
  } catch (err: any) {
    return { error: err.message || "Failed to update product" }
  }
}

export async function toggleProductStatus(id: string, currentStatus: boolean) {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from("products")
      .update({ is_active: !currentStatus })
      .eq("id", id)

    if (error) throw error
    revalidatePath("/products")
    revalidatePath(`/products/${id}`)
    return { success: true }
  } catch (err: any) {
    return { error: err.message || "Failed to toggle product status" }
  }
}

export async function getProductBatches(productId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("product_batches")
      .select(`
        *,
        supplier:suppliers(id, name)
      `)
      .eq("product_id", productId)
      .order("expiry_date", { ascending: true })

    if (error) throw error
    return { data: data || [] }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch product batches" }
  }
}

