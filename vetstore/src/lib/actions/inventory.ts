"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { stockAdjustmentSchema, type StockAdjustmentFormValues } from "../validations/inventory"

// --- CURRENT STOCK VIEW ---
export interface GetStockParams {
  search?: string
  categoryId?: string
  brandId?: string
}

export async function getCurrentStock({
  search = "",
  categoryId = "",
  brandId = "",
}: GetStockParams = {}) {
  try {
    const supabase = await createClient()

    // Query products
    let query = supabase
      .from("products")
      .select(`
        id,
        name,
        generic_name,
        sku,
        barcode,
        minimum_stock,
        retail_price,
        purchase_price_reference,
        category:categories(name),
        brand:brands(name),
        unit:units(abbreviation)
      `)
      .eq("is_active", true)

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%,generic_name.ilike.%${search}%`)
    }
    if (categoryId) {
      query = query.eq("category_id", categoryId)
    }
    if (brandId) {
      query = query.eq("brand_id", brandId)
    }

    const { data: products, error: prodError } = await query
    if (prodError) throw prodError

    if (!products || products.length === 0) {
      return { data: [] }
    }

    const productIds = products.map(p => p.id)

    // Fetch batches for all these products to sum available stock
    const { data: batches, error: batchError } = await supabase
      .from("product_batches")
      .select("product_id, available_quantity, unit_cost")
      .in("product_id", productIds)

    if (batchError) throw batchError

    // Map aggregate stock and valuations to products
    const stockData = products.map(product => {
      const productBatches = (batches || []).filter(b => b.product_id === product.id)
      const totalAvailable = productBatches.reduce((sum, b) => sum + b.available_quantity, 0)

      // Valuations
      const costValuation = productBatches.reduce((sum, b) => sum + (b.available_quantity * Number(b.unit_cost)), 0)
      const retailValuation = totalAvailable * Number(product.retail_price)

      return {
        ...product,
        total_available: totalAvailable,
        cost_valuation: costValuation,
        retail_valuation: retailValuation,
        batches_count: productBatches.length
      }
    })

    return { data: stockData }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch current stock" }
  }
}

// --- BATCHES VIEW ---
export interface GetBatchesParams {
  productId?: string
  status?: string
}

export async function getBatches({ productId = "", status = "" }: GetBatchesParams = {}) {
  try {
    const supabase = await createClient()
    let query = supabase
      .from("product_batches")
      .select(`
        *,
        product:products(id, name, sku, barcode, unit:units(abbreviation)),
        supplier:suppliers(id, name)
      `)

    if (productId) {
      query = query.eq("product_id", productId)
    }
    if (status) {
      query = query.eq("status", status)
    }

    const { data, error } = await query.order("expiry_date", { ascending: true })
    if (error) throw error

    return { data: data || [] }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch product batches" }
  }
}

// --- EXPIRY MANAGEMENT ---
export async function getExpiryManagementData() {
  try {
    const supabase = await createClient()

    // Fetch all active batches
    const { data: batches, error } = await supabase
      .from("product_batches")
      .select(`
        *,
        product:products(id, name, sku, barcode, unit:units(abbreviation)),
        supplier:suppliers(id, name)
      `)
      .gt("available_quantity", 0)

    if (error) throw error

    const today = new Date()
    today.setHours(0,0,0,0)

    const categories = {
      expired: [] as any[],
      urgent: [] as any[],    // 0-30 days
      near: [] as any[],      // 31-90 days
      medium: [] as any[],    // 91-180 days
      safe: [] as any[]       // 181+ days
    }

    batches?.forEach(batch => {
      if (!batch.expiry_date) {
        categories.safe.push(batch)
        return
      }

      const expiry = new Date(batch.expiry_date)
      expiry.setHours(0,0,0,0)
      const diffTime = expiry.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      const batchWithDays = { ...batch, days_remaining: diffDays }

      if (diffDays <= 0) {
        categories.expired.push(batchWithDays)
      } else if (diffDays <= 30) {
        categories.urgent.push(batchWithDays)
      } else if (diffDays <= 90) {
        categories.near.push(batchWithDays)
      } else if (diffDays <= 180) {
        categories.medium.push(batchWithDays)
      } else {
        categories.safe.push(batchWithDays)
      }
    })

    return {
      data: categories,
      counts: {
        expired: categories.expired.length,
        urgent: categories.urgent.length,
        near: categories.near.length,
        medium: categories.medium.length,
        safe: categories.safe.length
      }
    }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch expiry management details" }
  }
}

// --- STOCK ADJUSTMENTS CRUD ---
export async function getStockAdjustments() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("stock_adjustments")
      .select(`
        *,
        product:products(id, name, sku, barcode),
        batch:product_batches(id, batch_number, expiry_date),
        creator:profiles(email)
      `)
      .order("created_at", { ascending: false })

    if (error) throw error
    return { data: data || [] }
  } catch (err: any) {
    return { error: err.message || "Failed to fetch stock adjustments" }
  }
}

export async function createStockAdjustment(values: StockAdjustmentFormValues) {
  const result = stockAdjustmentSchema.safeParse(values)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  try {
    const supabase = await createClient()

    // Get current cashier session user details
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Fetch batch details to verify quantity
    const { data: batch, error: fetchBatchError } = await supabase
      .from("product_batches")
      .select("available_quantity, unit_cost")
      .eq("id", values.batch_id)
      .single()

    if (fetchBatchError || !batch) {
      throw new Error("Target product batch not found")
    }

    const currentQty = batch.available_quantity
    const newQty = currentQty + values.quantity

    // Prevent negative stock
    if (newQty < 0) {
      return { error: `Insufficient stock in batch. Only ${currentQty} units are available.` }
    }

    // Generate Adjustment Number: ADJ-YYYY-MM-XXXX
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const datePrefix = `ADJ-${year}-${month}`

    // Fetch count of adjustments today to generate unique suffix
    const { count, error: countError } = await supabase
      .from("stock_adjustments")
      .select("id", { count: "exact", head: true })
      .ilike("adjustment_number", `${datePrefix}%`)

    if (countError) throw countError
    const suffix = String((count || 0) + 1).padStart(4, "0")
    const adjustmentNumber = `${datePrefix}-${suffix}`

    // 1. Create Stock Adjustment Entry
    const { data: adjustment, error: adjError } = await supabase
      .from("stock_adjustments")
      .insert({
        adjustment_number: adjustmentNumber,
        product_id: values.product_id,
        batch_id: values.batch_id,
        adjustment_type: values.adjustment_type,
        quantity: values.quantity,
        reason: values.reason,
        notes: values.notes,
        created_by: user.id
      })
      .select()
      .single()

    if (adjError) throw adjError

    // 2. Update Batch available quantity
    const { error: batchUpdateError } = await supabase
      .from("product_batches")
      .update({ available_quantity: newQty })
      .eq("id", values.batch_id)

    if (batchUpdateError) throw batchUpdateError

    // 3. Create Inventory Movement record
    const movementType = values.quantity > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT"
    const { error: movementError } = await supabase
      .from("inventory_movements")
      .insert({
        product_id: values.product_id,
        batch_id: values.batch_id,
        movement_type: movementType,
        quantity: values.quantity,
        unit_cost: batch.unit_cost,
        reference_type: "ADJUSTMENT",
        reference_id: adjustment.id,
        notes: values.reason,
        created_by: user.id
      })

    if (movementError) throw movementError

    // 4. Create Audit Log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "STOCK_ADJUSTMENT",
      module: "INVENTORY",
      entity_type: "STOCK_ADJUSTMENT",
      entity_id: adjustment.id,
      old_data: { available_quantity: currentQty },
      new_data: { available_quantity: newQty, adjustment_quantity: values.quantity, reason: values.reason }
    })

    revalidatePath("/inventory/stock")
    revalidatePath("/inventory/batches")
    revalidatePath("/inventory/expiry")
    revalidatePath("/inventory/adjustments")
    revalidatePath(`/products/${values.product_id}`)

    return { success: true, data: adjustment }
  } catch (err: any) {
    return { error: err.message || "Failed to process stock adjustment" }
  }
}
