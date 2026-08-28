import * as React from "react"
import { notFound } from "next/navigation"
import { getCustomerById, getCustomerLedger } from "@/lib/actions/customers"
import { CustomerDetailClient } from "@/components/customers/customer-detail-client"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const { id } = await params

  // Concurrent loader queries
  const [customerRes, ledgerRes] = await Promise.all([
    getCustomerById(id),
    getCustomerLedger(id),
  ])

  if (customerRes.error || !customerRes.data) {
    notFound()
  }

  const customer = customerRes.data
  const ledger = ledgerRes.data || []

  return (
    <CustomerDetailClient
      customer={customer as any}
      ledger={ledger as any}
    />
  )
}
