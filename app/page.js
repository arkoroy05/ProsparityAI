"use client"
import Image from "next/image"
import { ArrowRight, Box, Check, ChevronRight, Lock, Search, Settings, Sparkles } from "lucide-react"
import { HeroGeometric } from "@/components/ui/shape-landing-hero"
import { GlowingEffect } from "@/components/glowCards"
import { HeroSection } from "@/components/hero-section-dark"
import { NavBar } from "@/components/ui/tubelight-navbar"
import { Home, User, Briefcase, FileText } from 'lucide-react'

export default function Landing() {
  const navItems = [
    { name: 'Home', url: '#home', icon: Home },
    { name: 'Features', url: '#features', icon: User },
    { name: 'Testimonials', url: '#testimonials', icon: Briefcase },
  ]
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <NavBar items={navItems} />

      {/* Hero Section with ID for navigation */}
      <section id="home">
        <HeroSection
        title="see whats new in v1.1"
        subtitle={{
          regular: "Supercharge your sales ",
          gradient: "with Prosparity AI",
        }}
        description="  Prosparity.AI combines advanced GenAI technologies to not only automate outreach but also intelligently classify, strengthen, and convert leads with unprecedented efficiency."
        ctaText="Get Started"
        ctaHref="/signup"
        bottomImage={{
          light: "https://www.launchuicomponents.com/app-light.png",
          dark: "https://www.launchuicomponents.com/app-dark.png",
        }}
        gridOptions={{
          angle: 65,
          opacity: 0.4,
          cellSize: 50,
          lightLineColor: "#4a4a4a",
          darkLineColor: "#2a2a2a",
        }}
      />
      </section>

      {/* Features Section - Now using the new component with ID for navigation */}
      <FeaturesSection />

      <section className="container mx-auto px-4 py-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <Image
            src="/placeholder.svg?height=400&width=500"
            alt="Prosparity.AI Automation"
            width={500}
            height={400}
            className="rounded-lg shadow-xl"
          />
        </div>
        <div>
          <h2 className="text-4xl font-bold mb-6">Powerful automation</h2>
          <p className="text-gray-400 mb-6">
            Prosparity.AI will save you time by smartly automating your workflow on lead generation, follow-ups, and
            conversion tracking with AI-powered insights.
          </p>
          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3">
              <div className="bg-purple-600/20 rounded-full p-1 mt-0.5">
                <Check className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium">Automated Cold Calling</h4>
                <p className="text-gray-400 text-sm">AI agents that make initial contact and qualify leads</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-purple-600/20 rounded-full p-1 mt-0.5">
                <Check className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium">Smart Lead Scoring</h4>
                <p className="text-gray-400 text-sm">Automatically prioritize leads based on conversion potential</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-purple-600/20 rounded-full p-1 mt-0.5">
                <Check className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium">Personalized Follow-ups</h4>
                <p className="text-gray-400 text-sm">AI-generated personalized messages for each prospect</p>
              </div>
            </div>
          </div>
          <a href="#" className="text-purple-400 flex items-center group">
            Learn more <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </section>

      {/* Testimonials Section with ID for navigation */}
      <section id="testimonials" className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-16">Trusted by sales professionals</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="bg-gray-800 rounded-lg p-6 relative">
            <p className="italic mb-6">
              Prosparity.AI is my top recommendation for managing the flood of sales leads. It feels like a sales
              superpower and I cant recommend it highly enough.
            </p>
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-gray-700 mr-4"></div>
              <div>
                <div className="font-semibold">Sarah Johnson</div>
                <div className="text-sm text-gray-400">Sales Director at TechCorp</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 relative">
            <p className="italic mb-6">
              I want to give a big shout-out to the team for making a product that simplifies my teams life in sales.
              My favorite feature is the AI follow-up suggestions that have increased our conversion rate by 35%.
            </p>
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-gray-700 mr-4"></div>
              <div>
                <div className="font-semibold">Michael Chen</div>
                <div className="text-sm text-gray-400">VP of Sales at GrowthX</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-16 mb-16">
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">500+</div>
            <div className="text-gray-400">Companies</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">10k+</div>
            <div className="text-gray-400">Sales Agents</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">1M+</div>
            <div className="text-gray-400">Leads Converted</div>
          </div>
        </div>

       
      </section>

      {/* CTA Section */}
      <HeroGeometric 
            title1 = "Prosparity.AI" />

      {/* Footer Section */}
<footer className="container mx-auto px-4 py-16 border-t border-gray-800">
  <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-sm text-gray-400">
    <div>
      <h4 className="text-white font-semibold mb-4">Prosparity.AI</h4>
      <p>
        AI-powered sales automation to help you close deals faster and smarter.
      </p>
    </div>
    <div>
      <h4 className="text-white font-semibold mb-4">Company</h4>
      <ul className="space-y-2">
        <li><a href="#" className="hover:text-white transition-colors">About</a></li>
        <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
        <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
      </ul>
    </div>
    <div>
      <h4 className="text-white font-semibold mb-4">Product</h4>
      <ul className="space-y-2">
        <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
        <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
        <li><a href="#" className="hover:text-white transition-colors">Docs</a></li>
      </ul>
    </div>
    <div>
      <h4 className="text-white font-semibold mb-4">Legal</h4>
      <ul className="space-y-2">
        <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
        <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
      </ul>
    </div>
  </div>
</footer>

{/* Bottom Bar */}
<div className="text-center text-gray-600 text-xs py-4 border-t border-gray-800">
  © {new Date().getFullYear()} Prosparity.AI — All rights reserved.
</div>

    </div>
  );
}

export function FeaturesSection() {
  return (
    <section id="features" className="container mx-auto px-4 py-20">
      <h2 className="text-4xl font-bold text-center mb-16">Breeze through sales at light speed</h2>
      <GlowingEffectDemo />
    </section>
  );
}

// Add the GlowingEffectDemo component definition here
export function GlowingEffectDemo() {
  return (
    <ul className="grid grid-cols-1 grid-rows-none gap-4 md:grid-cols-12 md:grid-rows-3 lg:gap-4 xl:max-h-[34rem] xl:grid-rows-2">
      <GridItem
        area="md:[grid-area:1/1/2/7] xl:[grid-area:1/1/2/5]"
        icon={<Box className="h-4 w-4 text-black dark:text-neutral-400" />}
        title="AI-Powered Lead Management"
        description="Manage your leads in a real-time AI system with intelligent classification and prioritization."
      />
      <GridItem
        area="md:[grid-area:1/7/2/13] xl:[grid-area:2/1/3/5]"
        icon={<Settings className="h-4 w-4 text-black dark:text-neutral-400" />}
        title="Intelligent Outreach"
        description="Group leads by industry, potential value, and engagement level for laser-focused outreach."
      />
      <GridItem
        area="md:[grid-area:2/1/3/7] xl:[grid-area:1/5/3/8]"
        icon={<Lock className="h-4 w-4 text-black dark:text-neutral-400" />}
        title="Data Privacy & Security"
        description="Enterprise-grade encryption keeps your customer data safe and sound. Always."
      />
      <GridItem
        area="md:[grid-area:2/7/3/13] xl:[grid-area:1/8/2/13]"
        icon={<Sparkles className="h-4 w-4 text-black dark:text-neutral-400" />}
        title="Conversion Timeline"
        description="See progress at a glance and get AI-suggested next steps in your sales journey."
      />
      <GridItem
        area="md:[grid-area:3/1/4/13] xl:[grid-area:2/8/3/13]"
        icon={<Search className="h-4 w-4 text-black dark:text-neutral-400" />}
        title="Smart CRM Integration"
        description="Integrate seamlessly with your tools. Say goodbye to context switching forever."
      />
    </ul>
  );
}

// Add the GridItem component definition here
const GridItem = ({ area, icon, title, description }) => {
  return (
    <li className={`min-h-[14rem] list-none ${area}`}>
      <div className="relative h-full rounded-2xl border p-2 md:rounded-3xl md:p-3">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
        />
        <div className="border-0.75 relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl p-6 md:p-6 dark:shadow-[0px_0px_27px_0px_#2D2D2D]">
          <div className="relative flex flex-1 flex-col justify-between gap-3">
            <div className="w-fit rounded-lg border border-gray-600 p-2">
              {icon}
            </div>
            <div className="space-y-3">
              <h3 className="-tracking-4 pt-0.5 font-sans text-xl/[1.375rem] font-semibold text-balance text-black md:text-2xl/[1.875rem] dark:text-white">
                {title}
              </h3>
              <h2 className="font-sans text-sm/[1.125rem] text-black md:text-base/[1.375rem] dark:text-neutral-400 [&_b]:md:font-semibold [&_strong]:md:font-semibold">
                {description}
              </h2>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};