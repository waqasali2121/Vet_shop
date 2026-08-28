import * as React from "react"
import { getPurchases } from "@/lib/actions/purchases"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Eye, Import, FileSpreadsheet } from "lucide-react"
import Link from "next/link"

type Purchase = {
  id: string
  purchase_number: string
  supplier_invoice_number: string | null
  purchase_date: string
  subtotal: number
  discount_total: number
  grand_total: number
  paid_amount: number
  balance_amount: number
  payment_status: string
  status: string
  created_at: string
  supplier: { name: string } | null
}

export default async function PurchasesPage() {
  const res = await getPurchases()
  const purchases = (res.data || []) as unknown as Purchase[]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge variant="success">PAID</Badge>
      case "PARTIAL":
        return <Badge variant="warning">PARTIAL</Badge>
      case "UNPAID":
        return <Badge variant="destructive">UNPAID</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Purchases History</h1>
          <p className="text-sm text-slate-500 font-medium">
            Track incoming supplier invoices, pharmaceutical bonus items, and payouts.
          </p>
        </div>
        <Link href="/purchases/new">
          <Button className="font-semibold gap-2 shadow-sm cursor-pointer">
            <Plus className="h-4 w-4" />
            Record Invoice
          </Button>
        </Link>
      </div>

      {/* Purchases List Table */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-2 border-b border-slate-100">
          <CardTitle className="font-bold text-slate-900">Purchase Invoices</CardTitle>
          <CardDescription className="text-slate-500">
            A comprehensive list of all inventory shipments recorded in the system.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2 p-6">
              <Import className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-semibold">No purchase invoices recorded</p>
              <Link href="/purchases/new">
                <Button variant="outline" size="sm" className="mt-2 font-semibold">
                  Record First Purchase
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Purchase #</th>
                    <th className="px-6 py-3">Supplier</th>
                    <th className="px-6 py-3">Ref Invoice #</th>
                    <th className="px-6 py-3">Grand Total</th>
                    <th className="px-6 py-3">Paid Amount</th>
                    <th className="px-6 py-3">Balance due</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {purchases.map((purchase) => {
                    const balance = Number(purchase.balance_amount)
                    return (
                      <tr key={purchase.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">
                          {new Date(purchase.purchase_date).toLocaleDateString("en-US", { dateStyle: "short" })}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800 font-mono">
                          {purchase.purchase_number}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-700">
                          {purchase.supplier?.name || "—"}
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-550">
                          {purchase.supplier_invoice_number || "—"}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">
                          Rs. {Number(purchase.grand_total).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 font-semibold text-emerald-650">
                          Rs. {Number(purchase.paid_amount).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 font-semibold text-red-650">
                          Rs. {balance.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {getStatusBadge(purchase.payment_status)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/purchases/${purchase.id}`}>
                            <Button variant="ghost" size="sm" className="font-semibold text-primary hover:text-primary/80 gap-1.5 cursor-pointer">
                              <Eye className="h-3.5 w-3.5" />
                              Details
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
