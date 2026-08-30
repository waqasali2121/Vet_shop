"use client"

import * as React from "react"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { customerSchema, type CustomerFormValues } from "@/lib/validations/customer"
import { createCustomer, updateCustomer } from "@/lib/actions/customers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Edit, Eye, User, Loader2, Search, ShoppingCart } from "lucide-react"
import Link from "next/link"

type Customer = {
  id: string
  name: string
  phone: string
  customer_type: "WALK_IN" | "FARMER" | "DAIRY_FARM" | "POULTRY_FARM" | "VETERINARIAN" | "DEALER" | "PET_OWNER" | "OTHER"
  credit_limit: number
  current_balance: number
  address: string | null
  is_active: boolean
}

interface CustomerListClientProps {
  customers: Customer[]
}

export function CustomerListClient({ customers }: CustomerListClientProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const defaultValues: CustomerFormValues = {
    name: "",
    phone: "",
    customer_type: "FARMER",
    credit_limit: 50000,
    opening_balance: 0,
    address: "",
    is_active: true,
  }

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema) as any,
    defaultValues,
  })

  const handleOpenAdd = () => {
    setEditingCustomer(null)
    reset(defaultValues)
    setIsOpen(true)
  }

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    reset({
      name: customer.name,
      phone: customer.phone,
      customer_type: customer.customer_type,
      credit_limit: Number(customer.credit_limit),
      opening_balance: Number(customer.current_balance), // show current balance as reference
      address: customer.address || "",
      is_active: customer.is_active,
    })
    setIsOpen(true)
  }

  const onSubmit = (data: CustomerFormValues) => {
    setError(null)
    startTransition(async () => {
      let result
      if (editingCustomer) {
        // Skip updating opening_balance on edit
        result = await updateCustomer(editingCustomer.id, data)
      } else {
        result = await createCustomer(data)
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

  const formatCustomerType = (type: string) => {
    return type.replace("_", " ")
  }

  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500 font-medium">
            Manage customer accounts, track credit limits, and record payments.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/pos">
            <Button className="font-bold gap-2 shadow-sm cursor-pointer bg-primary hover:bg-primary-hover text-white">
              <ShoppingCart className="h-4 w-4" />
              + GENERATE BILL
            </Button>
          </Link>
          <Button onClick={handleOpenAdd} variant="outline" className="font-semibold gap-2 shadow-sm cursor-pointer border-slate-200">
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Search Filter Bar */}
      <Card className="border-slate-200/80 shadow-sm shrink-0">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search customers by name, type, or mobile number..."
              className="pl-9 border-slate-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-2 border-b border-slate-100">
          <CardTitle className="font-bold text-slate-900">Customer Directory</CardTitle>
          <CardDescription className="text-slate-550">
            A list of registered accounts showing credit limits and outstanding balances.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2 p-6">
              <User className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-semibold">No customers found</p>
              <Button variant="outline" size="sm" onClick={handleOpenAdd} className="mt-2 font-semibold">
                Register New Customer
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Customer name</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Phone & Address</th>
                    <th className="px-6 py-3">Credit Limit</th>
                    <th className="px-6 py-3">Outstanding balance</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredCustomers.map((customer) => {
                    const balance = Number(customer.current_balance)
                    const limit = Number(customer.credit_limit)
                    const isWalkIn = customer.id === "00000000-0000-0000-0000-000000000000"
                    return (
                      <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800">
                          {customer.name}
                        </td>

                        <td className="px-6 py-4 text-xs font-semibold">
                          <Badge variant="secondary" className="bg-slate-100 text-slate-750 font-bold uppercase tracking-wider py-0.5 px-2">
                            {formatCustomerType(customer.customer_type)}
                          </Badge>
                        </td>

                        <td className="px-6 py-4 text-slate-600 font-medium">
                          <div className="flex flex-col">
                            <span>{customer.phone}</span>
                            <span className="text-xs text-slate-400">{customer.address || "—"}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4 font-bold text-slate-700">
                          {isWalkIn ? "N/A" : `Rs. ${limit.toLocaleString()}`}
                        </td>

                        <td className="px-6 py-4">
                          <span className={`font-black text-sm ${balance > 0 ? "text-red-650" : "text-emerald-650"}`}>
                            Rs. {balance.toLocaleString()}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-semibold mt-0.5">
                            {balance > 0 ? "Receivable" : "Settled"}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <Badge variant={customer.is_active ? "success" : "secondary"}>
                            {customer.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </td>

                        <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                          <Link href={`/pos?customerId=${customer.id}`}>
                            <Button variant="ghost" size="sm" className="font-bold text-xs text-primary hover:text-primary-hover hover:bg-slate-100 gap-1 cursor-pointer">
                              <ShoppingCart className="h-3.5 w-3.5" />
                              + Bill
                            </Button>
                          </Link>
                          <Link href={`/customers/${customer.id}`}>
                            <Button variant="ghost" size="sm" className="font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 gap-1.5 cursor-pointer">
                              <Eye className="h-3.5 w-3.5" />
                              Ledger Statement
                            </Button>
                          </Link>
                          {!isWalkIn && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(customer)}
                              className="h-8 w-8 text-slate-500 hover:text-slate-750 hover:bg-slate-100 cursor-pointer"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
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
                {editingCustomer ? "Edit Customer" : "Register New Customer"}
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                Configure details below to manage customer credit accounts and types.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20 mt-2">
                {error}
              </div>
            )}

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-slate-700">Customer Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. Haji Muhammad Ali"
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
                  <Label htmlFor="phone" className="text-slate-700">Phone Number *</Label>
                  <Input
                    id="phone"
                    placeholder="e.g. 0300-9876543"
                    {...register("phone")}
                    disabled={isPending}
                    className="border-slate-200 focus:border-primary focus:ring-primary"
                  />
                  {errors.phone && (
                    <p className="text-xs font-semibold text-destructive">{errors.phone.message}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="customer_type" className="text-slate-700">Customer Type</Label>
                  <select
                    id="customer_type"
                    {...register("customer_type")}
                    disabled={isPending}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 focus:outline-none"
                  >
                    <option value="FARMER">Farmer</option>
                    <option value="DAIRY_FARM">Dairy Farm</option>
                    <option value="POULTRY_FARM">Poultry Farm</option>
                    <option value="VETERINARIAN">Veterinarian</option>
                    <option value="DEALER">Dealer</option>
                    <option value="PET_OWNER">Pet Owner</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address" className="text-slate-700">Physical Address / Village</Label>
                <Input
                  id="address"
                  placeholder="e.g. Chak 45/GD, Tehsil Chunian, Pakistan"
                  {...register("address")}
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
                    Saving...
                  </>
                ) : (
                  "Save Customer"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
