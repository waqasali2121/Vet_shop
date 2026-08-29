"use client"

import * as React from "react"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { productSchema, type ProductFormValues } from "@/lib/validations/product"
import { createProduct, updateProduct } from "@/lib/actions/products"
import { createSupplier } from "@/lib/actions/purchases"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import Link from "next/link"

interface ProductFormProps {
  initialData?: ProductFormValues & { id: string }
  categories: { id: string; name: string }[]
  brands: { id: string; name: string }[]
  units: { id: string; name: string; abbreviation: string }[]
  suppliers?: { id: string; name: string }[]
}

export function ProductForm({
  initialData,
  categories,
  brands,
  units,
  suppliers = [],
}: ProductFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = React.useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = React.useState(false)
  const [suppliersList, setSuppliersList] = React.useState<any[]>(suppliers)
  const [supplierModalOpen, setSupplierModalOpen] = React.useState(false)
  const [newSupplierName, setNewSupplierName] = React.useState("")
  const [newSupplierPhone, setNewSupplierPhone] = React.useState("")
  const [supplierError, setSupplierError] = React.useState<string | null>(null)
  const [addingSupplier, setAddingSupplier] = React.useState(false)

  const handleQuickAddSupplier = (e: React.FormEvent) => {
    e.preventDefault()
    setSupplierError(null)
    if (!newSupplierName.trim()) {
      setSupplierError("Supplier name is required.")
      return
    }
    if (!newSupplierPhone.trim() || newSupplierPhone.length < 7) {
      setSupplierError("Phone number must be at least 7 characters.")
      return
    }

    setAddingSupplier(true)
    startTransition(async () => {
      const res = await createSupplier({
        name: newSupplierName,
        phone: newSupplierPhone,
        opening_balance: 0,
        is_active: true
      })

      if (res.error) {
        setSupplierError(res.error)
      } else if (res.data) {
        const newlyCreated = res.data
        setSuppliersList(prev => [...prev, newlyCreated].sort((a, b) => a.name.localeCompare(b.name)))
        setValue("supplier_id", newlyCreated.id)
        setSupplierModalOpen(false)
        setNewSupplierName("")
        setNewSupplierPhone("")
      }
      setAddingSupplier(false)
    })
  }

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
        supplier_id: "",
        initial_quantity: 0,
        batch_number: "",
        expiry_date: "",
      }
    : {
        name: "",
        generic_name: "",
        sku: "",
        barcode: "",
        category_id: categories[0]?.id || "",
        brand_id: brands[0]?.id || "",
        manufacturer: "",
        dosage_form: "",
        strength: "",
        pack_size: "",
        unit_id: units[0]?.id || "",
        purchase_price_reference: 0,
        retail_price: 0,
        wholesale_price: 0,
        minimum_sale_price: 0,
        minimum_stock: 5,
        reorder_quantity: 10,
        track_batch: true,
        track_expiry: true,
        is_active: true,
        supplier_id: "",
        initial_quantity: 0,
        batch_number: "",
        expiry_date: "",
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

  // Sync wholesale & min sale prices with retail and purchase reference
  const retailPrice = watch("retail_price")
  const purchasePrice = watch("purchase_price_reference")

  React.useEffect(() => {
    if (!initialData) {
      // Set default wholesale & minimum sale prices based on user inputs to prevent validation errors
      if (retailPrice) {
        setValue("wholesale_price", Number(purchasePrice) || Number(retailPrice))
        setValue("minimum_sale_price", Number(purchasePrice) || Number(retailPrice))
      }
    }
  }, [retailPrice, purchasePrice, setValue, initialData])

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
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/products">
          <Button variant="outline" size="icon" className="h-8 w-8 cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {initialData ? "Edit Product Details" : "Add New Medicine"}
        </h1>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Core Product Information */}
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="font-bold text-slate-900 text-lg">Medicine Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 pt-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-slate-700 font-semibold">Medicine Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Oxytetracycline 10% Injection"
                {...register("name")}
                disabled={isPending}
                className="border-slate-200 focus:border-primary focus:ring-primary font-medium"
              />
              {errors.name && (
                <p className="text-xs font-semibold text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="purchase_price_reference" className="text-slate-700 font-semibold">Purchase Price (Rs.) *</Label>
                <Input
                  id="purchase_price_reference"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register("purchase_price_reference")}
                  disabled={isPending}
                  className="border-slate-200 focus:border-primary focus:ring-primary"
                />
                {errors.purchase_price_reference && (
                  <p className="text-xs font-semibold text-destructive">{errors.purchase_price_reference.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="retail_price" className="text-slate-700 font-semibold">Selling Price (Rs.) *</Label>
                <Input
                  id="retail_price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register("retail_price")}
                  disabled={isPending}
                  className="border-slate-200 focus:border-primary focus:ring-primary"
                />
                {errors.retail_price && (
                  <p className="text-xs font-semibold text-destructive">{errors.retail_price.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Initial Stock Seeding (only visible on creation) */}
        {!initialData && (
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="font-bold text-slate-900 text-lg">Initial Stock Setup</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="supplier_id" className="text-slate-700 font-semibold font-mono text-xs uppercase">From Whom We Buy (Supplier)</Label>
                  <div className="flex gap-2">
                    <select
                      id="supplier_id"
                      {...register("supplier_id")}
                      disabled={isPending}
                      className="h-9 flex-1 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Select Supplier</option>
                      {suppliersList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSupplierModalOpen(true)}
                      className="h-9 px-3 text-xs font-semibold cursor-pointer border-slate-200"
                    >
                      + Add New
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="initial_quantity" className="text-slate-700 font-semibold font-mono text-xs uppercase">Quantity Received</Label>
                  <Input
                    id="initial_quantity"
                    type="number"
                    placeholder="e.g. 50"
                    {...register("initial_quantity")}
                    disabled={isPending}
                    className="border-slate-200 focus:border-primary focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="batch_number" className="text-slate-700 font-semibold font-mono text-xs uppercase">Batch Number</Label>
                  <Input
                    id="batch_number"
                    placeholder="e.g. BAT-101 (Optional)"
                    {...register("batch_number")}
                    disabled={isPending}
                    className="border-slate-200 focus:border-primary focus:ring-primary"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="expiry_date" className="text-slate-700 font-semibold font-mono text-xs uppercase">Expiry Date</Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    {...register("expiry_date")}
                    disabled={isPending}
                    className="border-slate-200 focus:border-primary focus:ring-primary"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Collapsible Advanced Section */}
        <div className="border border-slate-200/60 rounded-lg overflow-hidden bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 text-slate-700 font-semibold text-sm cursor-pointer select-none"
          >
            <span>Advanced Configuration (Category, Unit, Limits)</span>
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showAdvanced && (
            <div className="p-4 grid gap-4 md:grid-cols-2 border-t border-slate-100">
              <div className="grid gap-2">
                <Label htmlFor="category_id" className="text-slate-700">Category</Label>
                <select
                  id="category_id"
                  {...register("category_id")}
                  disabled={isPending}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 focus:outline-none"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="unit_id" className="text-slate-700">Base Unit</Label>
                <select
                  id="unit_id"
                  {...register("unit_id")}
                  disabled={isPending}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 focus:outline-none"
                >
                  <option value="">Select Base Unit</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.abbreviation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="brand_id" className="text-slate-700">Brand</Label>
                <select
                  id="brand_id"
                  {...register("brand_id")}
                  disabled={isPending}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 focus:outline-none"
                >
                  <option value="">Select Brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="generic_name" className="text-slate-700">Generic Formula</Label>
                <Input
                  id="generic_name"
                  placeholder="e.g. Oxytetracycline"
                  {...register("generic_name")}
                  disabled={isPending}
                  className="border-slate-200"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sku" className="text-slate-700">SKU Code</Label>
                <Input
                  id="sku"
                  placeholder="Auto-generated if empty"
                  {...register("sku")}
                  disabled={isPending}
                  className="border-slate-200"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="barcode" className="text-slate-700">Barcode</Label>
                <Input
                  id="barcode"
                  placeholder="Scan or enter barcode"
                  {...register("barcode")}
                  disabled={isPending}
                  className="border-slate-200"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="minimum_stock" className="text-slate-700">Alert Limit (Min Stock)</Label>
                <Input
                  id="minimum_stock"
                  type="number"
                  {...register("minimum_stock")}
                  disabled={isPending}
                  className="border-slate-200"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reorder_quantity" className="text-slate-700">Reorder Quantity</Label>
                <Input
                  id="reorder_quantity"
                  type="number"
                  {...register("reorder_quantity")}
                  disabled={isPending}
                  className="border-slate-200"
                />
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-2">
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
              "Save Medicine"
            )}
          </Button>
        </div>
      </form>

      {/* Quick Create Supplier Dialog */}
      <Dialog open={supplierModalOpen} onOpenChange={(open) => { setSupplierModalOpen(open); setSupplierError(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Quick Register Supplier</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleQuickAddSupplier} className="space-y-4">
            {supplierError && (
              <div className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive font-medium border border-destructive/20">
                {supplierError}
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="quick_sup_name" className="text-xs text-slate-650 font-semibold">Supplier Name *</Label>
              <Input
                id="quick_sup_name"
                placeholder="e.g. ICI Pakistan Ltd."
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                disabled={addingSupplier}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="quick_sup_phone" className="text-xs text-slate-650 font-semibold">Supplier Mobile Number *</Label>
              <Input
                id="quick_sup_phone"
                placeholder="e.g. 0300-1234567"
                value={newSupplierPhone}
                onChange={(e) => setNewSupplierPhone(e.target.value)}
                disabled={addingSupplier}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSupplierModalOpen(false)}
                className="font-semibold text-xs py-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addingSupplier}
                className="font-bold text-xs py-1 shadow-sm"
              >
                {addingSupplier ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Create Supplier"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
