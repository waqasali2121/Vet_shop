import * as React from "react"
import { notFound } from "next/navigation"
import { getProductById, getCategories, getBrands, getUnits } from "@/lib/actions/products"
import { ProductForm } from "@/components/products/product-form"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params

  // Concurrent DB reads
  const [productRes, categoriesRes, brandsRes, unitsRes] = await Promise.all([
    getProductById(id),
    getCategories(),
    getBrands(),
    getUnits(),
  ])

  if (productRes.error || !productRes.data) {
    notFound()
  }

  const product = productRes.data
  const categories = categoriesRes.data || []
  const brands = brandsRes.data || []
  const units = unitsRes.data || []

  return (
    <ProductForm
      initialData={product as any}
      categories={categories}
      brands={brands}
      units={units as any}
    />
  )
}
