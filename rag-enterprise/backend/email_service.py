import os
import requests
from requests.auth import HTTPBasicAuth


def send_verification_email(email: str, name: str | None, otp_code: str, magic_link: str, expires_minutes: int) -> None:
    """Send verification email via Mailgun or console fallback."""
    app_name = os.getenv("APP_NAME", "RAG Enterprise")
    sender = os.getenv("EMAIL_FROM", "no-reply@example.com")
    subject = f"Verify your email for {app_name}"

    greeting = f"Hi {name}," if name else "Hi,"
    text_body = (
        f"{greeting}\n\n"
        f"Your verification code is: {otp_code}\n"
        f"It expires in {expires_minutes} minutes.\n\n"
        f"Or verify instantly using this magic link:\n{magic_link}\n\n"
        "If you did not request this, you can ignore this email."
    )

    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
        <p>{greeting}</p>
        <p>Your verification code is:</p>
        <p style="font-size: 24px; font-weight: 700; letter-spacing: 2px;">{otp_code}</p>
        <p>It expires in {expires_minutes} minutes.</p>
        <p>
          Or verify instantly:
          <a href="{magic_link}">Verify Email</a>
        </p>
        <p>If you did not request this, you can ignore this email.</p>
      </body>
    </html>
    """

    mode = os.getenv("EMAIL_MODE", "mailgun").lower()
    
    # Console mode for testing/debugging
    if mode == "console":
        print("[EMAIL-VERIFY]")
        print(f"to={email}")
        print(f"otp={otp_code}")
        print(f"magic_link={magic_link}")
        return

    # Mailgun mode (default)
    mailgun_domain = os.getenv("MAILGUN_DOMAIN")
    mailgun_api_key = os.getenv("MAILGUN_API_KEY")

    if not mailgun_domain or not mailgun_api_key:
        print("[EMAIL-WARNING] MAILGUN_DOMAIN or MAILGUN_API_KEY not set. Falling back to console mode.")
        print(f"to={email}")
        print(f"otp={otp_code}")
        print(f"magic_link={magic_link}")
        return

    try:
        response = requests.post(
            f"https://api.mailgun.net/v3/{mailgun_domain}/messages",
            auth=HTTPBasicAuth("api", mailgun_api_key),
            data={
                "from": sender,
                "to": email,
                "subject": subject,
                "text": text_body,
                "html": html_body,
            },
            timeout=10
        )
        if response.status_code not in [200, 201]:
            print(f"[EMAIL-ERROR] Mailgun returned status {response.status_code}: {response.text}")
    except Exception as exc:
        # Log error but don't raise, so auth endpoints don't return 500.
        print("[EMAIL-ERROR] Failed to send verification email via Mailgun.")
        print(f"to={email}")
        print(f"otp={otp_code}")
        print(f"magic_link={magic_link}")
        print(f"[EMAIL-ERROR] Exception: {repr(exc)}")
        return
