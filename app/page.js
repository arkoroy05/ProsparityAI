import Image from "next/image"
import { ArrowRight, Check, ChevronRight } from "lucide-react"
import { HoverBorderGradient } from "@/components/ui/hover-border"
import  AnimatedGradientText  from "@/components/ui/gradient-text"
import { TextEffect } from "@/components/motion-primitives/text-effect"

export default function Home() {
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
        <button className="bg-gray-800 hover:bg-gray-700 text-white rounded-md px-6 py-3 flex items-center gap-2 mx-auto transition-colors">
          Continue with Prosparity.AI
        </button>

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

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-16">Breeze through sales at light speed</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-start">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-gray-800 mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M4 6H20M4 12H20M4 18H20"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">AI-Powered Lead Management</h3>
            <p className="text-gray-400 mb-4">
              Manage your leads in a real-time automated AI system with intelligent classification and prioritization.
            </p>
            <a href="#" className="text-purple-400 flex items-center group">
              Learn more <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>

          <div className="flex flex-col items-start">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-gray-800 mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M9 7H7V17H9V7Z" fill="white" />
                <path d="M17 7H15V17H17V7Z" fill="white" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Intelligent Outreach</h3>
            <p className="text-gray-400 mb-4">
              Browse your leads and group them by industry, potential value, and engagement level for targeted outreach.
            </p>
            <a href="#" className="text-purple-400 flex items-center group">
              Learn more <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>

          <div className="flex flex-col items-start">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-gray-800 mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Conversion Timeline</h3>
            <p className="text-gray-400 mb-4">
              Plan your sales strategy by scheduling follow-ups and see the progress in a timeline with AI-suggested
              next steps.
            </p>
            <a href="#" className="text-purple-400 flex items-center group">
              Learn more <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </section>

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

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center border-b border-gray-800 pb-8 mb-8">
            <div className="flex items-center gap-2">
              <div className="bg-purple-600 rounded-md p-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L20 7V17L12 22L4 17V7L12 2Z" fill="white" />
                </svg>
              </div>
              <span className="text-xl font-bold">Prosparity.AI</span>
            </div>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-white">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M23 3.01006C22.0424 3.68553 20.9821 4.20217 19.86 4.54006C19.2577 3.84757 18.4573 3.35675 17.567 3.13398C16.6767 2.91122 15.7395 2.96725 14.8821 3.29451C14.0247 3.62177 13.2884 4.20446 12.773 4.96377C12.2575 5.72309 11.9877 6.62239 12 7.54006V8.54006C10.2426 8.58562 8.50127 8.19587 6.93101 7.4055C5.36074 6.61513 4.01032 5.44869 3 4.01006C3 4.01006 -1 13.0101 8 17.0101C5.94053 18.408 3.48716 19.109 1 19.0101C10 24.0101 21 19.0101 21 7.51006C20.9991 7.23151 20.9723 6.95365 20.92 6.68006C21.9406 5.67355 22.6608 4.40277 23 3.01006Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M16 8C17.5913 8 19.1174 8.63214 20.2426 9.75736C21.3679 10.8826 22 12.4087 22 14V21H18V14C18 13.4696 17.7893 12.9609 17.4142 12.5858C17.0391 12.2107 16.5304 12 16 12C15.4696 12 14.9609 12.2107 14.5858 12.5858C14.2107 12.9609 14 13.4696 14 14V21H10V14C10 12.4087 10.6321 10.8826 11.7574 9.75736C12.8826 8.63214 14.4087 8 16 8Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6 9H2V21H6V9Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 6C5.10457 6 6 5.10457 6 4C6 2.89543 5.10457 2 4 2C2.89543 2 2 2.89543 2 4C2 5.10457 2.89543 6 4 6Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 12H22"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-400 hover:text-white text-sm">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white text-sm">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white text-sm">
                    API
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white text-sm">
                    Integrations
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-400 hover:text-white text-sm">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white text-sm">
                    Guides
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white text-sm">
                    Support
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white text-sm">
                    API Status
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-400 hover:text-white text-sm">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white text-sm">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white text-sm">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white text-sm">
                    Press
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-400 hover:text-white text-sm">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white text-sm">
                    Terms
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white text-sm">
                    Security
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white text-sm">
                    Cookies
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="text-center text-gray-400 text-sm">
            <p>© 2025 Prosparity.AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
