import { 
  Shield, 
  Users, 
  Users2, 
  Target, 
  Activity, 
  Package, 
  BarChart, 
  AlertTriangle,
  Play,
  Zap,
  CheckCircle,
  Clock,
  Banknote,
  MessageSquare,
  DraftingCompass,
  Cpu,
  Calculator,
  ShoppingCart,
  Handshake,
  ShieldAlert,
  Flag,
  Settings,
  Lock,
  Bell,
  History,
  Wrench,
  Bot,
  Link2,
  HardDrive,
  BarChart3
} from 'lucide-react';

export const PERFORMANCE_DOMAINS = [
  { id: 'communications', title: 'Communications', color: '#0ea5e9', icon: MessageSquare, description: '(Official Communications & Document Gateway)', isAdminOnly: false },
  { id: 'governance', title: 'Governance', color: '#1e3a8a', icon: Shield, description: '(Governance, Standards & Contract Administration)', isAdminOnly: false },
  { id: 'delivery', title: 'Engineering', color: '#6366f1', icon: Cpu, description: '(Engineering, Technical Delivery & QA/QC)', isAdminOnly: false },
  { id: 'controls', title: 'Scheduling', color: '#a855f7', icon: Activity, description: '(Planning, Scheduling, Progress, KPI & EVM)', isAdminOnly: false },
  { id: 'finance', title: 'Finance', color: '#14b8a6', icon: Banknote, description: '(BOQ, Cost Control, Finance & Commercial Management)', isAdminOnly: false },
  { id: 'resources', title: 'Resources', color: '#10b981', icon: ShoppingCart, description: '(Resources, Procurement, Supply Chain & Logistics)', isAdminOnly: false },
  { id: 'stakeholders', title: 'Stakeholder', color: '#f59e0b', icon: Users, description: '(Stakeholders, Meetings & External Coordination)', isAdminOnly: false },
  { id: 'risk', title: 'Risk', color: '#e11d48', icon: AlertTriangle, description: '(Risk Management, Safety, Compliance & Audits)', isAdminOnly: false },
  { id: 'handover', title: 'Handover', color: '#6366f1', icon: Flag, description: '(Testing, Handover, As-Built & Lessons Learned)', isAdminOnly: false },
  { 
    id: 'administration', 
    title: 'PMIS Administration', 
    color: '#334155', 
    icon: Settings, 
    description: '(Enterprise Hub, IAM, Permissions, AI & System Settings)',
    isAdminOnly: true 
  },
] as const;

export const FOCUS_AREAS = [
  { id: 'Initiating', title: 'Initiating', icon: Play },
  { id: 'Planning', title: 'Planning', icon: Target },
  { id: 'Executing', title: 'Executing', icon: Zap },
  { id: 'Monitoring & Controlling', title: 'Monitoring & Controlling', icon: Activity },
  { id: 'Closing', title: 'Closing', icon: CheckCircle },
] as const;

export type DomainId = typeof PERFORMANCE_DOMAINS[number]['id'];
export type FocusAreaId = typeof FOCUS_AREAS[number]['id'];
