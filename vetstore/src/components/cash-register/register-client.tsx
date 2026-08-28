"use client"

import * as React from "react"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { openRegisterSchema, closeRegisterSchema, type OpenRegisterFormValues, type CloseRegisterFormValues } from "@/lib/validations/expense"
import { openRegisterSession, closeRegisterSession } from "@/lib/actions/expenses"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Coins, Play, Ban, ShieldAlert, ArrowUpRight, ArrowDownLeft, Calendar, Loader2 } from "lucide-react"

type RegisterSession = {
  id: string
  opened_at: string
  closed_at: string | null
  opening_cash: number
  expected_closing_cash: number
  actual_closing_cash: number | null
  difference: number
  status: "OPEN" | "CLOSED"
  notes: string | null
}

type CashMovement = {
  id: string
  movement_type: string
  amount: number
  notes: string | null
  created_at: string
}

interface RegisterClientProps {
  activeSession: RegisterSession | null
  movements: CashMovement[]
  pastSessions: (RegisterSession & { cashier: { email: string } })[]
}

export function RegisterClient({ activeSession, movements, pastSessions }: RegisterClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)

  // Open Form
  const {
    register: openRegister,
    handleSubmit: handleOpenSubmit,
    formState: { errors: openErrors },
  } = useForm<OpenRegisterFormValues>({
    resolver: zodResolver(openRegisterSchema) as any,
    defaultValues: { opening_cash: 0, notes: "" },
  })

  // Close Form
  const {
    register: closeRegister,
    handleSubmit: handleCloseSubmit,
    formState: { errors: closeErrors },
  } = useForm<CloseRegisterFormValues>({
    resolver: zodResolver(closeRegisterSchema) as any,
    defaultValues: { actual_closing_cash: activeSession?.expected_closing_cash || 0, notes: "" },
  })

  const onOpenSession = (data: OpenRegisterFormValues) => {
    setError(null)
    startTransition(async () => {
      const res = await openRegisterSession(data)
      if (res.error) {
        setError(res.error)
      } else {
        router.refresh()
      }
    })
  }

  const onCloseSession = (data: CloseRegisterFormValues) => {
    setError(null)
    startTransition(async () => {
      const res = await closeRegisterSession(data)
      if (res.error) {
        setError(res.error)
      } else {
        setCloseDialogOpen(false)
        router.refresh()
      }
    })
  }

  // Calculate session aggregations
  const totalSales = movements.filter(m => m.movement_type === "CASH_SALE").reduce((sum, m) => sum + m.amount, 0)
  const totalCollections = movements.filter(m => m.movement_type === "CUSTOMER_COLLECTION").reduce((sum, m) => sum + m.amount, 0)
  const totalExpenses = movements.filter(m => m.movement_type === "CASH_EXPENSE").reduce((sum, m) => sum + Math.abs(m.amount), 0)
  const totalPayments = movements.filter(m => m.movement_type === "SUPPLIER_PAYMENT").reduce((sum, m) => sum + Math.abs(m.amount), 0)
  const totalRefunds = movements.filter(m => m.movement_type === "CASH_REFUND").reduce((sum, m) => sum + Math.abs(m.amount), 0)

  const formatMovementType = (type: string) => {
    return type.replace("_", " ")
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Cash Register</h1>
        <p className="text-sm text-slate-500 font-medium">
          Open and close cashier cash sessions, reconcile payouts, and check cash drawer differences.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20">
          {error}
        </div>
      )}

      {/* DYNAMIC SCREEN LAYOUT */}
      {!activeSession ? (
        /* REGISTER CLOSED: Prompt to open */
        <Card className="border-slate-200/80 shadow-sm max-w-md mx-auto">
          <CardHeader className="text-center pb-4 border-b border-slate-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mx-auto mb-3">
              <Ban className="h-6 w-6" />
            </div>
            <CardTitle className="font-bold text-slate-900 text-lg">Cash Register is Closed</CardTitle>
            <CardDescription className="text-xs">
              Open a new drawer session before checking out sales.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleOpenSubmit(onOpenSession)}>
            <CardContent className="grid gap-4 pt-6">
              <div className="grid gap-2">
                <Label htmlFor="opening_cash" className="text-slate-700 font-semibold">Opening Cash Drawer (PKR) *</Label>
                <Input
                  id="opening_cash"
                  type="number"
                  placeholder="e.g. 5000"
                  {...openRegister("opening_cash")}
                  disabled={isPending}
                  className="border-slate-200 focus:border-primary focus:ring-primary font-bold text-slate-800 text-base"
                />
                {openErrors.opening_cash && (
                  <p className="text-xs font-semibold text-destructive">{openErrors.opening_cash.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes" className="text-slate-700">Opening Memo / Note</Label>
                <Input
                  id="notes"
                  placeholder="Optional details, drawer key reference..."
                  {...openRegister("notes")}
                  disabled={isPending}
                  className="border-slate-200"
                />
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50/50 rounded-b-xl border-t border-slate-100 p-4">
              <Button type="submit" disabled={isPending} className="w-full font-semibold shadow-sm cursor-pointer">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening Register...
                  </>
                ) : (
                  "Open Cash Register Drawer"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      ) : (
        /* REGISTER OPEN: Display drawer details and cash movements */
        <div className="grid gap-6 md:grid-cols-3">
          {/* Cash Summary Panel */}
          <div className="md:col-span-1 space-y-6">
            <Card className="border-slate-200/80 shadow-sm bg-slate-50/50">
              <CardHeader className="pb-3 border-b border-slate-100 bg-white rounded-t-xl">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Drawer Status</CardTitle>
                  <Badge variant="success">Register Open</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3.5 text-xs font-semibold">
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">Opened At</span>
                  <span className="text-slate-700 font-bold font-mono">
                    {new Date(activeSession.opened_at).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">Opening Balance Cash</span>
                  <span className="text-slate-800 font-bold">Rs. {Number(activeSession.opening_cash).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">Cash Sales (+)</span>
                  <span className="text-emerald-700 font-bold">Rs. {totalSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">Udhaar Collections (+)</span>
                  <span className="text-emerald-700 font-bold">Rs. {totalCollections.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">Cash Expenses (-)</span>
                  <span className="text-red-600 font-bold">Rs. {totalExpenses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">Supplier Payments (-)</span>
                  <span className="text-red-650 font-bold">Rs. {totalPayments.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Cash Refunds (-)</span>
                  <span className="text-red-650 font-bold">Rs. {totalRefunds.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pb-1 border-t border-slate-200 pt-3">
                  <span className="text-slate-850 font-bold text-sm">Expected Closing Cash</span>
                  <span className="font-black text-slate-900 text-lg">
                    Rs. {Number(activeSession.expected_closing_cash).toLocaleString()}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="bg-white rounded-b-xl border-t border-slate-100 p-4 shrink-0">
                <Button onClick={() => setCloseDialogOpen(true)} className="w-full font-semibold shadow-sm cursor-pointer" variant="destructive">
                  Close Cash Register
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Cash Drawer Movements */}
          <div className="md:col-span-2 space-y-6">
            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader className="pb-2 border-b border-slate-100">
                <CardTitle className="font-bold text-slate-900">Session Cash Movements</CardTitle>
                <CardDescription className="text-slate-500">
                  Transactions affecting cash drawer during this active open session.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {movements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-1.5 p-6">
                    <Coins className="h-10 w-10 text-slate-300 animate-pulse" />
                    <p className="text-xs font-semibold">No movements recorded yet</p>
                    <p className="text-[10px]">Perform sales, log cash expenses, or collect Udhaar to populate.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          <th className="px-6 py-3">Time</th>
                          <th className="px-6 py-3">Movement Type</th>
                          <th className="px-6 py-3">Amount</th>
                          <th className="px-6 py-3 font-semibold">Details / Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {movements.map((move) => {
                          const isRefund = move.amount < 0
                          return (
                            <tr key={move.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-mono text-xs text-slate-400">
                                {new Date(move.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                              </td>
                              <td className="px-6 py-4 font-bold text-slate-700 text-xs">
                                <Badge variant="outline" className={`font-semibold ${isRefund ? "bg-red-50 text-red-650 border-red-200" : "bg-emerald-50 text-emerald-650 border-emerald-250"}`}>
                                  {formatMovementType(move.movement_type)}
                                </Badge>
                              </td>
                              <td className={`px-6 py-4 font-bold ${isRefund ? "text-red-650" : "text-emerald-650"}`}>
                                {isRefund ? `Rs. ${move.amount.toLocaleString()}` : `Rs. +${move.amount.toLocaleString()}`}
                              </td>
                              <td className="px-6 py-4 text-slate-500 text-xs font-semibold truncate max-w-xs">
                                {move.notes || "—"}
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
        </div>
      )}

      {/* Past Sessions List */}
      <Card className="border-slate-200/80 shadow-sm mt-6">
        <CardHeader className="pb-2 border-b border-slate-100">
          <CardTitle className="font-bold text-slate-900">Historical Cash Register Logs</CardTitle>
          <CardDescription className="text-slate-500">
            Audit history of closed cashier sessions and differences.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {pastSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-1.5 p-6">
              <Calendar className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-semibold">No past sessions logged</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Opened</th>
                    <th className="px-6 py-3">Closed</th>
                    <th className="px-6 py-3">Cashier</th>
                    <th className="px-6 py-3">Opening Cash</th>
                    <th className="px-6 py-3">Expected Cash</th>
                    <th className="px-6 py-3">Actual Cash</th>
                    <th className="px-6 py-3">Difference</th>
                    <th className="px-6 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {pastSessions.map((session) => {
                    const diff = Number(session.difference)
                    const diffWarn = diff !== 0
                    return (
                      <tr key={session.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">
                          {new Date(session.opened_at).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">
                          {session.closed_at ? new Date(session.closed_at).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" }) : "—"}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-700">
                          {session.cashier?.email.split("@")[0] || "—"}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-650">
                          Rs. {Number(session.opening_cash).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-650">
                          Rs. {Number(session.expected_closing_cash).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">
                          {session.actual_closing_cash ? `Rs. ${Number(session.actual_closing_cash).toLocaleString()}` : "—"}
                        </td>
                        <td className="px-6 py-4">
                          {session.status === "CLOSED" ? (
                            <span className={`font-black ${diffWarn ? "text-red-650" : "text-emerald-655"}`}>
                              {diff > 0 ? `Rs. +${diff.toLocaleString()}` : `Rs. ${diff.toLocaleString()}`}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant={session.status === "OPEN" ? "success" : "secondary"}>
                            {session.status}
                          </Badge>
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

      {/* Close Register Dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCloseSubmit(onCloseSession)}>
            <DialogHeader>
              <DialogTitle className="font-bold text-slate-900">Close Cash Register</DialogTitle>
              <DialogDescription className="text-slate-500">
                Record actual cash counted in the drawer to close the session. Differences are calculated automatically and logged for owner review.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="bg-slate-50 border border-slate-200/60 rounded p-3 text-xs space-y-1.5 font-semibold text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400">Expected Cash in Drawer</span>
                  <span className="font-bold text-slate-900">
                    Rs. {activeSession ? Number(activeSession.expected_closing_cash).toLocaleString() : "0"}
                  </span>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="actual_closing_cash" className="text-slate-700 font-semibold">Actual Counted Cash (PKR) *</Label>
                <Input
                  id="actual_closing_cash"
                  type="number"
                  placeholder="e.g. 5240"
                  {...closeRegister("actual_closing_cash")}
                  disabled={isPending}
                  className="border-slate-200 focus:border-primary focus:ring-primary font-bold text-slate-800 text-base"
                />
                {closeErrors.actual_closing_cash && (
                  <p className="text-xs font-semibold text-destructive">{closeErrors.actual_closing_cash.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="close_notes" className="text-slate-700">Reconciliation / Closing Note</Label>
                <Input
                  id="close_notes"
                  placeholder="e.g. Discrepancy details, handover references..."
                  {...closeRegister("notes")}
                  disabled={isPending}
                  className="border-slate-200"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCloseDialogOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="font-semibold shadow-sm cursor-pointer">
                {isPending ? "Closing Drawer..." : "Close Register Drawer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
