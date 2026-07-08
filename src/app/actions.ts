"use server";

import { dbService } from "@/lib/dbService";
import { revalidatePath } from "next/cache";
import { Department, UserGroup, User, AuditProject, Finding, Attachment } from "@/lib/mockData";

export async function createDepartmentAction(name: string, description: string): Promise<Department> {
  const result = await dbService.createDepartment(name, description);
  revalidatePath("/users");
  return result;
}

export async function createUserGroupAction(name: string, description: string): Promise<UserGroup> {
  const result = await dbService.createUserGroup(name, description);
  revalidatePath("/users");
  return result;
}

export async function updateUserGroupAndDeptAction(userId: string, departmentId: string | null, groupId: string | null): Promise<User | null> {
  const result = await dbService.updateUserGroupAndDept(userId, departmentId, groupId);
  revalidatePath("/users");
  revalidatePath("/dashboard");
  return result;
}

export async function createUserAction(name: string, email: string, role: any, departmentId: string | null, groupId: string | null): Promise<User> {
  const result = await dbService.createUser(name, email, role, departmentId, groupId);
  revalidatePath("/users");
  revalidatePath("/planning"); // Revalidate planning page where auditors selection happens
  return result;
}

export async function updateUserAction(userId: string, name: string, email: string, role: any, departmentId: string | null, groupId: string | null): Promise<User | null> {
  const result = await dbService.updateUser(userId, name, email, role, departmentId, groupId);
  revalidatePath("/users");
  revalidatePath("/planning");
  return result;
}

export async function deleteUserAction(userId: string): Promise<boolean> {
  const result = await dbService.deleteUser(userId);
  revalidatePath("/users");
  revalidatePath("/planning");
  return result;
}

export async function updateProjectAction(id: string, updates: Partial<AuditProject>): Promise<AuditProject | null> {
  const result = await dbService.updateProject(id, updates);
  revalidatePath("/planning");
  revalidatePath("/dashboard");
  return result;
}

export async function createProjectAction(
  name: string, 
  code: string, 
  status: any, 
  scope: string, 
  planningDetails: string, 
  startDate: string, 
  endDate: string, 
  leadAuditorId: string | null
): Promise<AuditProject> {
  const result = await dbService.createProject(name, code, status, scope, planningDetails, startDate, endDate, leadAuditorId);
  revalidatePath("/planning");
  revalidatePath("/dashboard");
  return result;
}

export async function updateFindingStatusAction(id: string, status: any): Promise<Finding | null> {
  const result = await dbService.updateFindingStatus(id, status);
  revalidatePath("/findings");
  revalidatePath("/dashboard");
  return result;
}

export async function createFindingAction(
  title: string, 
  description: string, 
  severity: any, 
  status: any, 
  recommendation: string, 
  projectId: string, 
  auditorId: string
): Promise<Finding> {
  const result = await dbService.createFinding(title, description, severity, status, recommendation, projectId, auditorId);
  revalidatePath("/findings");
  revalidatePath("/dashboard");
  return result;
}

export async function getUsersAction(): Promise<User[]> {
  return dbService.getUsers();
}

// Attachments Actions
export async function addAttachmentAction(
  projectId: string, 
  fileName: string, 
  fileSize: number, 
  fileType: string, 
  fileData: string
): Promise<Attachment> {
  const result = await dbService.addAttachment(projectId, fileName, fileSize, fileType, fileData);
  revalidatePath("/planning");
  return result;
}

export async function deleteAttachmentAction(id: string): Promise<boolean> {
  const result = await dbService.deleteAttachment(id);
  revalidatePath("/planning");
  return result;
}

// Execution Schedule Actions
export async function getExecutionSchedulesAction(): Promise<any[]> {
  return dbService.getExecutionSchedules();
}

export async function createExecutionScheduleAction(data: {
  projectId: string;
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
  scheduleRows: string;
}): Promise<any> {
  const result = await dbService.createExecutionSchedule(data);
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
  return result;
}

export async function updateExecutionScheduleAction(id: string, data: Partial<{
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
  scheduleRows: string;
}>): Promise<any | null> {
  const result = await dbService.updateExecutionSchedule(id, data);
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
  return result;
}

export async function deleteExecutionScheduleAction(id: string): Promise<boolean> {
  const result = await dbService.deleteExecutionSchedule(id);
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
  return result;
}
