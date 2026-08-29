import { getDashboardData } from "@/lib/actions/dashboard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CircleDollarSign,
  TrendingUp,
  Package,
  ShoppingCart,
  Users,
  Coins,
  Calendar,
  History,
  Eye,
  AlertOctagon,
  Clock,
  Sparkles
} from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const res = (await getDashboardData()) as any
  const data = (res.data || {}) as any

  // Fallbacks if database is empty/errors out
  const kpis = data.kpis || {
    todaySales: 0,
    todayBillsCount: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
    totalProducts: 0,
    totalCustomers: 0,
    totalSuppliers: 0,
    lowStockCount: 0,
    expiredCount: 0,
    expiringSoonCount: 0,
    todayGrossProfit: 0,
    activeCashSession: 0,
    creditSales: 0,
    cashSales: 0,
  }

  const expiryAlerts = data.expiryAlerts || []
  const recentSales = data.recentSales || []
  const mostBought = data.mostBought || []

  const cardsConfig = [
    {
      title: "Today's Sales",
      value: `Rs. ${kpis.todaySales.toLocaleString()}`,
      description: `${kpis.todayBillsCount} Bills checked out`,
      icon: CircleDollarSign,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    },
    {
      title: "Today's Revenue",
      value: `Rs. ${kpis.todayRevenue.toLocaleString()}`,
      description: `Cash: Rs. ${kpis.cashSales.toLocaleString()} · Credit: Rs. ${kpis.creditSales.toLocaleString()}`,
      icon: Coins,
      color: "text-blue-600 bg-blue-50 border-blue-200",
    },
    {
      title: "Monthly Revenue",
      value: `Rs. ${kpis.monthlyRevenue.toLocaleString()}`,
      description: "Current calendar month",
      icon: TrendingUp,
      color: "text-indigo-600 bg-indigo-50 border-indigo-200",
    },
    {
      title: "Today's Profit",
      value: `Rs. ${kpis.todayGrossProfit.toLocaleString()}`,
      description: "Sales margin after batch costs",
      icon: Sparkles,
      color: "text-teal-600 bg-teal-50 border-teal-200",
    },
    {
      title: "Total Medicines",
      value: `${kpis.totalProducts} Items`,
      description: `${kpis.totalSuppliers} Registered Suppliers`,
      icon: Package,
      color: "text-slate-600 bg-slate-50 border-slate-200",
    },
    {
      title: "Total Customers",
      value: `${kpis.totalCustomers} Accounts`,
      description: "Registered farmer/pet accounts",
      icon: Users,
      color: "text-violet-600 bg-violet-50 border-violet-200",
    },
    {
      title: "Low Stock & Expired",
      value: `${kpis.lowStockCount} Low / ${kpis.expiredCount} Exp`,
      description: "Critical stock alerts",
      icon: AlertOctagon,
      color: "text-red-600 bg-red-50 border-red-200",
      badge: kpis.lowStockCount > 0 || kpis.expiredCount > 0 ? "Alert" : undefined,
    },
    {
      title: "Expiring Soon (90d)",
      value: `${kpis.expiringSoonCount} Batches`,
      description: "Near-expiry batches",
      icon: Clock,
      color: "text-amber-600 bg-amber-50 border-amber-200",
      badge: kpis.expiringSoonCount > 0 ? "Attention" : undefined,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 font-semibold">
            Welcome to Salman Farsy Veterinary Store POS terminal control panel.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/pos">
            <Button className="font-bold shadow-sm gap-2 cursor-pointer bg-primary hover:bg-primary-hover text-white">
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
                <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {kpi.title}
                </CardTitle>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${kpi.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black text-slate-900">{kpi.value}</div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-semibold">
                  {kpi.description}
                  {kpi.badge && (
                    <Badge variant="destructive" className="ml-auto text-[8px] px-1 py-0 font-bold uppercase tracking-wider">
                      {kpi.badge}
                    </Badge>
                  )}
                </div>
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
              <CardTitle className="font-bold text-slate-900 text-base">Near Expiry Alerts (90 Days)</CardTitle>
              <CardDescription className="text-slate-500 text-xs">
                Active medicine and vaccines batches expiring in less than 90 days.
              </CardDescription>
            </div>
            {expiryAlerts.length > 0 && (
              <Badge variant="warning" className="font-bold uppercase text-[9px] tracking-wider py-0.5 px-2 animate-pulse">
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
                    <div key={batch.id} className="flex items-center justify-between py-2.5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800">{batch.product?.name}</span>
                        <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          Batch: {batch.batch_number} · Supplier: {batch.supplier?.name || "—"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] font-bold rounded px-2 py-0.5 ${diff <= 30 ? 'text-red-650 bg-red-50 border border-red-200' : 'text-amber-600 bg-amber-50 border border-amber-200'}`}>
                          Expiring in {diff} Days
                        </span>
                        <p className="text-[10px] font-bold text-slate-500 mt-1">Qty: {batch.available_quantity}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Most Bought Medicines Card */}
        <Card className="border-slate-200/80 shadow-sm col-span-1">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="font-bold text-slate-900 text-base">Most Bought Medicines</CardTitle>
            <CardDescription className="text-slate-500 text-xs">
              Top 5 selling items by overall quantity
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {mostBought.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-1.5 p-6">
                <Package className="h-10 w-10 text-slate-350" />
                <p className="text-xs font-semibold">No sales recorded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mostBought.map((item: any, idx: number) => (
                  <div key={item.name} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-800 truncate max-w-[150px]" title={item.name}>
                        {item.name}
                      </span>
                    </div>
                    <Badge variant="secondary" className="font-black text-[10px] bg-slate-100 text-slate-700">
                      {item.quantity} Sold
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions List Card */}
        <Card className="col-span-1 border-slate-200/80 shadow-sm md:col-span-3">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="font-bold text-slate-900 text-base">Recent Transactions</CardTitle>
            <CardDescription className="text-slate-500 text-xs">
              The 5 most recent sales checked out on the POS terminal.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {recentSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-400 gap-1.5 p-6">
                <History className="h-8 w-8 text-slate-355" />
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
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {recentSales.map((sale: any) => (
                      <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3 font-mono text-slate-500">
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
                            <Button variant="ghost" size="sm" className="font-semibold text-primary hover:text-primary-hover gap-1.5 cursor-pointer">
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
