import { 
  ShieldCheck, 
  Package, 
  Users, 
  Database, 
  AlertTriangle, 
  FileText, 
  Layers, 
  Target, 
  Star,
  Activity,
  ListTodo,
  TrendingDown
} from 'lucide-react';
import { EntityConfig } from '../types';

export const ENTITY_REGISTRY: Record<string, EntityConfig> = {
  contracts: {
    id: 'contracts',
    label: 'Contracts',
    icon: ShieldCheck,
    collection: 'contracts',
    columns: [
      { key: 'contractId', label: 'Contract #', type: 'string', width: 150 },
      { key: 'vendorName', label: 'Vendor', type: 'string' },
      { key: 'contractValue', label: 'Value', type: 'currency' },
      { key: 'contractType', label: 'Type', type: 'badge' },
      { key: 'status', label: 'Status', type: 'status' },
      { key: 'awardDate', label: 'Award Date', type: 'date' },
    ],
    sections: [
      { id: 'general', title: 'General Info', fields: ['contractId', 'vendorName', 'contractType', 'status'] },
      { id: 'financial', title: 'Financials', fields: ['contractValue', 'awardDate', 'costCenterId'] }
    ]
  },
  risks: {
    id: 'risks',
    label: 'Risk Register',
    icon: AlertTriangle,
    collection: 'projectLogs',
    columns: [
      { key: 'title', label: 'Risk Title', type: 'string' },
      { key: 'status', label: 'Status', type: 'status' },
      { key: 'priority', label: 'Priority', type: 'badge' },
      { key: 'ownerName', label: 'Owner', type: 'string' },
      { key: 'impact', label: 'Impact', type: 'string' },
      { key: 'dateIdentified', label: 'Identified', type: 'date' }
    ]
  },
  issues: {
    id: 'issues',
    label: 'Issue Log',
    icon: Activity,
    collection: 'projectLogs',
    columns: [
      { key: 'title', label: 'Issue Title', type: 'string' },
      { key: 'status', label: 'Status', type: 'status' },
      { key: 'priority', label: 'Priority', type: 'badge' },
      { key: 'ownerName', label: 'Assigned To', type: 'string' },
      { key: 'dateIdentified', label: 'Opened', type: 'date' }
    ]
  },
  changes: {
    id: 'changes',
    label: 'Change Log',
    icon: Layers,
    collection: 'projectLogs',
    columns: [
      { key: 'title', label: 'Change Title', type: 'string' },
      { key: 'status', label: 'Status', type: 'status' },
      { key: 'costImpact', label: 'Cost Impact', type: 'currency' },
      { key: 'scheduleImpact', label: 'Schedule Impact', type: 'number' },
      { key: 'ownerName', label: 'Requested By', type: 'string' }
    ]
  },
  stakeholders: {
    id: 'stakeholders',
    label: 'Stakeholder Register',
    icon: Star,
    collection: 'projectLogs',
    columns: [
      { key: 'title', label: 'Name', type: 'string' },
      { key: 'impact', label: 'Influence', type: 'badge' },
      { key: 'status', label: 'Engagement', type: 'status' },
      { key: 'description', label: 'Role/Position', type: 'string' }
    ]
  }
};
