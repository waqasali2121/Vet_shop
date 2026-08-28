import * as React from "react"
import { getExpenses, getExpenseCategories, getActiveCashSession } from "@/lib/actions/expenses"
import { ExpenseListClient } from "@/components/expenses/expense-list-client"

export default async function ExpensesPage() {
  // Concurrent DB queries
  const [expensesRes, categoriesRes, sessionRes] = await Promise.all([
    getExpenses(),
    getExpenseCategories(),
    getActiveCashSession(),
  ])

  const expenses = expensesRes.data || []
  const categories = categoriesRes.data || []
  const activeSession = sessionRes.data || null

  return (
    <ExpenseListClient
      expenses={expenses as any}
      categories={categories}
      activeSession={activeSession as any}
    />
  )
}
