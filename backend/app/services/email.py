import smtplib
from email.message import EmailMessage
from ..config import get_settings

def send_assessment_invite(
    to_email: str,
    candidate_name: str,
    job_title: str,
    link: str,
    from_email: str = 'sudharsankuttal03@gmail.com',
    from_name: str = 'Cbtshire.ai'
) -> bool:
    settings = get_settings()

    # Option 1: Central Company Hiring Mailer (sudharsankuttal03@gmail.com)
    company_sender = settings.smtp_from_email or 'sudharsankuttal03@gmail.com'
    hr_reply_to = from_email if from_email else company_sender
    sender_display_name = f"{from_name} via Cbtshire.ai" if from_name else "Cbtshire.ai"

    message = EmailMessage()
    message['Subject'] = f'🎉 AI Technical Assessment Invitation: {job_title}'
    message['From'] = f"{sender_display_name} <{company_sender}>"
    message['Reply-To'] = hr_reply_to
    message['To'] = to_email
    message.set_content(
        f"Hi {candidate_name},\n\n"
        f"You have been invited by {from_name} to complete the AI Technical Assessment for the {job_title} position.\n\n"
        f"🔗 YOUR EXCLUSIVE ASSESSMENT PORTAL LINK:\n"
        f"{link}\n\n"
        f"Instructions:\n"
        f"- Duration: 30 Minutes\n"
        f"- Format: Tailored Technical MCQs\n"
        f"- Please complete the assessment independently. Results will be reviewed automatically.\n\n"
        f"Best regards,\n"
        f"{from_name}\n"
        f"Cbtshire.ai\n"
        f"Reply-To: {hr_reply_to}"
    )

    if settings.smtp_host and settings.smtp_username and settings.smtp_password:
        try:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
                server.starttls()
                server.login(settings.smtp_username, settings.smtp_password)
                server.send_message(message)
            print(f"[Central Company Emailer] Successfully delivered email to '{to_email}' (HR Reply-To: {hr_reply_to})!")
            return True
        except Exception as err:
            print(f"[Email Dispatch Error] {err}")
            return False

    print(f"[Email Dispatch Simulator] Outgoing Email to '{to_email}' via Central Mailer '{company_sender}': Link = {link}")
    return True

def send_password_reset_email(to_email: str, user_name: str, otp_code: str) -> bool:
    settings = get_settings()
    company_sender = settings.smtp_from_email or 'sudharsankuttal03@gmail.com'

    message = EmailMessage()
    message['Subject'] = f'🔐 Password Reset Request - Cbtshire.ai'
    message['From'] = f"Cbtshire.ai Security <{company_sender}>"
    message['To'] = to_email
    message.set_content(
        f"Hi {user_name},\n\n"
        f"We received a request to reset your password for your Cbtshire.ai account.\n\n"
        f"🔑 YOUR 6-DIGIT RESET OTP CODE IS: {otp_code}\n\n"
        f"Please enter this code on the password reset page to update your password.\n"
        f"If you did not request a password reset, you can safely ignore this email.\n\n"
        f"Best regards,\n"
        f"Cbtshire.ai Security Team"
    )

    if settings.smtp_host and settings.smtp_username and settings.smtp_password:
        try:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
                server.starttls()
                server.login(settings.smtp_username, settings.smtp_password)
                server.send_message(message)
            print(f"[Central Company Emailer] Password reset OTP delivered to '{to_email}'!")
            return True
        except Exception as err:
            print(f"[Email Dispatch Error] {err}")
            return False

    print(f"[Email Dispatch Simulator] Password Reset OTP for '{to_email}': OTP = {otp_code}")
    return True

def send_interview_invite(
    to_email: str,
    candidate_name: str,
    job_title: str,
    scheduled_at: str,
    interview_type: str = 'Video',
    interviewer_name: str = 'Hiring Team',
    meeting_link: str = '',
    from_email: str = 'sudharsankuttal03@gmail.com',
    from_name: str = 'Cbtshire.ai'
) -> bool:
    settings = get_settings()
    company_sender = settings.smtp_from_email or 'sudharsankuttal03@gmail.com'
    hr_reply_to = from_email if from_email else company_sender
    sender_display_name = f"{from_name} via Cbtshire.ai" if from_name else "Cbtshire.ai"

    message = EmailMessage()
    message['Subject'] = f'📅 Interview Scheduled: {job_title} - Congratulations!'
    message['From'] = f"{sender_display_name} <{company_sender}>"
    message['Reply-To'] = hr_reply_to
    message['To'] = to_email

    meeting_info = f"\n🔗 MEETING / VIDEO LINK:\n{meeting_link}\n" if meeting_link else ""

    message.set_content(
        f"Hi {candidate_name},\n\n"
        f"Congratulations on completing your assessment! We were impressed with your profile and would like to invite you for an interview for the {job_title} role.\n\n"
        f"📅 INTERVIEW SCHEDULE DETAILS:\n"
        f"- Date & Time: {scheduled_at}\n"
        f"- Interview Format: {interview_type} Interview\n"
        f"- Interviewer: {interviewer_name}\n"
        f"{meeting_info}\n"
        f"Please ensure you are ready and available 5 minutes prior to the scheduled time.\n\n"
        f"Best regards,\n"
        f"{from_name}\n"
        f"Cbtshire.ai\n"
        f"Reply-To: {hr_reply_to}"
    )

    if settings.smtp_host and settings.smtp_username and settings.smtp_password:
        try:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
                server.starttls()
                server.login(settings.smtp_username, settings.smtp_password)
                server.send_message(message)
            print(f"[Central Company Emailer] Interview invitation delivered to '{to_email}' (HR Reply-To: {hr_reply_to})!")
            return True
        except Exception as err:
            print(f"[Email Dispatch Error] {err}")
            return False

    print(f"[Email Dispatch Simulator] Outgoing Interview Invite to '{to_email}': {scheduled_at}")
    return True

