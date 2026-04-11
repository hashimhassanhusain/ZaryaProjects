import React, { useState, useEffect } from 'react';
import { Page, Project, PageVersion } from '../types';
import { getParent, pages, getFocusArea, users } from '../data';
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
  ExternalLink,
  DollarSign,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, generateZaryaFileName } from '../lib/utils';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { collection, addDoc, doc, updateDoc, getDocs, query, where, deleteDoc, setDoc } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';

interface DetailViewProps {
  page: Page;
}

import { CharterMilestones } from './CharterMilestones';
import { ProjectCharterForm } from './ProjectCharterForm';
import { ActivityAttributesModal } from './ActivityAttributesModal';
import { Activity, BOQItem, WBSLevel, Stakeholder, StakeholderVersion, StakeholderAnalysis, StakeholderAnalysisVersion, SystemAuditLog, CCBMember, ChangeManagementPlan, ChangeManagementVersion, ProjectManagementPlan, ProjectManagementVersion, ProjectPhase, TailoringDecision, QualityRole, QualityManagementPlan, QualityManagementVersion } from '../types';
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
  const [charterMilestones, setCharterMilestones] = useState<Activity[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Activity | null>(null);
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [stakeholders, setStakeholders] = useState<{ name: string; role: string }[]>([]);
  const [stakeholderRegister, setStakeholderRegister] = useState<Stakeholder[]>([]);
  const [stakeholderView, setStakeholderView] = useState<'list' | 'matrix'>('list');
  const [stakeholderSearch, setStakeholderSearch] = useState('');
  const [stakeholderVersions, setStakeholderVersions] = useState<StakeholderVersion[]>([]);
  const [showStakeholderHistory, setShowStakeholderHistory] = useState(false);
  const [isStakeholderRegister, setIsStakeholderRegister] = useState(false);
  const [editingStakeholder, setEditingStakeholder] = useState<Stakeholder | null>(null);
  const [isStakeholderModalOpen, setIsStakeholderModalOpen] = useState(false);
  const [stakeholderAnalysis, setStakeholderAnalysis] = useState<StakeholderAnalysis[]>([]);
  const [isStakeholderAnalysis, setIsStakeholderAnalysis] = useState(false);
  const [editingAnalysis, setEditingAnalysis] = useState<StakeholderAnalysis | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [analysisVersions, setAnalysisVersions] = useState<StakeholderAnalysisVersion[]>([]);
  const [showAnalysisHistory, setShowAnalysisHistory] = useState(false);
  const [analysisSearch, setAnalysisSearch] = useState('');

  // --- CHANGE MANAGEMENT PLAN STATE ---
  const [isChangeManagementPlan, setIsChangeManagementPlan] = useState(false);
  const [changePlan, setChangePlan] = useState<ChangeManagementPlan | null>(null);
  const [changeVersions, setChangeVersions] = useState<ChangeManagementVersion[]>([]);
  const [showChangeHistory, setShowChangeHistory] = useState(false);
  const [isCCBModalOpen, setIsCCBModalOpen] = useState(false);
  const [editingCCBMember, setEditingCCBMember] = useState<CCBMember | null>(null);
  const [adminPin, setAdminPin] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingSaveAction, setPendingSaveAction] = useState<'overwrite' | null>(null);

  // --- PROJECT MANAGEMENT PLAN STATE ---
  const [isProjectManagementPlan, setIsProjectManagementPlan] = useState(false);
  const [pmPlan, setPmPlan] = useState<ProjectManagementPlan | null>(null);
  const [pmVersions, setPmVersions] = useState<ProjectManagementVersion[]>([]);
  const [showPmHistory, setShowPmHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'lifecycle' | 'tailoring' | 'baselines'>('lifecycle');
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<ProjectPhase | null>(null);
  const [isTailoringModalOpen, setIsTailoringModalOpen] = useState(false);
  const [editingTailoring, setEditingTailoring] = useState<TailoringDecision | null>(null);

  // --- QUALITY MANAGEMENT PLAN STATE ---
  const [isQualityManagementPlan, setIsQualityManagementPlan] = useState(false);
  const [qualityPlan, setQualityPlan] = useState<QualityManagementPlan | null>(null);
  const [qualityVersions, setQualityVersions] = useState<QualityManagementVersion[]>([]);
  const [showQualityHistory, setShowQualityHistory] = useState(false);
  const [isQualityRoleModalOpen, setIsQualityRoleModalOpen] = useState(false);
  const [editingQualityRole, setEditingQualityRole] = useState<QualityRole | null>(null);

  useEffect(() => {
    setIsStakeholderRegister(page.id === '1.2.1');
    setIsStakeholderAnalysis(page.id === '1.2.2');
    setIsChangeManagementPlan(page.id === '2.1.1');
    setIsProjectManagementPlan(page.id === '2.1.2');
    setIsQualityManagementPlan(page.id === '2.1.3');
  }, [page.id]);

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
      // Logo Top Center
      try {
        const logoUrl = 'https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7';
        doc.addImage(logoUrl, 'PNG', (pageWidth / 2) - 15, 10, 30, 30);
      } catch (e) {
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 82, 136);
        doc.text('ZARYA', pageWidth / 2, 25, { align: 'center' });
      }
      
      // Contact Info on Right (Small)
      const rightAlignX = pageWidth - margin;
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text('Sulaymaniyah, Iraq | info@zarya.co | www.zarya.co', pageWidth / 2, 40, { align: 'center' });

      // Horizontal Line
      doc.setDrawColor(0, 82, 136); // Zarya Blue
      doc.setLineWidth(0.5);
      doc.line(margin, 45, pageWidth - margin, 45);
      
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

      if (isLogPage && !isStakeholderRegister) {
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
      } else if (isCharterPage) {
        // --- CHARTER SPECIFIC PDF LAYOUT ---
        const fields = page.formFields || [];
        
        // Page 1: Basic Info
        const basicFields = [
          'Project Title', 'Project Sponsor', 'Date Prepared', 
          'Project Manager', 'Project Customer', 'Project Purpose or Justification', 
          'Project Description', 'High-Level Requirements', 'High-Level Risks'
        ];

        for (const field of basicFields) {
          const val = formData[field] || selectedProject.charterData?.[field] || 'N/A';
          if (currentY > pageHeight - 40) {
            doc.addPage();
            currentY = 25;
          }
          currentY += drawField(field, val, margin, currentY, contentWidth);
        }

        // Page 2: Objectives & Milestones
        doc.addPage();
        currentY = 25;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 82, 136);
        doc.text('PROJECT OBJECTIVES & SUCCESS CRITERIA', margin, currentY);
        currentY += 10;

        const objectiveRows = ['Scope', 'Time', 'Cost', 'Other'].map(obj => [
          obj,
          formData[`${obj} Objective`] || selectedProject.charterData?.[`${obj} Objective`] || 'N/A',
          formData[`${obj} Success Criteria`] || selectedProject.charterData?.[`${obj} Success Criteria`] || 'N/A',
          formData[`${obj} Person Approving`] || selectedProject.charterData?.[`${obj} Person Approving`] || 'N/A'
        ]);

        (doc as any).autoTable({
          startY: currentY,
          head: [['Objective', 'Description', 'Success Criteria', 'Approver']],
          body: objectiveRows,
          theme: 'grid',
          headStyles: { fillColor: [0, 82, 136], fontSize: 8 },
          bodyStyles: { fontSize: 8 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;

        doc.setFontSize(14);
        doc.text('SUMMARY MILESTONES', margin, currentY);
        currentY += 10;

        const milestoneRows = charterMilestones.map(m => [m.description, m.finishDate || 'TBD']);
        (doc as any).autoTable({
          startY: currentY,
          head: [['Milestone', 'Due Date']],
          body: milestoneRows,
          theme: 'grid',
          headStyles: { fillColor: [0, 82, 136], fontSize: 8 },
          bodyStyles: { fontSize: 8 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;

        // Page 3: Budget & Stakeholders
        doc.addPage();
        currentY = 25;
        
        const budgetFields = [
          'Estimated Budget', 'Project Manager Authority Level', 
          'Staffing Decisions', 'Budget Management and Variance'
        ];

        for (const field of budgetFields) {
          const val = formData[field] || selectedProject.charterData?.[field] || 'N/A';
          currentY += drawField(field, val, margin, currentY, contentWidth);
        }

        currentY += 15;
        doc.setFontSize(14);
        doc.text('STAKEHOLDERS', margin, currentY);
        currentY += 10;

        const stakeholderRows = stakeholders.map(s => [s.name, s.role]);
        (doc as any).autoTable({
          startY: currentY,
          head: [['Name', 'Role']],
          body: stakeholderRows,
          theme: 'grid',
          headStyles: { fillColor: [0, 82, 136], fontSize: 8 },
          bodyStyles: { fontSize: 8 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;

        // Page 4: Governance
        doc.addPage();
        currentY = 25;
        const govFields = ['Technical Decisions', 'Conflict Resolution'];
        for (const field of govFields) {
          const val = formData[field] || selectedProject.charterData?.[field] || 'N/A';
          currentY += drawField(field, val, margin, currentY, contentWidth);
        }
      } else if (isStakeholderRegister) {
        // --- STAKEHOLDER REGISTER PDF ---
        const stakeholderRows = stakeholderRegister.map((s, idx) => [
          `SR-${String(idx + 1).padStart(3, '0')}`,
          s.name,
          s.position,
          s.role,
          s.contactInfo,
          s.influence,
          s.engagementLevel || 'Green'
        ]);

        (doc as any).autoTable({
          startY: currentY,
          head: [['ID', 'Name', 'Position/Org', 'Role', 'Contact', 'Influence', 'Engagement']],
          body: stakeholderRows,
          theme: 'grid',
          headStyles: { fillColor: [0, 82, 136], fontSize: 8, fontStyle: 'bold', halign: 'center' },
          bodyStyles: { fontSize: 8, textColor: [0, 0, 0] },
          columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 30 },
            2: { cellWidth: 30 },
            3: { cellWidth: 30 },
            4: { cellWidth: 35 },
            5: { cellWidth: 20 },
            6: { cellWidth: 20 }
          }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
      } else if (isStakeholderAnalysis) {
        // --- STAKEHOLDER ANALYSIS MATRIX PDF ---
        const analysisRows = stakeholderAnalysis.map((s, idx) => [
          s.stakeholderName,
          s.power.toString(),
          s.interest.toString(),
          s.strategy,
          new Date(s.lastUpdated).toLocaleDateString()
        ]);

        (doc as any).autoTable({
          startY: currentY,
          head: [['STAKEHOLDER', 'POWER (1-10)', 'INTEREST (1-10)', 'STRATEGY', 'LAST UPDATED']],
          body: analysisRows,
          theme: 'grid',
          headStyles: { fillColor: [0, 82, 136], textColor: 255, fontSize: 9, fontStyle: 'bold' },
          bodyStyles: { fontSize: 8 },
          margin: { left: margin, right: margin }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
      } else if (isChangeManagementPlan && changePlan) {
        // --- CHANGE MANAGEMENT PLAN PDF ---
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 82, 136);
        doc.text('1. MANAGEMENT APPROACH', margin, currentY);
        currentY += 8;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        const approachLines = doc.splitTextToSize(changePlan.approach || 'N/A', contentWidth);
        doc.text(approachLines, margin, currentY);
        currentY += (approachLines.length * 5) + 10;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 82, 136);
        doc.text('2. DEFINITIONS OF CHANGE', margin, currentY);
        currentY += 8;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        const defLines = doc.splitTextToSize(changePlan.definitions || 'N/A', contentWidth);
        doc.text(defLines, margin, currentY);
        currentY += (defLines.length * 5) + 10;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 82, 136);
        doc.text('3. THRESHOLDS & SYSTEM VARIABLES', margin, currentY);
        currentY += 8;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`Budget Change Threshold: $${changePlan.budgetThreshold.toLocaleString()} USD`, margin + 5, currentY);
        currentY += 6;
        doc.text(`Schedule Change Threshold: ${changePlan.scheduleThreshold} Days`, margin + 5, currentY);
        currentY += 15;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 82, 136);
        doc.text('4. CHANGE CONTROL BOARD (CCB)', margin, currentY);
        currentY += 6;

        const ccbRows = changePlan.ccbMembers.map(m => [m.name, m.role, m.responsibility, m.authority]);
        (doc as any).autoTable({
          startY: currentY,
          head: [['NAME', 'ROLE', 'RESPONSIBILITY', 'AUTHORITY']],
          body: ccbRows,
          theme: 'grid',
          headStyles: { fillColor: [0, 82, 136], fontSize: 9, fontStyle: 'bold' },
          bodyStyles: { fontSize: 8 },
          margin: { left: margin, right: margin }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
      } else if (isProjectManagementPlan && pmPlan) {
        // --- PROJECT MANAGEMENT PLAN PDF ---
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 82, 136);
        doc.text('1. PROJECT LIFE CYCLE & PHASES', margin, currentY);
        currentY += 6;

        const phaseRows = pmPlan.phases.map((p, idx) => [idx + 1, p.name, p.deliverables.join(', ')]);
        (doc as any).autoTable({
          startY: currentY,
          head: [['#', 'PHASE NAME', 'KEY DELIVERABLES']],
          body: phaseRows,
          theme: 'grid',
          headStyles: { fillColor: [0, 82, 136], fontSize: 9, fontStyle: 'bold' },
          bodyStyles: { fontSize: 8 },
          margin: { left: margin, right: margin }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;

        if (currentY > pageHeight - 40) { doc.addPage(); currentY = 25; }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 82, 136);
        doc.text('2. PROCESS TAILORING DECISIONS', margin, currentY);
        currentY += 6;

        const tailoringRows = pmPlan.tailoringDecisions.map(d => [d.knowledgeArea, d.isTailoredOut ? 'Tailored Out' : 'Active', d.justification || 'N/A']);
        (doc as any).autoTable({
          startY: currentY,
          head: [['KNOWLEDGE AREA', 'STATUS', 'JUSTIFICATION']],
          body: tailoringRows,
          theme: 'grid',
          headStyles: { fillColor: [0, 82, 136], fontSize: 9, fontStyle: 'bold' },
          bodyStyles: { fontSize: 8 },
          margin: { left: margin, right: margin }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;

        if (currentY > pageHeight - 60) { doc.addPage(); currentY = 25; }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 82, 136);
        doc.text('3. PERFORMANCE BASELINES', margin, currentY);
        currentY += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('SCOPE BASELINE:', margin, currentY);
        currentY += 6;
        doc.setFont('helvetica', 'normal');
        const scopeLines = doc.splitTextToSize(pmPlan.baselines.scope || 'N/A', contentWidth);
        doc.text(scopeLines, margin, currentY);
        currentY += (scopeLines.length * 5) + 10;

        doc.setFont('helvetica', 'bold');
        doc.text('SCHEDULE BASELINE:', margin, currentY);
        currentY += 6;
        doc.setFont('helvetica', 'normal');
        const scheduleLines = doc.splitTextToSize(pmPlan.baselines.schedule || 'N/A', contentWidth);
        doc.text(scheduleLines, margin, currentY);
        currentY += (scheduleLines.length * 5) + 10;

        doc.setFont('helvetica', 'bold');
        doc.text('COST BASELINE:', margin, currentY);
        currentY += 6;
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Project Budget: $${pmPlan.baselines.cost.toLocaleString()} USD`, margin, currentY);
        currentY += 15;
      } else if (isQualityManagementPlan && qualityPlan) {
        // --- QUALITY MANAGEMENT PLAN PDF LAYOUT ---
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 82, 136);
        doc.text('1. QUALITY MANAGEMENT APPROACHES', margin, currentY);
        currentY += 10;

        const approaches = [
          { label: 'Quality Planning Approach', value: qualityPlan.planningApproach },
          { label: 'Quality Assurance Approach', value: qualityPlan.assuranceApproach },
          { label: 'Quality Control Approach', value: qualityPlan.controlApproach },
          { label: 'Quality Improvement Approach', value: qualityPlan.improvementApproach }
        ];

        for (const app of approaches) {
          if (currentY > pageHeight - 40) {
            doc.addPage();
            currentY = 25;
          }
          currentY += drawField(app.label, app.value || 'N/A', margin, currentY, contentWidth);
        }

        currentY += 15;
        if (currentY > pageHeight - 60) {
          doc.addPage();
          currentY = 25;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 82, 136);
        doc.text('2. ROLES & RESPONSIBILITIES', margin, currentY);
        currentY += 10;

        (doc as any).autoTable({
          startY: currentY,
          head: [['TEAM MEMBER', 'QUALITY ROLE', 'RESPONSIBILITIES', 'AUTHORITY']],
          body: qualityPlan.roles.map(r => [
            r.userName,
            r.roleTitle,
            r.responsibilities,
            r.hasTechnicalApproverAuthority ? 'Technical Approver' : 'Standard'
          ]),
          theme: 'grid',
          headStyles: { fillColor: [0, 82, 136], fontSize: 8, fontStyle: 'bold', halign: 'center' },
          bodyStyles: { fontSize: 8, textColor: [0, 0, 0] },
          alternateRowStyles: { fillColor: [240, 245, 250] },
          margin: { top: currentY, left: margin, right: margin }
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;
      } else {
        // Fallback to manual drawing for other terminal pages
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

          const val = formData[field] || selectedProject.pageData?.[page.id]?.[field] || 'N/A';
          
          if (currentY > pageHeight - 40) {
            doc.addPage();
            currentY = 25;
          }

          currentY += drawField(field, val, margin, currentY, contentWidth);
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
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const version = `V${(selectedProject.savedDocuments?.filter(d => d.pageId === page.id).length || 0) + 1}`;
      
      let fileName = '';
      if (isStakeholderRegister) {
        fileName = `${selectedProject.code || 'P00000'}_Stakeholder_Register_v${version}_${dateStr}.pdf`;
      } else if (isStakeholderAnalysis) {
        fileName = `${selectedProject.code || 'P00000'}_Stakeholder_Analysis_Matrix_v${version}_${dateStr}.pdf`;
      } else if (isChangeManagementPlan) {
        const vStr = changePlan?.version.toFixed(1) || '1.0';
        fileName = `${selectedProject.code || 'P16314'}-ZRY-MGT-PLN-CHG-${dateStr}-V${vStr}.pdf`;
      } else if (isProjectManagementPlan) {
        const vStr = pmPlan?.version.toFixed(1) || '1.0';
        fileName = `${selectedProject.code || 'P16314'}-ZRY-MGT-PLN-INT-${dateStr}-V${vStr}.pdf`;
      } else if (isQualityManagementPlan) {
        const vStr = qualityPlan?.version.toFixed(1) || '1.0';
        fileName = `${selectedProject.code || 'P16314'}-ZRY-MGT-PLN-QUA-${dateStr}-V${vStr}.pdf`;
      } else {
        fileName = `${generateZaryaFileName({
            projectCode: selectedProject.code || 'P00000',
            category: 'management',
            dept: page.id.startsWith('1.') ? 'INIT' : 
                  page.id.startsWith('2.') ? 'PLAN' : 
                  page.id.startsWith('3.') ? 'EXEC' : 
                  page.id.startsWith('4.') ? 'MON' : 'CLS',
            type: 'FRM',
            description: page.title,
            version: version
          })}.pdf`;
      }

      if (saveToDrive && selectedProject.driveFolderId) {
        const pdfBlob = doc.output('blob');
        
        // --- AUTOMATED STORAGE ROUTING ---
        let drivePath = '01_PROJECT_MANAGEMENT_FORMS';
        
        // Special Case: Project Charter (1.1.1) goes to 1.0_Initiating/1.1_Governance_Domain
        if (page.id === '1.1.1') {
          drivePath = '01_PROJECT_MANAGEMENT_FORMS/1.0_Initiating/1.1_Governance_Domain';
        } else if (page.id === '1.2.1' || page.id === '1.2.2') {
          drivePath = '01_PROJECT_MANAGEMENT_FORMS/1.0_Initiating/1.2_Stakeholders_Domain';
        } else if (page.id === '2.1.1') {
          drivePath = '01_PROJECT_MANAGEMENT_FORMS/2.0_Planning/2.1_Governance_Domain/2.1.1_CHANGE_MANAGEMENT_PLAN';
        } else if (page.id === '2.1.2') {
          drivePath = '01_PROJECT_MANAGEMENT_FORMS/2.0_Planning/2.1_Governance_Domain/2.1.2_PROJECT_MANAGEMENT_PLAN';
        } else if (page.id === '2.1.3') {
          drivePath = '01_PROJECT_MANAGEMENT_FORMS/2.0_Planning/2.1_Governance_Domain/2.1.3_QUALITY_MANAGEMENT_PLAN';
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
    const loadData = async () => {
      if (isCharterPage && selectedProject) {
        setFormData(selectedProject.charterData || {});
        // Fetch milestones from activities collection to ensure sync
        try {
          const q = query(
            collection(db, 'activities'), 
            where('projectId', '==', selectedProject.id),
            where('activityType', '==', 'Milestone')
          );
          const snap = await getDocs(q);
          const ms = snap.docs.map(d => ({ id: d.id, ...d.data() } as Activity));
          
          if (ms.length > 0) {
            setCharterMilestones(ms);
          } else if (selectedProject.charterData?.milestones_json) {
            // Fallback to JSON if no activities found (e.g. first time)
            const legacyMs = JSON.parse(selectedProject.charterData.milestones_json);
            setCharterMilestones(legacyMs.map((m: any) => ({
              id: m.id || crypto.randomUUID(),
              description: m.description,
              finishDate: m.date,
              activityType: 'Milestone',
              status: 'Planned',
              projectId: selectedProject.id
            } as Activity)));
          } else {
            setCharterMilestones([]);
          }

          // Fetch extra data for modal
          const boqSnap = await getDocs(query(collection(db, 'boq'), where('projectId', '==', selectedProject.id)));
          setBoqItems(boqSnap.docs.map(d => ({ id: d.id, ...d.data() } as BOQItem)));
          
          const wbsSnap = await getDocs(query(collection(db, 'wbs'), where('projectId', '==', selectedProject.id)));
          setWbsLevels(wbsSnap.docs.map(d => ({ id: d.id, ...d.data() } as WBSLevel)));
          
          const allSnap = await getDocs(query(collection(db, 'activities'), where('projectId', '==', selectedProject.id)));
          setAllActivities(allSnap.docs.map(d => ({ id: d.id, ...d.data() } as Activity)));

          if (selectedProject.charterData?.stakeholders_json) {
            setStakeholders(JSON.parse(selectedProject.charterData.stakeholders_json));
          } else {
            setStakeholders([]);
          }
        } catch (e) {
          console.error('Error loading milestones:', e);
          setCharterMilestones([]);
        }
      } else if (isStakeholderRegister && selectedProject) {
        try {
          const q = query(collection(db, 'stakeholders'), where('projectId', '==', selectedProject.id));
          const snap = await getDocs(q);
          setStakeholderRegister(snap.docs.map(d => ({ id: d.id, ...d.data() } as Stakeholder)));
        } catch (e) {
          console.error('Error loading stakeholder register:', e);
        }
      } else if (isStakeholderAnalysis && selectedProject) {
        try {
          const qAnalysis = query(collection(db, 'stakeholder_analysis'), where('projectId', '==', selectedProject.id));
          const snapAnalysis = await getDocs(qAnalysis);
          setStakeholderAnalysis(snapAnalysis.docs.map(d => ({ id: d.id, ...d.data() } as StakeholderAnalysis)));
          
          const qReg = query(collection(db, 'stakeholders'), where('projectId', '==', selectedProject.id));
          const snapReg = await getDocs(qReg);
          setStakeholderRegister(snapReg.docs.map(d => ({ id: d.id, ...d.data() } as Stakeholder)));
        } catch (e) {
          console.error('Error loading stakeholder analysis data:', e);
        }
      } else if (isChangeManagementPlan && selectedProject) {
        try {
          const q = query(collection(db, 'changeManagementPlans'), where('projectId', '==', selectedProject.id));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const plan = { id: snap.docs[0].id, ...snap.docs[0].data() } as ChangeManagementPlan;
            setChangePlan(plan);
            
            // Load versions
            const qv = query(collection(db, 'changeManagementVersions'), where('planId', '==', plan.id));
            const snapv = await getDocs(qv);
            setChangeVersions(snapv.docs.map(d => ({ id: d.id, ...d.data() } as ChangeManagementVersion)).sort((a, b) => b.version - a.version));
          } else {
            setChangePlan(null);
            setChangeVersions([]);
          }
        } catch (e) {
          console.error('Error loading change management plan:', e);
        }
      } else if (isProjectManagementPlan && selectedProject) {
        try {
          const q = query(collection(db, 'projectManagementPlans'), where('projectId', '==', selectedProject.id));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const plan = { id: snap.docs[0].id, ...snap.docs[0].data() } as ProjectManagementPlan;
            setPmPlan(plan);
            
            // Load versions
            const qv = query(collection(db, 'projectManagementVersions'), where('planId', '==', plan.id));
            const snapv = await getDocs(qv);
            setPmVersions(snapv.docs.map(d => ({ id: d.id, ...d.data() } as ProjectManagementVersion)).sort((a, b) => b.version - a.version));
          } else {
            // Initialize with default tailoring decisions if none exist
            const defaultTailoring: TailoringDecision[] = [
              { id: '1', knowledgeArea: 'Integration', isTailoredOut: false, justification: '' },
              { id: '2', knowledgeArea: 'Scope', isTailoredOut: false, justification: '' },
              { id: '3', knowledgeArea: 'Schedule', isTailoredOut: false, justification: '' },
              { id: '4', knowledgeArea: 'Cost', isTailoredOut: false, justification: '' },
              { id: '5', knowledgeArea: 'Quality', isTailoredOut: false, justification: '' },
              { id: '6', knowledgeArea: 'Resources', isTailoredOut: false, justification: '' },
              { id: '7', knowledgeArea: 'Communications', isTailoredOut: false, justification: '' },
              { id: '8', knowledgeArea: 'Risk', isTailoredOut: false, justification: '' },
              { id: '9', knowledgeArea: 'Procurement', isTailoredOut: false, justification: '' },
              { id: '10', knowledgeArea: 'Stakeholders', isTailoredOut: false, justification: '' },
            ];
            setPmPlan({
              id: '',
              projectId: selectedProject.id,
              phases: [],
              tailoringDecisions: defaultTailoring,
              baselines: { scope: '', schedule: '', cost: 0 },
              version: 1.0,
              lastUpdated: new Date().toISOString(),
              updatedBy: auth.currentUser?.displayName || 'System'
            });
          }
        } catch (e) {
          console.error('Error loading project management plan:', e);
        }
      } else if (isQualityManagementPlan && selectedProject) {
        try {
          const q = query(collection(db, 'qualityManagementPlans'), where('projectId', '==', selectedProject.id));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const plan = { id: snap.docs[0].id, ...snap.docs[0].data() } as QualityManagementPlan;
            setQualityPlan(plan);
            
            // Load versions
            const qv = query(collection(db, 'qualityManagementVersions'), where('planId', '==', plan.id));
            const snapv = await getDocs(qv);
            setQualityVersions(snapv.docs.map(d => ({ id: d.id, ...d.data() } as QualityManagementVersion)).sort((a, b) => b.version - a.version));
          } else {
            setQualityPlan(null);
            setQualityVersions([]);
          }
        } catch (e) {
          console.error('Error loading quality management plan:', e);
        }
      } else if (!isCharterPage && selectedProject?.pageData?.[page.id]) {
        setFormData(selectedProject.pageData[page.id]);
      } else {
        setFormData({});
        setCharterMilestones([]);
      }
    };

    loadData();
  }, [isCharterPage, selectedProject?.id, page.id]);

  const parent = getParent(page.id);
  const isLogPage = page.title.toLowerCase().includes('log') || 
                    page.title.toLowerCase().includes('register') ||
                    page.title.toLowerCase().includes('list') ||
                    page.title.toLowerCase().includes('matrix');



  const handleDeleteStakeholder = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this stakeholder?')) return;
    try {
      await deleteDoc(doc(db, 'stakeholders', id));
      // Log deletion
      const versionId = doc(collection(db, 'stakeholder_versions')).id;
      await setDoc(doc(db, 'stakeholder_versions', versionId), {
        id: versionId,
        stakeholderId: id,
        version: 0,
        timestamp: new Date().toISOString(),
        userId: auth.currentUser?.email || 'Unknown',
        actionType: 'Delete',
        data: {}
      });
      // Refresh list
      const q = query(collection(db, 'stakeholders'), where('projectId', '==', selectedProject?.id));
      const snap = await getDocs(q);
      setStakeholderRegister(snap.docs.map(d => ({ id: d.id, ...d.data() } as Stakeholder)));
    } catch (err) {
      console.error('Error deleting stakeholder:', err);
    }
  };

  const fetchStakeholderVersions = async (stakeholderId: string) => {
    try {
      const q = query(collection(db, 'stakeholder_versions'), where('stakeholderId', '==', stakeholderId));
      const snap = await getDocs(q);
      setStakeholderVersions(snap.docs.map(d => d.data() as StakeholderVersion).sort((a, b) => b.version - a.version));
      setShowStakeholderHistory(true);
    } catch (err) {
      console.error('Error fetching stakeholder versions:', err);
    }
  };
  const handleSaveStakeholder = async (asNewVersion: boolean = false) => {
    if (!selectedProject || !editingStakeholder) return;

    try {
      // Automated Calculations
      const influenceScore = editingStakeholder.influence === 'High' ? 5 : editingStakeholder.influence === 'Medium' ? 3 : 1;
      const expectationsScore = (editingStakeholder.expectations?.length || 0) > 50 ? 5 : (editingStakeholder.expectations?.length || 0) > 20 ? 3 : 1;
      const priorityScore = Math.min(10, influenceScore + expectationsScore);
      
      const commFreq = editingStakeholder.classification === 'Internal' 
        ? (editingStakeholder.influence === 'High' ? 'Daily' : 'Weekly')
        : (editingStakeholder.influence === 'High' ? 'Weekly' : 'Monthly');

      const engagementLevel = priorityScore >= 8 ? 'Red' : priorityScore >= 5 ? 'Amber' : 'Green';
      const criticalityIndex = editingStakeholder.influence === 'High' ? 10 : priorityScore;

      const currentVersion = editingStakeholder.version || 1;
      const newVersion = asNewVersion ? currentVersion + 1 : currentVersion;

      const updatedStakeholder: Stakeholder = {
        ...editingStakeholder,
        influenceScore,
        priorityScore,
        criticalityIndex,
        engagementLevel,
        communicationFrequency: commFreq,
        version: newVersion,
        projectId: selectedProject.id
      };

      let stakeholderId = updatedStakeholder.id;

      if (stakeholderId && !asNewVersion) {
        // Overwrite current
        await updateDoc(doc(db, 'stakeholders', stakeholderId), updatedStakeholder as any);
      } else {
        // Create new or save as new version (which in this case we might just update the same doc but increment version, 
        // or create a new doc if it's a completely new stakeholder)
        if (!stakeholderId) {
          const newDoc = await addDoc(collection(db, 'stakeholders'), updatedStakeholder);
          stakeholderId = newDoc.id;
          updatedStakeholder.id = stakeholderId;
        } else {
          // Save as new version - we update the existing doc with new version number
          await updateDoc(doc(db, 'stakeholders', stakeholderId), updatedStakeholder as any);
        }
      }

      // --- AUDIT TRAIL (Version History) ---
      try {
        const versionId = doc(collection(db, 'stakeholder_versions')).id;
        await setDoc(doc(db, 'stakeholder_versions', versionId), {
          id: versionId,
          stakeholderId: stakeholderId,
          version: newVersion,
          timestamp: new Date().toISOString(),
          userId: auth.currentUser?.email || 'Unknown',
          actionType: asNewVersion ? 'Edit' : (editingStakeholder.id ? 'Edit' : 'Create'),
          data: updatedStakeholder
        });
      } catch (e) {
        console.error('Error logging version history:', e);
      }

      // --- CROSS-DOMAIN SYNC: TEAM DIRECTORY ---
      try {
        const teamId = `team_${stakeholderId}`;
        await setDoc(doc(db, 'team_directory', teamId), {
          id: teamId,
          projectId: selectedProject.id,
          name: updatedStakeholder.name,
          role: updatedStakeholder.role,
          department: updatedStakeholder.position,
          email: updatedStakeholder.contactInfo,
          phone: updatedStakeholder.contactInfo,
          location: 'Main Site',
          workHours: '08:00 - 17:00'
        });
      } catch (e) {
        console.error('Error syncing to team directory:', e);
      }

      // --- CROSS-DOMAIN SYNC: REQUIREMENTS MATRIX ---
      if (updatedStakeholder.requirements) {
        try {
          const reqId = `req_${stakeholderId}`;
          await setDoc(doc(db, 'requirements_traceability', reqId), {
            id: reqId,
            projectId: selectedProject.id,
            requirement: updatedStakeholder.requirements,
            priority: updatedStakeholder.influence === 'High' ? 'High' : 'Medium',
            category: 'Stakeholder Requirement',
            source: updatedStakeholder.name,
            objective: updatedStakeholder.expectations || 'Project Success',
            status: 'Identified'
          });
        } catch (e) {
          console.error('Error syncing to requirements matrix:', e);
        }
      }

      // --- TO COMMUNICATIONS PLAN SYNC ---
      try {
        const commPlanId = `comm_${stakeholderId}`;
        const commRef = doc(db, 'communications_plan', commPlanId);
        
        await setDoc(commRef, {
          id: commPlanId,
          projectId: selectedProject.id,
          stakeholderId: stakeholderId,
          stakeholderName: updatedStakeholder.name,
          information: updatedStakeholder.requirements || 'Project Updates',
          method: updatedStakeholder.classification === 'Internal' ? 'Email/Meeting' : 'Official Letter',
          frequency: updatedStakeholder.communicationFrequency,
          sender: 'Project Manager',
          status: 'Active'
        });
      } catch (e) {
        console.error('Error syncing to communications plan:', e);
      }

      // --- TO VENDOR REGISTER SYNC ---
      if (updatedStakeholder.classification === 'External' && (updatedStakeholder.role?.toLowerCase().includes('subcontractor') || updatedStakeholder.role?.toLowerCase().includes('vendor'))) {
        try {
          const vendorId = `vendor_${stakeholderId}`;
          const vendorRef = doc(db, 'vendors', vendorId);
          
          await setDoc(vendorRef, {
            id: vendorId,
            projectId: selectedProject.id,
            vendorCode: `VND-${stakeholderId.substring(0, 4).toUpperCase()}`,
            name: updatedStakeholder.name,
            contactDetails: {
              address: updatedStakeholder.position || 'N/A',
              phone: updatedStakeholder.contactInfo || 'N/A',
              email: updatedStakeholder.contactInfo || 'N/A',
            },
            discipline: '01 - General Requirements',
            status: 'Active'
          });
        } catch (e) {
          console.error('Error syncing to vendor register:', e);
        }
      }

      setIsStakeholderModalOpen(false);
      setEditingStakeholder(null);
      // Refresh list
      const q = query(collection(db, 'stakeholders'), where('projectId', '==', selectedProject.id));
      const snap = await getDocs(q);
      setStakeholderRegister(snap.docs.map(d => ({ id: d.id, ...d.data() } as Stakeholder)));
    } catch (err) {
      console.error('Error saving stakeholder:', err);
    }
  };

  const handleSaveStakeholderAnalysis = async (asNewVersion: boolean = false) => {
    if (!selectedProject || !editingAnalysis) return;

    try {
      // Automated Calculation
      let strategy: 'Manage Closely' | 'Keep Satisfied' | 'Keep Informed' | 'Monitor' = 'Monitor';
      if (editingAnalysis.power > 5 && editingAnalysis.interest > 5) strategy = 'Manage Closely';
      else if (editingAnalysis.power > 5 && editingAnalysis.interest <= 5) strategy = 'Keep Satisfied';
      else if (editingAnalysis.power <= 5 && editingAnalysis.interest > 5) strategy = 'Keep Informed';
      else strategy = 'Monitor';

      const currentVersion = editingAnalysis.version || 1;
      const newVersion = asNewVersion ? currentVersion + 1 : currentVersion;

      const updatedAnalysis: StakeholderAnalysis = {
        ...editingAnalysis,
        strategy,
        version: newVersion,
        lastUpdated: new Date().toISOString(),
        updatedBy: auth.currentUser?.email || 'Unknown',
        projectId: selectedProject.id
      };

      let analysisId = updatedAnalysis.id;

      if (analysisId && !asNewVersion) {
        await updateDoc(doc(db, 'stakeholder_analysis', analysisId), updatedAnalysis as any);
      } else {
        if (!analysisId) {
          const newDoc = await addDoc(collection(db, 'stakeholder_analysis'), updatedAnalysis);
          analysisId = newDoc.id;
          updatedAnalysis.id = analysisId;
        } else {
          await updateDoc(doc(db, 'stakeholder_analysis', analysisId), updatedAnalysis as any);
        }
      }

      // --- SYSTEM AUDIT LOG ---
      try {
        const auditId = doc(collection(db, 'system_audit_log')).id;
        await setDoc(doc(db, 'system_audit_log', auditId), {
          id: auditId,
          projectId: selectedProject.id,
          module: 'Stakeholder Analysis Matrix',
          versionNumber: `v${newVersion}.0`,
          editorName: auth.currentUser?.email || 'Unknown',
          timestamp: new Date().toISOString(),
          actionType: asNewVersion ? 'New Version' : (editingAnalysis.id ? 'Update' : 'Create'),
          changeSummary: `Stakeholder: ${updatedAnalysis.stakeholderName}, Power: ${updatedAnalysis.power}, Interest: ${updatedAnalysis.interest}, Strategy: ${strategy}`,
          data: updatedAnalysis
        });
      } catch (e) {
        console.error('Error logging to system audit log:', e);
      }

      // --- VERSION HISTORY ---
      try {
        const versionId = doc(collection(db, 'stakeholder_analysis_versions')).id;
        await setDoc(doc(db, 'stakeholder_analysis_versions', versionId), {
          id: versionId,
          analysisId: analysisId,
          version: newVersion,
          timestamp: new Date().toISOString(),
          userId: auth.currentUser?.email || 'Unknown',
          actionType: asNewVersion ? 'Edit' : (editingAnalysis.id ? 'Edit' : 'Create'),
          data: updatedAnalysis,
          changeSummary: `Strategy set to ${strategy}`
        });
      } catch (e) {
        console.error('Error logging analysis version history:', e);
      }

      // --- SYNC TO COMMUNICATIONS PLAN ---
      if (updatedAnalysis.power > 5) {
        try {
          const commId = `comm_analysis_${analysisId}`;
          await setDoc(doc(db, 'communications_plan', commId), {
            id: commId,
            projectId: selectedProject.id,
            stakeholderId: updatedAnalysis.stakeholderId,
            stakeholderName: updatedAnalysis.stakeholderName,
            information: `Strategy: ${strategy}`,
            method: 'High Priority Reporting',
            frequency: strategy === 'Manage Closely' ? 'Weekly' : 'Monthly',
            sender: 'Project Manager',
            status: 'Active'
          });
        } catch (e) {
          console.error('Error syncing analysis to comms plan:', e);
        }
      }

      // Refresh list
      const q = query(collection(db, 'stakeholder_analysis'), where('projectId', '==', selectedProject.id));
      const snap = await getDocs(q);
      setStakeholderAnalysis(snap.docs.map(d => ({ id: d.id, ...d.data() } as StakeholderAnalysis)));
      
      setIsAnalysisModalOpen(false);
      setEditingAnalysis(null);
    } catch (err) {
      console.error('Error saving stakeholder analysis:', err);
    }
  };

  const handleDeleteAnalysis = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this analysis record?')) return;
    try {
      await deleteDoc(doc(db, 'stakeholder_analysis', id));
      // Refresh list
      const q = query(collection(db, 'stakeholder_analysis'), where('projectId', '==', selectedProject.id));
      const snap = await getDocs(q);
      setStakeholderAnalysis(snap.docs.map(d => ({ id: d.id, ...d.data() } as StakeholderAnalysis)));
    } catch (err) {
      console.error('Error deleting analysis:', err);
    }
  };

  const fetchAnalysisVersions = async (analysisId: string) => {
    try {
      const q = query(collection(db, 'stakeholder_analysis_versions'), where('analysisId', '==', analysisId));
      const snap = await getDocs(q);
      setAnalysisVersions(snap.docs.map(d => d.data() as StakeholderAnalysisVersion).sort((a, b) => b.version - a.version));
      setShowAnalysisHistory(true);
    } catch (err) {
      console.error('Error fetching analysis versions:', err);
    }
  };

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
          milestones_json: JSON.stringify(charterMilestones),
          stakeholders_json: JSON.stringify(stakeholders)
        };
        updates.charterData = updatedFormData;

        // --- STAKEHOLDER REGISTER SYNC ---
        try {
          // 1. Get existing stakeholders for this project
          const existingQ = query(collection(db, 'stakeholders'), where('projectId', '==', selectedProject.id));
          const existingSnap = await getDocs(existingQ);
          const existingStakeholders = existingSnap.docs.map(d => d.data() as Stakeholder);

          // 2. Prepare list of stakeholders to sync
          const toSync = [...stakeholders];
          
          if (formData['Project Sponsor']) {
            toSync.push({ name: formData['Project Sponsor'], role: 'Project Sponsor' });
          }
          if (formData['Project Manager']) {
            toSync.push({ name: formData['Project Manager'], role: 'Project Manager' });
          }

          // 3. Process each stakeholder
          for (const s of toSync) {
            if (!s.name) continue;

            const position = s.role || 'Stakeholder';
            const primaryKey = `${s.name}_${position}`;
            
            const exists = existingStakeholders.some(es => `${es.name}_${es.position}` === primaryKey);

            if (!exists) {
              const newStakeholder: Partial<Stakeholder> = {
                projectId: selectedProject.id,
                name: s.name,
                position: position,
                role: position,
                contactInfo: '',
                classification: 'Internal',
                influence: 'Medium',
                interest: 'Medium',
                expectations: '',
                requirements: '',
                priorityScore: 5,
                influenceScore: 2,
                engagementLevel: 'Amber',
                communicationFrequency: 'Weekly',
                category: 'Charter'
              };
              await addDoc(collection(db, 'stakeholders'), newStakeholder);
            }
          }
        } catch (e) {
          console.error('Error syncing stakeholders from charter:', e);
        }

        // Update project metadata from charter fields
        updates.name = formData['Project Title'] || selectedProject.name;
        updates.code = formData['Project Code'] || selectedProject.code;
        updates.manager = formData['Project Manager'] || selectedProject.manager;
        updates.sponsor = formData['Project Sponsor'] || selectedProject.sponsor;
        updates.customer = formData['Project Customer'] || selectedProject.customer;
        updates.startDate = formData['Date Prepared'] || selectedProject.startDate;
        updates.description = formData['Project Description'] || selectedProject.description;
        updates.baseCurrency = formData['Base Currency'] || selectedProject.baseCurrency || 'IQD';

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
  const renderStakeholderHistory = () => {
    if (!showStakeholderHistory) return null;
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-900">Stakeholder Version History</h3>
            <button onClick={() => setShowStakeholderHistory(false)} className="text-slate-400 hover:text-slate-600">
              <Plus className="w-6 h-6 rotate-45" />
            </button>
          </div>
          <div className="p-8 max-h-[60vh] overflow-y-auto space-y-4">
            {stakeholderVersions.map((v, i) => (
              <div key={i} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-[10px] font-bold">v{v.version}</span>
                    <span className="text-xs font-bold text-slate-700">{v.actionType}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(v.timestamp).toLocaleString()} by {v.userId}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    if (v.data) {
                      setEditingStakeholder({ ...v.data as Stakeholder, id: v.stakeholderId });
                      setShowStakeholderHistory(false);
                      setIsStakeholderModalOpen(true);
                    }
                  }}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  Restore
                </button>
              </div>
            ))}
            {stakeholderVersions.length === 0 && (
              <p className="text-center text-slate-400 italic py-8">No version history found for this stakeholder.</p>
            )}
          </div>
        </motion.div>
      </div>
    );
  };
  const renderStakeholderMatrix = () => {
    const quadrants = {
      'High Power / High Interest': stakeholderRegister.filter(s => s.influence === 'High' && (s.priorityScore || 0) >= 7),
      'High Power / Low Interest': stakeholderRegister.filter(s => s.influence === 'High' && (s.priorityScore || 0) < 7),
      'Low Power / High Interest': stakeholderRegister.filter(s => s.influence !== 'High' && (s.priorityScore || 0) >= 7),
      'Low Power / Low Interest': stakeholderRegister.filter(s => s.influence !== 'High' && (s.priorityScore || 0) < 7),
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 aspect-square max-w-4xl mx-auto relative">
          {/* Axis Labels */}
          <div className="absolute -left-12 top-1/2 -rotate-90 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Power / Influence</div>
          <div className="absolute left-1/2 -bottom-8 -translate-x-1/2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Interest / Expectations</div>

          {Object.entries(quadrants).map(([title, members], idx) => (
            <div key={title} className={cn(
              "p-6 rounded-3xl border-2 flex flex-col gap-4 transition-all",
              idx === 0 ? "bg-red-50/30 border-red-100" : 
              idx === 1 ? "bg-amber-50/30 border-amber-100" :
              idx === 2 ? "bg-blue-50/30 border-blue-100" :
              "bg-slate-50/30 border-slate-100"
            )}>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{title}</h4>
                <span className="px-2 py-0.5 bg-white border border-slate-100 rounded-full text-[10px] font-bold text-slate-500">{members.length}</span>
              </div>
              <div className="flex flex-wrap gap-2 overflow-y-auto max-h-[200px] pr-2 custom-scrollbar">
                {members.map(m => (
                  <div key={m.id} className="px-3 py-1.5 bg-white border border-slate-100 rounded-xl shadow-sm text-[11px] font-medium text-slate-700 flex items-center gap-2">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      m.influence === 'High' ? "bg-red-500" : m.influence === 'Medium' ? "bg-amber-500" : "bg-blue-500"
                    )} />
                    {m.name}
                  </div>
                ))}
                {members.length === 0 && <p className="text-[10px] text-slate-400 italic">No stakeholders in this quadrant</p>}
              </div>
            </div>
          ))}
          
          {/* Center Cross */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-200" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-200" />
          </div>
        </div>

        <div className="flex items-center justify-center gap-8 pt-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">High Influence</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Medium Influence</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Low Influence</span>
          </div>
        </div>
      </div>
    );
  };

  const renderStakeholderAnalysisModule = () => {
    const quadrants = {
      'Manage Closely': stakeholderAnalysis.filter(s => s.power > 5 && s.interest > 5),
      'Keep Satisfied': stakeholderAnalysis.filter(s => s.power > 5 && s.interest <= 5),
      'Keep Informed': stakeholderAnalysis.filter(s => s.power <= 5 && s.interest > 5),
      'Monitor': stakeholderAnalysis.filter(s => s.power <= 5 && s.interest <= 5),
    };

    const filteredAnalysis = stakeholderAnalysis.filter(s => 
      s.stakeholderName.toLowerCase().includes(analysisSearch.toLowerCase()) ||
      s.strategy.toLowerCase().includes(analysisSearch.toLowerCase())
    );

    return (
      <div className="space-y-12 pb-20">
        {/* Matrix Visualization */}
        <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="grid grid-cols-2 gap-6 aspect-square max-w-3xl mx-auto relative">
            {/* Axis Labels */}
            <div className="absolute -left-16 top-1/2 -rotate-90 text-[12px] font-black text-slate-400 uppercase tracking-[0.2em]">Power (1-10)</div>
            <div className="absolute left-1/2 -bottom-12 -translate-x-1/2 text-[12px] font-black text-slate-400 uppercase tracking-[0.2em]">Interest (1-10)</div>

            {Object.entries(quadrants).map(([strategy, members], idx) => (
              <div key={strategy} className={cn(
                "p-8 rounded-[2.5rem] border-2 flex flex-col gap-6 transition-all relative group overflow-hidden",
                strategy === 'Manage Closely' ? "bg-rose-50/40 border-rose-100" : 
                strategy === 'Keep Satisfied' ? "bg-amber-50/40 border-amber-100" :
                strategy === 'Keep Informed' ? "bg-blue-50/40 border-blue-100" :
                "bg-slate-50/40 border-slate-100"
              )}>
                <div className="flex items-center justify-between relative z-10">
                  <h4 className={cn(
                    "text-xs font-black uppercase tracking-widest",
                    strategy === 'Manage Closely' ? "text-rose-600" : 
                    strategy === 'Keep Satisfied' ? "text-amber-600" :
                    strategy === 'Keep Informed' ? "text-blue-600" :
                    "text-slate-500"
                  )}>{strategy}</h4>
                  <span className="px-3 py-1 bg-white/80 backdrop-blur-sm border border-white rounded-full text-[10px] font-black text-slate-400 shadow-sm">{members.length}</span>
                </div>
                
                <div className="flex flex-wrap gap-3 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar relative z-10">
                  {members.map(m => (
                    <motion.div 
                      key={m.id} 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="px-4 py-2 bg-white border border-slate-100 rounded-2xl shadow-sm text-xs font-bold text-slate-700 flex items-center gap-2 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => {
                        setEditingAnalysis(m);
                        setIsAnalysisModalOpen(true);
                      }}
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        m.power > 7 ? "bg-rose-500" : m.power > 4 ? "bg-amber-500" : "bg-blue-500"
                      )} />
                      {m.stakeholderName}
                    </motion.div>
                  ))}
                  {members.length === 0 && <p className="text-xs text-slate-300 italic font-medium">No stakeholders in this quadrant</p>}
                </div>

                {/* Background Decoration */}
                <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                  <BarChart3 className="w-32 h-32" />
                </div>
              </div>
            ))}
            
            {/* Center Cross */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-200" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-200" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-slate-200 rounded-full shadow-sm" />
            </div>
          </div>
        </div>

        {/* List View Table */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
          <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Stakeholder Analysis List</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Detailed Power/Interest Mapping</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search analysis..."
                  value={analysisSearch}
                  onChange={e => setAnalysisSearch(e.target.value)}
                  className="pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all w-64"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Stakeholder</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Power</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Interest</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Strategy</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Last Updated</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredAnalysis.map((analysis) => (
                  <tr key={analysis.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm">
                          {analysis.stakeholderName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">{analysis.stakeholderName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">v{analysis.version}.0</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden w-20">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${analysis.power * 10}%` }} />
                        </div>
                        <span className="text-xs font-black text-slate-600">{analysis.power}/10</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden w-20">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${analysis.interest * 10}%` }} />
                        </div>
                        <span className="text-xs font-black text-slate-600">{analysis.interest}/10</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-block",
                        analysis.strategy === 'Manage Closely' ? "bg-rose-50 text-rose-600 border border-rose-100" : 
                        analysis.strategy === 'Keep Satisfied' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                        analysis.strategy === 'Keep Informed' ? "bg-blue-50 text-blue-600 border border-blue-100" :
                        "bg-slate-50 text-slate-600 border border-slate-100"
                      )}>
                        {analysis.strategy}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-tighter">
                      {new Date(analysis.lastUpdated).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setEditingAnalysis(analysis);
                            setIsAnalysisModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => fetchAnalysisVersions(analysis.id)}
                          className="p-2 text-slate-400 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all"
                          title="Audit Trail"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteAnalysis(analysis.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Floating Action Button */}
        <button 
          onClick={() => {
            setEditingAnalysis({
              id: '',
              projectId: selectedProject?.id || '',
              stakeholderId: '',
              stakeholderName: '',
              power: 5,
              interest: 5,
              strategy: 'Monitor',
              version: 1,
              lastUpdated: new Date().toISOString(),
              updatedBy: auth.currentUser?.email || 'Unknown'
            });
            setIsAnalysisModalOpen(true);
          }}
          className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-600/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40"
        >
          <Plus className="w-8 h-8" />
        </button>
      </div>
    );
  };

  const renderAnalysisModal = () => {
    if (!isAnalysisModalOpen || !editingAnalysis) return null;

    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm">
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="bg-white w-full max-w-xl h-full shadow-2xl overflow-y-auto"
        >
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{editingAnalysis.id ? 'Edit Analysis' : 'New Stakeholder Analysis'}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Matrix Mapping v{editingAnalysis.version}.0</p>
            </div>
            <button onClick={() => setIsAnalysisModalOpen(false)} className="p-3 hover:bg-slate-200 rounded-full transition-colors">
              <Plus className="w-6 h-6 rotate-45 text-slate-400" />
            </button>
          </div>
          
          <div className="p-10 space-y-10">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Select Stakeholder</label>
              <select 
                value={editingAnalysis.stakeholderId}
                onChange={e => {
                  const s = stakeholderRegister.find(sh => sh.id === e.target.value);
                  setEditingAnalysis({...editingAnalysis, stakeholderId: e.target.value, stakeholderName: s?.name || ''});
                }}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              >
                <option value="">Choose from Register...</option>
                {stakeholderRegister.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 font-medium italic">Only stakeholders from the Register can be analyzed.</p>
            </div>

            <div className="grid grid-cols-1 gap-10">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Power Level (1-10)</label>
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-black">{editingAnalysis.power}</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={editingAnalysis.power}
                  onChange={e => setEditingAnalysis({...editingAnalysis, power: parseInt(e.target.value)})}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                  <span>Low Influence</span>
                  <span>High Influence</span>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Interest Level (1-10)</label>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black">{editingAnalysis.interest}</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={editingAnalysis.interest}
                  onChange={e => setEditingAnalysis({...editingAnalysis, interest: parseInt(e.target.value)})}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                  <span>Passive</span>
                  <span>Active</span>
                </div>
              </div>
            </div>

            {/* Strategy Preview */}
            <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white space-y-4 shadow-2xl shadow-slate-900/20">
              <div className="flex items-center gap-3 opacity-60">
                <BarChart3 className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Calculated Strategy</span>
              </div>
              <h4 className="text-2xl font-black tracking-tight">
                {(() => {
                  if (editingAnalysis.power > 5 && editingAnalysis.interest > 5) return 'Manage Closely';
                  if (editingAnalysis.power > 5 && editingAnalysis.interest <= 5) return 'Keep Satisfied';
                  if (editingAnalysis.power <= 5 && editingAnalysis.interest > 5) return 'Keep Informed';
                  return 'Monitor';
                })()}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                {(() => {
                  if (editingAnalysis.power > 5 && editingAnalysis.interest > 5) return 'Focus maximum effort on this group. Involve them in decision making and keep them fully engaged.';
                  if (editingAnalysis.power > 5 && editingAnalysis.interest <= 5) return 'Keep them satisfied with progress but avoid over-communication. Ensure their needs are met to prevent opposition.';
                  if (editingAnalysis.power <= 5 && editingAnalysis.interest > 5) return 'Keep them informed of progress to ensure no issues arise. They can be very helpful with project details.';
                  return 'Monitor with minimum effort. Keep an eye on them in case their power or interest levels change.';
                })()}
              </p>
            </div>

            <div className="flex flex-col gap-4 pt-10">
              {editingAnalysis.id ? (
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => handleSaveStakeholderAnalysis(false)}
                    className="py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-3xl text-sm font-black hover:bg-slate-50 transition-all shadow-sm"
                  >
                    Update Current
                  </button>
                  <button 
                    onClick={() => handleSaveStakeholderAnalysis(true)}
                    className="py-4 bg-blue-600 text-white rounded-3xl text-sm font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20"
                  >
                    Save as v{editingAnalysis.version + 1}.0
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => handleSaveStakeholderAnalysis(false)}
                  className="w-full py-5 bg-blue-600 text-white rounded-3xl text-sm font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3"
                >
                  <Save className="w-5 h-5" />
                  Finalize Analysis
                </button>
              )}
              <button 
                onClick={() => setIsAnalysisModalOpen(false)}
                className="w-full py-4 text-sm font-black text-slate-400 hover:text-slate-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderAnalysisHistory = () => {
    if (!showAnalysisHistory) return null;

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
        >
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 text-white rounded-xl">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Audit Trail & Version History</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stakeholder Analysis Matrix</p>
              </div>
            </div>
            <button onClick={() => setShowAnalysisHistory(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <Plus className="w-6 h-6 rotate-45 text-slate-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
            {analysisVersions.map((v, idx) => (
              <div key={v.id} className="relative pl-8 pb-6 border-l-2 border-slate-100 last:border-0 last:pb-0">
                <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-blue-600" />
                <div className="bg-slate-50 rounded-2xl p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest">Version {v.version}.0</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{new Date(v.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    {v.userId}
                  </div>
                  <p className="text-sm font-medium text-slate-700 leading-relaxed">{v.changeSummary}</p>
                  <div className="pt-3 flex gap-4">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Power: <span className="text-blue-600">{v.data.power}</span></div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Interest: <span className="text-emerald-600">{v.data.interest}</span></div>
                  </div>
                </div>
              </div>
            ))}
            {analysisVersions.length === 0 && (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 italic">No version history found for this record.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  };

  const handleSaveChangePlan = async (isNewVersion: boolean, summary: string) => {
    if (!selectedProject || !changePlan) return;

    try {
      const planRef = doc(db, 'changeManagementPlans', changePlan.id);
      const newVersion = isNewVersion ? (changePlan.version || 1) + 0.1 : changePlan.version;
      const roundedVersion = Math.round(newVersion * 10) / 10;

      const updatedPlan = {
        ...changePlan,
        version: roundedVersion,
        lastUpdated: new Date().toISOString(),
        updatedBy: auth.currentUser?.email || 'Unknown'
      };

      await updateDoc(planRef, updatedPlan as any);

      // Save version history
      const versionId = doc(collection(db, 'changeManagementVersions')).id;
      await setDoc(doc(db, 'changeManagementVersions', versionId), {
        id: versionId,
        planId: changePlan.id,
        version: roundedVersion,
        timestamp: new Date().toISOString(),
        userId: auth.currentUser?.uid || 'Unknown',
        userName: auth.currentUser?.email || 'Unknown',
        data: updatedPlan,
        changeSummary: summary
      });

      setChangePlan(updatedPlan);
      // Refresh versions list
      const qv = query(collection(db, 'changeManagementVersions'), where('planId', '==', changePlan.id));
      const snapv = await getDocs(qv);
      setChangeVersions(snapv.docs.map(d => ({ id: d.id, ...d.data() } as ChangeManagementVersion)).sort((a, b) => b.version - a.version));

      alert('Change Management Plan saved successfully.');
    } catch (e) {
      console.error('Error saving change plan:', e);
      alert('Failed to save Change Management Plan.');
    }
  };

  const handleSaveQualityPlan = async (isNewVersion: boolean, summary: string) => {
    if (!selectedProject || !qualityPlan) return;

    try {
      const currentVersion = qualityPlan.version || 1.0;
      const newVersion = isNewVersion ? currentVersion + 1.0 : currentVersion;

      const updatedPlan: QualityManagementPlan = {
        ...qualityPlan,
        version: newVersion,
        lastUpdated: new Date().toISOString(),
        updatedBy: auth.currentUser?.displayName || 'System'
      };

      let planId = qualityPlan.id;
      if (planId) {
        await updateDoc(doc(db, 'qualityManagementPlans', planId), updatedPlan as any);
      } else {
        const docRef = await addDoc(collection(db, 'qualityManagementPlans'), updatedPlan);
        planId = docRef.id;
        updatedPlan.id = planId;
      }

      // --- SYSTEM AUDIT LOG ---
      const auditId = doc(collection(db, 'system_audit_log')).id;
      await setDoc(doc(db, 'system_audit_log', auditId), {
        id: auditId,
        projectId: selectedProject.id,
        module: 'Quality Management Plan',
        versionNumber: `v${newVersion.toFixed(1)}`,
        editorName: auth.currentUser?.displayName || 'System',
        timestamp: new Date().toISOString(),
        actionType: isNewVersion ? 'New Version' : 'Update',
        changeSummary: summary,
        data: updatedPlan
      });

      // --- VERSION HISTORY ---
      const versionId = doc(collection(db, 'qualityManagementVersions')).id;
      await setDoc(doc(db, 'qualityManagementVersions', versionId), {
        id: versionId,
        planId: planId,
        version: newVersion,
        timestamp: new Date().toISOString(),
        userId: auth.currentUser?.uid || 'system',
        userName: auth.currentUser?.displayName || 'System',
        data: updatedPlan,
        changeSummary: summary
      });

      // --- LOGIC COUPLING: TEAM DIRECTORY ---
      for (const role of updatedPlan.roles) {
        try {
          const teamId = `quality_role_${role.id}`;
          await setDoc(doc(db, 'team_directory', teamId), {
            id: teamId,
            projectId: selectedProject.id,
            name: role.userName,
            role: role.roleTitle,
            department: 'Quality Assurance',
            email: '', 
            phoneNumbers: '',
            location: 'Site Office',
            workHours: 'Standard',
            source: 'Quality Management Plan'
          }, { merge: true });
        } catch (e) {
          console.error('Error syncing to team directory:', e);
        }
      }

      // --- LOGIC COUPLING: QUALITY MILESTONES ---
      if (updatedPlan.assuranceApproach) {
        const lines = updatedPlan.assuranceApproach.split('\n');
        for (const line of lines) {
          // Look for lines like "Audit 1: 2026-05-15" or "Quality Audit - 2026-06-01"
          if (line.toLowerCase().includes('audit')) {
            const dateMatch = line.match(/\d{4}-\d{2}-\d{2}/);
            if (dateMatch) {
              const date = dateMatch[0];
              const title = line.trim();
              
              try {
                // Check if milestone already exists to avoid duplicates
                const milestoneQuery = query(
                  collection(db, 'activities'),
                  where('projectId', '==', selectedProject.id),
                  where('description', '==', `Quality Audit: ${title}`),
                  where('activityType', '==', 'Milestone')
                );
                const milestoneSnap = await getDocs(milestoneQuery);
                
                if (milestoneSnap.empty) {
                  await addDoc(collection(db, 'activities'), {
                    projectId: selectedProject.id,
                    description: `Quality Audit: ${title}`,
                    plannedStart: date,
                    plannedFinish: date,
                    activityType: 'Milestone',
                    status: 'Planned',
                    progress: 0,
                    createdAt: new Date().toISOString()
                  });
                }
              } catch (e) {
                console.error('Error creating quality milestone:', e);
              }
            }
          }
        }
      }

      setQualityPlan(updatedPlan);
      setIsEditing(false);
      
      // Refresh versions
      const qv = query(collection(db, 'qualityManagementVersions'), where('planId', '==', planId));
      const snapv = await getDocs(qv);
      setQualityVersions(snapv.docs.map(d => ({ id: d.id, ...d.data() } as QualityManagementVersion)).sort((a, b) => b.version - a.version));

      alert(`Quality Management Plan ${isNewVersion ? 'versioned' : 'updated'} successfully!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'qualityManagementPlans');
    }
  };

  const handleSavePmPlan = async (isNewVersion: boolean, summary: string) => {
    if (!selectedProject || !pmPlan) return;

    try {
      const newVersion = isNewVersion ? Math.floor(pmPlan.version || 1) + 1.0 : pmPlan.version;
      const roundedVersion = Math.round(newVersion * 10) / 10;

      const updatedPlan = {
        ...pmPlan,
        version: roundedVersion,
        lastUpdated: new Date().toISOString(),
        updatedBy: auth.currentUser?.email || 'Unknown'
      };

      let planId = pmPlan.id;
      if (!planId) {
        const newPlanRef = doc(collection(db, 'projectManagementPlans'));
        planId = newPlanRef.id;
        updatedPlan.id = planId;
        await setDoc(newPlanRef, updatedPlan);
      } else {
        await updateDoc(doc(db, 'projectManagementPlans', planId), updatedPlan as any);
      }

      // Save version history
      const versionId = doc(collection(db, 'projectManagementVersions')).id;
      await setDoc(doc(db, 'projectManagementVersions', versionId), {
        id: versionId,
        planId: planId,
        version: roundedVersion,
        timestamp: new Date().toISOString(),
        userId: auth.currentUser?.uid || 'Unknown',
        userName: auth.currentUser?.email || 'Unknown',
        data: updatedPlan,
        changeSummary: summary
      });

      setPmPlan(updatedPlan);
      // Refresh versions list
      const qv = query(collection(db, 'projectManagementVersions'), where('planId', '==', planId));
      const snapv = await getDocs(qv);
      setPmVersions(snapv.docs.map(d => ({ id: d.id, ...d.data() } as ProjectManagementVersion)).sort((a, b) => b.version - a.version));

      alert('Project Management Plan saved successfully.');
    } catch (e) {
      console.error('Error saving PM plan:', e);
      alert('Failed to save Project Management Plan.');
    }
  };

  const handlePhaseSave = async (phase: ProjectPhase) => {
    if (!pmPlan) return;
    const updatedPhases = [...pmPlan.phases];
    const index = updatedPhases.findIndex(p => p.id === phase.id);
    if (index >= 0) {
      updatedPhases[index] = phase;
    } else {
      updatedPhases.push(phase);
    }
    setPmPlan({ ...pmPlan, phases: updatedPhases });
    setIsPhaseModalOpen(false);
    setEditingPhase(null);
  };

  const handleDeletePhase = (id: string) => {
    if (!pmPlan || !window.confirm('Are you sure you want to delete this phase?')) return;
    const updatedPhases = pmPlan.phases.filter(p => p.id !== id);
    setPmPlan({ ...pmPlan, phases: updatedPhases });
  };

  const handleTailoringSave = (decision: TailoringDecision) => {
    if (!pmPlan) return;
    const updatedDecisions = pmPlan.tailoringDecisions.map(d => d.id === decision.id ? decision : d);
    setPmPlan({ ...pmPlan, tailoringDecisions: updatedDecisions });
    setIsTailoringModalOpen(false);
    setEditingTailoring(null);
  };

  const handleCCBMemberSave = async (member: CCBMember) => {
    if (!selectedProject) return;

    try {
      let currentPlan = changePlan;
      if (!currentPlan) {
        // Create initial plan if it doesn't exist
        const planId = doc(collection(db, 'changeManagementPlans')).id;
        currentPlan = {
          id: planId,
          projectId: selectedProject.id,
          approach: '',
          definitions: '',
          budgetThreshold: 5000,
          scheduleThreshold: 5,
          ccbMembers: [],
          version: 1.0,
          lastUpdated: new Date().toISOString(),
          updatedBy: auth.currentUser?.email || 'Unknown'
        };
        await setDoc(doc(db, 'changeManagementPlans', planId), currentPlan);
      }

      const existingIndex = currentPlan.ccbMembers.findIndex(m => m.id === member.id);
      let updatedMembers;
      if (existingIndex >= 0) {
        updatedMembers = [...currentPlan.ccbMembers];
        updatedMembers[existingIndex] = member;
      } else {
        updatedMembers = [...currentPlan.ccbMembers, member];
      }

      const updatedPlan = { ...currentPlan, ccbMembers: updatedMembers };
      await updateDoc(doc(db, 'changeManagementPlans', currentPlan.id), { ccbMembers: updatedMembers });
      setChangePlan(updatedPlan);
      setIsCCBModalOpen(false);
      setEditingCCBMember(null);
    } catch (e) {
      console.error('Error saving CCB member:', e);
    }
  };

  const handleDeleteCCBMember = async (id: string) => {
    if (!changePlan || !window.confirm('Are you sure you want to remove this CCB member?')) return;

    try {
      const updatedMembers = changePlan.ccbMembers.filter(m => m.id !== id);
      await updateDoc(doc(db, 'changeManagementPlans', changePlan.id), { ccbMembers: updatedMembers });
      setChangePlan({ ...changePlan, ccbMembers: updatedMembers });
    } catch (e) {
      console.error('Error deleting CCB member:', e);
    }
  };

  const renderChangeManagementPlan = () => {
    if (!changePlan) {
      return (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <FileText className="w-16 h-16 text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No Change Management Plan Found</h3>
          <p className="text-slate-500 mb-8">Initialize the plan to start managing project changes.</p>
          <button 
            onClick={() => handleCCBMemberSave({ id: crypto.randomUUID(), name: '', role: '', responsibility: '', authority: 'Low' })}
            className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
          >
            Initialize Plan
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-12 pb-20">
        {/* Header Section */}
        <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Change Management Plan</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Version {changePlan.version.toFixed(1)} • Last Updated: {new Date(changePlan.lastUpdated).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowChangeHistory(true)}
                className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-all"
                title="Version History"
              >
                <History className="w-5 h-5" />
              </button>
              <button 
                onClick={() => generatePDF(true)}
                className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-all"
                title="Download PDF"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Management Approach</label>
              <textarea 
                value={changePlan.approach}
                onChange={e => setChangePlan({ ...changePlan, approach: e.target.value })}
                placeholder="Describe the overall approach to managing changes..."
                className="w-full h-40 p-6 bg-slate-50 border-none rounded-3xl text-sm font-medium text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
              />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Definitions of Change</label>
              <textarea 
                value={changePlan.definitions}
                onChange={e => setChangePlan({ ...changePlan, definitions: e.target.value })}
                placeholder="Define what constitutes a project change..."
                className="w-full h-40 p-6 bg-slate-50 border-none rounded-3xl text-sm font-medium text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            <div className="bg-slate-50 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Budget Change Threshold</label>
                <DollarSign className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex items-center gap-4">
                <input 
                  type="number"
                  value={changePlan.budgetThreshold}
                  onChange={e => setChangePlan({ ...changePlan, budgetThreshold: Number(e.target.value) })}
                  className="bg-transparent text-2xl font-black text-slate-900 outline-none w-full"
                />
                <span className="text-xs font-bold text-slate-400">USD</span>
              </div>
              <p className="text-[10px] text-slate-400 italic">Changes exceeding this amount require CCB approval.</p>
            </div>
            <div className="bg-slate-50 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Schedule Change Threshold</label>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex items-center gap-4">
                <input 
                  type="number"
                  value={changePlan.scheduleThreshold}
                  onChange={e => setChangePlan({ ...changePlan, scheduleThreshold: Number(e.target.value) })}
                  className="bg-transparent text-2xl font-black text-slate-900 outline-none w-full"
                />
                <span className="text-xs font-bold text-slate-400">DAYS</span>
              </div>
              <p className="text-[10px] text-slate-400 italic">Delays exceeding this duration require CCB approval.</p>
            </div>
          </div>
        </div>

        {/* CCB Register Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900 tracking-tight">Change Control Board (CCB)</h4>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authority & Responsibility Register</p>
              </div>
            </div>
            <button 
              onClick={() => {
                setEditingCCBMember({ id: crypto.randomUUID(), name: '', role: '', responsibility: '', authority: 'Low' });
                setIsCCBModalOpen(true);
              }}
              className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add CCB Member
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Member Name</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Project Role</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsibility</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Authority</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {changePlan.ccbMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="text-sm font-bold text-slate-900">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm font-medium text-slate-600">{member.role}</td>
                    <td className="px-8 py-5 text-sm font-medium text-slate-600 max-w-xs truncate">{member.responsibility}</td>
                    <td className="px-8 py-5 text-center">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        member.authority === 'High' ? "bg-red-100 text-red-600" :
                        member.authority === 'Medium' ? "bg-amber-100 text-amber-600" :
                        "bg-blue-100 text-blue-600"
                      )}>
                        {member.authority}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingCCBMember(member);
                            setIsCCBModalOpen(true);
                          }}
                          className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-blue-600 transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteCCBMember(member.id)}
                          className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-red-600 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {changePlan.ccbMembers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center text-slate-400 italic">No CCB members defined yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Save Actions */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-900 rounded-[2rem] p-8 shadow-2xl shadow-slate-900/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="text-white font-bold">Finalize Plan Version</h4>
              <p className="text-slate-400 text-xs">Commit changes to the project governance baseline.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setPendingSaveAction('overwrite');
                setShowPinModal(true);
              }}
              className="px-6 py-3 bg-white/10 text-white rounded-2xl text-xs font-bold hover:bg-white/20 transition-all"
            >
              Overwrite Current
            </button>
            <button 
              onClick={() => {
                const summary = window.prompt('Enter a summary of changes for this version:');
                if (summary) handleSaveChangePlan(true, summary);
              }}
              className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
            >
              Save as New Version (v{(changePlan.version + 0.1).toFixed(1)})
            </button>
          </div>
        </div>

        {/* Version History List */}
        <div className="space-y-6">
          <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">Historical Versions</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {changeVersions.map((v) => (
              <div key={v.id} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest">v{v.version.toFixed(1)}</span>
                  <span className="text-[10px] font-bold text-slate-400">{new Date(v.timestamp).toLocaleDateString()}</span>
                </div>
                <p className="text-xs font-medium text-slate-600 mb-4 line-clamp-2 italic">"{v.changeSummary}"</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-[8px] font-black text-blue-600">
                      {v.userName.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{v.userName}</span>
                  </div>
                  <button 
                    onClick={() => setChangePlan(v.data as ChangeManagementPlan)}
                    className="text-[10px] font-black text-blue-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Restore
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderQualityRoleModal = () => {
    if (!isQualityRoleModalOpen || !editingQualityRole) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
        >
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Quality Role Assignment</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Assign Responsibilities</p>
            </div>
            <button onClick={() => setIsQualityRoleModalOpen(false)} className="p-3 hover:bg-slate-200 rounded-full transition-colors">
              <Plus className="w-6 h-6 rotate-45 text-slate-400" />
            </button>
          </div>
          
          <div className="p-10 space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Select Team Member</label>
              <select 
                value={editingQualityRole.userId}
                onChange={e => {
                  const u = users.find(user => user.uid === e.target.value);
                  setEditingQualityRole({...editingQualityRole, userId: e.target.value, userName: u?.name || ''});
                }}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              >
                <option value="">Select from Team...</option>
                {users.map(u => (
                  <option key={u.uid} value={u.uid}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Role Title</label>
              <input 
                type="text" 
                value={editingQualityRole.roleTitle}
                onChange={e => setEditingQualityRole({...editingQualityRole, roleTitle: e.target.value})}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                placeholder="e.g. Quality Assurance Manager"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Responsibilities</label>
              <textarea 
                value={editingQualityRole.responsibilities}
                onChange={e => setEditingQualityRole({...editingQualityRole, responsibilities: e.target.value})}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all h-32 resize-none"
                placeholder="List specific quality responsibilities..."
              />
            </div>

            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl">
              <input 
                type="checkbox" 
                id="techAuth"
                checked={editingQualityRole.hasTechnicalApproverAuthority}
                onChange={e => setEditingQualityRole({...editingQualityRole, hasTechnicalApproverAuthority: e.target.checked})}
                className="w-5 h-5 rounded border-blue-200 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="techAuth" className="text-xs font-bold text-blue-700">
                Grant "Approver" Authority in Technical Divisions
              </label>
            </div>

            <button 
              onClick={() => {
                if (!qualityPlan || !editingQualityRole.userId) return;
                const roles = [...qualityPlan.roles];
                const idx = roles.findIndex(r => r.id === editingQualityRole.id);
                if (idx >= 0) roles[idx] = editingQualityRole;
                else roles.push(editingQualityRole);
                setQualityPlan({...qualityPlan, roles});
                setIsQualityRoleModalOpen(false);
              }}
              className="w-full py-5 bg-slate-900 text-white rounded-3xl text-sm font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
            >
              Save Role Assignment
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderQualityHistory = () => {
    if (!showQualityHistory) return null;

    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm">
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          className="bg-slate-50 w-full max-w-md h-full shadow-2xl overflow-y-auto"
        >
          <div className="p-8 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-10">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Version History</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Quality Management Plan</p>
            </div>
            <button onClick={() => setShowQualityHistory(false)} className="p-3 hover:bg-slate-100 rounded-full transition-colors">
              <Plus className="w-6 h-6 rotate-45 text-slate-400" />
            </button>
          </div>
          
          <div className="p-8 space-y-4">
            {qualityVersions.map((v) => (
              <div key={v.id} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest">v{v.version.toFixed(1)}</span>
                  <span className="text-[10px] font-bold text-slate-400">{new Date(v.timestamp).toLocaleDateString()}</span>
                </div>
                <p className="text-xs font-medium text-slate-600 mb-4 line-clamp-2 italic">"{v.changeSummary}"</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-[8px] font-black text-blue-600">
                      {v.userName.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{v.userName}</span>
                  </div>
                  <button 
                    onClick={() => setQualityPlan(v.data as QualityManagementPlan)}
                    className="text-[10px] font-black text-blue-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Restore
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  };

  const renderQualityManagementPlan = () => {
    if (!qualityPlan) {
      return (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <ShieldCheck className="w-16 h-16 text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No Quality Management Plan Found</h3>
          <p className="text-slate-500 mb-8">Initialize the plan to start managing quality standards.</p>
          <button 
            onClick={() => {
              const newPlan: QualityManagementPlan = {
                id: '',
                projectId: selectedProject?.id || '',
                planningApproach: '',
                assuranceApproach: '',
                controlApproach: '',
                improvementApproach: '',
                acceptanceCriteriaLogic: '',
                roles: [],
                version: 1.0,
                lastUpdated: new Date().toISOString(),
                updatedBy: auth.currentUser?.displayName || 'System'
              };
              setQualityPlan(newPlan);
              setIsEditing(true);
            }}
            className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
          >
            Initialize Plan
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-12 pb-20">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <RefreshCw className="w-6 h-6" />
              </div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Version</span>
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tighter">v{qualityPlan.version.toFixed(1)}</div>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tight">Last Updated: {new Date(qualityPlan.lastUpdated).toLocaleDateString()}</p>
          </div>
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <UserCheck className="w-6 h-6" />
              </div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Quality Roles</span>
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tighter">{qualityPlan.roles.length}</div>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tight">Assigned Personnel</p>
          </div>
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Compliance</span>
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tighter">High</div>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tight">System Health Status</p>
          </div>
        </div>

        {/* Top Section: Approaches */}
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden">
          <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Quality Management Approaches</h3>
              <p className="text-sm font-medium text-slate-500">Define how quality will be planned, assured, controlled, and improved.</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowQualityHistory(true)}
                className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 rounded-2xl transition-all shadow-sm"
              >
                <History className="w-5 h-5" />
              </button>
              {!isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Plan
                </button>
              ) : (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      const summary = prompt('Enter a summary of changes:');
                      if (summary !== null) handleSaveQualityPlan(false, summary || 'Minor update');
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
                  >
                    Update Current
                  </button>
                  <button 
                    onClick={() => {
                      const summary = prompt('Enter a summary for this new version:');
                      if (summary !== null) handleSaveQualityPlan(true, summary || 'New major version');
                    }}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
                  >
                    Save as New Version
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quality Planning Approach</label>
              {isEditing ? (
                <textarea 
                  value={qualityPlan.planningApproach}
                  onChange={e => setQualityPlan({...qualityPlan, planningApproach: e.target.value})}
                  className="w-full h-40 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                  placeholder="Describe how quality standards will be identified..."
                />
              ) : (
                <div className="p-6 bg-slate-50 rounded-2xl text-sm text-slate-600 leading-relaxed italic border border-slate-100 min-h-[10rem]">
                  {qualityPlan.planningApproach || 'No approach defined yet.'}
                </div>
              )}
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quality Assurance Approach</label>
              {isEditing ? (
                <textarea 
                  value={qualityPlan.assuranceApproach}
                  onChange={e => setQualityPlan({...qualityPlan, assuranceApproach: e.target.value})}
                  className="w-full h-40 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                  placeholder="Describe the auditing and verification processes..."
                />
              ) : (
                <div className="p-6 bg-slate-50 rounded-2xl text-sm text-slate-600 leading-relaxed italic border border-slate-100 min-h-[10rem]">
                  {qualityPlan.assuranceApproach || 'No approach defined yet.'}
                </div>
              )}
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quality Control Approach</label>
              {isEditing ? (
                <textarea 
                  value={qualityPlan.controlApproach}
                  onChange={e => setQualityPlan({...qualityPlan, controlApproach: e.target.value})}
                  className="w-full h-40 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                  placeholder="Describe the monitoring and recording of results..."
                />
              ) : (
                <div className="p-6 bg-slate-50 rounded-2xl text-sm text-slate-600 leading-relaxed italic border border-slate-100 min-h-[10rem]">
                  {qualityPlan.controlApproach || 'No approach defined yet.'}
                </div>
              )}
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quality Improvement Approach</label>
              {isEditing ? (
                <textarea 
                  value={qualityPlan.improvementApproach}
                  onChange={e => setQualityPlan({...qualityPlan, improvementApproach: e.target.value})}
                  className="w-full h-40 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                  placeholder="Describe the process for continuous improvement..."
                />
              ) : (
                <div className="p-6 bg-slate-50 rounded-2xl text-sm text-slate-600 leading-relaxed italic border border-slate-100 min-h-[10rem]">
                  {qualityPlan.improvementApproach || 'No approach defined yet.'}
                </div>
              )}
            </div>
            <div className="space-y-3 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Acceptance Criteria Logic</label>
              {isEditing ? (
                <textarea 
                  value={qualityPlan.acceptanceCriteriaLogic}
                  onChange={e => setQualityPlan({...qualityPlan, acceptanceCriteriaLogic: e.target.value})}
                  className="w-full h-40 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                  placeholder="Define the logic for acceptance criteria (e.g., must meet all technical specs and pass inspection)..."
                />
              ) : (
                <div className="p-6 bg-slate-50 rounded-2xl text-sm text-slate-600 leading-relaxed italic border border-slate-100 min-h-[10rem]">
                  {qualityPlan.acceptanceCriteriaLogic || 'No logic defined yet.'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* List Section: Roles & Responsibilities */}
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden">
          <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Roles & Responsibilities</h3>
              <p className="text-sm font-medium text-slate-500">Assign quality-specific duties to the project team.</p>
            </div>
            {isEditing && (
              <button 
                onClick={() => {
                  setEditingQualityRole({
                    id: crypto.randomUUID(),
                    userId: '',
                    userName: '',
                    roleTitle: '',
                    responsibilities: '',
                    hasTechnicalApproverAuthority: false
                  });
                  setIsQualityRoleModalOpen(true);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Quality Role
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Team Member</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Quality Role</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Responsibilities</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Authority</th>
                  {isEditing && <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {qualityPlan.roles.map((role) => (
                  <tr key={role.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-xs font-black text-blue-600">
                          {role.userName.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-bold text-slate-900">{role.userName}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                        {role.roleTitle}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs text-slate-500 max-w-xs line-clamp-2">{role.responsibilities}</p>
                    </td>
                    <td className="px-8 py-6">
                      {role.hasTechnicalApproverAuthority ? (
                        <div className="flex items-center gap-2 text-emerald-600">
                          <ShieldCheck className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Technical Approver</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Standard</span>
                      )}
                    </td>
                    {isEditing && (
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setEditingQualityRole(role);
                              setIsQualityRoleModalOpen(true);
                            }}
                            className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-blue-600 transition-all shadow-sm"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              const roles = qualityPlan.roles.filter(r => r.id !== role.id);
                              setQualityPlan({...qualityPlan, roles});
                            }}
                            className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-red-600 transition-all shadow-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {qualityPlan.roles.length === 0 && (
                  <tr>
                    <td colSpan={isEditing ? 5 : 4} className="px-8 py-20 text-center">
                      <p className="text-slate-400 font-medium italic">No quality roles assigned yet.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {renderQualityRoleModal()}
        {renderQualityHistory()}
      </div>
    );
  };

  const renderProjectManagementPlan = () => {
    if (!pmPlan) {
      return (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <FileText className="w-16 h-16 text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No Project Management Plan Found</h3>
          <p className="text-slate-500 mb-8">Initialize the plan to start managing your project lifecycle.</p>
          <button 
            onClick={() => handleSavePmPlan(false, 'Initial creation')}
            className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
          >
            Initialize Plan
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-12 pb-20">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <RefreshCw className="w-6 h-6" />
              </div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Version Control</span>
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tighter">v{pmPlan.version.toFixed(1)}</div>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tight">Last Updated: {new Date(pmPlan.lastUpdated).toLocaleDateString()}</p>
          </div>
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Tailoring Status</span>
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tighter">
              {pmPlan.tailoringDecisions.filter(d => !d.isTailoredOut).length} / {pmPlan.tailoringDecisions.length}
            </div>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tight">Knowledge Areas Active</p>
          </div>
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                <BarChart3 className="w-6 h-6" />
              </div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Phases Defined</span>
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tighter">{pmPlan.phases.length}</div>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tight">Project Lifecycle Steps</p>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-[2rem] w-fit">
          <button 
            onClick={() => setActiveTab('lifecycle')}
            className={cn(
              "px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'lifecycle' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Life Cycle & Phases
          </button>
          <button 
            onClick={() => setActiveTab('tailoring')}
            className={cn(
              "px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'tailoring' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Process Tailoring
          </button>
          <button 
            onClick={() => setActiveTab('baselines')}
            className={cn(
              "px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'baselines' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Baselines
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden">
          {activeTab === 'lifecycle' && (
            <div className="p-10">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Project Life Cycle</h3>
                  <p className="text-sm font-medium text-slate-500">Define the phases and key deliverables for this project.</p>
                </div>
                <button 
                  onClick={() => {
                    setEditingPhase({ id: crypto.randomUUID(), name: '', deliverables: [] });
                    setIsPhaseModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Phase
                </button>
              </div>

              <div className="space-y-6">
                {pmPlan.phases.map((phase, idx) => (
                  <div key={phase.id} className="group relative bg-slate-50 rounded-3xl p-8 border border-slate-100 hover:border-blue-200 transition-all">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 font-black shadow-sm">
                          {idx + 1}
                        </div>
                        <h4 className="text-lg font-black text-slate-900 tracking-tight">{phase.name}</h4>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingPhase(phase);
                            setIsPhaseModalOpen(true);
                          }}
                          className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-blue-600 transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeletePhase(phase.id)}
                          className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-red-600 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {phase.deliverables.map((d, i) => (
                        <span key={i} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold shadow-sm">
                          {d}
                        </span>
                      ))}
                      {phase.deliverables.length === 0 && (
                        <span className="text-xs font-medium text-slate-400 italic">No deliverables defined for this phase.</span>
                      )}
                    </div>
                  </div>
                ))}
                {pmPlan.phases.length === 0 && (
                  <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 font-medium italic">No phases defined yet. Click "Add Phase" to begin.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'tailoring' && (
            <div className="p-10">
              <div className="mb-10">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Process Tailoring</h3>
                <p className="text-sm font-medium text-slate-500">Decide which knowledge areas are applicable to this project.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pmPlan.tailoringDecisions.map((decision) => (
                  <div 
                    key={decision.id} 
                    className={cn(
                      "p-8 rounded-3xl border transition-all cursor-pointer group",
                      decision.isTailoredOut 
                        ? "bg-slate-50 border-slate-200 opacity-60" 
                        : "bg-white border-slate-100 shadow-sm hover:border-blue-200"
                    )}
                    onClick={() => {
                      setEditingTailoring(decision);
                      setIsTailoringModalOpen(true);
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                          decision.isTailoredOut ? "bg-slate-200 text-slate-400" : "bg-blue-50 text-blue-600"
                        )}>
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <h4 className="font-black text-slate-900 tracking-tight">{decision.knowledgeArea}</h4>
                      </div>
                      <div className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        decision.isTailoredOut ? "bg-slate-200 text-slate-500" : "bg-emerald-100 text-emerald-600"
                      )}>
                        {decision.isTailoredOut ? 'Tailored Out' : 'Active'}
                      </div>
                    </div>
                    <p className="text-xs font-medium text-slate-500 leading-relaxed line-clamp-2 italic">
                      {decision.justification || 'No justification provided.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'baselines' && (
            <div className="p-10">
              <div className="mb-10">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Project Baselines</h3>
                <p className="text-sm font-medium text-slate-500">Define the core performance baselines for the project.</p>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Scope Baseline</label>
                    <textarea 
                      value={pmPlan.baselines.scope}
                      onChange={(e) => setPmPlan({ ...pmPlan, baselines: { ...pmPlan.baselines, scope: e.target.value } })}
                      className="w-full h-40 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                      placeholder="Define the project scope baseline..."
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Schedule Baseline</label>
                    <textarea 
                      value={pmPlan.baselines.schedule}
                      onChange={(e) => setPmPlan({ ...pmPlan, baselines: { ...pmPlan.baselines, schedule: e.target.value } })}
                      className="w-full h-40 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                      placeholder="Define the project schedule baseline..."
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cost Baseline (Total Project Budget)</label>
                  <div className="relative">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <input 
                      type="number"
                      value={pmPlan.baselines.cost}
                      onChange={(e) => setPmPlan({ ...pmPlan, baselines: { ...pmPlan.baselines, cost: parseFloat(e.target.value) || 0 } })}
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tight ml-1">
                    * This value will be synced as the Global Limit for PO Tracking and Finance Domain.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Actions */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-900 rounded-[2rem] p-8 shadow-2xl shadow-slate-900/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="text-white font-bold">Finalize Master Plan</h4>
              <p className="text-slate-400 text-xs">Commit changes to the project management baseline.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setPendingSaveAction('overwrite');
                setShowPinModal(true);
              }}
              className="px-6 py-3 bg-white/10 text-white rounded-2xl text-xs font-bold hover:bg-white/20 transition-all"
            >
              Edit Current (Admin Only)
            </button>
            <button 
              onClick={() => {
                const summary = window.prompt('Enter a summary of changes for this version:');
                if (summary) handleSavePmPlan(true, summary);
              }}
              className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
            >
              Save as New Version (v{(Math.floor(pmPlan.version) + 1).toFixed(1)})
            </button>
          </div>
        </div>

        {/* Version History List */}
        <div className="space-y-6">
          <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">Historical Versions</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pmVersions.map((v) => (
              <div key={v.id} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest">v{v.version.toFixed(1)}</span>
                  <span className="text-[10px] font-bold text-slate-400">{new Date(v.timestamp).toLocaleDateString()}</span>
                </div>
                <p className="text-xs font-medium text-slate-600 mb-4 line-clamp-2 italic">"{v.changeSummary}"</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-[8px] font-black text-blue-600">
                      {v.userName.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{v.userName}</span>
                  </div>
                  <button 
                    onClick={() => setPmPlan(v.data as ProjectManagementPlan)}
                    className="text-[10px] font-black text-blue-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Restore
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderPhaseModal = () => {
    if (!editingPhase) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setIsPhaseModalOpen(false)}
        />
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden"
        >
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 text-white rounded-xl">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Project Phase Details</h3>
            </div>
            <button onClick={() => setIsPhaseModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <Plus className="w-6 h-6 rotate-45 text-slate-400" />
            </button>
          </div>

          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phase Name</label>
              <input 
                type="text"
                value={editingPhase.name}
                onChange={(e) => setEditingPhase({ ...editingPhase, name: e.target.value })}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="e.g. Design, Procurement, Construction..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Deliverables (Comma separated)</label>
              <textarea 
                value={editingPhase.deliverables.join(', ')}
                onChange={(e) => setEditingPhase({ ...editingPhase, deliverables: e.target.value.split(',').map(s => s.trim()).filter(s => s !== '') })}
                className="w-full h-32 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                placeholder="List key deliverables for this phase..."
              />
            </div>
          </div>

          <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-3">
            <button 
              onClick={() => setIsPhaseModalOpen(false)}
              className="flex-1 px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={() => handlePhaseSave(editingPhase)}
              className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
            >
              Save Phase
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderTailoringModal = () => {
    if (!editingTailoring) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setIsTailoringModalOpen(false)}
        />
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden"
        >
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 text-white rounded-xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Tailoring Decision</h3>
            </div>
            <button onClick={() => setIsTailoringModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <Plus className="w-6 h-6 rotate-45 text-slate-400" />
            </button>
          </div>

          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between bg-slate-50 p-6 rounded-2xl">
              <div>
                <h4 className="font-black text-slate-900 tracking-tight">{editingTailoring.knowledgeArea}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Knowledge Area</p>
              </div>
              <button 
                onClick={() => setEditingTailoring({ ...editingTailoring, isTailoredOut: !editingTailoring.isTailoredOut })}
                className={cn(
                  "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  editingTailoring.isTailoredOut 
                    ? "bg-slate-200 text-slate-500" 
                    : "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                )}
              >
                {editingTailoring.isTailoredOut ? 'Tailored Out' : 'Active'}
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Justification</label>
              <textarea 
                value={editingTailoring.justification}
                onChange={(e) => setEditingTailoring({ ...editingTailoring, justification: e.target.value })}
                className="w-full h-32 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                placeholder="Provide justification for this tailoring decision..."
              />
            </div>
          </div>

          <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-3">
            <button 
              onClick={() => setIsTailoringModalOpen(false)}
              className="flex-1 px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={() => handleTailoringSave(editingTailoring)}
              className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
            >
              Save Decision
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderCCBModal = () => {
    if (!editingCCBMember) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsCCBModalOpen(false)}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
        >
          <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">CCB Member Details</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authority & Responsibility Mapping</p>
              </div>
              <button onClick={() => setIsCCBModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <Plus className="w-6 h-6 rotate-45 text-slate-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <input 
                  type="text"
                  value={editingCCBMember.name}
                  onChange={e => setEditingCCBMember({ ...editingCCBMember, name: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Role</label>
                <input 
                  type="text"
                  value={editingCCBMember.role}
                  onChange={e => setEditingCCBMember({ ...editingCCBMember, role: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  placeholder="e.g. Project Sponsor"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsibility</label>
                <textarea 
                  value={editingCCBMember.responsibility}
                  onChange={e => setEditingCCBMember({ ...editingCCBMember, responsibility: e.target.value })}
                  className="w-full h-24 px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
                  placeholder="Describe their role in the change process..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Authority Level</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['High', 'Medium', 'Low'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setEditingCCBMember({ ...editingCCBMember, authority: level })}
                      className={cn(
                        "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2",
                        editingCCBMember.authority === level 
                          ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/20" 
                          : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                      )}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={() => handleCCBMemberSave(editingCCBMember)}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
            >
              Save Member Details
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderPinModal = () => {
    if (!showPinModal) return null;

    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowPinModal(false)}
          className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 space-y-8 shadow-2xl"
        >
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-black text-slate-900">Admin Verification</h3>
            <p className="text-xs font-medium text-slate-500">Enter Admin PIN to overwrite current baseline.</p>
          </div>

          <input 
            type="password"
            value={adminPin}
            onChange={e => setAdminPin(e.target.value)}
            className="w-full text-center text-3xl tracking-[1em] font-black py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-red-500/10 transition-all"
            maxLength={4}
            autoFocus
          />

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setShowPinModal(false)}
              className="py-4 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                const correctPin = selectedProject.adminPin || '1234';
                if (adminPin === correctPin) {
                  if (pendingSaveAction === 'overwrite') {
                    if (isChangeManagementPlan) {
                      handleSaveChangePlan(false, 'Manual Overwrite (Admin)');
                    } else if (isProjectManagementPlan) {
                      handleSavePmPlan(false, 'Manual Overwrite (Admin)');
                    }
                  }
                  setShowPinModal(false);
                  setAdminPin('');
                } else {
                  alert('Invalid Admin PIN');
                }
              }}
              className="py-4 bg-red-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all"
            >
              Verify & Save
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderTable = () => {
    if (isChangeManagementPlan) return renderChangeManagementPlan();
    if (isProjectManagementPlan) return renderProjectManagementPlan();
    if (isQualityManagementPlan) return renderQualityManagementPlan();
    if (!page.formFields) return null;

    if (isStakeholderRegister) {
      const filteredStakeholders = stakeholderRegister.filter(s => 
        s.name.toLowerCase().includes(stakeholderSearch.toLowerCase()) ||
        s.position.toLowerCase().includes(stakeholderSearch.toLowerCase()) ||
        s.role.toLowerCase().includes(stakeholderSearch.toLowerCase())
      );

      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl">
              <button 
                onClick={() => setStakeholderView('list')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  stakeholderView === 'list' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                List View
              </button>
              <button 
                onClick={() => setStakeholderView('matrix')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  stakeholderView === 'matrix' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Analysis Matrix
              </button>
            </div>

            {stakeholderView === 'list' && (
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search stakeholders..."
                  value={stakeholderSearch}
                  onChange={(e) => setStakeholderSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                />
              </div>
            )}
          </div>

          {stakeholderView === 'matrix' ? renderStakeholderMatrix() : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-20">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">ID</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Name</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Position/Org</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Role</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Influence</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Engagement</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredStakeholders.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4 text-[10px] font-mono font-bold text-slate-400 whitespace-nowrap">SR-{String(idx + 1).padStart(3, '0')}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900 whitespace-nowrap">{s.name}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{s.position}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{s.role}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              s.influence === 'High' ? "bg-rose-50 text-rose-600" : s.influence === 'Medium' ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-600"
                            )}>
                              {s.influence}
                            </span>
                            <span className="text-[10px] font-bold text-slate-300">({s.influenceScore})</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              s.engagementLevel === 'Green' ? "bg-emerald-500" : s.engagementLevel === 'Amber' ? "bg-amber-500" : "bg-rose-500"
                            )} />
                            <span className="text-xs font-medium">{s.engagementLevel || 'Green'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => {
                                setEditingStakeholder(s);
                                setIsStakeholderModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-all"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => fetchStakeholderVersions(s.id)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-all"
                              title="Version History"
                            >
                              <History className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteStakeholder(s.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredStakeholders.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">
                          No stakeholders found matching your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Floating Action Button */}
          <button 
            onClick={() => {
              setEditingStakeholder({
                id: '',
                projectId: selectedProject?.id || '',
                name: '',
                position: '',
                role: '',
                contactInfo: '',
                classification: 'Internal',
                influence: 'Medium',
                requirements: '',
                expectations: '',
                version: 1,
                isSystemUser: false
              });
              setIsStakeholderModalOpen(true);
            }}
            className="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-600/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      );
    }

    if (isStakeholderAnalysis) {
      return (
        <>
          {renderStakeholderAnalysisModule()}
          {renderAnalysisModal()}
          {renderAnalysisHistory()}
        </>
      );
    }

    if (page.id === '3.2.1') {
      // Issue Management
      return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search issues..." 
                  className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full sm:w-64"
                />
              </div>
            </div>
            <button 
              onClick={() => {
                // Logic to add new issue
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              Report Issue
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Issue</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Urgency</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Responsible</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {/* Sample data or fetched data */}
                {[1, 2].map((i) => {
                  // Logic to check if linked stakeholder is high influence
                  const isUrgent = i === 1; // Placeholder
                  return (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 text-[10px] font-mono font-bold text-slate-400 whitespace-nowrap">ISS-{String(i).padStart(3, '0')}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">
                        <div className="flex flex-col">
                          <span>Sample Issue {i}</span>
                          {isUrgent && (
                            <span className="text-[10px] text-rose-500 font-bold flex items-center gap-1 mt-1">
                              <AlertCircle className="w-3 h-3" /> HIGH INFLUENCE STAKEHOLDER LINKED
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          isUrgent ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-600"
                        )}>
                          {isUrgent ? 'Urgent' : 'Medium'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">Project Manager</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-bold uppercase tracking-wider">Open</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-1 text-slate-400 hover:text-blue-600 rounded-md hover:bg-slate-100 transition-all">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

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
              {getParent(page.id) && (
                <span className="text-slate-400 font-normal">{getParent(page.id)?.title} &gt; </span>
              )}
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
          {isCharterPage ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
              <ProjectCharterForm 
                formData={formData}
                setFormData={setFormData}
                milestones={charterMilestones}
                setMilestones={setCharterMilestones}
                stakeholders={stakeholders}
                setStakeholders={setStakeholders}
                isEditing={isEditing}
                onEditAttributes={(m) => setEditingMilestone(m)}
              />
            </div>
          ) : isEditing ? (
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

          <AnimatePresence>
            {isStakeholderModalOpen && editingStakeholder && (
              <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm">
                <motion.div 
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="bg-white w-full max-w-xl h-full shadow-2xl overflow-y-auto"
                >
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{editingStakeholder.id ? 'Edit Stakeholder' : 'Add New Stakeholder'}</h3>
                      <p className="text-xs text-slate-500">Stakeholder Register Entry v{editingStakeholder.version || 1}</p>
                    </div>
                    <button onClick={() => setIsStakeholderModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                      <Plus className="w-6 h-6 rotate-45 text-slate-400" />
                    </button>
                  </div>
                  
                  <div className="p-8 space-y-8">
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                        <input 
                          type="text" 
                          value={editingStakeholder.name}
                          onChange={e => setEditingStakeholder({...editingStakeholder, name: e.target.value})}
                          placeholder="e.g. John Doe"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Position / Organization</label>
                          <input 
                            type="text" 
                            value={editingStakeholder.position}
                            onChange={e => setEditingStakeholder({...editingStakeholder, position: e.target.value})}
                            placeholder="e.g. CEO, Zarya"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Project Role</label>
                          <input 
                            type="text" 
                            value={editingStakeholder.role}
                            onChange={e => setEditingStakeholder({...editingStakeholder, role: e.target.value})}
                            placeholder="e.g. Sponsor, Client"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact Information</label>
                        <input 
                          type="text" 
                          value={editingStakeholder.contactInfo}
                          onChange={e => setEditingStakeholder({...editingStakeholder, contactInfo: e.target.value})}
                          placeholder="Email or Phone"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Classification</label>
                          <select 
                            value={editingStakeholder.classification}
                            onChange={e => setEditingStakeholder({...editingStakeholder, classification: e.target.value as any})}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                          >
                            <option value="Internal">Internal</option>
                            <option value="External">External</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Influence Level</label>
                          <select 
                            value={editingStakeholder.influence}
                            onChange={e => setEditingStakeholder({...editingStakeholder, influence: e.target.value as any})}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Major Requirements</label>
                        <textarea 
                          value={editingStakeholder.requirements}
                          onChange={e => setEditingStakeholder({...editingStakeholder, requirements: e.target.value})}
                          placeholder="What are their key requirements?"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all min-h-[100px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expectations</label>
                        <textarea 
                          value={editingStakeholder.expectations}
                          onChange={e => setEditingStakeholder({...editingStakeholder, expectations: e.target.value})}
                          placeholder="What do they expect from the project?"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all min-h-[100px]"
                        />
                      </div>

                      {/* Dynamic System User Form */}
                      <div className="pt-4 border-t border-slate-100">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <div className="relative flex items-center">
                            <input 
                              type="checkbox" 
                              checked={editingStakeholder.isSystemUser}
                              onChange={e => setEditingStakeholder({...editingStakeholder, isSystemUser: e.target.checked})}
                              className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all"
                            />
                          </div>
                          <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Is this stakeholder a System User?</span>
                        </label>

                        <AnimatePresence>
                          {editingStakeholder.isSystemUser && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="grid grid-cols-2 gap-6 pt-6">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Access Level</label>
                                  <select 
                                    value={editingStakeholder.systemAccessLevel}
                                    onChange={e => setEditingStakeholder({...editingStakeholder, systemAccessLevel: e.target.value})}
                                    className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                  >
                                    <option value="Read Only">Read Only</option>
                                    <option value="Editor">Editor</option>
                                    <option value="Admin">Admin</option>
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Login Credentials (ID)</label>
                                  <input 
                                    type="text" 
                                    value={editingStakeholder.loginCredentials}
                                    onChange={e => setEditingStakeholder({...editingStakeholder, loginCredentials: e.target.value})}
                                    placeholder="e.g. ZRY-JD-01"
                                    className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                  />
                                </div>
                              </div>
                              <div className="pt-4">
                                <button 
                                  onClick={() => {
                                    setIsStakeholderModalOpen(false);
                                    navigate(`/project/${selectedProject?.id}/page/3.3.1`);
                                  }}
                                  className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-blue-200 text-blue-600 rounded-2xl text-xs font-bold hover:bg-blue-50 transition-all shadow-sm"
                                >
                                  <BarChart3 className="w-4 h-4" />
                                  Manage System Access & Permissions (Finance/HR)
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-8 sticky bottom-0 bg-white pb-8">
                      {editingStakeholder.id ? (
                        <div className="grid grid-cols-2 gap-4">
                          <button 
                            type="button"
                            onClick={() => handleSaveStakeholder(false)}
                            className="px-6 py-3 bg-white border border-blue-200 text-blue-600 text-sm font-bold rounded-2xl hover:bg-blue-50 transition-all shadow-sm"
                          >
                            Overwrite Current
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleSaveStakeholder(true)}
                            className="px-6 py-3 bg-blue-600 text-white text-sm font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                          >
                            Save as New Version
                          </button>
                        </div>
                      ) : (
                        <button 
                          type="button"
                          onClick={() => handleSaveStakeholder(false)}
                          className="w-full px-6 py-4 bg-blue-600 text-white text-sm font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                        >
                          <Save className="w-5 h-5" />
                          Create Stakeholder Entry
                        </button>
                      )}
                      <button 
                        type="button"
                        onClick={() => setIsStakeholderModalOpen(false)}
                        className="w-full px-6 py-3 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {editingMilestone && (
              <ActivityAttributesModal 
                activity={editingMilestone}
                allActivities={allActivities}
                boqItems={boqItems}
                wbsLevels={wbsLevels}
                onClose={() => setEditingMilestone(null)}
                onSave={async (updated) => {
                  try {
                    await setDoc(doc(db, 'activities', updated.id), updated);
                    setEditingMilestone(null);
                    // Update local state
                    setCharterMilestones(prev => prev.map(m => m.id === updated.id ? updated : m));
                  } catch (err) {
                    handleFirestoreError(err, OperationType.WRITE, 'activities');
                  }
                }}
              />
            )}
          </AnimatePresence>

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

      <AnimatePresence>
        {isCCBModalOpen && renderCCBModal()}
        {showPinModal && renderPinModal()}
        {isPhaseModalOpen && renderPhaseModal()}
        {isTailoringModalOpen && renderTailoringModal()}
        {showChangeHistory && (
          <div className="fixed inset-0 z-[100] flex items-center justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChangeHistory(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-xl h-full bg-white shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Version History</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Change Management Plan</p>
                </div>
                <button onClick={() => setShowChangeHistory(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <Plus className="w-6 h-6 rotate-45 text-slate-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                {changeVersions.map((v) => (
                  <div key={v.id} className="relative pl-8 pb-8 border-l-2 border-slate-100 last:border-0 last:pb-0">
                    <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-blue-600" />
                    <div className="bg-slate-50 rounded-3xl p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest">v{v.version.toFixed(1)}</span>
                        <span className="text-[10px] font-bold text-slate-400">{new Date(v.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-700 italic">"{v.changeSummary}"</p>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                        <UserCheck className="w-4 h-4" /> {v.userName}
                      </div>
                      <button 
                        onClick={() => {
                          setChangePlan(v.data as ChangeManagementPlan);
                          setShowChangeHistory(false);
                        }}
                        className="w-full py-3 bg-white border border-blue-200 text-blue-600 rounded-2xl text-xs font-bold hover:bg-blue-50 transition-all"
                      >
                        Restore this Version
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
