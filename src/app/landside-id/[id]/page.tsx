// app/landside-id/[id]/page.tsx
import { client } from '@/sanity/lib/client';
import { urlFor } from '@/sanity/lib/image';
import { EmployeePass } from '@/app/types';
import Image from 'next/image';

type Props = {
  params: {
    id: string;
  };
};

export default async function LandsideIdPage({ params }: Props) {
  const pass: EmployeePass = await client.fetch(
    `*[_type == "employeePass" && _id == $id][0]`,
    { id: params.id }
  );

  if (!pass) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 flex items-center justify-center p-3">
        <div className="bg-white rounded-2xl shadow-xl p-6 text-center max-w-sm mx-auto border border-gray-200">
          <div className="w-14 h-14 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Pass Not Found</h2>
          <p className="text-gray-600 text-sm">Landside pass could not be located</p>
        </div>
      </div>
    );
  }

  // Check if pass is expired
  const currentDate = new Date();
  const expiryDate = new Date(pass.dateOfExpiry);
  const isExpired = currentDate > expiryDate;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 py-4 px-3">
      <div className="max-w-sm mx-auto">
        {/* Header with PAA Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/90 backdrop-blur-lg rounded-2xl mb-4 shadow-lg border border-white/30">
            <Image
              src="/logo.png"
              alt="PAA Logo"
              width={50}
              height={50}
              className="object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">Landside Access Pass</h1>
          <div className="w-20 h-1 bg-white/40 mx-auto rounded-full"></div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
          {/* Header Strip */}
          <div className={`px-6 py-4 ${isExpired 
            ? 'bg-gradient-to-r from-red-600 via-red-700 to-red-800' 
            : 'bg-gradient-to-r from-green-600 via-emerald-700 to-teal-700'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-black text-white leading-tight drop-shadow-lg">{pass.name}</h2>
                <p className={`text-sm font-bold mt-1 drop-shadow ${isExpired ? 'text-red-100' : 'text-green-100'}`}>
                  {pass.designation}
                </p>
                <p className={`text-xs font-bold drop-shadow ${isExpired ? 'text-red-200' : 'text-green-200'}`}>
                  {pass.organization}
                </p>
              </div>
              <div className={`backdrop-blur-sm rounded-xl px-4 py-2 ml-3 shadow-lg ${isExpired 
                ? 'bg-red-500/30 border border-red-300/50' 
                : 'bg-green-500/30 border border-green-300/50'
              }`}>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 shadow-sm ${isExpired 
                    ? 'bg-red-200 animate-pulse' 
                    : 'bg-white animate-pulse'
                  }`}></div>
                  <p className={`text-sm font-black tracking-wide ${isExpired ? 'text-red-100' : 'text-white'}`}>
                    {isExpired ? 'EXPIRED' : 'ACTIVE'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            {/* Photo */}
            <div className="text-center mb-5">
              <div className="relative inline-block">
                {pass.photo ? (
                  <div className="relative">
                    <Image
                      src={urlFor(pass.photo).width(150).height(150).url()}
                      alt={pass.name}
                      width={150}
                      height={150}
                      className={`rounded-2xl shadow-lg border-3 ${isExpired ? 'border-red-200 grayscale' : 'border-white'}`}
                    />
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-lg ${
                      isExpired 
                        ? 'bg-gradient-to-r from-red-400 to-red-500' 
                        : 'bg-gradient-to-r from-green-400 to-emerald-500'
                    }`}>
                      {isExpired ? (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="w-30 h-30 bg-gradient-to-br from-orange-200 to-red-300 rounded-2xl flex items-center justify-center shadow-lg border-3 border-white">
                    <svg className="w-12 h-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* CNIC */}
            <div className="bg-white rounded-2xl p-4 border-2 border-gray-300 shadow-lg mb-5">
              <div className="text-center">
                <p className={`text-sm font-black uppercase tracking-wider ${isExpired ? 'text-red-600' : 'text-green-600'}`}>
                  CNIC Number
                </p>
                <p className="text-lg font-black text-gray-900 font-mono tracking-wider mt-1">{pass.cnic}</p>
              </div>
            </div>

            {/* Access Areas */}
            <div className={`rounded-2xl p-4 border-2 shadow-lg mb-4 ${isExpired 
              ? 'bg-white border-red-400' 
              : 'bg-white border-green-400'
            }`}>
              <h3 className={`text-base font-black mb-3 uppercase tracking-wide ${isExpired ? 'text-red-700' : 'text-green-700'}`}>Authorized Areas</h3>
              <div className="flex flex-wrap gap-2">
                {pass.areaAllowed?.map((area, index) => (
                  <span
                    key={index}
                    className={`px-3 py-2 rounded-full text-sm font-black border-2 shadow-md ${isExpired 
                      ? 'bg-red-50 text-red-800 border-red-400' 
                      : 'bg-green-50 text-green-800 border-green-400'
                    }`}
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className={`rounded-2xl p-4 border-2 shadow-lg ${isExpired 
                ? 'bg-white border-red-400' 
                : 'bg-white border-green-400'
              }`}>
                <div className="flex items-center mb-1">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center mr-2 shadow-sm ${isExpired 
                    ? 'bg-red-500' 
                    : 'bg-green-500'
                  }`}>
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className={`text-xs font-black uppercase tracking-wide ${isExpired ? 'text-red-700' : 'text-green-700'}`}>
                    Issue Date
                  </p>
                </div>
                <p className="text-sm font-black text-gray-900">{pass.dateOfEntry}</p>
              </div>

              <div className={`rounded-2xl p-4 border-2 shadow-lg ${isExpired 
                ? 'bg-white border-red-500' 
                : 'bg-white border-amber-400'
              }`}>
                <div className="flex items-center mb-1">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center mr-2 shadow-sm ${isExpired 
                    ? 'bg-red-500' 
                    : 'bg-amber-500'
                  }`}>
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
                    </svg>
                  </div>
                  <p className={`text-xs font-black uppercase tracking-wide ${isExpired ? 'text-red-700' : 'text-amber-700'}`}>
                    Expiry
                  </p>
                </div>
                <p className={`text-sm font-black ${isExpired ? 'text-red-900' : 'text-gray-900'}`}>
                  {pass.dateOfExpiry}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-800 px-5 py-4 border-t-2 border-gray-300">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 shadow-sm ${isExpired 
                  ? 'bg-red-400 animate-pulse' 
                  : 'bg-green-400 animate-pulse'
                }`}></div>
                <span className={`font-black text-sm ${isExpired ? 'text-red-300' : 'text-green-300'}`}>
                  {isExpired ? 'ACCESS DENIED' : 'LANDSIDE AUTHORIZED'}
                </span>
              </div>
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2V9a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className={`font-black text-sm ${isExpired ? 'text-red-300' : 'text-white'}`}>
                  {isExpired ? 'EXPIRED' : 'VERIFIED'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Notice */}
        <div className={`mt-4 backdrop-blur-lg rounded-2xl p-3 border ${isExpired 
          ? 'bg-red-500/20 border-red-300/30' 
          : 'bg-white/20 border-white/20'
        }`}>
          <div className="flex items-center text-sm text-white">
            <svg className={`w-4 h-4 mr-2 ${isExpired ? 'text-red-200' : 'text-yellow-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
            </svg>
            <span className="font-medium leading-relaxed">
              {isExpired 
                ? 'Pass Expired • Contact Administrator for Renewal' 
                : 'Valid ID required • Authorization mandatory'
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}