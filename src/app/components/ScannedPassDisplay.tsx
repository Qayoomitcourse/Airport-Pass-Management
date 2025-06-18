"use client";

import React, { useState, useEffect } from 'react';
import  ScannedPassDisplay  from '@/app/components/ScannedPassDisplay'; // Adjust path if needed

// Define the structure of the data we fetch
interface EmployeePass {
  passId: string;
  name: string;
  designation: string;
  organization: string;
  photo?: string | null;
}

export default function CargoIdPage({ params }: { params: { id: string } }) {
  const [employee, setEmployee] = useState<EmployeePass | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;

    const fetchCargoPassData = async () => {
      setLoading(true);
      setError(null);

      // Read Sanity details from environment variables
      const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
      const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;

      // The GROQ query to get a specific cargo pass by its document _id
      const query = encodeURIComponent(`
        *[_type == "employeePass" && _id == "${params.id}" && category == "cargo"][0] {
          passId,
          name,
          designation,
          organization,
          "photo": photo.asset->url
        }
      `);

      const url = `https://${projectId}.apicdn.sanity.io/v2024-01-01/data/query/${dataset}?query=${query}`;

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Network response was not ok (${response.status})`);
        }

        const { result } = await response.json();

        if (result) {
          setEmployee(result);
        } else {
          setError("Cargo Pass not found or is invalid.");
        }
      } catch (err: unknown) {
        console.error("Failed to load cargo pass data:", err);
        setError("Could not retrieve pass details. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchCargoPassData();
  }, [params.id]);

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center p-4">
      {loading && <p className="text-xl text-gray-600">Verifying Pass...</p>}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-lg" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}
      {employee && <ScannedPassDisplay employee={employee} category="cargo" />}

      {/* This style ensures the page has no scrollbars and looks clean on mobile */}
      <style jsx global>{`
        body, html {
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}