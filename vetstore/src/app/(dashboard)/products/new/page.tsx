import * as React from "react"
import { getCategories, getBrands, getUnits } from "@/lib/actions/products"
import { ProductForm } from "@/components/products/product-form"

export default async function NewProductPage() {
  // Concurrent DB reads
  const [categoriesRes, brandsRes, unitsRes] = await Promise.all([
    getCategories(),
    getBrands(),
    getUnits(),
  ])

  const categories = categoriesRes.data || []
  const brands = brandsRes.data || []
  const units = unitsRes.data || []

  return (
    <ProductForm
      categories={categories}
      brands={brands}
      units={units as any}
    />
  )
}
