import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import axios from "axios"
import { toast } from "./Toast"
import { ButtonLoader } from "./Loader"

const API = (
  import.meta.env.PROD
    ? import.meta.env.VITE_API_URL
    : (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000")
)?.replace(/\/$/, "")

// Icons
const IconCheck = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const IconChevronRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

const IconChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

const IconStar = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

const IconDocument = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
)

const IconMessage = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

const IconBulb = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
  </svg>
)

const IconRocket = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
)

const IconBuilding = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <path d="M9 22v-4h6v4" />
    <path d="M8 6h.01" />
    <path d="M16 6h.01" />
    <path d="M12 6h.01" />
    <path d="M12 10h.01" />
    <path d="M12 14h.01" />
    <path d="M16 10h.01" />
    <path d="M16 14h.01" />
    <path d="M8 10h.01" />
    <path d="M8 14h.01" />
  </svg>
)

const IconScale = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
    <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
    <path d="M7 21h10" />
    <path d="M12 3v18" />
    <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
  </svg>
)

const IconCalculator = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <line x1="8" y1="6" x2="16" y2="6" />
    <line x1="16" y1="14" x2="16" y2="18" />
    <line x1="8" y1="11" x2="8" y2="11.01" />
    <line x1="12" y1="11" x2="12" y2="11.01" />
    <line x1="16" y1="11" x2="16" y2="11.01" />
    <line x1="8" y1="15" x2="8" y2="15.01" />
    <line x1="12" y1="15" x2="12" y2="15.01" />
  </svg>
)

// Plan features based on tier
const planFeatures = {
  basic: [
    { icon: IconDocument, title: "50 Documents", desc: "Upload and analyze up to 50 PDF documents" },
    { icon: IconMessage, title: "1,000 Questions/Month", desc: "Ask up to 1,000 questions per month" },
    { icon: IconBulb, title: "Advanced AI", desc: "Access to advanced AI models for better answers" },
    { icon: IconRocket, title: "Priority Support", desc: "Priority email support with faster responses" }
  ],
  pro: [
    { icon: IconDocument, title: "Unlimited Documents", desc: "Upload and analyze unlimited PDF documents" },
    { icon: IconMessage, title: "Unlimited Questions", desc: "Ask unlimited questions without monthly limits" },
    { icon: IconBulb, title: "Premium AI Models", desc: "Access to our most advanced AI models" },
    { icon: IconRocket, title: "24/7 Support", desc: "Round-the-clock priority support" },
    { icon: IconStar, title: "Team Collaboration", desc: "Invite team members to collaborate" },
    { icon: IconBuilding, title: "Custom Branding", desc: "Add your firm's branding to exports" }
  ]
}

// Prompting tips for different professions
const promptingTips = {
  law_firm: {
    basic: [
      {
        title: "Be Specific with Legal Terms",
        desc: "Use precise legal terminology when asking questions. Instead of 'What does this say about liability?', ask 'What are the specific indemnification clauses and limitation of liability provisions in this agreement?'",
        example: "\"What are the force majeure provisions and their triggering conditions in this contract?\""
      },
      {
        title: "Reference Sections",
        desc: "When your document has numbered sections, reference them directly for precise answers.",
        example: "\"Summarize the obligations under Section 5.2(a) regarding confidentiality of client information.\""
      },
      {
        title: "Ask for Comparisons",
        desc: "When reviewing multiple clauses, ask DocMind to compare them for consistency.",
        example: "\"Compare the termination rights in Section 8 with the breach remedies in Section 10. Are they consistent?\""
      },
      {
        title: "Indian Law Context",
        desc: "Mention relevant Indian statutes or regulations when seeking interpretation.",
        example: "\"How does this arbitration clause align with the Arbitration and Conciliation Act, 1996?\""
      }
    ],
    pro: [
      {
        title: "Multi-Document Analysis",
        desc: "With unlimited documents, cross-reference multiple agreements for comprehensive review.",
        example: "\"Compare the non-compete clauses across all employment agreements uploaded. Identify inconsistencies with the current Indian Competition Act guidelines.\""
      },
      {
        title: "Due Diligence Queries",
        desc: "Use structured queries for M&A due diligence reviews.",
        example: "\"List all change of control provisions, assignment restrictions, and consent requirements in this agreement that would be triggered by an acquisition.\""
      },
      {
        title: "Compliance Checklist",
        desc: "Generate compliance checklists against regulatory requirements.",
        example: "\"Review this loan agreement against RBI guidelines for NBFCs. List any provisions that may require modification for compliance.\""
      },
      {
        title: "Risk Assessment",
        desc: "Ask for risk-weighted analysis of contractual obligations.",
        example: "\"Identify high-risk clauses in this vendor agreement, particularly those related to data protection under the DPDP Act and unlimited liability exposure.\""
      },
      {
        title: "Precedent Research",
        desc: "Use documents as precedents for drafting new agreements.",
        example: "\"Based on this template, draft key modifications needed for a technology licensing agreement with an Indian subsidiary.\""
      }
    ]
  },
  ca_firm: {
    basic: [
      {
        title: "Financial Data Extraction",
        desc: "Be precise when asking for numerical data from financial statements.",
        example: "\"Extract all revenue recognition policies mentioned in this annual report, including timing and measurement criteria.\""
      },
      {
        title: "Compliance Queries",
        desc: "Ask specific questions about statutory compliance requirements.",
        example: "\"What are the GST implications mentioned for inter-state transactions in this tax audit report?\""
      },
      {
        title: "Comparative Analysis",
        desc: "Compare figures across periods or categories.",
        example: "\"Compare the depreciation methods used in FY 2022-23 vs FY 2023-24 as per this schedule.\""
      },
      {
        title: "Ind AS References",
        desc: "Reference specific accounting standards for precise answers.",
        example: "\"How has this company applied Ind AS 116 for lease accounting as per this report?\""
      }
    ],
    pro: [
      {
        title: "Multi-Year Analysis",
        desc: "Analyze trends across multiple annual reports.",
        example: "\"Analyze the trend in working capital ratios across the last 3 annual reports. Identify any concerning patterns.\""
      },
      {
        title: "Audit Planning",
        desc: "Use documents to plan audit procedures.",
        example: "\"Based on this trial balance and previous audit report, identify high-risk areas requiring substantive testing.\""
      },
      {
        title: "Tax Optimization",
        desc: "Identify tax planning opportunities from financial documents.",
        example: "\"Review this P&L statement and identify potential tax-saving opportunities under Section 80 provisions that haven't been utilized.\""
      },
      {
        title: "Regulatory Compliance",
        desc: "Cross-check compliance across multiple regulations.",
        example: "\"Review this company's financial statements for compliance with Schedule III of Companies Act, SEBI requirements, and Ind AS simultaneously.\""
      },
      {
        title: "Due Diligence Support",
        desc: "Comprehensive financial due diligence queries.",
        example: "\"From this target company's financials, identify all related party transactions, contingent liabilities, and off-balance sheet items that need investigation.\""
      }
    ]
  },
  other: {
    basic: [
      {
        title: "Clear and Specific Questions",
        desc: "Be specific about what information you're looking for in your documents.",
        example: "\"What are the key deliverables and timelines mentioned in this project proposal?\""
      },
      {
        title: "Summarization",
        desc: "Ask for summaries of long documents to quickly understand the content.",
        example: "\"Provide a bullet-point summary of the main points in this 50-page report.\""
      },
      {
        title: "Data Extraction",
        desc: "Extract specific data points from your documents.",
        example: "\"List all dates, amounts, and parties mentioned in this agreement.\""
      },
      {
        title: "Q&A Format",
        desc: "Structure your queries as specific questions for better answers.",
        example: "\"What are the cancellation terms and associated penalties in this service contract?\""
      }
    ],
    pro: [
      {
        title: "Cross-Document Analysis",
        desc: "Compare and analyze information across multiple documents.",
        example: "\"Compare the terms of these three vendor proposals and create a comparison table highlighting key differences.\""
      },
      {
        title: "Trend Analysis",
        desc: "Identify patterns and trends in your documents.",
        example: "\"Analyze the monthly sales reports from the past year and identify seasonal trends.\""
      },
      {
        title: "Action Items",
        desc: "Extract actionable insights from your documents.",
        example: "\"From this meeting minutes, list all action items, owners, and deadlines in a table format.\""
      },
      {
        title: "Comprehensive Reports",
        desc: "Generate detailed analysis reports from your documents.",
        example: "\"Create a comprehensive analysis of this market research report, highlighting opportunities and risks.\""
      },
      {
        title: "Custom Templates",
        desc: "Use your documents as templates for creating new content.",
        example: "\"Based on this approved proposal template, outline what sections need to be modified for a new client.\""
      }
    ]
  }
}

export default function PremiumWelcomePage({ theme, user: initialUser }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = localStorage.getItem("token")
  const isDark = theme === "dark"

  const [user, setUser] = useState(initialUser)
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedProfession, setSelectedProfession] = useState(initialUser?.profession || null)
  const [saving, setSaving] = useState(false)

  const plan = searchParams.get("plan") || user?.plan || "basic"
  const planName = plan.charAt(0).toUpperCase() + plan.slice(1)

  // Fetch latest user data
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) return
      try {
        const res = await axios.get(`${API}/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setUser(res.data)
        if (res.data.profession) {
          setSelectedProfession(res.data.profession)
        }
      } catch (err) {
        console.error("Failed to fetch user:", err)
      }
    }
    fetchUser()
  }, [token])

  const totalSteps = 4 // Welcome, Features, Profession Selection, Prompting Tips

  const handleSaveProfession = async () => {
    if (!selectedProfession) {
      toast.info("Please select your profession type")
      return
    }
    
    setSaving(true)
    try {
      await axios.put(
        `${API}/profile/details`,
        { profession: selectedProfession },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success("Preferences saved!")
      setCurrentStep(3) // Move to tips step
    } catch (err) {
      toast.error("Failed to save preference")
    } finally {
      setSaving(false)
    }
  }

  const handleFinish = () => {
    toast.success("Welcome to DocMind Premium!")
    navigate("/")
  }

  const features = planFeatures[plan] || planFeatures.basic
  const tips = promptingTips[selectedProfession || "other"]?.[plan] || promptingTips.other.basic

  // Step components
  const renderWelcomeStep = () => (
    <div className="text-center py-8">
      <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center
        ${isDark ? "bg-gradient-to-br from-yellow-500 to-orange-500" : "bg-gradient-to-br from-yellow-400 to-orange-400"}`}>
        <IconStar />
        <span className="text-white text-2xl">✨</span>
      </div>
      
      <h1 className={`text-4xl font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>
        Welcome to {planName}! 🎉
      </h1>
      
      <p className={`text-lg mb-8 max-w-xl mx-auto ${isDark ? "text-gray-400" : "text-slate-600"}`}>
        Thank you for upgrading to the {planName} plan. You now have access to powerful features 
        that will transform how you work with documents.
      </p>

      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full
        ${isDark ? "bg-green-900/30 text-green-400" : "bg-green-100 text-green-700"}`}>
        <IconCheck />
        <span className="font-medium">Payment Successful</span>
      </div>
    </div>
  )

  const renderFeaturesStep = () => (
    <div className="py-6">
      <h2 className={`text-2xl font-bold text-center mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
        Your {planName} Features
      </h2>
      <p className={`text-center mb-8 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
        Here's what you now have access to
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {features.map((feature, index) => (
          <div
            key={index}
            className={`p-5 rounded-xl border transition-all
              ${isDark 
                ? "border-gray-800 bg-gray-900/50 hover:border-gray-700" 
                : "border-slate-200 bg-white hover:border-slate-300"}`}
          >
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4
              ${isDark ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-600"}`}>
              <feature.icon />
            </div>
            <h3 className={`font-semibold mb-1 ${isDark ? "text-white" : "text-slate-900"}`}>
              {feature.title}
            </h3>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>
              {feature.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  )

  const renderProfessionStep = () => (
    <div className="py-6">
      <h2 className={`text-2xl font-bold text-center mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
        Tell Us About Your Work
      </h2>
      <p className={`text-center mb-8 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
        We'll personalize your experience with tips relevant to your profession
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
        <button
          onClick={() => setSelectedProfession("law_firm")}
          className={`p-6 rounded-xl border-2 transition-all text-left cursor-pointer
            ${selectedProfession === "law_firm"
              ? isDark
                ? "border-blue-500 bg-blue-900/20"
                : "border-blue-500 bg-blue-50"
              : isDark
                ? "border-gray-800 bg-gray-900/50 hover:border-gray-700"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
        >
          <div className={`w-14 h-14 rounded-lg flex items-center justify-center mb-4
            ${selectedProfession === "law_firm"
              ? isDark ? "bg-blue-900/50 text-blue-400" : "bg-blue-100 text-blue-600"
              : isDark ? "bg-gray-800 text-gray-400" : "bg-slate-100 text-slate-600"
            }`}>
            <IconScale />
          </div>
          <h3 className={`font-semibold mb-1 ${isDark ? "text-white" : "text-slate-900"}`}>
            Law Firm
          </h3>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>
            Legal documents, contracts, agreements
          </p>
        </button>

        <button
          onClick={() => setSelectedProfession("ca_firm")}
          className={`p-6 rounded-xl border-2 transition-all text-left cursor-pointer
            ${selectedProfession === "ca_firm"
              ? isDark
                ? "border-blue-500 bg-blue-900/20"
                : "border-blue-500 bg-blue-50"
              : isDark
                ? "border-gray-800 bg-gray-900/50 hover:border-gray-700"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
        >
          <div className={`w-14 h-14 rounded-lg flex items-center justify-center mb-4
            ${selectedProfession === "ca_firm"
              ? isDark ? "bg-blue-900/50 text-blue-400" : "bg-blue-100 text-blue-600"
              : isDark ? "bg-gray-800 text-gray-400" : "bg-slate-100 text-slate-600"
            }`}>
            <IconCalculator />
          </div>
          <h3 className={`font-semibold mb-1 ${isDark ? "text-white" : "text-slate-900"}`}>
            CA Firm
          </h3>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>
            Financial statements, tax documents
          </p>
        </button>

        <button
          onClick={() => setSelectedProfession("other")}
          className={`p-6 rounded-xl border-2 transition-all text-left cursor-pointer
            ${selectedProfession === "other"
              ? isDark
                ? "border-blue-500 bg-blue-900/20"
                : "border-blue-500 bg-blue-50"
              : isDark
                ? "border-gray-800 bg-gray-900/50 hover:border-gray-700"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
        >
          <div className={`w-14 h-14 rounded-lg flex items-center justify-center mb-4
            ${selectedProfession === "other"
              ? isDark ? "bg-blue-900/50 text-blue-400" : "bg-blue-100 text-blue-600"
              : isDark ? "bg-gray-800 text-gray-400" : "bg-slate-100 text-slate-600"
            }`}>
            <IconBuilding />
          </div>
          <h3 className={`font-semibold mb-1 ${isDark ? "text-white" : "text-slate-900"}`}>
            Other Business
          </h3>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>
            General documents, reports, proposals
          </p>
        </button>
      </div>
    </div>
  )

  const renderTipsStep = () => (
    <div className="py-6">
      <h2 className={`text-2xl font-bold text-center mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
        Prompting Tips for {selectedProfession === "law_firm" ? "Legal" : selectedProfession === "ca_firm" ? "Finance" : "Business"} Documents
      </h2>
      <p className={`text-center mb-8 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
        Master these techniques to get the most out of DocMind
      </p>

      <div className="space-y-4 max-w-3xl mx-auto">
        {tips.map((tip, index) => (
          <div
            key={index}
            className={`p-5 rounded-xl border transition-all
              ${isDark 
                ? "border-gray-800 bg-gray-900/50" 
                : "border-slate-200 bg-white"}`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold
                ${isDark ? "bg-purple-900/50 text-purple-400" : "bg-purple-100 text-purple-600"}`}>
                {index + 1}
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
                  {tip.title}
                </h3>
                <p className={`text-sm mb-3 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                  {tip.desc}
                </p>
                <div className={`p-3 rounded-lg text-sm font-mono
                  ${isDark ? "bg-gray-800 text-green-400" : "bg-slate-100 text-green-700"}`}>
                  💡 {tip.example}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const steps = [
    { render: renderWelcomeStep },
    { render: renderFeaturesStep },
    { render: renderProfessionStep },
    { render: renderTipsStep }
  ]

  return (
    <div className="min-h-screen">
      {/* Progress bar */}
      <div className={`sticky top-0 z-10 border-b ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>
              Step {currentStep + 1} of {totalSteps}
            </span>
            <button
              onClick={handleFinish}
              className={`text-sm hover:underline cursor-pointer ${isDark ? "text-gray-400" : "text-slate-600"}`}
            >
              Skip to Dashboard
            </button>
          </div>
          <div className={`h-2 rounded-full ${isDark ? "bg-gray-800" : "bg-slate-200"}`}>
            <div
              className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {steps[currentStep].render()}
      </div>

      {/* Navigation */}
      <div className={`sticky bottom-0 border-t ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors cursor-pointer
              ${currentStep === 0
                ? isDark ? "text-gray-600 cursor-not-allowed" : "text-slate-400 cursor-not-allowed"
                : isDark ? "text-gray-300 hover:bg-gray-800" : "text-slate-700 hover:bg-slate-100"
              }`}
          >
            <IconChevronLeft />
            <span>Back</span>
          </button>

          {currentStep === 2 ? (
            // Save profession button
            <button
              onClick={handleSaveProfession}
              disabled={!selectedProfession || saving}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors cursor-pointer
                ${!selectedProfession || saving
                  ? isDark ? "bg-gray-800 text-gray-500 cursor-not-allowed" : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
            >
              {saving ? <ButtonLoader /> : (
                <>
                  <span>Continue</span>
                  <IconChevronRight />
                </>
              )}
            </button>
          ) : currentStep === totalSteps - 1 ? (
            // Finish button
            <button
              onClick={handleFinish}
              className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-colors cursor-pointer"
            >
              <span>Start Using DocMind</span>
              <IconRocket />
            </button>
          ) : (
            // Next button
            <button
              onClick={() => setCurrentStep(Math.min(totalSteps - 1, currentStep + 1))}
              className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
            >
              <span>Next</span>
              <IconChevronRight />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
