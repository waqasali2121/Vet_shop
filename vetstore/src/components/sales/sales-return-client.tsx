"use client"

import * as React from "react"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { lookupSaleByInvoice, createSaleReturn } from "@/lib/actions/returns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Search, Loader2, ArrowLeft, RotateCcw, AlertTriangle, Calendar, ClipboardList } from "lucide-react"

type ReturnItemRow = {
  sale_item_id: string
  product_id: string
  batch_id: string
  product_name: string
  batch_number: string
  expiry_date: string | null
  sold_qty: number
  prev_returned_qty: number
  remaining_qty: number
  unit_price: number
  return_qty: number
  restocked: boolean
}

type SaleInvoiceData = {
  id: string
  invoice_number: string
  created_at: string
  subtotal: number
  grand_total: number
  paid_amount: number
  balance_amount: number
  customer: { id: string; name: string; phone: string; current_balance: number }
  items: {
    id: string
    product_id: string
    quantity: number
    unit_price: number
    prev_returned_quantity: number
    remaining_quantity: number
    product: { name: string; sku: string | null }
    allocations: {
      batch_id: string
      quantity: number
      batch: { batch_number: string; expiry_date: string | null }
    }[]
  }[]
}

type PastReturn = {
  id: string
  return_number: string
  refund_amount: number
  refund_method: string
  return_reason: string
  created_at: string
  sale: { invoice_number: string } | null
  cashier: { email: string } | null
}

interface SalesReturnClientProps {
  pastReturns: PastReturn[]
  activeSession: { id: string } | null
}

export function SalesReturnClient({ pastReturns, activeSession }: SalesReturnClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [lookupQuery, setLookupQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Loaded Invoice State
  const [saleData, setSaleData] = useState<SaleInvoiceData | null>(null)
  const [returnItems, setReturnItems] = useState<ReturnItemRow[]>([])
  const [returnReason, setReturnReason] = useState("")
  const [refundMethod, setRefundMethod] = useState<"CASH" | "CREDIT_OFFSET" | "EASYPAISA" | "JAZZCASH" | "BANK_TRANSFER" | "CARD" | "OTHER">("CASH")

  const handleLookup = () => {
    setError(null)
    setSuccessMsg(null)
    if (!lookupQuery.trim()) return

    startTransition(async () => {
      const res = await lookupSaleByInvoice(lookupQuery)
      if (res.error) {
        setError(res.error)
        setSaleData(null)
      } else if (res.data) {
        const sale = res.data as SaleInvoiceData
        setSaleData(sale)

        // Map items to return rows
        const rows: ReturnItemRow[] = []
        sale.items.forEach(item => {
          // If product had multiple batch allocations, we map return row per allocation to know which batch to restock
          item.allocations.forEach(alloc => {
            // Calculate proportion of returned quantity for this batch if necessary,
            // or let user return specific batch quantity.
            // Simplified: we map return item per batch allocation in sale
            // Find if any return exists for this specific batch?
            // To be precise: each allocation specifies a batch_id and quantity
            // Calculate max returnable from this batch = allocation.quantity - (we assume previous returns deducted first)
            // For simple implementation: we let user return up to the batch allocation quantity
            // But we constraint total return of item to remaining_quantity
            rows.push({
              sale_item_id: item.id,
              product_id: item.product_id,
              batch_id: alloc.batch_id,
              product_name: item.product.name,
              batch_number: alloc.batch?.batch_number || "Default",
              expiry_date: alloc.batch?.expiry_date || null,
              sold_qty: alloc.quantity,
              prev_returned_qty: 0, // simplified per batch
              remaining_qty: alloc.quantity, // cap at allocated qty
              unit_price: Number(item.unit_price),
              return_qty: 0,
              restocked: true
            })
          })
        })

        setReturnItems(rows)
        // Default refund method based on invoice (if credit was used, default to CREDIT_OFFSET)
        if (sale.balance_amount > 0) {
          setRefundMethod("CREDIT_OFFSET")
        } else {
          setRefundMethod("CASH")
        }
      }
    })
  }

  const handleUpdateReturnQty = (index: number, qty: number) => {
    setError(null)
    const newItems = [...returnItems]
    const row = newItems[index]

    if (qty < 0) return
    if (qty > row.remaining_qty) {
      setError(`Cannot return more than originally purchased in this batch (${row.remaining_qty})`)
      return
    }

    newItems[index].return_qty = qty
    setReturnItems(newItems)
  }

  const handleUpdateRestock = (index: number, restock: boolean) => {
    const newItems = [...returnItems]
    newItems[index].restocked = restock
    setReturnItems(newItems)
  }

  // Calculations
  const activeReturnRows = returnItems.filter(item => item.return_qty > 0)
  const totalRefundAmount = activeReturnRows.reduce((sum, item) => sum + (item.return_qty * item.unit_price), 0)

  const handleCancelForm = () => {
    setSaleData(null)
    setReturnItems([])
    setReturnReason("")
    setLookupQuery("")
  }

  const handleSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    if (activeReturnRows.length === 0) {
      setError("Please select at least one item and enter return quantity")
      return
    }

    if (!returnReason.trim()) {
      setError("Please provide a reason for the return")
      return
    }

    if (refundMethod === "CASH" && !activeSession) {
      setError("Active cash session required for cash refunds. Open register first.")
      return
    }

    startTransition(async () => {
      const payload = {
        sale_id: saleData!.id,
        refund_amount: totalRefundAmount,
        refund_method: refundMethod,
        return_reason: returnReason,
        items: activeReturnRows.map(row => ({
          sale_item_id: row.sale_item_id,
          product_id: row.product_id,
          batch_id: row.batch_id,
          quantity: row.return_qty,
          unit_price: row.unit_price,
          restocked: row.restocked
        }))
      }

      const res = await createSaleReturn(payload)
      if (res.error) {
        setError(res.error)
      } else {
        setSuccessMsg(`Sales Return #${res.data.return_number} processed successfully!`)
        handleCancelForm()
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sales Returns</h1>
        <p className="text-sm text-slate-500 font-medium">
          Lookup invoice records, process refunds, and manage restocking queues.
        </p>
      </div>

      {successMsg && (
        <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 font-semibold border border-emerald-200">
          {successMsg}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-semibold border border-destructive/20">
          {error}
        </div>
      )}

      {/* Invoice Lookup Form */}
      {!saleData ? (
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="font-bold text-slate-900">Invoice Lookup</CardTitle>
            <CardDescription className="text-slate-500">
              Search by invoice number (e.g., SFV-2026-08-000001) to begin the return workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex gap-3 max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Enter Invoice number..."
                className="pl-9 border-slate-200"
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLookup()
                }}
              />
            </div>
            <Button onClick={handleLookup} disabled={isPending} className="font-semibold shadow-sm cursor-pointer">
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Search Invoice"
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Return Form panel */
        <form onSubmit={handleSubmitReturn} className="space-y-6">
          <div className="flex items-center gap-4">
            <Button type="button" onClick={handleCancelForm} variant="outline" size="icon" className="h-8 w-8 cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-bold text-slate-800">
              Return workflow for Invoice: {saleData.invoice_number}
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Invoice Meta card */}
            <Card className="border-slate-200/80 shadow-sm md:col-span-1 bg-slate-50/50">
              <CardHeader className="pb-2 border-b border-slate-100 bg-white rounded-t-xl">
                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Original Sale Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3.5 text-xs font-semibold">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400">Customer Name</span>
                  <span className="text-slate-800 font-bold">{saleData.customer.name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400">Original Total</span>
                  <span className="text-slate-800 font-bold">Rs. {Number(saleData.grand_total).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400">Amount Paid</span>
                  <span className="text-emerald-700 font-bold">Rs. {Number(saleData.paid_amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-slate-400">Outstanding Balance</span>
                  <span className="text-red-650 font-bold">Rs. {Number(saleData.balance_amount).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Return Items Panel */}
            <Card className="border-slate-200/80 shadow-sm md:col-span-2">
              <CardHeader className="pb-2 border-b border-slate-100">
                <CardTitle className="font-bold text-slate-900">Select Items to Return</CardTitle>
                <CardDescription className="text-slate-500">
                  Enter quantity to return and check Restock if item is sellable.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Product Name</th>
                      <th className="px-4 py-3">Batch info</th>
                      <th className="px-4 py-3">Sold Qty</th>
                      <th className="px-4 py-3 w-[100px]">Return Qty</th>
                      <th className="px-4 py-3 text-center">Restock?</th>
                      <th className="px-4 py-3 text-right">Refund Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {returnItems.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/20">
                        <td className="px-4 py-3 font-bold text-slate-800">{row.product_name}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-bold">Batch: {row.batch_number}</span>
                            {row.expiry_date && (
                              <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 mt-0.5">
                                <Calendar className="h-3 w-3" />
                                Exp: {row.expiry_date}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-550">{row.sold_qty}</td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            className="h-8 text-xs border-slate-200"
                            value={row.return_qty === 0 ? "" : row.return_qty}
                            onChange={(e) => handleUpdateReturnQty(idx, Number(e.target.value))}
                            min="0"
                            max={row.remaining_qty}
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={row.restocked}
                            onChange={(e) => handleUpdateRestock(idx, e.target.checked)}
                            className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">
                          Rs. {(row.return_qty * row.unit_price).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* Refund Details & Submit */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-slate-200/80 shadow-sm md:col-span-1">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900">Return Reason</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <textarea
                  className="w-full h-24 rounded-md border border-slate-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Mandatory: e.g. Expired batch delivered, damaged seal, incorrect dosage item..."
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  required
                />
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 shadow-sm md:col-span-1">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900">Refund Configuration</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="refund_method" className="text-xs text-slate-600 font-semibold">Refund Method</Label>
                  <select
                    id="refund_method"
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value as any)}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 focus:outline-none"
                  >
                    <option value="CASH">Cash Refund</option>
                    {saleData.customer.id !== "00000000-0000-0000-0000-000000000000" && (
                      <option value="CREDIT_OFFSET">Offset Customer Balance (Udhaar decrease)</option>
                    )}
                    <option value="EASYPAISA">EasyPaisa digital transfer</option>
                    <option value="JAZZCASH">JazzCash digital transfer</option>
                    <option value="BANK_TRANSFER">Bank transfer refund</option>
                    <option value="OTHER">Other Adjustment</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 shadow-sm md:col-span-1 bg-slate-50/50">
              <CardHeader className="pb-3 border-b border-slate-100 bg-white rounded-t-xl">
                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Refund Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-555 font-semibold">Total Refund Amount</span>
                  <span className="text-xl font-black text-red-650">Rs. {totalRefundAmount.toLocaleString()}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed">
                  Refund Method: {refundMethod.replace("_", " ")}
                </div>
              </CardContent>
              <CardFooter className="bg-white rounded-b-xl border-t border-slate-100 flex justify-end gap-3 p-4 shrink-0">
                <Button type="button" onClick={handleCancelForm} variant="outline" className="font-semibold">
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} className="font-semibold shadow-sm cursor-pointer">
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Confirm Return"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </form>
      )}

      {/* Past Returns Log */}
      {!saleData && (
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="font-bold text-slate-900">Return History Logs</CardTitle>
            <CardDescription className="text-slate-500">
              Recent sales returns and refund transactions issued in the store.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {pastReturns.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2 p-6">
                <RotateCcw className="h-10 w-10 text-slate-300" />
                <p className="text-sm font-semibold">No returns processed yet</p>
                <p className="text-xs text-slate-400">Search an invoice above to begin returns processing.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-6 py-3">Return Date</th>
                      <th className="px-6 py-3">Return #</th>
                      <th className="px-6 py-3">Original Invoice</th>
                      <th className="px-6 py-3">Refund Amount</th>
                      <th className="px-6 py-3">Method</th>
                      <th className="px-6 py-3 font-semibold">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {pastReturns.map((ret) => (
                      <tr key={ret.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">
                          {new Date(ret.created_at).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-800">{ret.return_number}</td>
                        <td className="px-6 py-4 font-mono text-slate-700">{ret.sale?.invoice_number || "—"}</td>
                        <td className="px-6 py-4 font-black text-red-650">Rs. {Number(ret.refund_amount).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="font-semibold text-xs py-0.5 px-2 bg-slate-50 text-slate-600 border-slate-200">
                            {ret.refund_method}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs font-semibold max-w-sm truncate" title={ret.return_reason}>
                          {ret.return_reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
