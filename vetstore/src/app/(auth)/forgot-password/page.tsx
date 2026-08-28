"use client"

import * as React from "react"
import { useActionState } from "react"
import Link from "next/link"
import { forgotPassword } from "../auth-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldAlert, Loader2, ArrowLeft } from "lucide-react"

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(forgotPassword, null)

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Salman Farsy Vet Store
          </h1>
        </div>

        <Card className="border-slate-200/80 shadow-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-bold text-slate-900">Reset Password</CardTitle>
            <CardDescription className="text-slate-500">
              Enter your email and we'll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <form action={formAction}>
            <CardContent className="grid gap-4">
              {state?.error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20">
                  {state.error}
                </div>
              )}
              {state?.success && (
                <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 font-medium border border-emerald-200">
                  {state.message}
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-slate-700">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  disabled={isPending}
                  className="border-slate-300 focus:border-primary focus:ring-primary"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full font-semibold" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending link...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
              <Link
                href="/login"
                className="flex items-center text-xs font-semibold text-slate-500 hover:text-primary transition-colors"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Back to sign in
              </Link>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
