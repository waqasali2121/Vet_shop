import * as React from "react"
import { getStockAdjustments } from "@/lib/actions/inventory"
import { getProducts } from "@/lib/actions/products"
import { AdjustmentsClient } from "@/components/inventory/adjustments-client"

export default async function AdjustmentsPage() {
  // Concurrent queries
  const [adjustmentsRes, productsRes] = await Promise.all([
    getStockAdjustments(),
    // Load all active products for the dropdown (limit: 1000 to get catalog list)
    getProducts({ limit: 1000 }),
  ])

  const adjustments = adjustmentsRes.data || []
  const products = productsRes.data || []

  // Map products data to match expected dropdown shape
  const selectionProducts = products.map(p => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
  }))

  return (
    <AdjustmentsClient
      adjustments={adjustments as any}
      products={selectionProducts}
    />
  )
}
