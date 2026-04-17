import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { toast } from "./Toast"
import { ButtonLoader } from "./Loader"

const API = (
  import.meta.env.PROD
    ? import.meta.env.VITE_API_URL
    : (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000")
)?.replace(/\/$/, "")

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

const IconClose = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const IconInfo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
)

const IconShield = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

const IconTag = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
)

const IconMinus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

// Plan hierarchy for comparison
const PLAN_LEVELS = { free: 0, basic: 1, pro: 2, enterprise: 3 }

function PricingCard({ plan, isDark, isPopular, isSelected, onSelect, currentPlan, currentBillingCycle, billingCycle, isDisabled }) {
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

  const monthlyPrices = {
    free: 0,
    basic: 999,
    pro: 2999,
    enterprise: null
  }

  const yearlyPrices = {
    free: 0,
    basic: 9999,
    pro: 24999,  // Updated to ₹24,999/year for Pro
    enterprise: null
  }

  const titles = {
    free: "Free",
    basic: "Basic",
    pro: "Pro",
    enterprise: "Enterprise"
  }

  const descriptions = {
    free: "For getting started",
    basic: "For small law/CA firms",
    pro: "For growing practices",
    enterprise: "For large organizations"
  }

  // isCurrentPlan should be true only if BOTH plan AND billing cycle match
  const isCurrentPlan = currentPlan === plan && currentBillingCycle === billingCycle
  const price = billingCycle === "yearly" ? yearlyPrices[plan] : monthlyPrices[plan]
  const monthlyEquivalent = billingCycle === "yearly" && price ? Math.round(price / 12) : null
  
  // Calculate savings percentage for yearly
  const yearlySavings = billingCycle === "yearly" && monthlyPrices[plan] ? 
    Math.round((1 - yearlyPrices[plan] / (monthlyPrices[plan] * 12)) * 100) : 0

  const handleClick = () => {
    if (!isDisabled && !isCurrentPlan) {
      onSelect(plan)
    }
  }

  return (
    <div 
      onClick={handleClick}
      className={`rounded-2xl border p-6 sm:p-8 relative transition-all ${
        isDisabled
          ? isDark
            ? "border-white/[0.06] bg-white/[0.03] opacity-60 cursor-not-allowed"
            : "border-slate-200/40 bg-white/30 opacity-60 cursor-not-allowed"
          : isSelected
            ? isDark
              ? "border-blue-500 ring-2 ring-blue-500/50 bg-gradient-to-br from-blue-900/30 to-purple-900/30 cursor-pointer"
              : "border-blue-500 ring-2 ring-blue-500/50 bg-gradient-to-br from-blue-50 to-purple-50 cursor-pointer"
            : isPopular 
              ? isDark 
                ? "border-blue-500 bg-gradient-to-br from-blue-900/20 to-purple-900/20 hover:from-blue-900/30 hover:to-purple-900/30 cursor-pointer" 
                : "border-blue-400 bg-gradient-to-br from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 cursor-pointer"
              : isDark
                ? "border-white/[0.08] bg-white/[0.04] hover:border-white/[0.14] hover:bg-white/[0.07] backdrop-blur-xl cursor-pointer"
                : "border-slate-200/50 bg-white/70 hover:border-slate-300/70 hover:bg-white/85 backdrop-blur-xl cursor-pointer"
      }`}>
      {isPopular && !isDisabled && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <div className={`px-4 py-1.5 rounded-full flex items-center gap-1.5
            ${isDark ? "bg-blue-600" : "bg-blue-600"} text-white text-xs font-bold shadow-lg`}>
            <IconStar />
            <span>BEST VALUE</span>
          </div>
        </div>
      )}
      
      {billingCycle === "yearly" && yearlySavings > 0 && !isDisabled && (
        <div className="absolute -top-4 right-4">
          <div className="px-3 py-1 rounded-full bg-green-500 text-white text-xs font-bold shadow-lg">
            Save {yearlySavings}%
          </div>
        </div>
      )}

      <div className="text-center mb-8">
        <h3 className={`text-xl sm:text-2xl font-bold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
          {titles[plan]}
        </h3>
        <p className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
          {descriptions[plan]}
        </p>
        <div className="mb-2">
          {price !== null ? (
            <>
              <span className={`text-3xl sm:text-4xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                ₹{price.toLocaleString('en-IN')}
              </span>
              {plan !== "free" && (
                <span className={`text-sm ml-2 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                  / {billingCycle === "yearly" ? "year" : "month"}
                </span>
              )}
            </>
          ) : (
            <span className={`text-3xl sm:text-4xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
              Custom
            </span>
          )}
        </div>
        {monthlyEquivalent && plan !== "free" && (
          <p className={`text-xs ${isDark ? "text-gray-500" : "text-slate-500"}`}>
            ₹{monthlyEquivalent.toLocaleString('en-IN')}/month billed annually
          </p>
        )}
      </div>

      <button 
        onClick={(e) => {
          e.stopPropagation()
          handleClick()
        }}
        disabled={isDisabled || isCurrentPlan}
        className={`w-full py-3 rounded-lg font-medium mb-8 transition-colors
        ${isDisabled
          ? isDark
            ? "bg-white/[0.06] text-[#9ca3af] cursor-not-allowed"
            : "bg-slate-200/60 text-slate-400 cursor-not-allowed"
          : isCurrentPlan
            ? isDark
              ? "bg-green-600 text-white cursor-default"
              : "bg-green-600 text-white cursor-default"
            : isSelected
              ? isDark
                ? "bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                : "bg-green-600 hover:bg-green-700 text-white cursor-pointer"
              : isPopular
                ? isDark
                  ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                  : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                : isDark
                  ? "bg-white/[0.1] hover:bg-white/[0.15] text-[#f5f5f7] cursor-pointer"
                  : "bg-slate-800/90 hover:bg-slate-900 text-white cursor-pointer"
        }`}>
        {isCurrentPlan
          ? "Current Plan"
          : isDisabled
            ? "Not Available"
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
              ${isDisabled 
                ? isDark ? "bg-white/[0.06] text-[#9ca3af]" : "bg-slate-200/60 text-slate-400"
                : isDark ? "bg-green-900/30 text-green-400" : "bg-green-100 text-green-600"
              }`}>
              <IconCheck />
            </div>
            <span className={`text-sm ${
              isDisabled
                ? isDark ? "text-gray-500" : "text-slate-400"
                : isDark ? "text-gray-300" : "text-slate-700"
            }`}>
              {feature}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Price Breakdown Modal Component
function PriceBreakdownModal({ isOpen, onClose, breakdown, selectedPlan, billingCycle, isDark, onConfirm, processing, user, couponDiscount }) {
  if (!isOpen || !breakdown) return null

  const formatPrice = (amount) => `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  
  const hasCredit = breakdown.credit > 0
  const hasCoupon = couponDiscount && couponDiscount.discount_value > 0
  const currentPlanName = user?.plan ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1) : "Free"
  const newPlanName = selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)
  
  // Calculate coupon discount based on SUBTOTAL (after credit), not base price
  // This matches backend logic in /payment/create-order
  let couponAmount = 0
  if (hasCoupon) {
    if (couponDiscount.discount_type === "percentage") {
      couponAmount = Math.round(breakdown.subtotal * (couponDiscount.discount_value / 100) * 100) / 100
    } else {
      couponAmount = Math.min(couponDiscount.discount_value, breakdown.subtotal)
    }
  }
  const adjustedSubtotal = Math.max(0, breakdown.subtotal - couponAmount)
  const adjustedGst = adjustedSubtotal * (breakdown.gst_rate / 100)
  const adjustedTotal = adjustedSubtotal + adjustedGst
  
  // Determine if this is an upgrade, switch, or billing change
  const currentLevel = PLAN_LEVELS[user?.plan || "free"]
  const newLevel = PLAN_LEVELS[selectedPlan]
  const isLowerTier = newLevel < currentLevel
  const isSamePlan = selectedPlan === user?.plan
  
  const actionLabel = isLowerTier ? "Switching to" : isSamePlan ? "Changing to" : "Upgrading to"
  const fromLabel = isLowerTier ? "Switching from" : isSamePlan ? "Current plan" : "Upgrading from"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${
        isDark ? "bg-black/80 backdrop-blur-2xl border border-white/[0.1]" : "bg-white/90 backdrop-blur-2xl border border-white/90"
      }`}>
        {/* Header */}
        <div className={`px-4 sm:px-6 py-4 border-b ${isDark ? "border-white/[0.08]" : "border-slate-200/60"}`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
              Payment Summary
            </h2>
            <button 
              onClick={onClose}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer
                ${isDark ? "hover:bg-white/[0.08] text-[#86868b]" : "hover:bg-white/60 text-slate-500"}`}
            >
              <IconClose />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="px-4 sm:px-6 py-5">
          {/* Plan Change Summary */}
          <div className={`rounded-xl p-4 mb-5 ${isDark ? "bg-white/[0.04]" : "bg-white/50"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                {fromLabel}
              </span>
              <span className={`font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                {currentPlanName} {user?.billing_cycle ? `(${user.billing_cycle})` : ""}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-sm ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                {actionLabel}
              </span>
              <span className={`font-semibold ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                {newPlanName} ({billingCycle})
              </span>
            </div>
            {/* Plan Duration & Expiry */}
            {breakdown.new_plan_days && breakdown.new_plan_expires_at && (
              <div className={`mt-3 pt-3 border-t ${isDark ? "border-white/[0.08]" : "border-slate-200/60"}`}>
                <div className="flex items-center justify-between text-sm">
                  <span className={isDark ? "text-gray-400" : "text-slate-500"}>
                    Plan duration
                  </span>
                  <span className={`font-medium ${isDark ? "text-green-400" : "text-green-600"}`}>
                    {breakdown.new_plan_days} days
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className={isDark ? "text-gray-400" : "text-slate-500"}>
                    Active until
                  </span>
                  <span className={`font-medium ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                    {new Date(breakdown.new_plan_expires_at).toLocaleDateString('en-IN', { 
                      day: 'numeric', 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Price Breakdown */}
          <div className="space-y-3 mb-5">
            {/* Base Price */}
            <div className="flex items-center justify-between">
              <span className={isDark ? "text-gray-300" : "text-slate-700"}>
                {newPlanName} Plan ({billingCycle})
              </span>
              <span className={`font-medium ${isDark ? "text-white" : "text-slate-900"}`}>
                {formatPrice(breakdown.base_price)}
              </span>
            </div>
            
            {/* Credit (if applicable) */}
            {hasCredit && (
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <span className="text-green-500">Credit from current plan</span>
                  <div className="group relative">
                    <IconInfo />
                    <div className={`absolute left-0 bottom-full mb-2 w-48 p-2 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 ${
                      isDark ? "bg-white/[0.12] text-[#f5f5f7]" : "bg-slate-800 text-white"
                    }`}>
                      {breakdown.days_remaining} days remaining ({breakdown.credit_percentage}% of your {currentPlanName} plan)
                    </div>
                  </div>
                </div>
                <span className="font-medium text-green-500">
                  -{formatPrice(breakdown.credit)}
                </span>
              </div>
            )}
            
            {/* Coupon Discount (if applicable) */}
            {hasCoupon && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-purple-500">🎟️ Coupon: {couponDiscount.code}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    isDark ? "bg-purple-900/50 text-purple-300" : "bg-purple-100 text-purple-700"
                  }`}>
                    {couponDiscount.discount_type === "percentage" 
                      ? `${couponDiscount.discount_value}% OFF` 
                      : `₹${couponDiscount.discount_value} OFF`}
                  </span>
                </div>
                <span className="font-medium text-purple-500">
                  -{formatPrice(couponAmount)}
                </span>
              </div>
            )}
            
            {/* Divider */}
            <div className={`border-t ${isDark ? "border-white/[0.08]" : "border-slate-200/60"}`} />
            
            {/* Subtotal */}
            <div className="flex items-center justify-between">
              <span className={isDark ? "text-gray-300" : "text-slate-700"}>
                Subtotal
              </span>
              <span className={`font-medium ${isDark ? "text-white" : "text-slate-900"}`}>
                {formatPrice(hasCoupon ? adjustedSubtotal : breakdown.subtotal)}
              </span>
            </div>
            
            {/* GST */}
            <div className="flex items-center justify-between">
              <span className={isDark ? "text-gray-400" : "text-slate-500"}>
                GST ({breakdown.gst_rate}%)
              </span>
              <span className={isDark ? "text-gray-300" : "text-slate-700"}>
                {formatPrice(hasCoupon ? adjustedGst : breakdown.gst)}
              </span>
            </div>
            
            {/* Divider */}
            <div className={`border-t-2 ${isDark ? "border-white/[0.1]" : "border-slate-300/60"}`} />
            
            {/* Total */}
            <div className="flex items-center justify-between">
              <span className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                Total
              </span>
              <div className="text-right">
                {hasCoupon && (
                  <span className={`text-sm line-through mr-2 ${isDark ? "text-gray-500" : "text-slate-400"}`}>
                    {formatPrice(breakdown.total)}
                  </span>
                )}
                <span className={`text-2xl font-bold ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                  {formatPrice(hasCoupon ? adjustedTotal : breakdown.total)}
                </span>
              </div>
            </div>
            
            {/* Savings callout */}
            {(hasCredit || hasCoupon) && (
              <div className={`flex items-center justify-center gap-2 mt-2 py-2 rounded-lg ${
                isDark ? "bg-green-900/20 text-green-400" : "bg-green-50 text-green-600"
              }`}>
                <span>🎉</span>
                <span className="text-sm font-medium">
                  You're saving {formatPrice((hasCredit ? breakdown.credit : 0) + couponAmount)}!
                </span>
              </div>
            )}
          </div>
          
          {/* Info about credit */}
          {hasCredit && (
            <div className={`flex items-start gap-2 p-3 rounded-lg mb-5 ${
              isDark ? "bg-green-900/20 border border-green-800" : "bg-green-50 border border-green-200"
            }`}>
              <div className="text-green-500 mt-0.5">
                <IconInfo />
              </div>
              <p className={`text-sm ${isDark ? "text-green-300" : "text-green-700"}`}>
                You're getting ₹{breakdown.credit.toLocaleString('en-IN')} credit for the unused portion of your current plan!
              </p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className={`px-4 sm:px-6 py-4 border-t ${isDark ? "border-white/[0.08] bg-white/[0.04]" : "border-slate-100/80 bg-white/40"}`}>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onClose}
              className={`flex-1 py-3 rounded-xl font-medium transition-colors cursor-pointer
                ${isDark 
                  ? "bg-white/[0.1] hover:bg-white/[0.15] text-[#f5f5f7]"
                  : "bg-white/60 hover:bg-white/80 text-slate-700"
                }`}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={processing}
              className="flex-1 py-3 rounded-xl font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? <ButtonLoader text="Processing..." /> : "Proceed to Pay"}
            </button>
          </div>
          <p className={`text-xs text-center mt-3 ${isDark ? "text-gray-500" : "text-slate-400"}`}>
            Secured by Razorpay • 256-bit SSL encryption
          </p>
        </div>
      </div>
    </div>
  )
}

export default function UpgradePlanPage({ resolvedTheme = "dark", user }) {
  const navigate = useNavigate()
  const isDark = resolvedTheme === "dark"
  const token = localStorage.getItem("token")

  const currentPlan = user?.plan || "free"
  const currentBillingCycle = user?.billing_cycle || "monthly"
  const currentPlanLevel = PLAN_LEVELS[currentPlan] || 0
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [billingCycle, setBillingCycle] = useState("monthly")
  const [processing, setProcessing] = useState(false)
  const [showBreakdownModal, setShowBreakdownModal] = useState(false)
  const [breakdown, setBreakdown] = useState(null)
  const [fetchingBreakdown, setFetchingBreakdown] = useState(false)
  
  // Coupon state
  const [couponCode, setCouponCode] = useState("")
  const [couponDiscount, setCouponDiscount] = useState(null)
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  
  // Usage stats
  const [usageStats, setUsageStats] = useState(null)
  
  // Fetch usage stats on mount
  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const res = await axios.get(`${API}/usage`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setUsageStats(res.data)
      } catch (err) {
        // Silently fail - usage stats are optional
      }
    }
    if (token) fetchUsage()
  }, [token])
  
  // Validate coupon
  const [couponError, setCouponError] = useState(null)
  
  const validateCoupon = async () => {
    if (!couponCode.trim() || !selectedPlan) return
    
    setValidatingCoupon(true)
    setCouponError(null)
    try {
      const res = await axios.post(
        `${API}/coupon/validate`,
        { code: couponCode.trim(), plan: selectedPlan, billing_cycle: billingCycle },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setCouponDiscount(res.data)
      toast.success(res.data.message)
    } catch (err) {
      setCouponDiscount(null)
      const errorMsg = err.response?.data?.detail || "Uh oh... something went wrong. Try again!"
      setCouponError(errorMsg)
    } finally {
      setValidatingCoupon(false)
    }
  }
  
  // Clear coupon when plan/cycle changes
  useEffect(() => {
    setCouponDiscount(null)
    setCouponError(null)
  }, [selectedPlan, billingCycle])

  // Determine if a plan card should be disabled
  // BUSINESS LOGIC (thinking like engineer + businessman):
  // 
  // Key insight: We want to maximize revenue, not allow downgrades that require refunds.
  //
  // Rules:
  // 1. Free: disabled if user has any paid plan
  // 2. Same plan + same cycle: disabled (no change)
  // 3. Higher tier: ALWAYS enabled (upgrade = more money)
  // 4. Same tier, monthly → yearly: enabled (guaranteed yearly revenue)
  // 5. Same tier, yearly → monthly: disabled (downgrade)
  // 6. Lower tier:
  //    - If user is on YEARLY: DISABLED (they already committed yearly at higher tier, 
  //      showing lower yearly would require refund - bad for business)
  //    - If user is on MONTHLY: allow YEARLY only (yearly commitment of lower tier 
  //      still gives us guaranteed revenue vs uncertain monthly renewals)
  //    - Lower tier + monthly: always disabled (pure downgrade)
  //
  // Examples:
  // - Pro Yearly user: Can only see Enterprise (nothing else makes business sense)
  // - Pro Monthly user: Can see Pro Yearly ✓, Basic Yearly ✓ (yearly commitment)
  // - Basic Yearly user: Can see Pro Monthly ✓, Pro Yearly ✓
  // - Basic Monthly user: Can see Basic Yearly ✓, Pro Monthly ✓, Pro Yearly ✓
  
  const isPlanDisabled = (plan) => {
    if (plan === "free") {
      // Free is always disabled if user has any paid plan
      return currentPlanLevel > 0
    }
    
    if (plan === "enterprise") {
      // Enterprise is special - always clickable for contact
      return false
    }
    
    const targetPlanLevel = PLAN_LEVELS[plan]
    const isHigherTier = targetPlanLevel > currentPlanLevel
    const isSameTier = targetPlanLevel === currentPlanLevel
    const isLowerTier = targetPlanLevel < currentPlanLevel
    
    // Higher tier: always allow (any cycle) - this is an upgrade!
    if (isHigherTier) {
      return false
    }
    
    // Same tier
    if (isSameTier) {
      // Same plan + same cycle = no change, disabled
      if (billingCycle === currentBillingCycle) {
        return true
      }
      // Monthly → Yearly: allowed (billing upgrade, guaranteed revenue)
      if (currentBillingCycle === "monthly" && billingCycle === "yearly") {
        return false
      }
      // Yearly → Monthly: disabled (downgrade, makes no business sense)
      return true
    }
    
    // Lower tier
    if (isLowerTier) {
      // If user is already on YEARLY billing: disable ALL lower tier options
      // They committed yearly at higher tier - showing lower yearly = refund situation
      if (currentBillingCycle === "yearly") {
        return true
      }
      
      // User is on MONTHLY billing
      // Allow YEARLY of lower tier (yearly commitment is valuable for business)
      if (billingCycle === "yearly") {
        return false
      }
      
      // Lower tier + monthly = pure downgrade, disabled
      return true
    }
    
    return false
  }

  const handleSelectPlan = (plan) => {
    if (isPlanDisabled(plan)) {
      return
    }
    setSelectedPlan(plan)
    setBreakdown(null) // Reset breakdown when plan changes
  }

  // Check if selection is valid for payment
  const isValidSelection = () => {
    if (!selectedPlan || (selectedPlan === currentPlan && billingCycle === currentBillingCycle)) {
      return false
    }
    if (selectedPlan === "free") {
      return false
    }
    return !isPlanDisabled(selectedPlan)
  }

  // Fetch price breakdown when clicking upgrade
  const fetchBreakdown = async () => {
    if (!selectedPlan || selectedPlan === "enterprise") return

    setFetchingBreakdown(true)
    try {
      const res = await axios.get(
        `${API}/payment/calculate-upgrade`,
        {
          params: { plan: selectedPlan, billing_cycle: billingCycle },
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      setBreakdown(res.data)
      setShowBreakdownModal(true)
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to calculate price")
    } finally {
      setFetchingBreakdown(false)
    }
  }

  const handleUpgradeClick = async () => {
    if (!selectedPlan) {
      toast.info("Please select a plan")
      return
    }

    if (selectedPlan === currentPlan && billingCycle === currentBillingCycle) {
      toast.info("You're already on this plan with this billing cycle")
      return
    }

    if (selectedPlan === "enterprise") {
      window.location.href = `mailto:adityagupta20042003@gmail.com?subject=Enterprise Plan Inquiry&body=Hi DocMind Team,%0D%0A%0D%0AI'm interested in the Enterprise plan.%0D%0A%0D%0AName: ${user?.name || ""}%0D%0AEmail: ${user?.email || ""}%0D%0A%0D%0APlease contact me to discuss further.`
      return
    }

    // Show breakdown modal first
    await fetchBreakdown()
  }

  const handleConfirmPayment = async () => {
    setProcessing(true)

    try {
      // Step 1: Create order on backend
      const orderRes = await axios.post(
        `${API}/payment/create-order`,
        { 
          plan: selectedPlan, 
          billing_cycle: billingCycle,
          coupon_code: couponDiscount?.code || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      const { order_id, amount, currency, key_id } = orderRes.data
      const checkoutKey = key_id || import.meta.env.VITE_RAZORPAY_KEY_ID

      if (!checkoutKey) {
        toast.error("Payment key is missing. Please contact support.")
        setProcessing(false)
        return
      }

      // Close the breakdown modal before opening Razorpay
      setShowBreakdownModal(false)

      // Step 2: Initialize Razorpay
      const options = {
        key: checkoutKey,
        amount: amount,
        currency: currency,
        name: "DocMind",
        description: `${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} Plan (${billingCycle})`,
        order_id: order_id,
        handler: async function (response) {
          try {
            // Step 3: Verify payment on backend
            const verifyRes = await axios.post(
              `${API}/payment/verify`,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: selectedPlan,
                billing_cycle: billingCycle,
                coupon_code: couponDiscount?.code || null
              },
              { headers: { Authorization: `Bearer ${token}` } }
            )

            if (verifyRes.data.success) {
              toast.success(`Successfully upgraded to ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} plan!`)
              // Redirect to welcome page with plan info
              setTimeout(() => {
                window.location.href = `/welcome?plan=${selectedPlan}`
              }, 1000)
            } else {
              toast.error("Payment verification failed. Please contact support.")
            }
          } catch (err) {
            toast.error(err.response?.data?.detail || "Payment verification failed")
          } finally {
            setProcessing(false)
          }
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || ""
        },
        theme: {
          color: "#2563eb"
        },
        modal: {
          ondismiss: function () {
            setProcessing(false)
            toast.info("Payment cancelled")
          }
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to initiate payment")
      setProcessing(false)
    }
  }

  // Format expiry date
  const formatExpiryDate = (dateStr) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className={`sticky top-0 z-10 border-b ${isDark ? "bg-black/20 backdrop-blur-xl border-white/[0.08]" : "bg-white/70 backdrop-blur-xl border-slate-200/50"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => navigate("/")}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer
              ${isDark ? "hover:bg-white/[0.08] text-[#86868b]" : "hover:bg-white/60 text-slate-600"}`}
          >
            <IconArrowLeft />
          </button>
          <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
            Upgrade Plan
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Hero Section */}
        <div className="mb-8 text-center">
          <p className={`text-lg mb-4 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
            Choose the right plan for your needs
          </p>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className={`text-sm ${isDark ? "text-gray-500" : "text-slate-500"}`}>
              Current plan:
            </span>
            <span className={`font-semibold px-3 py-1 rounded-full text-sm ${
              currentPlan === "free" 
                ? isDark ? "bg-white/[0.08] text-[#86868b]" : "bg-slate-200/80 text-slate-600"
                : currentPlan === "basic"
                  ? "bg-blue-100 text-blue-700"
                  : currentPlan === "pro"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-amber-100 text-amber-700"
            }`}>
              {currentPlan === "free" 
                ? "Free"
                : currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)
              }
            </span>
          </div>
          {user?.plan_expires_at && currentPlan !== "free" && (
            <p className={`text-xs ${isDark ? "text-gray-500" : "text-slate-500"}`}>
              Expires: {formatExpiryDate(user.plan_expires_at)}
              {user?.billing_cycle && ` (${user.billing_cycle})`}
            </p>
          )}
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center mb-10">
          <div className={`flex w-full max-w-sm sm:w-auto sm:inline-flex flex-col sm:flex-row items-stretch sm:items-center gap-1 sm:gap-0 p-1 rounded-xl ${isDark ? "bg-white/[0.08]" : "bg-slate-200/80"}`}>
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 sm:px-6 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                billingCycle === "monthly"
                  ? isDark
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-white text-slate-900 shadow-lg"
                  : isDark
                    ? "text-gray-400 hover:text-gray-200"
                    : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 sm:px-6 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${
                billingCycle === "yearly"
                  ? isDark
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-white text-slate-900 shadow-lg"
                  : isDark
                    ? "text-gray-400 hover:text-gray-200"
                    : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Yearly
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                billingCycle === "yearly"
                  ? "bg-green-500 text-white"
                  : isDark
                    ? "bg-green-900/50 text-green-400"
                    : "bg-green-100 text-green-700"
              }`}>
                Save up to 30%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 sm:gap-8 mb-8">
          <PricingCard 
            plan="free" 
            isDark={isDark} 
            isPopular={false} 
            isSelected={selectedPlan === "free"} 
            onSelect={handleSelectPlan} 
            currentPlan={currentPlan}
            currentBillingCycle={currentBillingCycle}
            billingCycle={billingCycle}
            isDisabled={isPlanDisabled("free")}
          />
          <PricingCard 
            plan="basic" 
            isDark={isDark} 
            isPopular={false} 
            isSelected={selectedPlan === "basic"} 
            onSelect={handleSelectPlan} 
            currentPlan={currentPlan}
            currentBillingCycle={currentBillingCycle}
            billingCycle={billingCycle}
            isDisabled={isPlanDisabled("basic")}
          />
          <PricingCard 
            plan="pro" 
            isDark={isDark} 
            isPopular={true} 
            isSelected={selectedPlan === "pro"} 
            onSelect={handleSelectPlan} 
            currentPlan={currentPlan}
            currentBillingCycle={currentBillingCycle}
            billingCycle={billingCycle}
            isDisabled={isPlanDisabled("pro")}
          />
          <PricingCard 
            plan="enterprise" 
            isDark={isDark} 
            isPopular={false} 
            isSelected={selectedPlan === "enterprise"} 
            onSelect={handleSelectPlan} 
            currentPlan={currentPlan}
            currentBillingCycle={currentBillingCycle}
            billingCycle={billingCycle}
            isDisabled={isPlanDisabled("enterprise")}
          />
        </div>

        {/* Usage Stats - Motivation to Upgrade */}
        {usageStats && currentPlan !== "pro" && (
          <div className={`rounded-xl p-6 mb-8 ${isDark ? "bg-yellow-900/20 border border-yellow-700/30" : "bg-yellow-50 border border-yellow-200"}`}>
            <h3 className={`font-semibold mb-3 flex items-center gap-2 ${isDark ? "text-yellow-300" : "text-yellow-800"}`}>
              <IconInfo />
              Your Current Usage
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {usageStats.documents && (
                <div>
                  <div className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                    {usageStats.documents.used}/{usageStats.documents.limit === -1 ? "∞" : usageStats.documents.limit}
                  </div>
                  <div className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>Documents</div>
                  {usageStats.documents.limit !== -1 && usageStats.documents.used >= usageStats.documents.limit * 0.8 && (
                    <div className="text-xs text-orange-500 mt-1">Running low!</div>
                  )}
                </div>
              )}
              {usageStats.questions && (
                <div>
                  <div className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                    {usageStats.questions.used}/{usageStats.questions.limit === -1 ? "∞" : usageStats.questions.limit}
                  </div>
                  <div className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>Questions this month</div>
                </div>
              )}
              {usageStats.file_size_limit_mb && (
                <div>
                  <div className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                    {usageStats.file_size_limit_mb} MB
                  </div>
                  <div className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>Max file size</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Coupon Code Input */}
        {selectedPlan && selectedPlan !== "enterprise" && selectedPlan !== "free" && isValidSelection() && (
          <div className={`rounded-xl p-6 mb-6 ${isDark ? "bg-white/[0.06] backdrop-blur-xl border border-white/[0.1]" : "bg-white/80 backdrop-blur-xl border border-slate-200/50"}`}>
            <h3 className={`font-semibold mb-3 flex items-center gap-2 ${isDark ? "text-white" : "text-slate-900"}`}>
              <IconTag />
              Have a coupon code?
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Enter coupon code"
                className={`flex-1 px-4 py-2.5 rounded-lg border transition-colors
                  ${isDark
                    ? "bg-white/[0.06] backdrop-blur-md border-white/[0.1] text-[#f5f5f7] placeholder-[#9ca3af] focus:border-white/[0.2]"
                    : "bg-white/60 backdrop-blur-md border-slate-200/50 text-slate-900 placeholder-slate-400 focus:border-[#0071e3]/40"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
              />
              <button
                onClick={validateCoupon}
                disabled={!couponCode.trim() || validatingCoupon}
                className={`px-6 py-2.5 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                  ${isDark 
                    ? "bg-blue-600 hover:bg-blue-700 text-white" 
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
              >
                {validatingCoupon ? "..." : "Apply"}
              </button>
            </div>
            {couponDiscount && (
              <div className={`mt-3 flex items-center gap-2 text-green-500`}>
                <IconCheck />
                <span>{couponDiscount.message}</span>
              </div>
            )}
            {couponError && (
              <div className={`mt-3 flex items-center gap-2 ${isDark ? "text-red-400" : "text-red-500"}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span className="text-sm">{couponError}</span>
              </div>
            )}
          </div>
        )}

        {/* Upgrade Button */}
        {selectedPlan && isValidSelection() && (
          <div className="flex justify-center mb-8">
            <button
              onClick={handleUpgradeClick}
              disabled={processing || fetchingBreakdown}
              className={`w-full sm:w-auto px-6 sm:px-12 py-4 rounded-xl font-bold text-base sm:text-lg transition-all shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                ${isDark
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-blue-500/25" 
                  : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-blue-500/25"
                }`}
            >
              {fetchingBreakdown ? (
                <ButtonLoader text="Calculating..." />
              ) : processing ? (
                <ButtonLoader text="Processing..." />
              ) : selectedPlan === "enterprise" ? (
                "Contact Sales for Enterprise"
              ) : PLAN_LEVELS[selectedPlan] < currentPlanLevel ? (
                `Switch to ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} Yearly`
              ) : selectedPlan === currentPlan ? (
                `Switch to Yearly Billing`
              ) : (
                `Upgrade to ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} (${billingCycle})`
              )}
            </button>
          </div>
        )}

        {/* Money-back Guarantee Badge */}
        <div className={`flex justify-center mb-12`}>
          <div className={`inline-flex flex-col sm:flex-row items-center gap-1 sm:gap-3 px-5 sm:px-6 py-3 rounded-full text-center sm:text-left ${
            isDark ? "bg-green-900/20 border border-green-700/30" : "bg-green-50 border border-green-200"
          }`}>
            <IconShield />
            <div>
              <span className={`font-semibold ${isDark ? "text-green-300" : "text-green-700"}`}>
                7-Day Money-Back Guarantee
              </span>
              <span className={`text-sm ml-2 ${isDark ? "text-green-400/70" : "text-green-600"}`}>
                No questions asked
              </span>
            </div>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className={`rounded-2xl border p-5 sm:p-8 mb-8 ${isDark ? "bg-white/[0.06] backdrop-blur-xl border-white/[0.1]" : "bg-white/80 backdrop-blur-xl border-slate-200/50"}`}>
          <h2 className={`text-xl font-bold mb-6 text-center ${isDark ? "text-white" : "text-slate-900"}`}>
            Compare All Features
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${isDark ? "border-white/[0.08]" : "border-slate-200/60"}`}>
                  <th className={`text-left py-3 px-4 font-semibold ${isDark ? "text-gray-300" : "text-slate-700"}`}>Feature</th>
                  <th className={`text-center py-3 px-4 font-semibold ${isDark ? "text-gray-300" : "text-slate-700"}`}>Free</th>
                  <th className={`text-center py-3 px-4 font-semibold ${isDark ? "text-blue-400" : "text-blue-600"}`}>Basic</th>
                  <th className={`text-center py-3 px-4 font-semibold ${isDark ? "text-purple-400" : "text-purple-600"}`}>Pro</th>
                </tr>
              </thead>
              <tbody className={`text-sm ${isDark ? "text-gray-300" : "text-slate-600"}`}>
                {[
                  { feature: "Documents", free: "5", basic: "50", pro: "Unlimited" },
                  { feature: "File Size Limit", free: "10 MB", basic: "50 MB", pro: "100 MB" },
                  { feature: "Questions/Month", free: "100", basic: "1,000", pro: "Unlimited" },
                  { feature: "AI Model", free: "Basic", basic: "Advanced", pro: "Premium" },
                  { feature: "Chat History Export", free: false, basic: true, pro: true },
                  { feature: "Priority Support", free: false, basic: true, pro: true },
                  { feature: "24/7 Support", free: false, basic: false, pro: true },
                  { feature: "Team Collaboration", free: false, basic: false, pro: true },
                  { feature: "Prompting Tips", free: false, basic: "4 tips", pro: "5+ tips" },
                ].map((row, idx) => (
                  <tr key={idx} className={`border-b ${isDark ? "border-white/[0.06]" : "border-slate-100/80"}`}>
                    <td className={`py-3 px-4 ${isDark ? "text-white" : "text-slate-900"}`}>{row.feature}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center items-center">
                        {typeof row.free === "boolean" ? (
                          row.free ? <IconCheck /> : <span className="text-gray-400"><IconMinus /></span>
                        ) : row.free}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center items-center">
                        {typeof row.basic === "boolean" ? (
                          row.basic ? <span className="text-green-500"><IconCheck /></span> : <span className="text-gray-400"><IconMinus /></span>
                        ) : <span className={isDark ? "text-blue-400" : "text-blue-600"}>{row.basic}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center items-center">
                        {typeof row.pro === "boolean" ? (
                          row.pro ? <span className="text-green-500"><IconCheck /></span> : <span className="text-gray-400"><IconMinus /></span>
                        ) : <span className={isDark ? "text-purple-400" : "text-purple-600"}>{row.pro}</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className={`rounded-2xl border p-5 sm:p-8 ${isDark ? "bg-white/[0.06] backdrop-blur-xl border-white/[0.1]" : "bg-white/80 backdrop-blur-xl border-slate-200/50"}`}>
          <h2 className={`text-xl font-bold mb-6 ${isDark ? "text-white" : "text-slate-900"}`}>
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className={`font-semibold mb-2 ${isDark ? "text-gray-200" : "text-slate-900"}`}>
                Can I upgrade at any time?
              </h3>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                Yes, you can upgrade your plan at any time. Changes will take effect immediately and you'll get credit for unused time on your current plan.
              </p>
            </div>
            <div>
              <h3 className={`font-semibold mb-2 ${isDark ? "text-gray-200" : "text-slate-900"}`}>
                How does proration work?
              </h3>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                When upgrading, we calculate the unused portion of your current plan and apply it as a credit toward your new plan. For example, if you're 10 days into a monthly plan and upgrade to yearly, you'll get credit for the remaining 20 days.
              </p>
            </div>
            <div>
              <h3 className={`font-semibold mb-2 ${isDark ? "text-gray-200" : "text-slate-900"}`}>
                What happens when my plan expires?
              </h3>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                Your plan will automatically revert to Free. You'll retain your documents but won't be able to upload more if over the limit.
              </p>
            </div>
            <div>
              <h3 className={`font-semibold mb-2 ${isDark ? "text-gray-200" : "text-slate-900"}`}>
                Why choose yearly billing?
              </h3>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                Yearly billing saves you significantly! Basic: ₹9,999/year (save ~17%). Pro: ₹24,999/year (save ~30%). Plus, GST (18%) is included in all prices.
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
          <a 
            href="mailto:adityagupta20042003@gmail.com?subject=DocMind Plan Inquiry"
            className={`inline-block px-8 py-3 rounded-lg font-medium transition-colors cursor-pointer
              ${isDark ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
          >
            Contact Sales
          </a>
        </div>
      </div>

      {/* Price Breakdown Modal */}
      <PriceBreakdownModal
        isOpen={showBreakdownModal}
        onClose={() => setShowBreakdownModal(false)}
        breakdown={breakdown}
        selectedPlan={selectedPlan}
        billingCycle={billingCycle}
        isDark={isDark}
        onConfirm={handleConfirmPayment}
        processing={processing}
        user={user}
        couponDiscount={couponDiscount}
      />
    </div>
  )
}
