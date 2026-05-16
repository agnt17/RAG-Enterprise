import os
import requests
from sqlalchemy.orm import Session

from database import EmailLog, SessionLocal


def _build_brand_prefix() -> str:
    return os.getenv("APP_NAME", "DocMind AI")


def _build_support_email() -> str:
    return os.getenv("SUPPORT_EMAIL", os.getenv("RESEND_FROM_EMAIL", "no-reply@example.com"))


def _record_email_log(
    *,
    recipient: str,
    email_type: str,
    subject: str,
    status: str,
    template_name: str | None = None,
    user_id: str | None = None,
    provider: str = "resend",
    provider_message_id: str | None = None,
    error_message: str | None = None,
    db: Session | None = None,
) -> None:
    log_entry = EmailLog(
        user_id=user_id,
        recipient=recipient,
        email_type=email_type,
        template_name=template_name,
        subject=subject,
        provider=provider,
        provider_message_id=provider_message_id,
        status=status,
        error_message=error_message,
    )

    owns_session = db is None
    session = db or SessionLocal()
    try:
        session.add(log_entry)
        session.commit()
    except Exception:
        if owns_session:
            session.rollback()
    finally:
        if owns_session:
            session.close()


def _send_transactional_email(
    *,
    recipient: str,
    subject: str,
    text_body: str,
    html_body: str,
    email_type: str,
    template_name: str,
    user_id: str | None = None,
    db: Session | None = None,
) -> None:
    mode = os.getenv("EMAIL_MODE", "resend").lower()

    if mode == "console":
        print(f"[EMAIL-{email_type.upper()}]")
        print(f"to={recipient}")
        print(f"subject={subject}")
        print(text_body)
        _record_email_log(
            recipient=recipient,
            email_type=email_type,
            subject=subject,
            status="sent",
            template_name=template_name,
            user_id=user_id,
            provider="console",
            provider_message_id=None,
            db=db,
        )
        return

    if mode != "resend":
        error_message = f"Unsupported EMAIL_MODE={mode}. Use 'resend' or 'console'."
        print(f"[EMAIL-ERROR] {error_message}")
        _record_email_log(
            recipient=recipient,
            email_type=email_type,
            subject=subject,
            status="failed",
            template_name=template_name,
            user_id=user_id,
            provider=mode,
            error_message=error_message,
            db=db,
        )
        return

    resend_api_key = os.getenv("RESEND_API_KEY")
    sender = os.getenv("RESEND_FROM_EMAIL", "no-reply@example.com")

    if not resend_api_key:
        error_message = "RESEND_API_KEY not set"
        print(f"[EMAIL-ERROR] {error_message}")
        _record_email_log(
            recipient=recipient,
            email_type=email_type,
            subject=subject,
            status="failed",
            template_name=template_name,
            user_id=user_id,
            provider="resend",
            error_message=error_message,
            db=db,
        )
        return

    try:
        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": f"Bearer {resend_api_key}",
            },
            json={
                "from": sender,
                "to": [recipient],
                "subject": subject,
                "text": text_body,
                "html": html_body,
            },
            timeout=10,
        )
        try:
            response_data = response.json()
        except Exception:
            response_data = {}

        provider_message_id = response_data.get("id")
        if response.status_code not in [200, 201, 202]:
            error_message = f"Resend returned status {response.status_code}: {response.text}"
            print(f"[EMAIL-ERROR] {error_message}")
            _record_email_log(
                recipient=recipient,
                email_type=email_type,
                subject=subject,
                status="failed",
                template_name=template_name,
                user_id=user_id,
                provider="resend",
                provider_message_id=provider_message_id,
                error_message=error_message,
                db=db,
            )
            return

        _record_email_log(
            recipient=recipient,
            email_type=email_type,
            subject=subject,
            status="sent",
            template_name=template_name,
            user_id=user_id,
            provider="resend",
            provider_message_id=provider_message_id,
            db=db,
        )
    except Exception as exc:
        error_message = repr(exc)
        print(f"[EMAIL-ERROR] Failed to send {email_type} email via Resend: {error_message}")
        _record_email_log(
            recipient=recipient,
            email_type=email_type,
            subject=subject,
            status="failed",
            template_name=template_name,
            user_id=user_id,
            provider="resend",
            error_message=error_message,
            db=db,
        )


def _render_verification_template(name: str | None, otp_code: str, magic_link: str, expires_minutes: int) -> tuple[str, str, str]:
    brand = _build_brand_prefix()
    greeting = f"Hi {name}," if name else "Hi,"
    subject = f"Verify your email for {brand}"
    text_body = (
        f"{greeting}\n\n"
        f"Welcome to {brand}. Your verification code is: {otp_code}\n"
        f"It expires in {expires_minutes} minutes.\n\n"
        f"Or verify instantly using this magic link:\n{magic_link}\n\n"
        f"If you did not request this, you can ignore this email or contact {_build_support_email()}."
    )
    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
        <p>{greeting}</p>
        <p>Welcome to {brand}. Your verification code is:</p>
        <p style="font-size: 24px; font-weight: 700; letter-spacing: 2px;">{otp_code}</p>
        <p>It expires in {expires_minutes} minutes.</p>
        <p>
          Or verify instantly:
          <a href="{magic_link}">Verify Email</a>
        </p>
        <p>If you did not request this, you can ignore this email or contact {_build_support_email()}.</p>
      </body>
    </html>
    """
    return subject, text_body, html_body


def _render_welcome_template(name: str | None, login_url: str) -> tuple[str, str, str]:
    brand = _build_brand_prefix()
    subject = f"Welcome to {brand}"
    greeting = f"Hi {name}," if name else "Hi,"
    text_body = (
        f"{greeting}\n\n"
        f"Welcome to {brand}! Your account is now active.\n\n"
        f"Get started here: {login_url}\n\n"
        "If you need help, reply to this email or contact support."
    )
    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <p>{greeting}</p>
        <p>Welcome to <strong>{brand}</strong>. Your account is now active.</p>
        <p>
          <a href="{login_url}" style="display:inline-block;padding:12px 18px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:8px;">
            Get Started
          </a>
        </p>
        <p>If you need help, reply to this email or contact {_build_support_email()}.</p>
      </body>
    </html>
    """
    return subject, text_body, html_body


def _render_payment_receipt_template(
    *,
    name: str | None,
    plan: str,
    billing_cycle: str,
    amount: float,
    base_amount: float | None,
    discount_amount: float,
    gst_amount: float | None,
    payment_id: str,
    razorpay_payment_id: str | None,
    invoice_date: str,
) -> tuple[str, str, str]:
    brand = _build_brand_prefix()
    subject = f"Payment receipt for {brand}"
    greeting = f"Hi {name}," if name else "Hi,"
    base_amount = base_amount if base_amount is not None else amount
    gst_amount = gst_amount or 0.0
    text_body = (
        f"{greeting}\n\n"
        f"Thanks for your payment to {brand}.\n"
        f"Plan: {plan.capitalize()} ({billing_cycle})\n"
        f"Amount paid: ₹{amount:.2f}\n"
        f"Base amount: ₹{base_amount:.2f}\n"
        f"Discount: ₹{discount_amount:.2f}\n"
        f"GST: ₹{gst_amount:.2f}\n"
        f"Payment ID: {payment_id}\n"
        f"Razorpay ID: {razorpay_payment_id or 'N/A'}\n"
        f"Date: {invoice_date}\n\n"
        "You can review your billing history from your account dashboard."
    )
    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <p>{greeting}</p>
        <p>Thanks for your payment to <strong>{brand}</strong>.</p>
        <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;border:1px solid #e2e8f0;">
          <tr><td><strong>Plan</strong></td><td>{plan.capitalize()} ({billing_cycle})</td></tr>
          <tr><td><strong>Amount paid</strong></td><td>₹{amount:.2f}</td></tr>
          <tr><td><strong>Base amount</strong></td><td>₹{base_amount:.2f}</td></tr>
          <tr><td><strong>Discount</strong></td><td>₹{discount_amount:.2f}</td></tr>
          <tr><td><strong>GST</strong></td><td>₹{gst_amount:.2f}</td></tr>
          <tr><td><strong>Payment ID</strong></td><td>{payment_id}</td></tr>
          <tr><td><strong>Razorpay ID</strong></td><td>{razorpay_payment_id or 'N/A'}</td></tr>
          <tr><td><strong>Date</strong></td><td>{invoice_date}</td></tr>
        </table>
        <p>You can review your billing history from your account dashboard.</p>
      </body>
    </html>
    """
    return subject, text_body, html_body


def send_verification_email(
    email: str,
    name: str | None,
    otp_code: str,
    magic_link: str,
    expires_minutes: int,
    user_id: str | None = None,
    db: Session | None = None,
) -> None:
    subject, text_body, html_body = _render_verification_template(name, otp_code, magic_link, expires_minutes)
    _send_transactional_email(
        recipient=email,
        subject=subject,
        text_body=text_body,
        html_body=html_body,
        email_type="verification",
        template_name="verification_email",
        user_id=user_id,
        db=db,
    )


def send_welcome_email(
    email: str,
    name: str | None,
    login_url: str,
    user_id: str | None = None,
    db: Session | None = None,
) -> None:
    subject, text_body, html_body = _render_welcome_template(name, login_url)
    _send_transactional_email(
        recipient=email,
        subject=subject,
        text_body=text_body,
        html_body=html_body,
        email_type="welcome",
        template_name="welcome_email",
        user_id=user_id,
        db=db,
    )


def send_payment_receipt_email(
    email: str,
    name: str | None,
    plan: str,
    billing_cycle: str,
    amount: float,
    base_amount: float | None,
    discount_amount: float,
    gst_amount: float | None,
    payment_id: str,
    razorpay_payment_id: str | None,
    invoice_date: str,
    user_id: str | None = None,
    db: Session | None = None,
) -> None:
    subject, text_body, html_body = _render_payment_receipt_template(
        name=name,
        plan=plan,
        billing_cycle=billing_cycle,
        amount=amount,
        base_amount=base_amount,
        discount_amount=discount_amount,
        gst_amount=gst_amount,
        payment_id=payment_id,
        razorpay_payment_id=razorpay_payment_id,
        invoice_date=invoice_date,
    )
    _send_transactional_email(
        recipient=email,
        subject=subject,
        text_body=text_body,
        html_body=html_body,
        email_type="payment_receipt",
        template_name="payment_receipt_email",
        user_id=user_id,
        db=db,
    )
