// ✅ FILE: /app/api/admin/create-user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import bcrypt from 'bcryptjs';
import { serverWriteClient } from '@/sanity/lib/serverClient';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password || !['admin', 'editor', 'viewer'].includes(role)) {
      return NextResponse.json({ message: 'Missing or invalid fields' }, { status: 400 });
    }

    const existingUser = await serverWriteClient.fetch(
      `*[_type == "user" && email == $email][0]`,
      { email }
    );
    if (existingUser) {
      return NextResponse.json({ message: 'User already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      _type: 'user',
      name,
      email,
      hashedPassword,
      role,
      provider: 'credentials',
      image: '',
      requiresPasswordChange: true,
    };

    const createdUser = await serverWriteClient.create(newUser);
    return NextResponse.json(createdUser, { status: 201 });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
