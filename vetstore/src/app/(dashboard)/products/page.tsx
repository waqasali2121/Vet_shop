import * as React from "react"
import { getProducts, getCategories, getBrands } from "@/lib/actions/products"
import { ProductListClient } from "@/components/products/product-list-client"

interface SearchParams {
  search?: string
  category?: string
  brand?: string
  page?: string
}

interface PageProps {
  searchParams: Promise<SearchParams>
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const search = params.search || ""
  const category = params.category || ""
  const brand = params.brand || ""
  const page = parseInt(params.page || "1", 10)

  // Concurrent server queries
  const [productsRes, categoriesRes, brandsRes] = await Promise.all([
    getProducts({ search, categoryId: category, brandId: brand, page, limit: 10 }),
    getCategories(),
    getBrands(),
  ])

  const products = productsRes.data || []
  const count = productsRes.count || 0
  const totalPages = productsRes.totalPages || 0

  const categories = categoriesRes.data || []
  const brands = brandsRes.data || []

  return (
    <ProductListClient
      products={products as any}
      categories={categories}
      brands={brands}
      count={count}
      totalPages={totalPages}
      currentPage={page}
    />
  )
}
