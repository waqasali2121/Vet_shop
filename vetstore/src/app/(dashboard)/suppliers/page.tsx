import * as React from "react"
import { getSuppliers } from "@/lib/actions/purchases"
import { SupplierListClient } from "@/components/suppliers/supplier-list-client"

export default async function SuppliersPage() {
  const res = await getSuppliers()
  const suppliers = res.data || []

  return (
    <SupplierListClient suppliers={suppliers as any} />
  )
}
