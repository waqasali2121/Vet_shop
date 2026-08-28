"use client"

import * as React from "react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, AlertTriangle, Layers, Trash2, ArrowUpRight } from "lucide-react"
import Link from "next/link"

type ExpiryBatch = {
  id: string
  batch_number: string
  expiry_date: string | null
  available_quantity: number
  unit_cost: number
  days_remaining: number
  product: {
    id: string
    name: string
    sku: string | null
    unit: { abbreviation: string } | null
  }
  supplier: {
    id: string
    name: string
  } | null
}

interface ExpiryClientProps {
  data: {
    expired: ExpiryBatch[]
    urgent: ExpiryBatch[]
    near: ExpiryBatch[]
    medium: ExpiryBatch[]
    safe: ExpiryBatch[]
  }
  counts: {
    expired: number
    urgent: number
    near: number
    medium: number
    safe: number
  }
}

export function ExpiryClient({ data, counts }: ExpiryClientProps) {
  const [activeTab, setActiveTab] = useState<"expired" | "urgent" | "near" | "medium">("expired")

  const getActiveList = () => {
    switch (activeTab) {
      case "expired":
        return data.expired
      case "urgent":
        return data.urgent
      case "near":
        return data.near
      case "medium":
        return data.medium
      default:
        return []
    }
  }

  const activeList = getActiveList()

  const tabsConfig = [
    { id: "expired", label: "Expired", count: counts.expired, color: "text-red-600 border-red-200 bg-red-50" },
    { id: "urgent", label: "< 30 Days", count: counts.urgent, color: "text-red-500 border-red-100 bg-red-50/50" },
    { id: "near", label: "31-90 Days", count: counts.near, color: "text-amber-600 border-amber-200 bg-amber-50" },
    { id: "medium", label: "91-180 Days", count: counts.medium, color: "text-blue-600 border-blue-200 bg-blue-50" },
  ] as const

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Expiry Management</h1>
        <p className="text-sm text-slate-500 font-medium">
          Identify and quarantine expired or near-expiry batches. Safe-selling FEFO rules are enforced automatically.
        </p>
      </div>

      {/* KPI Counters */}
      <div className="grid gap-4 md:grid-cols-4">
        {tabsConfig.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col text-left p-4 border rounded-xl shadow-sm transition-all cursor-pointer ${
              activeTab === tab.id
                ? "ring-2 ring-primary border-transparent bg-white"
                : "bg-slate-50 hover:bg-slate-100/70 border-slate-200"
            }`}
          >
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{tab.label}</span>
            <div className="flex items-baseline justify-between mt-2 w-full">
              <span className={`text-3xl font-black ${tab.id === "expired" ? "text-red-600" : "text-slate-800"}`}>
                {tab.count}
              </span>
              <Badge className={`text-[9px] font-bold uppercase tracking-wider ${tab.color}`}>
                {tab.id === "expired" ? "Unsellable" : "FEFO Active"}
              </Badge>
            </div>
          </button>
        ))}
      </div>

      {/* Expiry Details Table Card */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-bold text-slate-900">
              {activeTab === "expired" && "Expired Stock (Quarantined)"}
              {activeTab === "urgent" && "Urgent Expiries (Less than 30 Days)"}
              {activeTab === "near" && "Near Expiry Batches (31-90 Days)"}
              {activeTab === "medium" && "Medium Range Expiries (91-180 Days)"}
            </CardTitle>
            <CardDescription className="text-slate-500">
              {activeTab === "expired" && "These batches are expired and blocked from sales transactions."}
              {activeTab === "urgent" && "High risk of expiring soon. Sell these first or check return agreements."}
              {activeTab === "near" && "FEFO queue priority. Keep these in active rotation."}
              {activeTab === "medium" && "Safe inventory window but monitoring is recommended."}
            </CardDescription>
          </div>
          {activeTab === "expired" && counts.expired > 0 && (
            <Link href="/inventory/adjustments">
              <Button variant="destructive" size="sm" className="font-semibold text-xs gap-1.5 cursor-pointer">
                <Trash2 className="h-3.5 w-3.5" />
                Dispose Expired Inventory
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {activeList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2 p-6">
              <Layers className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-semibold">No batches found in this category</p>
              <p className="text-xs text-slate-400">All active stock batches are safe and in compliance.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Product Name</th>
                    <th className="px-6 py-3">Batch Number</th>
                    <th className="px-6 py-3">Expiry Date</th>
                    <th className="px-6 py-3">Stock Value (Cost)</th>
                    <th className="px-6 py-3">Supplier</th>
                    <th className="px-6 py-3 text-center">Days remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {activeList.map((batch) => {
                    const valuation = batch.available_quantity * batch.unit_cost
                    const isExpired = batch.days_remaining <= 0
                    return (
                      <tr key={batch.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <Link href={`/products/${batch.product.id}`} className="hover:underline flex flex-col">
                            <span className="font-bold text-slate-800">{batch.product.name}</span>
                            <span className="text-xs text-slate-400 font-mono">
                              SKU: {batch.product.sku || "—"}
                            </span>
                          </Link>
                        </td>

                        <td className="px-6 py-4 font-bold text-slate-700">{batch.batch_number}</td>

                        <td className="px-6 py-4 text-slate-600 font-semibold flex items-center gap-1.5 py-6">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {batch.expiry_date}
                        </td>

                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">
                            Rs. {valuation.toLocaleString()}
                          </div>
                          <span className="text-xs text-slate-400 font-semibold">
                            {batch.available_quantity} {batch.product.unit?.abbreviation || "vials"} @ Rs. {batch.unit_cost.toLocaleString()}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-slate-600 font-medium">
                          {batch.supplier?.name || "—"}
                        </td>

                        <td className="px-6 py-4 text-center">
                          {isExpired ? (
                            <Badge variant="destructive" className="font-bold text-[9px] uppercase tracking-wider px-2">
                              EXPIRED ({Math.abs(batch.days_remaining)}d ago)
                            </Badge>
                          ) : (
                            <Badge
                              variant={batch.days_remaining <= 30 ? "destructive" : batch.days_remaining <= 90 ? "warning" : "info"}
                              className="font-bold text-[9px] uppercase tracking-wider px-2"
                            >
                              {batch.days_remaining} Days
                            </Badge>
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
    </div>
  )
}
