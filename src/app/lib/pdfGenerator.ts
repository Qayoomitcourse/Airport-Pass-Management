// src/lib/pdfGenerator.ts

import type { EmployeePass } from '@/app/types';
import { format } from 'date-fns';

export async function generatePassesPDF(passes: EmployeePass[]) {
  if (!passes || passes.length === 0) return;

  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape' });

  doc.text('Employee Pass Database', 14, 14);

  autoTable(doc, {
    head: [['Pass ID', 'Name', 'Designation', 'Organization', 'CNIC', 'Expiry']],
    body: passes.map((pass) => [
      pass.passId,
      pass.name,
      pass.designation,
      pass.organization,
      pass.cnic,
     pass.dateOfExpiry ? format(new Date(pass.dateOfExpiry), 'dd-MM-yyyy') : 'N/A'
     
    ]),
    startY: 20,
  });

  doc.save(`passes-database-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
