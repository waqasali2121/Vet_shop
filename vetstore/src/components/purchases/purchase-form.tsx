"use client"

import * as React from "react"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createPurchase } from "@/lib/actions/purchases"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Plus, Trash, ArrowLeft, Loader2, Calculator } from "lucide-react"
import Link from "next/link"

type Supplier = {
  id: string
  name: string
}

type Product = {
  id: string
  name: string
  sku: string | null
  barcode: string | null
}

interface PurchaseFormProps {
  suppliers: Supplier[]
  products: Product[]
}

type PurchaseItemRow = {
  product_id: string
  quantity: number
  bonus_quantity: number
  unit_cost: number
  discount_amount: number
  batch_number: string
  manufacturing_date: string
  expiry_date: string
}

export function PurchaseForm({ suppliers, products }: PurchaseFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Header State
  const [supplierId, setSupplierId] = useState("")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0])
  const [notes, setNotes] = useState("")

  // Items State (start with one empty row)
  const [items, setItems] = useState<PurchaseItemRow[]>([
    {
      product_id: "",
      quantity: 1,
      bonus_quantity: 0,
      unit_cost: 0,
      discount_amount: 0,
      batch_number: "",
      manufacturing_date: "",
      expiry_date: "",
    },
  ])

  // Payment State
  const [paidAmount, setPaidAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "EASYPAISA" | "JAZZCASH" | "BANK_TRANSFER" | "CARD" | "OTHER">("CASH")

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        product_id: "",
        quantity: 1,
        bonus_quantity: 0,
        unit_cost: 0,
        discount_amount: 0,
        batch_number: "",
        manufacturing_date: "",
        expiry_date: "",
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return
    const newItems = [...items]
    newItems.splice(index, 1)
    setItems(newItems)
  }

  const handleUpdateItem = (index: number, key: keyof PurchaseItemRow, value: any) => {
    const newItems = [...items]
    newItems[index] = {
      ...newItems[index],
      [key]: value,
    }
    setItems(newItems)
  }

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0)
  const discountTotal = items.reduce((sum, item) => sum + Number(item.discount_amount), 0)
  const grandTotal = Math.max(0, subtotal - discountTotal)

  // Auto-set paid amount to grand total if unpaid
  const handleFullPayment = () => {
    setPaidAmount(grandTotal)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Form validations
    if (!supplierId) {
      setError("Please select a supplier")
      return
    }

    if (!purchaseDate) {
      setError("Please select a purchase date")
      return
    }

    // Validate items
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item.product_id) {
        setError(`Please select a product for row #${i + 1}`)
        return
      }
      if (item.quantity <= 0) {
        setError(`Quantity must be greater than zero for row #${i + 1}`)
        return
      }
      if (item.unit_cost < 0) {
        setError(`Unit cost cannot be negative for row #${i + 1}`)
        return
      }
      if (!item.batch_number.trim()) {
        setError(`Batch number is required for row #${i + 1}`)
        return
      }
      if (!item.expiry_date) {
        setError(`Expiry date is required for row #${i + 1} (mandatory for FEFO expiry control)`)
        return
      }
    }

    if (paidAmount > grandTotal) {
      setError("Paid amount cannot exceed the grand total")
      return
    }

    startTransition(async () => {
      const payload = {
        supplier_id: supplierId,
        supplier_invoice_number: invoiceNumber,
        purchase_date: purchaseDate,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          bonus_quantity: item.bonus_quantity,
          unit_cost: item.unit_cost,
          discount_amount: item.discount_amount,
          batch_number: item.batch_number,
          manufacturing_date: item.manufacturing_date || null,
          expiry_date: item.expiry_date,
        })),
        subtotal,
        discount_total: discountTotal,
        grand_total: grandTotal,
        paid_amount: paidAmount,
        payment_method: paymentMethod,
        notes,
      }

      const result = await createPurchase(payload)

      if (result.error) {
        setError(result.error)
      } else {
        router.push("/purchases")
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Info */}
      <div className="flex items-center gap-4">
        <Link href="/purchases">
          <Button type="button" variant="outline" size="icon" className="h-8 w-8 cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Record Purchase Invoice</h1>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20">
          {error}
        </div>
      )}

      {/* Invoice Details Card */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="font-bold text-slate-900">Invoice Information</CardTitle>
          <CardDescription className="text-slate-500">
            Specify supplier details, date, and invoice number reference.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4 md:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="supplier" className="text-slate-700 font-semibold">Supplier *</Label>
            <select
              id="supplier"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select Supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="invoice_no" className="text-slate-700 font-semibold">Supplier Invoice #</Label>
            <Input
              id="invoice_no"
              placeholder="e.g. INV-2026-4890"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="border-slate-200"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="purchase_date" className="text-slate-700 font-semibold">Purchase Date *</Label>
            <Input
              id="purchase_date"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="border-slate-200"
            />
          </div>
        </CardContent>
      </Card>

      {/* Items Grid Card */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row justify-between items-center">
          <div>
            <CardTitle className="font-bold text-slate-900">Purchase Items</CardTitle>
            <CardDescription className="text-slate-500">
              Specify products, cost price, and pharmaceutical bonus (free items).
            </CardDescription>
          </div>
          <Button type="button" onClick={handleAddItem} variant="outline" size="sm" className="font-semibold text-xs gap-1.5 cursor-pointer">
            <Plus className="h-3.5 w-3.5" />
            Add Row
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-3 py-3 w-[240px]">Product Name *</th>
                <th className="px-3 py-3 w-[100px]">Qty *</th>
                <th className="px-3 py-3 w-[100px]">Bonus Qty</th>
                <th className="px-3 py-3 w-[120px]">Unit Cost *</th>
                <th className="px-3 py-3 w-[100px]">Disc. (Rs.)</th>
                <th className="px-3 py-3 w-[110px]">Batch No *</th>
                <th className="px-3 py-3 w-[130px]">Expiry *</th>
                <th className="px-3 py-3">Effective Cost</th>
                <th className="px-3 py-3 text-right pr-4">Line Total</th>
                <th className="px-3 py-3 w-[50px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {items.map((item, index) => {
                const totalReceived = Number(item.quantity) + Number(item.bonus_quantity)
                const lineTotal = (item.quantity * item.unit_cost) - item.discount_amount
                const effectiveCost = totalReceived > 0 ? (lineTotal / totalReceived) : 0

                return (
                  <tr key={index} className="hover:bg-slate-50/20">
                    {/* Product Selection */}
                    <td className="p-3">
                      <select
                        value={item.product_id}
                        onChange={(e) => handleUpdateItem(index, "product_id", e.target.value)}
                        className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none"
                      >
                        <option value="">Select Product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.sku ? `(${p.sku})` : ""}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Paid Quantity */}
                    <td className="p-3">
                      <Input
                        type="number"
                        value={item.quantity === 0 ? "" : item.quantity}
                        onChange={(e) => handleUpdateItem(index, "quantity", Number(e.target.value))}
                        className="h-9 px-2 text-xs border-slate-200"
                        min="1"
                      />
                    </td>

                    {/* Bonus Quantity */}
                    <td className="p-3">
                      <Input
                        type="number"
                        value={item.bonus_quantity === 0 ? "" : item.bonus_quantity}
                        onChange={(e) => handleUpdateItem(index, "bonus_quantity", Number(e.target.value))}
                        className="h-9 px-2 text-xs border-slate-200"
                        min="0"
                      />
                    </td>

                    {/* Unit Cost */}
                    <td className="p-3">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unit_cost === 0 ? "" : item.unit_cost}
                        onChange={(e) => handleUpdateItem(index, "unit_cost", Number(e.target.value))}
                        className="h-9 px-2 text-xs border-slate-200"
                        min="0"
                      />
                    </td>

                    {/* Discount Amount */}
                    <td className="p-3">
                      <Input
                        type="number"
                        value={item.discount_amount === 0 ? "" : item.discount_amount}
                        onChange={(e) => handleUpdateItem(index, "discount_amount", Number(e.target.value))}
                        className="h-9 px-2 text-xs border-slate-200"
                        min="0"
                      />
                    </td>

                    {/* Batch Number */}
                    <td className="p-3">
                      <Input
                        value={item.batch_number}
                        onChange={(e) => handleUpdateItem(index, "batch_number", e.target.value)}
                        placeholder="Batch #"
                        className="h-9 px-2 text-xs border-slate-200 font-mono"
                      />
                    </td>

                    {/* Expiry Date */}
                    <td className="p-3">
                      <Input
                        type="date"
                        value={item.expiry_date}
                        onChange={(e) => handleUpdateItem(index, "expiry_date", e.target.value)}
                        className="h-9 px-2 text-xs border-slate-200"
                      />
                    </td>

                    {/* Effective Cost Display */}
                    <td className="p-3 font-semibold text-slate-500 text-xs">
                      {totalReceived > 0 ? `Rs. ${effectiveCost.toFixed(2)}` : "—"}
                    </td>

                    {/* Line Total */}
                    <td className="p-3 text-right pr-4 font-bold text-slate-800">
                      Rs. {lineTotal.toLocaleString()}
                    </td>

                    {/* Delete Action */}
                    <td className="p-3 text-center">
                      <Button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        disabled={items.length === 1}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-650 cursor-pointer"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Calculations & Payment Details Card */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Notes */}
        <Card className="border-slate-200/80 shadow-sm md:col-span-1">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900">Notes & Remarks</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <textarea
              className="w-full h-32 rounded-md border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Record any invoice notes, shipment numbers, or payment terms..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Payment Configuration */}
        <Card className="border-slate-200/80 shadow-sm md:col-span-1">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900">Payment Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="paid_amt" className="text-slate-700 font-semibold">Amount Paid (Rs.)</Label>
              <div className="relative">
                <Input
                  id="paid_amt"
                  type="number"
                  placeholder="e.g. 10000"
                  value={paidAmount === 0 ? "" : paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  className="border-slate-200 pr-16"
                  min="0"
                />
                <button
                  type="button"
                  onClick={handleFullPayment}
                  className="absolute right-2 top-1.5 px-2 py-1 bg-slate-100 text-[10px] hover:bg-slate-200 text-slate-600 rounded font-bold transition-colors"
                >
                  Full Paid
                </button>
              </div>
            </div>

            {paidAmount > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="pay_method" className="text-slate-700 font-semibold">Payment Method</Label>
                <select
                  id="pay_method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 focus:outline-none"
                >
                  <option value="CASH">Cash in Hand</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="EASYPAISA">EasyPaisa</option>
                  <option value="JAZZCASH">JazzCash</option>
                  <option value="CARD">Debit/Credit Card</option>
                  <option value="OTHER">Other Method</option>
                </select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calculations Overview */}
        <Card className="border-slate-200/80 shadow-sm md:col-span-1 bg-slate-50/50">
          <CardHeader className="pb-3 border-b border-slate-100 bg-white rounded-t-xl">
            <CardTitle className="text-sm font-bold text-slate-900">Total Calculations</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3.5 text-sm">
            <div className="flex justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500 font-semibold">Invoice Subtotal</span>
              <span className="font-bold text-slate-800">Rs. {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500 font-semibold">Item Discount (-)</span>
              <span className="font-bold text-red-600">Rs. {discountTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-850 font-bold text-base">Grand Total</span>
              <span className="font-black text-slate-900 text-lg">Rs. {grandTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500 font-semibold">Amount Paid</span>
              <span className="font-bold text-emerald-600">Rs. {paidAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-slate-850 font-bold">Balance Payable</span>
              <span className="font-black text-red-650 text-base">
                Rs. {(grandTotal - paidAmount).toLocaleString()}
              </span>
            </div>
          </CardContent>
          <CardFooter className="bg-white rounded-b-xl border-t border-slate-100 flex justify-end gap-3 p-4">
            <Link href="/purchases">
              <Button type="button" variant="outline" disabled={isPending} className="font-semibold cursor-pointer">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isPending} className="font-semibold shadow-sm cursor-pointer">
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                "Save Purchase"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </form>
  )
}
