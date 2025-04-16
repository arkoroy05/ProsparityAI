"use client"
import Image from "next/image"
import { ArrowRight, Box, Check, ChevronRight, Lock, Search, Settings, Sparkles } from "lucide-react"
import { HoverBorderGradient } from "@/components/ui/hover-border"
import AnimatedGradientText from "@/components/ui/gradient-text"
import { TextEffect } from "@/components/motion-primitives/text-effect"
import SlideArrowButton from "@/components/getStarted"
import { useRouter } from "next/navigation"
import { GlowingEffect } from "@/components/glowCards"

export default function Home() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-purple-600 rounded-md p-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L20 7V17L12 22L4 17V7L12 2Z" fill="white" />
            </svg>
          </div>
          <span className="text-xl font-bold">Prosparity.AI</span>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="hover:text-purple-400 transition-colors">
            Features
          </a>
          <a href="#testimonials" className="hover:text-purple-400 transition-colors">
            Testimonials
          </a>
          <a href="#pricing" className="hover:text-purple-400 transition-colors">
            Pricing
          </a>
          <a href="#contact" className="hover:text-purple-400 transition-colors">
            Contact
          </a>
        </nav>
        <div className="flex items-center gap-4">
          <button className="px-4 py-2 text-sm hover:text-purple-400 transition-colors">Log in</button>
          <button className="px-4 py-2 text-sm bg-purple-600 rounded-md hover:bg-purple-700 transition-colors">
            Sign up free
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-centerpx-4 py-1 mb-6">
        <HoverBorderGradient
         containerClassName="rounded-full"
         as="button"
         className="dark:bg-black bg-white text-black dark:text-white flex items-center space-x-2">
          <AnimatedGradientText className="text-sm">
            see whats new in v1.1
          </AnimatedGradientText>
        </HoverBorderGradient>
        </div>
        <TextEffect preset='fade-in-blur' speedReveal={1.1} speedSegment={0.3} as="h1" className="text-5xl md:text-8xl font-bold mb-6">
          Supercharged
        </TextEffect>
        <TextEffect per='char' preset='fade' as="h1" className="text-5xl md:text-8xl font-bold mb-6">
        Sales experience
        </TextEffect>
        <p className="text-gray-400 max-w-2xl mx-auto mb-10">
        Prosparity.AI combines advanced GenAI technologies to not only automate outreach but also intelligently classify, strengthen, and convert leads with unprecedented efficiency.
        </p>
        
        <SlideArrowButton
        primaryColor="#000"
        text="Get Started"
        onClick={() => router.push('/dashboard')}
        />

        {/* Dashboard Preview */}
        <div className="mt-16 relative">
          <div className="rounded-lg p-10 shadow-xl ">
            <Image
              src="/sample.png"
              alt="App Screenshot"
              className="rounded-md"
              layout="responsive"
              width={5200}     
              height={1800}  
              objectFit="cover"
            />
          </div>
        </div>
      </section>

      {/* Features Section - Now using the new component */}
      <FeaturesSection />

      {/* Automation Section */}
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

      {/* Testimonials Section */}
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

        <div className="flex justify-center gap-8 flex-wrap">
          <div className="bg-gray-800 p-4 rounded-md">
            <div className="w-16 h-8 bg-gray-700"></div>
          </div>
          <div className="bg-gray-800 p-4 rounded-md">
            <div className="w-16 h-8 bg-gray-700"></div>
          </div>
          <div className="bg-gray-800 p-4 rounded-md">
            <div className="w-16 h-8 bg-gray-700"></div>
          </div>
          <div className="bg-gray-800 p-4 rounded-md">
            <div className="w-16 h-8 bg-gray-700"></div>
          </div>
          <div className="bg-gray-800 p-4 rounded-md">
            <div className="w-16 h-8 bg-gray-700"></div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-3xl py-16 px-4">
          <div className="mx-auto mb-8">
            <div className="bg-purple-600 rounded-md p-3 inline-block">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L20 7V17L12 22L4 17V7L12 2Z" fill="white" />
              </svg>
            </div>
          </div>
          <h2 className="text-4xl font-bold mb-8">Start with Prosparity.AI, today.</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <button className="bg-purple-600 hover:bg-purple-700 text-white rounded-md px-6 py-3 flex items-center gap-2 transition-colors">
              Sign up for free <ArrowRight className="w-4 h-4" />
            </button>
            <button className="bg-white text-gray-900 rounded-md px-6 py-3 flex items-center gap-2 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 9.5L12 17L22 9.5L12 2Z" fill="currentColor" />
                <path
                  d="M2 14.5L12 22L22 14.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Get the app
            </button>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-800 rounded-md flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold">1</span>
            </div>
            <h3 className="font-semibold mb-2">Log in with your Prosparity.AI account</h3>
            <p className="text-gray-400 text-sm">Quick and secure authentication</p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-gray-800 rounded-md flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold">2</span>
            </div>
            <h3 className="font-semibold mb-2">Install our AI assistant app</h3>
            <p className="text-gray-400 text-sm">and import your existing leads</p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-gray-800 rounded-md flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold">3</span>
            </div>
            <h3 className="font-semibold mb-2">Browse your leads</h3>
            <p className="text-gray-400 text-sm">and start working on conversions</p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-gray-800 rounded-md flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold">4</span>
            </div>
            <h3 className="font-semibold mb-2">Work in real-time with your team</h3>
            <p className="text-gray-400 text-sm">on your sales projects</p>
          </div>
        </div>
      </section>
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