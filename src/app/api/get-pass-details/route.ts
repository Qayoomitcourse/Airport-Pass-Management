// /app/api/get-pass-details/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth'
import { client } from '@/sanity/lib/client';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the pass ID from query parameters
    const { searchParams } = new URL(request.url);
    const passId = searchParams.get('id');

    if (!passId) {
      return NextResponse.json({ error: 'Pass ID is required' }, { status: 400 });
    }

    // Convert passId to number if it's numeric for comparison
    const numericPassId = !isNaN(Number(passId)) ? Number(passId) : null;
    
    // Query to find by passId (as number) or _id (as string)
    const query = `
      *[_type == "employeePass" && (passId == $numericPassId || _id == $passIdStr)][0] {
        _id,
        _createdAt,
        _updatedAt,
        passId,
        name,
        designation,
        organization,
        department,
        employeeId,
        cnic,
        contactNumber,
        address,
        photo,
        category,
        areaAllowed,
        dateOfEntry,
        dateOfExpiry,
        status,
        accessLevel,
        securityClearance,
        remarks,
        author-> {
          _id,
          _ref,
          name
        }
      }
    `;

    const employeePass = await client.fetch(query, { 
      numericPassId, 
      passIdStr: passId 
    });

    if (!employeePass) {
      return NextResponse.json({ error: 'Employee pass not found' }, { status: 404 });
    }

    return NextResponse.json(employeePass);
  } catch (error) {
    console.error('Error fetching employee pass details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}