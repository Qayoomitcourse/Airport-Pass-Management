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

// --- TYPE DEFINITIONS & HELPERS ---
const PLACEHOLDER_AVATAR_URL = '/placeholder-avatar.png';
type EmployeePass = BaseEmployeePass & { _createdAt?: string; author?: { _ref?: string; name?: string; }; };
type DeleteState = { isDeleting: boolean; deletingId: string | null; };
type SortOrder = 'createdAt_desc' | 'passId_asc' | 'passId_desc' | 'name_asc' | 'expiry_asc';

function getImageUrl(photo: string | SanityImageSource | null | undefined): string {
  if (!photo || (typeof photo === 'object' && !('asset' in photo))) return PLACEHOLDER_AVATAR_URL;
  try {
    return urlFor(photo).width(40).height(40).fit('crop').url();
  } catch {
    return PLACEHOLDER_AVATAR_URL;
  }
}

// Function to get high-resolution image URL for downloads
function getHighResImageUrl(photo: string | SanityImageSource | null | undefined): string {
  if (!photo || (typeof photo === 'object' && !('asset' in photo))) return PLACEHOLDER_AVATAR_URL;
  try {
    return urlFor(photo).width(800).height(800).fit('crop').url();
  } catch {
    return PLACEHOLDER_AVATAR_URL;
  }
}

const formatTablePassId = (pid: string | number | null | undefined): string => String(pid || '0').padStart(4, '0');

function formatDateSafely(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  try {
    return format(date, 'dd-MM-yyyy');
  } catch  {
    return 'Format Error';
  }
}

// --- HELPER COMPONENTS ---
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

// Enhanced Photo Cell with Download Button
function PhotoCell({ pass }: { pass: EmployeePass }) {
  const [isHovered, setIsHovered] = useState(false);
  
  const handleDownloadPhoto = async () => {
    try {
      const imageUrl = getHighResImageUrl(pass.photo);
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${pass.name.replace(/[^a-zA-Z0-9]/g, '_')}_${formatTablePassId(pass.passId)}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch  {
      console.error('Error downloading photo:');
      alert('Failed to download photo. Please try again.');
    }
  };

  return (
    <td className="px-4 py-3 relative">
      <div 
        className="relative inline-block"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Image 
          src={getImageUrl(pass.photo)} 
          alt={`${pass.name}'s photo`} 
          width={40} 
          height={40} 
          className="rounded-full object-cover"
        />
        {isHovered && (
          <button
            onClick={handleDownloadPhoto}
            className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white hover:bg-opacity-70 transition-all duration-200"
            title="Download Photo"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
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
      <button onClick={onRetry} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"> 
        Retry 
      </button> 
    </div> 
  ); 
}

function LoadingSkeleton() { 
  return ( 
    <div className="text-center py-20"> 
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div> 
      <p className="mt-4 text-gray-600">Loading Passes...</p> 
    </div> 
  ); 
}

// --- MAIN COMPONENT ---
export default function DatabasePage() {
  const { status } = useSession();
  const router = useRouter();
  const [passes, setPasses] = useState<EmployeePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState>({ isDeleting: false, deletingId: null });
  const [filters, setFilters] = useState({ category: 'all' as PassCategory | 'all', search: '' });
  const [selectedPassIds, setSelectedPassIds] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<SortOrder>('createdAt_desc');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/get-passes', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Failed to fetch passes: ${response.statusText}`);
      const data = await response.json();
      setPasses(data);
    } catch(err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/');
    else if (status === 'authenticated') loadData();
  }, [status, router, loadData]);

const handleDelete = useCallback(async (passId: string, passName: string) => {
    if (!window.confirm(`Are you sure you want to delete the pass for ${passName}? This action cannot be undone.`)) {
        return;
    }
    
    setDeleteState({ isDeleting: true, deletingId: passId });
    setError(null);
    
    try {
        const response = await fetch('/api/delete-pass', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: passId }),
        });

        // Check if response has content before parsing JSON
        let result;
        const text = await response.text();
        
        if (text) {
            try {
                result = JSON.parse(text);
            } catch (parseError) {
                throw new Error(`Invalid JSON response: ${text}`);
            }
        } else {
            throw new Error('Empty response from server');
        }

        if (!response.ok) {
            throw new Error(result?.error || `Server error: ${response.status} ${response.statusText}`);
        }
        
        // Success - remove the pass from local state
        setPasses(prevPasses => prevPasses.filter(p => p._id !== passId));
        
    } catch (err) {
        console.error('Delete error:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred during deletion.');
    } finally {
        setDeleteState({ isDeleting: false, deletingId: null });
    }
}, []);

  const handleBulkDelete = useCallback(async () => {
    const numSelected = selectedPassIds.size;
    if (numSelected === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${numSelected} selected pass(es)? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/bulk-delete-passes', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: Array.from(selectedPassIds) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to delete selected passes.');

      setSelectedPassIds(new Set());
      await loadData();
    } catch(err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during bulk deletion.');
      setLoading(false);
    }
  }, [selectedPassIds, loadData]);

  // PDF Download Functions
  const handleDownloadPDF = async (selectedOnly = false) => {
    setIsGeneratingPDF(true);
    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const dataToExport = selectedOnly 
        ? filteredAndSortedPasses.filter(pass => selectedPassIds.has(pass._id))
        : filteredAndSortedPasses;

      if (dataToExport.length === 0) {
        alert(selectedOnly ? 'No passes selected for export.' : 'No passes available for export.');
        return;
      }

      // Add title
      doc.setFontSize(18);
      doc.text(`Employee Database Report${selectedOnly ? ' (Selected)' : ''}`, 20, 20);
      
      // Add generation info
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
      doc.text(`Total Records: ${dataToExport.length}`, 20, 37);
      
      // Add filter info if any filters are applied
      let yPos = 44;
      if (filters.search || filters.category !== 'all') {
        doc.text('Applied Filters:', 20, yPos);
        yPos += 7;
        if (filters.search) {
          doc.text(`• Search: "${filters.search}"`, 25, yPos);
          yPos += 7;
        }
        if (filters.category !== 'all') {
          doc.text(`• Category: ${filters.category}`, 25, yPos);
          yPos += 7;
        }
      }

      // Prepare table data
      const tableData = dataToExport.map(employee => [
        formatTablePassId(employee.passId),
        employee.name || 'N/A',
        employee.category || 'N/A',
        employee.designation || 'N/A',
        employee.organization || 'N/A',
        employee.cnic || 'N/A',
        employee.areaAllowed?.join(', ') || 'N/A',
        formatDateSafely(employee.dateOfEntry),
        formatDateSafely(employee.dateOfExpiry),
        employee.author?.name || 'System'
      ]);

      // Add table
      autoTable(doc, {
        head: [[
          'Pass ID',
          'Name',
          'Category',
          'Designation',
          'Organization',
          'CNIC',
          'Area Allowed',
          'Entry Date',
          'Expiry Date',
          'Created By'
        ]],
        body: tableData,
        startY: yPos + 10,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { top: 20, right: 20, bottom: 20, left: 20 },
        tableWidth: 'auto',
        columnStyles: {
          0: { cellWidth: 20 }, // Pass ID
          1: { cellWidth: 25 }, // Name
          2: { cellWidth: 18 }, // Category
          3: { cellWidth: 22 }, // Designation
          4: { cellWidth: 30 }, // Organization
          5: { cellWidth: 25 }, // CNIC
          6: { cellWidth: 35 }, // Area Allowed
          7: { cellWidth: 22 }, // Entry Date
          8: { cellWidth: 22 }, // Expiry Date
          9: { cellWidth: 25 }, // Created By
        },
      });

      // Save the PDF
      const fileName = selectedOnly 
        ? `selected-employees-${new Date().toISOString().split('T')[0]}.pdf`
        : `all-employees-${new Date().toISOString().split('T')[0]}.pdf`;
      
      doc.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const filteredAndSortedPasses = useMemo(() => {
    return passes
      .filter(pass => filters.category === 'all' || pass.category === filters.category)
      .filter(pass => {
        if (!filters.search) return true;
        const searchTerm = filters.search.toLowerCase().trim();
        const searchTermNoDash = searchTerm.replace(/-/g, '');
        const fieldsToSearch = [ 
          pass.name, 
          pass.organization, 
          pass.designation, 
          pass.cnic?.replace(/-/g, ''),
          pass.author?.name, 
          String(pass.passId), 
          Array.isArray(pass.areaAllowed) ? pass.areaAllowed.join(' ') : '' 
        ];
        return fieldsToSearch.some(field => 
            field?.toLowerCase().includes(searchTerm) || 
            (field === pass.cnic?.replace(/-/g, '') && field?.includes(searchTermNoDash))
        );
      })
      .sort((a, b) => {
  switch (sortOrder) {
    case 'passId_asc':
      return (Number(a.passId) || 0) - (Number(b.passId) || 0);
    case 'passId_desc':
      return (Number(b.passId) || 0) - (Number(a.passId) || 0);
    case 'name_asc':
      return a.name.localeCompare(b.name);
    case 'expiry_asc': {
      const dateA = a.dateOfExpiry ? new Date(a.dateOfExpiry).getTime() : 0;
      const dateB = b.dateOfExpiry ? new Date(b.dateOfExpiry).getTime() : 0;
      return dateA - dateB;
    }
    case 'createdAt_desc':
    default: {
      const createdA = a._createdAt ? new Date(a._createdAt).getTime() : 0;
      const createdB = b._createdAt ? new Date(b._createdAt).getTime() : 0;
      return createdB - createdA;
    }
  }
});
  }, [passes, filters, sortOrder]);

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      const numSelected = selectedPassIds.size;
      const numFiltered = filteredAndSortedPasses.length;
      selectAllCheckboxRef.current.indeterminate = numSelected > 0 && numSelected < numFiltered;
    }
  }, [selectedPassIds, filteredAndSortedPasses]);

  const handleSelectAll = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedPassIds(new Set(filteredAndSortedPasses.map(p => p._id)));
    else setSelectedPassIds(new Set());
  };
  
  const handleSelectSingle = (passId: string, isChecked: boolean) => {
    setSelectedPassIds(prev => { 
      const newSet = new Set(prev); 
      if (isChecked) newSet.add(passId); 
      else newSet.delete(passId); 
      return newSet; 
    });
  };

  if (status === 'loading' || (loading && !deleteState.isDeleting)) return <LoadingSkeleton />;
  if (error) return <ErrorDisplay error={error} onRetry={loadData} />;
  if (status !== 'authenticated') return <div className="text-center py-10"><p>Access Denied. Please log in.</p></div>;

  const tableHeaders = ['Category', 'Pass ID', 'Photo', 'Name', 'Designation', 'Organization', 'CNIC', 'Area Allowed', 'Entry Date', 'Expiry Date', 'Created By', 'Actions'];

  return (
    <div className="bg-white shadow-md rounded-lg m-4">
      {/* Header and Filters Section */}
      <div className="p-4 border-b space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            PAA PASS DATA <span className="text-lg font-normal text-gray-500">({filteredAndSortedPasses.length})</span>
          </h1>
          <div className="flex items-center space-x-2">
            {/* PDF Download Buttons */}
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => handleDownloadPDF(false)}
                disabled={isGeneratingPDF || filteredAndSortedPasses.length === 0}
                className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded text-sm disabled:bg-gray-400 flex items-center space-x-2"
              >
                {isGeneratingPDF ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Download All PDF</span>
                  </>
                )}
              </button>
              
              {selectedPassIds.size > 0 && (
                <button 
                  onClick={() => handleDownloadPDF(true)}
                  disabled={isGeneratingPDF}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded text-sm disabled:bg-gray-400 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download Selected PDF ({selectedPassIds.size})</span>
                </button>
              )}
            </div>
            
            {selectedPassIds.size > 0 && (
              <button 
                onClick={handleBulkDelete} 
                disabled={loading} 
                className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded text-sm disabled:bg-gray-400"
              >
                Delete Selected ({selectedPassIds.size})
              </button>
            )}
            <Link href="/bulk-add-passes" className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded text-sm">Bulk Add</Link>
            <Link href="/add-pass" className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded text-sm">+ Add New Pass</Link>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <input 
            type="search" 
            placeholder="Search by name, CNIC, pass ID, etc..." 
            value={filters.search} 
            onChange={(e) => setFilters(prev => ({...prev, search: e.target.value}))} 
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
          />
          <select 
            value={filters.category} 
            onChange={(e) => setFilters(prev => ({...prev, category: e.target.value as PassCategory | 'all'}))} 
            className="p-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Categories</option> 
            <option value="cargo">Cargo</option> 
            <option value="landside">Landside</option>
          </select>
          <select 
            value={sortOrder} 
            onChange={(e) => setSortOrder(e.target.value as SortOrder)} 
            className="p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 w-52"
          >
            <option value="createdAt_desc">Sort by: Newest First</option>
            <option value="passId_asc">Sort by: Pass ID (Asc)</option>
            <option value="passId_desc">Sort by: Pass ID (Desc)</option>
            <option value="name_asc">Sort by: Name (A-Z)</option>
            <option value="expiry_asc">Sort by: Expiry Date</option>
          </select>
        </div>
      </div>
      
      {/* Table Section */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3">
                <input 
                  ref={selectAllCheckboxRef} 
                  type="checkbox" 
                  onChange={handleSelectAll} 
                  checked={filteredAndSortedPasses.length > 0 && selectedPassIds.size === filteredAndSortedPasses.length} 
                />
              </th>
              {tableHeaders.map(header => (
                <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedPasses.length > 0 ? (
              filteredAndSortedPasses.map(pass => (
                <tr key={pass._id} className={selectedPassIds.has(pass._id) ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                  <td className="px-4 py-3">
                    <input 
                      type="checkbox" 
                      checked={selectedPassIds.has(pass._id)} 
                      onChange={(e) => handleSelectSingle(pass._id, e.target.checked)} 
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                      {pass.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800 font-mono">
                    {formatTablePassId(pass.passId)}
                  </td>
                  <PhotoCell pass={pass} />
                  <td className="px-4 py-3 font-medium text-gray-900">{pass.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{pass.designation}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{pass.organization}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">{pass.cnic}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{pass.areaAllowed?.join(', ')}</td>
                  <td className="px-4 py-3 text-sm">{formatDateSafely(pass.dateOfEntry)}</td>
                  <td className="px-4 py-3 text-sm">{formatDateSafely(pass.dateOfExpiry)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{pass.author?.name || 'System'}</td>
                  <ActionsCell pass={pass} onDelete={handleDelete} deleteState={deleteState} />
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={13} className="text-center py-10 text-gray-500">
                  No passes found for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}