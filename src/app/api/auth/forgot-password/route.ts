// ✅ FILE: /app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverWriteClient } from '@/sanity/lib/serverClient';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ message: 'Email required' }, { status: 400 });

  const user = await serverWriteClient.fetch(`*[_type == "user" && email == $email][0]`, { email });
  if (user) {
    const token = nanoid();
    const expires = new Date(Date.now() + 1000 * 60 * 30);

    await serverWriteClient.patch(user._id).set({
      resetToken: token,
      resetTokenExpires: expires.toISOString()
    }).commit();

    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${token}`;
    console.log('[Reset Link]', resetUrl); // 🔄 Replace with real email logic
  }

  return NextResponse.json({ message: 'If account exists, reset link sent.' });
}