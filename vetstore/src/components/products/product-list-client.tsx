"use client"

import * as React from "react"
import { useState, useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import { toggleProductStatus } from "@/lib/actions/products"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  is_active: boolean
  category: { id: string; name: string } | null
  brand: { id: string; name: string } | null
  unit: { id: string; name: string; abbreviation: string } | null
}

interface ProductListClientProps {
  products: Product[]
  categories: { id: string; name: string }[]
  brands: { id: string; name: string }[]
  count: number
  totalPages: number
  currentPage: number
}

export function ProductListClient({
  products,
  categories,
  brands,
  count,
  totalPages,
  currentPage,
}: ProductListClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Local state for filters
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "")
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "")
  const [selectedBrand, setSelectedBrand] = useState(searchParams.get("brand") || "")

  // Debounced navigation helper
  const updateQuery = (key: string, value: string, resetPage = true) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
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

  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Products Catalog</h1>
          <p className="text-sm text-slate-500 font-medium">
            Manage your store medicines, vaccines, equipment, and barcodes.
          </p>
        </div>
        <Link href="/products/new">
          <Button className="font-semibold gap-2 shadow-sm cursor-pointer">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Filter Toolbar */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          {/* Text search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, generic name, SKU, or barcode..."
              className="pl-9 border-slate-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  updateQuery("search", searchTerm)
                }
              }}
            />
            {searchTerm && (
              <button
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-semibold"
                onClick={() => {
                  setSearchTerm("")
                  updateQuery("search", "")
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Dropdown */}
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

          {/* Brand Dropdown */}
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

          {/* Search Button */}
          <Button
            onClick={() => updateQuery("search", searchTerm)}
            variant="secondary"
            className="font-semibold shadow-sm cursor-pointer"
          >
            Apply Filters
          </Button>
        </CardContent>
      </Card>

      {/* Products Table Card */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-bold text-slate-900">Products Catalog</CardTitle>
            <CardDescription className="text-slate-500">
              Total products registered: {count}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2 p-6">
              <Package className="h-12 w-12 text-slate-300" />
              <p className="text-sm font-semibold">No products found matching your search</p>
              <Link href="/products/new">
                <Button variant="outline" size="sm" className="mt-2 font-semibold">
                  Add First Product
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Product details</th>
                    <th className="px-6 py-3">SKU / Barcode</th>
                    <th className="px-6 py-3">Category / Brand</th>
                    <th className="px-6 py-3">Price (PKR)</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className={`hover:bg-slate-50/50 transition-colors ${
                        !product.is_active ? "opacity-60 bg-slate-50/20" : ""
                      }`}
                    >
                      {/* Name & generic */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{product.name}</span>
                          <span className="text-xs text-slate-400 font-semibold italic">
                            {product.generic_name || "No generic name"}
                          </span>
                        </div>
                      </td>

                      {/* SKU / Barcode */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col font-mono text-xs text-slate-600">
                          <span>SKU: {product.sku || "—"}</span>
                          <span>BAR: {product.barcode || "—"}</span>
                        </div>
                      </td>

                      {/* Category & Brand */}
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        <div className="flex flex-col">
                          <span>{product.category?.name || "—"}</span>
                          <span className="text-xs text-slate-400">
                            {product.brand?.name || "—"}
                          </span>
                        </div>
                      </td>

                      {/* Retail Price */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">
                            Rs. {product.retail_price.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            Min: Rs. {product.minimum_sale_price.toLocaleString()}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 text-center">
                        <Badge
                          variant={product.is_active ? "success" : "secondary"}
                          className="font-bold text-[9px] uppercase tracking-wider px-2"
                        >
                          {product.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                        <Link href={`/products/${product.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 cursor-pointer" title="View details">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/products/${product.id}/edit`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary/80 cursor-pointer" title="Edit product">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleStatus(product.id, product.is_active)}
                          disabled={isPending}
                          className={`h-8 w-8 cursor-pointer ${
                            product.is_active
                              ? "text-red-500 hover:bg-red-50"
                              : "text-emerald-600 hover:bg-emerald-50"
                          }`}
                          title={product.is_active ? "Deactivate" : "Activate"}
                        >
                          {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
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
    </div>
  )
}
