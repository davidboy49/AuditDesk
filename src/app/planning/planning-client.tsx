"use client";

import { useState } from "react";
import { 
  Calendar, 
  FileText, 
  ClipboardList, 
  User as UserIcon, 
  Clock, 
  Save, 
  CalendarDays,
  X,
  FileDown,
  Send,
  UserPlus,
  Users,
  ShieldAlert,
  History,
  HelpCircle,
  Activity,
  ArrowUpRight,
  Import,
  Download,
  Trash2,
  Plus
} from "lucide-react";
import { AuditProject, User, Attachment } from "@/lib/mockData";
import { RBAC } from "@/lib/auth";
import RichEditor from "@/components/ui/rich-editor";
import ActionToolbar from "@/components/ui/action-toolbar";
import MultiSelect from "@/components/ui/multi-select";
import { 
  updateProjectAction, 
  createProjectAction, 
  addAttachmentAction, 
  deleteAttachmentAction 
} from "@/app/actions";

interface PlanningClientProps {
  initialProjects: AuditProject[];
  users: User[];
  currentUser: User;
}

export default function PlanningClient({ initialProjects, users, currentUser }: PlanningClientProps) {
  const [projects, setProjects] = useState<AuditProject[]>(initialProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjects[0]?.id || "");
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [showTimeline, setShowTimeline] = useState(true);
  
  // Popup modal state
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selected project details edit state
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const [editName, setEditName] = useState("");
  const [editStatus, setEditStatus] = useState<any>("PLANNING");
  const [editScope, setEditScope] = useState("");
  const [editPlanning, setEditPlanning] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editLead, setEditLead] = useState("");

  // Additional fields state
  const [editWorkflowStage, setEditWorkflowStage] = useState<any>("DRAFTING");
  const [editAuditorIds, setEditAuditorIds] = useState<string[]>([]);
  const [editDeptPicIds, setEditDeptPicIds] = useState<string[]>([]);
  const [editAttachments, setEditAttachments] = useState<Attachment[]>([]);

  // Selection Dropdown states
  const [isAuditorDropdownOpen, setIsAuditorDropdownOpen] = useState(false);
  const [isPicDropdownOpen, setIsPicDropdownOpen] = useState(false);

  // Additional screen-matching properties (session local persistence)
  const [editObjectives, setEditObjectives] = useState("<p>Enter audit objectives here...</p>");
  const [editRiskProcess, setEditRiskProcess] = useState("<p>Map process links here...</p>");
  const [editRiskClass, setEditRiskClass] = useState("<p>Enter classification logic...</p>");
  const [editOpEx, setEditOpEx] = useState("<p>Describe the audit technique and approach...</p>");
  const [editFieldwork, setEditFieldwork] = useState("<p>Describe how data inconsistencies will trigger specific fieldwork actions...</p>");
  const [editOutcome, setEditOutcome] = useState("<p>Detail the expected findings, reports, and corrective action plans...</p>");
  const [editDataRequestType, setEditDataRequestType] = useState("<p>Define the formats, sample counts, and audit logs required for secure transfer.</p>");
  const [editFocusArea, setEditFocusArea] = useState("<p>Highlight the high-risk transaction zones, sensitive credentials storage, and cloud service endpoints.</p>");
  
  // Timeline states
  const [editTimelinePresDate, setEditTimelinePresDate] = useState("");
  const [editTimelineNotificationDate, setEditTimelineNotificationDate] = useState("2026-07-09");
  const [editTimelineFieldWorkStart, setEditTimelineFieldWorkStart] = useState("2026-07-20");
  const [editTimelineFieldWorkEnd, setEditTimelineFieldWorkEnd] = useState("2026-07-31");
  const [editTimelineFindingReportOffset, setEditTimelineFindingReportOffset] = useState(3);
  const [editTimelineFinalReportOffset, setEditTimelineFinalReportOffset] = useState(7);

  // Approvals states
  const [editPreparedByName, setEditPreparedByName] = useState("");
  const [editPreparedByTitle, setEditPreparedByTitle] = useState("Lead Auditor");
  const [editPreparedDate, setEditPreparedDate] = useState("");
  const [editApprovedByName, setEditApprovedByName] = useState("");
  const [editApprovedByTitle, setEditApprovedByTitle] = useState("Head of Department");
  const [editApprovedDate, setEditApprovedDate] = useState("");

  const formatDateString = (dateStr: string) => {
    if (!dateStr) return "………………. (TBD)";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const getCalculatedDate = (baseDateStr: string, offsetDays: number) => {
    if (!baseDateStr) return null;
    try {
      const d = new Date(baseDateStr);
      if (isNaN(d.getTime())) return null;
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().split("T")[0];
    } catch {
      return null;
    }
  };
  
  const [riskLevel, setRiskLevel] = useState("High Impact");
  const [completionStatus, setCompletionStatus] = useState("45% Planned");

  // New Project Form state
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newLead, setNewLead] = useState("");

  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Helper to check if any edits are unsaved compared to database state
  const checkIfDirty = () => {
    if (!selectedProject) return false;
    
    if (editName !== selectedProject.name) return true;
    if (editStatus !== selectedProject.status) return true;
    if (editScope !== selectedProject.scope) return true;
    if (editPlanning !== selectedProject.planningDetails) return true;
    if (editStart !== selectedProject.startDate) return true;
    if (editEnd !== selectedProject.endDate) return true;
    if (editLead !== (selectedProject.leadAuditorId || "")) return true;
    
    if (editWorkflowStage !== (selectedProject.workflowStage || "DRAFTING")) return true;
    
    const dbObjectives = selectedProject.objectives || "<p>Ensure operational controls conform to local regulatory parameters, and technical data pathways remain uncompromised.</p>";
    if (editObjectives !== dbObjectives) return true;

    const dbRiskProcess = selectedProject.riskProcess || "<p>Verify VPC subnet logs meet security policy constraints, checking active firewalls against the compliance catalog.</p>";
    if (editRiskProcess !== dbRiskProcess) return true;

    const dbRiskClass = selectedProject.riskClass || "<p>Inherited vulnerabilities categorized by threat surface mapping per the 2026 enterprise risk guidelines.</p>";
    if (editRiskClass !== dbRiskClass) return true;

    const dbOpEx = selectedProject.opEx || "<p>Sample log outputs to trace system database transactions, using automated script checks to map discrepancies.</p>";
    if (editOpEx !== dbOpEx) return true;

    const dbFieldwork = selectedProject.fieldwork || "<p>Anomalies in database query latency will immediately trigger manual secondary auditor integrity checklists.</p>";
    if (editFieldwork !== dbFieldwork) return true;

    const dbOutcome = selectedProject.outcome || "<p>Comprehensive summary output highlighting compliance metrics, critical findings logs, and recommended adjustments.</p>";
    if (editOutcome !== dbOutcome) return true;

    const dbDataRequest = selectedProject.dataRequestType || "<p>Define the formats, sample counts, and audit logs required for secure transfer.</p>";
    if (editDataRequestType !== dbDataRequest) return true;

    const dbFocusArea = selectedProject.focusArea || "<p>Highlight the high-risk transaction zones, sensitive credentials storage, and cloud service endpoints.</p>";
    if (editFocusArea !== dbFocusArea) return true;
    
    const currentTimelineJson = JSON.stringify({
      presentationDate: editTimelinePresDate,
      notificationDate: editTimelineNotificationDate,
      fieldWorkStart: editTimelineFieldWorkStart,
      fieldWorkEnd: editTimelineFieldWorkEnd,
      findingReportOffset: Number(editTimelineFindingReportOffset),
      finalReportOffset: Number(editTimelineFinalReportOffset)
    });
    let dbTimelineJson = selectedProject.opExTimeline || "";
    if (!dbTimelineJson) {
      dbTimelineJson = JSON.stringify({
        presentationDate: "",
        notificationDate: "2026-07-09",
        fieldWorkStart: "2026-07-20",
        fieldWorkEnd: "2026-07-31",
        findingReportOffset: 3,
        finalReportOffset: 7
      });
    } else {
      try {
        dbTimelineJson = JSON.stringify(JSON.parse(dbTimelineJson));
      } catch {}
    }
    if (currentTimelineJson !== dbTimelineJson) return true;
    
    const currentApprovalsJson = JSON.stringify({
      preparedByName: editPreparedByName,
      preparedByTitle: editPreparedByTitle,
      preparedDate: editPreparedDate,
      approvedByName: editApprovedByName,
      approvedByTitle: editApprovedByTitle,
      approvedDate: editApprovedDate
    });
    let dbApprovalsJson = selectedProject.approvals || "";
    if (!dbApprovalsJson) {
      dbApprovalsJson = JSON.stringify({
        preparedByName: "",
        preparedByTitle: "Lead Auditor",
        preparedDate: "",
        approvedByName: "",
        approvedByTitle: "Head of Department",
        approvedDate: ""
      });
    } else {
      try {
        dbApprovalsJson = JSON.stringify(JSON.parse(dbApprovalsJson));
      } catch {}
    }
    if (currentApprovalsJson !== dbApprovalsJson) return true;
    
    const prevAuditors = selectedProject.auditorNames ? selectedProject.auditorNames.split(",").map(s => s.trim()).filter(Boolean) : [];
    if (editAuditorIds.length !== prevAuditors.length || !editAuditorIds.every(name => prevAuditors.includes(name))) return true;
    
    const prevPics = selectedProject.deptPicIds ? selectedProject.deptPicIds.split(",").filter(Boolean) : [];
    if (editDeptPicIds.length !== prevPics.length || !editDeptPicIds.every(name => prevPics.includes(name))) return true;

    return false;
  };

  const handleCloseEditor = () => {
    if (checkIfDirty()) {
      const confirmDiscard = window.confirm("Warning: You have unsaved changes. Discarding will lose all modifications made to this scoping document. Are you sure you want to exit?");
      if (!confirmDiscard) return;
    }
    setIsPopupOpen(false);
  };

  // Open popup and load project for editing
  const openProjectEditor = (proj: AuditProject) => {
    setSelectedProjectId(proj.id);
    setEditName(proj.name);
    setEditStatus(proj.status);
    setEditScope(proj.scope);
    setEditPlanning(proj.planningDetails);
    setEditStart(proj.startDate);
    setEditEnd(proj.endDate);
    setEditLead(proj.leadAuditorId || "");
    
    // Set custom SQLite integrations
    setEditWorkflowStage(proj.workflowStage || "DRAFTING");
    setEditAuditorIds(proj.auditorNames ? proj.auditorNames.split(",").map(s => s.trim()).filter(Boolean) : []);
    setEditDeptPicIds(proj.deptPicIds ? proj.deptPicIds.split(",").filter(Boolean) : []);
    setEditAttachments(proj.attachments || []);

    // Load scoping values from database fields, with default fallback templates if null/empty
    setEditObjectives(proj.objectives || "<p>Ensure operational controls conform to local regulatory parameters, and technical data pathways remain uncompromised.</p>");
    setEditRiskProcess(proj.riskProcess || "<p>Verify VPC subnet logs meet security policy constraints, checking active firewalls against the compliance catalog.</p>");
    setEditRiskClass(proj.riskClass || "<p>Inherited vulnerabilities categorized by threat surface mapping per the 2026 enterprise risk guidelines.</p>");
    setEditOpEx(proj.opEx || "<p>Sample log outputs to trace system database transactions, using automated script checks to map discrepancies.</p>");
    setEditFieldwork(proj.fieldwork || "<p>Anomalies in database query latency will immediately trigger manual secondary auditor integrity checklists.</p>");
    setEditOutcome(proj.outcome || "<p>Comprehensive summary output highlighting compliance metrics, critical findings logs, and recommended adjustments.</p>");
    setEditDataRequestType(proj.dataRequestType || "<p>Define the formats, sample counts, and audit logs required for secure transfer.</p>");
    setEditFocusArea(proj.focusArea || "<p>Highlight the high-risk transaction zones, sensitive credentials storage, and cloud service endpoints.</p>");
    
    let timelineObj = {
      presentationDate: "",
      notificationDate: "2026-07-09",
      fieldWorkStart: "2026-07-20",
      fieldWorkEnd: "2026-07-31",
      findingReportOffset: 3,
      finalReportOffset: 7
    };
    if (proj.opExTimeline) {
      try {
        timelineObj = { ...timelineObj, ...JSON.parse(proj.opExTimeline) };
      } catch (e) {
        console.error("Failed to parse timeline JSON:", e);
      }
    }
    setEditTimelinePresDate(timelineObj.presentationDate !== undefined ? timelineObj.presentationDate : "");
    setEditTimelineNotificationDate(timelineObj.notificationDate !== undefined ? timelineObj.notificationDate : "");
    setEditTimelineFieldWorkStart(timelineObj.fieldWorkStart !== undefined ? timelineObj.fieldWorkStart : "");
    setEditTimelineFieldWorkEnd(timelineObj.fieldWorkEnd !== undefined ? timelineObj.fieldWorkEnd : "");
    setEditTimelineFindingReportOffset(timelineObj.findingReportOffset !== undefined ? timelineObj.findingReportOffset : 3);
    setEditTimelineFinalReportOffset(timelineObj.finalReportOffset !== undefined ? timelineObj.finalReportOffset : 7);
    
    let approvalsObj = {
      preparedByName: "",
      preparedByTitle: "Lead Auditor",
      preparedDate: "",
      approvedByName: "",
      approvedByTitle: "Head of Department",
      approvedDate: ""
    };
    if (proj.approvals) {
      try {
        approvalsObj = { ...approvalsObj, ...JSON.parse(proj.approvals) };
      } catch (e) {
        console.error("Failed to parse approvals JSON:", e);
      }
    }
    setEditPreparedByName(approvalsObj.preparedByName || "");
    setEditPreparedByTitle(approvalsObj.preparedByTitle || "Lead Auditor");
    setEditPreparedDate(approvalsObj.preparedDate || "");
    setEditApprovedByName(approvalsObj.approvedByName || "");
    setEditApprovedByTitle(approvalsObj.approvedByTitle || "Head of Department");
    setEditApprovedDate(approvalsObj.approvedDate || "");
    
    // Close dropdown panels
    setIsAuditorDropdownOpen(false);
    setIsPicDropdownOpen(false);
    setSaveFeedback(null);

    setIsPopupOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedProject) return;
    setSaveFeedback("Submitting scoping details...");
    
    try {
      const updated = await updateProjectAction(selectedProject.id, {
        name: editName,
        status: editStatus,
        scope: editScope,
        planningDetails: editPlanning,
        startDate: editStart,
        endDate: editEnd,
        leadAuditorId: editLead || null,
        workflowStage: editWorkflowStage,
        deptPicIds: editDeptPicIds.join(","),
        auditorIds: editAuditorIds,
        auditorNames: editAuditorIds.join(","),
        objectives: editObjectives,
        riskProcess: editRiskProcess,
        riskClass: editRiskClass,
        opEx: editOpEx,
        fieldwork: editFieldwork,
        outcome: editOutcome,
        dataRequestType: editDataRequestType,
        focusArea: editFocusArea,
        opExTimeline: JSON.stringify({
          presentationDate: editTimelinePresDate,
          notificationDate: editTimelineNotificationDate,
          fieldWorkStart: editTimelineFieldWorkStart,
          fieldWorkEnd: editTimelineFieldWorkEnd,
          findingReportOffset: Number(editTimelineFindingReportOffset),
          finalReportOffset: Number(editTimelineFinalReportOffset)
        }),
        approvals: JSON.stringify({
          preparedByName: editPreparedByName,
          preparedByTitle: editPreparedByTitle,
          preparedDate: editPreparedDate,
          approvedByName: editApprovedByName,
          approvedByTitle: editApprovedByTitle,
          approvedDate: editApprovedDate
        })
      });

      if (updated) {
        setProjects(projects.map(p => p.id === selectedProject.id ? updated : p));
        setIsPopupOpen(false);
      } else {
        setSaveFeedback("Submission failed: Project not found.");
      }
    } catch (err: any) {
      console.error(err);
      setSaveFeedback(`Submission Error: ${err.message || err.toString()}`);
    }
  };

  const handleSaveOnly = async () => {
    if (!selectedProject) return;
    setSaveFeedback("Saving draft...");
    
    try {
      const updated = await updateProjectAction(selectedProject.id, {
        name: editName,
        status: editStatus,
        scope: editScope,
        planningDetails: editPlanning,
        startDate: editStart,
        endDate: editEnd,
        leadAuditorId: editLead || null,
        workflowStage: editWorkflowStage,
        deptPicIds: editDeptPicIds.join(","),
        auditorIds: editAuditorIds,
        auditorNames: editAuditorIds.join(","),
        objectives: editObjectives,
        riskProcess: editRiskProcess,
        riskClass: editRiskClass,
        opEx: editOpEx,
        fieldwork: editFieldwork,
        outcome: editOutcome,
        dataRequestType: editDataRequestType,
        focusArea: editFocusArea,
        opExTimeline: JSON.stringify({
          presentationDate: editTimelinePresDate,
          notificationDate: editTimelineNotificationDate,
          fieldWorkStart: editTimelineFieldWorkStart,
          fieldWorkEnd: editTimelineFieldWorkEnd,
          findingReportOffset: Number(editTimelineFindingReportOffset),
          finalReportOffset: Number(editTimelineFinalReportOffset)
        }),
        approvals: JSON.stringify({
          preparedByName: editPreparedByName,
          preparedByTitle: editPreparedByTitle,
          preparedDate: editPreparedDate,
          approvedByName: editApprovedByName,
          approvedByTitle: editApprovedByTitle,
          approvedDate: editApprovedDate
        })
      });

      if (updated) {
        setProjects(projects.map(p => p.id === selectedProject.id ? updated : p));
        setSaveFeedback("Scoping plan updates saved successfully.");
        setTimeout(() => setSaveFeedback(null), 4000);
      } else {
        setSaveFeedback("Save failed: Project not found.");
      }
    } catch (err: any) {
      console.error(err);
      setSaveFeedback(`Save Error: ${err.message || err.toString()}`);
    }
  };

  const handleUpdateWorkflowStage = async (newStage: any) => {
    setEditWorkflowStage(newStage);
    if (!selectedProject) return;

    const updated = await updateProjectAction(selectedProject.id, {
      workflowStage: newStage
    });

    if (updated) {
      setProjects(projects.map(p => p.id === selectedProject.id ? updated : p));
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newCode || !newStart || !newEnd) return;

    const newProj = await createProjectAction(
      newName,
      newCode,
      "PLANNING",
      "<p>Initial scoping document template. Replace this text with the audit boundaries.</p>",
      "<p>Define work breakdown structure and scheduled interview nodes here.</p>",
      newStart,
      newEnd,
      newLead || null
    );

    setProjects([...projects, newProj]);
    setIsCreating(false);
    openProjectEditor(newProj);
    
    // Clear form
    setNewName("");
    setNewCode("");
    setNewStart("");
    setNewEnd("");
    setNewLead("");
  };

  // Multiple Auditors selection handlers
  const toggleAuditor = (userId: string) => {
    if (editAuditorIds.includes(userId)) {
      setEditAuditorIds(editAuditorIds.filter(id => id !== userId));
    } else {
      setEditAuditorIds([...editAuditorIds, userId]);
    }
  };

  const removeAuditor = (userId: string) => {
    setEditAuditorIds(editAuditorIds.filter(id => id !== userId));
  };

  // Multiple Department PICs selection handlers
  const togglePic = (userId: string) => {
    if (editDeptPicIds.includes(userId)) {
      setEditDeptPicIds(editDeptPicIds.filter(id => id !== userId));
    } else {
      setEditDeptPicIds([...editDeptPicIds, userId]);
    }
  };

  const removePic = (userId: string) => {
    setEditDeptPicIds(editDeptPicIds.filter(id => id !== userId));
  };

  // Attachments handlers
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedProject || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    // Read file data as base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      const newAttachment = await addAttachmentAction(
        selectedProject.id,
        file.name,
        file.size,
        file.type,
        base64Data
      );

      if (newAttachment) {
        const freshAttachments = [...editAttachments, newAttachment];
        setEditAttachments(freshAttachments);
        
        // Update project state locally
        setProjects(projects.map(p => p.id === selectedProject.id ? { ...p, attachments: freshAttachments } : p));
      }
    };
    reader.readAsDataURL(file);
    
    // Reset uploader
    e.target.value = "";
  };

  const handleDeleteFile = async (attachmentId: string) => {
    if (!selectedProject) return;
    
    const success = await deleteAttachmentAction(attachmentId);
    if (success) {
      const freshAttachments = editAttachments.filter(a => a.id !== attachmentId);
      setEditAttachments(freshAttachments);
      
      // Update project state locally
      setProjects(projects.map(p => p.id === selectedProject.id ? { ...p, attachments: freshAttachments } : p));
    }
  };

  const handleDownloadFile = (attachment: Attachment) => {
    // Reconstruct file data download using Base64 URI anchor tag
    const link = document.createElement("a");
    link.href = attachment.fileData;
    link.download = attachment.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter project logic
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const canModify = RBAC.canCreateProject(currentUser);
  const leadAuditors = users.filter(u => u.role === "LEAD_AUDITOR" || u.role === "ADMIN");

  const statusOptions = [
    { label: "Planning", value: "PLANNING" },
    { label: "In Progress", value: "IN_PROGRESS" },
    { label: "Reporting", value: "REPORTING" },
    { label: "Archived", value: "ARCHIVED" }
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-6 no-print">
        {/* Title */}
      <div className="space-y-0.5">
        <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Audit Plan</h1>
      </div>

      {/* New Project Creator View */}
      {isCreating && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Create New Audit Project</h3>
            <button 
              onClick={() => setIsCreating(false)}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          <form onSubmit={handleCreateProject} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-500 uppercase">Project Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. SOX Audit 2026"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-500 uppercase">Project Code</label>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="e.g. AUD-2026-003"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-500 uppercase">Start Date</label>
                <input
                  type="date"
                  required
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-500 uppercase">End Date</label>
                <input
                  type="date"
                  required
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-500 uppercase">Lead Auditor</label>
              <select
                value={newLead}
                onChange={(e) => setNewLead(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-sm focus:outline-none cursor-pointer"
              >
                <option value="">Select Lead Auditor...</option>
                {leadAuditors.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm rounded-md transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#05375c] text-white font-semibold text-sm rounded-md hover:bg-[#074776] transition-colors cursor-pointer"
              >
                Scaffold Project
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main projects grid layout */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        
        {/* ActionToolbar */}
        <ActionToolbar
          onCreate={canModify ? () => setIsCreating(true) : undefined}
          onRefresh={() => {
            setSearchQuery("");
            setStatusFilter("ALL");
          }}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchPlaceholder="Search projects..."
          filterLabel="Status"
          filterValue={statusFilter}
          setFilterValue={setStatusFilter}
          filterOptions={statusOptions}
          activeFilterCountLabel={statusFilter === "ALL" ? "ALL" : "FILTERED"}
        />

        {/* Table of projects */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-sans font-bold">
              <tr>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Project Name</th>
                <th className="px-6 py-4">Lead Auditor</th>
                <th className="px-6 py-4">Start Date</th>
                <th className="px-6 py-4">End Date</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredProjects.map((proj) => {
                let statusText = "Planning";
                let statusColor = "text-amber-500";
                
                if (proj.status === "IN_PROGRESS") {
                  statusText = "Released";
                  statusColor = "text-[#30b050]";
                } else if (proj.status === "REPORTING") {
                  statusText = "Reporting";
                  statusColor = "text-blue-500";
                } else if (proj.status === "ARCHIVED") {
                  statusText = "Inactive";
                  statusColor = "text-red-500";
                }

                return (
                  <tr 
                    key={proj.id}
                    onClick={() => setSelectedProjectId(proj.id === selectedProjectId ? "" : proj.id)}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors select-none cursor-pointer ${
                      proj.id === selectedProjectId ? "bg-slate-100/80 dark:bg-slate-800/50 font-medium" : ""
                    }`}
                  >
                    <td className="px-6 py-4 font-mono text-slate-800 dark:text-slate-200">
                      {proj.code}
                    </td>
                    <td 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProjectId(proj.id);
                        openProjectEditor(proj);
                      }}
                      className="px-6 py-4 text-[#0066cc] font-medium hover:underline cursor-pointer"
                    >
                      {proj.name}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {users.find(u => u.id === proj.leadAuditorId)?.name || proj.leadAuditorId || "Unassigned"}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {proj.startDate}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {proj.endDate}
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${statusColor}`}>
                      {statusText}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
      </div>

      {/* Screen-matching Modal Editor Overlay */}
      {isPopupOpen && selectedProject && (
        <div id="scoping-modal-root" className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 flex justify-center z-50 overflow-y-auto p-4 md:p-8 animate-fade-in">
          <div className="bg-slate-50 dark:bg-slate-950 w-full max-w-6xl rounded-lg shadow-2xl flex flex-col overflow-hidden h-fit border border-slate-200 dark:border-slate-800 scoping-modal-container">
            
            {/* Modal Header Breadcrumb & Actions */}
            <div className="px-8 py-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 font-bold">
                  <span>Audit Plans</span>
                  <span>&gt;</span>
                  <span className="text-slate-600 dark:text-slate-300">{selectedProject.code}</span>
                </div>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-lg md:text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#05375c] focus:outline-none w-full pb-0.5"
                />
                
                {/* Meta details row under header */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-[10px] font-mono text-slate-400">
                  <span className="bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/50 px-2 py-0.5 rounded font-bold uppercase">
                    {editStatus === "PLANNING" ? "Drafting" : editStatus === "IN_PROGRESS" ? "Released" : editStatus}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5" /> Created {selectedProject.startDate}
                  </span>
                  <span className="flex items-center gap-1">
                    <UserIcon className="w-3.5 h-3.5" /> Assigned to {users.find(u => u.id === editLead)?.name || "Unassigned"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5" /> Owner: Sarah Jenkins
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Execution: {editEnd}
                  </span>
                </div>
              </div>

              {/* Save feedback indicator */}
              {saveFeedback && (
                <div className="text-[10px] font-mono font-bold text-[#30b050] bg-green-500/10 dark:bg-green-500/5 border border-green-500/25 px-3 py-1.5 rounded animate-pulse shrink-0">
                  {saveFeedback}
                </div>
              )}

              {/* Action buttons (Header Right) */}
              <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0 no-print">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold rounded transition-colors cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5" /> Export PDF
                </button>
                <button
                  onClick={handleSaveOnly}
                  className="flex items-center gap-1.5 px-3 py-2 border border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-100/50 text-[#0066cc] text-xs font-bold rounded transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" /> Save Plan
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#0a1128] dark:bg-accent text-white dark:text-slate-950 hover:opacity-90 text-xs font-bold rounded transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> Submit for Review
                </button>
                <button
                  onClick={handleCloseEditor}
                  className="p-2 border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 rounded cursor-pointer"
                  title="Close Screen"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body Container Grid matching screen.png layout */}
            <div className="p-8 space-y-6 overflow-y-auto max-h-[72vh] bg-slate-50 dark:bg-slate-950">
              
              {/* Stepper Stage Indicator */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg p-5">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-mono font-bold uppercase text-slate-400">Document Workflow Stage</div>
                  <div className="text-[10px] font-mono font-bold text-[#0066cc] bg-blue-500/10 px-2.5 py-0.5 rounded uppercase">
                    Current: {editWorkflowStage}
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between relative px-2">
                  {/* Line connector */}
                  <div className="absolute left-8 right-8 top-[11px] h-0.5 bg-slate-100 dark:bg-slate-800 z-0" />
                  <div 
                    className="absolute left-8 top-[11px] h-0.5 bg-[#0066cc] z-0 transition-all duration-300" 
                    style={{
                      width: editWorkflowStage === "DRAFTING" ? "0%" : editWorkflowStage === "REVIEW" ? "33%" : editWorkflowStage === "PENDING_PIC" ? "66%" : "100%"
                    }}
                  />

                  {/* Stage Nodes */}
                  {[
                    { label: "Drafting", value: "DRAFTING" },
                    { label: "Internal Review", value: "REVIEW" },
                    { label: "Pending PIC Sign-off", value: "PENDING_PIC" },
                    { label: "Approved & Released", value: "APPROVED" }
                  ].map((stage, idx) => {
                    const stages = ["DRAFTING", "REVIEW", "PENDING_PIC", "APPROVED"];
                    const currentIdx = stages.indexOf(editWorkflowStage);
                    const isPast = idx <= currentIdx;
                    const isCurrent = stage.value === editWorkflowStage;

                    return (
                      <button
                        key={stage.value}
                        type="button"
                        onClick={() => handleUpdateWorkflowStage(stage.value as any)}
                        className="z-10 flex flex-col items-center gap-1.5 focus:outline-none cursor-pointer group"
                      >
                        <div 
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[9px] font-bold border transition-colors ${
                            isCurrent 
                              ? "bg-[#0066cc] border-[#0066cc] text-white" 
                              : isPast 
                                ? "bg-blue-500/10 border-[#0066cc] text-[#0066cc]" 
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-850 text-slate-400"
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <span className={`text-[10px] font-bold tracking-tight transition-colors ${isCurrent ? "text-slate-800 dark:text-slate-100" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"}`}>
                          {stage.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Summary Panel at the Top */}
              <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg p-6 space-y-4 shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-150 dark:border-slate-800 pb-2">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Quick Summary
                  </h3>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                    Last edited by Sarah Jenkins 2 hours ago
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Column 1: Risk Level & Completion Status */}
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-mono font-bold uppercase text-slate-500">Risk Level</span>
                      <select 
                        value={riskLevel} 
                        onChange={(e) => setRiskLevel(e.target.value)}
                        className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-mono font-bold px-3 py-2 rounded focus:outline-none cursor-pointer"
                      >
                        <option value="High Impact" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">High Impact</option>
                        <option value="Medium Impact" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Medium Impact</option>
                        <option value="Low Impact" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Low Impact</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-mono font-bold uppercase">Completion Status</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">{completionStatus}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-[#0066cc] h-full rounded-full w-[45%]" />
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Lead & Auditors */}
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-mono font-bold uppercase text-slate-500">Lead Auditor</label>
                      <MultiSelect
                        selectedValues={editLead ? editLead.split(",").map(s => s.trim()).filter(Boolean) : []}
                        onChange={(values) => setEditLead(values.join(", "))}
                        options={users
                          .filter(u => u.role === "LEAD_AUDITOR" || u.role === "ADMIN")
                          .map(u => ({
                            value: u.name,
                            label: u.name,
                            subLabel: `${u.role.replace("_", " ")}${u.email ? ` • ${u.email}` : ""}`
                          }))}
                        placeholder="Select Lead Auditors..."
                      />
                    </div>

                    <div className="space-y-2 relative">
                      <label className="text-xs font-mono font-bold uppercase text-slate-500">Auditors</label>
                      <MultiSelect
                        selectedValues={editAuditorIds}
                        onChange={(values) => setEditAuditorIds(values)}
                        options={users
                          .filter(u => u.role === "ADMIN" || u.role === "LEAD_AUDITOR" || u.role === "AUDITOR")
                          .map(u => ({
                            value: u.name,
                            label: u.name,
                            subLabel: `${u.role.replace("_", " ")}${u.email ? ` • ${u.email}` : ""}`
                          }))}
                        placeholder="Select Auditors..."
                      />
                    </div>
                  </div>

                  {/* Column 3: Department PIC */}
                  <div className="space-y-4 relative">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-mono font-bold uppercase text-slate-500">Department PIC</label>
                      <MultiSelect
                        selectedValues={editDeptPicIds}
                        onChange={(values) => setEditDeptPicIds(values)}
                        options={users.map(u => ({
                          value: u.name,
                          label: u.name,
                          subLabel: `${u.role.replace("_", " ")}${u.email ? ` • ${u.email}` : ""}`
                        }))}
                        placeholder="Select PICs..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel 1: Objectives & Scope (Full Width) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4 shadow-sm">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-150 dark:border-slate-800 pb-2">
                  I. Objectives & Scope
                </h3>

                <div className="space-y-1.5">
                  <label className="text-[14px] font-mono font-bold text-slate-750 dark:text-slate-350 uppercase">1.1 Objectives</label>
                  <RichEditor value={editObjectives} onChange={setEditObjectives} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[14px] font-mono font-bold text-slate-750 dark:text-slate-350 uppercase">1.2 Audit Scope</label>
                  <RichEditor value={editScope} onChange={setEditScope} />
                </div>
              </div>

              {/* Panel 2: Risk Mapping & Classification */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-150 dark:border-slate-800 pb-2">
                  <h3 className="text-[20px] text-xs font-mono font-bold uppercase tracking-wider text-slate-1000 border-b border-slate-150 dark:border-slate-800 pb-2">
                    II. Map risk to department in charge
                  </h3>
                  {/* <button 
                    type="button"
                    onClick={() => alert("Standard mapping framework imported successfully.")}
                    className="flex items-center gap-1 px-2.5 py-1 border border-slate-200 dark:border-slate-800 text-[10px] font-bold rounded text-slate-600 dark:text-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer"
                  >
                    <Import className="w-3.5 h-3.5" /> Import Framework
                  </button> */}
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[15px] font-mono font-bold text-slate-800 uppercase">Risk meets company process</label>
                    <RichEditor value={editRiskProcess} onChange={setEditRiskProcess} />
                  </div>
                  <div className="space-y-1.5">
                    <label className=" text-[15px] font-mono font-bold text-slate-800 uppercase">Classify risk base on potential impact</label>
                    <RichEditor value={editRiskClass} onChange={setEditRiskClass} />
                  </div>
                </div>
              </div>

              {/* Panel 3: Operational Excellence */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-5">
                <h3 className="text-[20px] text-xs font-mono font-bold uppercase tracking-wider text-slate-1000 border-b border-slate-150 dark:border-slate-800 pb-2">
                  III. Operational excellence technique/approach
                </h3>
                
                <div className="space-y-1.5">
                  <label className="text-[15px] font-mono font-bold text-slate-800 uppercase">Obtain data error to fieldwork mapping</label>
                  <RichEditor value={editOpEx} onChange={setEditOpEx} />
                </div>

                <div className="pt-4 border-t border-slate-150 dark:border-slate-800/80 space-y-1">
                  <h4 className="text-[20px] text-xs font-mono font-bold uppercase tracking-wider text-slate-1000 border-b border-slate-150 dark:border-slate-800 pb-2">IV. Obtain data error to fieldwork parameters</h4>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[15px] font-mono font-bold text-slate-800 uppercase">Type of data to request for information</label>
                      <RichEditor value={editDataRequestType} onChange={setEditDataRequestType} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[15px] font-mono font-bold text-slate-800 uppercase">Which part need to focus on</label>
                      <RichEditor value={editFocusArea} onChange={setEditFocusArea} />
                    </div>
                  </div>
                </div>
              </div>
              {/* Panel 5: Operational Excellence Timeline */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-6">
                <h3 className="text-[20px] text-xs font-mono font-bold uppercase tracking-wider text-slate-1000 border-b border-slate-150 dark:border-slate-800 pb-2">
                  V. Operational Excellence timeline
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Interactive Inputs */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-mono font-bold text-slate-700 dark:text-slate-300 uppercase">Planning Presentation Date</label>
                      <input 
                        type="date" 
                        value={editTimelinePresDate}
                        onChange={(e) => setEditTimelinePresDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[12px] font-mono font-bold text-slate-700 dark:text-slate-300 uppercase">Notification to Department in charge</label>
                      <input 
                        type="date" 
                        value={editTimelineNotificationDate}
                        onChange={(e) => setEditTimelineNotificationDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-mono font-bold text-slate-700 dark:text-slate-300 uppercase">Field Work Start</label>
                        <input 
                          type="date" 
                          value={editTimelineFieldWorkStart}
                          onChange={(e) => setEditTimelineFieldWorkStart(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-mono font-bold text-slate-700 dark:text-slate-300 uppercase">Field Work End</label>
                        <input 
                          type="date" 
                          value={editTimelineFieldWorkEnd}
                          onChange={(e) => setEditTimelineFieldWorkEnd(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-mono font-bold text-slate-700 dark:text-slate-300 uppercase">Finding/Observation Offset (Days)</label>
                        <input 
                          type="number" 
                          value={editTimelineFindingReportOffset}
                          onChange={(e) => setEditTimelineFindingReportOffset(parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-mono font-bold text-slate-700 dark:text-slate-300 uppercase">Final Report Offset (Days)</label>
                        <input 
                          type="number" 
                          value={editTimelineFinalReportOffset}
                          onChange={(e) => setEditTimelineFinalReportOffset(parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Visual Timeline Stepper */}
                  <div className="bg-slate-50 dark:bg-slate-950 rounded-lg p-5 border border-slate-100 dark:border-slate-900 space-y-4">
                    <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">Timeline Milestone Preview</h4>
                    
                    <div className="relative pl-6 border-l-2 border-blue-500/30 dark:border-blue-900/40 space-y-6">
                      {/* Milestone 1 */}
                      <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 border-blue-500 bg-white dark:bg-slate-950 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        </div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Planning Presentation Date</div>
                        <div className="text-[11px] font-mono text-slate-500">{formatDateString(editTimelinePresDate)}</div>
                      </div>

                      {/* Milestone 2 */}
                      <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 border-blue-500 bg-white dark:bg-slate-950 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        </div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Notification to Department in charge</div>
                        <div className="text-[11px] font-mono text-slate-500">{formatDateString(editTimelineNotificationDate)}</div>
                      </div>

                      {/* Milestone 3 */}
                      <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 border-blue-500 bg-white dark:bg-slate-950 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        </div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Field Work Duration</div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {editTimelineFieldWorkStart || editTimelineFieldWorkEnd ? (
                            `${formatDateString(editTimelineFieldWorkStart)} to ${formatDateString(editTimelineFieldWorkEnd)}`
                          ) : (
                            "TBD"
                          )}
                        </div>
                      </div>

                      {/* Milestone 4 */}
                      <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 border-blue-500 bg-white dark:bg-slate-950 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        </div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Finding/Observation Report Submission</div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {formatDateString(getCalculatedDate(editTimelineFieldWorkEnd, editTimelineFindingReportOffset) || "")}
                          <span className="text-[10px] text-slate-400 ml-1.5">({editTimelineFindingReportOffset} days after fieldwork)</span>
                        </div>
                      </div>

                      {/* Milestone 5 */}
                      <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 border-blue-500 bg-white dark:bg-slate-950 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        </div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Final Report to Top Management</div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {formatDateString(
                            getCalculatedDate(
                              getCalculatedDate(editTimelineFieldWorkEnd, editTimelineFindingReportOffset) || "", 
                              editTimelineFinalReportOffset
                            ) || ""
                          )}
                          <span className="text-[10px] text-slate-400 ml-1.5">({editTimelineFinalReportOffset} days after finding report)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Panel 4: Fieldwork Strategy & Expected Outcomes */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4">
                <h3 className="text-[20px] text-xs font-mono font-bold uppercase tracking-wider text-slate-1000 border-b border-slate-150 dark:border-slate-800 pb-2">
                  VI.Expected Outcomes
                </h3>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[15px] font-mono font-bold text-slate-800 uppercase">Expected Outcomes</label>
                    <RichEditor value={editFieldwork} onChange={setEditFieldwork} />
                  </div>
                </div>
              </div>
              {/* Panel 7: Sign-off & Approvals */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-6">
                <h3 className="text-[20px] text-xs font-mono font-bold uppercase tracking-wider text-slate-1000 border-b border-slate-150 dark:border-slate-800 pb-2">
                  VII. Scoping Approvals & Sign-off
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Prepared By Section */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-lg border border-slate-100 dark:border-slate-850 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                      <h4 className="text-[12px] font-mono font-bold text-slate-700 dark:text-slate-300 uppercase">Prepared By</h4>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-mono font-bold text-slate-450 uppercase block mb-1">Name</label>
                        <input 
                          type="text" 
                          value={editPreparedByName}
                          onChange={(e) => setEditPreparedByName(e.target.value)}
                          placeholder="e.g. Sarah Jenkins"
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono font-bold text-slate-450 uppercase block mb-1">Position</label>
                        <input 
                          type="text" 
                          value={editPreparedByTitle}
                          onChange={(e) => setEditPreparedByTitle(e.target.value)}
                          placeholder="e.g. Lead Auditor"
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono font-bold text-slate-450 uppercase block mb-1">Date</label>
                        <input 
                          type="date" 
                          value={editPreparedDate}
                          onChange={(e) => setEditPreparedDate(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Approved By Section */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-lg border border-slate-100 dark:border-slate-850 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#00cc66]"></div>
                      <h4 className="text-[12px] font-mono font-bold text-slate-700 dark:text-slate-300 uppercase">Approved By</h4>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-mono font-bold text-slate-450 uppercase block mb-1">Name</label>
                        <input 
                          type="text" 
                          value={editApprovedByName}
                          onChange={(e) => setEditApprovedByName(e.target.value)}
                          placeholder="e.g. Alice Auditee"
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#00cc66]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono font-bold text-slate-450 uppercase block mb-1">Position</label>
                        <input 
                          type="text" 
                          value={editApprovedByTitle}
                          onChange={(e) => setEditApprovedByTitle(e.target.value)}
                          placeholder="e.g. Compliance Director"
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#00cc66]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono font-bold text-slate-450 uppercase block mb-1">Date</label>
                        <input 
                          type="date" 
                          value={editApprovedDate}
                          onChange={(e) => setEditApprovedDate(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#00cc66]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-150 dark:border-slate-800 pb-2">
                  <h3 className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                    <FileText className="w-4 h-4" /> Plan Attachments & Filesss
                  </h3>
                  <div>
                    <input
                      type="file"
                      id="plan-file-input"
                      className="hidden"
                      onChange={handleUploadFile}
                    />
                    <label
                      htmlFor="plan-file-input"
                      className="flex items-center gap-1 px-2.5 py-1 border border-slate-200 dark:border-slate-850 text-[10px] font-bold rounded text-slate-600 dark:text-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Attach File
                    </label>
                  </div>
                </div>

                {/* Attachment List */}
                <div className="space-y-2">
                  {editAttachments.length === 0 ? (
                    <div className="text-[11px] text-slate-400 py-2 italic text-center">
                      No documents attached to this plan yet. Use the button above to upload files.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {editAttachments.map((file) => (
                        <div 
                          key={file.id} 
                          className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 rounded-md"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <FileText className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                            <div className="truncate text-left">
                              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate" title={file.fileName}>
                                {file.fileName}
                              </div>
                              <div className="text-[9px] font-mono text-slate-400">
                                {(file.fileSize / 1024).toFixed(1)} KB | {file.fileType.split("/")[1] || "doc"}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-4">
                            <button
                              type="button"
                              onClick={() => handleDownloadFile(file)}
                              className="p-1 text-slate-500 hover:text-[#0066cc] cursor-pointer"
                              title="Download Attachment"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteFile(file.id)}
                              className="p-1 text-slate-500 hover:text-red-500 cursor-pointer"
                              title="Remove Attachment"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Page Footer */}
            <div className="px-8 py-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-mono text-slate-400 shrink-0">
              <div>
                <span>Audit ID: {selectedProject.code}-INTERNAL</span>
                <span className="mx-2">|</span>
                <span>Last Synced: Just now</span>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={handleCloseEditor}
                  className="hover:text-red-500 transition-colors font-semibold cursor-pointer"
                >
                  Discard Draft
                </button>
                <button 
                  onClick={() => alert("Scoping revision history fetched.")}
                  className="hover:text-slate-700 dark:hover:text-slate-250 transition-colors cursor-pointer flex items-center gap-0.5"
                >
                  <History className="w-3 h-3" /> Audit History
                </button>
                <button 
                  onClick={() => alert("Redirecting to Compliance Policy Catalog.")}
                  className="hover:text-slate-700 dark:hover:text-slate-250 transition-colors cursor-pointer flex items-center gap-0.5"
                >
                  Policy Link <ArrowUpRight className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
