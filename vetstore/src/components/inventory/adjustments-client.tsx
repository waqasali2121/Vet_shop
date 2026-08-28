"use client"

import * as React from "react"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { stockAdjustmentSchema, type StockAdjustmentFormValues } from "@/lib/validations/inventory"
import { createStockAdjustment, getBatches } from "@/lib/actions/inventory"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, SlidersHorizontal, Settings2, Loader2, Calendar } from "lucide-react"

type AdjustmentItem = {
  id: string
  adjustment_number: string
  adjustment_type: string
  quantity: number
  reason: string
  notes: string | null
  created_at: string
  product: { id: string; name: string; sku: string | null; barcode: string | null }
  batch: { id: string; batch_number: string; expiry_date: string | null }
  creator: { email: string } | null
}

type SelectionProduct = {
  id: string
  name: string
  sku: string | null
  barcode: string | null
}

type SelectionBatch = {
  id: string
  batch_number: string
  available_quantity: number
  expiry_date: string | null
}

interface AdjustmentsClientProps {
  adjustments: AdjustmentItem[]
  products: SelectionProduct[]
}

export function AdjustmentsClient({ adjustments, products }: AdjustmentsClientProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Dynamic batches list based on selected product
  const [batches, setBatches] = useState<SelectionBatch[]>([])
  const [loadingBatches, setLoadingBatches] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<StockAdjustmentFormValues>({
    resolver: zodResolver(stockAdjustmentSchema) as any,
    defaultValues: {
      product_id: "",
      batch_id: "",
      adjustment_type: "PHYSICAL_COUNT",
      quantity: 0,
      reason: "",
      notes: "",
    },
  })

  // Watch selected product to load its batches
  const selectedProductId = watch("product_id")
  const selectedBatchId = watch("batch_id")

  // Load batches when product changes
  React.useEffect(() => {
    if (!selectedProductId) {
      setBatches([])
      setValue("batch_id", "")
      return
    }

    const loadBatches = async () => {
      setLoadingBatches(true)
      const res = await getBatches({ productId: selectedProductId })
      if (!res.error) {
        setBatches(res.data as SelectionBatch[])
      }
      setLoadingBatches(false)
    }

    loadBatches()
  }, [selectedProductId, setValue])

  const selectedBatch = batches.find(b => b.id === selectedBatchId)

  const onSubmit = (values: StockAdjustmentFormValues) => {
    setError(null)
    startTransition(async () => {
      const result = await createStockAdjustment(values)
      if (result.error) {
        setError(result.error)
      } else {
        setIsOpen(false)
        reset()
        router.refresh()
      }
    })
  }

  // Helper to color quantity
  const getQtyClass = (qty: number) => {
    if (qty > 0) return "text-emerald-600 font-bold"
    return "text-red-600 font-bold"
  }

  const formatAdjustmentType = (type: string) => {
    return type.replace("_", " ")
  }

  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Stock Adjustments</h1>
          <p className="text-sm text-slate-500 font-medium">
            Perform physical count corrections, write off damages, and record manual stock entries.
          </p>
        </div>
        <Button onClick={() => setIsOpen(true)} className="font-semibold gap-2 shadow-sm cursor-pointer">
          <Plus className="h-4 w-4" />
          New Adjustment
        </Button>
      </div>

      {/* Adjustments History Table */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-2 border-b border-slate-100">
          <CardTitle className="font-bold text-slate-900">Adjustment History Logs</CardTitle>
          <CardDescription className="text-slate-500">
            Audit logs of all manual inventory adjustments.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {adjustments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2 p-6">
              <SlidersHorizontal className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-semibold">No stock adjustments logged</p>
              <p className="text-xs text-slate-400">Click the button above to record your first inventory correction.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Adjustment #</th>
                    <th className="px-6 py-3">Product details</th>
                    <th className="px-6 py-3">Batch / Expiry</th>
                    <th className="px-6 py-3">Correction type</th>
                    <th className="px-6 py-3">Adjustment Qty</th>
                    <th className="px-6 py-3">Reason / Creator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {adjustments.map((adj) => (
                    <tr key={adj.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-800">
                        {adj.adjustment_number}
                        <span className="block text-[10px] text-slate-400 font-semibold font-sans mt-0.5">
                          {new Date(adj.created_at).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{adj.product?.name}</span>
                          <span className="text-xs text-slate-400 font-mono">
                            SKU: {adj.product?.sku || "—"}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col font-medium text-slate-650">
                          <span className="font-bold">Batch: {adj.batch?.batch_number}</span>
                          <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3" />
                            Exp: {adj.batch?.expiry_date || "No Expiry"}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <Badge variant="outline" className="font-semibold text-xs py-0.5 px-2 bg-slate-50 text-slate-600 border-slate-200">
                          {formatAdjustmentType(adj.adjustment_type)}
                        </Badge>
                      </td>

                      <td className={`px-6 py-4 text-base ${getQtyClass(adj.quantity)}`}>
                        {adj.quantity > 0 ? `+${adj.quantity}` : adj.quantity}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col max-w-xs">
                          <span className="font-bold text-slate-700 truncate">{adj.reason}</span>
                          <span className="text-xs text-slate-450 italic truncate">
                            By: {adj.creator?.email.split("@")[0] || "System"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Adjustment Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle className="font-bold text-slate-900">New Stock Adjustment</DialogTitle>
              <DialogDescription className="text-slate-500">
                Log a physical inventory correction. This immediately alters available quantities and writes audit ledgers.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20 mt-2">
                {error}
              </div>
            )}

            <div className="grid gap-4 py-4">
              {/* Product Selection */}
              <div className="grid gap-2">
                <Label htmlFor="product_id" className="text-slate-700">Select Product *</Label>
                <select
                  id="product_id"
                  {...register("product_id")}
                  disabled={isPending}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Choose product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.sku ? `(${p.sku})` : ""}
                    </option>
                  ))}
                </select>
                {errors.product_id && (
                  <p className="text-xs font-semibold text-destructive">{errors.product_id.message}</p>
                )}
              </div>

              {/* Batch Selection */}
              <div className="grid gap-2">
                <Label htmlFor="batch_id" className="text-slate-700">Select Batch *</Label>
                <select
                  id="batch_id"
                  {...register("batch_id")}
                  disabled={isPending || !selectedProductId || loadingBatches}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                >
                  <option value="">
                    {loadingBatches
                      ? "Loading batches..."
                      : !selectedProductId
                      ? "Choose product first..."
                      : "Choose batch..."}
                  </option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      Batch: {b.batch_number} (Stock: {b.available_quantity} units) {b.expiry_date ? `· Exp: ${b.expiry_date}` : ""}
                    </option>
                  ))}
                </select>
                {errors.batch_id && (
                  <p className="text-xs font-semibold text-destructive">{errors.batch_id.message}</p>
                )}
                {selectedBatch && (
                  <p className="text-xs text-slate-400 font-semibold pl-1">
                    Current active stock in this batch: <span className="font-bold text-slate-600">{selectedBatch.available_quantity} units</span>.
                  </p>
                )}
              </div>

              {/* Adjustment Type */}
              <div className="grid gap-2">
                <Label htmlFor="adjustment_type" className="text-slate-700">Adjustment Type *</Label>
                <select
                  id="adjustment_type"
                  {...register("adjustment_type")}
                  disabled={isPending}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="PHYSICAL_COUNT">Physical Count Correction</option>
                  <option value="DAMAGED">Damaged / Written-Off</option>
                  <option value="EXPIRED">Expired Stock Disposal</option>
                  <option value="MISSING">Missing / Theft</option>
                  <option value="CORRECTION">Manual Price/Qty Correction</option>
                  <option value="OPENING_STOCK">Opening Stock entry</option>
                  <option value="OTHER">Other Reason</option>
                </select>
                {errors.adjustment_type && (
                  <p className="text-xs font-semibold text-destructive">{errors.adjustment_type.message}</p>
                )}
              </div>

              {/* Quantity */}
              <div className="grid gap-2">
                <Label htmlFor="quantity" className="text-slate-700">Quantity Modifier *</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="e.g. -5 to reduce, 10 to increase..."
                  {...register("quantity")}
                  disabled={isPending || !selectedBatchId}
                  className="border-slate-200 focus:border-primary focus:ring-primary"
                />
                {errors.quantity && (
                  <p className="text-xs font-semibold text-destructive">{errors.quantity.message}</p>
                )}
                <span className="text-[10px] text-slate-400 font-semibold pl-1">
                  Enter negative numbers to deduct stock, positive numbers to add stock.
                </span>
              </div>

              {/* Reason */}
              <div className="grid gap-2">
                <Label htmlFor="reason" className="text-slate-700">Auditable Reason *</Label>
                <Input
                  id="reason"
                  placeholder="Describe the reason for adjustment..."
                  {...register("reason")}
                  disabled={isPending}
                  className="border-slate-200 focus:border-primary focus:ring-primary"
                />
                {errors.reason && (
                  <p className="text-xs font-semibold text-destructive">{errors.reason.message}</p>
                )}
              </div>

              {/* Notes */}
              <div className="grid gap-2">
                <Label htmlFor="notes" className="text-slate-700">Additional Notes</Label>
                <Input
                  id="notes"
                  placeholder="Optional details, voucher details, or approvals..."
                  {...register("notes")}
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
                    Processing...
                  </>
                ) : (
                  "Confirm Adjustment"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
