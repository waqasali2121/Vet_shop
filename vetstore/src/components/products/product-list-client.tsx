"use client"

import React from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import { toggleProductStatus, deleteProduct, getProductBatches, getProductMovements } from "@/lib/actions/products"
import { createStockAdjustment } from "@/lib/actions/inventory"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Plus,
  Search,
  Eye,
  Edit,
  Power,
  ChevronLeft,
  ChevronRight,
  Package,
  Loader2,
  Trash2,
  Sliders,
  History,
  AlertTriangle
} from "lucide-react"

type Product = {
  id: string
  name: string
  generic_name: string | null
  sku: string | null
  barcode: string | null
  purchase_price_reference: number
  retail_price: number
  wholesale_price: number
  minimum_sale_price: number
  minimum_stock: number
  is_active: boolean
  category: { id: string; name: string } | null
  brand: { id: string; name: string } | null
  unit: { id: string; name: string; abbreviation: string } | null
  total_stock: number
  earliest_expiry: string | null
  earliest_batch: string | null
  supplier_name: string | null
  supplier_phone: string | null
  status: string // In Stock, Low Stock, Out of Stock, Expired
}

interface ProductListClientProps {
  products: Product[]
  categories: { id: string; name: string }[]
  brands?: { id: string; name: string }[]
  count: number
  totalPages: number
  currentPage: number
  isOwner?: boolean
}

export function ProductListClient({
  products,
  categories,
  brands = [],
  count,
  totalPages,
  currentPage,
  isOwner = false,
}: ProductListClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = React.useTransition()

  // Local state for basic filters
  const [searchTerm, setSearchTerm] = React.useState(searchParams.get("search") || "")
  const [selectedCategory, setSelectedCategory] = React.useState(searchParams.get("category") || "")
  const [selectedStock, setSelectedStock] = React.useState(searchParams.get("stock") || "")
  const [selectedExpiry, setSelectedExpiry] = React.useState(searchParams.get("expiry") || "")

  // Sorting state
  const sortCol = searchParams.get("sortCol") || "name"
  const sortOrd = searchParams.get("sortOrd") || "asc"

  // Modals state
  const [viewProduct, setViewProduct] = React.useState<Product | null>(null)
  const [adjustProduct, setAdjustProduct] = React.useState<Product | null>(null)
  const [historyProduct, setHistoryProduct] = React.useState<Product | null>(null)
  const [deleteProductId, setDeleteProductId] = React.useState<string | null>(null)

  // Details modal metadata
  const [batchesList, setBatchesList] = React.useState<any[]>([])
  const [loadingBatches, setLoadingBatches] = React.useState(false)

  // History modal metadata
  const [movementsList, setMovementsList] = React.useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = React.useState(false)

  // Stock Adjustment form state
  const [selectedBatchId, setSelectedBatchId] = React.useState("")
  const [adjustQty, setAdjustQty] = React.useState("")
  const [adjustType, setAdjustType] = React.useState("PHYSICAL_COUNT")
  const [adjustReason, setAdjustReason] = React.useState("")
  const [actionError, setActionError] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)

  // Navigation query updates helper
  const updateQueries = (updates: Record<string, string>, resetPage = true) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    if (resetPage) {
      params.set("page", "1")
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  // Handle pagination
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", page.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  // Handle sorting toggle
  const handleSort = (column: string) => {
    const nextOrd = sortCol === column && sortOrd === "asc" ? "desc" : "asc"
    updateQueries({ sortCol: column, sortOrd: nextOrd })
  }

  // Handle delete action
  const handleDeleteProduct = () => {
    if (!deleteProductId) return
    setActionError(null)
    startTransition(async () => {
      const res = await deleteProduct(deleteProductId)
      if (res.error) {
        setActionError(res.error)
      } else {
        if (res.message) {
          alert(res.message) // Soft-deleted warning
        }
        setDeleteProductId(null)
        router.refresh()
      }
    })
  }

  // Handle status toggle
  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      const result = await toggleProductStatus(id, currentStatus)
      if (result.success) {
        router.refresh()
      } else {
        alert(result.error || "Failed to update product status")
      }
    })
  }

  // Fetch batches when adjusting stock
  React.useEffect(() => {
    if (adjustProduct) {
      setLoadingBatches(true)
      setSelectedBatchId("")
      getProductBatches(adjustProduct.id).then(res => {
        if (res.data) {
          setBatchesList(res.data)
          if (res.data.length > 0) {
            setSelectedBatchId(res.data[0].id)
          }
        }
        setLoadingBatches(false)
      })
    }
  }, [adjustProduct])

  // Fetch batches when viewing product details
  React.useEffect(() => {
    if (viewProduct) {
      setLoadingBatches(true)
      getProductBatches(viewProduct.id).then(res => {
        if (res.data) {
          setBatchesList(res.data)
        }
        setLoadingBatches(false)
      })
    }
  }, [viewProduct])

  // Fetch history movements when viewing history modal
  React.useEffect(() => {
    if (historyProduct) {
      setLoadingHistory(true)
      getProductMovements(historyProduct.id).then(res => {
        if (res.data) {
          setMovementsList(res.data)
        }
        setLoadingHistory(false)
      })
    }
  }, [historyProduct])

  // Submit stock adjustment
  const handleApplyAdjustment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setActionError(null)
    setSuccessMsg(null)

    if (!selectedBatchId) {
      setActionError("Please select a valid batch to adjust.")
      return
    }
    if (!adjustQty || isNaN(Number(adjustQty)) || Number(adjustQty) === 0) {
      setActionError("Please enter a non-zero adjustment quantity.")
      return
    }
    if (!adjustReason.trim()) {
      setActionError("Please provide a reason for the adjustment.")
      return
    }

    startTransition(async () => {
      const res = await createStockAdjustment({
        product_id: adjustProduct!.id,
        batch_id: selectedBatchId,
        adjustment_type: adjustType as any,
        quantity: Number(adjustQty),
        reason: adjustReason,
        notes: `Manual adjustment from catalog table`
      })

      if (res.error) {
        setActionError(res.error)
      } else {
        setSuccessMsg("Stock adjustment saved successfully!")
        setAdjustQty("")
        setAdjustReason("")

        // Refresh product batches
        const freshBatches = await getProductBatches(adjustProduct!.id)
        if (freshBatches.data) setBatchesList(freshBatches.data)
        router.refresh()
      }
    })
  }

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "In Stock":
        return <Badge variant="success" className="font-bold">In Stock</Badge>
      case "Low Stock":
        return <Badge variant="warning" className="font-bold">Low Stock</Badge>
      case "Out of Stock":
        return <Badge variant="destructive" className="font-bold">Out of Stock</Badge>
      case "Expired":
        return <Badge className="bg-purple-650 hover:bg-purple-600 text-white font-bold">Expired</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Medicines Inventory</h1>
          <p className="text-sm text-slate-500 font-semibold">
            Track available medicines, stock levels, expiries, purchase history, and register adjustments.
          </p>
        </div>
        <Link href="/products/new">
          <Button className="font-bold gap-2 shadow-sm cursor-pointer bg-primary hover:bg-primary-hover">
            <Plus className="h-4 w-4" />
            Add Medicine
          </Button>
        </Link>
      </div>

      {/* Filter Toolbar */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          {/* Text search */}
          <div className="relative flex-1 min-w-[240px]">
            <Label className="text-xs text-slate-500 font-bold mb-1.5 block">Search Medicines</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, generic, SKU, or batch..."
                className="pl-9 border-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    updateQueries({ search: searchTerm })
                  }
                }}
              />
              {searchTerm && (
                <button
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-semibold"
                  onClick={() => {
                    setSearchTerm("")
                    updateQueries({ search: "" })
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Category Dropdown */}
          <div className="grid gap-1.5">
            <Label className="text-xs text-slate-500 font-bold">Category</Label>
            <select
              className="h-9 w-full md:w-44 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-750 focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                updateQueries({ category: e.target.value })
              }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Level Filter */}
          <div className="grid gap-1.5">
            <Label className="text-xs text-slate-500 font-bold">Stock Status</Label>
            <select
              className="h-9 w-full md:w-40 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-755 focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={selectedStock}
              onChange={(e) => {
                setSelectedStock(e.target.value)
                updateQueries({ stock: e.target.value })
              }}
            >
              <option value="">All Stock Levels</option>
              <option value="in">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>

          {/* Expiry Filter */}
          <div className="grid gap-1.5">
            <Label className="text-xs text-slate-500 font-bold">Expiry Status</Label>
            <select
              className="h-9 w-full md:w-40 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-755 focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={selectedExpiry}
              onChange={(e) => {
                setSelectedExpiry(e.target.value)
                updateQueries({ expiry: e.target.value })
              }}
            >
              <option value="">All Expiry Statuses</option>
              <option value="active">Active & Safe</option>
              <option value="near">Expiring Soon (90d)</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {/* Search Button */}
          <Button
            onClick={() => updateQueries({ search: searchTerm, category: selectedCategory, stock: selectedStock, expiry: selectedExpiry })}
            variant="secondary"
            className="font-semibold shadow-sm cursor-pointer h-9 px-5 bg-slate-100 border border-slate-200 hover:bg-slate-200"
          >
            Apply Filters
          </Button>
        </CardContent>
      </Card>

      {/* Products Table Card */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-bold text-slate-900 text-lg">Medicines list</CardTitle>
            <CardDescription className="text-xs">
              Total medicines registered: {count}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2 p-6">
              <Package className="h-12 w-12 text-slate-300" />
              <p className="text-sm font-semibold">No medicines found matching the filters</p>
              <Link href="/products/new">
                <Button variant="outline" size="sm" className="mt-2 font-bold cursor-pointer">
                  Add First Medicine
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider select-none">
                    <th onClick={() => handleSort("name")} className="px-6 py-3 cursor-pointer hover:bg-slate-100/70 transition-colors">
                      Product {sortCol === "name" && (sortOrd === "asc" ? "▲" : "▼")}
                    </th>
                    <th className="px-6 py-3">Category</th>
                    {isOwner && (
                      <th onClick={() => handleSort("purchase_price_reference")} className="px-6 py-3 text-right cursor-pointer hover:bg-slate-100/70 transition-colors">
                        Purchase {sortCol === "purchase_price_reference" && (sortOrd === "asc" ? "▲" : "▼")}
                      </th>
                    )}
                    <th onClick={() => handleSort("retail_price")} className="px-6 py-3 text-right cursor-pointer hover:bg-slate-100/70 transition-colors">
                      Sale {sortCol === "retail_price" && (sortOrd === "asc" ? "▲" : "▼")}
                    </th>
                    <th onClick={() => handleSort("total_stock")} className="px-6 py-3 text-center cursor-pointer hover:bg-slate-100/70 transition-colors">
                      Stock {sortCol === "total_stock" && (sortOrd === "asc" ? "▲" : "▼")}
                    </th>
                    <th onClick={() => handleSort("earliest_expiry")} className="px-6 py-3 cursor-pointer hover:bg-slate-100/70 transition-colors">
                      Expiry {sortCol === "earliest_expiry" && (sortOrd === "asc" ? "▲" : "▼")}
                    </th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {products.map((product) => {
                    const lowStockAlert = product.total_stock <= product.minimum_stock
                    return (
                      <tr
                        key={product.id}
                        className={`hover:bg-slate-50/50 transition-colors ${
                          !product.is_active ? "opacity-60 bg-slate-55/20" : ""
                        }`}
                      >
                        {/* Product details */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-[14px]">{product.name}</span>
                            <span className="text-[11px] text-slate-400 font-semibold italic">
                              {product.generic_name || "No generic formulation"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Code: {product.sku || "—"}
                            </span>
                          </div>
                        </td>

                        {/* Category & Brand */}
                        <td className="px-6 py-4 text-slate-650 font-semibold text-[13px]">
                          <div className="flex flex-col">
                            <span>{product.category?.name || "—"}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {product.brand?.name || "—"}
                            </span>
                          </div>
                        </td>

                        {/* Purchase price (Visible to Owner only) */}
                        {isOwner && (
                          <td className="px-6 py-4 text-right font-semibold text-slate-800 text-[13px]">
                            Rs. {Number(product.purchase_price_reference).toLocaleString()}
                          </td>
                        )}

                        {/* Retail price */}
                        <td className="px-6 py-4 text-right font-bold text-slate-900 text-[13px]">
                          Rs. {Number(product.retail_price).toLocaleString()}
                        </td>

                        {/* Stock */}
                        <td className="px-6 py-4 text-center font-bold text-slate-900 text-[13px]">
                          <span className={lowStockAlert ? "text-amber-600 font-black" : ""}>
                            {product.total_stock} {product.unit?.abbreviation || "units"}
                          </span>
                        </td>

                        {/* Expiry */}
                        <td className="px-6 py-4 text-slate-700 text-[12px] font-semibold">
                          <div className="flex flex-col">
                            <span>
                              {product.earliest_expiry
                                ? new Date(product.earliest_expiry).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                                : "No Expiry"}
                            </span>
                            {product.earliest_batch && (
                              <span className="text-[9px] text-slate-400 font-mono">
                                Batch: {product.earliest_batch}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 text-center">
                          {getStatusBadge(product.status)}
                        </td>

                        {/* Actions dropdown/buttons */}
                        <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                          {/* View details */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewProduct(product)}
                            className="h-8 w-8 text-slate-500 cursor-pointer hover:bg-slate-100"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {/* Edit details */}
                          <Link href={`/products/${product.id}/edit`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary hover:text-primary-hover hover:bg-slate-100 cursor-pointer"
                              title="Edit product"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>

                          {/* Stock adjustment */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setAdjustProduct(product)}
                            className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-slate-100 cursor-pointer"
                            title="Stock adjustment"
                          >
                            <Sliders className="h-4 w-4" />
                          </Button>

                          {/* View history */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setHistoryProduct(product)}
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-slate-100 cursor-pointer"
                            title="View history"
                          >
                            <History className="h-4 w-4" />
                          </Button>

                          {/* Soft/Hard Delete */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteProductId(product.id)}
                            className="h-8 w-8 text-red-500 hover:text-red-650 hover:bg-red-50 cursor-pointer"
                            title="Delete medicine"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>

                          {/* Toggle Active status */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleStatus(product.id, product.is_active)}
                            disabled={isPending}
                            className={`h-8 w-8 cursor-pointer ${
                              product.is_active
                                ? "text-red-400 hover:text-red-500"
                                : "text-emerald-500 hover:text-emerald-650"
                            }`}
                            title={product.is_active ? "Deactivate" : "Activate"}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-semibold">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isPending}
                  className="font-semibold text-xs py-1 px-3"
                >
                  <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || isPending}
                  className="font-semibold text-xs py-1 px-3"
                >
                  Next
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 1. VIEW MEDICINE DETAILS MODAL */}
      <Dialog open={!!viewProduct} onOpenChange={() => setViewProduct(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <span>Medicine Profile Sheet</span>
            </DialogTitle>
          </DialogHeader>
          {viewProduct && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 border border-slate-200/80 rounded-lg p-3 bg-slate-50/50 text-xs">
                <div>
                  <span className="text-slate-450 block font-semibold">Medicine Name</span>
                  <span className="font-bold text-slate-800 text-[14px]">{viewProduct.name}</span>
                </div>
                <div>
                  <span className="text-slate-450 block font-semibold">Generic Formulation</span>
                  <span className="font-semibold text-slate-700 italic">{viewProduct.generic_name || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-450 block font-semibold">Category / Brand</span>
                  <span className="font-bold text-slate-700">{viewProduct.category?.name || "—"} / {viewProduct.brand?.name || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-450 block font-semibold">Base Pack Unit</span>
                  <span className="font-bold text-slate-700">{viewProduct.unit?.name} ({viewProduct.unit?.abbreviation})</span>
                </div>
                <div>
                  <span className="text-slate-450 block font-semibold">Product Code / SKU</span>
                  <span className="font-mono text-slate-850 font-bold">{viewProduct.sku || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-450 block font-semibold">Barcode (EAN)</span>
                  <span className="font-mono text-slate-850 font-bold">{viewProduct.barcode || "—"}</span>
                </div>
                {isOwner && (
                  <div>
                    <span className="text-slate-450 block font-semibold">Ref Purchase Price</span>
                    <span className="font-bold text-slate-800">Rs. {Number(viewProduct.purchase_price_reference).toLocaleString()}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-450 block font-semibold">POS Selling Price</span>
                  <span className="font-bold text-emerald-700">Rs. {Number(viewProduct.retail_price).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-450 block font-semibold">Min Stock Alert Level</span>
                  <span className="font-bold text-slate-700">{viewProduct.minimum_stock} units</span>
                </div>
                <div>
                  <span className="text-slate-450 block font-semibold">Total Stock Quantity</span>
                  <span className="font-bold text-slate-900">{viewProduct.total_stock} {viewProduct.unit?.abbreviation || "units"}</span>
                </div>
                <div>
                  <span className="text-slate-450 block font-semibold">Supplier Name</span>
                  <span className="font-bold text-slate-700">{viewProduct.supplier_name || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-450 block font-semibold">Supplier Contact Number</span>
                  <span className="font-bold text-slate-750">{viewProduct.supplier_phone || "—"}</span>
                </div>
              </div>

              {/* Batches Table */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Inventory Batches</h4>
                {loadingBatches ? (
                  <div className="flex items-center justify-center p-4 text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin mr-1.5" />
                    <span className="text-xs">Loading batches...</span>
                  </div>
                ) : batchesList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No batches found for this product.</p>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 font-bold text-slate-500 uppercase">
                          <th className="px-4 py-2">Batch #</th>
                          <th className="px-4 py-2">Supplier</th>
                          <th className="px-4 py-2 text-right">Available Qty</th>
                          {isOwner && <th className="px-4 py-2 text-right">Unit cost</th>}
                          <th className="px-4 py-2">Expiry Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold">
                        {batchesList.map((batch: any) => (
                          <tr key={batch.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2 font-mono">{batch.batch_number}</td>
                            <td className="px-4 py-2">{batch.supplier?.name || "—"}</td>
                            <td className="px-4 py-2 text-right text-slate-800">{batch.available_quantity}</td>
                            {isOwner && <td className="px-4 py-2 text-right">Rs. {Number(batch.unit_cost).toLocaleString()}</td>}
                            <td className="px-4 py-2">
                              {batch.expiry_date
                                ? new Date(batch.expiry_date).toLocaleDateString()
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewProduct(null)} className="font-semibold text-xs py-1">
              Close Sheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. STOCK ADJUSTMENT MODAL */}
      <Dialog open={!!adjustProduct} onOpenChange={() => { setAdjustProduct(null); setActionError(null); setSuccessMsg(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="h-5 w-5 text-amber-600" />
              <span>Stock Adjustment</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Perform physical counts, correct mistakes, or log damaged items for: <strong className="text-slate-800">{adjustProduct?.name}</strong>
            </DialogDescription>
          </DialogHeader>

          {adjustProduct && (
            <form onSubmit={handleApplyAdjustment} className="space-y-4">
              {actionError && (
                <div className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive font-medium border border-destructive/20">
                  {actionError}
                </div>
              )}
              {successMsg && (
                <div className="rounded-md bg-emerald-50 p-2.5 text-xs text-emerald-700 font-semibold border border-emerald-200">
                  {successMsg}
                </div>
              )}

              {/* Select Batch */}
              <div className="grid gap-1.5">
                <Label htmlFor="batch_adj" className="text-xs text-slate-600 font-semibold">Select Target Batch</Label>
                {loadingBatches ? (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 py-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Loading batches...</span>
                  </div>
                ) : batchesList.length === 0 ? (
                  <p className="text-xs text-red-500 font-semibold italic">No active batches available. Create a purchase or batch first.</p>
                ) : (
                  <select
                    id="batch_adj"
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 focus:outline-none"
                  >
                    {batchesList.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.batch_number} (Avail: {b.available_quantity} / Cost: Rs. {Number(b.unit_cost).toLocaleString()})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Quantity input */}
                <div className="grid gap-1.5">
                  <Label htmlFor="qty_adj" className="text-xs text-slate-600 font-semibold">Quantity Change</Label>
                  <Input
                    id="qty_adj"
                    type="number"
                    placeholder="e.g. +10 or -5"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    disabled={isPending}
                    className="h-9"
                  />
                </div>

                {/* Adjustment Type */}
                <div className="grid gap-1.5">
                  <Label htmlFor="type_adj" className="text-xs text-slate-600 font-semibold">Adjustment Type</Label>
                  <select
                    id="type_adj"
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value)}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-705 focus:outline-none"
                  >
                    <option value="PHYSICAL_COUNT">Physical Count</option>
                    <option value="DAMAGED">Damaged Item</option>
                    <option value="EXPIRED">Expired Item</option>
                    <option value="MISSING">Missing Item</option>
                    <option value="CORRECTION">Correction</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              {/* Reason */}
              <div className="grid gap-1.5">
                <Label htmlFor="reason_adj" className="text-xs text-slate-600 font-semibold">Reason for adjustment *</Label>
                <Input
                  id="reason_adj"
                  placeholder="e.g. Expired batch discarded, physical stock count match"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  disabled={isPending}
                  className="h-9"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAdjustProduct(null)}
                  className="font-semibold text-xs py-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || batchesList.length === 0}
                  className="font-bold text-xs py-1 shadow-sm"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Adjusting...
                    </>
                  ) : (
                    "Apply Adjustment"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 3. VIEW HISTORY MOVEMENTS MODAL */}
      <Dialog open={!!historyProduct} onOpenChange={() => setHistoryProduct(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <History className="h-5 w-5 text-blue-600" />
              <span>Stock History Log</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Audit log of all stock inflows and outflows for: <strong className="text-slate-800">{historyProduct?.name}</strong>
            </DialogDescription>
          </DialogHeader>

          {historyProduct && (
            <div className="space-y-4">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-10 text-slate-400">
                  <Loader2 className="h-7 w-7 animate-spin mr-2" />
                  <span className="text-sm">Fetching history entries...</span>
                </div>
              ) : movementsList.length === 0 ? (
                <div className="text-center py-10 text-slate-400 font-semibold text-xs">
                  No stock history logged for this medicine.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 font-bold text-slate-500 uppercase">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Movement Type</th>
                        <th className="px-4 py-3 text-right">Quantity change</th>
                        <th className="px-4 py-3 text-right">Unit Cost</th>
                        <th className="px-4 py-3">Batch Number</th>
                        <th className="px-4 py-3">Details / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold">
                      {movementsList.map((move: any) => {
                        const isStockIn = move.quantity > 0
                        return (
                          <tr key={move.id} className="hover:bg-slate-55/30">
                            <td className="px-4 py-2.5 text-slate-500">
                              {new Date(move.created_at).toLocaleString()}
                            </td>
                            <td className="px-4 py-2.5">
                              <Badge
                                variant={isStockIn ? "success" : "destructive"}
                                className="text-[9px] uppercase font-bold"
                              >
                                {move.movement_type}
                              </Badge>
                            </td>
                            <td className={`px-4 py-2.5 text-right font-black ${isStockIn ? "text-emerald-600" : "text-red-500"}`}>
                              {isStockIn ? `+${move.quantity}` : move.quantity}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              Rs. {Number(move.unit_cost).toLocaleString()}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-slate-605">
                              {move.batch?.batch_number || "—"}
                            </td>
                            <td className="px-4 py-2.5 text-slate-600 max-w-[200px] truncate" title={move.notes}>
                              {move.notes || "—"}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setHistoryProduct(null)} className="font-semibold text-xs py-1">
              Close Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. CONFIRM DELETE DIALOG */}
      <Dialog open={!!deleteProductId} onOpenChange={() => { setDeleteProductId(null); setActionError(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
              <span>Confirm Delete Medicine</span>
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <p className="text-sm text-slate-500 font-semibold">
              Are you sure you want to delete this medicine? This action cannot be reversed.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-xs font-semibold text-slate-600">
              Note: If this medicine is already associated with past purchases or sales, it cannot be deleted permanently. The system will automatically **deactivate** it (marking it inactive) so it no longer appears in checkout or stock logs.
            </div>

            {actionError && (
              <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive font-medium border border-destructive/20">
                {actionError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setDeleteProductId(null)}
              className="font-semibold text-xs py-1 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={handleDeleteProduct}
              className="font-bold text-xs py-1 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Medicine"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
