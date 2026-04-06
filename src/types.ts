export interface KPI {
  label: string;
  value: string;
  trend?: string;
  status?: 'success' | 'warning' | 'danger' | 'info';
  icon?: string;
}

export interface Alert {
  type: 'info' | 'warning' | 'danger';
  msg: string;
}

export interface BOQItem {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  division: string; // Master Format 2024
  workPackage: string;
  location: string; // Area/Zone/Building
  wbsId?: string; // Reference to terminal WBS level
  poNumber?: string;
  completion: number; // 0-100
}

export interface WBSLevel {
  id: string;
  projectId: string;
  parentId?: string;
  title: string;
  type: 'Zone' | 'Area' | 'Building' | 'Floor' | 'Other';
  level: number; // 1, 2, 3...
  code: string; // e.g. Z1, Z1-A1
  status?: 'Not Started' | 'In Progress' | 'Completed' | 'Delayed';
}

export interface POLineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  status: string;
}

export interface PurchaseOrder {
  id: string;
  supplier: string;
  date: string;
  status: string;
  amount: number;
  workPackageId: string;
  lineItems: POLineItem[];
}

export interface Activity {
  id: string;
  projectId: string;
  wbsId: string;
  boqItemId?: string; // Link to BOQ item
  workPackage: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  status: 'Planned' | 'In Progress' | 'Completed' | 'Converted to PO';
  activityType?: 'Task' | 'Milestone';
  charterMilestoneId?: string; // Link to milestone defined in Charter
  poId?: string;
  poLineItemId?: string;
  startDate?: string;
  duration?: number; // in days
  finishDate?: string;
  predecessorId?: string; // Parent Activity
  successorId?: string; // Child Activity
}

export interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
}

export interface DailyReportActivity {
  id: string;
  poLineItemId: string;
  description: string;
  progressUpdate: number; // 0-100
}

export interface SiteIssue {
  id: string;
  title: string;
  description: string;
  assignedToId: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'Resolved';
}

export interface DailyReport {
  id: string;
  date: string;
  weather?: WeatherData;
  activities: DailyReportActivity[];
  generalWorks: string;
  deliverables: string;
  incidents: string;
  issues: SiteIssue[];
  photos: string[];
}

export interface Page {
  id: string;
  title: string;
  parentId?: string;
  domain?: 'governance' | 'scope' | 'schedule' | 'finance' | 'stakeholders' | 'resources' | 'risk';
  type: 'hub' | 'terminal';
  content?: string;
  status?: 'Not Started' | 'In Progress' | 'Completed' | 'Delayed';
  summary?: string;
  formFields?: string[];
  kpis?: KPI[];
  alerts?: Alert[];
  automatedFields?: string[]; // Fields that should be read-only and calculated
  details?: {
    variance?: string;
    performance?: string;
    documentation?: string;
  };
}

export interface User {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  role: 'admin' | 'project-manager' | 'engineer' | 'safety-officer' | 'technical-office';
  accessiblePages?: string[];
  accessibleProjects?: string[];
  assignedTasksCount?: number;
}

export type TaskStatus = 'Todo' | 'In Progress' | 'Completed' | 'Blocked';

export interface TaskActivity {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string;
  workspaceId: string;
  startDate: string;
  endDate: string;
  priority: 'Low' | 'Medium' | 'High';
  history?: TaskActivity[];
  sourceType?: 'assumption_constraint' | 'meeting' | 'manual';
  sourceId?: string;
}

export interface AssumptionConstraintEntry {
  id: string;
  projectId: string;
  category: string;
  description: string;
  responsiblePartyId: string;
  dueDate: string;
  actions: string;
  status: 'Pending' | 'Completed';
  comments: string;
  taskId?: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

export interface MeetingMinute {
  id: string;
  text: string;
  assignedToId?: string;
  taskId?: string;
}

export interface Meeting {
  id: string;
  topic: string;
  date: string;
  attendeeIds: string[];
  minutes: MeetingMinute[];
}

export interface POItem {
  id: string;
  code: string;
  description: string;
  totalQty: number;
  previousQty: number;
  currentQty: number;
  price: number;
  uom: string;
}

export interface PageVersion {
  version: number;
  date: string;
  data: Record<string, string>;
  author: string;
}

export interface SavedDocument {
  id: string; // Drive File ID
  name: string;
  date: string;
  url: string;
  author: string;
  version: number;
  pageId: string;
}

export interface Project {
  id: string;
  name: string;
  code?: string;
  manager?: string;
  sponsor?: string;
  customer?: string;
  status: 'active' | 'archived';
  startDate?: string;
  endDate?: string;
  location?: string;
  description?: string;
  driveFolderId?: string;
  charterData?: Record<string, string>;
  charterHistory?: PageVersion[];
  pageData?: Record<string, Record<string, string>>;
  pageHistory?: Record<string, PageVersion[]>;
  savedDocuments?: SavedDocument[];
}

export interface BreadcrumbItem {
  title: string;
  path: string;
}
