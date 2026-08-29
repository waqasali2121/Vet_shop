import { getProducts, getCategories, getBrands } from "@/lib/actions/products"
import { ProductListClient } from "@/components/products/product-list-client"

interface SearchParams {
  search?: string
  category?: string
  brand?: string
  page?: string
  stock?: string
  expiry?: string
  sortCol?: string
  sortOrd?: string
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
  const stock = params.stock || ""
  const expiry = params.expiry || ""
  const sortCol = params.sortCol || "name"
  const sortOrd = (params.sortOrd || "asc") as "asc" | "desc"

  // Concurrent server queries
  const [productsRes, categoriesRes, brandsRes] = await Promise.all([
    getProducts({
      search,
      categoryId: category,
      brandId: brand,
      page,
      limit: 10,
      stockFilter: stock,
      expiryFilter: expiry,
      sortColumn: sortCol,
      sortOrder: sortOrd
    }),
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
