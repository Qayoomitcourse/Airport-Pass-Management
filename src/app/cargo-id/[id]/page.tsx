'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { urlFor } from '@/sanity/lib/image';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';

const PLACEHOLDER_AVATAR_URL = '/placeholder-avatar.png';

interface EmployeeDetailsType {
  _id: string;
  _createdAt?: string;
  _updatedAt?: string;
  name: string;
  cnic?: string;
  designation: string;
  organization: string;
  passId?: number;
  category: string;
  photo?: string | SanityImageSource;
  dateOfEntry?: string;
  dateOfExpiry?: string;
  areaAllowed?: string[];
  status?: string;
  author?: {
    _ref?: string;
    name?: string;
  };
}

function getImageUrl(photo: string | SanityImageSource | null | undefined): string {
  if (!photo || (typeof photo === 'object' && !('asset' in photo))) {
    return PLACEHOLDER_AVATAR_URL;
  }
  try {
    return urlFor(photo).width(400).height(400).fit('crop').url();
  } catch {
    return PLACEHOLDER_AVATAR_URL;
  }
}

function formatDateSafely(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  try {
    return format(date, 'dd MMMM yyyy');
  } catch {
    return 'Format Error';
  }
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading employee details...</p>
      </div>
    </div>
  );
}

function ErrorMessage({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h3>
        <p className="text-gray-600 mb-6">{error}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onRetry}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Try Again
          </button>
          <Link
            href="/database"
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Back to Database
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, expiryDate }: { status?: string; expiryDate?: string | null }) {
  const isExpired = expiryDate ? new Date(expiryDate) < new Date() : false;
  const actualStatus = isExpired ? 'expired' : (status || 'active');
  
  const statusStyles = {
    active: 'bg-green-100 text-green-800 border-green-200',
    expired: 'bg-red-100 text-red-800 border-red-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    suspended: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const style = statusStyles[actualStatus as keyof typeof statusStyles] || statusStyles.pending;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${style}`}>
      {actualStatus.charAt(0).toUpperCase() + actualStatus.slice(1)}
    </span>
  );
}

function InfoCard({ title, children, icon }: { title: string; children: React.ReactNode; icon: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-lg">{icon}</span>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

function InfoField({ label, value, mono = false }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-500 mb-1">
        {label}
      </label>
      <p className={`text-gray-900 ${mono ? 'font-mono text-sm bg-gray-50 px-3 py-2 rounded border' : 'font-medium'}`}>
        {value}
      </p>
    </div>
  );
}

export default function EmployeeDetailsPage() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [employee, setEmployee] = useState<EmployeeDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const employeeId = params.id as string;
  const isCargoPage = pathname.includes('/cargo-id/');
  const pageType = isCargoPage ? 'cargo' : 'landside';

  const fetchEmployeeDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/get-pass-details?id=${employeeId}`, {
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch employee details: ${response.status}`);
      }
      
      const data = await response.json();
      setEmployee(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employee details');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/');
      return;
    }
    
    if (sessionStatus === 'authenticated' && employeeId) {
      fetchEmployeeDetails();
    }
  }, [sessionStatus, employeeId, router, fetchEmployeeDetails]);

  if (sessionStatus === 'loading' || loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage error={error} onRetry={fetchEmployeeDetails} />;
  }

  if (!employee) {
    return <ErrorMessage error="Employee not found" onRetry={fetchEmployeeDetails} />;
  }

  const isExpired = employee.dateOfExpiry ? new Date(employee.dateOfExpiry) < new Date() : false;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/database" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6 group">
            <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Back to Database</span>
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Details</h1>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {pageType.charAt(0).toUpperCase() + pageType.slice(1)} Pass
                </span>
                <span className="text-gray-500 font-mono">
                  #{String(employee.passId || employee._id).padStart(4, '0')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-12">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              <div className="flex-shrink-0">
                <Image
                  src={getImageUrl(employee.photo)}
                  alt={`${employee.name}'s photo`}
                  width={160}
                  height={160}
                  className="rounded-full border-4 border-white shadow-lg object-cover"
                />
              </div>
              
              <div className="text-white text-center md:text-left flex-1">
                <h2 className="text-4xl font-bold mb-2">{employee.name}</h2>
                <p className="text-xl text-blue-100 mb-1">{employee.designation}</p>
                <p className="text-lg text-blue-200 mb-6">{employee.organization}</p>
                
                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                  <StatusBadge status={employee.status} expiryDate={employee.dateOfExpiry} />
                  {employee.dateOfExpiry && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                      isExpired 
                        ? 'bg-red-100 text-red-800 border-red-200' 
                        : 'bg-white text-gray-800 border-gray-200'
                    }`}>
                      {isExpired ? 'Expired: ' : 'Expires: '}{formatDateSafely(employee.dateOfExpiry)}
                    </span>
                  )}
                  <span className="px-3 py-1 bg-white bg-opacity-20 text-white rounded-full text-sm font-medium border border-white border-opacity-30">
                    {employee.category?.charAt(0).toUpperCase() + employee.category?.slice(1)} Access
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Personal Information */}
          <InfoCard title="Personal Information" icon="👤">
            <div className="space-y-4">
              <InfoField label="Full Name" value={employee.name} />
              <InfoField label="CNIC Number" value={employee.cnic || 'N/A'} mono />
            </div>
          </InfoCard>

          {/* Employment Information */}
          <InfoCard title="Employment Details" icon="💼">
            <div className="space-y-4">
              <InfoField label="Designation" value={employee.designation} />
              <InfoField label="Organization" value={employee.organization} />
              <InfoField label="Employee ID" value={employee.passId?.toString() || 'N/A'} mono />
            </div>
          </InfoCard>

          {/* Pass Information */}
          <InfoCard title="Pass Information" icon="🎫">
            <div className="space-y-4">
              <InfoField 
                label="Pass ID" 
                value={String(employee.passId || employee._id).padStart(4, '0')} 
                mono 
              />
              <InfoField label="Pass Type" value={employee.category?.toUpperCase() || 'N/A'} />
              <InfoField label="Date of Entry" value={formatDateSafely(employee.dateOfEntry)} />
              <InfoField label="Date of Expiry" value={formatDateSafely(employee.dateOfExpiry)} />
            </div>
          </InfoCard>

          {/* Access Information */}
          <InfoCard title="Access Permissions" icon="🔐">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-3">
                Authorized Areas
              </label>
              {employee.areaAllowed && employee.areaAllowed.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {employee.areaAllowed.map((area, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                    >
                      📍 {area}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                  <p className="text-gray-500 font-medium">No specific areas assigned</p>
                  <p className="text-sm text-gray-400 mt-1">Contact administrator for area permissions</p>
                </div>
              )}
            </div>
          </InfoCard>
        </div>

        {/* System Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <span className="text-lg">⚙️</span>
              <h3 className="text-lg font-semibold text-gray-900">System Information</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InfoField label="Created By" value={employee.author?.name || 'System'} />
              <InfoField label="Created Date" value={formatDateSafely(employee._createdAt)} />
              <InfoField label="Last Updated" value={formatDateSafely(employee._updatedAt)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}