"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function DashboardPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user is authenticated
        const { data } = await supabase.auth.getSession()
        
        if (!data.session) {
          // Not authenticated, redirect to login
          router.replace("/auth/login")
          return
        }
        
        // Check if user has a company
        const { data: companies, error } = await supabase
          .from('companies')
          .select('id')
          .eq('owner_id', data.session.user.id)
          .limit(1)
        
        if (error) throw error
        
        if (!companies || companies.length === 0) {
          // User doesn't have a company, redirect to company registration
          router.replace("/auth/register-company")
          return
        }
        
        // User has a company, redirect to the dashboard in pages directory
        // This is temporary until the app directory implementation is complete
        router.replace("/dashboard")
      } catch (error) {
        console.error("Dashboard auth check error:", error)
        router.replace("/auth/login")
      } finally {
        setIsLoading(false)
      }
    }
    
    checkAuth()
  }, [router])
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-4">
          {isLoading ? "Loading Dashboard..." : "Redirecting..."}
        </h1>
        <div className="w-16 h-16 border-t-4 border-purple-500 border-solid rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  )
} 