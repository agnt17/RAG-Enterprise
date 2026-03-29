"""
Razorpay payment integration for DocMind subscriptions.

Setup:
1. Sign up at https://razorpay.com
2. Get API keys from Dashboard → Settings → API Keys
3. Set environment variables:
   - RAZORPAY_KEY_ID (publishable key)
   - RAZORPAY_KEY_SECRET (secret key)
"""

import os
import hmac
import hashlib
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

try:
    import razorpay
    RAZORPAY_AVAILABLE = True
except ImportError:
    RAZORPAY_AVAILABLE = False
    print("Warning: razorpay package not installed. Payment features will be disabled.")

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")

# GST rate (18% in India)
GST_RATE = 0.18

# Plan pricing in paise (1 INR = 100 paise) - Base prices EXCLUDING GST
PLAN_PRICES = {
    "basic": {
        "monthly": 99900,      # ₹999/month
        "yearly": 999900,      # ₹9,999/year (save ~17%)
    },
    "pro": {
        "monthly": 299900,     # ₹2,999/month
        "yearly": 2499900,     # ₹24,999/year (save ~30%) - Premium yearly for revenue
    },
}

# Plan hierarchy for comparison
PLAN_HIERARCHY = {
    "free": 0,
    "basic": 1,
    "pro": 2,
    "enterprise": 3
}


def get_plan_level(plan: str) -> int:
    """Get numeric level of a plan for comparison"""
    return PLAN_HIERARCHY.get(plan, 0)


def get_razorpay_client():
    """Get Razorpay client instance"""
    if not RAZORPAY_AVAILABLE:
        return None
    
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        return None
    
    return razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))


def calculate_proration(
    current_plan: str,
    current_billing_cycle: str,
    plan_started_at: datetime,
    plan_expires_at: datetime,
    new_plan: str,
    new_billing_cycle: str,
    actual_amount_paid: float = None  # The actual amount user paid for current plan (including GST, after discounts)
) -> dict:
    """
    Calculate proration credit when upgrading plans.
    
    IMPORTANT: Credit is calculated based on what user ACTUALLY PAID, not base plan price.
    This prevents exploit where users use coupons and get credit for full price.
    
    Returns breakdown:
    - base_price: New plan's base price
    - credit: Amount to subtract (unused portion of current plan)
    - subtotal: base_price - credit
    - gst: GST on subtotal (18%)
    - total: Final amount to pay
    - days_remaining: Days left on current plan
    - credit_percentage: Percentage of current plan credited back
    - new_plan_days: Duration of new plan in days
    - new_plan_expires_at: ISO date when new plan will expire
    """
    now = datetime.utcnow()
    
    # New plan's base price (in rupees, not paise)
    new_base_price = PLAN_PRICES[new_plan][new_billing_cycle] / 100
    
    # Standard duration for new plan
    standard_days = 365 if new_billing_cycle == "yearly" else 30
    
    # If user is on free plan or no active subscription, no proration
    if current_plan == "free" or not plan_started_at or not plan_expires_at:
        subtotal = new_base_price
        gst = round(subtotal * GST_RATE, 2)
        new_plan_expires = now + timedelta(days=standard_days)
        return {
            "base_price": new_base_price,
            "credit": 0,
            "credit_percentage": 0,
            "days_remaining": 0,
            "current_plan_value": 0,
            "subtotal": subtotal,
            "gst": gst,
            "gst_rate": GST_RATE * 100,
            "total": round(subtotal + gst, 2),
            "new_plan_days": standard_days,
            "new_plan_expires_at": new_plan_expires.isoformat()
        }
    
    # Calculate remaining days in current plan
    if plan_expires_at <= now:
        # Plan already expired, no credit
        days_remaining = 0
        credit = 0
        credit_percentage = 0
        current_plan_value = 0
    else:
        # Total days in current billing cycle
        if current_billing_cycle == "yearly":
            total_days = 365
        else:  # monthly
            total_days = 30
        
        # Days remaining until expiry
        days_remaining = (plan_expires_at - now).days
        
        # Ensure we don't exceed total days (in case of edge cases)
        days_remaining = min(days_remaining, total_days)
        
        # Calculate credit percentage
        credit_percentage = round((days_remaining / total_days) * 100, 1)
        
        # CRITICAL: Use actual amount paid, not base plan price
        # This prevents exploit where users use coupons and get credit for full price
        if actual_amount_paid is not None and actual_amount_paid > 0:
            # Use what user actually paid (already includes GST, after discounts)
            current_plan_value = actual_amount_paid
        else:
            # Fallback to base plan price (shouldn't happen for paid users)
            current_plan_value = PLAN_PRICES[current_plan][current_billing_cycle] / 100
        
        # Credit = unused portion of what user ACTUALLY PAID
        credit = round((days_remaining / total_days) * current_plan_value, 2)
    
    # Subtotal after credit
    subtotal = max(0, new_base_price - credit)  # Can't be negative
    
    # GST on subtotal
    gst = round(subtotal * GST_RATE, 2)
    
    # Total to pay
    total = round(subtotal + gst, 2)
    
    # Calculate new plan duration
    # If credit exceeds new plan price, user gets extended time
    if credit >= new_base_price:
        # Credit covers the full plan + extra
        # Extra credit translates to additional days
        extra_credit = credit - new_base_price
        daily_rate = new_base_price / standard_days
        extra_days = int(extra_credit / daily_rate) if daily_rate > 0 else 0
        new_plan_days = standard_days + extra_days
    else:
        # Standard duration
        new_plan_days = standard_days
    
    new_plan_expires = now + timedelta(days=new_plan_days)
    
    return {
        "base_price": new_base_price,
        "credit": credit,
        "credit_percentage": credit_percentage,
        "days_remaining": days_remaining,
        "current_plan_value": current_plan_value,
        "subtotal": subtotal,
        "gst": gst,
        "gst_rate": GST_RATE * 100,
        "total": total,
        "new_plan_days": new_plan_days,
        "new_plan_expires_at": new_plan_expires.isoformat()
    }


def create_order(plan: str, billing_cycle: str, user_email: str, amount_paise: int = None):
    """
    Create a Razorpay order for subscription.
    
    If amount_paise is provided, use that (for prorated amounts).
    Otherwise, use standard plan pricing.
    """
    client = get_razorpay_client()
    if not client:
        raise Exception("Razorpay not configured")
    
    if plan not in PLAN_PRICES:
        raise ValueError(f"Invalid plan: {plan}")
    
    if billing_cycle not in ["monthly", "yearly"]:
        raise ValueError(f"Invalid billing cycle: {billing_cycle}")
    
    # Use provided amount or standard price
    if amount_paise is not None:
        amount = amount_paise
    else:
        # Standard price + GST
        base = PLAN_PRICES[plan][billing_cycle]
        gst = round(base * GST_RATE)
        amount = base + gst
    
    # Receipt must be <= 40 chars, use short format with timestamp
    import time
    short_cycle = "y" if billing_cycle == "yearly" else "m"
    receipt = f"{plan}_{short_cycle}_{int(time.time())}"
    
    order_data = {
        "amount": amount,
        "currency": "INR",
        "receipt": receipt,
        "notes": {
            "plan": plan,
            "billing_cycle": billing_cycle,
            "email": user_email
        }
    }
    
    order = client.order.create(data=order_data)
    return {
        "order_id": order["id"],
        "amount": order["amount"],
        "currency": order["currency"]
    }


def verify_payment_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """Verify Razorpay payment signature"""
    if not RAZORPAY_KEY_SECRET:
        return False
    
    message = f"{order_id}|{payment_id}"
    generated_signature = hmac.new(
        RAZORPAY_KEY_SECRET.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(generated_signature, signature)


def calculate_expiry_date(billing_cycle: str, from_date: datetime = None) -> datetime:
    """Calculate plan expiry date based on billing cycle"""
    if from_date is None:
        from_date = datetime.utcnow()
    
    if billing_cycle == "yearly":
        return from_date + timedelta(days=365)
    else:  # monthly
        return from_date + timedelta(days=30)


def is_razorpay_configured() -> bool:
    """Check if Razorpay is properly configured"""
    return RAZORPAY_AVAILABLE and bool(RAZORPAY_KEY_ID) and bool(RAZORPAY_KEY_SECRET)
