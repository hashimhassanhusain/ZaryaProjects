import { Timestamp } from 'firebase/firestore';

export interface AuditFields {
  createdBy: string;
  createdAt: string | Timestamp;
  updatedAt: string | Timestamp;
  isActive: boolean;
}

export interface IssueLog extends AuditFields {
  id: string;
  projectId: string;
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'Closed';
  assignedTo: string; // userId
  dueDate: string;
}

export interface RiskRegister extends AuditFields {
  id: string;
  projectId: string;
  riskName: string;
  category: 'Strengths' | 'Weaknesses' | 'Opportunities' | 'Threats' | string;
  probability: number; // 1-5
  impact: number; // 1-5
  riskScore: number; // calculated: probability * impact
  responseStrategy: 'Mitigate' | 'Avoid' | 'Transfer' | 'Accept';
  owner: string; // userId or name
}

export interface ChangeRequest extends AuditFields {
  id: string;
  projectId: string;
  title: string;
  justification: string;
  impactOnCost: number;
  impactOnSchedule: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: string; // userId
}

export interface StakeholderRegister extends AuditFields {
  id: string;
  projectId: string;
  name: string;
  organization: string;
  role: string;
  powerLevel: 'High' | 'Low';
  interestLevel: 'High' | 'Low';
  engagementStrategy: string;
}

export interface LessonsLearned extends AuditFields {
  id: string;
  projectId: string;
  situation: string;
  actionTaken: string;
  outcome: string;
  recommendation: string;
  category: string;
}

export interface QualityMetric extends AuditFields {
  id: string;
  projectId: string;
  metricName: string;
  targetValue: number | string;
  actualValue: number | string;
  variance: number | string;
  passFailState: 'Pass' | 'Fail' | 'Ongoing';
}

export interface ProjectFile extends AuditFields {
  id: string;
  projectId: string;
  documentType: 'BusinessCase' | 'Agreement' | 'ScopeStatement' | 'SOW' | 'Requirements' | 'Other';
  domain: 'Governance' | 'Scope' | 'Schedule' | 'Finance' | 'Quality' | 'Resources' | 'Delivery' | 'Risk';
  title: string;
  description: string;
  fileUrl: string;           // Firebase Storage URL if an actual file is uploaded
  version: string;           // e.g., "v1.0"
  isBaseline: boolean;       // True if this is an approved baseline document
}
