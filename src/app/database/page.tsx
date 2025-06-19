// /app/database/page.tsx (UPDATED)

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { urlFor } from '@/sanity/lib/image';
import { EmployeePass as BaseEmployeePass, PassCategory } from '@/app/types';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';

const PLACEHOLDER_AVATAR_URL = '/placeholder-avatar.png';

type EmployeePass = BaseEmployeePass & {
  author?: {
    _ref?: string;
    name?: string;
  };
};

type DeleteState = { isDeleting: boolean; deletingId: string | null };

function getImageUrl(photo: string | SanityImageSource | null | undefined): string {
  if (!photo) return PLACEHOLDER_AVATAR_URL;
  if (typeof photo === 'string') return photo;
  try {
    return urlFor(photo).width(40).height(40).fit('crop').url();
  } catch {
    return PLACEHOLDER_AVATAR_URL;
  }
}

// --- THIS IS THE KEY CHANGE FOR THIS FILE ---
function ActionsCell({ pass, onDelete, deleteState }: {
  pass: EmployeePass;
  onDelete: (passId: string, passName: string) => Promise<void>;
  deleteState: DeleteState;
}) {
  const { data: session } = useSession();
  const canDelete = session?.user?.role === 'admin' || session?.user?.id === pass.author?._ref;
  const isCurrentlyDeleting = deleteState.isDeleting && deleteState.deletingId === pass._id;

  // Use the passId for the view link, but the _id for edits and deletes
  const viewId = String(pass.passId || pass._id); // Fallback to _id just in case

  return (
    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
      <div className="flex items-center space-x-2">
        {/* UPDATED LINK: Uses the human-readable passId */}
        <Link href={pass.category === 'cargo' ? `/cargo-id/${viewId}` : `/landside-id/${viewId}`} className="text-indigo-600 hover:text-indigo-800">View</Link>
        
        {/* These links correctly use the unique _id */}
        <Link href={`/add-pass?edit=${pass._id}`} className="text-green-600 hover:text-green-800">Edit</Link>
        
        {canDelete && (
          <button
            onClick={() => onDelete(pass._id, pass.name)}
            disabled={deleteState.isDeleting}
            className={`text-red-600 hover:text-red-800 disabled:opacity-50 ${isCurrentlyDeleting ? 'animate-pulse' : ''}`}
          >
            {isCurrentlyDeleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>
    </td>
  );
}
// --- END OF KEY CHANGE ---

function ErrorDisplay({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="text-center py-10 text-red-600">
      <p className="mb-4">Error: {error}</p>
      <button onClick={onRetry} className="px-4 py-2 bg-red-500 text-white rounded">Retry</button>
    </div>
  );
}

function LoadingSkeleton() {
  return <div className="text-center py-10">Loading...</div>;
}

async function fetchPasses(): Promise<EmployeePass[]> {
  try {
    const response = await fetch('/api/get-passes', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch passes: ${response.status} ${errorText}`);
    }
    const fetched: EmployeePass[] = await response.json();
    const seen = new Set<string>();
    const uniquePasses: EmployeePass[] = [];
    const duplicates: EmployeePass[] = [];
    for (const pass of fetched) {
      const key = `${pass.category}-${pass.passId}`;
      if (seen.has(key)) {
        duplicates.push(pass);
      } else {
        seen.add(key);
        uniquePasses.push(pass);
      }
    }
    if (duplicates.length > 0) {
      console.warn('🚫 Duplicate passIds detected:', duplicates.map(p => `${p.category}-${p.passId}`));
    }
    return uniquePasses;
  } catch (error) {
    console.error("Fetch error:", error);
    throw new Error('Unable to load passes. Check your connection.');
  }
}

const formatTablePassId = (pid: string | number | null | undefined): string =>
  String(pid || '0').padStart(4, '0');

export default function DatabasePage() {
  const { status } = useSession();
  const router = useRouter();
  const [passes, setPasses] = useState<EmployeePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState>({ isDeleting: false, deletingId: null });
  const [filters, setFilters] = useState({ category: 'all' as PassCategory | 'all', search: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetched = await fetchPasses();
      setPasses(fetched);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = useCallback(async (passId: string, passName: string) => {
    if (!confirm(`Delete pass for ${passName}?`)) return;
    try {
      setDeleteState({ isDeleting: true, deletingId: passId });
      const res = await fetch(`/api/delete-pass`, {
        method: 'POST',
        body: JSON.stringify({ id: passId }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error("Failed to delete pass");
      setPasses(prev => prev.filter(p => p._id !== passId));
    } catch {
      alert("An error occurred while deleting the pass.");
    } finally {
      setDeleteState({ isDeleting: false, deletingId: null });
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/');
    else if (status === 'authenticated') loadData();
  }, [status, router, loadData]);

  const filteredPasses = useMemo(() => {
    let results = passes;
    if (filters.category !== 'all') {
      results = results.filter(pass => pass.category === filters.category);
    }
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase().trim();
      results = results.filter(pass => {
        const fields = [
          pass.name,
          pass.organization,
          pass.designation,
          pass.cnic?.replace(/-/g, ''),
          pass.author?.name,
          Array.isArray(pass.areaAllowed) ? pass.areaAllowed.join(' ') : ''
        ];
        return fields.some(field => field?.toLowerCase().includes(searchTerm));
      });
    }
    return results;
  }, [passes, filters]);

  const updateCategoryFilter = (category: PassCategory | 'all') =>
    setFilters(prev => ({ ...prev, category }));
  const updateSearchFilter = (search: string) =>
    setFilters(prev => ({ ...prev, search }));

  if (status === 'loading' || loading) return <LoadingSkeleton />;
  if (error) return <ErrorDisplay error={error} onRetry={loadData} />;
  if (status !== 'authenticated') return <div className="text-center py-10"><p>Verifying session...</p></div>;

  return (
    <div className="bg-white shadow-md rounded-lg">
      <div className="p-4 border-b space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Employee Pass Database
            <span className="text-lg font-normal text-gray-500 ml-2">({filteredPasses.length})</span>
          </h1>
          <Link href="/add-pass" className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded text-sm">
            + Add New Pass
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          <input
            type="search"
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => updateSearchFilter(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
          />
          <select
            value={filters.category}
            onChange={(e) => updateCategoryFilter(e.target.value as PassCategory | 'all')}
            className="p-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Categories</option>
            <option value="cargo">Cargo</option>
            <option value="landside">Landside</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Category', 'Pass ID', 'Photo', 'Name', 'Designation', 'Organization', 'CNIC', 'Area Allowed', 'Date of Entry', 'Expiry Date', 'Created By', 'Actions'].map(header => (
                <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPasses.length > 0 ? (
              filteredPasses.map(pass => (
                <tr key={pass._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">{pass.category}</span></td>
                  <td className="px-4 py-3 font-medium">{formatTablePassId(pass.passId)}</td>
                  <td className="px-4 py-3"><Image src={getImageUrl(pass.photo)} alt={`${pass.name}'s photo`} width={40} height={40} className="rounded-full object-cover"/></td>
                  <td className="px-4 py-3 font-medium">{pass.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{pass.designation}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{pass.organization}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">{pass.cnic}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{pass.areaAllowed?.join(', ')}</td>
                  <td className="px-4 py-3 text-sm">{pass.dateOfEntry ? format(new Date(pass.dateOfEntry), 'dd-MM-yyyy') : 'N/A'}</td>
                  <td className="px-4 py-3 text-sm">{pass.dateOfExpiry ? format(new Date(pass.dateOfExpiry), 'dd-MM-yyyy') : 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{pass.author?.name || 'System'}</td>
                  <ActionsCell pass={pass} onDelete={handleDelete} deleteState={deleteState} />
                </tr>
              ))
            ) : (
              <tr><td colSpan={12} className="text-center py-10 text-gray-500">No passes found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}