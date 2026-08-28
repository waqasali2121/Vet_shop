"use client"

import * as React from "react"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { supplierSchema, type SupplierFormValues } from "@/lib/validations/purchase"
import { createSupplier, updateSupplier } from "@/lib/actions/purchases"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Edit, Eye, ShieldAlert, Loader2, Contact } from "lucide-react"
import Link from "next/link"

type Supplier = {
  id: string
  name: string
  phone: string
  email: string | null
  address: string | null
  contact_person: string | null
  opening_balance: number
  current_balance: number
  is_active: boolean
}

interface SupplierListClientProps {
  suppliers: Supplier[]
}

export function SupplierListClient({ suppliers }: SupplierListClientProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const defaultValues: SupplierFormValues = {
    name: "",
    phone: "",
    email: "",
    address: "",
    contact_person: "",
    opening_balance: 0,
    notes: "",
    is_active: true,
  }

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema) as any,
    defaultValues,
  })

  const handleOpenAdd = () => {
    setEditingSupplier(null)
    reset(defaultValues)
    setIsOpen(true)
  }

  const handleOpenEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    reset({
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email || "",
      address: supplier.address || "",
      contact_person: supplier.contact_person || "",
      opening_balance: Number(supplier.opening_balance),
      notes: "",
      is_active: supplier.is_active,
    })
    setIsOpen(true)
  }

  const onSubmit = (data: SupplierFormValues) => {
    setError(null)
    startTransition(async () => {
      let result
      if (editingSupplier) {
        result = await updateSupplier(editingSupplier.id, data)
      } else {
        result = await createSupplier(data)
      }

      if (result.error) {
        setError(result.error)
      } else {
        setIsOpen(false)
        reset()
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Suppliers</h1>
          <p className="text-sm text-slate-500 font-medium">
            Manage pharmaceutical companies, distributors, and record ledger payments.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="font-semibold gap-2 shadow-sm cursor-pointer">
          <Plus className="h-4 w-4" />
          Add Supplier
        </Button>
      </div>

      {/* Table */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-2 border-b border-slate-100">
          <CardTitle className="font-bold text-slate-900">Supplier Directory</CardTitle>
          <CardDescription className="text-slate-500">
            A list of suppliers showing contact persons and outstanding payables.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {suppliers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2 p-6">
              <Contact className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-semibold">No suppliers registered</p>
              <Button variant="outline" size="sm" onClick={handleOpenAdd} className="mt-2 font-semibold">
                Register First Supplier
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Company details</th>
                    <th className="px-6 py-3">Contact Person</th>
                    <th className="px-6 py-3">Phone & Email</th>
                    <th className="px-6 py-3">Current Balance</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {suppliers.map((supplier) => {
                    const balance = Number(supplier.current_balance)
                    const owesMoney = balance > 0
                    return (
                      <tr key={supplier.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800">
                          <div className="flex flex-col">
                            <span>{supplier.name}</span>
                            <span className="text-xs text-slate-400 font-normal truncate max-w-xs">
                              {supplier.address || "No address specified"}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 font-medium text-slate-700">
                          {supplier.contact_person || <span className="text-slate-300 italic">None</span>}
                        </td>

                        <td className="px-6 py-4 text-slate-600 font-medium">
                          <div className="flex flex-col">
                            <span>{supplier.phone}</span>
                            <span className="text-xs text-slate-400">{supplier.email || "—"}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className={`font-black text-sm ${owesMoney ? "text-red-650" : "text-emerald-650"}`}>
                            Rs. {balance.toLocaleString()}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-semibold mt-0.5">
                            {owesMoney ? "We Owe Them (Payable)" : "Zero/Advance"}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <Badge variant={supplier.is_active ? "success" : "secondary"}>
                            {supplier.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </td>

                        <td className="px-6 py-4 text-right space-x-1">
                          <Link href={`/suppliers/${supplier.id}`}>
                            <Button variant="ghost" size="sm" className="font-semibold text-primary hover:text-primary/80 gap-1.5 cursor-pointer">
                              <Eye className="h-3.5 w-3.5" />
                              Ledger Statement
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(supplier)}
                            className="h-8 w-8 text-slate-500 cursor-pointer"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
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

      {/* Add / Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle className="font-bold text-slate-900">
                {editingSupplier ? "Edit Supplier" : "Register New Supplier"}
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                Configure details below to manage supplier credentials and ledger payables.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20 mt-2">
                {error}
              </div>
            )}

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-slate-700">Company Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. Star Veterinary Laboratories"
                  {...register("name")}
                  disabled={isPending}
                  className="border-slate-200 focus:border-primary focus:ring-primary"
                />
                {errors.name && (
                  <p className="text-xs font-semibold text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="contact_person" className="text-slate-700">Contact Person</Label>
                  <Input
                    id="contact_person"
                    placeholder="e.g. Saleem Ahmad"
                    {...register("contact_person")}
                    disabled={isPending}
                    className="border-slate-200"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone" className="text-slate-700">Phone Number *</Label>
                  <Input
                    id="phone"
                    placeholder="e.g. 0300-1234567"
                    {...register("phone")}
                    disabled={isPending}
                    className="border-slate-200 focus:border-primary focus:ring-primary"
                  />
                  {errors.phone && (
                    <p className="text-xs font-semibold text-destructive">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email" className="text-slate-700">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g. sales@starpharma.com"
                  {...register("email")}
                  disabled={isPending}
                  className="border-slate-200"
                />
                {errors.email && (
                  <p className="text-xs font-semibold text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address" className="text-slate-700">Postal Address</Label>
                <Input
                  id="address"
                  placeholder="e.g. Office #4, Grain Market, Lahore"
                  {...register("address")}
                  disabled={isPending}
                  className="border-slate-200"
                />
              </div>

              {!editingSupplier && (
                <div className="grid gap-2">
                  <Label htmlFor="opening_balance" className="text-slate-700">Opening Balance (Rs.)</Label>
                  <Input
                    id="opening_balance"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 50000 if we owe them money"
                    {...register("opening_balance")}
                    disabled={isPending}
                    className="border-slate-200"
                  />
                </div>
              )}
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
                    Saving...
                  </>
                ) : (
                  "Save Supplier"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
