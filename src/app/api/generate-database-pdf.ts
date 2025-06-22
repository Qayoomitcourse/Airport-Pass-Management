import { NextApiRequest, NextApiResponse } from 'next';
import PDFDocument from 'pdfkit';
import { format } from 'date-fns';

interface EmployeePass {
  _id: string;
  name: string;
  passId?: number;
  category: string;
  designation: string;
  organization: string;
  cnic?: string;
  areaAllowed?: string[];
  dateOfEntry?: string;
  dateOfExpiry?: string;
  author?: { name?: string };
  _createdAt?: string;
}

interface RequestBody {
  passes: EmployeePass[];
  filters: {
    category: string;
    search: string;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { passes } = req.body as RequestBody;

    if (!passes || !Array.isArray(passes)) {
      return res.status(400).json({ error: 'Invalid passes data' });
    }

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="employee-database-${format(new Date(), 'yyyy-MM-dd')}.pdf"`
    );
    doc.pipe(res);

    doc.fontSize(16).text('Employee Pass Report', { align: 'center' });
    doc.moveDown();

    passes.forEach((pass, index) => {
      doc
        .fontSize(10)
        .text(`${index + 1}. Name: ${pass.name} | Designation: ${pass.designation} | Org: ${pass.organization} | CNIC: ${pass.cnic || 'N/A'}`, {
          width: 720,
        });
    });

    doc.end();
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
}
