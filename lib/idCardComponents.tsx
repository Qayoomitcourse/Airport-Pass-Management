"use client";

import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import { format } from 'date-fns';
import { EmployeePass } from '@/app/types';
import { urlFor } from '@/sanity/lib/image';

interface IDCardPartProps {
  employee: EmployeePass;
  printMode?: boolean;
}

// CR80 Card Dimensions (Landscape)
const CARD_WIDTH_MM = 85.6;
const CARD_HEIGHT_MM = 53.98;

const colors = {
  white: '#FFFFFF',
  black: '#000000',
  headerBlue: 'rgb(47, 117, 181)',
  functionaryYellow: 'rgb(255, 192, 0)',
};

const formatDisplayPassId = (pid: string | null | undefined): string => {
  return pid ? String(pid).padStart(4, '0') : "0000";
};

export const IDCardFront = ({ employee, printMode = false }: IDCardPartProps) => {
  const displayPassId = formatDisplayPassId(employee.passId);
  const photoUrl = employee.photo && urlFor(employee.photo)?.width(300).height(300).fit('crop').url();
  const qrCodeData = `ID:${displayPassId};N:${employee.name?.replace(/\s+/g, '_')};C:${employee.cnic}`;
  const functionaryYear = employee.dateOfExpiry ? new Date(employee.dateOfExpiry).getFullYear() : new Date().getFullYear() + 1;

  return (
    <div className={printMode ? "print-card" : "preview-card"} style={{
      width: `${CARD_WIDTH_MM}mm`,
      height: `${CARD_HEIGHT_MM}mm`,
      fontFamily: 'Arial, sans-serif',
      backgroundColor: colors.white,
      border: printMode ? 'none' : `0.2mm solid ${colors.black}`,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: colors.headerBlue,
        color: colors.white,
        textAlign: 'center',
        padding: '1.5mm 0',
        fontSize: '3.8mm',
        fontWeight: 'bold'
      }}>
        CARGO COMPLEX
      </div>
      
      {/* Functionary Year */}
      <div style={{
        backgroundColor: colors.headerBlue,
        color: colors.functionaryYellow,
        textAlign: 'center',
        padding: '0.5mm 0',
        fontSize: '2.2mm',
        fontWeight: 'bold',
        letterSpacing: '0.3mm'
      }}>
        FUNCTIONARY {functionaryYear}
      </div>

      {/* Main Content */}
      <div style={{ flexGrow: 1, padding: '1.5mm 2mm' }}>
        {/* Photo and QR Row */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '1mm',
          height: '30mm'
        }}>
          {/* Photo */}
          <div style={{ 
            width: '25mm', 
            height: '30mm', 
            border: '0.2mm solid #DDD', 
            backgroundColor: '#F3F3F3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {photoUrl ? (
              <Image 
                src={photoUrl} 
                alt="" 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover' 
                }} 
              />
            ) : (
              <span style={{ fontSize: '1.6mm' }}>PHOTO</span>
            )}
          </div>
          
          {/* QR Code */}
          <div style={{ 
            width: '20mm', 
            height: '20mm',
            marginTop: '5mm'
          }}>
            <QRCodeSVG 
              value={qrCodeData} 
              size={80} 
              bgColor="#FFF" 
              fgColor="#000" 
              level="L" 
            />
          </div>
        </div>

        {/* Areas Allowed */}
        <div style={{
          backgroundColor: colors.headerBlue,
          color: colors.white,
          textAlign: 'center',
          padding: '0.7mm 0',
          fontSize: '1.8mm',
          margin: '0 -2mm 1mm -2mm'
        }}>
          Import | Export | DOM
        </div>

        {/* Employee Details */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '1mm',
          lineHeight: '1.2'
        }}>
          <p style={{ fontSize: '2.6mm', fontWeight: 'bold', margin: '0 0 0.5mm 0' }}>{employee.name}</p>
          <p style={{ fontSize: '2mm', margin: '0 0 0.5mm 0' }}>{employee.designation}</p>
          <p style={{ fontSize: '2mm', margin: '0 0 0.5mm 0' }}>{employee.organization}</p>
          <p style={{ fontSize: '1.8mm' }}>{employee.cnic}</p>
        </div>

        {/* Footer */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          borderTop: '0.1mm solid #DDD', 
          paddingTop: '0.5mm'
        }}>
          {/* Pass ID */}
          <div>
            <div style={{
              backgroundColor: colors.functionaryYellow,
              color: colors.black,
              padding: '0.2mm 1.8mm',
              border: '0.15mm solid #000',
              fontSize: '1.6mm',
              fontWeight: 'bold',
              textAlign: 'center'
            }}>
              PASS ID
            </div>
            <div style={{
              backgroundColor: colors.white,
              color: colors.black,
              padding: '0.2mm 1.8mm',
              border: '0.15mm solid #000',
              borderTop: 'none',
              fontSize: '3mm',
              fontWeight: 'bold',
              textAlign: 'center'
            }}>
              {displayPassId}
            </div>
          </div>
          
          {/* Authority */}
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '1.5mm', fontWeight: '600', margin: 0 }}>Joint Director Vigilance</p>
            <p style={{ fontSize: '1.5mm', color: colors.headerBlue, margin: 0 }}>Pakistan Airports Authority</p>
            <p style={{ fontSize: '1.5mm', margin: 0 }}>JIAP - Karachi</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const IDCardBack = ({ employee, printMode = false }: IDCardPartProps) => {
  const barcodeData = `${formatDisplayPassId(employee.passId)}-${employee.name?.replace(/\s+/g, '_')}-${employee.cnic}`;

  return (
    <div className={printMode ? "print-card" : "preview-card"} style={{
      width: `${CARD_WIDTH_MM}mm`,
      height: `${CARD_HEIGHT_MM}mm`,
      fontFamily: 'Arial, sans-serif',
      backgroundColor: colors.white,
      border: printMode ? 'none' : `0.2mm solid ${colors.black}`,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      padding: '1.8mm'
    }}>
      {/* Barcode */}
      <div style={{ 
        borderBottom: '0.15mm solid #000', 
        paddingBottom: '1mm', 
        marginBottom: '1mm',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <Barcode
          value={barcodeData}
          width={1.1}
          height={30}
          fontSize={8}
          background="#FFF"
          lineColor="#000"
          displayValue={true}
        />
      </div>

      {/* Expiry Date */}
      <div style={{ 
        borderBottom: '0.15mm solid #000', 
        padding: '0.8mm 0', 
        textAlign: 'center',
        marginBottom: '1mm'
      }}>
        <p style={{ fontSize: '2.2mm', fontWeight: 'bold', margin: 0 }}>Date of Expiry</p>
        <p style={{ fontSize: '2.8mm', fontWeight: 'bold', margin: 0 }}>
          {employee.dateOfExpiry ? format(new Date(employee.dateOfExpiry), 'dd/MMM/yyyy') : '31/Dec/2025'}
        </p>
      </div>

      {/* Instructions Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '0.8mm',
        padding: '0 0.5mm'
      }}>
        {/* PAA Logo */}
        <div style={{
          width: '6mm',
          height: '4mm',
          backgroundColor: '#228B22',
          borderRadius: '0.5mm',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFF',
          fontSize: '1.3mm',
          fontWeight: 'bold',
          marginRight: '1.5mm'
        }}>
          PAA
        </div>
        <p style={{ 
          fontSize: '2.3mm', 
          fontWeight: 'bold', 
          flexGrow: 1, 
          textAlign: 'center', 
          margin: 0 
        }}>
          INSTRUCTIONS
        </p>
        <div style={{ width: '6mm' }}></div>
      </div>

      {/* Yellow Banner */}
      <div style={{
        backgroundColor: colors.functionaryYellow,
        color: colors.black,
        textAlign: 'center',
        padding: '0.7mm 0',
        fontSize: '1.6mm',
        fontWeight: 'bold',
        margin: '0 -1.8mm 1mm -1.8mm'
      }}>
        Pass holder is not PAA/Govt employee
      </div>

      {/* Instructions */}
      <div style={{ 
        fontSize: '1.4mm', 
        lineHeight: '1.25', 
        flexGrow: 1,
        paddingRight: '0.2mm'
      }}>
        {[
          "Pass is only valid if display.",
          "Pass holder is not exempted from body/baggage search.",
          "Do not utilize for other than specified area of Validity / Route indicated in this Pass.",
          "Pass is liable to be cancelled if misused / photo copied / utilized for any other department/individual.",
          "Must be surrendered immediately on relinquishing charge of the post for which issued."
        ].map((item, i) => (
          <p key={i} style={{ display: 'flex', marginBottom: '0.3mm' }}>
            <span style={{ marginRight: '0.5mm' }}>➤</span>
            <span>{item}</span>
          </p>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        backgroundColor: '#1F2937',
        color: '#FFF',
        textAlign: 'center',
        padding: '1mm',
        margin: '0 -1.8mm -1.8mm -1.8mm',
        fontSize: '1.4mm'
      }}>
        <p style={{ fontWeight: '600', margin: '0 0 0.1mm 0' }}>If found report immediately to Vigilance</p>
        <p style={{ margin: '0 0 0.1mm 0' }}>Branch JIAP Karachi</p>
        <p style={{ fontWeight: 'bold', margin: 0 }}>021-99071420 & 99071468</p>
      </div>
    </div>
  );
};