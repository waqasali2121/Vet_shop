import * as React from "react"
import { getActiveCashSession, getCashMovements, getAllRegisterSessions } from "@/lib/actions/expenses"
import { RegisterClient } from "@/components/cash-register/register-client"

export default async function CashRegisterPage() {
  // 1. Get current cashier's active session
  const activeSessionRes = await getActiveCashSession()
  const activeSession = activeSessionRes.data || null

  // 2. Fetch cash movements log if session is active
  let movements: any[] = []
  if (activeSession) {
    const movementsRes = await getCashMovements(activeSession.id)
    movements = movementsRes.data || []
  }

  // 3. Fetch past register sessions (all logs)
  const allSessionsRes = await getAllRegisterSessions()
  const allSessions = allSessionsRes.data || []

  // Filter out active session from historical logs, and split
  const activeSessionId = activeSession?.id
  const pastSessions = allSessions.filter((s: any) => s.id !== activeSessionId)

  return (
    <RegisterClient
      activeSession={activeSession as any}
      movements={movements}
      pastSessions={pastSessions as any}
    />
  )
}
