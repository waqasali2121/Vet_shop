"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  History,
  CheckCircle2,
  FileText,
  ArrowRight,
  Wallet,
  Phone,
  User,
  Hash,
  Banknote,
  CreditCard,
  Smartphone,
  MoreHorizontal,
  Printer,
  Download,
  Eye,
  X,
  AlertTriangle,
  ArrowDownLeft,
  Clock,
  Receipt,
  Loader2,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { createCustomerPayment, getCustomerPaymentHistory } from "@/lib/actions/customers"

interface Customer {
  id: string
  name: string
  phone: string
  customer_type: string
  current_balance: number
}

interface Sale {
  id: string
  invoice_number: string
  customer_id: string
  grand_total: number
  paid_amount: number
  balance_amount: number
  payment_status: string
  created_at: string
}

interface PaymentRecord {
  id: string
  customer_id: string
  amount: number
  payment_method: string
  previous_balance: number
  new_balance: number
  reference_number: string | null
  notes: string | null
  received_by: string
  created_at: string
  receiver?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
  } | null
}

export function CustomerPaymentsClient({ customers, sales }: { customers: Customer[], sales: Sale[] }) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = React.useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = React.useState(false)

  // Payment Form State
  const [payAmount, setPayAmount] = React.useState("")
  const [payMethod, setPayMethod] = React.useState("CASH")
  const [payDate, setPayDate] = React.useState(new Date().toISOString().split("T")[0])
  const [payNotes, setPayNotes] = React.useState("")
  const [payReference, setPayReference] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Payment History State
  const [paymentHistory, setPaymentHistory] = React.useState<PaymentRecord[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false)

  // Last successful payment (for receipt)
  const [lastPaymentId, setLastPaymentId] = React.useState<string | null>(null)
  const [lastPayment, setLastPayment] = React.useState<{
    amount: number
    method: string
    reference: string
    previousBalance: number
    newBalance: number
    date: string
  } | null>(null)

  // Filter customers based on search term
  const filteredCustomers = React.useMemo(() => {
    if (!searchTerm.trim()) return []
    const term = searchTerm.toLowerCase()

    // Match by invoice number
    const matchingSales = sales.filter(s => s.invoice_number.toLowerCase().includes(term))
    const customerIdsFromSales = matchingSales.map(s => s.customer_id)

    // Match by ID prefix
    return customers.filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.phone.includes(term) ||
      c.id.toLowerCase().startsWith(term) ||
      customerIdsFromSales.includes(c.id)
    )
  }, [searchTerm, customers, sales])

  // Get customer specific sales data
  const customerSales = React.useMemo(() => {
    if (!selectedCustomer) return []
    return sales.filter(s => s.customer_id === selectedCustomer.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [selectedCustomer, sales])

  const totalPurchases = customerSales.length
  const totalAmount = customerSales.reduce((sum, s) => sum + Number(s.grand_total), 0)
  const totalPaid = customerSales.reduce((sum, s) => sum + Number(s.paid_amount), 0)

  // Find last payment date from payment history
  const lastPaymentDate = React.useMemo(() => {
    if (paymentHistory.length === 0) return null
    return new Date(paymentHistory[0].created_at)
  }, [paymentHistory])

  // Load payment history when customer is selected
  const loadPaymentHistory = React.useCallback(async (customerId: string) => {
    setIsLoadingHistory(true)
    try {
      const res = await getCustomerPaymentHistory(customerId)
      if (res.data) {
        setPaymentHistory(res.data as PaymentRecord[])
      }
    } catch {
      // silently fail — history is supplementary
    } finally {
      setIsLoadingHistory(false)
    }
  }, [])

  const handleSelectCustomer = React.useCallback((customer: Customer) => {
    setSelectedCustomer(customer)
    loadPaymentHistory(customer.id)
  }, [loadPaymentHistory])

  // Handle confirmation step before payment
  const handlePaymentReview = (e: any) => {
    e.preventDefault()
    const amountNum = Number(payAmount)

    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount greater than 0")
      return
    }

    if (selectedCustomer && amountNum > selectedCustomer.current_balance) {
      toast.error("Payment amount cannot exceed the remaining balance of Rs. " + Number(selectedCustomer.current_balance).toLocaleString())
      return
    }

    // Open confirmation dialog
    setIsConfirmModalOpen(true)
  }

  const handlePaymentSubmit = async () => {
    if (!selectedCustomer) return

    const amountNum = Number(payAmount)
    setIsSubmitting(true)
    setIsConfirmModalOpen(false)

    try {
      const result = await createCustomerPayment(
        selectedCustomer.id,
        amountNum,
        payMethod as any,
        payReference || undefined,
        payNotes || undefined
      )

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Payment of Rs. " + amountNum.toLocaleString() + " received successfully!")

        const paymentId = (result as any).data?.paymentId
        setLastPaymentId(paymentId || null)

        // Save last payment info for receipt
        setLastPayment({
          amount: amountNum,
          method: payMethod,
          reference: payReference,
          previousBalance: selectedCustomer.current_balance,
          newBalance: selectedCustomer.current_balance - amountNum,
          date: payDate,
        })

        // Update local state immediately
        setSelectedCustomer(prev => prev ? { ...prev, current_balance: prev.current_balance - amountNum } : null)

        setIsPaymentModalOpen(false)
        setIsReceiptModalOpen(true)

        // Reset form
        setPayAmount("")
        setPayNotes("")
        setPayReference("")
        setPayMethod("CASH")
        setPayDate(new Date().toISOString().split("T")[0])

        // Reload payment history
        loadPaymentHistory(selectedCustomer.id)

        // Refresh server data
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePrintReceipt = () => {
    if (!lastPaymentId) return
    const printWindow = window.open(`/api/payment-receipt?id=${lastPaymentId}`, "_blank")
    if (printWindow) {
      printWindow.focus()
    }
  }

  const handleDownloadReceipt = () => {
    if (!lastPaymentId) return
    const downloadWindow = window.open(`/api/payment-receipt?id=${lastPaymentId}`, "_blank")
    if (downloadWindow) {
      downloadWindow.focus()
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "CASH": return <Banknote className="h-3.5 w-3.5" />
      case "BANK_TRANSFER": return <CreditCard className="h-3.5 w-3.5" />
      case "CARD": return <CreditCard className="h-3.5 w-3.5" />
      case "EASYPAISA": case "JAZZCASH": return <Smartphone className="h-3.5 w-3.5" />
      default: return <MoreHorizontal className="h-3.5 w-3.5" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            Customer Balance / Receive Payment
          </h1>
          <p className="text-sm text-slate-500 font-semibold mt-0.5">
            Search customers, view outstanding balances, receive payments, and generate receipts.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
          <ChevronRight className="h-3 w-3" />
          Dashboard
          <ChevronRight className="h-3 w-3" />
          Search Customer
          <ChevronRight className="h-3 w-3" />
          View Balance
          <ChevronRight className="h-3 w-3" />
          <span className="text-primary font-bold">Receive Payment</span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Search Panel */}
        <div className="md:col-span-4 space-y-4">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                Search Customer
              </CardTitle>
              <CardDescription className="text-xs">
                Search by Name, Phone, Customer ID, or Invoice #
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="e.g. Ali, 0300..., INV-..."
                  className="pl-9 h-9 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
                {searchTerm && (
                  <button
                    onClick={() => { setSearchTerm(""); setSelectedCustomer(null) }}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Search Hints */}
              {!searchTerm.trim() && (
                <div className="mt-4 space-y-2">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Search by:</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { icon: User, label: "Customer Name" },
                      { icon: Phone, label: "Phone Number" },
                      { icon: Hash, label: "Customer ID" },
                      { icon: FileText, label: "Invoice Number" },
                    ].map(hint => (
                      <div key={hint.label} className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold bg-slate-50 rounded-md px-2 py-1.5 border border-slate-100">
                        <hint.icon className="h-3 w-3 text-slate-300" />
                        {hint.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Results */}
              <div className="mt-4 space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {searchTerm.trim() && filteredCustomers.length === 0 && (
                  <div className="text-center py-6 text-xs text-slate-500 space-y-1">
                    <Search className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                    <p className="font-bold">No customers found</p>
                    <p className="text-slate-400">Try a different search term</p>
                  </div>
                )}

                {searchTerm.trim() && filteredCustomers.length > 0 && (
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                    {filteredCustomers.length} Result{filteredCustomers.length !== 1 ? "s" : ""} Found
                  </p>
                )}

                {filteredCustomers.map(customer => (
                  <div
                    key={customer.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all duration-150 ${selectedCustomer?.id === customer.id
                      ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                      : "border-slate-100 hover:border-slate-300 hover:shadow-sm"
                      }`}
                    onClick={() => handleSelectCustomer(customer)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-slate-800">{customer.name}</div>
                      {selectedCustomer?.id === customer.id && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                      <Phone className="h-3 w-3" />
                      {customer.phone}
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <Badge variant="outline" className="text-[10px]">{customer.customer_type}</Badge>
                      <span className={`text-xs font-black ${customer.current_balance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                        Rs. {Number(customer.current_balance).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Details Panel */}
        <div className="md:col-span-8">
          {selectedCustomer ? (
            <div className="space-y-6">
              {/* Customer Balance Card */}
              <Card className="border-slate-200/80 shadow-sm">
                <CardHeader className="pb-4 border-b border-slate-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl font-bold flex items-center gap-2">
                        {selectedCustomer.name}
                      </CardTitle>
                      <CardDescription className="text-sm mt-1 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        {selectedCustomer.phone}
                        <span className="text-slate-300 mx-1">·</span>
                        <Hash className="h-3.5 w-3.5" />
                        <span className="font-mono text-[10px]">{selectedCustomer.id.slice(0, 8)}...</span>
                      </CardDescription>
                    </div>
                    {selectedCustomer.current_balance <= 0 ? (
                      <Badge variant="success" className="px-3 py-1.5 font-bold text-xs gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        FULLY PAID
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="px-3 py-1.5 font-bold text-xs gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        PARTIALLY PAID
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {/* Balance Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-[10px] text-slate-500 font-semibold mb-1 uppercase tracking-wider">Total Purchases</div>
                      <div className="text-lg font-black text-slate-800">{totalPurchases}</div>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-[10px] text-slate-500 font-semibold mb-1 uppercase tracking-wider">Total Amount</div>
                      <div className="text-lg font-black text-slate-800">Rs. {totalAmount.toLocaleString()}</div>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-[10px] text-slate-500 font-semibold mb-1 uppercase tracking-wider">Amount Paid</div>
                      <div className="text-lg font-black text-emerald-600">Rs. {totalPaid.toLocaleString()}</div>
                    </div>
                    <div className={`p-3.5 rounded-xl border-2 ${selectedCustomer.current_balance > 0 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
                      <div className={`text-[10px] font-bold mb-1 uppercase tracking-wider ${selectedCustomer.current_balance > 0 ? "text-red-700" : "text-emerald-700"}`}>
                        Remaining Balance
                      </div>
                      <div className={`text-lg font-black ${selectedCustomer.current_balance > 0 ? "text-red-700" : "text-emerald-700"}`}>
                        Rs. {Number(selectedCustomer.current_balance).toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-[10px] text-slate-500 font-semibold mb-1 uppercase tracking-wider">Last Payment</div>
                      <div className="text-sm font-black text-slate-800">
                        {lastPaymentDate
                          ? lastPaymentDate.toLocaleDateString("en-US", { dateStyle: "medium" })
                          : "—"
                        }
                      </div>
                    </div>
                  </div>

                  {/* Recent Invoice History */}
                  <div className="mt-6">
                    <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
                      <History className="h-4 w-4 text-slate-500" />
                      Recent Invoice / Payment History
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-slate-100">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-500 bg-slate-50/75">
                            <th className="py-2.5 px-3 font-semibold text-xs uppercase tracking-wider">Date</th>
                            <th className="py-2.5 px-3 font-semibold text-xs uppercase tracking-wider">Invoice #</th>
                            <th className="py-2.5 px-3 font-semibold text-xs uppercase tracking-wider text-right">Grand Total</th>
                            <th className="py-2.5 px-3 font-semibold text-xs uppercase tracking-wider text-right">Paid</th>
                            <th className="py-2.5 px-3 font-semibold text-xs uppercase tracking-wider text-right">Balance</th>
                            <th className="py-2.5 px-3 font-semibold text-xs uppercase tracking-wider text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {customerSales.slice(0, 5).map(sale => (
                            <tr key={sale.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 text-slate-600 font-mono text-xs">
                                {new Date(sale.created_at).toLocaleDateString()}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-800 text-xs font-mono">
                                {sale.invoice_number}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-xs">
                                Rs. {Number(sale.grand_total).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-xs text-emerald-600">
                                Rs. {Number(sale.paid_amount).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-xs text-red-600 font-bold">
                                Rs. {Number(sale.balance_amount).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <Badge variant={sale.payment_status === "PAID" ? "success" : sale.payment_status === "PARTIAL" ? "warning" : "destructive"} className="text-[9px]">
                                  {sale.payment_status === "PAID" ? "FULLY PAID" : sale.payment_status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                          {customerSales.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-slate-500 text-xs">
                                No sales history found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Payment History Section */}
                  <div className="mt-6">
                    <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-emerald-600" />
                      Payment Collection History
                    </h3>
                    {isLoadingHistory ? (
                      <div className="flex items-center justify-center py-8 text-slate-400">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        <span className="text-xs font-semibold">Loading payment history...</span>
                      </div>
                    ) : paymentHistory.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 border border-dashed border-slate-200 rounded-lg">
                        <Clock className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                        <p className="text-xs font-semibold">No payments collected yet</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-slate-100">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-500 bg-slate-50/75">
                              <th className="py-2.5 px-3 font-semibold text-xs uppercase tracking-wider">Date & Time</th>
                              <th className="py-2.5 px-3 font-semibold text-xs uppercase tracking-wider">Receipt #</th>
                              <th className="py-2.5 px-3 font-semibold text-xs uppercase tracking-wider text-right">Prev. Balance</th>
                              <th className="py-2.5 px-3 font-semibold text-xs uppercase tracking-wider text-right">Received</th>
                              <th className="py-2.5 px-3 font-semibold text-xs uppercase tracking-wider text-right">New Balance</th>
                              <th className="py-2.5 px-3 font-semibold text-xs uppercase tracking-wider">Method</th>
                              <th className="py-2.5 px-3 font-semibold text-xs uppercase tracking-wider">Recorded By</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {paymentHistory.map(payment => (
                              <tr key={payment.id} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-3 text-slate-600 font-mono text-xs">
                                  {new Date(payment.created_at).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-800 text-xs">
                                  {payment.reference_number || "—"}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-xs text-slate-600">
                                  Rs. {Number(payment.previous_balance).toLocaleString()}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-xs font-black text-emerald-600">
                                  <span className="flex items-center justify-end gap-0.5">
                                    <ArrowDownLeft className="h-3 w-3" />
                                    Rs. {Number(payment.amount).toLocaleString()}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-xs font-black text-slate-800">
                                  Rs. {Number(payment.new_balance).toLocaleString()}
                                </td>
                                <td className="py-2.5 px-3 text-xs">
                                  <div className="flex items-center gap-1 text-slate-600 font-semibold">
                                    {getPaymentMethodIcon(payment.payment_method)}
                                    {getMethodLabel(payment.payment_method)}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-xs text-slate-500 font-semibold">
                                  {payment.receiver?.first_name || payment.receiver?.email?.split("@")[0] || "System"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50/50 border-t border-slate-100 p-4 flex justify-end">
                  <Button
                    className="font-bold gap-2 shadow-sm cursor-pointer"
                    disabled={selectedCustomer.current_balance <= 0}
                    onClick={() => {
                      setPayAmount("")
                      setPayDate(new Date().toISOString().split("T")[0])
                      setPayReference("")
                      setPayNotes("")
                      setPayMethod("CASH")
                      setIsPaymentModalOpen(true)
                    }}
                    size="lg"
                  >
                    <Banknote className="h-4 w-4" />
                    Receive Payment
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </div>
          ) : (
            <div className="h-full min-h-[500px] border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 p-8">
              <div className="bg-slate-100 rounded-full p-4 mb-4">
                <Wallet className="h-10 w-10 text-slate-300" />
              </div>
              <p className="font-bold text-slate-600 text-lg">Select a Customer</p>
              <p className="text-sm mt-1 text-center max-w-sm">
                Search and select a customer from the list to view their balance details, payment history, and receive payments.
              </p>
              <div className="mt-6 flex items-center gap-2 text-xs text-slate-400 font-semibold">
                <Search className="h-3.5 w-3.5" />
                Search
                <ChevronRight className="h-3 w-3" />
                Select Customer
                <ChevronRight className="h-3 w-3" />
                View Balance
                <ChevronRight className="h-3 w-3" />
                Receive Payment
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================= */}
      {/* Receive Payment Modal */}
      {/* ============================================================= */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-primary" />
              Receive Payment
            </DialogTitle>
            <DialogDescription>
              Record a payment from <strong>{selectedCustomer?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePaymentReview} className="space-y-4 py-2">
            {/* Outstanding Balance Banner */}
            <div className="bg-red-50 p-3.5 rounded-lg border border-red-200 flex justify-between items-center">
              <span className="text-sm font-semibold text-red-800">Outstanding Balance:</span>
              <span className="font-black text-red-700 text-lg">
                Rs. {selectedCustomer ? Number(selectedCustomer.current_balance).toLocaleString() : 0}
              </span>
            </div>

            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="amount" className="font-semibold">Payment Amount (Rs.) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="1"
                  max={selectedCustomer?.current_balance}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="Enter amount received..."
                  autoFocus
                  className="text-lg font-bold h-11"
                />
                {payAmount && selectedCustomer && Number(payAmount) > 0 && Number(payAmount) <= selectedCustomer.current_balance && (
                  <p className="text-[10px] text-emerald-600 font-semibold">
                    New balance after payment: Rs. {(selectedCustomer.current_balance - Number(payAmount)).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="method" className="font-semibold">Payment Method *</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger id="method" className="h-10">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">💵 Cash</SelectItem>
                    <SelectItem value="BANK_TRANSFER">🏦 Bank Transfer</SelectItem>
                    <SelectItem value="CARD">💳 Credit/Debit Card</SelectItem>
                    <SelectItem value="EASYPAISA">📱 EasyPaisa</SelectItem>
                    <SelectItem value="JAZZCASH">📱 JazzCash</SelectItem>
                    <SelectItem value="OTHER">📝 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="payDate" className="font-semibold">Payment Date *</Label>
                <Input
                  id="payDate"
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="h-10"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reference" className="font-semibold">Reference / Transaction No. (Optional)</Label>
                <Input
                  id="reference"
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  placeholder="e.g. Bank slip #, Cheque #, TRX ID..."
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes" className="font-semibold">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Any additional remarks..."
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="font-bold gap-2" disabled={isSubmitting}>
                Review & Confirm
                <ArrowRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================================================= */}
      {/* Confirmation Modal */}
      {/* ============================================================= */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <div className="mx-auto bg-amber-100 text-amber-600 p-3 rounded-full mb-2 w-12 h-12 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-center text-lg">Confirm Payment</DialogTitle>
            <DialogDescription className="text-center">
              Please review the details before confirming.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Customer:</span>
              <span className="font-bold text-slate-800">{selectedCustomer?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Current Balance:</span>
              <span className="font-bold text-red-600">Rs. {selectedCustomer ? Number(selectedCustomer.current_balance).toLocaleString() : 0}</span>
            </div>
            <div className="flex justify-between border-t border-dashed border-slate-200 pt-2">
              <span className="text-slate-500 font-semibold">Payment Amount:</span>
              <span className="font-black text-emerald-600 text-base">Rs. {Number(payAmount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Method:</span>
              <span className="font-bold">{getMethodLabel(payMethod)}</span>
            </div>
            <div className="flex justify-between border-t border-dashed border-slate-200 pt-2">
              <span className="text-slate-500 font-bold">New Balance:</span>
              <span className="font-black text-slate-800 text-base">
                Rs. {selectedCustomer ? (selectedCustomer.current_balance - Number(payAmount)).toLocaleString() : 0}
              </span>
            </div>
          </div>

          <DialogFooter className="pt-4 gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => setIsConfirmModalOpen(false)} className="flex-1">
              Go Back
            </Button>
            <Button
              type="button"
              onClick={handlePaymentSubmit}
              disabled={isSubmitting}
              className="font-bold gap-2 flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================= */}
      {/* Receipt / Success Modal */}
      {/* ============================================================= */}
      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="sm:max-w-[450px] print:shadow-none print:border-none">
          <DialogHeader>
            <div className="mx-auto bg-emerald-100 text-emerald-600 p-3 rounded-full mb-2 w-12 h-12 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <DialogTitle className="text-center text-xl">Payment Successful!</DialogTitle>
            <DialogDescription className="text-center">
              The customer&apos;s balance has been updated.
            </DialogDescription>
          </DialogHeader>

          {lastPayment && selectedCustomer && (
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 space-y-3 mt-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Customer:</span>
                <span className="font-bold">{selectedCustomer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Phone:</span>
                <span className="font-bold">{selectedCustomer.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Date:</span>
                <span className="font-bold">{new Date(lastPayment.date).toLocaleDateString("en-US", { dateStyle: "medium" })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Method:</span>
                <span className="font-bold">{getMethodLabel(lastPayment.method)}</span>
              </div>
              {lastPayment.reference && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Reference:</span>
                  <span className="font-bold font-mono text-xs">{lastPayment.reference}</span>
                </div>
              )}
              <div className="border-t border-dashed border-slate-200 pt-2 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Previous Balance:</span>
                  <span className="font-bold">Rs. {lastPayment.previousBalance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700 font-bold">Amount Paid:</span>
                  <span className="font-black text-emerald-600 text-base">Rs. {lastPayment.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-slate-200 pt-2">
                  <span className="font-bold text-slate-800">New Balance:</span>
                  <span className={`font-black text-base ${lastPayment.newBalance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                    Rs. {lastPayment.newBalance.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Status:</span>
                  {lastPayment.newBalance <= 0 ? (
                    <Badge variant="success" className="text-[10px]">FULLY PAID</Badge>
                  ) : (
                    <Badge variant="warning" className="text-[10px]">PARTIALLY PAID — Rs. {lastPayment.newBalance.toLocaleString()} remaining</Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => setIsReceiptModalOpen(false)} className="gap-2">
              <Eye className="w-4 h-4" />
              Close
            </Button>
            <Button type="button" variant="outline" onClick={handlePrintReceipt} className="gap-2 print:hidden">
              <Printer className="w-4 h-4" />
              Print Receipt
            </Button>
            <Button type="button" onClick={handleDownloadReceipt} className="gap-2 print:hidden font-bold">
              <Download className="w-4 h-4" />
              Download Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Helper function - placed outside component for reuse
function getMethodLabel(method: string): string {
  switch (method) {
    case "CASH": return "Cash"
    case "BANK_TRANSFER": return "Bank Transfer"
    case "CARD": return "Credit/Debit Card"
    case "EASYPAISA": return "EasyPaisa"
    case "JAZZCASH": return "JazzCash"
    case "OTHER": return "Other"
    default: return method
  }
}
