"use client"

import * as React from "react"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { expenseSchema, type ExpenseFormValues } from "@/lib/validations/expense"
import { createExpense } from "@/lib/actions/expenses"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Receipt, Loader2, ArrowUpRight } from "lucide-react"

type Expense = {
  id: string
  amount: number
  payment_method: string
  description: string | null
  expense_date: string
  created_at: string
  category: { name: string } | null
}

interface ExpenseListClientProps {
  expenses: Expense[]
  categories: { id: string; name: string }[]
  activeSession: { id: string } | null
}

export function ExpenseListClient({ expenses, categories, activeSession }: ExpenseListClientProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const defaultValues: ExpenseFormValues = {
    category_id: "",
    amount: 0,
    payment_method: "CASH",
    description: "",
    expense_date: new Date().toISOString().split("T")[0],
  }

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema) as any,
    defaultValues,
  })

  const onSubmit = (data: ExpenseFormValues) => {
    setError(null)

    if (data.payment_method === "CASH" && !activeSession) {
      setError("Cash register session must be open to record cash expenses.")
      return
    }

    startTransition(async () => {
      const result = await createExpense(data)
      if (result.error) {
        setError(result.error)
      } else {
        setIsOpen(false)
        reset()
        router.refresh()
      }
    })
  }

  // Calculate stats
  const totalAmount = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Expenses</h1>
          <p className="text-sm text-slate-500 font-medium">
            Monitor daily operating expenses (rent, salaries, fuel, refreshments).
          </p>
        </div>
        <Button onClick={() => setIsOpen(true)} className="font-semibold gap-2 shadow-sm cursor-pointer">
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </div>

      {!activeSession && (
        <div className="rounded-md bg-amber-50 p-3.5 text-xs text-amber-700 font-black border border-amber-200">
          ⚠️ NOTE: Cash Register is closed. You can record digital/bank expenses, but CASH expenses will be blocked until the register is open.
        </div>
      )}

      {/* Summary KPI Widget */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200/80 shadow-sm bg-slate-50/50">
          <CardHeader className="pb-1 border-b border-slate-100 bg-white rounded-t-xl">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Recorded Expenses</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <span className="text-2xl font-black text-slate-900">
              Rs. {totalAmount.toLocaleString()}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-2 border-b border-slate-100">
          <CardTitle className="font-bold text-slate-900">Expense Logs</CardTitle>
          <CardDescription className="text-slate-500">
            A list of all documented operating expenses.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2 p-6">
              <Receipt className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-semibold">No expenses recorded</p>
              <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} className="mt-2 font-semibold">
                Record First Expense
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Expense Date</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Payment Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        {new Date(exp.expense_date).toLocaleDateString("en-US", { dateStyle: "short" })}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {exp.category?.name || "Other"}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs font-semibold max-w-sm truncate" title={exp.description || ""}>
                        {exp.description || <span className="text-slate-300 font-normal italic">None</span>}
                      </td>
                      <td className="px-6 py-4 font-black text-slate-800 text-base">
                        Rs. {Number(exp.amount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="font-semibold text-xs py-0.5 px-2 bg-slate-50 text-slate-650 border-slate-200">
                          {exp.payment_method}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle className="font-bold text-slate-900">Record Expense</DialogTitle>
              <DialogDescription className="text-slate-500">
                Log a new store operation expense to the system.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20 mt-2">
                {error}
              </div>
            )}

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="category_id" className="text-slate-700 font-semibold">Expense Category *</Label>
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
                {errors.category_id && (
                  <p className="text-xs font-semibold text-destructive">{errors.category_id.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="amount" className="text-slate-700 font-semibold">Amount (Rs.) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 1500"
                    {...register("amount")}
                    disabled={isPending}
                    className="border-slate-200 focus:border-primary focus:ring-primary font-bold text-slate-800"
                  />
                  {errors.amount && (
                    <p className="text-xs font-semibold text-destructive">{errors.amount.message}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="payment_method" className="text-slate-700 font-semibold">Payment Method *</Label>
                  <select
                    id="payment_method"
                    {...register("payment_method")}
                    disabled={isPending}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 focus:outline-none"
                  >
                    <option value="CASH">Cash in Drawer</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="EASYPAISA">EasyPaisa</option>
                    <option value="JAZZCASH">JazzCash</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="OTHER">Other Method</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="expense_date" className="text-slate-700 font-semibold">Expense Date *</Label>
                <Input
                  id="expense_date"
                  type="date"
                  {...register("expense_date")}
                  disabled={isPending}
                  className="border-slate-200"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description" className="text-slate-700">Description / Memo Notes</Label>
                <Input
                  id="description"
                  placeholder="e.g. Tea and biscuits for dairy farm client, utility invoice code..."
                  {...register("description")}
                  disabled={isPending}
                  className="border-slate-200"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="font-semibold shadow-sm cursor-pointer">
                {isPending ? "Recording..." : "Record Expense"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
