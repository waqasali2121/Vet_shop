import * as React from "react"
import { getDashboardData } from "@/lib/actions/dashboard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CircleDollarSign,
  TrendingUp,
  Package,
  AlertTriangle,
  ShoppingCart,
  Users,
  Coins,
  Import,
  Calendar,
  History,
  Eye,
} from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const res = await getDashboardData()

  // Fallbacks if database is empty/errors out
  const kpis = res.data?.kpis || {
    todaySales: 0,
    todayGrossProfit: 0,
    activeCashSession: 0,
    lowStockCount: 0,
    expiredCount: 0,
    creditSales: 0,
    cashSales: 0,
  }

  const expiryAlerts = res.data?.expiryAlerts || []
  const recentSales = res.data?.recentSales || []

  const cardsConfig = [
    {
      title: "Today's Sales",
      value: `Rs. ${kpis.todaySales.toLocaleString()}`,
      description: `Cash: Rs. ${kpis.cashSales.toLocaleString()} · Credit: Rs. ${kpis.creditSales.toLocaleString()}`,
      icon: CircleDollarSign,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    },
    {
      title: "Today's Profit",
      value: `Rs. ${kpis.todayGrossProfit.toLocaleString()}`,
      description: "Sales margin after batch costs",
      icon: TrendingUp,
      color: "text-blue-600 bg-blue-50 border-blue-200",
    },
    {
      title: "Active Session Cash",
      value: `Rs. ${kpis.activeCashSession.toLocaleString()}`,
      description: "Expected cash inside drawer",
      icon: Coins,
      color: "text-amber-600 bg-amber-50 border-amber-200",
    },
    {
      title: "Low Stock & Expired",
      value: `${kpis.lowStockCount} Items`,
      description: `${kpis.expiredCount} Expired active batches`,
      icon: Package,
      color: "text-red-600 bg-red-50 border-red-200",
      badge: kpis.lowStockCount > 0 ? "Alert" : undefined,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 font-medium">
            Welcome to Salman Farsy Veterinary Store POS terminal control panel.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/pos">
            <Button className="font-semibold shadow-sm gap-2 cursor-pointer">
              <ShoppingCart className="h-4 w-4" />
              Open POS Terminal
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cardsConfig.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.title} className="border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-slate-500">
                  {kpi.title}
                </CardTitle>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${kpi.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{kpi.value}</div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
                  {kpi.description}
                  {kpi.badge && (
                    <Badge variant="destructive" className="ml-auto text-[9px] px-1 py-0 font-bold uppercase">
                      {kpi.badge}
                    </Badge>
                  )}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main Grid: Expiry alerts, recent activities, actions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Expiry / Near Expiry Alerts */}
        <Card className="col-span-1 border-slate-200/80 shadow-sm md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <CardTitle className="font-bold text-slate-900">Near Expiry Alerts (90 Days)</CardTitle>
              <CardDescription className="text-slate-500">
                Active medicine and vaccines batches expiring in less than 90 days.
              </CardDescription>
            </div>
            {expiryAlerts.length > 0 && (
              <Badge variant="warning" className="font-bold uppercase text-[10px] tracking-wider py-0.5 px-2 animate-pulse">
                Attention Required
              </Badge>
            )}
          </CardHeader>
          <CardContent className="pt-4">
            {expiryAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-1.5 p-6">
                <Calendar className="h-10 w-10 text-slate-350" />
                <p className="text-xs font-semibold">No near-expiry batches detected</p>
                <p className="text-[10px]">All active batches are within safe shelf life windows.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {expiryAlerts.map((batch: any) => {
                  const today = new Date()
                  today.setHours(0,0,0,0)
                  const exp = new Date(batch.expiry_date)
                  const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

                  return (
                    <div key={batch.id} className="flex items-center justify-between py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">{batch.product?.name}</span>
                        <span className="text-xs text-slate-400 font-semibold">
                          Batch: {batch.batch_number} · Supplier: {batch.supplier?.name || "—"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-bold rounded px-2 py-0.5 ${diff <= 30 ? 'text-red-600 bg-red-50 border border-red-200' : 'text-amber-600 bg-amber-50 border border-amber-200'}`}>
                          Expiring in {diff} Days
                        </span>
                        <p className="text-xs font-semibold text-slate-500 mt-1">Qty: {batch.available_quantity}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Operations Sidebar Card */}
        <Card className="border-slate-200/80 shadow-sm col-span-1">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="font-bold text-slate-900">Quick Operations</CardTitle>
            <CardDescription className="text-slate-500">
              Frequently accessed cashier and owner actions
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <Link href="/pos" className="block w-full">
              <Button className="w-full justify-start font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/60" variant="ghost">
                <ShoppingCart className="mr-2 h-4 w-4 text-slate-500" />
                Open POS Terminal
              </Button>
            </Link>
            <Link href="/products/new" className="block w-full">
              <Button className="w-full justify-start font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/60" variant="ghost">
                <Package className="mr-2 h-4 w-4 text-slate-500" />
                Add New Product
              </Button>
            </Link>
            <Link href="/purchases/new" className="block w-full">
              <Button className="w-full justify-start font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/60" variant="ghost">
                <Import className="mr-2 h-4 w-4 text-slate-500" />
                Record Purchase Invoice
              </Button>
            </Link>
            <Link href="/customers" className="block w-full">
              <Button className="w-full justify-start font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/60" variant="ghost">
                <Users className="mr-2 h-4 w-4 text-slate-500" />
                Manage Customer Udhaar
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Transactions List Card */}
        <Card className="col-span-1 border-slate-200/80 shadow-sm md:col-span-3">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="font-bold text-slate-900">Recent Transactions</CardTitle>
            <CardDescription className="text-slate-500">
              The 5 most recent sales checked out on the POS terminal.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {recentSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-400 gap-1.5 p-6">
                <History className="h-8 w-8 text-slate-350" />
                <p className="text-xs font-semibold">No recent transactions recorded</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-6 py-3">Time</th>
                      <th className="px-6 py-3">Invoice #</th>
                      <th className="px-6 py-3">Customer</th>
                      <th className="px-6 py-3">Grand Total</th>
                      <th className="px-6 py-3">Paid Amount</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right pr-6">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {recentSales.map((sale: any) => (
                      <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3 font-mono text-xs text-slate-500">
                          {new Date(sale.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </td>
                        <td className="px-6 py-3 font-bold text-slate-800 font-mono">{sale.invoice_number}</td>
                        <td className="px-6 py-3 font-bold text-slate-700">{sale.customer?.name || "Walk-in"}</td>
                        <td className="px-6 py-3 font-bold text-slate-800 font-mono">Rs. {Number(sale.grand_total).toLocaleString()}</td>
                        <td className="px-6 py-3 font-semibold text-emerald-650">Rs. {Number(sale.paid_amount).toLocaleString()}</td>
                        <td className="px-6 py-3">
                          <Badge variant={sale.sale_status === "COMPLETED" ? "success" : "destructive"}>
                            {sale.sale_status}
                          </Badge>
                        </td>
                        <td className="px-6 py-3 text-right pr-6">
                          <Link href={`/sales/${sale.id}`}>
                            <Button variant="ghost" size="sm" className="font-semibold text-primary hover:text-primary/80 gap-1.5 cursor-pointer">
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
