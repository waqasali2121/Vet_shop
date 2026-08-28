"use client"

import * as React from "react"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { productSchema, type ProductFormValues } from "@/lib/validations/product"
import { createProduct, updateProduct } from "@/lib/actions/products"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

interface ProductFormProps {
  initialData?: ProductFormValues & { id: string }
  categories: { id: string; name: string }[]
  brands: { id: string; name: string }[]
  units: { id: string; name: string; abbreviation: string }[]
}

export function ProductForm({
  initialData,
  categories,
  brands,
  units,
}: ProductFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = React.useState<string | null>(null)

  const defaultValues: Partial<ProductFormValues> = initialData
    ? {
        name: initialData.name,
        generic_name: initialData.generic_name || "",
        sku: initialData.sku || "",
        barcode: initialData.barcode || "",
        category_id: initialData.category_id,
        brand_id: initialData.brand_id,
        manufacturer: initialData.manufacturer || "",
        dosage_form: initialData.dosage_form || "",
        strength: initialData.strength || "",
        pack_size: initialData.pack_size || "",
        unit_id: initialData.unit_id,
        purchase_price_reference: initialData.purchase_price_reference || 0,
        retail_price: initialData.retail_price || 0,
        wholesale_price: initialData.wholesale_price || 0,
        minimum_sale_price: initialData.minimum_sale_price || 0,
        minimum_stock: initialData.minimum_stock || 5,
        reorder_quantity: initialData.reorder_quantity || 10,
        track_batch: initialData.track_batch ?? true,
        track_expiry: initialData.track_expiry ?? true,
        is_active: initialData.is_active ?? true,
      }
    : {
        name: "",
        generic_name: "",
        sku: "",
        barcode: "",
        category_id: "",
        brand_id: "",
        manufacturer: "",
        dosage_form: "",
        strength: "",
        pack_size: "",
        unit_id: "",
        purchase_price_reference: 0,
        retail_price: 0,
        wholesale_price: 0,
        minimum_sale_price: 0,
        minimum_stock: 5,
        reorder_quantity: 10,
        track_batch: true,
        track_expiry: true,
        is_active: true,
      }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as any,
    defaultValues,
  })

  // Watch trackers
  const trackBatch = watch("track_batch")
  const trackExpiry = watch("track_expiry")
  const isActive = watch("is_active")

  const onSubmit = (data: ProductFormValues) => {
    setError(null)
    startTransition(async () => {
      let result
      if (initialData) {
        result = await updateProduct(initialData.id, data)
      } else {
        result = await createProduct(data)
      }

      if (result.error) {
        setError(result.error)
      } else {
        router.push("/products")
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/products">
          <Button variant="outline" size="icon" className="h-8 w-8 cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {initialData ? "Edit Product" : "Add New Product"}
        </h1>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* General Information Card */}
          <Card className="border-slate-200/80 shadow-sm md:col-span-2">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="font-bold text-slate-900">General Information</CardTitle>
              <CardDescription className="text-slate-500">
                Primary identifier details, names, generic formulations and codes.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 pt-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-slate-700">Product Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. Ivermectin Injection 1%"
                  {...register("name")}
                  disabled={isPending}
                  className="border-slate-200 focus:border-primary focus:ring-primary"
                />
                {errors.name && (
                  <p className="text-xs font-semibold text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="generic_name" className="text-slate-700">Generic Formula Name</Label>
                <Input
                  id="generic_name"
                  placeholder="e.g. Ivermectin"
                  {...register("generic_name")}
                  disabled={isPending}
                  className="border-slate-200 focus:border-primary focus:ring-primary"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sku" className="text-slate-700">SKU (Stock Keeping Unit)</Label>
                <Input
                  id="sku"
                  placeholder="e.g. IVM-100ML-001"
                  {...register("sku")}
                  disabled={isPending}
                  className="border-slate-200 focus:border-primary focus:ring-primary"
                />
                {errors.sku && (
                  <p className="text-xs font-semibold text-destructive">{errors.sku.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="barcode" className="text-slate-700">Barcode / EAN</Label>
                <Input
                  id="barcode"
                  placeholder="Scan or type barcode number..."
                  {...register("barcode")}
                  disabled={isPending}
                  className="border-slate-200 focus:border-primary focus:ring-primary"
                />
                {errors.barcode && (
                  <p className="text-xs font-semibold text-destructive">{errors.barcode.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Categorization & Packing Card */}
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="font-bold text-slate-900">Categorization & Packing</CardTitle>
              <CardDescription className="text-slate-500">
                Units of measurement, categories, dosage formats, and strengths.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 pt-4">
              <div className="grid gap-2">
                <Label htmlFor="category_id" className="text-slate-700">Category *</Label>
                <select
                  id="category_id"
                  {...register("category_id")}
                  disabled={isPending}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.category_id && (
                  <p className="text-xs font-semibold text-destructive">{errors.category_id.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="brand_id" className="text-slate-700">Brand *</Label>
                <select
                  id="brand_id"
                  {...register("brand_id")}
                  disabled={isPending}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select Brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {errors.brand_id && (
                  <p className="text-xs font-semibold text-destructive">{errors.brand_id.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="unit_id" className="text-slate-700">Base Unit *</Label>
                <select
                  id="unit_id"
                  {...register("unit_id")}
                  disabled={isPending}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select Base Unit</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.abbreviation})
                    </option>
                  ))}
                </select>
                {errors.unit_id && (
                  <p className="text-xs font-semibold text-destructive">{errors.unit_id.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="dosage_form" className="text-slate-700">Dosage Form</Label>
                  <Input
                    id="dosage_form"
                    placeholder="e.g. Injection, Powder"
                    {...register("dosage_form")}
                    disabled={isPending}
                    className="border-slate-200"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="strength" className="text-slate-700">Strength</Label>
                  <Input
                    id="strength"
                    placeholder="e.g. 10%, 100mg"
                    {...register("strength")}
                    disabled={isPending}
                    className="border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="pack_size" className="text-slate-700">Pack Size</Label>
                  <Input
                    id="pack_size"
                    placeholder="e.g. 100ml, 50 tabs"
                    {...register("pack_size")}
                    disabled={isPending}
                    className="border-slate-200"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="manufacturer" className="text-slate-700">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    placeholder="e.g. Zoetis Inc."
                    {...register("manufacturer")}
                    disabled={isPending}
                    className="border-slate-200"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing & Control Card */}
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="font-bold text-slate-900">Pricing & Controls</CardTitle>
              <CardDescription className="text-slate-500">
                Setup sales pricing structures, stock levels, and FEFO inventory tracking.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="purchase_price_reference" className="text-slate-700">Reference Cost (Rs.)</Label>
                  <Input
                    id="purchase_price_reference"
                    type="number"
                    step="0.01"
                    {...register("purchase_price_reference")}
                    disabled={isPending}
                    className="border-slate-200"
                  />
                  {errors.purchase_price_reference && (
                    <p className="text-xs font-semibold text-destructive">{errors.purchase_price_reference.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="retail_price" className="text-slate-700">Retail Price (Rs.) *</Label>
                  <Input
                    id="retail_price"
                    type="number"
                    step="0.01"
                    {...register("retail_price")}
                    disabled={isPending}
                    className="border-slate-200"
                  />
                  {errors.retail_price && (
                    <p className="text-xs font-semibold text-destructive">{errors.retail_price.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="wholesale_price" className="text-slate-700">Wholesale Price (Rs.) *</Label>
                  <Input
                    id="wholesale_price"
                    type="number"
                    step="0.01"
                    {...register("wholesale_price")}
                    disabled={isPending}
                    className="border-slate-200"
                  />
                  {errors.wholesale_price && (
                    <p className="text-xs font-semibold text-destructive">{errors.wholesale_price.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="minimum_sale_price" className="text-slate-700">Min. Sale Price (Rs.) *</Label>
                  <Input
                    id="minimum_sale_price"
                    type="number"
                    step="0.01"
                    {...register("minimum_sale_price")}
                    disabled={isPending}
                    className="border-slate-200"
                  />
                  {errors.minimum_sale_price && (
                    <p className="text-xs font-semibold text-destructive">{errors.minimum_sale_price.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="minimum_stock" className="text-slate-700">Min. Alert Stock</Label>
                  <Input
                    id="minimum_stock"
                    type="number"
                    {...register("minimum_stock")}
                    disabled={isPending}
                    className="border-slate-200"
                  />
                  {errors.minimum_stock && (
                    <p className="text-xs font-semibold text-destructive">{errors.minimum_stock.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reorder_quantity" className="text-slate-700">Reorder Qty</Label>
                  <Input
                    id="reorder_quantity"
                    type="number"
                    {...register("reorder_quantity")}
                    disabled={isPending}
                    className="border-slate-200"
                  />
                  {errors.reorder_quantity && (
                    <p className="text-xs font-semibold text-destructive">{errors.reorder_quantity.message}</p>
                  )}
                </div>
              </div>

              {/* Tracking Policies */}
              <div className="pt-2 space-y-3">
                <Label className="text-slate-700 block font-bold">Inventory Control & Policies</Label>
                <div className="flex flex-col gap-2.5">
                  <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-700 font-semibold select-none">
                    <input
                      type="checkbox"
                      checked={trackBatch}
                      onChange={(e) => setValue("track_batch", e.target.checked)}
                      disabled={isPending}
                      className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    Enable batch-wise tracking
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-700 font-semibold select-none">
                    <input
                      type="checkbox"
                      checked={trackExpiry}
                      onChange={(e) => setValue("track_expiry", e.target.checked)}
                      disabled={isPending}
                      className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    Enable expiry date tracking (FEFO)
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-700 font-semibold select-none">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setValue("is_active", e.target.checked)}
                      disabled={isPending}
                      className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    Active and sellable in POS
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Form Footer */}
        <div className="flex justify-end gap-3 mt-6">
          <Link href="/products">
            <Button type="button" variant="outline" disabled={isPending} className="font-semibold cursor-pointer">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isPending} className="font-semibold shadow-sm cursor-pointer">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Product"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
