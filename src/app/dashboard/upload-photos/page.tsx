//app/dashboard/upload-photos/page.tsx
'use client';

import { useState, ChangeEvent } from 'react';
import { FiUploadCloud, FiFile, FiCheckCircle, FiAlertCircle, FiLoader } from 'react-icons/fi';

// Define the structure for tracking each file's status
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';
interface FileStatus {
  file: File;
  status: UploadStatus;
  message: string;
}

export default function PhotoUploadPage() {
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Handle the user selecting files from their computer
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const newFileStatuses: FileStatus[] = newFiles.map(file => ({
        file,
        status: 'idle',
        message: 'Waiting to upload...',
      }));
      setFileStatuses(newFileStatuses);
    }
  };

  // The main function to upload all selected files
  const handleUpload = async () => {
    if (fileStatuses.length === 0 || isUploading) return;
    setIsUploading(true);
    const uploadPromises = fileStatuses.map(async (fileStatus, index) => {
      if (fileStatus.status !== 'idle') return fileStatus;
      updateFileStatus(index, 'uploading', 'Uploading...');
      try {
        const formData = new FormData();
        formData.append('file', fileStatus.file);
        const response = await fetch('/api/upload-image-asset', {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }
        updateFileStatus(index, 'success', `Ready for Excel import.`);
      } catch (error: unknown) { // <-- FIX: Changed 'any' to 'unknown'
        // Safely determine the error message
        const message = error instanceof Error ? error.message : String(error);
        updateFileStatus(index, 'error', `Error: ${message}`);
      }
    });
    await Promise.all(uploadPromises);
    setIsUploading(false);
  };

  // Helper function to update the status of a specific file
  const updateFileStatus = (index: number, status: UploadStatus, message: string) => {
    setFileStatuses(prev => {
      const newStatuses = [...prev];
      newStatuses[index] = { ...newStatuses[index], status, message };
      return newStatuses;
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white shadow-md rounded-lg">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Bulk Photo Uploader</h1>
      <p className="text-gray-600 mb-6">This is the first step in the bulk pass creation process.</p>

      {/* --- UPDATED INSTRUCTIONS --- */}
      <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 p-4 mb-8 rounded-r-lg">
        <h3 className="font-bold">Instructions</h3>
        <ul className="list-decimal list-inside mt-2 space-y-1">
          <li>First, check your database or dashboard for the last used Pass ID to know where to start.</li>
          <li>
            Name each image file with the exact **Pass ID** you will assign in your Excel sheet.
            <br/>Example: <code className="bg-blue-100 p-1 rounded">1051.jpg</code>, <code className="bg-blue-100 p-1 rounded">1052.png</code>
          </li>
          <li>Select all the prepared image files below and upload them.</li>
          <li>After all uploads are successful, you can proceed to upload your Excel file.</li>
        </ul>
      </div>

      {/* File Input */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
        <FiUploadCloud className="mx-auto h-12 w-12 text-gray-400" />
        <label htmlFor="file-upload" className="relative cursor-pointer mt-4 inline-block font-semibold text-indigo-600 hover:text-indigo-500">
          <span>Select files to upload</span>
          <input id="file-upload" name="file-upload" type="file" multiple className="sr-only" onChange={handleFileSelect} />
        </label>
        <p className="text-xs text-gray-500 mt-1">PNG, JPG, JPEG, etc. up to 10MB</p>
      </div>

      {/* File List & Status */}
      {fileStatuses.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Files to Upload</h2>
          <div className="space-y-3">
            {fileStatuses.map((fs, index) => (
              <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg justify-between">
                <div className="flex items-center">
                  <FiFile className="text-gray-500 mr-3" />
                  <span className="font-medium text-gray-700">{fs.file.name}</span>
                </div>
                <div className="flex items-center">
                  <span className={`text-sm mr-3 ${
                    fs.status === 'success' ? 'text-green-600' :
                    fs.status === 'error' ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {fs.message}
                  </span>
                  {fs.status === 'idle' && <FiCheckCircle className="text-gray-300" />}
                  {fs.status === 'uploading' && <FiLoader className="animate-spin text-indigo-500" />}
                  {fs.status === 'success' && <FiCheckCircle className="text-green-500" />}
                  {fs.status === 'error' && <FiAlertCircle className="text-red-500" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      <div className="text-right">
        <button
          onClick={handleUpload}
          disabled={fileStatuses.length === 0 || isUploading}
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isUploading ? <FiLoader className="animate-spin mr-3 -ml-1 h-5 w-5" /> : null}
          {isUploading ? 'Uploading...' : 'Upload All Files'}
        </button>
      </div>
    </div>
  );
}