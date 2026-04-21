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
  Banknote
} from 'lucide-react';

export const PERFORMANCE_DOMAINS = [
  { id: 'governance', title: 'Governance', color: '#1e3a8a', icon: Shield, description: 'Project authorization, policies, and management plans.' },
  { id: 'stakeholders', title: 'Stakeholders', color: '#a855f7', icon: Users, description: 'Stakeholder identification and engagement.' },
  { id: 'resources', title: 'Resources', color: '#10b981', icon: Users2, description: 'Management of human, physical, and virtual project assets.' },
  { id: 'schedule', title: 'Schedule', color: '#0ea5e9', icon: Clock, description: 'Project pulse, cadence, and time performance tracking.' },
  { id: 'finance', title: 'Finance', color: '#14b8a6', icon: Banknote, description: 'Budgeting, monitoring actual costs, and EVM analysis.' },
  { id: 'planning', title: 'Planning', color: '#f59e0b', icon: Target, description: 'Developing plans for project execution.' },
  { id: 'project-work', title: 'Project Work', color: '#3b82f6', icon: Activity, description: 'Processes and activities associated with establishing the project work.' },
  { id: 'delivery', title: 'Delivery', color: '#6366f1', icon: Package, description: 'Producing deliverables and scope fulfillment.' },
  { id: 'measurement', title: 'Measurement', color: '#ef4444', icon: BarChart, description: 'Tracking performance and assessing variance.' },
  { id: 'risk', title: 'Risk & Opportunity', color: '#e11d48', icon: AlertTriangle, description: 'The project defense layer. Managing uncertainty through quantification and mitigation.' },
] as const;

export const FOCUS_AREAS = [
  { id: 'initiating', title: 'Initiating', icon: Play },
  { id: 'planning', title: 'Planning', icon: Target },
  { id: 'executing', title: 'Executing', icon: Zap },
  { id: 'monitoring', title: 'Monitoring & Controlling', icon: Activity },
  { id: 'closing', title: 'Closing', icon: CheckCircle },
] as const;

export type DomainId = typeof PERFORMANCE_DOMAINS[number]['id'];
export type FocusAreaId = typeof FOCUS_AREAS[number]['id'];
