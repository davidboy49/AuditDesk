import prisma from "./db";
import { generateDocumentCode } from "./codeGenerator";
import { User, Department, UserGroup, UserRole, AuditProject, Finding, Attachment } from "./mockData";
const getScheduleAttendeeConfirmations = async (ids: string[]) => {
  if (ids.length === 0) return {} as Record<string, string>;
  const placeholders = ids.map(() => "?").join(",");
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; attendeeConfirmations: string | null }>>(
    `SELECT id, attendeeConfirmations FROM ExecutionSchedule WHERE id IN (${placeholders})`,
    ...ids
  );
  return rows.reduce<Record<string, string>>((map, row) => {
    map[row.id] = row.attendeeConfirmations || "{}";
    return map;
  }, {});
};

const updateScheduleAttendeeConfirmations = async (id: string, attendeeConfirmations?: string) => {
  if (attendeeConfirmations === undefined) return;
  await prisma.$executeRawUnsafe(
    "UPDATE ExecutionSchedule SET attendeeConfirmations = ? WHERE id = ?",
    attendeeConfirmations,
    id
  );
};


export const dbService = {
  // Departments
  async getDepartments(): Promise<Department[]> {
    return prisma.department.findMany({
      orderBy: { name: "asc" }
    });
  },
  async createDepartment(id: string, name: string, description: string): Promise<Department> {
    return prisma.department.create({
      data: { id, name, description }
    });
  },
  async updateDepartment(id: string, name: string, description: string): Promise<Department> {
    return prisma.department.update({
      where: { id },
      data: { name, description }
    });
  },
  async deleteDepartment(id: string): Promise<boolean> {
    await prisma.user.updateMany({
      where: { departmentId: id },
      data: { departmentId: null }
    });
    await prisma.department.delete({
      where: { id }
    });
    return true;
  },

  // Groups
  async getUserGroups(): Promise<UserGroup[]> {
    const groups = await prisma.userGroup.findMany({
      orderBy: { name: "asc" }
    });
    return groups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      role: group.role as UserRole
    }));
  },
  async createUserGroup(name: string, description: string, role: UserRole): Promise<UserGroup> {
    const group = await prisma.userGroup.create({
      data: { name, description, role }
    });
    return {
      id: group.id,
      name: group.name,
      description: group.description,
      role: group.role as UserRole
    };
  },

  // Users
  async getUsers(): Promise<User[]> {
    const users = await prisma.user.findMany({
      include: {
        department: true,
        group: true
      },
      orderBy: { name: "asc" }
    });
    return users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role as any,
      departmentId: u.departmentId,
      groupId: u.groupId,
      departmentName: u.department?.name || null,
      groupName: u.group?.name || null
    }));
  },
  async createUser(name: string, email: string, role: any, departmentId: string | null, groupId: string | null): Promise<User> {
    const group = groupId
      ? await prisma.userGroup.findUnique({ where: { id: groupId }, select: { role: true } })
      : null;
    const u = await prisma.user.create({
      data: { name, email, role: group?.role || role, departmentId, groupId }
    });
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role as any,
      departmentId: u.departmentId,
      groupId: u.groupId
    };
  },
  async updateUser(userId: string, name: string, email: string, role: any, departmentId: string | null, groupId: string | null): Promise<User | null> {
    const group = groupId
      ? await prisma.userGroup.findUnique({ where: { id: groupId }, select: { role: true } })
      : null;
    const u = await prisma.user.update({
      where: { id: userId },
      data: { name, email, role: group?.role || role, departmentId, groupId }
    });
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role as any,
      departmentId: u.departmentId,
      groupId: u.groupId
    };
  },
  async updateUserGroupAndDept(userId: string, departmentId: string | null, groupId: string | null): Promise<User | null> {
    const group = groupId
      ? await prisma.userGroup.findUnique({ where: { id: groupId }, select: { role: true } })
      : null;
    const u = await prisma.user.update({
      where: { id: userId },
      data: {
        departmentId,
        groupId,
        ...(group ? { role: group.role } : {})
      }
    });
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role as any,
      departmentId: u.departmentId,
      groupId: u.groupId
    };
  },
  async deleteUser(userId: string): Promise<boolean> {
    // Delete documents uploaded by this user
    await prisma.document.deleteMany({ where: { uploaderId: userId } });
    // Delete findings reported by this user
    await prisma.finding.deleteMany({ where: { auditorId: userId } });
    // Delete reports created by this user
    await prisma.report.deleteMany({ where: { creatorId: userId } });
    // Set leadAuditorId to null in any projects where they lead
    await prisma.auditProject.updateMany({
      where: { leadAuditorId: userId },
      data: { leadAuditorId: null }
    });
    // Safely delete the user
    await prisma.user.delete({
      where: { id: userId }
    });
    return true;
  },

  // Projects
  async getProjects(): Promise<AuditProject[]> {
    const projects = await prisma.auditProject.findMany({
      include: {
        auditors: true,
        attachments: true,
        findings: {
          include: {
            auditor: true
          }
        },
        executionSchedules: true
      },
      orderBy: { code: "asc" }
    });
    return projects.map(p => ({
      id: p.id,
      name: p.name,
      code: p.code,
      status: p.status as any,
      workflowStage: p.workflowStage as any,
      deptPicIds: p.deptPicIds,
      departments: p.departments,
      scope: p.scope,
      planningDetails: p.planningDetails,
      startDate: p.startDate.toISOString().split("T")[0],
      endDate: p.endDate.toISOString().split("T")[0],
      leadAuditorId: p.leadAuditorId,
      auditorNames: p.auditorNames,
      objectives: p.objectives,
      riskProcess: p.riskProcess,
      riskClass: p.riskClass,
      opEx: p.opEx,
      fieldwork: p.fieldwork,
      outcome: p.outcome,
      dataRequestType: p.dataRequestType,
      focusArea: p.focusArea,
      opExTimeline: p.opExTimeline,
      approvals: p.approvals,
      auditorIds: p.auditors.map(a => a.id),
      findings: p.findings.map(f => ({
        id: f.id,
        title: f.title,
        description: f.description,
        status: f.status,
        severity: f.severity,
        recommendation: f.recommendation,
        auditorName: f.auditor?.name,
        createdAt: f.createdAt.toISOString()
      })),
      executionSchedules: p.executionSchedules.map(e => ({
        id: e.id,
        visitNumber: e.visitNumber,
        language: e.language,
        status: e.status,
        departments: e.departments,
        ownerName: e.ownerName,
        lastModifiedBy: e.lastModifiedBy,
        scheduleRows: e.scheduleRows,
        attendeeConfirmations: e.attendeeConfirmations
      })),
      attachments: p.attachments.map(a => ({
        id: a.id,
        fileName: a.fileName,
        fileSize: a.fileSize,
        fileType: a.fileType,
        fileData: a.fileData,
        projectId: a.projectId,
        createdAt: a.createdAt.toISOString()
      }))
    }));
  },
  async createProject(name: string, code: string, status: any, scope: string, planningDetails: string, startDate: string, endDate: string, leadAuditorId: string | null): Promise<AuditProject> {
    let normalizedCode = (code || "").trim().toUpperCase();
    
    if (!normalizedCode || normalizedCode === "AUTO") {
      const startYear = startDate ? new Date(startDate).getFullYear() : new Date().getFullYear();
      normalizedCode = await generateDocumentCode("AP", startYear);
    }

    const existing = await prisma.auditProject.findFirst({
      where: { code: normalizedCode }
    });
    if (existing) {
      throw new Error(`An Audit Plan with code ${normalizedCode} already exists.`);
    }

    const p = await prisma.auditProject.create({
      data: {
        name,
        code: normalizedCode,
        status,
        scope,
        planningDetails,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        leadAuditorId,
        auditorNames: "",
        workflowStage: "DRAFTING",
        deptPicIds: "",
        departments: "",
        objectives: "",
        riskProcess: "",
        riskClass: "",
        opEx: "",
        fieldwork: "",
        outcome: "",
        dataRequestType: "",
        focusArea: "",
        opExTimeline: "{\"presentationDate\":\"\",\"notificationDate\":\"\",\"fieldWorkStart\":\"\",\"fieldWorkEnd\":\"\",\"findingReportOffset\":0,\"finalReportOffset\":0}",
        approvals: "{\"preparedByName\":\"\",\"preparedByTitle\":\"\",\"preparedDate\":\"\",\"approvedByName\":\"\",\"approvedByTitle\":\"\",\"approvedDate\":\"\"}"
      },
      include: {
        auditors: true,
        attachments: true,
        findings: {
          include: {
            auditor: true
          }
        },
        executionSchedules: true
      }
    });
    return {
      id: p.id,
      name: p.name,
      code: p.code,
      status: p.status as any,
      workflowStage: p.workflowStage as any,
      deptPicIds: p.deptPicIds,
      departments: p.departments,
      scope: p.scope,
      planningDetails: p.planningDetails,
      startDate: p.startDate.toISOString().split("T")[0],
      endDate: p.endDate.toISOString().split("T")[0],
      leadAuditorId: p.leadAuditorId,
      auditorNames: p.auditorNames,
      objectives: p.objectives,
      riskProcess: p.riskProcess,
      riskClass: p.riskClass,
      opEx: p.opEx,
      fieldwork: p.fieldwork,
      outcome: p.outcome,
      dataRequestType: p.dataRequestType,
      focusArea: p.focusArea,
      opExTimeline: p.opExTimeline,
      approvals: p.approvals,
      auditorIds: p.auditors.map(a => a.id),
      findings: p.findings ? p.findings.map(f => ({
        id: f.id,
        title: f.title,
        description: f.description,
        status: f.status,
        severity: f.severity,
        recommendation: f.recommendation,
        auditorName: f.auditor?.name,
        createdAt: f.createdAt.toISOString()
      })) : [],
      executionSchedules: p.executionSchedules ? p.executionSchedules.map(e => ({
        id: e.id,
        visitNumber: e.visitNumber,
        language: e.language,
        status: e.status,
        departments: e.departments,
        ownerName: e.ownerName,
        lastModifiedBy: e.lastModifiedBy,
        scheduleRows: e.scheduleRows,
        attendeeConfirmations: e.attendeeConfirmations
      })) : [],
      attachments: []
    };
  },
  async updateProject(id: string, updates: Partial<AuditProject>): Promise<AuditProject | null> {
    let auditorConnections = undefined;
    if (updates.auditorIds) {
      const validUsers = await prisma.user.findMany({
        where: {
          OR: [
            { id: { in: updates.auditorIds } },
            { name: { in: updates.auditorIds } }
          ]
        }
      });
      auditorConnections = {
        set: validUsers.map(u => ({ id: u.id }))
      };
    }

    const p = await prisma.auditProject.update({
      where: { id },
      data: {
        name: updates.name,
        status: updates.status,
        workflowStage: updates.workflowStage,
        deptPicIds: updates.deptPicIds,
        departments: updates.departments,
        scope: updates.scope,
        planningDetails: updates.planningDetails,
        startDate: updates.startDate ? new Date(updates.startDate) : undefined,
        endDate: updates.endDate ? new Date(updates.endDate) : undefined,
        leadAuditorId: updates.leadAuditorId,
        auditorNames: updates.auditorNames,
        objectives: updates.objectives,
        riskProcess: updates.riskProcess,
        riskClass: updates.riskClass,
        opEx: updates.opEx,
        fieldwork: updates.fieldwork,
        outcome: updates.outcome,
        dataRequestType: updates.dataRequestType,
        focusArea: updates.focusArea,
        opExTimeline: updates.opExTimeline,
        approvals: updates.approvals,
        auditors: auditorConnections
      },
      include: {
        auditors: true,
        attachments: true,
        findings: {
          include: {
            auditor: true
          }
        },
        executionSchedules: true
      }
    });
    return {
      id: p.id,
      name: p.name,
      code: p.code,
      status: p.status as any,
      workflowStage: p.workflowStage as any,
      deptPicIds: p.deptPicIds,
      departments: p.departments,
      scope: p.scope,
      planningDetails: p.planningDetails,
      startDate: p.startDate.toISOString().split("T")[0],
      endDate: p.endDate.toISOString().split("T")[0],
      leadAuditorId: p.leadAuditorId,
      auditorNames: p.auditorNames,
      objectives: p.objectives,
      riskProcess: p.riskProcess,
      riskClass: p.riskClass,
      opEx: p.opEx,
      fieldwork: p.fieldwork,
      outcome: p.outcome,
      dataRequestType: p.dataRequestType,
      focusArea: p.focusArea,
      opExTimeline: p.opExTimeline,
      approvals: p.approvals,
      auditorIds: p.auditors.map(a => a.id),
      findings: p.findings.map(f => ({
        id: f.id,
        title: f.title,
        description: f.description,
        status: f.status,
        severity: f.severity,
        recommendation: f.recommendation,
        auditorName: f.auditor?.name,
        createdAt: f.createdAt.toISOString()
      })),
      executionSchedules: p.executionSchedules.map(e => ({
        id: e.id,
        visitNumber: e.visitNumber,
        language: e.language,
        status: e.status,
        departments: e.departments,
        ownerName: e.ownerName,
        lastModifiedBy: e.lastModifiedBy,
        scheduleRows: e.scheduleRows,
        attendeeConfirmations: e.attendeeConfirmations
      })),
      attachments: p.attachments.map(a => ({
        id: a.id,
        fileName: a.fileName,
        fileSize: a.fileSize,
        fileType: a.fileType,
        fileData: a.fileData,
        projectId: a.projectId,
        createdAt: a.createdAt.toISOString()
      }))
    };
  },
  async deleteProject(id: string): Promise<boolean> {
    try {
      await prisma.auditProject.delete({
        where: { id }
      });
      return true;
    } catch (e) {
      console.error("Failed to delete project:", e);
      return false;
    }
  },

  // Findings
  async getFindings(): Promise<Finding[]> {
    const findings = await prisma.finding.findMany({
      include: {
        project: true,
        auditor: true
      },
      orderBy: { createdAt: "desc" }
    });
    return findings.map(f => ({
      id: f.id,
      title: f.title,
      description: f.description,
      status: f.status as any,
      severity: f.severity as any,
      recommendation: f.recommendation,
      projectId: f.projectId,
      projectName: f.project.name,
      auditorId: f.auditorId,
      auditorName: f.auditor.name,
      createdAt: f.createdAt.toISOString()
    }));
  },
  async createFinding(title: string, description: string, severity: any, status: any, recommendation: string, projectId: string, auditorId: string): Promise<Finding> {
    const f = await prisma.finding.create({
      data: {
        title,
        description,
        severity,
        status,
        recommendation,
        projectId,
        auditorId
      },
      include: {
        project: true,
        auditor: true
      }
    });
    return {
      id: f.id,
      title: f.title,
      description: f.description,
      status: f.status as any,
      severity: f.severity as any,
      recommendation: f.recommendation,
      projectId: f.projectId,
      projectName: f.project.name,
      auditorId: f.auditorId,
      auditorName: f.auditor.name,
      createdAt: f.createdAt.toISOString()
    };
  },
  async updateFindingStatus(id: string, status: any): Promise<Finding | null> {
    const f = await prisma.finding.update({
      where: { id },
      data: { status },
      include: {
        project: true,
        auditor: true
      }
    });
    return {
      id: f.id,
      title: f.title,
      description: f.description,
      status: f.status as any,
      severity: f.severity as any,
      recommendation: f.recommendation,
      projectId: f.projectId,
      projectName: f.project.name,
      auditorId: f.auditorId,
      auditorName: f.auditor.name,
      createdAt: f.createdAt.toISOString()
    };
  },
  async updateFinding(id: string, updates: { title?: string; description?: string; severity?: any; status?: any; recommendation?: string }): Promise<Finding | null> {
    const f = await prisma.finding.update({
      where: { id },
      data: updates,
      include: {
        project: true,
        auditor: true
      }
    });
    return {
      id: f.id,
      title: f.title,
      description: f.description,
      status: f.status as any,
      severity: f.severity as any,
      recommendation: f.recommendation,
      projectId: f.projectId,
      projectName: f.project.name,
      auditorId: f.auditorId,
      auditorName: f.auditor.name,
      createdAt: f.createdAt.toISOString()
    };
  },

  // Attachments
  async addAttachment(projectId: string, fileName: string, fileSize: number, fileType: string, fileData: string): Promise<Attachment> {
    const a = await prisma.attachment.create({
      data: {
        projectId,
        fileName,
        fileSize,
        fileType,
        fileData
      }
    });
    return {
      id: a.id,
      fileName: a.fileName,
      fileSize: a.fileSize,
      fileType: a.fileType,
      fileData: a.fileData,
      projectId: a.projectId,
      createdAt: a.createdAt.toISOString()
    };
  },
  async deleteAttachment(id: string): Promise<boolean> {
    await prisma.attachment.delete({
      where: { id }
    });
    return true;
  },

  // Execution Schedules
  async getExecutionSchedules(): Promise<any[]> {
    const schedules = await prisma.executionSchedule.findMany({
      include: {
        project: true
      },
      orderBy: { createdAt: "desc" }
    });
    const confirmationMap = await getScheduleAttendeeConfirmations(schedules.map(s => s.id));
    return schedules.map(s => ({
      id: s.id,
      projectId: s.projectId,
      projectName: s.project.name,
      projectCode: s.project.code,
      departments: s.departments,
      address: s.address,
      visitNumber: s.visitNumber,
      actualVisitDate: s.actualVisitDate,
      auditPeriod: s.auditPeriod,
      leadExecution: s.leadExecution,
      teamMembers: s.teamMembers,
      additionalAttendees: s.additionalAttendees,
      attendeeConfirmations: confirmationMap[s.id] ?? s.attendeeConfirmations ?? "{}",
      standards: s.standards,
      language: s.language,
      status: s.status,
      objectives: s.objectives,
      scope: s.scope,
      scheduleRows: s.scheduleRows,
      attachments: s.attachments,
      ownerName: s.ownerName,
      lastModifiedBy: s.lastModifiedBy,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString()
    }));
  },
  async createExecutionSchedule(data: {
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
    const { attendeeConfirmations, ...createData } = data;
    const s = await prisma.executionSchedule.create({
      data: createData,
      include: {
        project: true
      }
    });
    await updateScheduleAttendeeConfirmations(s.id, attendeeConfirmations);
    return {
      id: s.id,
      projectId: s.projectId,
      projectName: s.project.name,
      projectCode: s.project.code,
      departments: s.departments,
      address: s.address,
      visitNumber: s.visitNumber,
      actualVisitDate: s.actualVisitDate,
      auditPeriod: s.auditPeriod,
      leadExecution: s.leadExecution,
      teamMembers: s.teamMembers,
      additionalAttendees: s.additionalAttendees,
      attendeeConfirmations: attendeeConfirmations ?? s.attendeeConfirmations ?? "{}",
      standards: s.standards,
      language: s.language,
      status: s.status,
      objectives: s.objectives,
      scope: s.scope,
      scheduleRows: s.scheduleRows,
      attachments: s.attachments,
      ownerName: s.ownerName,
      lastModifiedBy: s.lastModifiedBy,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString()
    };
  },
  async getExecutionSchedule(id: string): Promise<any> {
    const s = await prisma.executionSchedule.findUnique({
      where: { id },
      include: { project: true }
    });
    if (!s) return null;
    const confirmationMap = await getScheduleAttendeeConfirmations([id]);
    return {
      id: s.id,
      projectId: s.projectId,
      projectName: s.project?.name,
      projectCode: s.project?.code,
      departments: s.departments,
      address: s.address,
      visitNumber: s.visitNumber,
      actualVisitDate: s.actualVisitDate,
      auditPeriod: s.auditPeriod,
      leadExecution: s.leadExecution,
      teamMembers: s.teamMembers,
      additionalAttendees: s.additionalAttendees,
      attendeeConfirmations: confirmationMap[s.id] ?? s.attendeeConfirmations ?? "{}",
      standards: s.standards,
      language: s.language,
      status: s.status,
      objectives: s.objectives,
      scope: s.scope,
      scheduleRows: s.scheduleRows,
      attachments: s.attachments,
      ownerName: s.ownerName,
      lastModifiedBy: s.lastModifiedBy,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString()
    };
  },
  async updateExecutionSchedule(id: string, data: Partial<{
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
    ownerName: string;
    lastModifiedBy: string;
  }>): Promise<any | null> {
    const { attendeeConfirmations, projectId, ...updateData } = data as any;
    const s = await prisma.executionSchedule.update({
      where: { id },
      data: updateData,
      include: {
        project: true
      }
    });
    await updateScheduleAttendeeConfirmations(s.id, attendeeConfirmations);
    return {
      id: s.id,
      projectId: s.projectId,
      projectName: s.project.name,
      projectCode: s.project.code,
      departments: s.departments,
      address: s.address,
      visitNumber: s.visitNumber,
      actualVisitDate: s.actualVisitDate,
      auditPeriod: s.auditPeriod,
      leadExecution: s.leadExecution,
      teamMembers: s.teamMembers,
      additionalAttendees: s.additionalAttendees,
      attendeeConfirmations: attendeeConfirmations ?? s.attendeeConfirmations ?? "{}",
      standards: s.standards,
      language: s.language,
      status: s.status,
      objectives: s.objectives,
      scope: s.scope,
      scheduleRows: s.scheduleRows,
      ownerName: s.ownerName,
      lastModifiedBy: s.lastModifiedBy,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString()
    };
  },
  async deleteExecutionSchedule(id: string): Promise<boolean> {
    await prisma.executionSchedule.delete({
      where: { id }
    });
    return true;
  },
  async createActivityLog(data: {
    userId: string;
    userEmail: string;
    userName: string;
    action: string;
    details: string;
  }): Promise<any> {
    return prisma.activityLog.create({
      data
    });
  },
  async getActivityLogs(): Promise<any[]> {
    return prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" }
    });
  },
  async deleteActivityLog(id: string): Promise<boolean> {
    await prisma.activityLog.delete({
      where: { id }
    });
    return true;
  },
  // SMTP Config
  async getSmtpConfig(): Promise<any> {
    let config = await prisma.smtpConfig.findFirst();
    if (!config) {
      config = await prisma.smtpConfig.create({
        data: {
          id: "default",
          host: "smtp.mailtrap.io",
          port: 2525,
          username: "",
          password: "",
          secure: false,
          fromEmail: "alerts@auditdesk.com"
        }
      });
    }
    return config;
  },
  async updateSmtpConfig(data: any): Promise<any> {
    return prisma.smtpConfig.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", ...data }
    });
  },
  // Email Templates
  async getEmailTemplates(): Promise<any[]> {
    return prisma.emailTemplate.findMany({
      orderBy: { id: "asc" }
    });
  },
  async getEmailTemplate(id: string): Promise<any> {
    return prisma.emailTemplate.findUnique({
      where: { id }
    });
  },
  async updateEmailTemplate(id: string, subject: string, body: string): Promise<any> {
    return prisma.emailTemplate.update({
      where: { id },
      data: { subject, body }
    });
  }
};


