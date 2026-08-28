import * as React from "react"
import { getSaleReturns } from "@/lib/actions/returns"
import { checkActiveRegisterSession } from "@/lib/actions/sales"
import { SalesReturnClient } from "@/components/sales/sales-return-client"

export default async function SalesReturnsPage() {
  const [returnsRes, sessionRes] = await Promise.all([
    getSaleReturns(),
    checkActiveRegisterSession(),
  ])

  const pastReturns = returnsRes.data || []
  const activeSession = sessionRes.data || null

  return (
    <SalesReturnClient
      pastReturns={pastReturns as any}
      activeSession={activeSession as any}
    />
  )
}
