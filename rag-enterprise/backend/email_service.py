import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


def send_verification_email(email: str, name: str | None, otp_code: str, magic_link: str, expires_minutes: int) -> None:
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
      <body style=\"font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;\">
        <p>{greeting}</p>
        <p>Your verification code is:</p>
        <p style=\"font-size: 24px; font-weight: 700; letter-spacing: 2px;\">{otp_code}</p>
        <p>It expires in {expires_minutes} minutes.</p>
        <p>
          Or verify instantly:
          <a href=\"{magic_link}\">Verify Email</a>
        </p>
        <p>If you did not request this, you can ignore this email.</p>
      </body>
    </html>
    """

    mode = os.getenv("EMAIL_MODE", "console").lower()
    if mode == "console":
        print("[EMAIL-VERIFY]")
        print(f"to={email}")
        print(f"otp={otp_code}")
        print(f"magic_link={magic_link}")
        return

    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")

    if not smtp_host or not smtp_user or not smtp_password:
        raise RuntimeError("SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD.")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = email
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.sendmail(sender, [email], msg.as_string())
