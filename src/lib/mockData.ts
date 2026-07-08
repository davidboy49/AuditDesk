export interface Department {
  id: string;
  name: string;
  description: string | null;
}

export interface UserGroup {
  id: string;
  name: string;
  description: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "LEAD_AUDITOR" | "AUDITOR" | "AUDITEE";
  departmentId: string | null;
  groupId: string | null;
  departmentName?: string | null;
  groupName?: string | null;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileData: string; // Base64
  projectId: string;
  createdAt: string;
}

export interface AuditProject {
  id: string;
  name: string;
  code: string;
  status: "PLANNING" | "IN_PROGRESS" | "REPORTING" | "ARCHIVED";
  workflowStage: "DRAFTING" | "REVIEW" | "PENDING_PIC" | "APPROVED";
  deptPicIds: string; // Comma-separated list of User IDs representing department PICs
  scope: string;
  planningDetails: string;
  startDate: string;
  endDate: string;
  leadAuditorId: string | null;
  
  // Custom Scoping details fields
  objectives: string;
  riskProcess: string;
  riskClass: string;
  opEx: string;
  fieldwork: string;
  outcome: string;
  dataRequestType: string;
  focusArea: string;
  opExTimeline: string;
  approvals: string;

  auditorIds?: string[]; // Array of selected auditor user IDs
  attachments?: Attachment[];
}

export interface Finding {
  id: string;
  title: string;
  description: string;
  status: "OPEN" | "UNDER_REVIEW" | "CLOSED";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommendation: string;
  projectId: string;
  projectName?: string;
  auditorId: string;
  auditorName?: string;
  createdAt: string;
}

export interface ScheduleRow {
  date: string;
  time: string;
  activity: string;
  conductBy: string;
  pIncharge: string;
}

export interface ExecutionSchedule {
  id: string;
  projectId: string;
  projectName?: string;
  projectCode?: string;
  organization: string;
  address: string;
  visitNumber: string;
  actualVisitDate: string;
  auditPeriod: string;
  leadExecution: string;
  teamMembers: string;
  additionalAttendees: string;
  standards: string;
  language: string;
  objectives: string;
  scope: string;
  scheduleRows: string; // JSON
  createdAt?: string;
  updatedAt?: string;
}

// Initial mock datasets as default fallback values
export const mockUsers: User[] = [
  { id: "user-1", email: "admin@auditdesk.com", name: "Alex Admin", role: "ADMIN", departmentId: null, groupId: null },
  { id: "user-2", email: "sarah.lead@auditdesk.com", name: "Sarah Lead", role: "LEAD_AUDITOR", departmentId: "dept-3", groupId: "group-1" },
  { id: "user-3", email: "david.auditor@auditdesk.com", name: "David Auditor", role: "AUDITOR", departmentId: "dept-3", groupId: "group-1" },
  { id: "user-4", email: "alice.auditee@auditdesk.com", name: "Alice Auditee", role: "AUDITEE", departmentId: "dept-2", groupId: "group-2" },
  { id: "user-5", email: "bob.developer@auditdesk.com", name: "Bob Developer", role: "AUDITEE", departmentId: "dept-1", groupId: null }
];
