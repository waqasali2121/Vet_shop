import * as React from "react"
import { notFound } from "next/navigation"
import { getProductById, getProductBatches } from "@/lib/actions/products"
import { ProductDetailView } from "@/components/products/product-detail-view"
import { createClient } from "@/lib/supabase/server"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params

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

  // Concurrent queries for product + batches
  const [productRes, batchesRes] = await Promise.all([
    getProductById(id),
    getProductBatches(id),
  ])

  if (productRes.error || !productRes.data) {
    notFound()
  }

  const product = productRes.data
  const batches = batchesRes.data || []

  return (
    <ProductDetailView
      product={product as any}
      batches={batches as any}
      isOwner={isOwner}
    />
  )
}

