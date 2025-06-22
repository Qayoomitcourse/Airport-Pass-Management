"use client";
import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import * as XLSX from 'xlsx';
import Link from 'next/link';

interface TargetPassData {
  passId?: number;
  name?: string;
  category?: string;
  designation?: string;
  organization?: string;
  cnic?: string;
  areaAllowed?: string;
  dateOfEntry?: string;
  dateOfExpiry?: string;
}

interface ImportResult {
  row: number;
  status: 'Success' | 'Error';
  message: string | object;
  passId?: number;
}

export default function HistoricalImportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [detailedResults, setDetailedResults] = useState<ImportResult[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push('/');
  }, [status, router]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
      ];
      if (validTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
        setError(null);
      } else {
        setFile(null);
        setError('Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV file.');
      }
    } else {
      setFile(null);
    }
  };

  const formatDateForExcel = (date: Date): string | undefined => {
    if (date && !isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return undefined;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    setDetailedResults([]);

    const reader = new FileReader();
    reader.onload = async (event: ProgressEvent<FileReader>) => {
      try {
        const binaryStr = event.target?.result;
        if (!binaryStr) throw new Error("Could not read file data.");

        const workbook = XLSX.read(binaryStr, { type: 'binary', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData: (string | number | Date)[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (jsonData.length < 2) throw new Error("Excel sheet is empty or has no data rows.");

        const headers = (jsonData[0] as string[]).map(h => h?.trim().toLowerCase().replace(/\s+/g, '') || '');
        const dataRows = jsonData.slice(1);

        const headerMap: Record<string, keyof TargetPassData> = {
          'passid': 'passId',
          'name': 'name',
          'category': 'category',
          'designation': 'designation',
          'organization': 'organization',
          'cnic': 'cnic',
          'areaallowed': 'areaAllowed',
          'dateofentry': 'dateOfEntry',
          'dateofexpiry': 'dateOfExpiry',
        };

        const passesToUpload: TargetPassData[] = dataRows.map(rowArray => {
          const rowObject: { [key in keyof TargetPassData]?: string | number } = {};
          headers.forEach((header, index) => {
            const key = headerMap[header];
            if (key) {
              const value = rowArray[index];
              if ((key === 'dateOfEntry' || key === 'dateOfExpiry') && value instanceof Date) {
                rowObject[key] = formatDateForExcel(value);
              } else if (value != null && value !== '') {
                rowObject[key] = key === 'passId' ? Number(value) : String(value).trim();
              }
            }
          });
          return rowObject as TargetPassData;
        }).filter(obj => Object.keys(obj).length > 0 && obj.name && obj.passId);

        if (passesToUpload.length === 0) {
          throw new Error("No valid data rows found. Ensure 'Pass ID' and 'Name' columns are filled.");
        }

        const response = await fetch('/api/bulk-import-historical', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passes: passesToUpload }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || result.message || `Server error: ${response.status}`);

        setSuccessMessage(result.message || "Historical import processed.");
        setDetailedResults(result.results || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An unknown error occurred during processing.");
        setDetailedResults([]);
      } finally {
        setIsProcessing(false);
        setFile(null);
        if (e.target instanceof HTMLFormElement) e.target.reset();
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleErrorDetails = (message: string | object) => {
    if (typeof message === 'string') return message;
    if (typeof message === 'object' && message !== null) {
      return Object.entries(message)
        .map(([field, errors]) => `${field}: ${(errors as string[]).join(', ')}`)
        .join('; ');
    }
    return "Invalid error format.";
  };

  if (status === 'loading') return <div className="text-center py-10"><p>Loading session...</p></div>;
  if (!session) return <div className="text-center py-10"><p>Access Denied. Please log in.</p></div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md my-8">
      <h1 className="text-2xl font-bold text-gray-700 mb-6">One-Time Historical Pass Import</h1>
      <div className="mb-6 p-4 border border-orange-200 bg-orange-50 rounded-md text-sm text-orange-800">
        <p className="font-semibold mb-2">Instructions for Historical Data Upload:</p>
        <ol className="list-decimal list-inside space-y-2">
          <li><strong>Important:</strong> This page is for a one-time import of existing, manually-issued passes.</li>
          <li>Download the new Excel template which includes a <strong>Pass ID</strong> column.</li>
          <li>Fill in the exact <code>Pass ID</code> that was manually assigned. This must be a unique number for its category.</li>
          <li>Fill in all other required employee details.</li>
          <li>The system will NOT generate new IDs; it will use the ones you provide.</li>
        </ol>
        <div className="mt-4">
          <a href="/excel-templates/historical_pass_template.xlsx" download className="text-blue-600 hover:text-blue-800 font-medium underline">
            Download Historical Import Template
          </a>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded break-words">{error}</div>}
      {successMessage && !isProcessing && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{successMessage}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="excelFile" className="block text-sm font-medium text-gray-700 mb-1">Upload Historical Excel File <span className="text-red-500">*</span></label>
          <input
            type="file"
            name="excelFile"
            id="excelFile"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            required
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        <button
          type="submit"
          disabled={isProcessing || !file}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
        >
          {isProcessing ? 'Processing File...' : 'Upload and Import Historical Passes'}
        </button>
      </form>

      {detailedResults.length > 0 && !isProcessing && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">Import Results:</h2>
          <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Row</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provided ID</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {detailedResults.map((result, index) => (
                  <tr key={index} className={result.status === 'Success' ? 'bg-green-50' : 'bg-red-50'}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{result.row}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${result.status === 'Success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {result.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700 break-words">
                      {handleErrorDetails(result.message)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 font-mono">
                      {result.passId ? String(result.passId).padStart(4, '0') : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link href="/database" className="text-blue-600 hover:text-blue-800">← Back to Database</Link>
      </div>
    </div>
  );
}
