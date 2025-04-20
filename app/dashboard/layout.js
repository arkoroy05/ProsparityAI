"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Home, Users, Calendar, FileText, Settings, LogOut, Menu, X, Bell, BarChart3, ChevronLeft, ChevronRight } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

const NavItem = ({ href, icon, label, active, collapsed }) => {
  const router = useRouter()

  const handleClick = (e) => {
    e.preventDefault()
    // Force a full window refresh
    window.location.href = href
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 ${
        active ? "text-white bg-purple-700" : "text-gray-300 hover:bg-gray-800 hover:text-white"
      } ${collapsed ? "justify-center" : ""}`}
    >
      <div className={`flex items-center ${collapsed ? "mx-0" : ""}`}>
        {icon}
      </div>
      <span className={`ml-3 transition-all duration-300 ${collapsed ? "hidden" : "inline-block"}`}>
        {label}
      </span>
    </Link>
  )
}

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState(null)
  const [pathname, setPathname] = useState("")

  const checkUserCompany = useCallback(async (userId) => {
    try {
      const { data: companies, error } = await supabase.from("companies").select("id").eq("owner_id", userId).limit(1)

      if (error) throw error

      if (companies && companies.length > 0) {
        // User has a company
        setCompanyId(companies[0].id)
      } else {
        // User doesn't have a company
        setCompanyId(null)
        // Redirect to company registration
        router.push("/auth/register-company")
      }
    } catch (error) {
      console.error("Error checking user company:", error)
    }
  }, [router])

  useEffect(() => {
    // Get current session and set up auth state listener
    const initAuth = async () => {
      try {
        // Check current session
        const {
          data: { session },
        } = await supabase.auth.getSession()
        setUser(session?.user || null)

        // Listen for auth changes
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
          setUser(session?.user || null)

          // Handle sign in
          if (event === "SIGNED_IN" && session) {
            // Check if user has a company
            await checkUserCompany(session.user.id)
          }

          // Handle sign out
          if (event === "SIGNED_OUT") {
            setCompanyId(null)
            // Redirect to home
            router.push("/")
          }
        })

        // If user is logged in, check if they have a company
        if (session?.user) {
          await checkUserCompany(session.user.id)
        }

        setLoading(false)

        return () => {
          authListener.subscription.unsubscribe()
        }
      } catch (error) {
        console.error("Auth initialization error:", error)
        setLoading(false)
      }
    }

    initAuth()
    setPathname(window.location.pathname)
  }, [router, checkUserCompany])

  // Check if user has a company
  // Removed duplicate declaration of checkUserCompany

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const isActive = (path) => {
    // For dashboard home, only highlight when exactly at /dashboard
    if (path === "/dashboard") {
      return pathname === "/dashboard";
    }
    // For other routes, check if we're in that section
    return pathname.startsWith(path) && pathname !== "/dashboard";
  }

  const navigation = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <Home className="w-5 h-5 text-gray-400" />,
    },
    {
      href: "/dashboard/leads",
      label: "Leads",
      icon: <Users className="w-5 h-5 text-gray-400" />,
    },
    {
      href: "/dashboard/tasks",
      label: "Tasks",
      icon: <Calendar className="w-5 h-5 text-gray-400" />,
    },
    {
      href: "/dashboard/sales-scripts",
      label: "Sales Scripts",
      icon: <FileText className="w-5 h-5 text-gray-400" />,
    },
    {
      href: "/insights",
      label: "Insights",
      icon: <BarChart3 className="w-5 h-5 text-gray-400" />,
    },
    {
      href: "/dashboard/settings",
      label: "Settings",
      icon: <Settings className="w-5 h-5 text-gray-400" />,
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (!user || !companyId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Please log in to view this page</h2>
          <Button variant="default" asChild>
            <a href="/auth/login">Go to Login</a>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Mobile menu */}
      <div className="lg:hidden">
        <div className="fixed inset-0 z-40 flex">
          <div
            className={`fixed inset-0 bg-black bg-opacity-75 transition-opacity ease-linear duration-300 ${
              isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <div
            className={`relative flex-1 flex flex-col max-w-xs w-full bg-gray-900 transform transition ease-in-out duration-300 ${
              isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <X className="h-6 w-6 text-white" />
              </button>
            </div>

            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <h1 className="text-xl font-bold text-white">Prosparity.AI</h1>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {navigation.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    active={isActive(item.href)}
                  />
                ))}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-800 p-4">
              <button
                onClick={handleSignOut}
                className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-800 hover:text-white w-full"
              >
                <LogOut className="w-5 h-5 text-gray-400 mr-3" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile nav toggle */}
      <div className="fixed z-10 lg:hidden">
        <button
          type="button"
          className="px-4 py-3 text-gray-400 focus:outline-none"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className={`flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
          <div className="flex flex-col h-0 flex-1 bg-gray-900">
            <div className="flex items-center h-16 flex-shrink-0 px-4 border-b border-gray-800 justify-between">
              <h1 className={`font-bold text-white transition-opacity duration-300 ${isSidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100 text-xl'}`}>
                Prosparity.AI
              </h1>
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800"
              >
                {isSidebarCollapsed ? (
                  <ChevronRight className="h-5 w-5" />
                ) : (
                  <ChevronLeft className="h-5 w-5" />
                )}
              </button>
            </div>
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className={`px-4 mb-6 transition-opacity duration-300 ${isSidebarCollapsed ? 'opacity-0' : 'opacity-100'}`}>
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 rounded-full">
                    <AvatarImage src="/placeholder-user.jpg" alt="User" />
                    <AvatarFallback className="bg-purple-700">
                      {user.email?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`ml-3 transition-opacity duration-300 ${isSidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                    <p className="text-sm font-medium text-white">{user.email?.split("@")[0] || "User"}</p>
                    <p className="text-xs text-gray-400">{user.email || "user@example.com"}</p>
                  </div>
                </div>
              </div>
              <nav className="flex-1 px-2 space-y-1">
                {navigation.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    active={isActive(item.href)}
                    collapsed={isSidebarCollapsed}
                  />
                ))}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-800 p-4">
              <button
                onClick={handleSignOut}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-800 hover:text-white ${isSidebarCollapsed ? 'justify-center' : 'w-full'}`}
              >
                <LogOut className="w-5 h-5 text-gray-400" />
                <span className={`ml-3 transition-opacity duration-300 ${isSidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                  Sign out
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Top navigation bar */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-gray-900 border-b border-gray-800 lg:border-none">
          <div className="flex-1 px-4 flex justify-end">
            <div className="ml-4 flex items-center md:ml-6 space-x-4">
              <button className="p-1 rounded-full text-gray-400 hover:text-white focus:outline-none">
                <span className="sr-only">View notifications</span>
                <Bell className="h-6 w-6" />
              </button>

              <div className="hidden md:block">
                <Avatar className="h-8 w-8 rounded-full">
                  <AvatarImage src="/placeholder-user.jpg" alt="User" />
                  <AvatarFallback className="bg-purple-700">
                    {user.email?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">{children}</main>
      </div>
    </div>
  )
}
