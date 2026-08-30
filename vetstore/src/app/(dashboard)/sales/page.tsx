import * as React from "react"
import { getSales } from "@/lib/actions/sales"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { SalesListClient } from "@/components/sales/sales-list-client"

type Sale = {
  id: string
  invoice_number: string
  subtotal: number
  discount_amount: number
  grand_total: number
  paid_amount: number
  balance_amount: number
  payment_status: string
  sale_status: string
  created_at: string
  customer: { name: string; phone: string } | null
}

export default async function SalesHistoryPage() {
  const res = await getSales()
  const sales = (res.data || []) as unknown as Sale[]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sales History</h1>
          <p className="text-sm text-slate-500 font-medium">
            Review POS transactions, invoice statuses, and cashier checkout logs.
          </p>
        </div>
        <Link href="/pos">
          <Button className="font-semibold gap-2 shadow-sm cursor-pointer">
            <Plus className="h-4 w-4" />
            Open POS Terminal
          </Button>
        </Link>
      </div>

      <SalesListClient sales={sales} />
    </div>
  )
}
