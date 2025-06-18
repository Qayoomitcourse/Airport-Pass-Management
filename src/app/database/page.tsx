// src/app/database/page.tsx

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { client } from '@/sanity/lib/client';
import { urlFor } from '@/sanity/lib/image';
import { EmployeePass, PassCategory } from '@/app/types';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const PLACEHOLDER_AVATAR_URL = '/placeholder-avatar.png';

// --- Helper Components ---
function ActionsCell({ pass, onDelete, deleteState }: {
  pass: EmployeePass;
  onDelete: (passId: string, passName: string) => Promise<void>;
  deleteState: DeleteState;
}) {
  const { data: session } = useSession();
  const canDelete = session?.user?.role === 'admin' || session?.user?.id === pass.author?._ref;
  const isCurrentlyDeleting = deleteState.isDeleting && deleteState.deletingId === pass._id;

  return (
    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
      <div className="flex items-center space-x-2">
        <Link href={pass.category === 'cargo' ? `/cargo-id/${pass._id}` : `/landside-id/${pass._id}`} className="text-indigo-600 hover:text-indigo-800">View</Link>
        <Link href={`/add-pass?edit=${pass._id}`} className="text-green-600 hover:text-green-800">Edit</Link>
        {canDelete && (
          <button onClick={() => onDelete(pass._id, pass.name)} disabled={deleteState.isDeleting}
            className={`text-red-600 hover:text-red-800 disabled:opacity-50 ${isCurrentlyDeleting ? 'animate-pulse' : ''}`}>
            {isCurrentlyDeleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>
    </td>
  );
}

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

type DeleteState = { isDeleting: boolean; deletingId: string | null };

async function fetchPasses(): Promise<EmployeePass[]> {
  const query = `*[_type == "employeePass"] | order(_createdAt desc) { ..., "author": author->{_id, name} }`;
  try {
    const passes = await client.fetch<EmployeePass[]>(query);
    return passes || [];
  } catch (error) {
    console.error("Failed to fetch passes:", error);
    throw new Error('Unable to load employee passes.');
  }
}

const formatTablePassId = (pid: string | number | null | undefined): string =>
  String(pid || '0').padStart(4, '0');

export default function DatabasePage() {
  // --- THIS IS THE CORRECTED LINE ---
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
      const fetchedPasses = await fetchPasses();
      setPasses(fetchedPasses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = useCallback(async (passId: string, passName: string) => {
    if (!confirm(`Are you sure you want to delete pass for ${passName}?`)) return;
    try {
      setDeleteState({ isDeleting: true, deletingId: passId });
      const res = await fetch(`/api/delete-pass`, {
        method: 'POST',
        body: JSON.stringify({ id: passId }),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) throw new Error("Failed to delete pass");

      setPasses(prev => prev.filter(p => p._id !== passId));
    } catch (err) {
      console.error(err);
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
        const searchFields = [
          pass.name,
          pass.organization,
          pass.designation,
          pass.cnic?.replace(/-/g, ''),
          pass.author?.name,
          Array.isArray(pass.areaAllowed) ? pass.areaAllowed.join(' ') : null
        ].filter(Boolean);
        return searchFields.some(field => field?.toLowerCase().includes(searchTerm));
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
          <div className="flex-grow">
            <input
              type="search"
              placeholder="Search..."
              value={filters.search}
              onChange={(e) => updateSearchFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
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
                  <td className="px-4 py-3">
                    <Image
                      src={pass.photo ? urlFor(pass.photo).width(40).height(40).fit('crop').url() : PLACEHOLDER_AVATAR_URL}
                      alt={`${pass.name}'s photo`} width={40} height={40} className="rounded-full object-cover"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{pass.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{pass.designation || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{pass.organization || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">{pass.cnic || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {Array.isArray(pass.areaAllowed) && pass.areaAllowed.length > 0 ? pass.areaAllowed.join(', ') : 'N/A'}
                  </td>
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