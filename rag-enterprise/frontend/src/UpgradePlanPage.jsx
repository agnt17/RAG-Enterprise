import { useState } from "react"
import { useNavigate } from "react-router-dom"

const IconArrowLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
)

const IconCheck = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const IconStar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

function PricingCard({ plan, isDark, isPopular, isSelected, onSelect, currentPlan }) {
  const features = {
    free: [
      "Up to 5 documents",
      "10 MB file size limit",
      "Basic AI model",
      "100 questions/month",
      "Email support"
    ],
    basic: [
      "Up to 50 documents",
      "50 MB file size limit",
      "Advanced AI model",
      "1,000 questions/month",
      "Priority email support",
      "Chat history export"
    ],
    pro: [
      "Unlimited documents",
      "100 MB file size limit",
      "Premium AI models",
      "Unlimited questions",
      "24/7 support",
      "Chat history export",
      "Team collaboration",
      "Custom branding"
    ],
    enterprise: [
      "Everything in Pro",
      "Unlimited file size",
      "Dedicated AI capacity",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
      "On-premises option",
      "Advanced security"
    ]
  }

  const prices = {
    free: "Free",
    basic: "$19",
    pro: "$49",
    enterprise: "Custom"
  }

  const titles = {
    free: "Free",
    basic: "Basic",
    pro: "Pro",
    enterprise: "Enterprise"
  }

  const descriptions = {
    free: "For getting started",
    basic: "For personal use",
    pro: "For professionals",
    enterprise: "For large organizations"
  }

  const isCurrentPlan = currentPlan === plan

  return (
    <div 
      onClick={() => onSelect(plan)}
      className={`rounded-2xl border p-8 relative cursor-pointer transition-all ${
        isSelected
          ? isDark
            ? "border-blue-500 ring-2 ring-blue-500/50 bg-gradient-to-br from-blue-900/30 to-purple-900/30"
            : "border-blue-500 ring-2 ring-blue-500/50 bg-gradient-to-br from-blue-50 to-purple-50"
          : isPopular 
            ? isDark 
              ? "border-blue-500 bg-gradient-to-br from-blue-900/20 to-purple-900/20 hover:from-blue-900/30 hover:to-purple-900/30" 
              : "border-blue-400 bg-gradient-to-br from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100"
            : isDark 
              ? "border-gray-800 bg-gray-900 hover:border-gray-700 hover:bg-gray-800" 
              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}>
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <div className={`px-4 py-1.5 rounded-full flex items-center gap-1.5
            ${isDark ? "bg-blue-600" : "bg-blue-600"} text-white text-xs font-bold shadow-lg`}>
            <IconStar />
            <span>POPULAR</span>
          </div>
        </div>
      )}

      <div className="text-center mb-8">
        <h3 className={`text-2xl font-bold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
          {titles[plan]}
        </h3>
        <p className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
          {descriptions[plan]}
        </p>
        <div className="mb-2">
          <span className={`text-4xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
            {prices[plan]}
          </span>
          {plan !== "free" && plan !== "enterprise" && (
            <span className={`text-sm ml-2 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
              / month
            </span>
          )}
        </div>
      </div>

      <button 
        onClick={(e) => {
          e.stopPropagation()
          onSelect(plan)
        }}
        className={`w-full py-3 rounded-lg font-medium mb-8 transition-colors cursor-pointer
        ${isSelected || isCurrentPlan
          ? isDark
            ? "bg-green-600 hover:bg-green-700 text-white"
            : "bg-green-600 hover:bg-green-700 text-white"
          : isPopular
            ? isDark
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
            : isDark
              ? "bg-gray-800 hover:bg-gray-700 text-gray-200"
              : "bg-slate-900 hover:bg-slate-800 text-white"
        }`}>
        {isCurrentPlan
          ? "Current Plan"
          : isSelected
            ? "Selected"
            : plan === "enterprise"
              ? "Contact Sales"
              : "Select"
        }
      </button>

      <div className="space-y-4">
        {features[plan].map((feature, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center
              ${isDark ? "bg-green-900/30 text-green-400" : "bg-green-100 text-green-600"}`}>
              <IconCheck />
            </div>
            <span className={`text-sm ${isDark ? "text-gray-300" : "text-slate-700"}`}>
              {feature}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function UpgradePlanPage({ theme, user }) {
  const navigate = useNavigate()
  const isDark = theme === "dark"

  const currentPlan = user?.plan || "free"
  const [selectedPlan, setSelectedPlan] = useState(currentPlan)

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan)
  }

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-950" : "bg-slate-100"}`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 border-b ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer
              ${isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-slate-100 text-slate-600"}`}
          >
            <IconArrowLeft />
          </button>
          <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
            Upgrade Plan
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <p className={`text-lg mb-4 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
            Choose the right plan for your needs
          </p>
          <p className={`text-sm ${isDark ? "text-gray-500" : "text-slate-500"}`}>
            Current plan:{" "}
            <span className={`font-semibold ${isDark ? "text-blue-400" : "text-blue-600"}`}>
              {currentPlan === "free" 
                ? "Free"
                : currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)
              }
            </span>
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <PricingCard plan="free" isDark={isDark} isPopular={false} isSelected={selectedPlan === "free"} onSelect={handleSelectPlan} currentPlan={currentPlan} />
          <PricingCard plan="basic" isDark={isDark} isPopular={false} isSelected={selectedPlan === "basic"} onSelect={handleSelectPlan} currentPlan={currentPlan} />
          <PricingCard plan="pro" isDark={isDark} isPopular={true} isSelected={selectedPlan === "pro"} onSelect={handleSelectPlan} currentPlan={currentPlan} />
          <PricingCard plan="enterprise" isDark={isDark} isPopular={false} isSelected={selectedPlan === "enterprise"} onSelect={handleSelectPlan} currentPlan={currentPlan} />
        </div>

        {/* FAQ Section */}
        <div className={`rounded-2xl border p-8 ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
          <h2 className={`text-xl font-bold mb-6 ${isDark ? "text-white" : "text-slate-900"}`}>
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className={`font-semibold mb-2 ${isDark ? "text-gray-200" : "text-slate-900"}`}>
                Can I upgrade at any time?
              </h3>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                Yes, you can upgrade your plan at any time. Changes will take effect immediately.
              </p>
            </div>
            <div>
              <h3 className={`font-semibold mb-2 ${isDark ? "text-gray-200" : "text-slate-900"}`}>
                Can I cancel my plan?
              </h3>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                Yes, you can cancel anytime. You'll retain access to services until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className={`font-semibold mb-2 ${isDark ? "text-gray-200" : "text-slate-900"}`}>
                Is there an annual discount?
              </h3>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                Yes, get 20% off when billed annually. Contact sales for details.
              </p>
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className={`mt-8 rounded-2xl border p-8 text-center ${isDark ? "bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-800/30" : "bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200"}`}>
          <h3 className={`text-xl font-bold mb-3 ${isDark ? "text-white" : "text-slate-900"}`}>
            Have questions?
          </h3>
          <p className={`mb-6 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
            Our sales team can help you find the right plan for your needs.
          </p>
          <button className={`px-8 py-3 rounded-lg font-medium transition-colors cursor-pointer
            ${isDark ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
            Contact Sales
          </button>
        </div>
      </div>
    </div>
  )
}
