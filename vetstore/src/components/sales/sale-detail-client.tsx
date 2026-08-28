"use client"

import * as React from "react"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { voidSale } from "@/lib/actions/sales"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, Printer, ShieldAlert, Loader2, Calendar, ClipboardList } from "lucide-react"
import Link from "next/link"

type SaleDetail = {
  id: string
  invoice_number: string
  created_at: string
  subtotal: number
  discount_amount: number
  tax_amount: number
  grand_total: number
  paid_amount: number
  balance_amount: number
  payment_status: string
  sale_status: string
  notes: string | null
  voided_at: string | null
  void_reason: string | null
  customer: { id: string; name: string; phone: string; customer_type: string; current_balance: number }
  cashier: { email: string; first_name: string | null }
  items: {
    id: string
    quantity: number
    unit_price: number
    unit_cost: number
    discount_amount: number
    line_total: number
    product: { name: string; sku: string | null }
    allocations: {
      id: string
      quantity: number
      batch: { batch_number: string; expiry_date: string | null }
    }[]
  }[]
  payments: {
    id: string
    payment_method: string
    amount: number
    transaction_reference: string | null
    created_at: string
  }[]
}

interface SaleDetailClientProps {
  sale: SaleDetail
}

export function SaleDetailClient({ sale }: SaleDetailClientProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleVoid = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!reason.trim()) return

    startTransition(async () => {
      const result = await voidSale(sale.id, reason)
      if (result.error) {
        setError(result.error)
      } else {
        setIsOpen(false)
        router.refresh()
      }
    })
  }

  const handlePrint = () => {
    window.open(`/api/receipt?id=${sale.id}`, "_blank", "width=400,height=600")
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge variant="success">PAID</Badge>
      case "PARTIAL":
        return <Badge variant="warning">PARTIAL</Badge>
      case "CREDIT":
        return <Badge variant="destructive">CREDIT</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getSaleStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge variant="success">COMPLETED</Badge>
      case "VOIDED":
        return <Badge variant="destructive">VOIDED</Badge>
      case "RETURNED":
        return <Badge variant="destructive">RETURNED</Badge>
      case "PARTIALLY_RETURNED":
        return <Badge variant="warning">PARTIAL RETURN</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const isVoided = sale.sale_status === "VOIDED"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/sales">
            <Button variant="outline" size="icon" className="h-8 w-8 cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Invoice #{sale.invoice_number}
              </h1>
              {getSaleStatusBadge(sale.sale_status)}
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Checked out on: {new Date(sale.created_at).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {!isVoided && (
            <Button onClick={() => setIsOpen(true)} variant="destructive" className="font-semibold gap-2 cursor-pointer">
              <ShieldAlert className="h-4 w-4" />
              Void Sale
            </Button>
          )}
          <Button onClick={handlePrint} className="font-semibold gap-2 shadow-sm cursor-pointer">
            <Printer className="h-4 w-4" />
            Print Receipt (80mm)
          </Button>
        </div>
      </div>

      {isVoided && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20 font-semibold">
          <div className="flex items-start gap-2">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">THIS INVOICE HAS BEEN VOIDED</p>
              <p className="mt-1 font-medium">Reason: {sale.void_reason}</p>
              <p className="text-xs opacity-80 mt-0.5">
                Voided on {sale.voided_at ? new Date(sale.voided_at).toLocaleString() : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Panel */}
        <div className="md:col-span-2 space-y-6">
          {/* Sale Items Table */}
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-2 border-b border-slate-100">
              <CardTitle className="font-bold text-slate-900">Invoice Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Product details</th>
                      <th className="px-4 py-3">Batch allocations</th>
                      <th className="px-4 py-3">Qty</th>
                      <th className="px-4 py-3">Unit Price</th>
                      <th className="px-4 py-3">Discount</th>
                      <th className="px-4 py-3 text-right">Line total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {sale.items?.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-4 font-bold text-slate-800">
                          <div className="flex flex-col">
                            <span>{item.product?.name}</span>
                            <span className="text-xs text-slate-400 font-mono">
                              SKU: {item.product?.sku || "—"}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-xs font-semibold text-slate-650">
                          <div className="flex flex-col gap-1">
                            {item.allocations?.map((alloc) => (
                              <span key={alloc.id} className="font-mono">
                                Batch: {alloc.batch?.batch_number} ({alloc.quantity})
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="px-4 py-4 font-bold text-slate-700">
                          {item.quantity}
                        </td>

                        <td className="px-4 py-4 text-slate-600 font-medium">
                          Rs. {Number(item.unit_price).toLocaleString()}
                        </td>

                        <td className="px-4 py-4 text-red-600 font-semibold">
                          {item.discount_amount > 0 ? `Rs. ${Number(item.discount_amount).toLocaleString()}` : "—"}
                        </td>

                        <td className="px-4 py-4 text-right font-black text-slate-800">
                          Rs. {Number(item.line_total).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Payments Log */}
          {sale.payments && sale.payments.length > 0 && (
            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader className="pb-2 border-b border-slate-100">
                <CardTitle className="font-bold text-slate-900">Payments Recorded</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Payment Method</th>
                      <th className="px-4 py-3">Reference / Txn #</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {sale.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/30">
                        <td className="px-4 py-4 font-mono text-xs text-slate-500">
                          {new Date(p.created_at).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="px-4 py-4 font-bold text-slate-700">{p.payment_method}</td>
                        <td className="px-4 py-4 font-mono text-slate-550">{p.transaction_reference || "—"}</td>
                        <td className="px-4 py-4 text-right font-black text-emerald-650">Rs. {Number(p.amount).toLocaleString()}</td>
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
          {/* Customer Card */}
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-2 border-b border-slate-100">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3.5 text-sm">
              <div className="flex flex-col gap-0.5">
                <span className="font-black text-slate-800 text-base">{sale.customer?.name}</span>
                <span className="text-xs text-slate-500 font-semibold">Phone: {sale.customer?.phone}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-xs">
                <span className="text-slate-400 font-semibold">Cashier Account</span>
                <span className="font-bold text-slate-700">{sale.cashier?.email.split("@")[0]}</span>
              </div>
              {sale.notes && (
                <div className="border-t border-slate-100 pt-2 text-xs">
                  <span className="text-slate-400 font-semibold block mb-1">Invoice Notes</span>
                  <p className="text-slate-650 bg-slate-50 border border-slate-200/60 rounded p-2 text-xs font-semibold whitespace-pre-wrap">
                    {sale.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing Breakdown */}
          <Card className="border-slate-200/80 shadow-sm bg-slate-50/50">
            <CardHeader className="pb-3 border-b border-slate-100 bg-white rounded-t-xl">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pricing Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3.5 text-sm">
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500 font-semibold">Subtotal</span>
                <span className="font-bold text-slate-800">Rs. {Number(sale.subtotal).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500 font-semibold">Discount (-)</span>
                <span className="font-bold text-red-650">Rs. {Number(sale.discount_amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-850 font-bold text-sm">Grand Total</span>
                <span className="font-black text-slate-900 text-base">Rs. {Number(sale.grand_total).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500 font-semibold">Paid Amount</span>
                <span className="font-bold text-emerald-650">Rs. {Number(sale.paid_amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-slate-850 font-bold">Credit Balance due</span>
                <span className="font-black text-red-650 text-sm">
                  Rs. {Number(sale.balance_amount).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Void Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-sm">
          <form onSubmit={handleVoid}>
            <DialogHeader>
              <DialogTitle className="font-bold text-slate-900">Void Sales Invoice</DialogTitle>
              <DialogDescription className="text-slate-500">
                Are you sure you want to void this invoice? This action will reverse customer balances, restore quantities to batch inventory, and record audit details.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20 mt-2">
                {error}
              </div>
            )}

            <div className="grid gap-2 py-4">
              <Label htmlFor="void_reason" className="text-xs font-semibold text-slate-700">Reason for Void *</Label>
              <Input
                id="void_reason"
                placeholder="e.g. Cashier error, duplicate print..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                disabled={isPending}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={isPending}>
                {isPending ? "Processing..." : "Confirm Void"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
