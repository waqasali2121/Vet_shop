import * as React from "react"
import { getCategories, getBrands, getUnits } from "@/lib/actions/products"
import { getSuppliers } from "@/lib/actions/purchases"
import { ProductForm } from "@/components/products/product-form"

export default async function NewProductPage() {
  // Concurrent DB reads
  const [categoriesRes, brandsRes, unitsRes, suppliersRes] = await Promise.all([
    getCategories(),
    getBrands(),
    getUnits(),
    getSuppliers(),
  ])

  const categories = categoriesRes.data || []
  const brands = brandsRes.data || []
  const units = unitsRes.data || []
  const suppliers = suppliersRes.data || []

  return (
    <ProductForm
      categories={categories}
      brands={brands}
      units={units as any}
      suppliers={suppliers}
    />
  )
}
