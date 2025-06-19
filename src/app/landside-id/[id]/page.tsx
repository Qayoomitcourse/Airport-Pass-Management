// app/landside-id/[id]/page.tsx (DEFINITIVELY CORRECTED)

import { client } from '@/sanity/lib/client';
import { urlFor } from '@/sanity/lib/image';
import { EmployeePass } from '@/app/types';
import Image from 'next/image';
import { notFound } from 'next/navigation';

// FIX 1: Restore the PageProps to expect a Promise for params
interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  // FIX 2: Restore the 'await' to correctly get the id from the Promise
  const { id } = await params;

  // This query is correct: Fetch by 'passId' instead of '_id'
  const pass = await client.fetch<EmployeePass | null>(
    `*[_type == "employeePass" && passId == $id][0]`,
    { id } 
  );

  if (!pass) return notFound();

  const currentDate = new Date();
  const expiryDate = new Date(pass.dateOfExpiry || '');
  const isExpired = isNaN(expiryDate.getTime()) ? false : currentDate > expiryDate;

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-GB');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 py-4 px-3">
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/90 rounded-2xl mb-4 shadow-lg border border-white/30">
            <Image
              src="/logo.png"
              alt="Logo"
              width={50}
              height={50}
              className="object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-white drop-shadow-lg">Landside Access Pass</h1>
          <div className="w-20 h-1 bg-white/40 mx-auto rounded-full mt-2"></div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
          <div className={`px-6 py-4 ${isExpired ? 'bg-red-700' : 'bg-green-700'}`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-black text-white leading-tight">{pass.name}</h2>
                <p className={`text-sm font-bold mt-1 ${isExpired ? 'text-red-100' : 'text-green-100'}`}>
                  {pass.designation}
                </p>
                <p className={`text-xs font-bold ${isExpired ? 'text-red-200' : 'text-green-200'}`}>
                  {pass.organization}
                </p>
              </div>
              <div className={`ml-3 px-4 py-2 rounded-xl shadow-lg ${isExpired ? 'bg-red-500/30 border border-red-300' : 'bg-green-500/30 border border-green-300'}`}>
                <div className="flex items-center">
                  <div className={`w-3 h-3 mr-2 rounded-full animate-pulse ${isExpired ? 'bg-red-200' : 'bg-white'}`}></div>
                  <p className={`text-sm font-black ${isExpired ? 'text-red-100' : 'text-white'}`}>
                    {isExpired ? 'EXPIRED' : 'ACTIVE'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-5">
            {/* Photo */}
            <div className="text-center mb-5">
              {pass.photo ? (
                <Image
                  src={urlFor(pass.photo).width(120).height(120).url()}
                  alt={pass.name}
                  width={120}
                  height={120}
                  className={`rounded-2xl shadow-lg border-4 ${isExpired ? 'border-red-200 grayscale' : 'border-white'}`}
                />
              ) : (
                <div className="w-30 h-30 bg-orange-200 rounded-2xl flex items-center justify-center shadow-lg border-3 border-white">
                  <svg className="w-12 h-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>

            {/* CNIC */}
            <div className="bg-white rounded-2xl p-4 border-2 border-gray-300 shadow-lg mb-5 text-center">
              <p className={`text-sm font-black uppercase ${isExpired ? 'text-red-600' : 'text-green-600'}`}>
                CNIC Number
              </p>
              <p className="text-lg font-black text-gray-900 font-mono">{pass.cnic}</p>
            </div>

            {/* Authorized Areas */}
            {pass.areaAllowed?.length > 0 && (
              <div className={`rounded-2xl p-4 border-2 shadow-lg mb-4 ${isExpired ? 'border-red-400' : 'border-green-400'}`}>
                <h3 className={`text-base font-black mb-3 uppercase ${isExpired ? 'text-red-700' : 'text-green-700'}`}>Authorized Areas</h3>
                <div className="flex flex-wrap gap-2">
                  {pass.areaAllowed.map((area, idx) => (
                    <span key={idx} className={`px-3 py-2 rounded-full text-sm font-black border-2 shadow ${isExpired ? 'bg-red-50 text-red-800 border-red-400' : 'bg-green-50 text-green-800 border-green-400'}`}>
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className={`rounded-2xl p-4 border-2 shadow-lg ${isExpired ? 'border-red-400' : 'border-green-400'}`}>
                <p className={`text-xs font-black uppercase mb-1 ${isExpired ? 'text-red-700' : 'text-green-700'}`}>
                  Issue Date
                </p>
                <p className="text-sm font-black text-gray-900">{formatDate(pass.dateOfEntry)}</p>
              </div>
              <div className={`rounded-2xl p-4 border-2 shadow-lg ${isExpired ? 'border-red-500' : 'border-amber-400'}`}>
                <p className={`text-xs font-black uppercase mb-1 ${isExpired ? 'text-red-700' : 'text-amber-700'}`}>
                  Expiry
                </p>
                <p className={`text-sm font-black ${isExpired ? 'text-red-900' : 'text-gray-900'}`}>{formatDate(pass.dateOfExpiry)}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-800 px-5 py-4 border-t-2 border-gray-300 flex justify-between text-sm">
            <span className={`font-black ${isExpired ? 'text-red-300' : 'text-green-300'}`}>
              {isExpired ? 'ACCESS DENIED' : 'LANDSIDE AUTHORIZED'}
            </span>
            <span className={`font-black ${isExpired ? 'text-red-300' : 'text-white'}`}>
              {isExpired ? 'EXPIRED' : 'VERIFIED'}
            </span>
          </div>
        </div>

        {/* Notice */}
        <div className={`mt-4 rounded-2xl p-3 text-sm border ${isExpired ? 'bg-red-500/20 border-red-300/30' : 'bg-white/20 border-white/20'} text-white`}>
          {isExpired
            ? 'Pass Expired • Contact Administrator for Renewal'
            : 'Valid ID required • Authorization mandatory'}
        </div>
      </div>
    </div>
  );
}


export async function generateMetadata({ params }: PageProps) {
  // FIX 3: Restore the 'await' here as well
  const { id } = await params;

  // This query remains correct
  const pass = await client.fetch<EmployeePass | null>(
    `*[_type == "employeePass" && passId == $id][0]{name}`,
    { id }
  );

  return {
    title: pass?.name ? `${pass.name} - Landside Access Pass` : 'Landside Access Pass',
    description: `Employee access pass for ${pass?.name || 'landside area'}`,
  };
}