import * as React from "react"
import { getCustomerPayments } from "@/lib/actions/customers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Coins, Receipt, ArrowDownLeft, Phone } from "lucide-react"

type PaymentLog = {
  id: string
  transaction_type: string
  reference_number: string | null
  debit: number
  credit: number
  running_balance: number
  description: string | null
  created_at: string
  customer: {
    id: string
    name: string
    phone: string
  } | null
}

export default async function CustomerPaymentsPage() {
  const res = await getCustomerPayments()
  const payments = (res.data || []) as unknown as PaymentLog[]

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customer Collections Log</h1>
        <p className="text-sm text-slate-500 font-medium">
          View history of payments collected from customer accounts (reducing outstanding Udhaar receivables).
        </p>
      </div>

      {/* Table Card */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-2 border-b border-slate-100">
          <CardTitle className="font-bold text-slate-900">Collection Receipts</CardTitle>
          <CardDescription className="text-slate-500">
            A chronological list of payments received from credit clients.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2 p-6">
              <Receipt className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-semibold">No payments collected yet</p>
              <p className="text-xs text-slate-400">Receive payment collections directly from the Customer Ledger views.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Collection Date</th>
                    <th className="px-6 py-3">Receipt Number</th>
                    <th className="px-6 py-3">Customer Account</th>
                    <th className="px-6 py-3">Amount Received</th>
                    <th className="px-6 py-3">Remaining Balance</th>
                    <th className="px-6 py-3">Description / Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {payments.map((p) => {
                    const received = Number(p.credit)
                    const bal = Number(p.running_balance)
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">
                          {new Date(p.created_at).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-800">
                          {p.reference_number || "—"}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-700">
                          <div className="flex flex-col">
                            <span>{p.customer?.name}</span>
                            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3" />
                              {p.customer?.phone}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-emerald-650 font-black text-base">
                          <div className="flex items-center gap-0.5">
                            <ArrowDownLeft className="h-3.5 w-3.5 shrink-0" />
                            Rs. {received.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-black text-slate-800">
                          Rs. {bal.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs font-semibold max-w-sm truncate" title={p.description || ""}>
                          {p.description || "—"}
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
