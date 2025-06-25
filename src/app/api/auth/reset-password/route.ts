// ✅ FILE: /app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverWriteClient } from '@/sanity/lib/serverClient';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { token, email, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json({ message: 'Token and new password are required.' }, { status: 400 });
    }

    const user = await serverWriteClient.fetch(
      `*[_type == "user" && resetToken == $token][0]`,
      { token }
    );

    if (!user || !user.resetTokenExpires || new Date(user.resetTokenExpires) < new Date()) {
      return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 400 });
    }

    // Optional: Cross-verify email if passed
    if (email && user.email !== email) {
      return NextResponse.json({ message: 'Token does not match email address.' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ message: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await serverWriteClient.patch(user._id).set({
      hashedPassword,
      requiresPasswordChange: false,
      resetToken: null,
      resetTokenExpires: null,
    }).commit();

    return NextResponse.json({ message: 'Password reset successful' });

  } catch (error) {
    console.error('Error in reset-password API:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
