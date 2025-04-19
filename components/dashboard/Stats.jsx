"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Phone, CheckCircle, BarChart3 } from "lucide-react"

export default function Stats({ companyId }) {
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeConversations: 0,
    convertedLeads: 0,
    conversionRate: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      if (!companyId) return

      try {
        // Fetch total leads
        const { data: leads, error: leadsError } = await supabase
          .from("leads")
          .select("id, status")
          .eq("company_id", companyId)

        if (leadsError) throw leadsError

        const totalLeads = leads?.length || 0
        const convertedLeads = leads?.filter((lead) => lead.status === "converted")?.length || 0
        const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0

        // Fetch active conversations
        const { data: conversations, error: convoError } = await supabase
          .from("conversations")
          .select("id")
          .eq("company_id", companyId)
          .eq("status", "active")

        if (convoError) throw convoError

        setStats({
          totalLeads,
          activeConversations: conversations?.length || 0,
          convertedLeads,
          conversionRate: conversionRate.toFixed(1),
        })

        setLoading(false)
      } catch (error) {
        console.error("Error fetching stats:", error)
        setLoading(false)
      }
    }

    fetchStats()
  }, [companyId])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-gray-900 border-gray-800 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-6 bg-gray-800 rounded animate-pulse w-20"></div>
              <div className="h-4 bg-gray-800 rounded animate-pulse w-32 mt-2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const statItems = [
    {
      title: "Total Leads",
      value: stats.totalLeads,
      change: "+12.5% from last month",
      icon: <Users className="h-4 w-4 text-gray-400" />,
    },
    {
      title: "Active Conversations",
      value: stats.activeConversations,
      change: "+7.2% from last week",
      icon: <Phone className="h-4 w-4 text-gray-400" />,
    },
    {
      title: "Converted Leads",
      value: stats.convertedLeads,
      change: "+22.5% from last month",
      icon: <CheckCircle className="h-4 w-4 text-gray-400" />,
    },
    {
      title: "Conversion Rate",
      value: `${stats.conversionRate}%`,
      change: "+4.3% from last month",
      icon: <BarChart3 className="h-4 w-4 text-gray-400" />,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statItems.map((item, index) => (
        <Card key={index} className="bg-gray-900 border-gray-800 shadow-lg">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-400">{item.title}</CardTitle>
            {item.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{item.value}</div>
            <p className="text-xs text-green-500 mt-1">{item.change}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
