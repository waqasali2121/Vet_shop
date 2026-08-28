import { z } from "zod"

export const expenseSchema = z.object({
  category_id: z.string().uuid("Please select a valid expense category"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than zero"),
  payment_method: z.enum(['CASH', 'EASYPAISA', 'JAZZCASH', 'BANK_TRANSFER', 'CARD', 'OTHER']).default('CASH'),
  description: z.string().optional().nullable().or(z.literal("")),
  expense_date: z.string().min(1, "Expense date is required"),
})

export type ExpenseFormValues = z.infer<typeof expenseSchema>

export const openRegisterSchema = z.object({
  opening_cash: z.coerce.number().min(0, "Opening cash cannot be negative"),
  notes: z.string().optional().nullable().or(z.literal("")),
})

export type OpenRegisterFormValues = z.infer<typeof openRegisterSchema>

export const closeRegisterSchema = z.object({
  actual_closing_cash: z.coerce.number().min(0, "Closing cash cannot be negative"),
  notes: z.string().optional().nullable().or(z.literal("")),
})

export type CloseRegisterFormValues = z.infer<typeof closeRegisterSchema>
