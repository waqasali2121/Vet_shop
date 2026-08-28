"use client"

import * as React from "react"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { storeSettingsSchema, type StoreSettingsFormValues } from "@/lib/validations/settings"
import { updateStoreSettings } from "@/lib/actions/settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Loader2, Settings2 } from "lucide-react"

interface SettingsFormProps {
  initialData?: StoreSettingsFormValues
  currentUserRole: string
}

export function SettingsForm({ initialData, currentUserRole }: SettingsFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const defaultValues: StoreSettingsFormValues = initialData
    ? {
        store_name: initialData.store_name,
        phone: initialData.phone,
        address: initialData.address,
        currency: initialData.currency || "PKR",
        timezone: initialData.timezone || "Asia/Karachi",
        invoice_prefix: initialData.invoice_prefix || "SFV",
        purchase_prefix: initialData.purchase_prefix || "PUR",
        allow_negative_stock: initialData.allow_negative_stock ?? false,
        allow_expired_sale: initialData.allow_expired_sale ?? false,
        enable_fefo: initialData.enable_fefo ?? true,
        default_receipt_size: initialData.default_receipt_size || "80mm",
      }
    : {
        store_name: "Salman Farsy Veterinary Store",
        phone: "0300-1234567",
        address: "Opposite Grain Market, Veterinary Hospital Road, Pakistan",
        currency: "PKR",
        timezone: "Asia/Karachi",
        invoice_prefix: "SFV",
        purchase_prefix: "PUR",
        allow_negative_stock: false,
        allow_expired_sale: false,
        enable_fefo: true,
        default_receipt_size: "80mm",
      }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StoreSettingsFormValues>({
    resolver: zodResolver(storeSettingsSchema) as any,
    defaultValues,
  })

  const allowNegative = watch("allow_negative_stock")
  const allowExpired = watch("allow_expired_sale")
  const enableFEFO = watch("enable_fefo")

  const isOwner = currentUserRole === "OWNER"

  const onSubmit = (data: StoreSettingsFormValues) => {
    setError(null)
    setSuccess(null)

    if (!isOwner) {
      setError("Permission Denied. Only the OWNER can modify store configurations.")
      return
    }

    startTransition(async () => {
      const res = await updateStoreSettings(data)
      if (res.error) {
        setError(res.error)
      } else {
        setSuccess("Store settings updated successfully.")
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
          <Settings2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Store Settings</h1>
          <p className="text-sm text-slate-500 font-medium">
            Configure invoice prefixes, POS printer receipt sizes, and FEFO inventory rules.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 font-semibold border border-emerald-200">
          {success}
        </div>
      )}

      {!isOwner && (
        <div className="rounded-md bg-amber-50 p-3.5 text-xs text-amber-700 font-black border border-amber-200">
          ⚠️ READ-ONLY ACCESS: Only the OWNER account can modify store configurations.
        </div>
      )}

      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="font-bold text-slate-900">General Sizing & Branding</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4">
          <div className="grid gap-2">
            <Label htmlFor="store_name" className="text-slate-700 font-semibold">Store Brand Name *</Label>
            <Input
              id="store_name"
              {...register("store_name")}
              disabled={isPending || !isOwner}
              className="border-slate-200 focus:border-primary focus:ring-primary font-bold text-slate-800"
            />
            {errors.store_name && (
              <p className="text-xs font-semibold text-destructive">{errors.store_name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="phone" className="text-slate-700 font-semibold">Contact Phone Number *</Label>
              <Input
                id="phone"
                {...register("phone")}
                disabled={isPending || !isOwner}
                className="border-slate-200"
              />
              {errors.phone && (
                <p className="text-xs font-semibold text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="default_receipt_size" className="text-slate-700 font-semibold">Default Receipt Size</Label>
              <select
                id="default_receipt_size"
                {...register("default_receipt_size")}
                disabled={isPending || !isOwner}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 focus:outline-none"
              >
                <option value="80mm">80mm thermal receipt</option>
                <option value="A4">A4 invoice sheet</option>
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="address" className="text-slate-700 font-semibold">Postal Address *</Label>
            <Input
              id="address"
              {...register("address")}
              disabled={isPending || !isOwner}
              className="border-slate-200"
            />
            {errors.address && (
              <p className="text-xs font-semibold text-destructive">{errors.address.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
            <div className="grid gap-2">
              <Label className="text-slate-400 font-semibold">Currency Code</Label>
              <Input value="PKR (Rs.)" disabled className="border-slate-200 bg-slate-50 text-slate-500" />
            </div>
            <div className="grid gap-2">
              <Label className="text-slate-400 font-semibold">Store Timezone</Label>
              <Input value="Asia/Karachi (UTC+5)" disabled className="border-slate-200 bg-slate-50 text-slate-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="font-bold text-slate-900">Document Prefixing & Rules</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="invoice_prefix" className="text-slate-700 font-semibold">Invoice Number Prefix *</Label>
              <Input
                id="invoice_prefix"
                {...register("invoice_prefix")}
                disabled={isPending || !isOwner}
                className="border-slate-200 font-bold"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="purchase_prefix" className="text-slate-700 font-semibold">Purchase Prefix *</Label>
              <Input
                id="purchase_prefix"
                {...register("purchase_prefix")}
                disabled={isPending || !isOwner}
                className="border-slate-200 font-bold"
              />
            </div>
          </div>

          {/* Rules Checkboxes */}
          <div className="pt-3 space-y-3.5 border-t border-slate-100">
            <Label className="text-slate-700 font-bold">Business Logic Rules</Label>

            <div className="flex flex-col gap-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-700 font-semibold select-none">
                <input
                  type="checkbox"
                  checked={allowNegative}
                  onChange={(e) => setValue("allow_negative_stock", e.target.checked)}
                  disabled={isPending || !isOwner || true} // Hard locked to false per Section 14
                  className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 disabled:opacity-50"
                />
                Allow negative inventory sales (DISABLED by system configuration)
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-700 font-semibold select-none">
                <input
                  type="checkbox"
                  checked={allowExpired}
                  onChange={(e) => setValue("allow_expired_sale", e.target.checked)}
                  disabled={isPending || !isOwner || true} // Hard locked to false per Section 13
                  className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 disabled:opacity-50"
                />
                Allow sales on expired batches (DISABLED by system configuration)
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-700 font-semibold select-none">
                <input
                  type="checkbox"
                  checked={enableFEFO}
                  onChange={(e) => setValue("enable_fefo", e.target.checked)}
                  disabled={isPending || !isOwner}
                  className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                />
                Enable First Expire, First Out (FEFO) batch priority
              </label>
            </div>
          </div>
        </CardContent>
        {isOwner && (
          <CardFooter className="bg-slate-50/50 border-t border-slate-100 p-4 flex justify-end">
            <Button type="submit" disabled={isPending} className="font-semibold shadow-sm cursor-pointer">
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Configuration"
              )}
            </Button>
          </CardFooter>
        )}
      </Card>
    </form>
  )
}
