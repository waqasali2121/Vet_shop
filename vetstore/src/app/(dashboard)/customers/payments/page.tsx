import { getCustomers } from "@/lib/actions/customers"
import { getSales } from "@/lib/actions/sales"
import { CustomerPaymentsClient } from "@/components/customers/customer-payments-client"

export default async function CustomerPaymentsPage() {
  const [customersRes, salesRes] = await Promise.all([
    getCustomers(),
    getSales(),
  ])

  const customers = customersRes.data || []
  const sales = salesRes.data || []

  return (
    <CustomerPaymentsClient customers={customers as any} sales={sales as any} />
  )
}
