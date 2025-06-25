// app/print-cards/page.tsx
"use client";

import React, { useState, FormEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import Image from 'next/image';

// Interface remains the same
interface Employee {
  _id: string;
  passId: string;
  name: string;
  designation: string;
  organization: string;
  cnic: string;
  dateOfExpiry: string;
  category: 'cargo' | 'landside';
  photo?: string | null;
  areaAllowed?: string[];
}

// Helper function remains the same
const formatDisplayPassId = (pid: string): string => {
  return String(pid).padStart(4, '0');
};

// --- UPDATED & FIXED ID CARD FRONT COMPONENT ---
const IDCardFront = ({ employee }: { employee: Employee }) => {
  const displayPassId = formatDisplayPassId(employee.passId);

  // --- FIX ---
  // Get the base URL robustly.
  // Priority: 1. Environment variable (for production deployment)
  //           2. Dynamically from the browser's location (for local development)
  //           3. Fallback to an empty string (should not happen in a browser)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');

  // Determine path based on employee category
  let path = '';
  switch (employee.category) {
    case 'cargo':
      path = `/cargo-id/${employee.passId}`;
      break;
    case 'landside':
      path = `/landside-id/${employee.passId}`;
      break;
    default:
      path = `/unknown-category/${employee.passId}`;
  }

  // Construct the full URL to be used in QR code
  const qrCodeUrl = `${baseUrl}${path}`;

  const functionaryYear = new Date(employee.dateOfExpiry).getFullYear();
  const headingText = employee.category === 'landside' ? "JINNAH INT'L AIRPORT" : "CARGO COMPLEX";

  return (
    <div
      className="w-full h-full bg-white flex flex-col id-card-container"
      style={{
        fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
        fontSize: '10px',
        border: '2px solid black'
      }}
    >
      {/* Header sections */}
      <div className="text-center text-white" style={{ backgroundColor: 'rgb(47, 117, 181)' }}>
        <p className="font-bold text-[23px] leading-tight">{headingText}</p>
      </div>
      <div
        className="text-center font-bold"
        style={{
          backgroundColor: 'rgb(47, 117, 181)',
          color: 'rgb(255, 192, 0)',
          fontSize: '22px',
          letterSpacing: '0.5px'
        }}
      >
        <p>FUNCTIONARY {functionaryYear}</p>
      </div>

      <div className="flex-1 flex flex-col bg-white">
        <div className="flex justify-between items-start">
          <div className="bg-gray-0 border border-gray-200 rounded overflow-hidden flex items-center justify-center" style={{ width: '28mm', height: '30mm' }}>
            {employee.photo ? (
              <Image
                src={employee.photo}
                alt={employee.name}
                width={106} // 28mm ≈ 106px at 96dpi
                height={113} // 30mm ≈ 113px at 96dpi
                style={{ width: '100%', height: '100%', objectFit: "cover", objectPosition: "center" }}
              />
            ) : (
              <div className="text-gray-400 text-center text-[8px]">NO PHOTO</div>
            )}
          </div>
          <div className="mt-1" style={{ width: '25mm', height: '24mm' }}>
            <QRCodeSVG
              value={JSON.stringify({
                n: employee.name,
                c: employee.cnic,
                p: displayPassId,
                u: qrCodeUrl // This now contains the full, absolute URL
              })}
              size={80}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
              includeMargin={false}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>

        <div className="text-center text-white font-bold mt-0" style={{ backgroundColor: 'rgb(47, 117, 181)', fontSize: '22px' }}>
          <p>{employee.areaAllowed?.join(' | ') || 'Import | Export | DOM'}</p>
        </div>
        <div className="text-center flex-grow flex flex-col leading-tight">
          <p className="text-black font-bold text-[15px]">{employee.name}</p>
          <p className="text-black font-medium text-[13px]">{employee.designation}</p>
          <p className="text-black font-medium text-[13px]">{employee.organization}</p>
          <p className="text-black font-medium text-[13px]">{employee.cnic}</p>
        </div>
        <div className="flex justify-between items-end pt-1">
          <div>
            <div className="bg-yellow-400 font-bold px-5 border-yellow text-center text-[16px]">PASS ID</div>
            <div className="bg-white text-black font-bold px-1 border border-black border-t-0 text-center text-[17px]">{displayPassId}</div>
          </div>
          <div className="text-right flex-1 pl-1 leading-tight">
            <div className="text-center">
              <p className="text-black font-bold text-[13px]">Joint Director Vigilance</p>
              <p className="text-black text-[11px]">Pakistan Airports Authority</p>
              <p className="text-black text-[11px]">JIAP - Karachi</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- ID CARD BACK COMPONENT (No changes needed) ---
const IDCardBack = ({ employee }: { employee: Employee }) => {
  const barcodeData = `${formatDisplayPassId(employee.passId)}-${employee.name?.replace(/\s+/g, '_')}-${employee.cnic}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div
      className="w-full h-full bg-white flex flex-col id-card-container"
      style={{
        fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
        fontSize: '8px',
        border: '2px solid black'
      }}
    >
      <div className="flex flex-col items-center border-b border-black barcode-section">
        <div className="barcode-container">
          <Barcode
            value={barcodeData}
            width={0.95}
            height={20}
            format="CODE128"
            displayValue={true}
            fontSize={11}
            textMargin={0}
            margin={0}
            background="#ffffff"
            lineColor="#000000"
          />
        </div>
      </div>
      <div className="text-center border-b border-black">
        <p className="text-black font-bold text-[18px]">Date of Expiry</p>
      </div>
      <div className="text-center border-b border-black">
        <p className="text-black font-bold text-[18px]">{formatDate(employee.dateOfExpiry)}</p>
      </div>
      <div className="flex items-center justify-between text-black">
        <div className="w-13 h-9 flex items-center ml-0">
          <Image 
            src="/logo.png" 
            alt="Logo" 
            width={52} // w-13 ≈ 52px
            height={36} // h-9 ≈ 36px
            className="w-full h-full object-contain" 
          />
        </div>
        <p className="text-center flex-grow ml-1 text-[24px] font-bold">INSTRUCTIONS</p>
        <div style={{ width: '20px' }}></div>
      </div>
      <div className="text-center bg-yellow-400 border-b border-black">
        <p className="text-black font-bold text-[11px]">Pass holder is not PAA/Govt employee</p>
      </div>
      <div className="flex-1 flex flex-col text-justify font-bold px-1 py-1 text-[7px] leading-tight">
        <div className="space-y-0.5 flex-1">
          <p className="flex items-start"><span className="mr-1 text-[9px]">➤</span><span className="text-[11px]">Pass is only valid if display.</span></p>
          <p className="flex items-start"><span className="mr-1 text-[9px]">➤</span><span className="text-[11px]">Pass holder is not exempted from body/baggage search.</span></p>
          <p className="flex items-start"><span className="mr-1 text-[9px]">➤</span><span className="text-[11px]">Do not utilize for other than specified area of Validity / Route indicated in this Pass.</span></p>
          <p className="flex items-start"><span className="mr-1 text-[9px]">➤</span><span className="text-[11px]">Pass is liable to be cancelled if misused / photo copied / utilized for any other department/individual.</span></p>
          <p className="flex items-start"><span className="mr-1 text-[9px]">➤</span><span className="text-[11px]">Must be surrendered immediately on relinquishing charge of the post for which issued.</span></p>
        </div>
        <div className="mt-auto contact-info-section text-[13px] py-1 bg-gray-800 text-white text-center">
          <p className="font-semibold leading-tight">If found report immediately to </p>
          <p className="leading-tight">Vigilance Branch JIAP Karachi</p>
          <p className="font-bold leading-tight">021-99071420 & 99071468</p>
        </div>
      </div>
    </div>
  );
};

// --- MAIN PAGE COMPONENT (No changes needed) ---
export default function PrintCardsPage() {
  const [passIdsInput, setPassIdsInput] = useState('');
  const [category, setCategory] = useState<'cargo' | 'landside'>('cargo');
  const [employeesToPrint, setEmployeesToPrint] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
const handleFetchCards = async (e: FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError(null);
  setSuccessMessage(null);
  setEmployeesToPrint([]);

  const tokens = passIdsInput
    .split(/[\s,]+/)
    .filter(Boolean);

  const expandedIds: string[] = [];

  for (const token of tokens) {
    if (token.includes('-')) {
      const [start, end] = token.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          expandedIds.push(i.toString());
        }
      } else {
        setError(`Invalid range: "${token}"`);
        setLoading(false);
        return;
      }
    } else if (!isNaN(Number(token))) {
      expandedIds.push(token);
    }
  }

  const uniqueIds = Array.from(new Set(expandedIds));

  if (uniqueIds.length === 0) {
    setError('Please enter at least one valid Pass ID.');
    setLoading(false);
    return;
  }

  if (uniqueIds.length > 6) {
    setError('You can print a maximum of 6 cards at a time.');
    setLoading(false);
    return;
  }

  try {
    const response = await fetch('/api/get-passes-by-ids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passIds: uniqueIds, category })
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || 'Failed to fetch card data.');
    }

    const { employees, notFoundIds, totalFound } = await response.json();

    const seenPassIds = new Set<string>();
    const uniqueEmployees: Employee[] = employees.filter((emp: Employee) => {
      const isNew = !seenPassIds.has(emp.passId);
      seenPassIds.add(emp.passId);
      return isNew;
    });

    setEmployeesToPrint(uniqueEmployees);

    setSuccessMessage(`Successfully loaded ${totalFound} ${category === 'cargo' ? 'Cargo' : 'Landside'} pass${totalFound !== 1 ? 'es' : ''}.`);

    if (notFoundIds?.length > 0) {
      setError(`Warning: The following Pass IDs were not found for '${category}': ${notFoundIds.join(', ')}`);
    }

  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : 'Unknown error occurred.');
  } finally {
    setLoading(false);
  }
};


  const handleCategoryChange = (newCategory: 'cargo' | 'landside') => {
    setCategory(newCategory);
    setEmployeesToPrint([]);
    setError(null);
    setSuccessMessage(null);
    setPassIdsInput('');
  };

  const placeholderEmployee = (id: string) => ({ _id: id } as Employee);

  const frontSideSlots: Employee[] = Array(6).fill(null).map((_, i) =>
    i < employeesToPrint.length ? employeesToPrint[i] : placeholderEmployee(`placeholder-front-${i}`)
  );

  const backSideSlots: Employee[] = Array(6).fill(null).map((_, i) =>
    i < employeesToPrint.length ? employeesToPrint[i] : placeholderEmployee(`placeholder-back-${i}`)
  );

  // Different arrangement for cargo vs landside for proper duplex printing  
  const arrangedBackSide: Employee[] = category === 'cargo'
    ? [
      backSideSlots[1], backSideSlots[0],
      backSideSlots[3], backSideSlots[2],
      backSideSlots[5], backSideSlots[4]
    ]
    : [
      backSideSlots[1], backSideSlots[0],
      backSideSlots[3], backSideSlots[2],
      backSideSlots[5], backSideSlots[4]
    ];

  return (
    <div className="bg-gray-200 min-h-screen">
      <header className="no-print p-4 bg-white shadow-md">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Generate ID Cards for Printing (70mm × 93mm)
          </h1>

          <form onSubmit={handleFetchCards} className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="w-full sm:w-auto">
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value as 'cargo' | 'landside')}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="cargo">Cargo Pass</option>
                <option value="landside">Landside Pass</option>
              </select>
            </div>

            <div className="flex-grow w-full">
              <label htmlFor="passIds" className="block text-sm font-medium text-gray-700 mb-1">
                Enter Pass IDs (up to 6)
              </label>
              <textarea
                id="passIds"
                value={passIdsInput}
                onChange={(e) => setPassIdsInput(e.target.value)}
                rows={3}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. 1, 2, 3 or 1 2 3 (comma or space separated)"
              />
            </div>

            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Fetching...' : 'Fetch Cards'}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                disabled={employeesToPrint.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
              >
                Print
              </button>
            </div>
          </form>

          {successMessage && !error && (
            <div className="mt-3 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="mt-3 p-3 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded">
              {error}
            </div>
          )}

          <div className="mt-3 text-sm text-gray-600">
            <p>
              <strong>Current Category:</strong> {category === 'cargo' ? 'Cargo Pass' : 'Landside Pass'}
              {employeesToPrint.length > 0 && (
                <span className="ml-2">
                  | <strong>Cards Ready:</strong> {employeesToPrint.length}
                </span>
              )}
            </p>
          </div>
        </div>
      </header>

      <main className="p-4">
        {employeesToPrint.length > 0 ? (
          <div className="print-area">
            <div className="print-page front-page">
              {frontSideSlots.map((employee, index) => (
                employee.passId ? (
                  <div key={`${employee._id}-front-${index}`} className="print-card">
                    <IDCardFront employee={employee} />
                  </div>
                ) : (
                  <div key={`placeholder-front-${index}`} className="print-card-placeholder"></div>
                )
              ))}
            </div>

            <div className="print-page back-page">
              {arrangedBackSide.map((employee, index) => (
                employee && employee.passId ? (
                  <div key={`${employee._id}-back-${index}`} className="print-card">
                    <IDCardBack employee={employee} />
                  </div>
                ) : (
                  <div key={`placeholder-back-${index}`} className="print-card-placeholder"></div>
                )
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-20 no-print">
            <p className="text-gray-500 text-lg">
              Select a category and enter Pass IDs to generate cards.
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Currently set to: <strong>{category === 'cargo' ? 'Cargo Pass' : 'Landside Pass'}</strong>
            </p>
          </div>
        )}
      </main>

      <style jsx global>{`
        @media screen {
          .print-area {
            display: block;
          }
        }

        @media print {
          body > * { 
            visibility: hidden !important; 
          }
          .print-area, .print-area * { 
            visibility: visible !important; 
          }
          .print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
          }
          
          .no-print { 
            display: none !important; 
          }
          
          body, html { 
            margin: 0 !important; 
            padding: 0 !important; 
            background: white !important; 
          }
          
          @page { 
            size: A4 portrait; 
            margin: 0; 
          }
          
          .print-page {
            display: grid !important;
            width: 210mm !important;
            height: 297mm !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            background: white !important;
            
            grid-template-columns: 70mm 70mm !important;
            grid-template-rows: 93mm 93mm 93mm !important;

            column-gap: 10mm !important;
            row-gap: 6mm !important;

            padding: 3mm 30mm !important; 
            justify-content: center !important;
            align-content: center !important;
            
            overflow: hidden !important;
          }
          
          .print-card, .print-card-placeholder {
            width: 70mm !important;
            height: 93mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            background: white !important;
          }

          .print-card-placeholder {
            background: transparent !important;
            border: none !important;
          }
          
          /* Ensure borders and colors print correctly */
          .id-card-container {
            border: 2px solid black !important;
            background: white !important;
          }
          
          .id-card-container * {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          /* Fix barcode container in print */
          .barcode-section {
            min-height: 35px !important;
            padding: 2px 0 !important;
          }
          
          .barcode-container {
            transform: scale(0.6) !important;
            transform-origin: center !important;
          }

          /* Fix contact info section to prevent overflow */
          .contact-info-section {
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 2px !important;
            padding-right: 2px !important;
            font-size: 11px !important;
            line-height: 1.2 !important;
          }
        }
      `}</style>
    </div>
  );
}