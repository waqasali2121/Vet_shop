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
  stockFilter?: string // "in", "low", "out"
  expiryFilter?: string // "expired", "near", "active"
  sortColumn?: string
  sortOrder?: "asc" | "desc"
}

export async function getProducts({
  search = "",
  categoryId = "",
  brandId = "",
  page = 1,
  limit = 10,
  stockFilter = "",
  expiryFilter = "",
  sortColumn = "name",
  sortOrder = "asc",
}: GetProductsParams = {}) {
  try {
    const supabase = await createClient()

    // 1. Resolve Advanced Search across categories and batches
    let productIdsFromBatches: string[] = []
    let productIdsFromCategories: string[] = []

    if (search) {
      // Find by batch number
      const { data: batchMatch } = await supabase
        .from("product_batches")
        .select("product_id")
        .ilike("batch_number", `%${search}%`)
      if (batchMatch) {
        productIdsFromBatches = batchMatch.map(b => b.product_id)
      }

      // Find by category name
      const { data: catMatch } = await supabase
        .from("categories")
        .select("id")
        .ilike("name", `%${search}%`)
      if (catMatch && catMatch.length > 0) {
        const catIds = catMatch.map(c => c.id)
        const { data: prodCatMatch } = await supabase
          .from("products")
          .select("id")
          .in("category_id", catIds)
        if (prodCatMatch) {
          productIdsFromCategories = prodCatMatch.map(p => p.id)
        }
      }
    }

    // 2. Pre-filter by stock levels or expiry criteria if selected
    let filterProductIds: string[] | null = null

    if (stockFilter || expiryFilter) {
      // Fetch all batches
      const { data: allBatches } = await supabase
        .from("product_batches")
        .select("product_id, available_quantity, expiry_date")
        .eq("status", "ACTIVE")

      const stockMap: Record<string, number> = {}
      const hasExpiredMap: Record<string, boolean> = {}
      const hasNearExpiryMap: Record<string, boolean> = {}

      if (allBatches) {
        allBatches.forEach(b => {
          stockMap[b.product_id] = (stockMap[b.product_id] || 0) + b.available_quantity

          if (b.available_quantity > 0 && b.expiry_date) {
            const expDate = new Date(b.expiry_date)
            const today = new Date()
            today.setHours(0,0,0,0)
            const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

            if (diffDays <= 0) {
              hasExpiredMap[b.product_id] = true
            } else if (diffDays <= 90) {
              hasNearExpiryMap[b.product_id] = true
            }
          }
        })
      }

      const { data: allProducts } = await supabase
        .from("products")
        .select("id, minimum_stock")

      const minStockMap: Record<string, number> = {}
      if (allProducts) {
        allProducts.forEach(p => {
          minStockMap[p.id] = p.minimum_stock
        })
      }

      let stockMatchIds: string[] | null = null
      if (stockFilter) {
        stockMatchIds = (allProducts || []).map(p => p.id).filter(pid => {
          const stock = stockMap[pid] || 0
          const minStock = minStockMap[pid] || 5
          if (stockFilter === "out") return stock <= 0
          if (stockFilter === "low") return stock > 0 && stock <= minStock
          if (stockFilter === "in") return stock > minStock
          return true
        })
      }

      let expiryMatchIds: string[] | null = null
      if (expiryFilter) {
        expiryMatchIds = (allProducts || []).map(p => p.id).filter(pid => {
          if (expiryFilter === "expired") return hasExpiredMap[pid] === true
          if (expiryFilter === "near") return hasNearExpiryMap[pid] === true && !hasExpiredMap[pid]
          if (expiryFilter === "active") return hasExpiredMap[pid] !== true && hasNearExpiryMap[pid] !== true
          return true
        })
      }

      if (stockMatchIds && expiryMatchIds) {
        filterProductIds = stockMatchIds.filter(x => expiryMatchIds!.includes(x))
      } else if (stockMatchIds) {
        filterProductIds = stockMatchIds
      } else if (expiryMatchIds) {
        filterProductIds = expiryMatchIds
      }

      // If filter yielded empty result, return empty directly
      if (filterProductIds && filterProductIds.length === 0) {
        return { data: [], count: 0, totalPages: 0, currentPage: page }
      }
    }

    // 3. Build Main Products Query
    let query = supabase
      .from("products")
      .select(`
        *,
        category:categories(id, name),
        brand:brands(id, name),
        unit:units(id, name, abbreviation)
      `, { count: "exact" })

    // Apply filters
    if (filterProductIds && filterProductIds.length > 0) {
      query = query.in("id", filterProductIds)
    }

    if (search) {
      const escapedSearch = `%${search}%`
      let orFilter = `name.ilike.${escapedSearch},sku.ilike.${escapedSearch},barcode.ilike.${escapedSearch},generic_name.ilike.${escapedSearch}`

      const combinedMatchIds = [...new Set([...productIdsFromBatches, ...productIdsFromCategories])]
      if (combinedMatchIds.length > 0) {
        orFilter += `,id.in.(${combinedMatchIds.map(id => `"${id}"`).join(",")})`
      }
      query = query.or(orFilter)
    }

    if (categoryId) {
      query = query.eq("category_id", categoryId)
    }
    if (brandId) {
      query = query.eq("brand_id", brandId)
    }

    // Apply Sorting (Only sort directly by DB columns: name, retail_price, purchase_price_reference)
    const validSortColumns = ["name", "retail_price", "purchase_price_reference"]
    const sortCol = validSortColumns.includes(sortColumn) ? sortColumn : "name"
    query = query.order(sortCol, { ascending: sortOrder === "asc" })

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error, count } = await query.range(from, to)

    if (error) throw error

    // 4. Fetch Batches & Suppliers to merge detailed metadata
    const productIds = (data || []).map(p => p.id)
    const { data: batches } = await supabase
      .from("product_batches")
      .select(`
        *,
        supplier:suppliers(name, phone)
      `)
      .in("product_id", productIds)
      .eq("status", "ACTIVE")

    const processedData = (data || []).map(product => {
      const productBatches = (batches || []).filter(b => b.product_id === product.id)
      const totalStock = productBatches.reduce((sum, b) => sum + b.available_quantity, 0)

      // Find earliest active batch or default
      const activeBatches = productBatches.filter(b => b.available_quantity > 0)
      const targetBatches = activeBatches.length > 0 ? activeBatches : productBatches

      let earliestBatch = null
      if (targetBatches.length > 0) {
        const sorted = [...targetBatches].sort((a, b) => {
          if (!a.expiry_date) return 1
          if (!b.expiry_date) return -1
          return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
        })
        earliestBatch = sorted[0]
      }

      // Compute status based on stock and expiry
      let computedStatus = "In Stock"
      if (totalStock <= 0) {
        computedStatus = "Out of Stock"
      } else {
        const hasExpired = activeBatches.some(b => {
          if (!b.expiry_date) return false
          return new Date(b.expiry_date).getTime() < new Date().setHours(0,0,0,0)
        })
        if (hasExpired) {
          computedStatus = "Expired"
        } else if (totalStock <= product.minimum_stock) {
          computedStatus = "Low Stock"
        }
      }

      return {
        ...product,
        total_stock: totalStock,
        earliest_expiry: earliestBatch?.expiry_date || null,
        earliest_batch: earliestBatch?.batch_number || null,
        supplier_name: earliestBatch?.supplier?.name || null,
        supplier_phone: earliestBatch?.supplier?.phone || null,
        status: computedStatus
      }
    })

    // Custom sorting for stock level or expiry date post-query if selected
    if (sortColumn === "total_stock") {
      processedData.sort((a, b) => {
        return sortOrder === "asc" ? a.total_stock - b.total_stock : b.total_stock - a.total_stock
      })
    } else if (sortColumn === "earliest_expiry") {
      processedData.sort((a, b) => {
        if (!a.earliest_expiry) return 1
        if (!b.earliest_expiry) return -1
        const tA = new Date(a.earliest_expiry).getTime()
        const tB = new Date(b.earliest_expiry).getTime()
        return sortOrder === "asc" ? tA - tB : tB - tA
      })
    }

    return {
      data: processedData,
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

export async function deleteProduct(id: string) {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)

    if (error) {
      if (error.code === "23503") {
        const { error: deactivateError } = await supabase
          .from("products")
          .update({ is_active: false })
          .eq("id", id)

        if (deactivateError) throw deactivateError

        revalidatePath("/products")
        revalidatePath(`/products/${id}`)
        return {
          success: true,
          message: "This medicine has transaction history and cannot be deleted permanently. We have deactivated it instead."
        }
      }
      throw error
    }

    revalidatePath("/products")
    return { success: true }
  } catch (err: any) {
    return { error: err.message || "Failed to delete product" }
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

export async function getProductMovements(productId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("inventory_movements")
      .select(`
        *,
        batch:product_batches(batch_number, expiry_date),
        creator:profiles(email)
      `)
      .eq("product_id", productId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return { data: data || [] }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch product movements" }
  }
}

export async function seedProductListFromDocx() {
  const productsData = [
    { name: "WHITE GOLD 1KG", purchase_price: 820, retail_price: 1000, qty: 12 },
    { name: "ANIGEST 100GM", purchase_price: 130, retail_price: 170, qty: 100 },
    { name: "SYMOSTRESS 100GM", purchase_price: 300, retail_price: 400, qty: 20 },
    { name: "SYMOSTRESS 20GM", purchase_price: 70, retail_price: 100, qty: 104 },
    { name: "SYMODEK 20GM", purchase_price: 60, retail_price: 100, qty: 104 },
    { name: "OXY N 50 20GM", purchase_price: 60, retail_price: 100, qty: 104 },
    { name: "VETAFENAC 50ML", purchase_price: 105, retail_price: 250, qty: 144 },
    { name: "SYMOBAN 12GM", purchase_price: 70, retail_price: 100, qty: 208 },
    { name: "MYBION 100ML", purchase_price: 150, retail_price: 450, qty: 24 },
    { name: "ENROSYM (LIQ) 100ML", purchase_price: 200, retail_price: 400, qty: 20 },
    { name: "ENROCOLI 100ML", purchase_price: 280, retail_price: 400, qty: 15 },
    { name: "FARVISOL 100 BOLUS", purchase_price: 1900, retail_price: 3000, qty: 3 },
    { name: "ZOBEN 5GM", purchase_price: 38, retail_price: 50, qty: 100 },
    { name: "ARIKSAL 240ML", purchase_price: 240, retail_price: 400, qty: 50 },
    { name: "WABROSAL 240ML", purchase_price: 240, retail_price: 400, qty: 50 },
    { name: "HEPTAZAN 240ML", purchase_price: 240, retail_price: 400, qty: 50 },
    { name: "STONIL 100ML", purchase_price: 100, retail_price: 200, qty: 100 },
    { name: "AMINOWAN 100ML", purchase_price: 375, retail_price: 600, qty: 12 },
    { name: "ADE MAX 100ML", purchase_price: 755, retail_price: 1200, qty: 12 },
    { name: "AMOVET-LA 100ML", purchase_price: 715, retail_price: 1200, qty: 12 },
    { name: "NO SCOUR 100ML", purchase_price: 190, retail_price: 350, qty: 200 },
    { name: "NO SCOUR 500ML", purchase_price: 750, retail_price: 1200, qty: 20 },
    { name: "TRIMODIN BOLUS 20:S", purchase_price: 680, retail_price: 1050, qty: 50 },
    { name: "OXYTOCIN 50ML", purchase_price: 28, retail_price: 50, qty: 200 },
    { name: "VETY ALBEN 50 BOLUS", purchase_price: 650, retail_price: 1200, qty: 5 },
    { name: "VETY ALBEN PLUS 50 BOLUS", purchase_price: 730, retail_price: 1400, qty: 5 },
    { name: "ALBENTEX 50 BOLUS", purchase_price: 300, retail_price: 1200, qty: 2 },
    { name: "DINAVET 10ML", purchase_price: 100, retail_price: 250, qty: 10 },
    { name: "LECORT SPRAY 150ML", purchase_price: 560, retail_price: 1200, qty: 6 },
    { name: "LEDOGEN SPRAY 125ML", purchase_price: 635, retail_price: 1000, qty: 6 },
    { name: "NAYVERM 100ML", purchase_price: 130, retail_price: 200, qty: 100 },
    { name: "APPETONE 100GM", purchase_price: 135, retail_price: 200, qty: 30 },
    { name: "FIPROZAK SPRAY", purchase_price: 400, retail_price: 800, qty: 6 },
    { name: "TREMOSULF BOLUS 20/S", purchase_price: 450, retail_price: 1000, qty: 120 }
  ]

  try {
    const supabase = await createClient()

    // 1. Get or create Supplier "Abdur Rehman"
    let supplierId: string | null = null
    const { data: existingSuppliers } = await supabase
      .from("suppliers")
      .select("id")
      .ilike("name", "Abdur Rehman")
      .limit(1)

    if (existingSuppliers && existingSuppliers.length > 0) {
      supplierId = existingSuppliers[0].id
    } else {
      const { data: newSupplier } = await supabase
        .from("suppliers")
        .insert({
          name: "Abdur Rehman",
          phone: "03000000000",
          opening_balance: 0,
          current_balance: 0,
          is_active: true
        })
        .select()
        .single()

      supplierId = newSupplier?.id || null
    }

    // 2. Get default Category, Brand, Unit if available
    const { data: cat } = await supabase.from("categories").select("id").limit(1).maybeSingle()
    const { data: brand } = await supabase.from("brands").select("id").limit(1).maybeSingle()
    const { data: unit } = await supabase.from("units").select("id").limit(1).maybeSingle()

    const defaultExpiry = new Date()
    defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 2)
    const expiryStr = defaultExpiry.toISOString().split("T")[0]

    let addedCount = 0

    for (let idx = 0; idx < productsData.length; idx++) {
      const p = productsData[idx]

      // Check if product already exists
      const { data: existing } = await supabase
        .from("products")
        .select("id, name")
        .ilike("name", p.name)
        .maybeSingle()

      let productId = existing?.id

      if (!productId) {
        const { data: newProd, error: prodErr } = await supabase
          .from("products")
          .insert({
            name: p.name,
            purchase_price_reference: p.purchase_price,
            retail_price: p.retail_price,
            wholesale_price: p.retail_price,
            minimum_sale_price: p.purchase_price,
            minimum_stock: 5,
            reorder_quantity: 10,
            track_batch: true,
            track_expiry: true,
            is_active: true,
            category_id: cat?.id || null,
            brand_id: brand?.id || null,
            unit_id: unit?.id || null
          })
          .select()
          .single()

        if (prodErr) continue
        productId = newProd.id
      }

      // Add Stock Batch if batch doesn't exist
      const batchNum = `INV-15240-${idx + 1}`
      const { data: existingBatch } = await supabase
        .from("product_batches")
        .select("id")
        .eq("product_id", productId)
        .eq("batch_number", batchNum)
        .maybeSingle()

      if (!existingBatch) {
        const { data: batchData } = await supabase
          .from("product_batches")
          .insert({
            product_id: productId,
            batch_number: batchNum,
            manufacturing_date: "2026-08-16",
            expiry_date: expiryStr,
            initial_quantity: p.qty,
            available_quantity: p.qty,
            unit_cost: p.purchase_price,
            supplier_id: supplierId,
            status: "ACTIVE"
          })
          .select()
          .single()

        if (batchData) {
          await supabase.from("inventory_movements").insert({
            product_id: productId,
            batch_id: batchData.id,
            movement_type: "OPENING_STOCK",
            quantity: p.qty,
            unit_cost: p.purchase_price,
            reference_type: "MANUAL",
            notes: "Imported from Invoice #15240 (Abdur Rehman)"
          })
          addedCount++
        }
      }
    }

    revalidatePath("/products")
    revalidatePath("/pos")
    return { success: true, count: addedCount }
  } catch (err: any) {
    return { error: err.message || "Failed to seed medicines" }
  }
}


