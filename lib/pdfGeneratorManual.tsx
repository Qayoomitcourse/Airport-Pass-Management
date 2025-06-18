import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { EmployeePass } from '@/app/types';
import { IDCardFront, IDCardBack } from './idCardComponents';
import ReactDOM from 'react-dom/client';

// Card dimensions (Standard CR80 Landscape)
const CARD_WIDTH_MM = 85.6;
const CARD_HEIGHT_MM = 53.98;

// A4 page layout for 2x3 cards
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const CARDS_PER_PAGE = 6; // 2 columns x 3 rows
const PDF_MARGIN_MM = 10;

// Calculate layout
const COLS = 2;
const ROWS = 3;

const SLOT_WIDTH_MM = (A4_WIDTH_MM - (2 * PDF_MARGIN_MM)) / COLS;
const SLOT_HEIGHT_MM = (A4_HEIGHT_MM - (2 * PDF_MARGIN_MM)) / ROWS;

const HORIZONTAL_CARD_OFFSET_IN_SLOT = (SLOT_WIDTH_MM - CARD_WIDTH_MM) / 2;
const VERTICAL_CARD_OFFSET_IN_SLOT = (SLOT_HEIGHT_MM - CARD_HEIGHT_MM) / 2;

async function captureComponentAsImage(component: React.ReactElement): Promise<string> {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-10000px';
    container.style.top = '-10000px';
    container.style.width = `${CARD_WIDTH_MM}mm`;
    container.style.height = `${CARD_HEIGHT_MM}mm`;
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);

    return new Promise((resolve, reject) => {
        root.render(component);
        setTimeout(async () => {
            try {
                const canvas = await html2canvas(container.firstChild as HTMLElement, {
                    scale: 3,
                    useCORS: true,
                    logging: false,
                    backgroundColor: null,
                    width: CARD_WIDTH_MM * 3.78, // Convert mm to pixels at 96dpi
                    height: CARD_HEIGHT_MM * 3.78
                });
                const imgData = canvas.toDataURL('image/png');
                resolve(imgData);
            } catch (error) {
                console.error('Error capturing component:', error);
                reject(error);
            } finally {
                root.unmount();
                document.body.removeChild(container);
            }
        }, 400);
    });
}

export async function generatePassesPDF(passes: EmployeePass[]): Promise<void> {
    if (!passes || passes.length === 0) {
        alert("No passes selected or data available to generate PDF.");
        return;
    }

    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    let passIndex = 0;
    let isFirstPage = true;

    while (passIndex < passes.length) {
        if (!isFirstPage) {
            pdf.addPage();
        }

        // Front side page
        pdf.setPage(pdf.getNumberOfPages());
        pdf.setTextColor(100);
        pdf.setFontSize(8);
        pdf.text(`ID Card Fronts - Page ${pdf.getNumberOfPages()}`, PDF_MARGIN_MM, PDF_MARGIN_MM / 2);
        pdf.setTextColor(0);
        pdf.setFontSize(10);

        for (let i = 0; i < CARDS_PER_PAGE; i++) {
            if (passIndex + i >= passes.length) break;
            
            const employee = passes[passIndex + i];
            if (!employee) continue;

            try {
                const cardFrontImage = await captureComponentAsImage(
                    <IDCardFront employee={employee} printMode={true} />
                );

                const row = Math.floor(i / COLS);
                const col = i % COLS;
                const x = PDF_MARGIN_MM + (col * SLOT_WIDTH_MM) + HORIZONTAL_CARD_OFFSET_IN_SLOT;
                const y = PDF_MARGIN_MM + (row * SLOT_HEIGHT_MM) + VERTICAL_CARD_OFFSET_IN_SLOT;

                pdf.addImage(cardFrontImage, 'PNG', x, y, CARD_WIDTH_MM, CARD_HEIGHT_MM);
            } catch (error) {
                console.error(`Error generating front for pass ${passIndex + i}:`, error);
                // Add error placeholder
                const row = Math.floor(i / COLS);
                const col = i % COLS;
                const x = PDF_MARGIN_MM + (col * SLOT_WIDTH_MM) + HORIZONTAL_CARD_OFFSET_IN_SLOT;
                const y = PDF_MARGIN_MM + (row * SLOT_HEIGHT_MM) + VERTICAL_CARD_OFFSET_IN_SLOT;
                
                pdf.setFillColor(255, 230, 230);
                pdf.rect(x, y, CARD_WIDTH_MM, CARD_HEIGHT_MM, 'F');
                pdf.text(`Error: ${employee.name || 'Unknown'}`, x + 2, y + 10);
            }
        }

        // Back side page (mirrored for duplex printing)
        pdf.addPage();
        pdf.setPage(pdf.getNumberOfPages());
        pdf.setTextColor(100);
        pdf.setFontSize(8);
        pdf.text(`ID Card Backs (Mirrored) - Page ${pdf.getNumberOfPages()}`, PDF_MARGIN_MM, PDF_MARGIN_MM / 2);
        pdf.setTextColor(0);
        pdf.setFontSize(10);

        for (let i = 0; i < CARDS_PER_PAGE; i++) {
            if (passIndex + i >= passes.length) break;
            
            const employee = passes[passIndex + i];
            if (!employee) continue;

            try {
                const cardBackImage = await captureComponentAsImage(
                    <IDCardBack employee={employee} printMode={true} />
                );

                const row = Math.floor(i / COLS);
                const mirroredCol = (COLS - 1) - (i % COLS); // Mirror for duplex
                const x = PDF_MARGIN_MM + (mirroredCol * SLOT_WIDTH_MM) + HORIZONTAL_CARD_OFFSET_IN_SLOT;
                const y = PDF_MARGIN_MM + (row * SLOT_HEIGHT_MM) + VERTICAL_CARD_OFFSET_IN_SLOT;

                pdf.addImage(cardBackImage, 'PNG', x, y, CARD_WIDTH_MM, CARD_HEIGHT_MM);
            } catch (error) {
                console.error(`Error generating back for pass ${passIndex + i}:`, error);
                // Add error placeholder
                const row = Math.floor(i / COLS);
                const mirroredCol = (COLS - 1) - (i % COLS);
                const x = PDF_MARGIN_MM + (mirroredCol * SLOT_WIDTH_MM) + HORIZONTAL_CARD_OFFSET_IN_SLOT;
                const y = PDF_MARGIN_MM + (row * SLOT_HEIGHT_MM) + VERTICAL_CARD_OFFSET_IN_SLOT;
                
                pdf.setFillColor(255, 230, 230);
                pdf.rect(x, y, CARD_WIDTH_MM, CARD_HEIGHT_MM, 'F');
                pdf.text(`Error: ${employee.name || 'Unknown'}`, x + 2, y + 10);
            }
        }

        passIndex += CARDS_PER_PAGE;
        isFirstPage = false;
    }

    try {
        const fileName = `Cargo_ID_Cards_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);
    } catch (error) {
        console.error("Error saving PDF:", error);
        alert("Failed to save PDF. Please check console for details.");
    }
}