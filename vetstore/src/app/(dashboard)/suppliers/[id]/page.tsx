import * as React from "react"
import { notFound } from "next/navigation"
import { getSupplierById, getSupplierLedger } from "@/lib/actions/purchases"
import { SupplierDetailClient } from "@/components/suppliers/supplier-detail-client"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SupplierDetailPage({ params }: PageProps) {
  const { id } = await params

  // Fetch supplier details & ledger history
  const [supplierRes, ledgerRes] = await Promise.all([
    getSupplierById(id),
    getSupplierLedger(id),
  ])

  if (supplierRes.error || !supplierRes.data) {
    notFound()
  }

  const supplier = supplierRes.data
  const ledger = ledgerRes.data || []

  return (
    <SupplierDetailClient
      supplier={supplier as any}
      ledger={ledger as any}
    />
  )
}
