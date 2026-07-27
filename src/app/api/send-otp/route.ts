import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { email, otp, fullName } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; background-color: #09090b; color: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0;">AmSlot Platform</h1>
          <p style="color: #a1a1aa; font-size: 14px; margin-top: 4px;">Amrita Project Management Portal</p>
        </div>
        
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 24px; border-radius: 12px; text-align: center;">
          <p style="color: #d4d4d8; font-size: 15px; margin: 0 0 16px 0;">Hello ${fullName || 'Student'},</p>
          <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 20px 0;">Your official 6-digit email verification code is:</p>
          
          <div style="background: #18181b; border: 1px solid #34d399; padding: 16px; border-radius: 10px; display: inline-block; width: 80%;">
            <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #34d399;">${otp}</span>
          </div>
          
          <p style="color: #71717a; font-size: 12px; margin-top: 20px;">This code will expire in 10 minutes. Please do not share it with anyone.</p>
        </div>
        
        <div style="text-align: center; margin-top: 24px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px;">
          <p style="color: #52525b; font-size: 11px; margin: 0;">AmSlot v2.0.0 • Amrita Verified Identity</p>
        </div>
      </div>
    `;

    const user = process.env.GMAIL_USER || 'raghuramspace@gmail.com';
    const pass = process.env.GMAIL_APP_PASSWORD || 'kurfcpuobghapyfr';

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from: `"AmSlot Verification" <${user}>`,
      to: email,
      subject: `AmSlot Verification Code: ${otp}`,
      html: emailHtml,
    });

    return NextResponse.json({ success: true, engine: 'gmail-direct' });
  } catch (error: any) {
    console.error('Send OTP Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
