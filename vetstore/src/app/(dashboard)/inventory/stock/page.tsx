import * as React from "react"
import { getCurrentStock } from "@/lib/actions/inventory"
import { getCategories, getBrands } from "@/lib/actions/products"
import { CurrentStockClient } from "@/components/inventory/current-stock-client"

interface SearchParams {
  search?: string
  category?: string
  brand?: string
}

interface PageProps {
  searchParams: Promise<SearchParams>
}

export default async function CurrentStockPage({ searchParams }: PageProps) {
  const params = await searchParams
  const search = params.search || ""
  const category = params.category || ""
  const brand = params.brand || ""

  // Fetch stock and filters
  const [stockRes, categoriesRes, brandsRes] = await Promise.all([
    getCurrentStock({ search, categoryId: category, brandId: brand }),
    getCategories(),
    getBrands(),
  ])

  const stockItems = stockRes.data || []
  const categories = categoriesRes.data || []
  const brands = brandsRes.data || []

  return (
    <CurrentStockClient
      stockItems={stockItems as any}
      categories={categories}
      brands={brands}
    />
  )
}
