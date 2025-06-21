// /app/database/page.tsx (CORRECTED)

'use client';

import { useEffect, useState, useMemo, useCallback, ChangeEvent, useRef } from 'react';
import { urlFor } from '@/sanity/lib/image';
import { EmployeePass as BaseEmployeePass, PassCategory } from '@/app/types';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';

const PLACEHOLDER_AVATAR_URL = '/placeholder-avatar.png';
type EmployeePass = BaseEmployeePass & { author?: { _ref?: string; name?: string; }; };
type DeleteState = { isDeleting: boolean; deletingId: string | null; };

function getImageUrl(photo: string | SanityImageSource | null | undefined): string {
  if (!photo || (typeof photo === 'object' && !('asset' in photo))) {
    return PLACEHOLDER_AVATAR_URL;
  }
  try {
    return urlFor(photo).width(40).height(40).fit('crop').url();
  } catch {
    return PLACEHOLDER_AVATAR_URL;
  }
}

// --- FIX IS HERE: Part 1 ---
// This component correctly returns a <td> as its root element.
// This is good practice for a component named "Cell".
function ActionsCell({ pass, onDelete, deleteState }: { pass: EmployeePass; onDelete: (passId: string, passName: string) => Promise<void>; deleteState: DeleteState; }) {
  const { data: session } = useSession();
  const canDelete = session?.user?.role === 'admin' || session?.user?.id === pass.author?._ref;
  const isCurrentlyDeleting = deleteState.isDeleting && deleteState.deletingId === pass._id;
  const viewId = String(pass.passId || pass._id);
  
  return (
    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
      <div className="flex items-center space-x-2">
        <Link href={pass.category === 'cargo' ? `/cargo-id/${viewId}` : `/landside-id/${viewId}`} className="text-indigo-600 hover:text-indigo-800">View</Link>
        <Link href={`/add-pass?edit=${pass._id}`} className="text-green-600 hover:text-green-800">Edit</Link>
        {canDelete && (
          <button onClick={() => onDelete(pass._id, pass.name)} disabled={deleteState.isDeleting} className={`text-red-600 hover:text-red-800 disabled:opacity-50 ${isCurrentlyDeleting ? 'animate-pulse' : ''}`}>
            {isCurrentlyDeleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>
    </td>
  );
}


function ErrorDisplay({ error, onRetry }: { error: string; onRetry: () => void }) { return ( <div className="text-center py-10 text-red-600"> <p className="mb-4">Error: {error}</p> <button onClick={onRetry} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"> Retry </button> </div> ); }
function LoadingSkeleton() { return ( <div className="text-center py-20"> <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div> <p className="mt-4 text-gray-600">Loading Passes...</p> </div> ); }
async function fetchPasses(): Promise<EmployeePass[]> { const response = await fetch('/api/get-passes', { cache: 'no-store' }); if (!response.ok) throw new Error(`Failed to fetch passes: ${response.status}`); return await response.json(); }
const formatTablePassId = (pid: string | number | null | undefined): string => String(pid || '0').padStart(4, '0');
function formatDateSafely(dateString: string | null | undefined): string { if (!dateString) return 'N/A'; const date = new Date(dateString); if (isNaN(date.getTime())) { console.warn(`Invalid date value encountered: "${dateString}"`); return 'Invalid Date'; } try { return format(date, 'dd-MM-yyyy'); } catch (error) { console.error(`Error formatting date: "${dateString}"`, error); return 'Format Error'; } }


export default function DatabasePage() {
  const { status } = useSession();
  const router = useRouter();
  const [passes, setPasses] = useState<EmployeePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState>({ isDeleting: false, deletingId: null });
  const [filters, setFilters] = useState({ category: 'all' as PassCategory | 'all', search: '' });
  const [selectedPassIds, setSelectedPassIds] = useState<Set<string>>(new Set());
  const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null);

  const loadData = useCallback(async () => { setLoading(true); setError(null); try { setPasses(await fetchPasses()); } catch(err) { setError(err instanceof Error ? err.message : 'An unknown error occurred.'); } finally { setLoading(false); } }, []);
  const handleDelete = useCallback(async (passId: string, passName: string) => { if (!confirm(`Are you sure you want to delete the pass for ${passName}?`)) return; setDeleteState({ isDeleting: true, deletingId: passId }); try { const res = await fetch(`/api/delete-pass`, { method: 'POST', body: JSON.stringify({ ids: [passId] }), headers: { 'Content-Type': 'application/json' } }); if (!res.ok) throw new Error("Failed to delete pass"); setPasses(prev => prev.filter(p => p._id !== passId)); setSelectedPassIds(prev => { const newSet = new Set(prev); newSet.delete(passId); return newSet; }); } catch { alert("An error occurred while deleting the pass."); } finally { setDeleteState({ isDeleting: false, deletingId: null }); } }, []);
  const handleBulkDelete = useCallback(async () => { if (selectedPassIds.size === 0 || !confirm(`Are you sure you want to delete ${selectedPassIds.size} selected pass(es)?`)) return; setLoading(true); try { const idsToDelete = Array.from(selectedPassIds); const res = await fetch('/api/delete-pass', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: idsToDelete }) }); const result = await res.json(); if (!res.ok) throw new Error(result.error || result.details || 'Failed to delete passes.'); alert(result.message + (result.details ? `\n${result.details}` : '')); setPasses(prev => prev.filter(p => !selectedPassIds.has(p._id))); setSelectedPassIds(new Set()); } catch (err) { alert(`Error: ${err instanceof Error ? err.message : 'An unknown error occurred'}`); } finally { setLoading(false); } }, [selectedPassIds]);
  const filteredPasses = useMemo(() => { return passes .filter(pass => filters.category === 'all' || pass.category === filters.category) .filter(pass => { if (!filters.search) return true; const searchTerm = filters.search.toLowerCase().trim(); const fieldsToSearch = [ pass.name, pass.organization, pass.designation, pass.cnic?.replace(/-/g, ''), pass.author?.name, String(pass.passId), Array.isArray(pass.areaAllowed) ? pass.areaAllowed.join(' ') : '' ]; return fieldsToSearch.some(field => field?.toLowerCase().includes(searchTerm)); }); }, [passes, filters]);
  useEffect(() => { if (selectAllCheckboxRef.current) { const numSelected = selectedPassIds.size; const numFiltered = filteredPasses.length; selectAllCheckboxRef.current.indeterminate = numSelected > 0 && numSelected < numFiltered; } }, [selectedPassIds, filteredPasses]);
  useEffect(() => { if (status === 'unauthenticated') router.push('/'); else if (status === 'authenticated') loadData(); }, [status, router, loadData]);
  const handleSelectAll = (e: ChangeEvent<HTMLInputElement>) => { if (e.target.checked) setSelectedPassIds(new Set(filteredPasses.map(p => p._id))); else setSelectedPassIds(new Set()); };
  const handleSelectSingle = (passId: string, isChecked: boolean) => { setSelectedPassIds(prev => { const newSet = new Set(prev); if (isChecked) newSet.add(passId); else newSet.delete(passId); return newSet; }); };
  if (status === 'loading' || loading) return <LoadingSkeleton />;
  if (error) return <ErrorDisplay error={error} onRetry={loadData} />;
  if (status !== 'authenticated') return <div className="text-center py-10"><p>Access Denied. Please log in.</p></div>;

  let tableBodyContent;
  if (filteredPasses.length > 0) {
    tableBodyContent = filteredPasses.map(pass => (
      <tr key={pass._id} className={selectedPassIds.has(pass._id) ? 'bg-blue-50' : 'hover:bg-gray-50'}>
        <td className="px-4 py-3">
          <input type="checkbox" checked={selectedPassIds.has(pass._id)} onChange={(e) => handleSelectSingle(pass._id, e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
        </td>
        <td className="px-4 py-3"><span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">{pass.category}</span></td>
        <td className="px-4 py-3 font-medium text-gray-800 font-mono">{formatTablePassId(pass.passId)}</td>
        <td className="px-4 py-3"><Image src={getImageUrl(pass.photo)} alt={`${pass.name}'s photo`} width={40} height={40} className="rounded-full object-cover"/></td>
        <td className="px-4 py-3 font-medium text-gray-900">{pass.name}</td>
        <td className="px-4 py-3 text-sm text-gray-500">{pass.designation}</td>
        <td className="px-4 py-3 text-sm text-gray-500">{pass.organization}</td>
        <td className="px-4 py-3 text-sm text-gray-500 font-mono">{pass.cnic}</td>
        <td className="px-4 py-3 text-sm text-gray-500">{pass.areaAllowed?.join(', ')}</td>
        <td className="px-4 py-3 text-sm">{formatDateSafely(pass.dateOfEntry)}</td>
        <td className="px-4 py-3 text-sm">{formatDateSafely(pass.dateOfExpiry)}</td>
        <td className="px-4 py-3 text-sm text-gray-500">{pass.author?.name || 'System'}</td>
        
        {/* --- FIX IS HERE: Part 2 --- */}
        {/* The wrapping <td> has been removed from around the ActionsCell component. */}
        <ActionsCell pass={pass} onDelete={handleDelete} deleteState={deleteState} />
      </tr>
    ));
  } else {
    tableBodyContent = (
      <tr>
        <td colSpan={13} className="text-center py-10 text-gray-500">
          No passes found for the selected filters.
        </td>
      </tr>
    );
  }

  const tableHeaders = ['Category', 'Pass ID', 'Photo', 'Name', 'Designation', 'Organization', 'CNIC', 'Area Allowed', 'Entry Date', 'Expiry Date', 'Created By', 'Actions'];

  return (
    <div className="bg-white shadow-md rounded-lg m-4">
       <div className="p-4 border-b space-y-4"> <div className="flex justify-between items-center"> <h1 className="text-2xl font-bold text-gray-900"> Employee Pass Database <span className="text-lg font-normal text-gray-500">({filteredPasses.length})</span> </h1> <div className="flex items-center space-x-2"> {selectedPassIds.size > 0 && ( <button onClick={handleBulkDelete} className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded text-sm transition-opacity"> Delete Selected ({selectedPassIds.size}) </button> )} <Link href="/bulk-add-passes" className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded text-sm">Bulk Add</Link> <Link href="/add-pass" className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded text-sm">+ Add New Pass</Link> </div> </div> <div className="flex items-center space-x-4"> <input type="search" placeholder="Search by name, CNIC, pass ID, etc..." value={filters.search} onChange={(e) => setFilters(prev => ({...prev, search: e.target.value}))} className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"/> <select value={filters.category} onChange={(e) => setFilters(prev => ({...prev, category: e.target.value as PassCategory | 'all'}))} className="p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"> <option value="all">All Categories</option> <option value="cargo">Cargo</option> <option value="landside">Landside</option> </select> </div> </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3">
                <input ref={selectAllCheckboxRef} type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" onChange={handleSelectAll} checked={filteredPasses.length > 0 && selectedPassIds.size === filteredPasses.length} />
              </th>
              {tableHeaders.map(header => (
                <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tableBodyContent}
          </tbody>
        </table>
      </div>
    </div>
  );
}