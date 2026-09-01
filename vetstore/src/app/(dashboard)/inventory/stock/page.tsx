import { getCurrentStock } from "@/lib/actions/inventory"
import { getCategories, getBrands } from "@/lib/actions/products"
import { CurrentStockClient } from "@/components/inventory/current-stock-client"
import { createClient } from "@/lib/supabase/server"

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

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isOwner = false
  if (user) {
    const userEmail = user.email?.toLowerCase() || ""
    if (userEmail === "salman@vetshoe.com" || userEmail.includes("salman")) {
      isOwner = true
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
      if (profile?.role === "OWNER") {
        isOwner = true
      }
    }
  }

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
      isOwner={isOwner}
    />
  )
}

