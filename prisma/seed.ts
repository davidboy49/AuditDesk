import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });


async function main() {
  // Clear existing records
  await prisma.finding.deleteMany();
  await prisma.document.deleteMany();
  await prisma.report.deleteMany();
  await prisma.auditProject.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.userGroup.deleteMany();
  await prisma.smtpConfig.deleteMany();
  await prisma.emailTemplate.deleteMany();

  console.log("Cleared existing database records.");

  // 1. Seed Departments
  const dept1 = await prisma.department.create({
    data: { id: "dept-1", name: "Information Technology", description: "Core IT infrastructure and software development" }
  });
  const dept2 = await prisma.department.create({
    data: { id: "dept-2", name: "Finance & Accounting", description: "Financial reporting, billing, and ledger management" }
  });
  const dept3 = await prisma.department.create({
    data: { id: "dept-3", name: "Information Security", description: "Cybersecurity, risk management, and compliance" }
  });
  const dept4 = await prisma.department.create({
    data: { id: "dept-4", name: "Operations & HR", description: "Day-to-day facilities, staffing, and onboarding" }
  });

  console.log("Departments seeded.");

  // 2. Seed User Groups
  const group1 = await prisma.userGroup.create({
    data: { id: "group-1", name: "Internal Audit Team", description: "Certified internal auditors and leads", role: "AUDITOR" }
  });
  const group2 = await prisma.userGroup.create({
    data: { id: "group-2", name: "Risk Management Committee", description: "Executive oversight for enterprise risks", role: "LEAD_AUDITOR" }
  });
  const group3 = await prisma.userGroup.create({
    data: { id: "group-3", name: "External Auditing Partner", description: "Contracted external compliance specialists", role: "AUDITOR" }
  });

  console.log("User Groups seeded.");

  // 3. Seed Users
  const user1 = await prisma.user.create({
    data: { id: "user-1", email: "admin@auditdesk.com", name: "Alex Admin", role: "ADMIN" }
  });
  const user2 = await prisma.user.create({
    data: { id: "user-2", email: "sarah.lead@auditdesk.com", name: "Sarah Lead", role: "LEAD_AUDITOR", departmentId: dept3.id, groupId: group1.id }
  });
  const user3 = await prisma.user.create({
    data: { id: "user-3", email: "david.auditor@auditdesk.com", name: "David Auditor", role: "AUDITOR", departmentId: dept3.id, groupId: group1.id }
  });
  const user4 = await prisma.user.create({
    data: { id: "user-4", email: "alice.auditee@auditdesk.com", name: "Alice Auditee", role: "AUDITEE", departmentId: dept2.id, groupId: group2.id }
  });
  const user5 = await prisma.user.create({
    data: { id: "user-5", email: "bob.developer@auditdesk.com", name: "Bob Developer", role: "AUDITEE", departmentId: dept1.id }
  });

  console.log("Users seeded.");

  // 4. Seed Audit Projects
  const proj1 = await prisma.auditProject.create({
    data: {
      id: "proj-1",
      name: "ISO 27001 Security Assessment",
      code: "AUD-2026-001",
      status: "RELEASED",
      scope: "<p>The scope of this audit covers all <strong>production servers</strong>, firewall rules, and deployment pipelines managed by the IT department. Particular focus is placed on access control list checks, backup retention policies, and encryption of data-at-rest.</p>",
      planningDetails: "<p>Timeline and key milestones:</p><ul><li>Phase 1: Initial discovery and documentation review (Completed)</li><li>Phase 2: Technical scanning and controls testing (Active)</li><li>Phase 3: Executive reporting and final review</li></ul>",
      startDate: new Date("2026-06-01"),
      endDate: new Date("2026-08-31"),
      leadAuditorId: user2.id,
      auditors: { connect: [{ id: user2.id }, { id: user3.id }] }
    }
  });

  const proj2 = await prisma.auditProject.create({
    data: {
      id: "proj-2",
      name: "SOX Financial Controls Audit",
      code: "AUD-2026-002",
      status: "PLANNING",
      scope: "<p>Annual review of internal control over financial reporting. Scope includes ledger balancing, approvals logic for transactions exceeding $50k, and segregation of duties within the billing panel.</p>",
      planningDetails: "<p>Kickoff meeting scheduled for July 15th. Interviews will be conducted with the billing leads and the finance VP.</p>",
      startDate: new Date("2026-07-15"),
      endDate: new Date("2026-10-15"),
      leadAuditorId: user2.id,
      auditors: { connect: [{ id: user2.id }] }
    }
  });

  const proj3 = await prisma.auditProject.create({
    data: {
      id: "proj-3",
      name: "GDPR Data Privacy Review",
      code: "AUD-2025-004",
      status: "RELEASED",
      scope: "<p>Verifying compliance with data subject rights, consent workflows, and personal data storage limits in the EU region.</p>",
      planningDetails: "<p>Report drafting started. Awaiting confirmation on data minimization protocols for user logs.</p>",
      startDate: new Date("2026-05-10"),
      endDate: new Date("2026-07-10"),
      leadAuditorId: user3.id,
      auditors: { connect: [{ id: user3.id }] }
    }
  });

  console.log("Audit Projects seeded.");

  // 5. Seed Findings
  await prisma.finding.create({
    data: {
      id: "find-1",
      title: "Unrestricted Public Access to S3 Buckets",
      description: "<p>During control testing, it was discovered that three storage buckets containing database backup dumps were set to public read access. This exposes sensitive schema details and user hashes to the open internet.</p>",
      status: "OPEN",
      severity: "CRITICAL",
      recommendation: "<p>Immediately apply bucket policies restricting access to the VPC security group and enable public access blocking at the account level.</p>",
      projectId: proj1.id,
      auditorId: user3.id,
      createdAt: new Date("2026-06-15T10:30:00Z")
    }
  });

  await prisma.finding.create({
    data: {
      id: "find-2",
      title: "Shared Credentials on Production Bastion Host",
      description: "<p>Auditors noted that developer team members share a generic SSH key called <code>prod-ssh-key</code> to access the production bastion, preventing individual audit logs and accountability.</p>",
      status: "UNDER_REVIEW",
      severity: "HIGH",
      recommendation: "<p>Transition to an Identity Provider-based SSH access system or issue individual key pairs tied to personal LDAP credentials.</p>",
      projectId: proj1.id,
      auditorId: user2.id,
      createdAt: new Date("2026-06-20T14:45:00Z")
    }
  });

  await prisma.finding.create({
    data: {
      id: "find-3",
      title: "Lack of Dual Approval for Large Transactions",
      description: "<p>The finance system allows accounts payable employees to approve billing payouts up to $100k without a manager secondary approval check. The stated policy requires dual sign-off for any transaction over $50k.</p>",
      status: "OPEN",
      severity: "MEDIUM",
      recommendation: "<p>Configure workflow rules in the ledger system to automatically route transactions >$50k to manager approval queues.</p>",
      projectId: proj2.id,
      auditorId: user2.id,
      createdAt: new Date("2026-07-01T09:15:00Z")
    }
  });

  console.log("Findings seeded.");

  // 6. Seed SMTP Config
  await prisma.smtpConfig.create({
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

  // 7. Seed Email Templates
  await prisma.emailTemplate.create({
    data: {
      id: "planning",
      subject: "Audit Planning Scoping Update - {{projectCode}}",
      body: "<p>Hello {{recipientName}},</p><p>An update has occurred on the scoping document for <strong>{{projectName}}</strong> ({{projectCode}}).</p><p>Current Status: <strong>{{status}}</strong></p><p>Details: {{details}}</p><p>Best regards,<br/>Audit Management System</p>"
    }
  });
  await prisma.emailTemplate.create({
    data: {
      id: "meetings",
      subject: "Open Meeting Schedule Invitation - {{projectName}}",
      body: "<p>Hello {{recipientName}},</p><p>A new open alignment meeting has been scheduled for <strong>{{projectName}}</strong> ({{projectCode}}).</p><p>Organization: {{organization}}</p><p>Visit Date: {{visitDate}}</p><p>Owner: {{ownerName}}</p><p>Please review and join the meeting ledger.</p>"
    }
  });
  await prisma.emailTemplate.create({
    data: {
      id: "schedule",
      subject: "Execution Schedule Released - {{projectCode}}",
      body: "<p>Hello {{recipientName}},</p><p>An execution schedule and document request list has been updated for <strong>{{projectName}}</strong> ({{projectCode}}).</p><p>Audit Period: {{auditPeriod}}</p><p>Lead Execution: {{leadExecution}}</p><p>Standards: {{standards}}</p><p>Please upload the requested files as soon as possible.</p>"
    }
  });
  await prisma.emailTemplate.create({
    data: {
      id: "findings",
      subject: "New Audit Finding Registered - {{projectCode}}",
      body: "<p>Hello {{recipientName}},</p><p>A new compliance nonconformity has been logged under <strong>{{projectName}}</strong> ({{projectCode}}).</p><p>Finding: <strong>{{findingTitle}}</strong></p><p>Severity: <strong>{{severity}}</strong></p><p>Recommendation: {{recommendation}}</p>"
    }
  });

  console.log("SMTP Config and Email Templates seeded.");
  console.log("SQLite database dev.db seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });