import * as React from "react"
import { notFound } from "next/navigation"
import { getPurchaseById } from "@/lib/actions/purchases"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, FileText, User, ShoppingBag } from "lucide-react"
import Link from "next/link"

interface PageProps {
  params: Promise<{ id: string }>
}

type PurchaseItem = {
  id: string
  product_id: string
  quantity: number
  bonus_quantity: number
  unit_cost: number
  discount_amount: number
  line_total: number
  batch_number: string
  expiry_date: string | null
  product: {
    id: string
    name: string
    sku: string | null
    unit: { abbreviation: string } | null
  }
}

type PurchasePayment = {
  id: string
  payment_method: string
  amount: number
  transaction_reference: string | null
  created_at: string
}

type PurchaseDetails = {
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
  notes: string | null
  created_at: string
  supplier: { id: string; name: string; phone: string; address: string | null } | null
  items: PurchaseItem[]
  payments: PurchasePayment[]
}

export default async function PurchaseDetailPage({ params }: PageProps) {
  const { id } = await params

  const res = await getPurchaseById(id)

  if (res.error || !res.data) {
    notFound()
  }

  const purchase = res.data as unknown as PurchaseDetails

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/purchases">
            <Button variant="outline" size="icon" className="h-8 w-8 cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Purchase Invoice #{purchase.purchase_number}
              </h1>
              {getStatusBadge(purchase.payment_status)}
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Recorded on: {new Date(purchase.purchase_date).toLocaleDateString("en-US", { dateStyle: "long" })}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Details Panel */}
        <div className="md:col-span-2 space-y-6">
          {/* Items Table */}
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-2 border-b border-slate-100">
              <CardTitle className="font-bold text-slate-900">Invoice Items</CardTitle>
              <CardDescription className="text-slate-500">
                A list of medicines and supplements received in this shipment.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Product details</th>
                      <th className="px-4 py-3">Batch info</th>
                      <th className="px-4 py-3">Paid Qty</th>
                      <th className="px-4 py-3">Bonus Qty</th>
                      <th className="px-4 py-3">Cost Price</th>
                      <th className="px-4 py-3">Disc (Rs.)</th>
                      <th className="px-4 py-3">Line total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {purchase.items?.map((item) => {
                      const totalQty = item.quantity + item.bonus_quantity
                      const effectiveCost = totalQty > 0 ? (item.line_total / totalQty) : item.unit_cost
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800">{item.product?.name}</span>
                              <span className="text-xs text-slate-400 font-mono">
                                SKU: {item.product?.sku || "—"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col font-medium text-slate-650">
                              <span className="font-bold font-mono">Batch: {item.batch_number}</span>
                              {item.expiry_date && (
                                <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                  <Calendar className="h-3 w-3" />
                                  Exp: {item.expiry_date}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 font-bold text-slate-800">
                            {item.quantity} <span className="text-slate-400 text-xs font-semibold">{item.product?.unit?.abbreviation}</span>
                          </td>
                          <td className="px-4 py-4 font-bold text-emerald-650">
                            {item.bonus_quantity > 0 ? `+${item.bonus_quantity}` : "—"}
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-bold text-slate-800">Rs. {Number(item.unit_cost).toLocaleString()}</div>
                            {item.bonus_quantity > 0 && (
                              <span className="text-[10px] text-slate-400 font-semibold block">
                                Eff: Rs. {effectiveCost.toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 font-semibold text-red-600">
                            {item.discount_amount > 0 ? `Rs. ${Number(item.discount_amount).toLocaleString()}` : "—"}
                          </td>
                          <td className="px-4 py-4 font-black text-slate-900">
                            Rs. {Number(item.line_total).toLocaleString()}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Payments Log */}
          {purchase.payments && purchase.payments.length > 0 && (
            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader className="pb-2 border-b border-slate-100">
                <CardTitle className="font-bold text-slate-900">Payments Recorded</CardTitle>
                <CardDescription className="text-slate-500">
                  Transactions matching payments logged against this purchase invoice.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Payment Method</th>
                      <th className="px-4 py-3">Ref Code / Cheque #</th>
                      <th className="px-4 py-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {purchase.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/30">
                        <td className="px-4 py-4 font-mono text-xs text-slate-500">
                          {new Date(p.created_at).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="px-4 py-4 font-bold text-slate-700">{p.payment_method}</td>
                        <td className="px-4 py-4 font-mono text-slate-550">{p.transaction_reference || "—"}</td>
                        <td className="px-4 py-4 font-black text-emerald-650">Rs. {Number(p.amount).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Info Panel */}
        <div className="md:col-span-1 space-y-6">
          {/* Supplier Info */}
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-2 border-b border-slate-100">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Supplier Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-sm">
              <div className="flex flex-col gap-0.5">
                <span className="font-black text-slate-800 text-base">
                  {purchase.supplier?.name}
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  Phone: {purchase.supplier?.phone}
                </span>
              </div>
              {purchase.supplier_invoice_number && (
                <div className="flex justify-between border-t border-slate-100 pt-2 text-xs">
                  <span className="text-slate-400 font-semibold">Supplier Ref Invoice</span>
                  <span className="font-mono font-bold text-slate-700">{purchase.supplier_invoice_number}</span>
                </div>
              )}
              {purchase.notes && (
                <div className="border-t border-slate-100 pt-2 text-xs">
                  <span className="text-slate-400 font-semibold block mb-1">Invoice Notes</span>
                  <p className="text-slate-600 bg-slate-50 border border-slate-200/60 rounded p-2.5 whitespace-pre-wrap leading-relaxed font-semibold">
                    {purchase.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Calculations Summary */}
          <Card className="border-slate-200/80 shadow-sm bg-slate-50/50">
            <CardHeader className="pb-3 border-b border-slate-100 bg-white rounded-t-xl">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice Calculations</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3.5 text-sm">
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500 font-semibold">Subtotal</span>
                <span className="font-bold text-slate-800">Rs. {Number(purchase.subtotal).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500 font-semibold">Discount (-)</span>
                <span className="font-bold text-red-650">Rs. {Number(purchase.discount_total).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-850 font-bold text-sm">Grand Total</span>
                <span className="font-black text-slate-900 text-base">Rs. {Number(purchase.grand_total).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500 font-semibold">Paid Amount</span>
                <span className="font-bold text-emerald-650">Rs. {Number(purchase.paid_amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-slate-850 font-bold">Balance Payable</span>
                <span className="font-black text-red-650 text-sm">
                  Rs. {Number(purchase.balance_amount).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
