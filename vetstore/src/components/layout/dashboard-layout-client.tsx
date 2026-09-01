"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

interface DashboardLayoutClientProps {
  children: React.ReactNode
  userEmail: string
  userRole: string
}

export function DashboardLayoutClient({
  children,
  userEmail,
  userRole,
}: DashboardLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const pathname = usePathname()
  const isPosPage = pathname === "/pos"
  const isSalesDetailPage = pathname.startsWith("/sales/") && pathname.split("/").length === 3

  // Main container styles based on current route
  let mainClasses = "flex-1 bg-slate-50 flex flex-col min-h-0"
  if (isPosPage) {
    mainClasses += " p-3 overflow-hidden"
  } else {
    mainClasses += " p-4 md:p-6 overflow-y-auto"
  }

  // Inner wrapper styles based on current route
  let innerClasses = "flex-1 flex flex-col min-h-0"
  if (isPosPage) {
    innerClasses += " w-full max-w-none h-full space-y-3"
  } else if (isSalesDetailPage) {
    innerClasses += " w-full max-w-none space-y-6"
  } else {
    innerClasses += " max-w-7xl mx-auto space-y-6"
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      {/* Desktop Sidebar (visible on md+) */}
      <Sidebar className="hidden md:flex shrink-0" />

      {/* Mobile Sidebar Slide-over */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar content */}
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-secondary focus:outline-none animate-in slide-in-from-left duration-200">
            <Sidebar onCloseMobile={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header
          onToggleSidebar={toggleSidebar}
          userEmail={userEmail}
          userRole={userRole}
          registerSession={null} // Will hook up to real cash sessions in Phase 9
        />
        <main className={mainClasses}>
          <div className={innerClasses}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
