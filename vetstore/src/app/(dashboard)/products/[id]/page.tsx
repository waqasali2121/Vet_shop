import * as React from "react"
import { notFound } from "next/navigation"
import { getProductById, getProductBatches } from "@/lib/actions/products"
import { ProductDetailView } from "@/components/products/product-detail-view"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params

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
    />
  )
}
