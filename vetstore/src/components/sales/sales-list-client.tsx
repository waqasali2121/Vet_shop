"use client"

import * as React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Eye, ShoppingCart, Search } from "lucide-react"
import Link from "next/link"

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

interface SalesListClientProps {
  sales: Sale[]
}

export function SalesListClient({ sales }: SalesListClientProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredSales = sales.filter((sale) => {
    const term = searchTerm.toLowerCase().trim()
    if (!term) return true

    const invoiceMatch = sale.invoice_number.toLowerCase().includes(term)
    const customerName = sale.customer?.name || "walk-in customer"
    const customerMatch = customerName.toLowerCase().includes(term)

    return invoiceMatch || customerMatch
  })

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

  return (
    <div className="space-y-6">
      {/* Search Filter Bar */}
      <Card className="border-slate-200/80 shadow-sm shrink-0">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search invoices by invoice number or customer name..."
              className="pl-9 border-slate-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-2 border-b border-slate-100">
          <CardTitle className="font-bold text-slate-900">Sales Invoices</CardTitle>
          <CardDescription className="text-slate-550">
            A comprehensive list of all customer retail transactions.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2 p-6">
              <ShoppingCart className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-semibold">No sales transactions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Checkout Date</th>
                    <th className="px-6 py-3">Invoice #</th>
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Grand Total</th>
                    <th className="px-6 py-3">Paid Amount</th>
                    <th className="px-6 py-3">Credit Balance</th>
                    <th className="px-6 py-3 text-center">Payment Status</th>
                    <th className="px-6 py-3 text-center">Sale Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredSales.map((sale) => {
                    const balance = Number(sale.balance_amount)
                    const isVoided = sale.sale_status === "VOIDED"
                    return (
                      <tr
                        key={sale.id}
                        className={`hover:bg-slate-50/50 transition-colors ${
                          isVoided ? "opacity-60 bg-slate-50/20" : ""
                        }`}
                      >
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">
                          {new Date(sale.created_at).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800 font-mono">
                          {sale.invoice_number}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-700">
                          {sale.customer?.name || "Walk-in Customer"}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">
                          Rs. {Number(sale.grand_total).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 font-semibold text-emerald-650">
                          Rs. {Number(sale.paid_amount).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 font-semibold text-red-650">
                          Rs. {balance.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {getStatusBadge(sale.payment_status)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {getSaleStatusBadge(sale.sale_status)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/sales/${sale.id}`}>
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
