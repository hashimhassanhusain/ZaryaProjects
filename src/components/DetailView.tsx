import React, { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { Page, Project, PageVersion } from '../types';
import { getParent, pages, getFocusArea } from '../data';
import { 
  Table, 
  FileText, 
  BarChart3, 
  ShieldCheck, 
  Printer, 
  Download, 
  Share2, 
  UserCheck, 
  Calendar, 
  RefreshCw,
  Search,
  Filter,
  Plus,
  MoreHorizontal,
  ChevronRight,
  Loader2,
  Save,
  Edit2,
  History,
  CheckCircle2,
  Clock,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { collection, addDoc, doc, updateDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';

interface DetailViewProps {
  page: Page;
}

import { CharterMilestones } from './CharterMilestones';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const DetailView: React.FC<DetailViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isCharterPage = page.id === '1.1.1';
  
  const [isCreating, setIsCreating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [charterMilestones, setCharterMilestones] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const generatePDF = async (saveToDrive = false): Promise<any> => {
    if (!selectedProject) return;
    setIsExporting(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      
      // Helper for drawing Approvals block in the new style
      const drawApprovalBlock = (x: number, y: number) => {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 82, 136); // Zarya Blue
        doc.text('APPROVALS & SIGN-OFF', x, y);
        
        const tableY = y + 6;
        const colWidth = contentWidth / 3;
        
        // Header row
        doc.setFillColor(0, 82, 136); // Zarya Blue
        doc.rect(x, tableY, contentWidth, 10, 'F');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text('NAME / ROLE', x + 5, tableY + 6.5);
        doc.text('SIGNATURE', x + colWidth + 5, tableY + 6.5);
        doc.text('DATE', x + (colWidth * 2) + 5, tableY + 6.5);
        
        doc.setTextColor(0, 0, 0);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        
        // Empty rows for manual signing
        for (let i = 0; i < 3; i++) {
          const rowY = tableY + 10 + (i * 15);
          doc.rect(x, rowY, contentWidth, 15);
          doc.line(x + colWidth, rowY, x + colWidth, rowY + 15);
          doc.line(x + (colWidth * 2), rowY, x + (colWidth * 2), rowY + 15);
        }
        
        return 65; // Height used
      };

      const drawField = (label: string, value: string, x: number, y: number, width: number) => {
        const labelWidth = width / 2;
        const valueWidth = width / 2;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 82, 136); // Zarya Blue
        doc.text(label.toUpperCase(), x + 5, y + 6.5);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        
        const splitValue = doc.splitTextToSize(value, valueWidth - 10);
        doc.text(splitValue, x + labelWidth + 5, y + 6.5);
        
        const rowHeight = Math.max(10, (splitValue.length * 5) + 5);
        
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.1);
        doc.rect(x, y, width, rowHeight);
        doc.line(x + labelWidth, y, x + labelWidth, y + rowHeight);
        
        return rowHeight;
      };

      // --- HEADER REDESIGN ---
      // Logo on Left
      try {
        const logoUrl = 'https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7';
        doc.addImage(logoUrl, 'PNG', margin, 10, 30, 30);
      } catch (e) {
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 82, 136);
        doc.text('ZARYA', margin, 25);
      }
      
      // Contact Info on Right
      const rightAlignX = pageWidth - margin;
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text('Sulaymaniyah, Iraq', rightAlignX, 15, { align: 'right' });
      doc.text('info@zarya.co', rightAlignX, 20, { align: 'right' });
      doc.text('www.zarya.co', rightAlignX, 25, { align: 'right' });

      // Horizontal Line
      doc.setDrawColor(0, 82, 136); // Zarya Blue
      doc.setLineWidth(0.8);
      doc.line(margin, 42, pageWidth - margin, 42);
      
      // --- TITLE AND METADATA SECTION ---
      let currentY = 55;
      
      // Title Centered (As requested)
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 82, 136); // Zarya Blue
      const titleText = page.title.toUpperCase();
      doc.text(titleText, pageWidth / 2, currentY, { align: 'center' });
      
      currentY += 15;
      
      // Metadata (Left and Right as requested)
      doc.setFontSize(10);
      doc.setTextColor(0, 82, 136); // Zarya Blue
      doc.setFont('helvetica', 'bold');
      doc.text(selectedProject.name.toUpperCase(), margin, currentY);
      doc.text(`CODE: #${selectedProject.code}`, rightAlignX, currentY, { align: 'right' });
      
      currentY += 8;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Date Prepared: ${new Date().toLocaleDateString('en-GB')}`, margin, currentY);
      doc.text(`Project Status: ACTIVE / INITIATING`, rightAlignX, currentY, { align: 'right' });

      currentY += 12;

      // Project Description
      const projectDesc = selectedProject.description || 'No description provided for this project.';
      const splitDesc = doc.splitTextToSize(projectDesc, contentWidth);
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(splitDesc, margin, currentY);
      
      currentY += (splitDesc.length * 5) + 15;

      if (isLogPage) {
        const headers = page.formFields || [];
        (doc as any).autoTable({
          startY: currentY,
          head: [headers],
          body: [1, 2, 3, 4, 5].map(row => headers.map((f, i) => i === 0 ? `REC-00${row}` : `Sample ${f}`)),
          theme: 'grid',
          headStyles: { fillColor: [0, 82, 136], fontSize: 8, fontStyle: 'bold', halign: 'center' },
          bodyStyles: { fontSize: 8, textColor: [0, 0, 0] },
          alternateRowStyles: { fillColor: [240, 245, 250] },
          margin: { top: currentY, left: margin, right: margin }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
      } else {
        // CONTENT SECTION USING HTML2CANVAS FOR ARABIC SUPPORT & WRAPPING
        const element = document.getElementById('pdf-content');
        if (element) {
          // Temporarily show hidden elements for capture
          const hiddenElements = element.querySelectorAll('.hidden');
          hiddenElements.forEach(el => (el as HTMLElement).style.display = 'block');
          
          const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          });
          
          // Restore hidden elements
          hiddenElements.forEach(el => (el as HTMLElement).style.display = '');
          
          const imgData = canvas.toDataURL('image/png');
          const imgProps = (doc as any).getImageProperties(imgData);
          const pdfWidth = pageWidth - (margin * 2);
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          
          // Handle multi-page if content is too long
          let heightLeft = pdfHeight;
          let position = currentY;
          let pageHeightLimit = pageHeight - 40;
          
          // If it fits on the first page
          if (heightLeft < (pageHeightLimit - currentY)) {
            doc.addImage(imgData, 'PNG', margin, position, pdfWidth, pdfHeight);
            currentY += pdfHeight + 10;
          } else {
            // Slice the image for multiple pages
            const sliceHeight = (pageHeightLimit - currentY) * (imgProps.height / pdfHeight);
            doc.addImage(imgData, 'PNG', margin, position, pdfWidth, (sliceHeight * pdfWidth) / imgProps.width, undefined, 'FAST');
            
            heightLeft -= (pageHeightLimit - currentY);
            position = 25;
            
            while (heightLeft > 0) {
              doc.addPage();
              const currentSliceHeight = Math.min(heightLeft * (imgProps.height / pdfHeight), (pageHeight - 50) * (imgProps.height / pdfHeight));
              doc.addImage(imgData, 'PNG', margin, position, pdfWidth, (currentSliceHeight * pdfWidth) / imgProps.width, undefined, 'FAST');
              heightLeft -= (pageHeight - 50);
              if (heightLeft <= 0) {
                currentY = position + ((currentSliceHeight * pdfWidth) / imgProps.width) + 10;
              }
            }
          }
        } else {
          // Fallback to manual drawing if element not found
          doc.setFillColor(0, 82, 136); // Zarya Blue
          doc.rect(margin, currentY, contentWidth, 10, 'F');
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text('FIELD DESCRIPTION', margin + 5, currentY + 6.5);
          doc.text('VALUE / DETAILS', margin + (contentWidth / 2) + 5, currentY + 6.5);
          
          currentY += 15;
          const fields = page.formFields || [];
          
          for (let i = 0; i < fields.length; i++) {
            const field = fields[i];
            if (field.toLowerCase() === 'approvals') continue;

            const val = formData[field] || selectedProject.charterData?.[field] || 'N/A';
            
            if (currentY > pageHeight - 40) {
              doc.addPage();
              currentY = 25;
            }

            currentY += drawField(field, val, margin, currentY, contentWidth);
          }
        }
      }

      // Always draw Approvals block at the end for all forms
      if (currentY > pageHeight - 60) {
        doc.addPage();
        currentY = 25;
      }
      currentY += drawApprovalBlock(margin, currentY);
      
      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Bottom Line
        doc.setDrawColor(0, 82, 136); // Zarya Blue
        doc.setLineWidth(0.5);
        doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 82, 136); // Zarya Blue
        doc.text('Thank you for your business!', margin, pageHeight - 18);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Terms & Conditions:', rightAlignX - 60, pageHeight - 18);
        doc.text('This document is confidential and intended for the recipient only.', rightAlignX, pageHeight - 14, { align: 'right' });
        
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(`Ref: ${page.id} | Zarya Management System`, margin, pageHeight - 10);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      }

      // --- FILE NAMING CONVENTION (FNC) ---
      // Syntax: [ProjectID]-[Category/Division]-[DocumentType]-[Sequence/Date]-[Status]
      const projectId = selectedProject.code;
      
      // Determine Category/Division based on page ID
      let category = 'MISC';
      if (page.id.startsWith('1.')) category = 'INIT';
      else if (page.id.startsWith('2.')) category = 'PLAN';
      else if (page.id.startsWith('3.')) category = 'EXEC';
      else if (page.id.startsWith('4.')) category = 'MON';
      else if (page.id.startsWith('5.')) category = 'CLS';
      
      const docType = 'FRM';
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const status = 'P'; // Pending
      
      const fileName = `${projectId}-${category}-${docType}-${dateStr}-${status}.pdf`;

      if (saveToDrive && selectedProject.driveFolderId) {
        const pdfBlob = doc.output('blob');
        
        // --- AUTOMATED STORAGE ROUTING ---
        let drivePath = 'PROJECT_MANAGEMENT_FORMS_01';
        
        // Special Case: Project Charter (1.1.1) goes to ADMIN_AND_CORRESPONDENCE_00
        if (page.id === '1.1.1') {
          drivePath = 'ADMIN_AND_CORRESPONDENCE_00';
        } else {
          const pathParts = page.id.split('.');
          if (pathParts.length >= 2) {
            const focusAreaId = `${pathParts[0]}.0`;
            const focusArea = pages.find(p => p.id === focusAreaId);
            if (focusArea) {
              let focusTitle = focusArea.title.replace(' Focus Area', '');
              // Special case for 4.0 to match server.ts folder naming
              if (focusAreaId === '4.0') focusTitle = 'Monitoring and Controlling';
              
              const focusFolderName = `${focusTitle.replace(/\s+/g, '_')}_${focusArea.id}`;
              drivePath += `/${focusFolderName}`;
              
              if (pathParts.length >= 3) {
                const domainHubId = `${pathParts[0]}.${pathParts[1]}`;
                const domainHub = pages.find(p => p.id === domainHubId);
                if (domainHub) {
                  // Ensure domain hub naming matches server.ts (ID_Title)
                  const domainFolderName = `${domainHub.id}_${domainHub.title.replace(/\s+/g, '_')}`;
                  drivePath += `/${domainFolderName}`;
                }
              }
            }
          }
        }
        
        const uploadData = new FormData();
        uploadData.append('file', pdfBlob, fileName);
        uploadData.append('projectRootId', selectedProject.driveFolderId);
        uploadData.append('path', drivePath); 

        const res = await fetch('/api/drive/upload-by-path', {
          method: 'POST',
          body: uploadData
        });
        
        let errorData: any = null;
        const contentType = res.headers.get('content-type');
        
        if (res.ok && contentType && contentType.includes('application/json')) {
          const driveData = await res.json();
          
          // Fetch file metadata to get webViewLink
          try {
            const filesRes = await fetch(`/api/drive/files/${driveData.folderId}`);
            if (filesRes.ok) {
              const filesData = await filesRes.json();
              const uploadedFile = filesData.files.find((f: any) => f.id === driveData.fileId);
              
              return {
                id: driveData.fileId,
                name: fileName,
                url: uploadedFile?.webViewLink || '',
                date: new Date().toISOString(),
                author: auth.currentUser?.email || 'Unknown',
                pageId: page.id
              };
            }
          } catch (metaErr) {
            console.warn('Failed to fetch file metadata, returning partial data:', metaErr);
          }
          
          return {
            id: driveData.fileId,
            name: fileName,
            url: '', // Fallback if metadata fetch fails
            date: new Date().toISOString(),
            author: auth.currentUser?.email || 'Unknown',
            pageId: page.id
          };
        } else {
          // Handle non-JSON or error responses
          if (contentType && contentType.includes('application/json')) {
            errorData = await res.json().catch(() => null);
          } else {
            const text = await res.text().catch(() => 'No response body');
            console.error('Server returned non-JSON error:', text);
            errorData = { error: 'Server Error', message: text.substring(0, 200) };
          }
          
          const finalError = errorData?.message || errorData?.error || `Upload failed with status ${res.status}`;
          throw new Error(finalError);
        }
      } else {
        doc.save(fileName);
      }
    } catch (err) {
      console.error('PDF Export failed:', err);
      throw err;
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = () => {
    if (!isLogPage || !page.formFields) return;
    
    const headers = page.formFields;
    const data = [1, 2, 3, 4, 5].map(row => {
      const obj: any = {};
      headers.forEach((f, i) => {
        obj[f] = i === 0 ? `REC-00${row}` : `Sample ${f}`;
      });
      return obj;
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Records");
    XLSX.writeFile(wb, `${page.title.replace(/\s+/g, '_')}.xlsx`);
  };

  // Initialize formData from selectedProject
  useEffect(() => {
    if (isCharterPage && selectedProject?.charterData) {
      setFormData(selectedProject.charterData);
      try {
        const ms = JSON.parse(selectedProject.charterData['milestones_json'] || '[]');
        setCharterMilestones(ms);
      } catch (e) {
        setCharterMilestones([]);
      }
    } else if (!isCharterPage && selectedProject?.pageData?.[page.id]) {
      setFormData(selectedProject.pageData[page.id]);
    } else {
      setFormData({});
      setCharterMilestones([]);
    }
  }, [isCharterPage, selectedProject?.id, page.id]);

  const parent = getParent(page.id);
  const isLogPage = page.title.toLowerCase().includes('log') || 
                    page.title.toLowerCase().includes('register') ||
                    page.title.toLowerCase().includes('list') ||
                    page.title.toLowerCase().includes('matrix');



  const handleSaveDocument = async (asNewVersion: boolean) => {
    if (!selectedProject) return;
    setIsCreating(true);
    try {
      const projectRef = doc(db, 'projects', selectedProject.id);
      const now = new Date().toISOString();
      const author = auth.currentUser?.email || 'Unknown';
      
      const updates: any = {};

      if (isCharterPage) {
        const updatedFormData = {
          ...formData,
          milestones_json: JSON.stringify(charterMilestones)
        };
        updates.charterData = updatedFormData;
        // Update project metadata from charter fields
        updates.name = formData['Project Title'] || selectedProject.name;
        updates.code = formData['Project Code'] || selectedProject.code;
        updates.manager = formData['Project Manager'] || selectedProject.manager;
        updates.sponsor = formData['Project Sponsor'] || selectedProject.sponsor;
        updates.customer = formData['Project Customer'] || selectedProject.customer;
        updates.startDate = formData['Date Prepared'] || selectedProject.startDate;
        updates.description = formData['Project Description'] || selectedProject.description;

        // Sync Milestones to Activities
        const activitiesRef = collection(db, 'activities');
        const q = query(activitiesRef, where('projectId', '==', selectedProject.id), where('charterMilestoneId', '!=', null));
        const existingMilestonesSnap = await getDocs(q);
        const existingMilestones = existingMilestonesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

        // Delete milestones that were removed from charter
        for (const em of existingMilestones) {
          if (!charterMilestones.find(m => m.id === em.charterMilestoneId)) {
            await deleteDoc(doc(db, 'activities', em.id));
          }
        }

        // Add or update milestones from charter
        for (const m of charterMilestones) {
          const existing = existingMilestones.find(em => em.charterMilestoneId === m.id);
          const activityData = {
            projectId: selectedProject.id,
            description: m.description,
            startDate: m.date,
            finishDate: m.date,
            duration: 0,
            amount: 0,
            status: 'Planned',
            activityType: 'Milestone',
            charterMilestoneId: m.id
          };

          if (existing) {
            await updateDoc(doc(db, 'activities', existing.id), activityData);
          } else {
            await addDoc(activitiesRef, activityData);
          }
        }

        if (asNewVersion) {
          const history = selectedProject.charterHistory || [];
          const nextVersion = history.length > 0 ? Math.max(...history.map(h => h.version)) + 1 : 1;
          const newVersion: PageVersion = {
            version: nextVersion,
            date: now,
            data: updatedFormData,
            author: author
          };
          updates.charterHistory = [...history, newVersion];
        }
      } else {
        const pageData = selectedProject.pageData || {};
        updates.pageData = {
          ...pageData,
          [page.id]: formData
        };

        if (asNewVersion) {
          const pageHistory = selectedProject.pageHistory || {};
          const history = pageHistory[page.id] || [];
          const nextVersion = history.length > 0 ? Math.max(...history.map(h => h.version)) + 1 : 1;
          const newVersion: PageVersion = {
            version: nextVersion,
            date: now,
            data: formData,
            author: author
          };
          updates.pageHistory = {
            ...pageHistory,
            [page.id]: [...history, newVersion]
          };
        }
      }

      // Generate and save PDF to Drive
      try {
        const pdfMetadata = await generatePDF(true);
        if (pdfMetadata) {
          const savedDocs = selectedProject.savedDocuments || [];
          const nextDocVersion = savedDocs.filter(d => d.pageId === page.id).length + 1;
          const newDoc = { ...pdfMetadata, version: nextDocVersion };
          updates.savedDocuments = [...savedDocs, newDoc];
        }
      } catch (pdfErr) {
        console.error('Auto-PDF generation failed:', pdfErr);
      }

      await updateDoc(projectRef, updates);

      alert(asNewVersion ? 'New version saved and uploaded to Drive successfully!' : 'Document updated and uploaded to Drive successfully!');
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error saving document:', error);
      handleFirestoreError(error, OperationType.UPDATE, `projects/${selectedProject.id}`);
    } finally {
      setIsCreating(false);
    }
  };

  const renderVersionHistory = () => {
    const relevantDocs = selectedProject?.savedDocuments?.filter(d => d.pageId === page.id) || [];
    const dataHistory = isCharterPage 
      ? selectedProject?.charterHistory || []
      : selectedProject?.pageHistory?.[page.id] || [];
    
    if (relevantDocs.length === 0 && dataHistory.length === 0) return null;

    return (
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-8">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-bold text-slate-900">Version History & Saved Records</h3>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
            <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {relevantDocs.length} PDFs</span>
            <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> {dataHistory.length} Data Versions</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Version</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Details</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date Saved</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Author</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {/* Combine and sort both histories if needed, but here we'll show data versions first as they are more relevant for "Restore" */}
              {dataHistory.slice().reverse().map((v, idx) => (
                <tr key={`data-${idx}`} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">v{v.version}</span>
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter bg-blue-50 px-1 rounded">DATA</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    Data snapshot with {Object.keys(v.data).length} fields
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400 font-mono text-[11px]">{new Date(v.date).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-medium">{v.author}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => {
                        if (confirm('Restore this version? Current unsaved changes will be lost.')) {
                          setFormData(v.data);
                          setIsEditing(true);
                        }
                      }}
                      className="px-3 py-1.5 bg-white border border-slate-200 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-50 transition-all shadow-sm"
                    >
                      Restore Data
                    </button>
                  </td>
                </tr>
              ))}
              {relevantDocs.slice().reverse().map((doc, idx) => (
                <tr key={`doc-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">v{doc.version}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-50 px-1 rounded">PDF</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-mono text-[11px] truncate max-w-[200px]">{doc.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-400 font-mono text-[11px]">{new Date(doc.date).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{doc.author}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <a 
                        href={doc.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Open in Browser"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button 
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = doc.url;
                          link.download = doc.name;
                          link.click();
                        }}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  };

  const renderCharterSummary = () => {
    if (!selectedProject?.charterData) return (
      <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-3xl">
        <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
        <p className="text-slate-400 italic">No charter data available for this project.</p>
        <button 
          onClick={() => setIsEditing(true)}
          className="mt-4 text-blue-600 font-bold hover:underline"
        >
          Create Charter Now
        </button>
      </div>
    );

    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {page.formFields?.map((field, index) => (
            <div key={index} className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-blue-100 transition-colors group">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block group-hover:text-blue-400 transition-colors">
                {field}
              </label>
              <p className="text-slate-700 font-medium leading-relaxed">
                {selectedProject.charterData?.[field] || <span className="text-slate-300 italic">Not specified</span>}
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between p-6 bg-blue-50 rounded-2xl border border-blue-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <History className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-blue-900">Charter History</p>
              <p className="text-xs text-blue-600">{selectedProject.charterHistory?.length || 0} versions available</p>
            </div>
          </div>
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 bg-white text-blue-600 rounded-lg text-xs font-bold shadow-sm hover:bg-blue-50 transition-colors"
          >
            {showHistory ? 'Hide History' : 'View History'}
          </button>
        </div>

        <AnimatePresence>
          {showHistory && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-2">
                {selectedProject.charterHistory?.slice().reverse().map((v, i) => (
                  <div key={i} className="p-4 bg-white border border-slate-100 rounded-xl flex items-center justify-between hover:border-slate-200 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                        v{v.version}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Version {v.version}</p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(v.date).toLocaleString()} by {v.author}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setFormData(v.data)}
                        className="text-xs font-bold text-blue-600 hover:underline"
                      >
                        Restore Data
                      </button>
                      {(() => {
                        const savedDoc = selectedProject.savedDocuments?.find(d => d.pageId === page.id && d.version === v.version);
                        if (savedDoc) {
                          return (
                            <a 
                              href={savedDoc.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View PDF"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };
  const renderTable = () => {
    if (!page.formFields) return null;

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search records..." 
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full sm:w-64"
              />
            </div>
            <button className="p-2 text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-lg transition-all">
              <Filter className="w-4 h-4" />
            </button>
          </div>
          <button className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-600/20">
            <Plus className="w-4 h-4" />
            Add New Entry
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                {page.formFields.map((field) => (
                  <th key={field} className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    {field}
                  </th>
                ))}
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[1, 2, 3, 4, 5].map((row) => (
                <tr key={row} className="hover:bg-slate-50/50 transition-colors group">
                  {page.formFields?.map((field, idx) => (
                    <td key={field} className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                      {idx === 0 ? (
                        <span className="font-bold text-slate-900">REC-00{row}</span>
                      ) : field.toLowerCase().includes('status') ? (
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          row % 2 === 0 ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                        )}>
                          {row % 2 === 0 ? 'Completed' : 'Pending'}
                        </span>
                      ) : field.toLowerCase().includes('date') ? (
                        <span className="text-slate-400">2026-04-0{row}</span>
                      ) : (
                        <span className="truncate max-w-[200px] block">Sample data for {field}</span>
                      )}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right">
                    <button className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-all">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
          <div className="text-xs text-slate-400 font-medium">Showing 5 of 24 records</div>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-slate-200 rounded text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-50" disabled>Prev</button>
            <button className="px-3 py-1 border border-slate-200 rounded text-xs font-semibold text-slate-600 hover:bg-white">Next</button>
          </div>
        </div>
      </div>
    );
  };

  const renderReadingView = () => {
    return (
      <div id="pdf-content" className="space-y-6 py-8 px-4 md:px-8 bg-white rounded-3xl border border-slate-100 shadow-sm">
        {page.formFields?.map((field, index) => {
          const val = formData[field] || 'Not specified';
          const isArabic = /[\u0600-\u06FF]/.test(val);
          
          return (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-3xl mx-auto"
            >
              <h4 className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-2">
                {field}
              </h4>
              <div className={cn(
                "text-lg font-normal text-slate-900 leading-relaxed",
                isArabic ? "text-right font-sans" : "text-left"
              )}>
                {val}
              </div>
              <div className="mt-4 h-px bg-slate-50 w-full" />
            </motion.div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Form Header */}
      <header className="sticky top-0 z-50 bg-slate-50/80 backdrop-blur-md border-b border-slate-200 -mx-8 px-8 py-4 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {page.title}
            </h2>
            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span>REF: {page.id}</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full" />
              <span>v1.0</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-slate-500 font-bold text-sm hover:text-slate-700 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleSaveDocument(false)}
                disabled={isCreating}
                className="px-4 py-2 bg-white border border-blue-200 text-blue-600 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-50 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Update
              </button>
              <button 
                onClick={() => handleSaveDocument(true)}
                disabled={isCreating}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save New Version
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsEditing(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit Plan
              </button>
              <div className="w-px h-6 bg-slate-200 mx-2" />
              <button 
                onClick={() => generatePDF(false)}
                disabled={isExporting}
                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button 
                onClick={() => generatePDF(true)}
                disabled={isExporting}
                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {isLogPage ? (
        renderTable()
      ) : (
        <div className="max-w-5xl mx-auto space-y-12">
          {isEditing ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden"
            >
              <div className="p-8 bg-slate-50 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">Editing Plan Information</h3>
                <p className="text-sm text-slate-500">Update the fields below to modify the {page.title}.</p>
              </div>
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                {page.formFields?.map((field, index) => (
                  <div key={index} className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{field}</label>
                    <textarea 
                      value={formData[field] || ''}
                      onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                      placeholder={`Enter ${field.toLowerCase()}...`}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all min-h-[120px]"
                    />
                  </div>
                ))}
              </div>
              <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-2 text-slate-500 font-bold"
                >
                  Discard Changes
                </button>
                <button 
                  onClick={() => handleSaveDocument(false)}
                  className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          ) : (
            renderReadingView()
          )}

          {/* Version History Section */}
          {renderVersionHistory()}

          {isCharterPage && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
              <CharterMilestones 
                milestones={charterMilestones}
                onChange={setCharterMilestones}
                isEditing={isEditing}
              />
            </div>
          )}

          {/* Relocated and Functional Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg flex flex-col justify-center">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-semibold">Form Status</h3>
                </div>
                <div className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider",
                  (() => {
                    const filled = page.formFields?.filter(f => formData[f])?.length || 0;
                    const total = page.formFields?.length || 0;
                    const integrity = total > 0 ? (filled / total) : 1;
                    return integrity === 1 ? "bg-emerald-500/20 text-emerald-400" : "bg-orange-500/20 text-orange-400";
                  })()
                )}>
                  {(() => {
                    const filled = page.formFields?.filter(f => formData[f])?.length || 0;
                    const total = page.formFields?.length || 0;
                    const integrity = total > 0 ? (filled / total) : 1;
                    return integrity === 1 ? "Approved" : "Draft";
                  })()}
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Data Integrity</span>
                    <span>
                      {(() => {
                        const filled = page.formFields?.filter(f => formData[f])?.length || 0;
                        const total = page.formFields?.length || 0;
                        return total > 0 ? Math.round((filled / total) * 100) : 100;
                      })()}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${(() => {
                          const filled = page.formFields?.filter(f => formData[f])?.length || 0;
                          const total = page.formFields?.length || 0;
                          return total > 0 ? Math.round((filled / total) * 100) : 100;
                        })()}%` 
                      }}
                      className="bg-emerald-500 h-full transition-all duration-500" 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-xl shrink-0">
                <ShieldCheck className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 mb-0.5">Security & Compliance</h3>
                <p className="text-[11px] text-slate-500 leading-tight mb-2">
                  Encrypted and stored according to Zarya's security protocols.
                </p>
                <div className="text-[9px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100 inline-block">
                  ID: {page.details?.documentation || 'ZARYA-DOC-' + page.id}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
