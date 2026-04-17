from datetime import datetime, timedelta
from unittest.mock import patch

from database import Coupon, CouponUsage, Payment, User


def test_create_order_rejects_expired_coupon(client, registered_user, db):
    coupon = Coupon(
        id="EXPIRED50",
        discount_type="percentage",
        discount_value=50,
        applicable_plans='["basic", "pro"]',
        min_amount=0,
        max_uses=None,
        used_count=0,
        per_user_limit=1,
        valid_from=datetime.utcnow() - timedelta(days=10),
        valid_until=datetime.utcnow() - timedelta(days=1),
        is_active=True,
    )
    db.add(coupon)
    db.commit()

    with patch("main.is_razorpay_configured", return_value=True), patch(
        "main.create_order",
        return_value={"order_id": "order_test", "amount": 99900, "currency": "INR"},
    ):
        response = client.post(
            "/payment/create-order",
            json={"plan": "basic", "billing_cycle": "monthly", "coupon_code": "EXPIRED50"},
            headers=registered_user["headers"],
        )

    assert response.status_code == 400
    assert "expired" in response.json()["detail"].lower()


def test_create_order_enforces_coupon_per_user_limit(client, registered_user, db):
    coupon = Coupon(
        id="ONCEONLY",
        discount_type="flat",
        discount_value=250,
        applicable_plans='["basic", "pro"]',
        min_amount=0,
        max_uses=None,
        used_count=1,
        per_user_limit=1,
        valid_from=datetime.utcnow() - timedelta(days=1),
        valid_until=datetime.utcnow() + timedelta(days=30),
        is_active=True,
    )
    db.add(coupon)
    db.add(CouponUsage(coupon_id="ONCEONLY", user_id=registered_user["user_id"]))
    db.commit()

    with patch("main.is_razorpay_configured", return_value=True), patch(
        "main.create_order",
        return_value={"order_id": "order_test", "amount": 99900, "currency": "INR"},
    ):
        response = client.post(
            "/payment/create-order",
            json={"plan": "basic", "billing_cycle": "monthly", "coupon_code": "ONCEONLY"},
            headers=registered_user["headers"],
        )

    assert response.status_code == 400
    assert "already used" in response.json()["detail"].lower()


def test_coupon_validate_uses_prorated_subtotal_for_min_amount(client, registered_user, db):
    now = datetime.utcnow()
    user = db.query(User).filter(User.id == registered_user["user_id"]).first()
    user.plan = "basic"
    user.billing_cycle = "monthly"
    user.plan_started_at = now - timedelta(days=1)
    user.plan_expires_at = now + timedelta(days=29)

    coupon = Coupon(
        id="MIN2500",
        discount_type="percentage",
        discount_value=10,
        applicable_plans='["pro"]',
        min_amount=2500,
        max_uses=None,
        used_count=0,
        per_user_limit=1,
        valid_from=now - timedelta(days=1),
        valid_until=now + timedelta(days=30),
        is_active=True,
    )
    db.add(coupon)
    db.commit()

    response = client.post(
        "/coupon/validate",
        json={"code": "MIN2500", "plan": "pro", "billing_cycle": "monthly"},
        headers=registered_user["headers"],
    )

    assert response.status_code == 400
    assert "minimum order" in response.json()["detail"].lower()


def test_verify_payment_is_idempotent(client, registered_user, db):
    payload = {
        "razorpay_order_id": "order_test_1",
        "razorpay_payment_id": "pay_test_1",
        "razorpay_signature": "sig_test_1",
        "plan": "basic",
        "billing_cycle": "monthly",
        "coupon_code": None,
    }

    with patch("main.is_razorpay_configured", return_value=True), patch(
        "main.verify_payment_signature", return_value=True
    ):
        first = client.post("/payment/verify", json=payload, headers=registered_user["headers"])
        second = client.post("/payment/verify", json=payload, headers=registered_user["headers"])

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json().get("idempotent") is True

    count = db.query(Payment).filter(Payment.razorpay_payment_id == "pay_test_1").count()
    assert count == 1
