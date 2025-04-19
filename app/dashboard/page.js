"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import AiInstructions from "@/components/dashboard/AiInstructions"
import { Calendar, Users, FileText, BarChart3, ArrowRight, Download, Search, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TextShimmer } from "@/components/ui/text-shimmer"

export default function DashboardPage() {
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(true)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [companyId, setCompanyId] = useState(null)
  const [company, setCompany] = useState(null)
  const [dateRange, setDateRange] = useState("Jan 20, 2023 - Feb 09, 2023")
  const [activeTab, setActiveTab] = useState("overview")
  
  useEffect(() => {
    // Get current session
    const getSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          await getCompanyId(session.user.id)
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error("Error getting session:", error)
        setLoading(false)
      }
    }

    getSession()
  }, [])

  const getCompanyId = async (userId) => {
    try {
      const { data: companies, error } = await supabase.from("companies").select("*").eq("owner_id", userId).limit(1)
        
        if (error) throw error
        
      if (companies && companies.length > 0) {
        setCompanyId(companies[0].id)
        setCompany(companies[0])
      }

      setLoading(false)
      } catch (error) {
      console.error("Error getting company:", error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (!user || !companyId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <h2 className="text-xl font-semibold">Please log in to view this page</h2>
        <Button variant="default" asChild>
          <a href="/auth/login">Go to Login</a>
        </Button>
      </div>
    )
  }
  
  return (
    <div className="bg-black text-white min-h-screen relative">
      {/* Add a subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20 pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto relative">
        {/* Header with glowing text effect */}
        <div className="flex justify-between items-center mb-8">
          <TextShimmer
            duration={1.4}
            className="text-6xl font-extralight bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent"
          >
            Welcome back, {user?.email?.split("@")[0] || "User"}
          </TextShimmer>
          <div className="flex items-center gap-4">
            <div className="relative">
              
            </div>
            <div className="flex items-center gap-2 bg-gray-900 px-4 py-2 rounded-md">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-300">{dateRange}</span>
            </div>
          
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="bg-gray-900 border-gray-800">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              Reports
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            {/* Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="bg-gray-900/50 border-gray-800 shadow-lg hover:shadow-purple-500/10 transition-all">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-400">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$45,231.89</div>
                  <p className="text-xs text-green-500 mt-1">+20.1% from last month</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-800 shadow-lg hover:shadow-pink-500/10 transition-all">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-400">Subscriptions</CardTitle>
                  <Users className="h-4 w-4 text-pink-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+2,350</div>
                  <p className="text-xs text-green-500 mt-1">+180.1% from last month</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-800 shadow-lg hover:shadow-purple-500/10 transition-all">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-400">Sales</CardTitle>
                  <FileText className="h-4 w-4 text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+12,234</div>
                  <p className="text-xs text-green-500 mt-1">+19% from last month</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-800 shadow-lg hover:shadow-pink-500/10 transition-all">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-400">Active Now</CardTitle>
                  <Users className="h-4 w-4 text-pink-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+573</div>
                  <p className="text-xs text-green-500 mt-1">+201 since last hour</p>
                </CardContent>
              </Card>
            </div>

            {/* AI Instructions Section */}
            <Card className="bg-gray-900/50 border-gray-800 shadow-lg hover:shadow-purple-500/10 transition-all mb-8">
              <CardHeader>
                <CardTitle className="text-xl font-semibold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                  AI Agent Instructions
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Customize how your AI sales agent interacts with leads
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AiInstructions companyId={companyId} />
              </CardContent>
            </Card>

            {/* Quick Links */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gray-900/50 border-gray-800 shadow-lg hover:shadow-purple-500/10 transition-all group">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium flex items-center">
                      <Users className="h-5 w-5 mr-2 text-purple-500" />
                      Manage Leads
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400">View, add, or import new leads for your business.</p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="link" className="text-purple-500 p-0 group-hover:text-purple-400" asChild>
                      <a href="/dashboard/leads" className="flex items-center">
                        Go to Leads <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </a>
                    </Button>
                  </CardFooter>
                </Card>

                <Card className="bg-gray-900/50 border-gray-800 shadow-lg hover:shadow-pink-500/10 transition-all group">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-pink-500" />
                      View Tasks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400">Check your pending tasks and follow-ups.</p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="link" className="text-pink-500 p-0 group-hover:text-pink-400" asChild>
                      <a href="/dashboard/tasks" className="flex items-center">
                        Go to Tasks <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </a>
                    </Button>
                  </CardFooter>
                </Card>

                <Card className="bg-gray-900/50 border-gray-800 shadow-lg hover:shadow-purple-500/10 transition-all group">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-purple-500" />
                      Sales Scripts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400">Create and customize your sales scripts.</p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="link" className="text-purple-500 p-0 group-hover:text-purple-400" asChild>
                      <a href="/dashboard/sales-scripts" className="flex items-center">
                        View Scripts <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </a>
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="analytics" className="mt-6">
            <div className="text-gray-400">Analytics content here</div>
          </TabsContent>
          
          <TabsContent value="reports" className="mt-6">
            <div className="text-gray-400">Reports content here</div>
          </TabsContent>
          
          <TabsContent value="notifications" className="mt-6">
            <div className="text-gray-400">Notifications content here</div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 
