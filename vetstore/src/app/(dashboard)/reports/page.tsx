import * as React from "react"
import { getSalesReport, getInventoryReportData, getFinancialReport } from "@/lib/actions/reports"
import { ReportsClient } from "@/components/reports/reports-client"

export default async function ReportsPage() {
  // Default date range: last 7 days
  const endDate = new Date().toISOString().split("T")[0]
  const startDate = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split("T")[0]

  // Concurrent loader queries
  const [salesRes, inventoryRes, financialRes] = await Promise.all([
    getSalesReport({ startDate, endDate }),
    getInventoryReportData(),
    getFinancialReport({ startDate, endDate }),
  ])

  // Extract data or defaults
  const sales = salesRes.data || {
    sales: [],
    totals: { subtotal: 0, discount: 0, grandTotal: 0, paidAmount: 0, balanceAmount: 0, invoicesCount: 0 },
    cogs: 0,
    grossProfit: 0,
    paymentBreakdown: {},
  }

  const inventory = inventoryRes.data || {
    items: [],
    summary: { totalCostValuation: 0, totalRetailValuation: 0, lowStockCount: 0, expiredCount: 0, totalSKUs: 0 },
  }

  const financial = financialRes.data || {
    totalReceivables: 0,
    totalPayables: 0,
    totalExpenses: 0,
    expensesByCategory: [],
  }

  return (
    <ReportsClient
      initialSales={sales as any}
      initialInventory={inventory as any}
      initialFinancial={financial as any}
    />
  )
}
