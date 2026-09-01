"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Edit, AlertTriangle, Calendar, Package, ArrowUpRight } from "lucide-react"

type Product = {
  id: string
  name: string
  generic_name: string | null
  sku: string | null
  barcode: string | null
  manufacturer: string | null
  dosage_form: string | null
  strength: string | null
  pack_size: string | null
  purchase_price_reference: number
  retail_price: number
  wholesale_price: number
  minimum_sale_price: number
  minimum_stock: number
  reorder_quantity: number
  track_batch: boolean
  track_expiry: boolean
  is_active: boolean
  category: { id: string; name: string } | null
  brand: { id: string; name: string } | null
  unit: { id: string; name: string; abbreviation: string } | null
}

type Batch = {
  id: string
  batch_number: string
  manufacturing_date: string | null
  expiry_date: string | null
  initial_quantity: number
  available_quantity: number
  unit_cost: number
  status: string
  supplier: { id: string; name: string } | null
}

interface ProductDetailViewProps {
  product: Product
  batches: Batch[]
  isOwner?: boolean
}

export function ProductDetailView({ product, batches, isOwner = false }: ProductDetailViewProps) {
  // Calculate total stock
  const totalStock = batches.reduce((sum, b) => sum + b.available_quantity, 0)

  // Helper to determine expiry status
  const getExpiryStatus = (expiryDateStr: string | null) => {
    if (!expiryDateStr) return { label: "No Expiry", variant: "outline" as const }

    const expiryDate = new Date(expiryDateStr)
    const today = new Date()
    const diffTime = expiryDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) {
      return { label: "Expired", variant: "destructive" as const, days: diffDays }
    } else if (diffDays <= 30) {
      return { label: `Expiring (${diffDays}d)`, variant: "destructive" as const, days: diffDays }
    } else if (diffDays <= 90) {
      return { label: `Expiring (${diffDays}d)`, variant: "warning" as const, days: diffDays }
    } else if (diffDays <= 180) {
      return { label: `Expiring (${diffDays}d)`, variant: "info" as const, days: diffDays }
    }
    return { label: "Safe", variant: "success" as const, days: diffDays }
  }

  // Stock status
  const getStockBadge = () => {
    if (totalStock === 0) {
      return <Badge variant="destructive">OUT OF STOCK</Badge>
    } else if (totalStock <= product.minimum_stock) {
      return <Badge variant="warning">LOW STOCK ({totalStock})</Badge>
    }
    return <Badge variant="success">IN STOCK ({totalStock})</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/products">
            <Button variant="outline" size="icon" className="h-8 w-8 cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{product.name}</h1>
              {getStockBadge()}
            </div>
            <p className="text-sm text-slate-500 font-semibold italic">
              {product.generic_name || "No generic name specified"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/products/${product.id}/edit`}>
            <Button className="font-semibold gap-2 shadow-sm cursor-pointer">
              <Edit className="h-4 w-4" />
              Edit Product
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Specifications Column */}
        <div className="md:col-span-1 space-y-6">
          {/* Basic Details */}
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-2 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">Specifications</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3.5 text-sm">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400 font-semibold">SKU</span>
                <span className="font-mono font-bold text-slate-800">{product.sku || "—"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400 font-semibold">Barcode</span>
                <span className="font-mono font-bold text-slate-800">{product.barcode || "—"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400 font-semibold">Category</span>
                <span className="font-bold text-slate-850">{product.category?.name || "—"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400 font-semibold">Brand</span>
                <span className="font-bold text-slate-850">{product.brand?.name || "—"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400 font-semibold">Base Unit</span>
                <span className="font-bold text-slate-800">
                  {product.unit ? `${product.unit.name} (${product.unit.abbreviation})` : "—"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400 font-semibold">Manufacturer</span>
                <span className="font-bold text-slate-800">{product.manufacturer || "—"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400 font-semibold">Dosage Form</span>
                <span className="font-bold text-slate-800">{product.dosage_form || "—"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400 font-semibold">Strength</span>
                <span className="font-bold text-slate-800">{product.strength || "—"}</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-slate-400 font-semibold">Pack Size</span>
                <span className="font-bold text-slate-800">{product.pack_size || "—"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Info */}
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-2 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">Pricing Structures</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3.5 text-sm">
              {isOwner && (
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400 font-semibold">Reference Cost</span>
                  <span className="font-bold text-slate-800">Rs. {product.purchase_price_reference.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400 font-semibold">Retail Price</span>
                <span className="font-bold text-emerald-700">Rs. {product.retail_price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400 font-semibold">Wholesale Price</span>
                <span className="font-bold text-blue-700">Rs. {product.wholesale_price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-slate-400 font-semibold">Min. Sale Price</span>
                <span className="font-bold text-amber-700">Rs. {product.minimum_sale_price.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stock Batches Column */}
        <div className="md:col-span-2 space-y-6">
          {/* Stock Summary Card */}
          <Card className="border-slate-200/80 shadow-sm bg-slate-50/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Available Stock</p>
                  <p className="text-3xl font-black text-slate-900">
                    {totalStock} <span className="text-sm font-semibold text-slate-500">{product.unit?.abbreviation}</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Min. Stock Alert</p>
                <p className="text-sm font-bold text-slate-700">{product.minimum_stock} {product.unit?.abbreviation}</p>
              </div>
            </CardContent>
          </Card>

          {/* Active Batches list */}
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-bold text-slate-900">Inventory Batches</CardTitle>
                <CardDescription className="text-slate-500">
                  Active stock batches tracked by expiry dates (FEFO queue).
                </CardDescription>
              </div>
              <Link href="/inventory/adjustments">
                <Button variant="outline" size="sm" className="font-semibold text-xs gap-1.5 cursor-pointer">
                  Stock Adjustment
                  <ArrowUpRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {batches.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2 p-6">
                  <AlertTriangle className="h-10 w-10 text-slate-300" />
                  <p className="text-sm font-semibold">No stock batches found for this product</p>
                  <p className="text-xs text-slate-400">Stock will be populated automatically when recording purchase invoices.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <th className="px-6 py-3">Batch Number</th>
                        <th className="px-6 py-3">Expiry Date</th>
                        {isOwner && <th className="px-6 py-3">Unit Cost</th>}
                        <th className="px-6 py-3">Stock Qty</th>
                        <th className="px-6 py-3 text-center">Expiry Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {batches.map((batch) => {
                        const expiry = getExpiryStatus(batch.expiry_date)
                        return (
                          <tr key={batch.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-800">
                              <div className="flex flex-col">
                                <span>{batch.batch_number}</span>
                                <span className="text-[10px] text-slate-400 font-semibold">
                                  Sup: {batch.supplier?.name || "—"}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-600 font-medium">
                              {batch.expiry_date ? (
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                  <span>{batch.expiry_date}</span>
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>
                            {isOwner && (
                              <td className="px-6 py-4 font-semibold text-slate-700">
                                Rs. {batch.unit_cost.toLocaleString()}
                              </td>
                            )}
                            <td className="px-6 py-4 font-bold text-slate-800">
                              {batch.available_quantity} / {batch.initial_quantity}
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
      </div>
    </div>
  )
}
