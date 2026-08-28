"use client"

import * as React from "react"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createSupplierPayment } from "@/lib/actions/purchases"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, Plus, CreditCard, Loader2, ArrowUpRight, ArrowDownLeft } from "lucide-react"
import Link from "next/link"

type Supplier = {
  id: string
  name: string
  phone: string
  email: string | null
  address: string | null
  contact_person: string | null
  current_balance: number
  is_active: boolean
}

type LedgerItem = {
  id: string
  transaction_type: string
  reference_number: string | null
  debit: number
  credit: number
  running_balance: number
  description: string | null
  created_at: string
}

interface SupplierDetailClientProps {
  supplier: Supplier
  ledger: LedgerItem[]
}

export function SupplierDetailClient({ supplier, ledger }: SupplierDetailClientProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Payment form states
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "EASYPAISA" | "JAZZCASH" | "BANK_TRANSFER" | "CARD" | "OTHER">("CASH")
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")

  const handleOpenPayment = () => {
    setAmount("")
    setReference("")
    setNotes("")
    setPaymentMethod("CASH")
    setError(null)
    setIsOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payAmt = Number(amount)
    if (isNaN(payAmt) || payAmt <= 0) {
      setError("Please enter a valid payment amount greater than zero")
      return
    }

    startTransition(async () => {
      const result = await createSupplierPayment(
        supplier.id,
        payAmt,
        paymentMethod,
        reference,
        notes
      )

      if (result.error) {
        setError(result.error)
      } else {
        setIsOpen(false)
        router.refresh()
      }
    })
  }

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case "OPENING_BALANCE":
        return <Badge variant="secondary">OP. BAL</Badge>
      case "PURCHASE":
        return <Badge variant="outline" className="border-red-200 text-red-650 bg-red-50/30">PURCHASE</Badge>
      case "PAYMENT":
        return <Badge variant="outline" className="border-emerald-200 text-emerald-650 bg-emerald-50/30">PAYMENT</Badge>
      case "PURCHASE_RETURN":
        return <Badge variant="outline" className="border-blue-200 text-blue-650 bg-blue-50/30">RETURN</Badge>
      default:
        return <Badge variant="outline">ADJ</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/suppliers">
            <Button variant="outline" size="icon" className="h-8 w-8 cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{supplier.name}</h1>
              <Badge variant={supplier.is_active ? "success" : "secondary"}>
                {supplier.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Contact: {supplier.contact_person || "None"} · Phone: {supplier.phone} · Email: {supplier.email || "None"}
            </p>
          </div>
        </div>

        <Button onClick={handleOpenPayment} className="font-semibold gap-2 shadow-sm cursor-pointer">
          <CreditCard className="h-4 w-4" />
          Record Payment
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Payable Summary card */}
        <Card className="border-slate-200/80 shadow-sm md:col-span-1 bg-slate-50/50">
          <CardHeader className="pb-2 border-b border-slate-100 bg-white rounded-t-xl">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Account Payable</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col">
              <span className="text-3xl font-black text-red-650">
                Rs. {Number(supplier.current_balance).toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-slate-500 mt-1">
                Outstanding Balance due to supplier.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Ledger Statement Table */}
        <Card className="border-slate-200/80 shadow-sm md:col-span-2">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="font-bold text-slate-900">Account Ledger Statement</CardTitle>
            <CardDescription className="text-slate-500">
              Running ledger transaction statement of purchases and payments.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {ledger.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2 p-6">
                <CreditCard className="h-10 w-10 text-slate-300" />
                <p className="text-sm font-semibold">Ledger is empty</p>
                <p className="text-xs text-slate-400">Transactions are recorded here when purchases or payments are made.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Type / Ref #</th>
                      <th className="px-6 py-3">Description</th>
                      <th className="px-6 py-3">Debit (-)</th>
                      <th className="px-6 py-3">Credit (+)</th>
                      <th className="px-6 py-3">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {ledger.map((item) => {
                      const debit = Number(item.debit)
                      const credit = Number(item.credit)
                      const bal = Number(item.running_balance)
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">
                            {new Date(item.created_at).toLocaleDateString("en-US", { dateStyle: "short" })}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1 items-start">
                              {getTransactionBadge(item.transaction_type)}
                              {item.reference_number && (
                                <span className="font-mono text-[10px] text-slate-400 font-bold">
                                  {item.reference_number}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600 text-xs font-medium max-w-xs truncate" title={item.description || ""}>
                            {item.description || "—"}
                          </td>
                          <td className="px-6 py-4 text-emerald-600 font-bold">
                            {debit > 0 ? (
                              <span className="flex items-center gap-0.5">
                                <ArrowDownLeft className="h-3 w-3 shrink-0" />
                                Rs. {debit.toLocaleString()}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-6 py-4 text-red-600 font-bold">
                            {credit > 0 ? (
                              <span className="flex items-center gap-0.5">
                                <ArrowUpRight className="h-3 w-3 shrink-0" />
                                Rs. {credit.toLocaleString()}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-6 py-4 font-black text-slate-800">
                            Rs. {bal.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="font-bold text-slate-900">Record Supplier Payment</DialogTitle>
              <DialogDescription className="text-slate-500">
                Log a payout transaction to the supplier ledger. Cash payments will affect the active cash register session.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20 mt-2">
                {error}
              </div>
            )}

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="amount" className="text-slate-700">Payment Amount (PKR) *</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="e.g. 25000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  disabled={isPending}
                  className="border-slate-200 focus:border-primary focus:ring-primary"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="paymentMethod" className="text-slate-700">Payment Method *</Label>
                <select
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  disabled={isPending}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 focus:outline-none"
                >
                  <option value="CASH">Cash in Hand</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="EASYPAISA">EasyPaisa</option>
                  <option value="JAZZCASH">JazzCash</option>
                  <option value="CARD">Debit / Credit Card</option>
                  <option value="OTHER">Other Method</option>
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reference" className="text-slate-700">Transaction Reference Code / Check #</Label>
                <Input
                  id="reference"
                  placeholder="e.g. TXN-108200389, Check #4892..."
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  disabled={isPending}
                  className="border-slate-200"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes" className="text-slate-700">Description / Memo Notes</Label>
                <Input
                  id="notes"
                  placeholder="Optional payment notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isPending}
                  className="border-slate-200"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="font-semibold"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="font-semibold shadow-sm cursor-pointer">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Record Payment"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
