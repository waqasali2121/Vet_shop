"use client"

import * as React from "react"
import { useState, useTransition } from "react"
import { getSalesReport, getFinancialReport } from "@/lib/actions/reports"
import { exportToCSV } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  TrendingUp,
  Coins,
  Receipt,
  Download,
  Calendar,
  Loader2,
  BarChart4,
  Warehouse,
  ArrowUpRight,
  ArrowDownLeft
} from "lucide-react"

type SalesReportData = {
  sales: any[]
  totals: {
    subtotal: number
    discount: number
    grandTotal: number
    paidAmount: number
    balanceAmount: number
    invoicesCount: number
  }
  cogs: number
  grossProfit: number
  paymentBreakdown: Record<string, number>
}

type InventoryReportData = {
  items: any[]
  summary: {
    totalCostValuation: number
    totalRetailValuation: number
    lowStockCount: number
    expiredCount: number
    totalSKUs: number
  }
}

type FinancialReportData = {
  totalReceivables: number
  totalPayables: number
  totalExpenses: number
  expensesByCategory: { category: string; amount: number }[]
}

interface ReportsClientProps {
  initialSales: SalesReportData
  initialInventory: InventoryReportData
  initialFinancial: FinancialReportData
}

export function ReportsClient({
  initialSales,
  initialInventory,
  initialFinancial,
}: ReportsClientProps) {
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<"sales" | "inventory" | "financial">("sales")

  // Date Filters
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split("T")[0] // default last 7 days
  )
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0])

  // Fetched data states
  const [salesReport, setSalesReport] = useState<SalesReportData>(initialSales)
  const [financialReport, setFinancialReport] = useState<FinancialReportData>(initialFinancial)
  const [error, setError] = useState<string | null>(null)

  // Group sales by day for the "Daily Backup" representation
  const dailySummary = React.useMemo(() => {
    const groups: Record<string, { totalSales: number; invoiceCount: number; cashSales: number; creditSales: number }> = {}

    salesReport.sales.forEach(sale => {
      if (sale.sale_status !== "COMPLETED") return // exclude voided
      const dateStr = new Date(sale.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
      if (!groups[dateStr]) {
        groups[dateStr] = { totalSales: 0, invoiceCount: 0, cashSales: 0, creditSales: 0 }
      }

      groups[dateStr].totalSales += Number(sale.grand_total)
      groups[dateStr].invoiceCount += 1
      groups[dateStr].cashSales += Number(sale.paid_amount)
      groups[dateStr].creditSales += Number(sale.balance_amount)
    })

    return Object.entries(groups).map(([date, data]) => ({
      date,
      ...data
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [salesReport.sales])

  const handleApplyFilters = () => {
    setError(null)
    startTransition(async () => {
      // 1. Fetch Sales Report
      const salesRes = await getSalesReport({ startDate, endDate })
      if (salesRes.error) {
        setError(salesRes.error)
        return
      }
      setSalesReport(salesRes.data as SalesReportData)

      // 2. Fetch Financial Report
      const finRes = await getFinancialReport({ startDate, endDate })
      if (finRes.error) {
        setError(finRes.error)
        return
      }
      setFinancialReport(finRes.data as FinancialReportData)
    })
  }

  // Pre-configured Date presets
  const handleDatePreset = (preset: "today" | "yesterday" | "this_month" | "prev_month") => {
    const today = new Date()
    let start = new Date()
    let end = new Date()

    if (preset === "today") {
      start = today
      end = today
    } else if (preset === "yesterday") {
      const yest = new Date()
      yest.setDate(today.getDate() - 1)
      start = yest
      end = yest
    } else if (preset === "this_month") {
      start = new Date(today.getFullYear(), today.getMonth(), 1)
      end = today
    } else if (preset === "prev_month") {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      end = new Date(today.getFullYear(), today.getMonth(), 0)
    }

    const startStr = start.toISOString().split("T")[0]
    const endStr = end.toISOString().split("T")[0]

    setStartDate(startStr)
    setEndDate(endStr)

    setError(null)
    startTransition(async () => {
      const salesRes = await getSalesReport({ startDate: startStr, endDate: endStr })
      const finRes = await getFinancialReport({ startDate: startStr, endDate: endStr })

      if (!salesRes.error && salesRes.data) setSalesReport(salesRes.data as SalesReportData)
      if (!finRes.error && finRes.data) setFinancialReport(finRes.data as FinancialReportData)
    })
  }

  // CSV EXPORTS
  const exportSalesCSV = () => {
    const headers = ["Invoice Date", "Invoice Number", "Customer Name", "Subtotal (PKR)", "Discount (PKR)", "Grand Total (PKR)", "Paid Amount (PKR)", "Balance (PKR)", "Status"]
    const rows = salesReport.sales.map(s => [
      new Date(s.created_at).toLocaleDateString(),
      s.invoice_number,
      s.customer?.name || "Walk-in Customer",
      s.subtotal,
      s.discount_amount,
      s.grand_total,
      s.paid_amount,
      s.balance_amount,
      s.sale_status
    ])
    exportToCSV(`Sales_Report_${startDate}_to_${endDate}`, headers, rows)
  }

  const exportInventoryCSV = () => {
    const headers = ["Product Name", "SKU", "Category", "Brand", "Available Stock", "Base Unit", "Valuation Cost (PKR)", "Valuation Retail (PKR)"]
    const rows = initialInventory.items.map(item => [
      item.name,
      item.sku || "—",
      item.category,
      item.brand,
      item.stock,
      item.unit,
      item.costValuation,
      item.retailValuation
    ])
    exportToCSV(`Inventory_Valuation_Report`, headers, rows)
  }

  const exportFinancialCSV = () => {
    const headers = ["Account / Expense Category", "Receivables (Udhaar, PKR)", "Payables (Suppliers, PKR)", "Expenses (Operating, PKR)"]
    const rows = [
      ["Outstanding Receivables", financialReport.totalReceivables, 0, 0],
      ["Outstanding Payables", 0, financialReport.totalPayables, 0],
      ...financialReport.expensesByCategory.map(e => [
        `Expense: ${e.category}`,
        0,
        0,
        e.amount
      ])
    ]
    exportToCSV(`Financial_Statement_${startDate}_to_${endDate}`, headers, rows as any)
  }

  // Calculations
  const salesTotals = salesReport.totals
  const gpMargin = salesTotals.grandTotal > 0 ? (salesReport.grossProfit / salesTotals.grandTotal) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Daily Backup & Sales summary</h1>
          <p className="text-sm text-slate-500 font-medium">
            Monitor daily sales transactions, check overall stock valuation, and download backups.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === "sales" && (
            <Button onClick={exportSalesCSV} variant="outline" className="font-semibold text-xs gap-1.5 cursor-pointer">
              <Download className="h-3.5 w-3.5" />
              Download Sales Backup
            </Button>
          )}
          {activeTab === "inventory" && (
            <Button onClick={exportInventoryCSV} variant="outline" className="font-semibold text-xs gap-1.5 cursor-pointer">
              <Download className="h-3.5 w-3.5" />
              Download Stock Backup
            </Button>
          )}
          {activeTab === "financial" && (
            <Button onClick={exportFinancialCSV} variant="outline" className="font-semibold text-xs gap-1.5 cursor-pointer">
              <Download className="h-3.5 w-3.5" />
              Download Financial Ledger
            </Button>
          )}
        </div>
      </div>

      {/* Date Filters (Only shown for Sales & Financials) */}
      {activeTab !== "inventory" && (
        <Card className="border-slate-200/80 shadow-sm shrink-0">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex flex-wrap gap-2 mr-auto pb-1 md:pb-0">
              <Button type="button" variant="outline" size="sm" onClick={() => handleDatePreset("today")} className="text-xs font-semibold">
                Today
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => handleDatePreset("yesterday")} className="text-xs font-semibold">
                Yesterday
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => handleDatePreset("this_month")} className="text-xs font-semibold">
                This Month
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => handleDatePreset("prev_month")} className="text-xs font-semibold">
                Prev Month
              </Button>
            </div>

            <div className="grid gap-1 flex-1">
              <Label className="text-xs text-slate-500 font-bold">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 border-slate-200 text-xs font-semibold"
              />
            </div>
            <div className="grid gap-1 flex-1">
              <Label className="text-xs text-slate-500 font-bold">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 border-slate-200 text-xs font-semibold"
              />
            </div>
            <Button
              onClick={handleApplyFilters}
              disabled={isPending}
              className="h-9 font-semibold text-xs shadow-sm cursor-pointer px-5"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Report"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab("sales")}
          className={`pb-2.5 text-sm font-semibold border-b-2 px-1 cursor-pointer transition-colors ${
            activeTab === "sales"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-slate-550 hover:text-slate-900"
          }`}
        >
          Daily Sales Backup & Analytics
        </button>
        <button
          onClick={() => setActiveTab("inventory")}
          className={`pb-2.5 text-sm font-semibold border-b-2 px-1 cursor-pointer transition-colors ${
            activeTab === "inventory"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-slate-550 hover:text-slate-900"
          }`}
        >
          Available Stock & Valuation
        </button>
        <button
          onClick={() => setActiveTab("financial")}
          className={`pb-2.5 text-sm font-semibold border-b-2 px-1 cursor-pointer transition-colors ${
            activeTab === "financial"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-slate-550 hover:text-slate-900"
          }`}
        >
          Accounts & Expenses Ledger
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20">
          {error}
        </div>
      )}

      {/* TAB CONTENTS */}
      <div className="space-y-6">
        {activeTab === "sales" && (
          <>
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="border-slate-200/80 shadow-sm">
                <CardHeader className="pb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross Sales Revenue</span>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-black text-slate-900">Rs. {salesTotals.grandTotal.toLocaleString()}</div>
                  <span className="text-[10px] text-slate-400 font-semibold">{salesTotals.invoicesCount} Invoices Checked out</span>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 shadow-sm">
                <CardHeader className="pb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cost of Goods Sold (COGS)</span>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-black text-slate-900">Rs. {salesReport.cogs.toLocaleString()}</div>
                  <span className="text-[10px] text-slate-400 font-semibold">Tallied from allocated batch unit costs</span>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 shadow-sm">
                <CardHeader className="pb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross Profit</span>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-black text-emerald-700">Rs. {salesReport.grossProfit.toLocaleString()}</div>
                  <span className="text-[10px] text-slate-400 font-semibold">Revenue minus COGS</span>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 shadow-sm">
                <CardHeader className="pb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross Margin (%)</span>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-black text-blue-700">{gpMargin.toFixed(1)} %</div>
                  <span className="text-[10px] text-slate-400 font-semibold">Average gross profitability</span>
                </CardContent>
              </Card>
            </div>

            {/* Daily Backup Summary (Daily grouped totals) */}
            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader className="pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">Daily Sales Summary Backup</CardTitle>
                  <CardDescription className="text-xs">Summary of total sales and invoices collected per day.</CardDescription>
                </div>
                <Button
                  onClick={() => {
                    const headers = ["Date", "Invoices Count", "Total Sales (PKR)", "Cash Sales (PKR)", "Credit/Udhaar Sales (PKR)"]
                    const rows = dailySummary.map(d => [d.date, d.invoiceCount, d.totalSales, d.cashSales, d.creditSales])
                    exportToCSV(`Daily_Sales_Backup_${startDate}_to_${endDate}`, headers, rows)
                  }}
                  variant="outline"
                  size="sm"
                  className="font-semibold text-xs gap-1.5 cursor-pointer shrink-0"
                >
                  <Download className="h-3 w-3" />
                  Backup Daily Data (CSV)
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3 text-center">Invoices count</th>
                        <th className="px-4 py-3">Total Sold</th>
                        <th className="px-4 py-3">Paid Cash</th>
                        <th className="px-4 py-3 text-red-650">Credit/Udhaar Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {dailySummary.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-6 text-slate-400 font-medium">No sales recorded in this date range.</td>
                        </tr>
                      ) : (
                        dailySummary.map(d => (
                          <tr key={d.date} className="hover:bg-slate-50/30 font-semibold">
                            <td className="px-4 py-3.5 text-slate-700 font-bold">{d.date}</td>
                            <td className="px-4 py-3.5 text-center text-slate-600">{d.invoiceCount} bills</td>
                            <td className="px-4 py-3.5 text-slate-900 font-bold">Rs. {d.totalSales.toLocaleString()}</td>
                            <td className="px-4 py-3.5 text-emerald-650">Rs. {d.cashSales.toLocaleString()}</td>
                            <td className="px-4 py-3.5 text-red-650">Rs. {d.creditSales.toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Payments & List Table */}
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="border-slate-200/80 shadow-sm md:col-span-1">
                <CardHeader className="pb-2 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-900">Payment Methods Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3.5 text-xs font-semibold">
                  {Object.entries(salesReport.paymentBreakdown).map(([method, amount]) => (
                    <div key={method} className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-400 uppercase tracking-wider">{method}</span>
                      <span className="text-slate-800 font-bold">Rs. {amount.toLocaleString()}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 shadow-sm md:col-span-2">
                <CardHeader className="pb-2 border-b border-slate-100">
                  <CardTitle className="font-bold text-slate-900">Invoices List</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          <th className="px-4 py-3">Invoice #</th>
                          <th className="px-4 py-3">Customer</th>
                          <th className="px-4 py-3">Total</th>
                          <th className="px-4 py-3">Paid</th>
                          <th className="px-4 py-3">Balance</th>
                          <th className="px-4 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {salesReport.sales.map(s => (
                          <tr key={s.id} className="hover:bg-slate-50/30">
                            <td className="px-4 py-4 font-mono font-bold text-slate-700">{s.invoice_number}</td>
                            <td className="px-4 py-4 font-bold text-slate-700">{s.customer?.name || "Walk-in"}</td>
                            <td className="px-4 py-4 font-bold text-slate-800">Rs. {Number(s.grand_total).toLocaleString()}</td>
                            <td className="px-4 py-4 font-semibold text-emerald-650">Rs. {Number(s.paid_amount).toLocaleString()}</td>
                            <td className="px-4 py-4 font-semibold text-red-650">Rs. {Number(s.balance_amount).toLocaleString()}</td>
                            <td className="px-4 py-4 text-center">
                              <Badge variant={s.sale_status === "COMPLETED" ? "success" : "destructive"}>
                                {s.sale_status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {activeTab === "inventory" && (
          <>
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="border-slate-200/80 shadow-sm">
                <CardHeader className="pb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Active SKUs</span>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-black text-slate-900">{initialInventory.summary.totalSKUs} Products</div>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 shadow-sm">
                <CardHeader className="pb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stock Valuation (Cost)</span>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-black text-emerald-700">Rs. {initialInventory.summary.totalCostValuation.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 shadow-sm">
                <CardHeader className="pb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stock Valuation (Retail)</span>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-black text-blue-700">Rs. {initialInventory.summary.totalRetailValuation.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 shadow-sm">
                <CardHeader className="pb-1">
                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Expired / Low Stock SKUs</span>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-black text-red-600">
                    {initialInventory.summary.expiredCount} Exp / {initialInventory.summary.lowStockCount} Low
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Inventory Table */}
            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader className="pb-2 border-b border-slate-100">
                <CardTitle className="font-bold text-slate-900">Current Stock Valuation Table</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <th className="px-6 py-3">Product Name</th>
                        <th className="px-6 py-3">SKU</th>
                        <th className="px-6 py-3">Category / Brand</th>
                        <th className="px-6 py-3">Stock level</th>
                        <th className="px-6 py-3">Cost Valuation</th>
                        <th className="px-6 py-3">Retail Valuation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {initialInventory.items.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/30">
                          <td className="px-6 py-4 font-bold text-slate-800">{item.name}</td>
                          <td className="px-6 py-4 font-mono font-bold text-slate-600">{item.sku || "—"}</td>
                          <td className="px-6 py-4 text-slate-550">
                            <div>{item.category}</div>
                            <span className="text-[10px] text-slate-400">{item.brand}</span>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-800">
                            {item.stock} <span className="text-slate-400 text-[10px] font-semibold">{item.unit}</span>
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-700">Rs. {item.costValuation.toLocaleString()}</td>
                          <td className="px-6 py-4 font-bold text-slate-800">Rs. {item.retailValuation.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === "financial" && (
          <>
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-slate-200/80 shadow-sm">
                <CardHeader className="pb-1 flex flex-row justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer Receivables (Udhaar)</span>
                  <ArrowDownLeft className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-black text-red-600">Rs. {financialReport.totalReceivables.toLocaleString()}</div>
                  <span className="text-[10px] text-slate-400 font-semibold">Credits owed to store by farmers</span>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 shadow-sm">
                <CardHeader className="pb-1 flex flex-row justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Supplier Payables</span>
                  <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-black text-emerald-700">Rs. {financialReport.totalPayables.toLocaleString()}</div>
                  <span className="text-[10px] text-slate-400 font-semibold">Shipment balances we owe to suppliers</span>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 shadow-sm">
                <CardHeader className="pb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operating Expenses</span>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-black text-slate-900">Rs. {financialReport.totalExpenses.toLocaleString()}</div>
                  <span className="text-[10px] text-slate-400 font-semibold">Tallied expenses inside filtered date range</span>
                </CardContent>
              </Card>
            </div>

            {/* Expenses breakdown */}
            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader className="pb-2 border-b border-slate-100">
                <CardTitle className="font-bold text-slate-900">Expenses Breakdown by Category</CardTitle>
                <CardDescription className="text-slate-500">
                  Total operating costs classified by category for the selected date range.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {financialReport.expensesByCategory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-1.5 p-6">
                    <Receipt className="h-10 w-10 text-slate-200" />
                    <p className="text-xs font-semibold">No expenses logged for this range</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          <th className="px-6 py-3">Expense Category</th>
                          <th className="px-6 py-3 text-right pr-12">Amount (PKR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {financialReport.expensesByCategory.map(e => (
                          <tr key={e.category} className="hover:bg-slate-50/30">
                            <td className="px-6 py-4 font-bold text-slate-800">{e.category}</td>
                            <td className="px-6 py-4 text-right pr-12 font-black text-slate-900">Rs. {Number(e.amount).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
