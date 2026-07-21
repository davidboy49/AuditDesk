"use server";

import { dbService } from "@/lib/dbService";
import { revalidatePath } from "next/cache";
import { Department, UserGroup, UserRole, User, AuditProject, Finding, Attachment, ExecutionSchedule } from "@/lib/mockData";
import { getCurrentUserServer, RBAC } from "@/lib/auth";
import nodemailer from "nodemailer";

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

export async function createUserGroupAction(name: string, description: string, role: UserRole): Promise<UserGroup> {
  const currentUser = await getCurrentUserServer();
  if (!RBAC.canManageUsers(currentUser)) throw new Error("Access Denied");
  const result = await dbService.createUserGroup(name.trim(), description.trim(), role);
  await logActivity("CREATE_USER_GROUP", `Created user group "${name}" with ${role} access`);
  revalidatePath("/users");
  return result;
}

export async function updateUserGroupAndDeptAction(userId: string, departmentId: string | null, groupId: string | null): Promise<User | null> {
  const currentUser = await getCurrentUserServer();
  if (!RBAC.canManageUsers(currentUser)) throw new Error("Access Denied");
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
  departments: string;
  address: string;
  visitNumber: string;
  actualVisitDate: string;
  auditPeriod: string;
  leadExecution: string;
  teamMembers: string;
  additionalAttendees: string;
  attendeeConfirmations?: string;
  standards: string;
  language: string;
  status?: string;
  objectives: string;
  scope: string;
  scheduleRows: string;
  attachments?: string;
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
  departments: string;
  address: string;
  visitNumber: string;
  actualVisitDate: string;
  auditPeriod: string;
  leadExecution: string;
  teamMembers: string;
  additionalAttendees: string;
  attendeeConfirmations?: string;
  standards: string;
  language: string;
  status?: string;
  objectives: string;
  scope: string;
  scheduleRows: string;
  attachments?: string;
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

export async function getSmtpConfigAction(): Promise<any> {
  const currentUser = await getCurrentUserServer();
  if (currentUser.role !== "ADMIN") {
    throw new Error("Access Denied");
  }
  return dbService.getSmtpConfig();
}

export async function updateSmtpConfigAction(data: any): Promise<any> {
  const currentUser = await getCurrentUserServer();
  if (currentUser.role !== "ADMIN") {
    throw new Error("Access Denied");
  }
  const result = await dbService.updateSmtpConfig(data);
  await logActivity("UPDATE_SMTP_CONFIG", "Updated system SMTP server configuration settings");
  return result;
}

export async function getEmailTemplatesAction(): Promise<any[]> {
  const currentUser = await getCurrentUserServer();
  if (currentUser.role !== "ADMIN") {
    throw new Error("Access Denied");
  }
  return dbService.getEmailTemplates();
}

export async function updateEmailTemplateAction(id: string, subject: string, body: string): Promise<any> {
  const currentUser = await getCurrentUserServer();
  if (currentUser.role !== "ADMIN") {
    throw new Error("Access Denied");
  }
  const result = await dbService.updateEmailTemplate(id, subject, body);
  await logActivity("UPDATE_EMAIL_TEMPLATE", `Updated email template for "${id}"`);
  return result;
}

export async function seedSmtpAndTemplatesAction(): Promise<any> {
  const currentUser = await getCurrentUserServer();
  if (currentUser.role !== "ADMIN") return;

  const count = await dbService.getEmailTemplates().then(t => t.length).catch(() => 0);
  if (count === 0) {
    await dbService.updateSmtpConfig({
      host: "smtp.mailtrap.io",
      port: 2525,
      username: "",
      password: "",
      secure: false,
      fromEmail: "alerts@auditdesk.com"
    });

    await dbService.updateEmailTemplate("planning", "Audit Planning Scoping Update - {{projectCode}}", "<p>Hello {{recipientName}},</p><p>An update has occurred on the scoping document for <strong>{{projectName}}</strong> ({{projectCode}}).</p><p>Current Status: <strong>{{status}}</strong></p><p>Details: {{details}}</p><p>Best regards,<br/>Audit Management System</p>");
    await dbService.updateEmailTemplate("meetings", "Open Meeting Schedule Invitation - {{projectName}}", "<p>Hello {{recipientName}},</p><p>A new open alignment meeting has been scheduled for <strong>{{projectName}}</strong> ({{projectCode}}).</p><p>Department(s): {{departments}}</p><p>Visit Date: {{visitDate}}</p><p>Owner: {{ownerName}}</p><p>Please review and join the meeting ledger.</p>");
    await dbService.updateEmailTemplate("schedule", "Execution Schedule Released - {{projectCode}}", "<p>Hello {{recipientName}},</p><p>An execution schedule and document request list has been updated for <strong>{{projectName}}</strong> ({{projectCode}}).</p><p>Audit Period: {{auditPeriod}}</p><p>Lead Execution: {{leadExecution}}</p><p>Standards: {{standards}}</p><p>Please upload the requested files as soon as possible.</p>");
    await dbService.updateEmailTemplate("findings", "New Audit Finding Registered - {{projectCode}}", "<p>Hello {{recipientName}},</p><p>A new compliance nonconformity has been logged under <strong>{{projectName}}</strong> ({{projectCode}}).</p><p>Finding: <strong>{{findingTitle}}</strong></p><p>Severity: <strong>{{severity}}</strong></p><p>Recommendation: {{recommendation}}</p>");
  }
}

export async function sendTestEmailAction(toEmail: string): Promise<{ success: boolean; message: string }> {
  const currentUser = await getCurrentUserServer();
  if (currentUser.role !== "ADMIN") {
    throw new Error("Access Denied");
  }

  const smtp = await dbService.getSmtpConfig();
  if (!smtp.host || !smtp.username || !smtp.password) {
    return {
      success: false,
      message: "SMTP is not fully configured (host, username, and password are required)."
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.username,
        pass: smtp.password
      }
    });

    await transporter.sendMail({
      from: smtp.fromEmail || "alerts@auditdesk.com",
      to: toEmail,
      subject: "AuditDesk SMTP Test Email",
      text: "If you receive this email, your SMTP configuration on AuditDesk is set up correctly!",
      html: "<p>If you receive this email, your SMTP configuration on AuditDesk is set up correctly!</p>"
    });

    await logActivity("SEND_TEST_EMAIL", `Sent SMTP test email to ${toEmail}`);
    return { success: true, message: "Test email sent successfully!" };
  } catch (error: any) {
    console.error("Test email failed:", error);
    let userMessage = error.message || "Failed to send email.";
    if (error.code === "ENETUNREACH" || userMessage.includes("ENETUNREACH")) {
      userMessage = `Network unreachable (${userMessage}). Please verify your internet connection or check if your SMTP host/port parameters are blocked by a firewall (e.g. standard IPv6 routing is unavailable or Port 587 is blocked).`;
    } else if (error.code === "ETIMEDOUT" || userMessage.includes("timeout")) {
      userMessage = "SMTP connection timed out. Check your server hostname, port, and security (SSL/TLS) toggle.";
    } else if (userMessage.includes("auth") || userMessage.includes("Authentication") || userMessage.includes("credentials")) {
      userMessage = "SMTP Authentication failed. Please verify your SMTP Username and Password credentials.";
    }
    return { success: false, message: userMessage };
  }
}

function interpolateTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value || "");
  }
  return result;
}

export async function sendMeetingReleaseNotificationAction(scheduleId: string): Promise<{ success: boolean; simulatedAlerts: Array<{ to: string; subject: string; body: string }> }> {
  try {
    const schedule = await dbService.getExecutionSchedule(scheduleId);
    if (!schedule) {
      return { success: false, simulatedAlerts: [] };
    }

    const allUsers = await dbService.getUsers();
    const recipientMap = new Map<string, User>();
    const attendeeNames = [schedule.leadExecution, schedule.teamMembers, schedule.additionalAttendees]
      .flatMap((value: string) => (value || "").split(","))
      .map((value: string) => value.trim())
      .filter(Boolean);

    for (const attendeeName of attendeeNames) {
      const match = allUsers.find((user) => user.name === attendeeName);
      if (match?.email) {
        recipientMap.set(match.email, match);
      }
    }

    const recipients = Array.from(recipientMap.values());
    if (recipients.length === 0) {
      return { success: true, simulatedAlerts: [] };
    }

    const smtp = await dbService.getSmtpConfig();
    const simulatedAlerts: Array<{ to: string; subject: string; body: string }> = [];
    const projectName = schedule.projectName || "Open Meeting Report";
    const projectCode = schedule.projectCode || "N/A";
    const subject = `Open Meeting Report Released - ${projectCode}`;
    const body = `
      <p>Hello {{recipientName}},</p>
      <p>The open meeting report for <strong>${projectName}</strong> (${projectCode}) has been released and is now locked.</p>
      <p>Meeting Date: <strong>${schedule.actualVisitDate || "N/A"}</strong></p>
      <p>Facilitator: <strong>${schedule.leadExecution || "N/A"}</strong></p>
      <p>Status: <strong>Released</strong></p>
      <p>Please review the finalized record.</p>
    `;

    const hasSmtpConfig = smtp.host && smtp.username && smtp.password;
    let transporter: any = null;
    if (hasSmtpConfig) {
      transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: { user: smtp.username, pass: smtp.password }
      });
    }

    for (const recipient of recipients) {
      const finalBody = body.replace("{{recipientName}}", recipient.name);
      simulatedAlerts.push({ to: recipient.email, subject, body: finalBody });
      await logActivity("SEND_MEETING_RELEASE_NOTIFICATION", `Queued/sent meeting release email to ${recipient.name} (${recipient.email}) for schedule ID: ${scheduleId}`);
      if (transporter) {
        transporter.sendMail({
          from: smtp.fromEmail || "alerts@auditdesk.com",
          to: recipient.email,
          subject,
          html: finalBody
        }).catch((err: any) => {
          console.error(`Failed to send meeting release email to ${recipient.email}:`, err);
        });
      }
    }

    return { success: true, simulatedAlerts };
  } catch (error) {
    console.error("sendMeetingReleaseNotificationAction error:", error);
    return { success: false, simulatedAlerts: [] };
  }
}

export async function sendEmailNotificationAction(
  templateId: string,
  projectId: string,
  variables: Record<string, string>
): Promise<{ success: boolean; simulatedAlerts: Array<{ to: string; subject: string; body: string }> }> {
  try {
    const projects = await dbService.getProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project) {
      return { success: false, simulatedAlerts: [] };
    }

    const allUsers = await dbService.getUsers();
    const recipientsMap = new Map<string, User>();

    if (project.leadAuditorId) {
      const lead = allUsers.find(u => u.id === project.leadAuditorId);
      if (lead) recipientsMap.set(lead.email, lead);
    }

    if (project.auditorIds) {
      for (const audId of project.auditorIds) {
        const auditor = allUsers.find(u => u.id === audId);
        if (auditor) recipientsMap.set(auditor.email, auditor);
      }
    }

    if (project.deptPicIds) {
      const picIds = project.deptPicIds.split(",").map(id => id.trim()).filter(Boolean);
      for (const picId of picIds) {
        const pic = allUsers.find(u => u.id === picId);
        if (pic) recipientsMap.set(pic.email, pic);
      }
    }

    const recipients = Array.from(recipientsMap.values());
    if (recipients.length === 0) {
      return { success: true, simulatedAlerts: [] };
    }

    const smtp = await dbService.getSmtpConfig();
    const template = await dbService.getEmailTemplate(templateId);
    if (!template) {
      return { success: false, simulatedAlerts: [] };
    }

    const simulatedAlerts: Array<{ to: string; subject: string; body: string }> = [];
    const baseVars = {
      projectName: project.name,
      projectCode: project.code,
      ...variables
    };

    const hasSmtpConfig = smtp.host && smtp.username && smtp.password;
    let transporter: any = null;
    if (hasSmtpConfig) {
      transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: {
          user: smtp.username,
          pass: smtp.password
        }
      });
    }

    for (const recipient of recipients) {
      const recipientVars = {
        ...baseVars,
        recipientName: recipient.name
      };

      const finalSubject = interpolateTemplate(template.subject, recipientVars);
      const finalBody = interpolateTemplate(template.body, recipientVars);

      simulatedAlerts.push({
        to: recipient.email,
        subject: finalSubject,
        body: finalBody
      });

      await logActivity("SEND_EMAIL_NOTIFICATION", `Queued/sent email notification to ${recipient.name} (${recipient.email}) for template: ${templateId}`);

      if (transporter) {
        transporter.sendMail({
          from: smtp.fromEmail || "alerts@auditdesk.com",
          to: recipient.email,
          subject: finalSubject,
          html: finalBody
        }).catch((err: any) => {
          console.error(`Failed to send real email to ${recipient.email}:`, err);
        });
      }
    }

    return { success: true, simulatedAlerts };
  } catch (error) {
    console.error("sendEmailNotificationAction error:", error);
    return { success: false, simulatedAlerts: [] };
  }
}
