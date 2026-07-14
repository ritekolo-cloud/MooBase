import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static getTransporter(): nodemailer.Transporter {
    if (this.transporter) return this.transporter;

    const hasSmtp =
      env.SMTP_HOST &&
      env.SMTP_USER &&
      env.SMTP_USER !== 'your_gmail_address@gmail.com' &&
      env.SMTP_PASS &&
      env.SMTP_PASS !== 'your_gmail_app_password';

    if (hasSmtp) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT || 587,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    } else {
      // Return a mock transport that doesn't actually connect to SMTP
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'windows',
        buffer: true,
      });
    }

    return this.transporter;
  }

  static async sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
    try {
      const transporter = this.getTransporter();
      const from = env.SMTP_USER || 'no-reply@moobase.com';

      const info = await transporter.sendMail({
        from: `"MooBase Support" <${from}>`,
        to,
        subject,
        text,
        html,
      });

      const isMock = !env.SMTP_USER || env.SMTP_USER === 'your_gmail_address@gmail.com';
      if (isMock) {
        // Log the email details
        console.log('========================================');
        console.log(`📧 MOCK EMAIL SENT to: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body text: ${text}`);
        console.log('========================================');

        // Write to a local log file inside the workspace for easy testing/review
        const logDir = path.join(process.cwd(), 'scratch');
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        const logPath = path.join(logDir, 'sent-emails.log');
        const emailLogEntry = `
[${new Date().toISOString()}]
To: ${to}
Subject: ${subject}
Text: ${text}
HTML:
${html}
----------------------------------------
`;
        fs.appendFileSync(logPath, emailLogEntry, 'utf8');
      }

      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  static async sendPasswordResetEmail(to: string, name: string, resetLink: string): Promise<boolean> {
    const subject = 'Reset Your MooBase Password';
    const text = `Hello ${name},\n\nYou requested to reset your password. Please click the link below to set a new password:\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, please ignore this email.\n\nBest regards,\nThe MooBase Team`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #1B5E20; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; letter-spacing: -0.025em;">MooBase</h1>
          <p style="color: #c8e6c9; margin: 4px 0 0 0; font-size: 14px;">Smart Cattle Records for Smart Farming</p>
        </div>
        <div style="padding: 32px; background-color: #ffffff;">
          <h2 style="color: #111827; margin-top: 0; font-size: 20px;">Password Reset Request</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">Hello ${name},</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">We received a request to reset your password for your MooBase account. Click the button below to choose a new password:</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}" style="background-color: #1B5E20; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(27, 94, 32, 0.2);">Reset Password</a>
          </div>
          <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
          <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0;">If you're having trouble clicking the button, copy and paste the URL below into your browser:</p>
          <p style="color: #1b5e20; font-size: 12px; word-break: break-all; margin: 8px 0 0 0;">${resetLink}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 16px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} MooBase. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendEmail(to, subject, html, text);
  }

  static async sendPasswordChangeConfirmationEmail(to: string, name: string): Promise<boolean> {
    const subject = 'Your MooBase Password Was Changed';
    const text = `Hello ${name},\n\nThis is a confirmation that the password for your MooBase account has been successfully changed.\n\nIf you did not make this change, please contact support immediately.\n\nBest regards,\nThe MooBase Team`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #1B5E20; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; letter-spacing: -0.025em;">MooBase</h1>
          <p style="color: #c8e6c9; margin: 4px 0 0 0; font-size: 14px;">Smart Cattle Records for Smart Farming</p>
        </div>
        <div style="padding: 32px; background-color: #ffffff;">
          <h2 style="color: #111827; margin-top: 0; font-size: 20px;">Password Changed Successfully</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">Hello ${name},</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">The password for your MooBase account has been changed successfully.</p>
          <p style="color: #b91c1c; font-size: 14px; font-weight: bold; line-height: 1.5; margin-top: 24px;">If you did not request this change, please contact a farm manager immediately to secure your account.</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">This is an automated notification. Please do not reply directly to this email.</p>
        </div>
        <div style="background-color: #f9fafb; padding: 16px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} MooBase. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendEmail(to, subject, html, text);
  }
}
