"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const router = useRouter()
  
  // This is a temporary redirect to the existing dashboard page
  // Once the app directory implementation is complete, this can be replaced with actual dashboard content
  useEffect(() => {
    router.push("/dashboard")
  }, [router])
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Loading Dashboard...</h1>
        <div className="w-16 h-16 border-t-4 border-purple-500 border-solid rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  )
} 