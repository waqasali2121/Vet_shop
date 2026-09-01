import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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

export async function GET() {
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
      const { data: newSupplier, error: supErr } = await supabase
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

      if (supErr) {
        console.error("Supplier creation error:", supErr)
      } else {
        supplierId = newSupplier?.id || null
      }
    }

    // 2. Get default Category, Brand, Unit if available
    const { data: cat } = await supabase.from("categories").select("id").limit(1).maybeSingle()
    const { data: brand } = await supabase.from("brands").select("id").limit(1).maybeSingle()
    const { data: unit } = await supabase.from("units").select("id").limit(1).maybeSingle()

    const results = []
    const defaultExpiry = new Date()
    defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 2)
    const expiryStr = defaultExpiry.toISOString().split("T")[0]

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

        if (prodErr) {
          results.push({ name: p.name, status: "error", error: prodErr.message })
          continue
        }

        productId = newProd.id
      }

      // Add Stock Batch if product created/updated
      const batchNum = `INV-15240-${idx + 1}`
      const { data: existingBatch } = await supabase
        .from("product_batches")
        .select("id")
        .eq("product_id", productId)
        .eq("batch_number", batchNum)
        .maybeSingle()

      if (!existingBatch) {
        const { data: batchData, error: batchErr } = await supabase
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

        if (batchErr) {
          results.push({ name: p.name, status: "partial_error", batchError: batchErr.message })
        } else {
          // Add inventory movement
          await supabase.from("inventory_movements").insert({
            product_id: productId,
            batch_id: batchData.id,
            movement_type: "OPENING_STOCK",
            quantity: p.qty,
            unit_cost: p.purchase_price,
            reference_type: "MANUAL",
            notes: "Imported from Invoice #15240 (Abdur Rehman)"
          })
          results.push({ name: p.name, status: "created", qty: p.qty, retail: p.retail_price })
        }
      } else {
        results.push({ name: p.name, status: "already_exists" })
      }
    }

    return NextResponse.json({ success: true, count: results.length, details: results })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
