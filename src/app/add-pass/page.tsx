"use client";

import { useState, ChangeEvent, FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { PassCategory } from '@/app/types';
import { useSession } from 'next-auth/react';
import { client } from '@/sanity/lib/client';
import { urlFor } from '@/sanity/lib/image';

// Wrapper component for useSearchParams to work with Suspense
export default function AddPassPageWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading Form...</div>}>
      <AddPassPage />
    </Suspense>
  );
}

// FIX 3, Step 1: Define a clear interface for the form data
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

  // FIX 3, Step 2: Use the interface for the state
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
          // You could also create a type for the Sanity response for even better safety
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
        } catch { // *** FIX APPLIED HERE ***
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

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isEditMode && !photo) { setError("Photo is required for a new pass."); return; }
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
      
    } catch (err: unknown) { // FIX 2: Type as 'unknown' and perform a type check
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
            <input 
              type={field.type} 
              name={field.name} 
              id={field.name} 
              // FIX 3, Step 3: Use a safer type assertion than 'any'
              value={formData[field.name as keyof typeof formData]} 
              onChange={handleInputChange} 
              required={field.required} 
              placeholder={field.placeholder || ''} 
              pattern={field.pattern} 
              title={field.title} 
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
            />
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

        <div>
          <label htmlFor="photo" className="block text-sm font-medium text-gray-700 mb-1">Photo { !isEditMode && <span className="text-red-500">*</span>}</label>
          <input type="file" name="photo" id="photo" accept="image/*" onChange={handlePhotoChange} required={!isEditMode} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
          {photoPreview && (<div className="mt-4"><p className="text-sm text-gray-600">{isEditMode && !photo ? 'Current Photo:' : 'Preview:'}</p><Image src={photoPreview} alt="Preview" width={150} height={150} className="rounded mt-2 border object-cover" /></div>)}
        </div>
        
        <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400">
          {isLoading ? 'Submitting...' : (isEditMode ? 'Update Pass' : 'Add Pass')}
        </button>
      </form>
    </div>
  );
}