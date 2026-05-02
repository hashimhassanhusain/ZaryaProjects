import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Page, Project } from '../types';

interface PDFParams {
  page: Page;
  project: Project | null;
  data: any; // Context-specific data (e.g., risks list, budget, etc.)
  columns: string[];
  rows: any[][];
}

export const generateStandardPDF = (params: PDFParams) => {
  const { page, project, data, columns, rows } = params;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const timestamp = new Date().toISOString().split('T')[0];
  const fncCode = `${project?.code || 'PRJ'}-${page.id}-${page.title.toUpperCase().replace(/\s+/g, '_')}-V2.4-${timestamp}`;

  // --- HEADER ---
  // Blue accent bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('PMIS', 20, 25);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('PROJECT MANAGEMENT INFORMATION SYSTEM', 20, 32);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text(page.title.toUpperCase(), pageWidth - 20, 25, { align: 'right' });
  
  doc.setFontSize(8);
  doc.text(`PROJECT: ${project?.name || 'VILLA 2'}`, pageWidth - 20, 32, { align: 'right' });

  // --- RECORD INFO ---
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('RECORD IDENTIFICATION', 20, 55);
  
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.line(20, 58, pageWidth - 20, 58);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Record ID: ${fncCode}`, 20, 68);
  doc.text(`Status: APPROVED BASELINE`, 20, 74);
  doc.text(`Domain: ${page.domain.toUpperCase()}`, pageWidth - 20, 68, { align: 'right' });
  doc.text(`Focus Area: ${page.focusArea.toUpperCase()}`, pageWidth - 20, 74, { align: 'right' });

  // --- CONTENT TABLE ---
  (doc as any).autoTable({
    startY: 85,
    head: [columns],
    body: rows,
    theme: 'striped',
    headStyles: { 
      fillColor: [15, 23, 42], 
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: { 
      fontSize: 9,
      textColor: [15, 23, 42]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { top: 20, left: 20, right: 20 },
    didDrawPage: (data: any) => {
      // Logic for multi-page headers if needed
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 30;

  // --- SIGNATURES ---
  if (finalY < doc.internal.pageSize.getHeight() - 60) {
    const sigY = finalY;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.5);

    doc.line(20, sigY, 70, sigY);
    doc.text('PREPARED BY', 20, sigY + 5);
    doc.setFontSize(7);
    doc.text('SITE ENGINEER / PLANNER', 20, sigY + 9);

    doc.line(80, sigY, 130, sigY);
    doc.setFontSize(9);
    doc.text('REVIEWED BY', 80, sigY + 5);
    doc.setFontSize(7);
    doc.text('PROJECT MANAGER', 80, sigY + 9);

    doc.line(140, sigY, 190, sigY);
    doc.setFontSize(9);
    doc.text('APPROVED BY', 140, sigY + 5);
    doc.setFontSize(7);
    doc.text('PROJECT SPONSOR', 140, sigY + 9);
  }

  // --- FOOTER ---
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `CONFIDENTIAL | ${fncCode} | PAGE ${i} OF ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  doc.save(`${fncCode}.pdf`);
};

export const loadArabicFont = async (doc: jsPDF) => {
  // Stub for now to resolve build errors
  return doc;
};
