import * as React from "react"
import { getSuppliers } from "@/lib/actions/purchases"
import { getProducts } from "@/lib/actions/products"
import { PurchaseForm } from "@/components/purchases/purchase-form"

export default async function NewPurchasePage() {
  // Fetch active suppliers & products
  const [suppliersRes, productsRes] = await Promise.all([
    getSuppliers(),
    getProducts({ limit: 1000 }),
  ])

  const suppliers = (suppliersRes.data || []).filter((s: any) => s.is_active)
  const products = (productsRes.data || []).filter((p: any) => p.is_active)

  // Map to matching types
  const mappedSuppliers = suppliers.map((s: any) => ({
    id: s.id,
    name: s.name,
  }))

  const mappedProducts = products.map((p: any) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
  }))

  return (
    <PurchaseForm
      suppliers={mappedSuppliers}
      products={mappedProducts}
    />
  )
}
