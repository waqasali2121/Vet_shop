import * as React from "react"
import { notFound } from "next/navigation"
import { getSaleById } from "@/lib/actions/sales"
import { SaleDetailClient } from "@/components/sales/sale-detail-client"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SaleDetailPage({ params }: PageProps) {
  const { id } = await params

  const res = await getSaleById(id)

  if (res.error || !res.data) {
    notFound()
  }

  const sale = res.data

  return (
    <SaleDetailClient sale={sale as any} />
  )
}
