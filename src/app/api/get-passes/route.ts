// app/api/get-passes/route.ts

import { writeClient } from '@/sanity/lib/client';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const query = `*[_type == "employeePass"] | order(_createdAt desc) {
      ..., "author": author->{_id, name}
    }`;
    const passes = await writeClient.fetch(query);
    return NextResponse.json(passes);
  } catch (error) {
    console.error('Error fetching passes from Sanity:', error);
    return new NextResponse('Unable to load employee passes.', { status: 500 });
  }
}
