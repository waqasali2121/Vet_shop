"use client"

import * as React from "react"
import { useActionState } from "react"
import Link from "next/link"
import { login } from "../auth-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldCheck, Loader2 } from "lucide-react"

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null)

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Salman Farsy Vet Store
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            Point of Sale & Inventory Management
          </p>
        </div>

        <Card className="border-slate-200/80 shadow-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-bold text-slate-900">Sign in</CardTitle>
            <CardDescription className="text-slate-500">
              Enter your credentials to access your cash register
            </CardDescription>
          </CardHeader>
          <form action={formAction}>
            <CardContent className="grid gap-4">
              {state?.error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20">
                  {state.error}
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-slate-700">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  autoComplete="email"
                  disabled={isPending}
                  className="border-slate-300 focus:border-primary focus:ring-primary"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-700">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
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
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
              <div className="text-center text-xs text-slate-400 font-medium">
                Authorized Personnel Only. Actions are logged.
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
