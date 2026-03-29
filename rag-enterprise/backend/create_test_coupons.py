"""
Script to create test coupons for the RAG-Enterprise application.
Run this once to seed the database with test coupons.
"""

from database import SessionLocal, Coupon
from datetime import datetime, timedelta
import json

def create_test_coupons():
    db = SessionLocal()
    
    test_coupons = [
        {
            "id": "WELCOME20",
            "discount_type": "percentage",
            "discount_value": 20,  # 20% off
            "applicable_plans": json.dumps(["basic", "pro"]),
            "min_amount": 0,
            "max_uses": 1000,
            "per_user_limit": 1,
            "valid_until": datetime.utcnow() + timedelta(days=365),
            "is_active": True
        },
        {
            "id": "FLAT500",
            "discount_type": "flat",
            "discount_value": 500,  # ₹500 off
            "applicable_plans": json.dumps(["basic", "pro"]),
            "min_amount": 999,  # Minimum order of ₹999
            "max_uses": 500,
            "per_user_limit": 1,
            "valid_until": datetime.utcnow() + timedelta(days=365),
            "is_active": True
        },
        {
            "id": "PROONLY30",
            "discount_type": "percentage",
            "discount_value": 30,  # 30% off - only for Pro
            "applicable_plans": json.dumps(["pro"]),
            "min_amount": 0,
            "max_uses": 200,
            "per_user_limit": 1,
            "valid_until": datetime.utcnow() + timedelta(days=180),
            "is_active": True
        },
        {
            "id": "YEARLY1000",
            "discount_type": "flat",
            "discount_value": 1000,  # ₹1000 off yearly plans
            "applicable_plans": json.dumps(["basic", "pro"]),
            "min_amount": 5000,  # Only for yearly (min ₹5000)
            "max_uses": None,  # Unlimited
            "per_user_limit": 1,
            "valid_until": datetime.utcnow() + timedelta(days=365),
            "is_active": True
        },
        {
            "id": "TEST50",
            "discount_type": "percentage",
            "discount_value": 50,  # 50% off - for testing
            "applicable_plans": None,  # All plans
            "min_amount": 0,
            "max_uses": None,
            "per_user_limit": 99,  # Can use multiple times for testing
            "valid_until": datetime.utcnow() + timedelta(days=30),
            "is_active": True
        }
    ]
    
    created = 0
    skipped = 0
    
    for coupon_data in test_coupons:
        # Check if coupon already exists
        existing = db.query(Coupon).filter(Coupon.id == coupon_data["id"]).first()
        if existing:
            print(f"⏭️  Skipped '{coupon_data['id']}' (already exists)")
            skipped += 1
            continue
        
        coupon = Coupon(**coupon_data)
        db.add(coupon)
        print(f"✅ Created '{coupon_data['id']}' ({coupon_data['discount_type']}: {coupon_data['discount_value']})")
        created += 1
    
    db.commit()
    db.close()
    
    print(f"\n📊 Summary: {created} created, {skipped} skipped")
    print("\n🎟️  Test Coupons Available:")
    print("─" * 50)
    print("| Code        | Discount      | Min Amount | Plans       |")
    print("─" * 50)
    print("| WELCOME20   | 20% off       | ₹0         | Basic, Pro  |")
    print("| FLAT500     | ₹500 off      | ₹999       | Basic, Pro  |")
    print("| PROONLY30   | 30% off       | ₹0         | Pro only    |")
    print("| YEARLY1000  | ₹1000 off     | ₹5000      | Basic, Pro  |")
    print("| TEST50      | 50% off       | ₹0         | All plans   |")
    print("─" * 50)

if __name__ == "__main__":
    create_test_coupons()
