// ✅ FILE: /app/api/auth/send-reset-link/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverWriteClient } from '@/sanity/lib/serverClient';
import { nanoid } from 'nanoid';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ message: 'Email is required' }, { status: 400 });

  const user = await serverWriteClient.fetch(
    `*[_type == "user" && email == $email][0]`,
    { email }
  );

  if (!user) {
    return NextResponse.json({ message: 'If an account exists, a reset link has been sent' });
  }

  const token = nanoid();
  const expires = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes

  await serverWriteClient.patch(user._id).set({
    resetToken: token,
    resetTokenExpires: expires.toISOString(),
  }).commit();

  const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${token}`;

  // ✅ Setup Nodemailer
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <p>You requested a password reset.</p>
      <p>Click the link below to reset your password. This link is valid for 30 minutes:</p>
      <a href="${resetUrl}" target="_blank">Reset Password</a>
      <p>If you didn’t request this, you can safely ignore it.</p>
    `,
  });

  return NextResponse.json({ message: 'If an account exists, a reset link has been sent' });
}
