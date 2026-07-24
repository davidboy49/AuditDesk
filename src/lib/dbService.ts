import prisma from "./db";
import type { Prisma } from "../generated/prisma/client";
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
  async assertProjectNotClosed(projectId?: string): Promise<void> {
    if (!projectId) return;
    const proj = await prisma.auditProject.findUnique({ where: { id: projectId } });
    if (proj && proj.status === "CLOSED") {
      throw new Error("This Audit Plan is CLOSED. No modifications or new records can be linked to a closed audit plan.");
    }
  },
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
        executionSchedules: true,
        openMeetings: {
          where: { isDeleted: false }
        }
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
      openMeetings: p.openMeetings.map(m => ({
        id: m.id,
        projectId: m.projectId,
        departments: m.departments,
        address: m.address,
        visitNumber: m.visitNumber,
        actualVisitDate: m.actualVisitDate,
        auditPeriod: m.auditPeriod,
        leadExecution: m.leadExecution,
        teamMembers: m.teamMembers,
        additionalAttendees: m.additionalAttendees,
        attendeeConfirmations: m.attendeeConfirmations,
        standards: m.standards,
        status: m.status as any,
        objectives: m.objectives,
        scope: m.scope,
        scheduleRows: m.scheduleRows,
        attachments: m.attachments,
        ownerName: m.ownerName,
        lastModifiedBy: m.lastModifiedBy,
        qrToken: m.qrToken,
        departmentConsents: m.departmentConsents
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
        executionSchedules: true,
        openMeetings: {
          where: { isDeleted: false }
        }
      }
    });

    let finalSchedules = p.executionSchedules;
    let finalOpenMeetings = p.openMeetings;

    if (updates.status === "RELEASED") {
      try {
        await this.ensureOpenMeetingsForProject(id);
        finalOpenMeetings = await prisma.openMeeting.findMany({
          where: { projectId: id, isDeleted: false }
        });
      } catch (err) {
        console.error("Failed to auto-create open meetings on release:", err);
      }
    }

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
      executionSchedules: finalSchedules.map(e => ({
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
      openMeetings: finalOpenMeetings.map(m => ({
        id: m.id,
        projectId: m.projectId,
        departments: m.departments,
        address: m.address,
        visitNumber: m.visitNumber,
        actualVisitDate: m.actualVisitDate,
        auditPeriod: m.auditPeriod,
        leadExecution: m.leadExecution,
        teamMembers: m.teamMembers,
        additionalAttendees: m.additionalAttendees,
        attendeeConfirmations: m.attendeeConfirmations,
        standards: m.standards,
        status: m.status as any,
        objectives: m.objectives,
        scope: m.scope,
        scheduleRows: m.scheduleRows,
        attachments: m.attachments,
        ownerName: m.ownerName,
        lastModifiedBy: m.lastModifiedBy,
        qrToken: m.qrToken,
        departmentConsents: m.departmentConsents
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
    await this.assertProjectNotClosed(projectId);
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
    await this.assertProjectNotClosed(projectId);
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
      openMeetingId: s.openMeetingId,
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
      qrToken: (s as any).qrToken ?? s.id,
      departmentConsents: (s as any).departmentConsents ?? "{}",
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString()
    }));
  },
  async createExecutionSchedule(data: {
    projectId: string;
    openMeetingId?: string;
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
    qrToken?: string;
    departmentConsents?: string;
  }): Promise<any> {
    await this.assertProjectNotClosed(data.projectId);

    if (data.language !== "finding") {
      if (!data.openMeetingId) {
        throw new Error("Select a released Open Meeting before creating an Execution Schedule.");
      }

      const sourceMeeting = await prisma.openMeeting.findFirst({
        where: {
          id: data.openMeetingId,
          status: "RELEASED",
          isDeleted: false
        }
      });
      if (!sourceMeeting) {
        throw new Error("Execution schedules can only be created from a released Open Meeting.");
      }
      if (sourceMeeting.projectId !== data.projectId) {
        throw new Error("The selected Open Meeting does not belong to this Audit Plan.");
      }

      const existingSchedule = await prisma.executionSchedule.findUnique({
        where: { openMeetingId: data.openMeetingId }
      });
      if (existingSchedule) {
        throw new Error("An Execution Schedule has already been created from this Open Meeting.");
      }
    }

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
      openMeetingId: s.openMeetingId,
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
      qrToken: (s as any).qrToken ?? s.id,
      departmentConsents: (s as any).departmentConsents ?? "{}",
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
      openMeetingId: s.openMeetingId,
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
      qrToken: (s as any).qrToken ?? s.id,
      departmentConsents: (s as any).departmentConsents ?? "{}",
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString()
    };
  },
  async ensureExecutionScheduleForProject(projectId: string): Promise<any> {
    const project = await prisma.auditProject.findUnique({
      where: { id: projectId },
      include: { executionSchedules: true }
    });
    if (!project) return null;

    if (project.executionSchedules && project.executionSchedules.length > 0) {
      const existing = project.executionSchedules[0];
      return this.getExecutionSchedule(existing.id);
    }

    const depts = project.departments || "IT, Finance, Operations";
    const deptList = depts.split(",").map(s => s.trim()).filter(Boolean);
    
    const startDateStr = project.startDate ? project.startDate.toISOString().split("T")[0] : new Date().toISOString().split("T")[0];

    const generatedRows = deptList.flatMap((d, i) => [
      {
        day: `Day 1`,
        date: startDateStr,
        time: `0${9 + (i % 3)}:00 AM - 10:00 AM`,
        activity: `Opening Meeting & Audit Scope Alignment for ${d}`,
        conductBy: project.auditorNames || "Audit Team",
        pIncharge: d
      },
      {
        day: `Day 1`,
        date: startDateStr,
        time: `10:00 AM - 11:00 AM`,
        activity: `Q&A and Scope Consent Confirmation for ${d}`,
        conductBy: project.auditorNames || "Audit Team",
        pIncharge: d
      }
    ]);

    const newSchedule = await prisma.executionSchedule.create({
      data: {
        projectId: project.id,
        departments: depts,
        address: "HQ Conference Room / Virtual Meeting",
        visitNumber: "01",
        actualVisitDate: startDateStr,
        auditPeriod: `${project.startDate ? new Date(project.startDate).toLocaleDateString("en-GB") : "Start"} - ${project.endDate ? new Date(project.endDate).toLocaleDateString("en-GB") : "End"}`,
        leadExecution: project.auditorNames || "Lead Auditor",
        teamMembers: project.auditorNames || "",
        additionalAttendees: project.deptPicIds || "",
        attendeeConfirmations: "{}",
        standards: "Work Procedure, Work Instruction & Policy",
        language: "English",
        status: "RELEASED",
        objectives: project.objectives || `Evaluate operational compliance, governance controls, and risk management for ${depts}.`,
        scope: project.scope || `Full scope audit covering departmental procedures, documentation, and key controls.`,
        scheduleRows: JSON.stringify(generatedRows),
        attachments: "[]",
        ownerName: "Audit Management System",
        lastModifiedBy: "Auto-Generated on Release",
        qrToken: project.code || project.id,
        departmentConsents: "{}"
      },
      include: { project: true }
    });

    return this.getExecutionSchedule(newSchedule.id);
  },
  async ensureOpenMeetingsForProject(projectId: string): Promise<any[]> {
    const project = await prisma.auditProject.findUnique({
      where: { id: projectId }
    });
    if (!project) return [];

    const deptsRaw = project.departments || "";
    let deptList = deptsRaw.split(",").map(d => d.trim()).filter(Boolean);
    if (deptList.length === 0) {
      deptList = ["IT", "Finance", "Operations"];
      await prisma.auditProject.update({
        where: { id: projectId },
        data: { departments: deptList.join(", ") }
      });
    }

    const startDateStr = project.startDate ? project.startDate.toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
    const openMeetingsInDb = await prisma.openMeeting.findMany({
      where: { projectId: projectId }
    });

    const createdMeetings: any[] = [];

    for (const dept of deptList) {
      const exists = openMeetingsInDb.some(m => 
        m.departments && (m.departments === dept || m.departments.split(",").map(d => d.trim()).includes(dept))
      );

      if (!exists) {
        const defaultAgendaRows = [
          {
            day: "Day 1",
            date: startDateStr,
            time: "09:00 AM - 09:30 AM",
            activity: `Opening Meeting & Audit Scope Briefing for ${dept}`,
            conductBy: project.auditorNames || "Lead Auditor",
            pIncharge: dept
          },
          {
            day: "Day 1",
            date: startDateStr,
            time: "09:30 AM - 10:30 AM",
            activity: `Scope Alignment & Data Request Discussion for ${dept}`,
            conductBy: project.auditorNames || "Audit Team",
            pIncharge: dept
          },
          {
            day: "Day 1",
            date: startDateStr,
            time: "10:30 AM - 11:00 AM",
            activity: `Scope Consent & Attendance Confirmation for ${dept}`,
            conductBy: project.auditorNames || "Audit Team",
            pIncharge: dept
          }
        ];

        const newMeeting = await prisma.openMeeting.create({
          data: {
            projectId: project.id,
            departments: dept,
            address: "HQ Main Conference Room / Virtual Meeting",
            visitNumber: "01",
            actualVisitDate: startDateStr,
            auditPeriod: `${project.startDate ? new Date(project.startDate).toLocaleDateString("en-GB") : "Start"} - ${project.endDate ? new Date(project.endDate).toLocaleDateString("en-GB") : "End"}`,
            leadExecution: project.auditorNames || "Lead Auditor",
            teamMembers: project.auditorNames || "",
            additionalAttendees: project.deptPicIds || "",
            attendeeConfirmations: "{}",
            standards: "Work Procedure, Work Instruction & Policy",
            status: "DRAFT",
            objectives: project.objectives || `Evaluate operational compliance and risk management for ${dept}.`,
            scope: project.scope || `Full scope audit covering departmental procedures and key controls for ${dept}.`,
            scheduleRows: JSON.stringify(defaultAgendaRows),
            attachments: "[]",
            ownerName: "Sarah Jenkins",
            lastModifiedBy: "Sarah Jenkins",
            qrToken: project.id,
            departmentConsents: "{}"
          }
        });
        createdMeetings.push(newMeeting);
        openMeetingsInDb.push(newMeeting);
      }
    }

    return createdMeetings;
  },

  // Open Meetings
  async getOpenMeetings(): Promise<any[]> {
    const meetings = await prisma.openMeeting.findMany({
      where: { isDeleted: false },
      include: { project: true },
      orderBy: { createdAt: "desc" }
    });

    return meetings.map(m => ({
      id: m.id,
      projectId: m.projectId,
      projectName: m.project?.name,
      projectCode: m.project?.code,
      departments: m.departments,
      address: m.address,
      visitNumber: m.visitNumber,
      actualVisitDate: m.actualVisitDate,
      auditPeriod: m.auditPeriod,
      leadExecution: m.leadExecution,
      teamMembers: m.teamMembers,
      additionalAttendees: m.additionalAttendees,
      attendeeConfirmations: m.attendeeConfirmations,
      standards: m.standards,
      status: m.status,
      objectives: m.objectives,
      scope: m.scope,
      departmentConcern: m.departmentConcern,
      scheduleRows: m.scheduleRows,
      attachments: m.attachments,
      ownerName: m.ownerName,
      lastModifiedBy: m.lastModifiedBy,
      qrToken: m.qrToken,
      departmentConsents: m.departmentConsents,
      isDeleted: m.isDeleted,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString()
    }));
  },
  async getOpenMeetingsByProject(projectId: string): Promise<any[]> {
    const meetings = await prisma.openMeeting.findMany({
      where: { projectId, isDeleted: false },
      include: { project: true },
      orderBy: { createdAt: "asc" }
    });
    return meetings.map(m => ({
      id: m.id,
      projectId: m.projectId,
      projectName: m.project?.name,
      projectCode: m.project?.code,
      departments: m.departments,
      address: m.address,
      visitNumber: m.visitNumber,
      actualVisitDate: m.actualVisitDate,
      auditPeriod: m.auditPeriod,
      leadExecution: m.leadExecution,
      teamMembers: m.teamMembers,
      additionalAttendees: m.additionalAttendees,
      attendeeConfirmations: m.attendeeConfirmations,
      standards: m.standards,
      status: m.status,
      objectives: m.objectives,
      scope: m.scope,
      departmentConcern: m.departmentConcern,
      scheduleRows: m.scheduleRows,
      attachments: m.attachments,
      ownerName: m.ownerName,
      lastModifiedBy: m.lastModifiedBy,
      qrToken: m.qrToken,
      departmentConsents: m.departmentConsents,
      isDeleted: m.isDeleted,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString()
    }));
  },

  async getOpenMeeting(id: string): Promise<any> {
    const m = await prisma.openMeeting.findUnique({
      where: { id },
      include: { project: true }
    });
    if (!m || m.isDeleted) return null;
    return {
      id: m.id,
      projectId: m.projectId,
      projectName: m.project?.name,
      projectCode: m.project?.code,
      departments: m.departments,
      address: m.address,
      visitNumber: m.visitNumber,
      actualVisitDate: m.actualVisitDate,
      auditPeriod: m.auditPeriod,
      leadExecution: m.leadExecution,
      teamMembers: m.teamMembers,
      additionalAttendees: m.additionalAttendees,
      attendeeConfirmations: m.attendeeConfirmations,
      standards: m.standards,
      status: m.status,
      objectives: m.objectives,
      scope: m.scope,
      departmentConcern: m.departmentConcern,
      scheduleRows: m.scheduleRows,
      attachments: m.attachments,
      ownerName: m.ownerName,
      lastModifiedBy: m.lastModifiedBy,
      qrToken: m.qrToken,
      departmentConsents: m.departmentConsents,
      isDeleted: m.isDeleted,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString()
    };
  },

  async createOpenMeeting(data: any): Promise<any> {
    await this.assertProjectNotClosed(data.projectId);
    const m = await prisma.openMeeting.create({
      data: {
        projectId: data.projectId,
        departments: data.departments,
        address: data.address,
        visitNumber: data.visitNumber,
        actualVisitDate: data.actualVisitDate,
        auditPeriod: data.auditPeriod,
        leadExecution: data.leadExecution,
        teamMembers: data.teamMembers,
        additionalAttendees: data.additionalAttendees,
        attendeeConfirmations: data.attendeeConfirmations || "{}",
        standards: data.standards,
        status: data.status || "DRAFT",
        objectives: data.objectives,
        scope: data.scope,
        departmentConcern: data.departmentConcern || "",
        scheduleRows: data.scheduleRows,
        attachments: data.attachments || "[]",
        ownerName: data.ownerName || "Sarah Jenkins",
        lastModifiedBy: data.lastModifiedBy || "Sarah Jenkins",
        qrToken: data.qrToken || data.projectId,
        departmentConsents: data.departmentConsents || "{}"
      },
      include: { project: true }
    });
    return this.getOpenMeeting(m.id);
  },

  async updateOpenMeeting(id: string, data: any): Promise<any> {
    const updateData: Prisma.OpenMeetingUpdateInput = {
      departments: data.departments,
      address: data.address,
      visitNumber: data.visitNumber,
      actualVisitDate: data.actualVisitDate,
      auditPeriod: data.auditPeriod,
      leadExecution: data.leadExecution,
      teamMembers: data.teamMembers,
      additionalAttendees: data.additionalAttendees,
      attendeeConfirmations: data.attendeeConfirmations,
      standards: data.standards,
      status: data.status,
      objectives: data.objectives,
      scope: data.scope,
      departmentConcern: data.departmentConcern,
      scheduleRows: data.scheduleRows,
      attachments: data.attachments,
      ownerName: data.ownerName,
      lastModifiedBy: data.lastModifiedBy
    };

    const m = await prisma.openMeeting.update({
      where: { id },
      data: updateData,
      include: { project: true }
    });
    return this.getOpenMeeting(m.id);
  },

  async deleteOpenMeeting(id: string): Promise<boolean> {
    await prisma.openMeeting.update({
      where: { id },
      data: { isDeleted: true }
    });
    return true;
  },

  async getOpenMeetingByQrToken(qrToken: string): Promise<any> {
    let m = await prisma.openMeeting.findFirst({
      where: {
        isDeleted: false,
        OR: [
          { qrToken: qrToken },
          { id: qrToken },
          { projectId: qrToken },
          { project: { code: qrToken } }
        ]
      },
      include: { project: true }
    });

    if (!m) {
      const matchingProject = await prisma.auditProject.findFirst({
        where: {
          OR: [
            { code: qrToken },
            { id: qrToken }
          ]
        }
      });
      if (matchingProject) {
        await this.ensureOpenMeetingsForProject(matchingProject.id);
        m = await prisma.openMeeting.findFirst({
          where: { projectId: matchingProject.id, isDeleted: false },
          include: { project: true }
        });
      }
      if (!m) {
        return this.getExecutionScheduleByQrToken(qrToken);
      }
    }

    let mergedDepartments = m.departments;
    let mergedConsents: Record<string, any> = {};
    try {
      mergedConsents = JSON.parse((m as any).departmentConsents || "{}");
    } catch {
      mergedConsents = {};
    }

    if (m.projectId) {
      const siblingMeetings = await prisma.openMeeting.findMany({
        where: { projectId: m.projectId }
      });

      if (m.project?.departments) {
        mergedDepartments = m.project.departments;
      } else {
        const deptSet = new Set<string>();
        siblingMeetings.forEach(sib => {
          (sib.departments || "").split(",").forEach(d => {
            const clean = d.trim();
            if (clean) deptSet.add(clean);
          });
        });
        if (deptSet.size > 0) mergedDepartments = Array.from(deptSet).join(", ");
      }

      for (const sib of siblingMeetings) {
        try {
          const sibConsents = JSON.parse((sib as any).departmentConsents || "{}");
          Object.assign(mergedConsents, sibConsents);
        } catch {
          // ignore invalid json
        }
      }
    }

    return {
      id: m.id,
      projectId: m.projectId,
      projectName: m.project?.name,
      projectCode: m.project?.code,
      departments: mergedDepartments,
      address: m.address,
      visitNumber: m.visitNumber,
      actualVisitDate: m.actualVisitDate,
      auditPeriod: m.auditPeriod,
      leadExecution: m.leadExecution,
      teamMembers: m.teamMembers,
      additionalAttendees: m.additionalAttendees,
      attendeeConfirmations: m.attendeeConfirmations ?? "{}",
      standards: m.standards,
      status: m.status,
      objectives: m.objectives,
      scope: m.scope,
      scheduleRows: m.scheduleRows,
      attachments: m.attachments,
      ownerName: m.ownerName,
      lastModifiedBy: m.lastModifiedBy,
      qrToken: (m as any).qrToken ?? m.id,
      departmentConsents: JSON.stringify(mergedConsents),
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString()
    };
  },

  async updateOpenMeetingDepartmentConsent(meetingId: string, departmentId: string, consentObj: { status: string; acceptedByUserId: string; acceptedByUserName: string; acceptedByUserEmail: string; timestamp: string; comments?: string }): Promise<any> {
    let m = await prisma.openMeeting.findUnique({ where: { id: meetingId } });
    if (!m) {
      return this.updateDepartmentConsent(meetingId, departmentId, consentObj);
    }
    
    let consents: Record<string, any> = {};
    try {
      consents = JSON.parse((m as any).departmentConsents || "{}");
    } catch {
      consents = {};
    }
    
    consents[departmentId] = consentObj;
    
    const updated = await prisma.openMeeting.update({
      where: { id: meetingId },
      data: {
        departmentConsents: JSON.stringify(consents)
      },
      include: { project: true }
    });

    if (m.projectId) {
      const siblingMeetings = await prisma.openMeeting.findMany({
        where: { projectId: m.projectId, NOT: { id: meetingId } }
      });
      for (const sib of siblingMeetings) {
        let sibConsents: Record<string, any> = {};
        try { sibConsents = JSON.parse((sib as any).departmentConsents || "{}"); } catch { sibConsents = {}; }
        sibConsents[departmentId] = consentObj;
        await prisma.openMeeting.update({
          where: { id: sib.id },
          data: { departmentConsents: JSON.stringify(sibConsents) }
        });
      }
    }

    return {
      ...updated,
      projectName: updated.project?.name,
      projectCode: updated.project?.code
    };
  },

  async getExecutionScheduleByQrToken(qrToken: string): Promise<any> {
    let s = await prisma.executionSchedule.findFirst({
      where: {
        OR: [
          { qrToken: qrToken },
          { id: qrToken },
          { projectId: qrToken },
          { project: { code: qrToken } }
        ]
      },
      include: { project: true }
    });

    if (!s) return null;

    // Merge consents & departments across sibling schedules if belonging to a project
    let mergedDepartments = s.departments;
    let mergedConsents: Record<string, any> = {};
    try {
      mergedConsents = JSON.parse((s as any).departmentConsents || "{}");
    } catch {
      mergedConsents = {};
    }

    if (s.projectId) {
      const siblingSchedules = await prisma.executionSchedule.findMany({
        where: { projectId: s.projectId }
      });

      if (s.project?.departments) {
        mergedDepartments = s.project.departments;
      } else {
        const deptSet = new Set<string>();
        siblingSchedules.forEach(sib => {
          (sib.departments || "").split(",").forEach(d => {
            const clean = d.trim();
            if (clean) deptSet.add(clean);
          });
        });
        if (deptSet.size > 0) mergedDepartments = Array.from(deptSet).join(", ");
      }

      for (const sib of siblingSchedules) {
        try {
          const sibConsents = JSON.parse((sib as any).departmentConsents || "{}");
          Object.assign(mergedConsents, sibConsents);
        } catch {
          // ignore invalid json
        }
      }
    }

    const confirmationMap = await getScheduleAttendeeConfirmations([s.id]);
    return {
      id: s.id,
      projectId: s.projectId,
      openMeetingId: s.openMeetingId,
      projectName: s.project?.name,
      projectCode: s.project?.code,
      departments: mergedDepartments,
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
      qrToken: (s as any).qrToken ?? s.id,
      departmentConsents: JSON.stringify(mergedConsents),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString()
    };
  },

  async updateDepartmentConsent(scheduleId: string, departmentId: string, consentObj: { status: string; acceptedByUserId: string; acceptedByUserName: string; acceptedByUserEmail: string; timestamp: string; comments?: string }): Promise<any> {
    const s = await prisma.executionSchedule.findUnique({ where: { id: scheduleId } });
    if (!s) throw new Error("Execution Schedule not found");
    
    let consents: Record<string, any> = {};
    try {
      consents = JSON.parse((s as any).departmentConsents || "{}");
    } catch {
      consents = {};
    }
    
    consents[departmentId] = consentObj;
    
    const updated = await prisma.executionSchedule.update({
      where: { id: scheduleId },
      data: {
        departmentConsents: JSON.stringify(consents)
      },
      include: { project: true }
    });

    if (s.projectId) {
      const siblingSchedules = await prisma.executionSchedule.findMany({
        where: { projectId: s.projectId, NOT: { id: scheduleId } }
      });
      for (const sib of siblingSchedules) {
        let sibConsents: Record<string, any> = {};
        try { sibConsents = JSON.parse((sib as any).departmentConsents || "{}"); } catch { sibConsents = {}; }
        sibConsents[departmentId] = consentObj;
        await prisma.executionSchedule.update({
          where: { id: sib.id },
          data: { departmentConsents: JSON.stringify(sibConsents) }
        });
      }
    }

    return {
      ...updated,
      projectName: updated.project?.name,
      projectCode: updated.project?.code
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
      openMeetingId: s.openMeetingId,
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


