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
import { Loader2, Settings2, KeyRound, UserCheck, Upload, Image as ImageIcon } from "lucide-react"
import { changePassword, updateProfileAvatar } from "@/app/(auth)/auth-actions"

interface SettingsFormProps {
  initialData?: StoreSettingsFormValues
  currentUserRole: string
}

export function SettingsForm({ initialData, currentUserRole }: SettingsFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Password change state
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [pwPending, startPwTransition] = useTransition()
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState<string | null>(null)

  // Profile Picture state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null)
  const [avatarPending, startAvatarTransition] = useTransition()

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarError(null)
    setAvatarSuccess(null)
    const file = e.target.files?.[0]
    if (!file) return

    // Max 20KB validation
    if (file.size > 20 * 1024) {
      setAvatarError(`Image size must be less than 20KB. Current file size: ${(file.size / 1024).toFixed(1)}KB.`)
      e.target.value = ""
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSaveAvatar = () => {
    if (!avatarPreview) return
    setAvatarError(null)
    setAvatarSuccess(null)

    startAvatarTransition(async () => {
      const res = await updateProfileAvatar(avatarPreview)
      if (res.error) {
        setAvatarError(res.error)
      } else {
        setAvatarSuccess("Profile picture updated successfully!")
        router.refresh()
      }
    })
  }

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault()
    setPwError(null)
    setPwSuccess(null)

    if (!newPassword || newPassword.length < 6) {
      setPwError("Password must be at least 6 characters long.")
      return
    }

    if (newPassword !== confirmPassword) {
      setPwError("Passwords do not match.")
      return
    }

    startPwTransition(async () => {
      const res = await changePassword(newPassword, confirmPassword)
      if (res.error) {
        setPwError(res.error)
      } else {
        setPwSuccess("Your account password has been updated successfully.")
        setNewPassword("")
        setConfirmPassword("")
      }
    })
  }

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
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
          <Settings2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500 font-medium">
            Manage your employee account credentials and configure global store settings.
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

      {/* 0. Profile Avatar Settings Card (Available to All Roles) */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="font-bold text-slate-900 flex items-center gap-2">
            <ImageIcon className="h-4.5 w-4.5 text-slate-500" />
            <span>Profile Picture Avatar</span>
          </CardTitle>
          <CardDescription className="text-slate-500 text-xs font-semibold">
            Upload your personal avatar photo for POS header & account menus. Maximum image size is <strong>20KB</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {avatarError && (
            <div className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive font-semibold border border-destructive/20">
              {avatarError}
            </div>
          )}
          {avatarSuccess && (
            <div className="rounded-md bg-emerald-50 p-2.5 text-xs text-emerald-700 font-bold border border-emerald-200">
              {avatarSuccess}
            </div>
          )}
          <div className="flex items-center gap-5">
            <div className="relative h-16 w-16 rounded-full border-2 border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center shrink-0">
              {avatarPreview ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={avatarPreview} alt="Avatar Preview" className="h-full w-full object-cover" />
              ) : (
                <UserCheck className="h-8 w-8 text-slate-400" />
              )}
            </div>
            <div className="space-y-2 flex-1">
              <Label htmlFor="avatar_input" className="text-xs font-bold text-slate-700 block">
                Select Photo (&le; 20KB)
              </Label>
              <Input
                id="avatar_input"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={avatarPending}
                className="text-xs file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
              />
            </div>
          </div>
        </CardContent>
        {avatarPreview && (
          <CardFooter className="pb-4 pt-2 border-t border-slate-100 bg-slate-50/50 flex justify-end">
            <Button
              type="button"
              onClick={handleSaveAvatar}
              disabled={avatarPending}
              className="font-semibold text-xs py-1.5 px-4 shadow-sm cursor-pointer gap-1.5"
            >
              {avatarPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving Avatar...
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  Save Profile Photo
                </>
              )}
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* 1. Account Settings Card (Available to All Roles) */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="font-bold text-slate-900 flex items-center gap-2">
            <KeyRound className="h-4.5 w-4.5 text-slate-500" />
            <span>My Account Password</span>
          </CardTitle>
          <CardDescription className="text-slate-500 text-xs font-semibold">
            Change your account login password. Keep it secure.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handlePasswordChange}>
          <CardContent className="grid gap-4 pt-4">
            {pwError && (
              <div className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive font-semibold border border-destructive/20">
                {pwError}
              </div>
            )}
            {pwSuccess && (
              <div className="rounded-md bg-emerald-50 p-2.5 text-xs text-emerald-700 font-bold border border-emerald-200">
                {pwSuccess}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="new_password" className="text-slate-700 font-semibold text-xs">New Password *</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={pwPending}
                  required
                  placeholder="At least 6 characters"
                  className="border-slate-200 focus-visible:ring-primary/20"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="confirm_password" className="text-slate-700 font-semibold text-xs">Confirm New Password *</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={pwPending}
                  required
                  placeholder="Repeat new password"
                  className="border-slate-200 focus-visible:ring-primary/20"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="pb-4 pt-2 border-t border-slate-100 mt-2 bg-slate-50/50 flex justify-end">
            <Button type="submit" disabled={pwPending} className="font-semibold text-xs py-1.5 px-4 shadow-sm cursor-pointer">
              {pwPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Updating Password...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* 2. Store Settings Form (Owner Only) */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
  </div>
  )
}
