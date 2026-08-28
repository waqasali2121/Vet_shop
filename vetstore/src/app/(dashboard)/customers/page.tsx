import * as React from "react"
import { getCustomers } from "@/lib/actions/customers"
import { CustomerListClient } from "@/components/customers/customer-list-client"

export default async function CustomersPage() {
  const res = await getCustomers()
  const customers = res.data || []

  return (
    <CustomerListClient customers={customers as any} />
  )
}
