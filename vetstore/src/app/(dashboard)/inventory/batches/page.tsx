import * as React from "react"
import { getBatches } from "@/lib/actions/inventory"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, AlertTriangle, Layers, User } from "lucide-react"

type BatchItem = {
  id: string
  batch_number: string
  manufacturing_date: string | null
  expiry_date: string | null
  initial_quantity: number
  available_quantity: number
  unit_cost: number
  status: string
  created_at: string
  product: {
    id: string
    name: string
    sku: string | null
    barcode: string | null
    unit: { abbreviation: string } | null
  }
  supplier: {
    id: string
    name: string
  } | null
}

export default async function BatchesPage() {
  const result = await getBatches()
  const batches = (result.data || []) as unknown as BatchItem[]

  // Helper to determine expiry status
  const getExpiryStatus = (expiryDateStr: string | null) => {
    if (!expiryDateStr) return { label: "No Expiry", variant: "outline" as const }

    const expiryDate = new Date(expiryDateStr)
    const today = new Date()
    const diffTime = expiryDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) {
      return { label: "Expired", variant: "destructive" as const }
    } else if (diffDays <= 30) {
      return { label: `Urgent (${diffDays}d)`, variant: "destructive" as const }
    } else if (diffDays <= 90) {
      return { label: `Near (${diffDays}d)`, variant: "warning" as const }
    } else if (diffDays <= 180) {
      return { label: `Expiring (${diffDays}d)`, variant: "info" as const }
    }
    return { label: "Safe", variant: "success" as const }
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Product Batches</h1>
        <p className="text-sm text-slate-500 font-medium">
          Monitor manufacturing/expiry dates, purchase costs, and remaining stock quantities per batch.
        </p>
      </div>

      {/* Batches Table Card */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-2 border-b border-slate-100">
          <CardTitle className="font-bold text-slate-900">Active Batches Inventory</CardTitle>
          <CardDescription className="text-slate-500">
            A granular list of all batches currently tracked in the database.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {batches.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2 p-6">
              <Layers className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-semibold">No active batches found</p>
              <p className="text-xs text-slate-400">Record a purchase or adjust stock to create inventory batches.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Product details</th>
                    <th className="px-6 py-3">Batch info</th>
                    <th className="px-6 py-3">Mfg & Expiry</th>
                    <th className="px-6 py-3">Cost Value</th>
                    <th className="px-6 py-3">Available / Initial</th>
                    <th className="px-6 py-3 text-center">Expiry status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {batches.map((batch) => {
                    const expiry = getExpiryStatus(batch.expiry_date)
                    const isLow = batch.available_quantity === 0
                    return (
                      <tr
                        key={batch.id}
                        className={`hover:bg-slate-50/50 transition-colors ${
                          isLow ? "bg-slate-50/30 opacity-60" : ""
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{batch.product?.name}</span>
                            <span className="text-xs text-slate-400 font-mono">
                              SKU: {batch.product?.sku || "—"}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700">{batch.batch_number}</span>
                            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {batch.supplier?.name || "No supplier"}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-col text-xs font-medium text-slate-600">
                            <span className="flex items-center gap-1">
                              Mfg: {batch.manufacturing_date || "—"}
                            </span>
                            <span className="flex items-center gap-1 font-bold text-slate-700 mt-0.5">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              Exp: {batch.expiry_date || "—"}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 font-semibold text-slate-850">
                          Rs. {batch.unit_cost.toLocaleString()}
                        </td>

                        <td className="px-6 py-4">
                          <span className={`font-black ${isLow ? "text-slate-400" : "text-slate-800"}`}>
                            {batch.available_quantity}
                          </span>
                          <span className="text-slate-400 text-xs font-semibold ml-1">
                            / {batch.initial_quantity} {batch.product?.unit?.abbreviation || "vials"}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <Badge
                            variant={expiry.variant}
                            className="font-bold text-[9px] uppercase tracking-wider px-2"
                          >
                            {expiry.label}
                          </Badge>
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
