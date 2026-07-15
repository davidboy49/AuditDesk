"use server";

import { dbService } from "@/lib/dbService";
import { revalidatePath } from "next/cache";
import { Department, UserGroup, User, AuditProject, Finding, Attachment } from "@/lib/mockData";
import { getCurrentUserServer } from "@/lib/auth";

async function logActivity(action: string, details: string) {
  try {
    const currentUser = await getCurrentUserServer();
    await dbService.createActivityLog({
      userId: currentUser.id,
      userEmail: currentUser.email,
      userName: currentUser.name,
      action,
      details
    });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}

export async function getActivityLogsAction(): Promise<any[]> {
  const currentUser = await getCurrentUserServer();
  if (currentUser.role !== "ADMIN") {
    throw new Error("Access Denied");
  }
  return dbService.getActivityLogs();
}

export async function createDepartmentAction(id: string, name: string, description: string): Promise<Department> {
  const result = await dbService.createDepartment(id, name, description);
  await logActivity("CREATE_DEPARTMENT", `Created department "${id}" (${name})`);
  revalidatePath("/users");
  revalidatePath("/departments");
  return result;
}

export async function updateDepartmentAction(id: string, name: string, description: string): Promise<Department> {
  const result = await dbService.updateDepartment(id, name, description);
  await logActivity("UPDATE_DEPARTMENT", `Updated department "${id}" (${name})`);
  revalidatePath("/users");
  revalidatePath("/departments");
  return result;
}

export async function deleteDepartmentAction(id: string): Promise<boolean> {
  const result = await dbService.deleteDepartment(id);
  await logActivity("DELETE_DEPARTMENT", `Deleted department "${id}"`);
  revalidatePath("/users");
  revalidatePath("/departments");
  return result;
}

export async function createUserGroupAction(name: string, description: string): Promise<UserGroup> {
  const result = await dbService.createUserGroup(name, description);
  await logActivity("CREATE_USER_GROUP", `Created user group "${name}"`);
  revalidatePath("/users");
  return result;
}

export async function updateUserGroupAndDeptAction(userId: string, departmentId: string | null, groupId: string | null): Promise<User | null> {
  const result = await dbService.updateUserGroupAndDept(userId, departmentId, groupId);
  await logActivity("UPDATE_USER_ROLES", `Updated department/group roles for user ID: ${userId}`);
  revalidatePath("/users");
  revalidatePath("/dashboard");
  return result;
}

export async function createUserAction(name: string, email: string, role: any, departmentId: string | null, groupId: string | null): Promise<User> {
  const result = await dbService.createUser(name, email, role, departmentId, groupId);
  await logActivity("CREATE_USER", `Created user "${name}" (${email}) with role ${role}`);
  revalidatePath("/users");
  revalidatePath("/planning"); // Revalidate planning page where auditors selection happens
  return result;
}

export async function updateUserAction(userId: string, name: string, email: string, role: any, departmentId: string | null, groupId: string | null): Promise<User | null> {
  const result = await dbService.updateUser(userId, name, email, role, departmentId, groupId);
  await logActivity("UPDATE_USER", `Updated user "${name}" (${email}) with role ${role}`);
  revalidatePath("/users");
  revalidatePath("/planning");
  return result;
}

export async function deleteUserAction(userId: string): Promise<boolean> {
  const result = await dbService.deleteUser(userId);
  await logActivity("DELETE_USER", `Deleted user ID: ${userId}`);
  revalidatePath("/users");
  revalidatePath("/planning");
  return result;
}

export async function updateProjectAction(id: string, updates: Partial<AuditProject>): Promise<AuditProject | null> {
  const result = await dbService.updateProject(id, updates);
  await logActivity("UPDATE_PROJECT", `Updated project ID: ${id}`);
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
  await logActivity("CREATE_PROJECT", `Created project "${name}" (Code: ${code})`);
  revalidatePath("/planning");
  revalidatePath("/dashboard");
  return result;
}

export async function deleteProjectAction(id: string): Promise<boolean> {
  const result = await dbService.deleteProject(id);
  await logActivity("DELETE_PROJECT", `Deleted project ID: ${id}`);
  revalidatePath("/planning");
  revalidatePath("/dashboard");
  return result;
}

export async function updateFindingStatusAction(id: string, status: any): Promise<Finding | null> {
  const result = await dbService.updateFindingStatus(id, status);
  await logActivity("UPDATE_FINDING_STATUS", `Updated finding ID: ${id} status to ${status}`);
  revalidatePath("/findings");
  revalidatePath("/dashboard");
  return result;
}

export async function updateFindingAction(
  id: string, 
  updates: { title?: string; description?: string; severity?: any; status?: any; recommendation?: string }
): Promise<Finding | null> {
  const result = await dbService.updateFinding(id, updates);
  await logActivity("UPDATE_FINDING", `Updated finding ID: ${id}`);
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
  await logActivity("CREATE_FINDING", `Created finding "${title}" under project ID: ${projectId}`);
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
  await logActivity("ADD_ATTACHMENT", `Added attachment "${fileName}" to project ID: ${projectId}`);
  revalidatePath("/planning");
  return result;
}

export async function deleteAttachmentAction(id: string): Promise<boolean> {
  const result = await dbService.deleteAttachment(id);
  await logActivity("DELETE_ATTACHMENT", `Deleted attachment ID: ${id}`);
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
  ownerName?: string;
  lastModifiedBy?: string;
}): Promise<any> {
  const result = await dbService.createExecutionSchedule(data);
  await logActivity("CREATE_SCHEDULE", `Created execution schedule for project ID: ${data.projectId}`);
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
  ownerName?: string;
  lastModifiedBy?: string;
}>): Promise<any | null> {
  const oldSchedule = await dbService.getExecutionSchedule(id);
  const result = await dbService.updateExecutionSchedule(id, data);
  
  let actionType = "UPDATE_SCHEDULE";
  let details = `Updated execution schedule ID: ${id}`;

  if (oldSchedule && data.scheduleRows) {
    try {
      const oldRows = JSON.parse(oldSchedule.scheduleRows || "[]");
      const newRows = JSON.parse(data.scheduleRows || "[]");
      if (newRows.length > oldRows.length) {
        actionType = "ADD_SCHEDULE_SLOT";
        details = `Added ${newRows.length - oldRows.length} slot(s) to schedule ID: ${id} (Total slots: ${newRows.length})`;
      } else if (newRows.length < oldRows.length) {
        actionType = "DELETE_SCHEDULE_SLOT";
        details = `Deleted ${oldRows.length - newRows.length} slot(s) from schedule ID: ${id} (Total slots: ${newRows.length})`;
      }
    } catch (e) {
      // JSON parse fallback
    }
  }

  await logActivity(actionType, details);
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
  return result;
}

export async function deleteExecutionScheduleAction(id: string): Promise<boolean> {
  const result = await dbService.deleteExecutionSchedule(id);
  await logActivity("DELETE_SCHEDULE", `Deleted execution schedule ID: ${id}`);
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
  return result;
}

export async function createCustomActivityLogAction(action: string, details: string): Promise<any> {
  const currentUser = await getCurrentUserServer();
  if (currentUser.role !== "ADMIN") {
    throw new Error("Access Denied");
  }
  const result = await dbService.createActivityLog({
    userId: currentUser.id,
    userEmail: currentUser.email,
    userName: currentUser.name,
    action,
    details
  });
  revalidatePath("/logs");
  return result;
}

export async function deleteActivityLogAction(id: string): Promise<boolean> {
  const currentUser = await getCurrentUserServer();
  if (currentUser.role !== "ADMIN") {
    throw new Error("Access Denied");
  }
  const result = await dbService.deleteActivityLog(id);
  revalidatePath("/logs");
  return result;
}
