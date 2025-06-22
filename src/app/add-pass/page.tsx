"use client";

// 1. IMPORT useRef for the file input
import { useState, ChangeEvent, FormEvent, useEffect, Suspense, useRef } from 'react'; 
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { PassCategory } from '@/app/types';
import { useSession } from 'next-auth/react';
import { client } from '@/sanity/lib/client';
import { urlFor } from '@/sanity/lib/image';

// Wrapper component remains the same
export default function AddPassPageWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading Form...</div>}>
      <AddPassPage />
    </Suspense>
  );
}

interface PassFormData {
  name: string;
  category: PassCategory;
  designation: string;
  organization: string;
  cnic: string;
  areaAllowed: string[];
  dateOfEntry: string;
  dateOfExpiry: string;
}

function AddPassPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditMode = !!editId;

  const [formData, setFormData] = useState<PassFormData>({
    name: '',
    category: 'cargo',
    designation: '',
    organization: '',
    cnic: '',
    areaAllowed: [],
    dateOfEntry: '',
    dateOfExpiry: '',
  });

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ===================== NEW CODE FOR DRAG-AND-DROP =====================
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // ======================================================================

  // All your useEffect hooks remain the same...
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push('/');
    }
  }, [status, router]);
  
  useEffect(() => {
    if (isEditMode && editId) {
      setIsLoading(true);
      const fetchPassData = async () => {
        try {
          const pass = await client.fetch(`*[_type == "employeePass" && _id == $id][0]`, { id: editId });
          if (pass) {
            setFormData({
              name: pass.name || '',
              category: pass.category || 'cargo',
              designation: pass.designation || '',
              organization: pass.organization || '',
              cnic: pass.cnic || '',
              areaAllowed: pass.areaAllowed || [],
              dateOfEntry: pass.dateOfEntry ? pass.dateOfEntry.split('T')[0] : '',
              dateOfExpiry: pass.dateOfExpiry ? pass.dateOfExpiry.split('T')[0] : '',
            });
            if (pass.photo) {
              setPhotoPreview(urlFor(pass.photo).url());
            }
          } else {
            setError("Pass not found.");
          }
        } catch { 
          setError("Failed to fetch pass data.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchPassData();
    }
  }, [isEditMode, editId]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAreaChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFormData(prev => {
      const currentAreas = prev.areaAllowed;
      return { ...prev, areaAllowed: checked ? [...currentAreas, value] : currentAreas.filter(area => area !== value) };
    });
  };

  // ===================== REFACTORED AND NEW FILE HANDLERS =====================
  
  // 2. Create a reusable function to process the selected file
  const processFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setError(null); // Clear any previous file-related errors
    } else {
      setError('Invalid file type. Please upload an image file (e.g., JPG, PNG, WEBP).');
    }
  };

  // Original handler for the hidden input, now simplified
  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };
  
  // Handler for when the user clicks the drop zone
  const handleDropZoneClick = () => {
    fileInputRef.current?.click();
  };

  // Handler for when a file is dropped
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };
  
  // These handlers manage the visual state during a drag operation
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // This is crucial to allow the 'drop' event
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };
  // ==========================================================================

  // The handleSubmit function remains exactly the same...
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.areaAllowed.length === 0) { setError("At least one area must be selected."); return; }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const submissionFormData = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'areaAllowed') {
        (value as string[]).forEach(area => submissionFormData.append('areaAllowed', area));
      } else {
        submissionFormData.append(key, value as string);
      }
    });

    if (photo) {
      submissionFormData.append('photo', photo);
    }
    
    const apiEndpoint = isEditMode ? '/api/update-pass' : '/api/add-pass';
    const apiMethod = isEditMode ? 'PATCH' : 'POST';

    if (isEditMode) {
      submissionFormData.append('id', editId);
    }
    
    try {
      const response = await fetch(apiEndpoint, {
        method: apiMethod,
        body: submissionFormData,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Server responded with ${response.status}`);
      }

      if (isEditMode) {
        setSuccessMessage(`Pass for ${result.pass.name} updated successfully!`);
        setTimeout(() => router.push('/database'), 2000);
      } else {
        setSuccessMessage(`Pass for ${result.pass.name} (ID: ${result.pass.passId}) created successfully!`);
        e.currentTarget.reset();
        setFormData({ name: '', category: 'cargo', designation: '', organization: '', cnic: '', areaAllowed: [], dateOfEntry: '', dateOfExpiry: '' });
        setPhoto(null);
        setPhotoPreview(null);
      }
      
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred during submission.");
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const formFields = [
    { name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'John Doe' },
    { name: 'designation', label: 'Designation', type: 'text', required: true, placeholder: 'Security Officer' },
    { name: 'organization', label: 'Organization', type: 'text', required: true, placeholder: 'Airport Authority' },
    { name: 'cnic', label: 'CNIC (XXXXX-XXXXXXX-X)', type: 'text', required: true, placeholder: '12345-1234567-1', pattern: "^\\d{5}-\\d{7}-\\d{1}$", title: "CNIC must be in XXXXX-XXXXXXX-X format." },
    { name: 'dateOfEntry', label: 'Date of Entry', type: 'date', required: true },
    { name: 'dateOfExpiry', label: 'Date of Expiry', type: 'date', required: true },
  ];
  
  const availableAreas = ["Import", "Export", "Dom", "JTC Office Block", "JTC Concourse Halls", "JTC Car Parking Only"];

  if (status === 'loading') return <div className="text-center py-10"><p>Loading session...</p></div>;
  if (!session) return <div className="text-center py-10"><p>Access Denied. Please log in.</p></div>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md my-8">
      <h1 className="text-2xl font-bold text-gray-700 mb-6">
        {isEditMode ? 'Edit Employee Pass' : 'Add New Employee Pass'}
      </h1>
      
      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded break-words">{error}</div>}
      {successMessage && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{successMessage}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* All other form fields remain the same */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Pass Category <span className="text-red-500">*</span></label>
          <select name="category" id="category" value={formData.category} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
            <option value="cargo">Cargo Pass</option>
            <option value="landside">Landside Pass</option>
          </select>
        </div>
        
        {formFields.map(field => (
          <div key={field.name}>
            <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
            <input type={field.type} name={field.name} id={field.name} value={formData[field.name as keyof typeof formData]} onChange={handleInputChange} required={field.required} placeholder={field.placeholder || ''} pattern={field.pattern} title={field.title} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Areas Allowed <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {availableAreas.map(area => (
              <label key={area} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" name="areaAllowed" value={area} checked={formData.areaAllowed.includes(area)} onChange={handleAreaChange} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-gray-700">{area}</span>
              </label>
            ))}
          </div>
        </div>
        
        {/* ===================== UPDATED PHOTO UPLOAD JSX ===================== */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Photo
            <span className="text-gray-500 text-xs ml-1">(Optional - can be added later)</span>
          </label>
          
          <div
            onClick={handleDropZoneClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`mt-1 flex justify-center items-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md cursor-pointer transition-colors duration-200
              ${isDraggingOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
              ${photoPreview ? 'border-solid' : ''}
            `}
          >
            {/* 3. Hidden file input is now controlled by the ref */}
            <input 
              ref={fileInputRef}
              type="file" 
              name="photo" 
              id="photo" 
              accept="image/*" 
              onChange={handlePhotoChange} 
              className="hidden"
            />
            
            {/* Show preview if it exists, otherwise show upload instructions */}
            {photoPreview ? (
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">{isEditMode && !photo ? 'Current Photo:' : 'New Photo Preview:'}</p>
                <Image src={photoPreview} alt="Preview" width={150} height={150} className="rounded-md mx-auto border object-cover" />
                <p className="text-xs text-blue-600 mt-2">Click or drop a different image to replace</p>
              </div>
            ) : (
              <div className="space-y-1 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <p className="pl-1">Drag & drop an image here, or <span className="font-medium text-blue-600 hover:text-blue-500">click to upload</span></p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
              </div>
            )}
          </div>
        </div>
        {/* ==================================================================== */}

        <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400">
          {isLoading ? 'Submitting...' : (isEditMode ? 'Update Pass' : 'Add Pass')}
        </button>
      </form>
    </div>
  );
}