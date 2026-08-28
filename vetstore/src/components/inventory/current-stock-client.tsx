"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Eye, Warehouse, Coins, TrendingUp, PackageOpen } from "lucide-react"
import Link from "next/link"

type StockItem = {
  id: string
  name: string
  generic_name: string | null
  sku: string | null
  barcode: string | null
  minimum_stock: number
  retail_price: number
  purchase_price_reference: number
  category: { name: string } | null
  brand: { name: string } | null
  unit: { abbreviation: string } | null
  total_available: number
  cost_valuation: number
  retail_valuation: number
  batches_count: number
}

interface CurrentStockClientProps {
  stockItems: StockItem[]
  categories: { id: string; name: string }[]
  brands: { id: string; name: string }[]
}

export function CurrentStockClient({
  stockItems,
  categories,
  brands,
}: CurrentStockClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "")
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "")
  const [selectedBrand, setSelectedBrand] = useState(searchParams.get("brand") || "")

  const updateQuery = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.set("page", "1")
    router.push(`${pathname}?${params.toString()}`)
  }

  // Calculate high-level stock statistics
  const skusCount = stockItems.length
  const totalCostValuation = stockItems.reduce((sum, item) => sum + item.cost_valuation, 0)
  const totalRetailValuation = stockItems.reduce((sum, item) => sum + item.retail_valuation, 0)
  const lowStockCount = stockItems.filter(item => item.total_available <= item.minimum_stock).length

  return (
    <div className="space-y-6">
      {/* Title & Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Current Stock</h1>
        <p className="text-sm text-slate-500 font-medium">
          View inventory levels, check stock levels, and monitor valuations.
        </p>
      </div>

      {/* Summary KPI Widgets */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total SKUs</CardTitle>
            <Warehouse className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{skusCount}</div>
            <p className="text-xs text-slate-500 mt-1 font-medium">Registered Active items</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valuation (Cost)</CardTitle>
            <Coins className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">Rs. {totalCostValuation.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1 font-medium">Sum of batch-wise unit costs</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valuation (Retail)</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">Rs. {totalRetailValuation.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1 font-medium">Valued at product retail price</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-red-500 uppercase tracking-wider">Low Stock SKUs</CardTitle>
            <div className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lowStockCount}</div>
            <p className="text-xs text-slate-500 mt-1 font-medium">Items requiring urgent reorder</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search stock by SKU, barcode, name..."
              className="pl-9 border-slate-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  updateQuery("search", searchTerm)
                }
              }}
            />
          </div>

          <select
            className="h-9 w-full md:w-48 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value)
              updateQuery("category", e.target.value)
            }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            className="h-9 w-full md:w-48 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={selectedBrand}
            onChange={(e) => {
              setSelectedBrand(e.target.value)
              updateQuery("brand", e.target.value)
            }}
          >
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <Button
            onClick={() => updateQuery("search", searchTerm)}
            variant="secondary"
            className="font-semibold shadow-sm cursor-pointer"
          >
            Apply
          </Button>
        </CardContent>
      </Card>

      {/* Stock Table */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="p-0">
          {stockItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2 p-6">
              <PackageOpen className="h-12 w-12 text-slate-300" />
              <p className="text-sm font-semibold">No stock records found</p>
              <p className="text-xs text-slate-400">Search term may have returned empty, or no products have active inventory.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Product details</th>
                    <th className="px-6 py-3">SKU / Barcode</th>
                    <th className="px-6 py-3">Category / Brand</th>
                    <th className="px-6 py-3">Available stock</th>
                    <th className="px-6 py-3">Cost Valuation</th>
                    <th className="px-6 py-3">Retail Valuation</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {stockItems.map((item) => {
                    const isLow = item.total_available <= item.minimum_stock
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{item.name}</span>
                            <span className="text-xs text-slate-400 font-semibold italic">
                              {item.generic_name || "No generic name"}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 font-mono text-xs text-slate-600">
                          <div>SKU: {item.sku || "—"}</div>
                          <div>BAR: {item.barcode || "—"}</div>
                        </td>

                        <td className="px-6 py-4 text-slate-600 font-medium">
                          <div>{item.category?.name || "—"}</div>
                          <span className="text-xs text-slate-400">{item.brand?.name || "—"}</span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-black text-base ${isLow ? "text-red-600" : "text-slate-850"}`}>
                              {item.total_available}
                            </span>
                            <span className="text-xs text-slate-400 font-semibold">
                              {item.unit?.abbreviation || "units"}
                            </span>
                            {isLow && (
                              <Badge variant="destructive" className="text-[8px] font-bold uppercase tracking-wider py-0 px-1 ml-1 leading-none">
                                Low
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                            {item.batches_count} active batch(es)
                          </p>
                        </td>

                        <td className="px-6 py-4 font-semibold text-slate-700">
                          Rs. {item.cost_valuation.toLocaleString()}
                        </td>

                        <td className="px-6 py-4 font-bold text-slate-800">
                          Rs. {item.retail_valuation.toLocaleString()}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <Link href={`/products/${item.id}`}>
                            <Button variant="ghost" size="sm" className="font-semibold text-primary hover:text-primary/80 gap-1.5 cursor-pointer">
                              <Eye className="h-3.5 w-3.5" />
                              View Batches
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
