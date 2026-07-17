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
  Plus,
  CheckCircle,
  XCircle,
  RotateCcw,
  Mail
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
  deleteAttachmentAction,
  deleteProjectAction,
  sendEmailNotificationAction
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
  const [editObjectives, setEditObjectives] = useState("");
  const [editRiskProcess, setEditRiskProcess] = useState("");
  const [editRiskClass, setEditRiskClass] = useState("");
  const [editOpEx, setEditOpEx] = useState("");
  const [editFieldwork, setEditFieldwork] = useState("");
  const [editOutcome, setEditOutcome] = useState("");
  const [editDataRequestType, setEditDataRequestType] = useState("");
  const [editFocusArea, setEditFocusArea] = useState("");
  
  // Timeline states
  const [editTimelinePresDate, setEditTimelinePresDate] = useState("");
  const [editTimelineNotificationDate, setEditTimelineNotificationDate] = useState("");
  const [editTimelineFieldWorkStart, setEditTimelineFieldWorkStart] = useState("");
  const [editTimelineFieldWorkEnd, setEditTimelineFieldWorkEnd] = useState("");
  const [editTimelineFindingReportOffset, setEditTimelineFindingReportOffset] = useState(0);
  const [editTimelineFinalReportOffset, setEditTimelineFinalReportOffset] = useState(0);

  // Approvals states
  const [editPreparedByName, setEditPreparedByName] = useState("");
  const [editPreparedByTitle, setEditPreparedByTitle] = useState("");
  const [editPreparedDate, setEditPreparedDate] = useState("");
  const [editApprovedByName, setEditApprovedByName] = useState("");
  const [editApprovedByTitle, setEditApprovedByTitle] = useState("");
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
    
    const dbObjectives = selectedProject.objectives || "";
    if (editObjectives !== dbObjectives) return true;

    const dbRiskProcess = selectedProject.riskProcess || "";
    if (editRiskProcess !== dbRiskProcess) return true;

    const dbRiskClass = selectedProject.riskClass || "";
    if (editRiskClass !== dbRiskClass) return true;

    const dbOpEx = selectedProject.opEx || "";
    if (editOpEx !== dbOpEx) return true;

    const dbFieldwork = selectedProject.fieldwork || "";
    if (editFieldwork !== dbFieldwork) return true;

    const dbOutcome = selectedProject.outcome || "";
    if (editOutcome !== dbOutcome) return true;

    const dbDataRequest = selectedProject.dataRequestType || "";
    if (editDataRequestType !== dbDataRequest) return true;

    const dbFocusArea = selectedProject.focusArea || "";
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
        notificationDate: "",
        fieldWorkStart: "",
        fieldWorkEnd: "",
        findingReportOffset: 0,
        finalReportOffset: 0
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
        preparedByTitle: "",
        preparedDate: "",
        approvedByName: "",
        approvedByTitle: "",
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
    setEditObjectives(proj.objectives || "");
    setEditRiskProcess(proj.riskProcess || "");
    setEditRiskClass(proj.riskClass || "");
    setEditOpEx(proj.opEx || "");
    setEditFieldwork(proj.fieldwork || "");
    setEditOutcome(proj.outcome || "");
    setEditDataRequestType(proj.dataRequestType || "");
    setEditFocusArea(proj.focusArea || "");
    
    let timelineObj = {
      presentationDate: "",
      notificationDate: "",
      fieldWorkStart: "",
      fieldWorkEnd: "",
      findingReportOffset: 0,
      finalReportOffset: 0
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
    setEditTimelineFindingReportOffset(timelineObj.findingReportOffset !== undefined ? timelineObj.findingReportOffset : 0);
    setEditTimelineFinalReportOffset(timelineObj.finalReportOffset !== undefined ? timelineObj.finalReportOffset : 0);
    
    let approvalsObj = {
      preparedByName: "",
      preparedByTitle: "",
      preparedDate: "",
      approvedByName: "",
      approvedByTitle: "",
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
    setEditPreparedByTitle(approvalsObj.preparedByTitle || "");
    setEditPreparedDate(approvalsObj.preparedDate || "");
    setEditApprovedByName(approvalsObj.approvedByName || "");
    setEditApprovedByTitle(approvalsObj.approvedByTitle || "");
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

  const saveStatusChange = async (newStatus: any) => {
    if (!selectedProject) return;
    setEditStatus(newStatus);
    setSaveFeedback(`Updating status to ${newStatus}...`);
    try {
      const updated = await updateProjectAction(selectedProject.id, {
        name: editName,
        status: newStatus,
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
        setSaveFeedback(`Status successfully updated to ${newStatus === "PLANNING" ? "Planning" : newStatus === "SUBMITTED_FOR_APPROVAL" ? "Submitted for Approval" : "Released"}.`);
        setTimeout(() => setSaveFeedback(null), 3000);
      } else {
        setSaveFeedback("Status update failed: Project not found.");
      }
    } catch (err: any) {
      console.error(err);
      setSaveFeedback(`Status update Error: ${err.message || err.toString()}`);
    }
  };

  const triggerEmailAlerts = (simulatedAlerts: Array<{ to: string; subject: string; body: string }>) => {
    for (const alert of simulatedAlerts) {
      window.dispatchEvent(new CustomEvent("send-simulated-email", { detail: alert }));
    }
  };

  const handleSubmitForApproval = async () => {
    if (!selectedProject) return;
    await saveStatusChange("SUBMITTED_FOR_APPROVAL");
    const emailResult = await sendEmailNotificationAction("planning", selectedProject.id, {
      status: "SUBMITTED_FOR_APPROVAL",
      details: "The audit plan scoping and timelines have been submitted for approval review."
    });
    if (emailResult.success) {
      triggerEmailAlerts(emailResult.simulatedAlerts);
    }
  };
 
  const handleApprovePlan = async () => {
    if (!selectedProject) return;
    await saveStatusChange("RELEASED");
    const emailResult = await sendEmailNotificationAction("planning", selectedProject.id, {
      status: "RELEASED (APPROVED)",
      details: "The audit plan has been officially approved and released by the Lead Auditor."
    });
    if (emailResult.success) {
      triggerEmailAlerts(emailResult.simulatedAlerts);
    }
  };
 
  const handleRejectPlan = async () => {
    if (!selectedProject) return;
    await saveStatusChange("PLANNING");
    const emailResult = await sendEmailNotificationAction("planning", selectedProject.id, {
      status: "REJECTED (REOPENED)",
      details: "The audit plan was rejected by the approver. The status has reverted to Planning. Please revise the scoping documents and timelines."
    });
    if (emailResult.success) {
      triggerEmailAlerts(emailResult.simulatedAlerts);
    }
  };
 
  const handleReopenPlan = async () => {
    if (!selectedProject) return;
    await saveStatusChange("PLANNING");
    const emailResult = await sendEmailNotificationAction("planning", selectedProject.id, {
      status: "PLANNING (REOPENED)",
      details: "The approval submission has been cancelled. The plan is now reopened for further editing."
    });
    if (emailResult.success) {
      triggerEmailAlerts(emailResult.simulatedAlerts);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newCode || !newStart || !newEnd) return;

    const newProj = await createProjectAction(
      newName,
      newCode,
      "PLANNING",
      "",
      "",
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

  const handleDeleteProject = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this Audit Plan? This action cannot be undone and will delete all related findings, reports, schedules, and attachments.")) {
      return;
    }
    const success = await deleteProjectAction(id);
    if (success) {
      setProjects(projects.filter(p => p.id !== id));
      if (selectedProjectId === id) {
        setSelectedProjectId("");
      }
    } else {
      alert("Failed to delete the Audit Plan.");
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

  const isProjectMember = (proj: AuditProject | null) => {
    if (!proj) return false;
    if (currentUser.role === "ADMIN") return true;
    if (proj.leadAuditorId === currentUser.id) return true;
    const auditorsList = proj.auditorNames ? proj.auditorNames.split(",").map(s => s.trim()) : [];
    if (auditorsList.includes(currentUser.name)) return true;
    if (proj.auditorIds?.includes(currentUser.id)) return true;
    const picList = proj.deptPicIds ? proj.deptPicIds.split(",") : [];
    if (picList.includes(currentUser.id) || picList.includes(currentUser.name)) return true;
    return false;
  };

  const canModify = true;
  const isReadOnly = editStatus !== "PLANNING" || !isProjectMember(selectedProject || null);
  const leadAuditors = users.filter(u => u.role === "LEAD_AUDITOR" || u.role === "ADMIN");

  const statusOptions = [
    { label: "Planning", value: "PLANNING" },
    { label: "Submitted for Approval", value: "SUBMITTED_FOR_APPROVAL" },
    { label: "Released", value: "RELEASED" }
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-6 no-print">
        {/* Title */}
      <div className="space-y-0.5">
        <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Audit Plan</h1>
      </div>

      {/* New Project Creator Modal */}
      {isCreating && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
          onClick={() => setIsCreating(false)}
        >
          <div 
            className="bg-white dark:bg-slate-950 w-full max-w-2xl rounded-lg shadow-2xl flex flex-col overflow-hidden h-fit border border-slate-200 dark:border-slate-850 scoping-modal-container transform scale-100 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-8 py-5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-roboto text-slate-400 font-bold uppercase tracking-wider">
                  Document 1. Audit Plan
                </div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Create New Audit Plan
                </h2>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 rounded cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Form with Word Document table styling */}
            <form onSubmit={handleCreateProject} className="p-8 space-y-6">
              <div className="overflow-x-auto border border-slate-300 dark:border-slate-800 rounded-md">
                <table className="w-full border-collapse text-xs">
                  <tbody>
                    {/* Row 1: Project Name */}
                    <tr className="border-b border-slate-300 dark:border-slate-800/80">
                      <td className="w-1/4 px-4 py-3 bg-slate-50 dark:bg-slate-900/60 font-bold border-r border-slate-300 dark:border-slate-800/80 text-slate-700 dark:text-slate-300">
                        Project Name*:
                      </td>
                      <td colSpan={3} className="px-4 py-2">
                        <input
                          type="text"
                          required
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          // placeholder="e.g. SOX Audit 2026"
                          className="w-full bg-transparent border-none p-0 text-xs focus:outline-none font-bold text-slate-800 dark:text-slate-100"
                        />
                      </td>
                    </tr>

                    {/* Row 2: Project Code */}
                    <tr className="border-b border-slate-300 dark:border-slate-800/80">
                      <td className="px-4 py-3 bg-slate-50 dark:bg-slate-900/60 font-bold border-r border-slate-300 dark:border-slate-800/80 text-slate-700 dark:text-slate-300">
                        Project Code*:
                      </td>
                      <td colSpan={3} className="px-4 py-2">
                        <input
                          type="text"
                          required
                          value={newCode}
                          onChange={(e) => setNewCode(e.target.value)}
                          // placeholder="e.g. AUD-2026-003"
                          className="w-full bg-transparent border-none p-0 text-xs focus:outline-none font-sans text-slate-800 dark:text-slate-100"
                        />
                      </td>
                    </tr>

                    {/* Row 3: Start Date + End Date */}
                    <tr className="border-b border-slate-300 dark:border-slate-800/80">
                      <td className="px-4 py-3 bg-slate-50 dark:bg-slate-900/60 font-bold border-r border-slate-300 dark:border-slate-800/80 text-slate-700 dark:text-slate-300">
                        Start Date*:
                      </td>
                      <td className="w-1/4 px-4 py-2 border-r border-slate-300 dark:border-slate-800/80">
                        <input
                          type="date"
                          required
                          value={newStart}
                          onChange={(e) => setNewStart(e.target.value)}
                          className="w-full bg-transparent border-none p-0 text-xs focus:outline-none text-slate-800 dark:text-slate-100 cursor-pointer"
                        />
                      </td>
                      <td className="w-1/4 px-4 py-3 bg-slate-50 dark:bg-slate-900/60 font-bold border-r border-slate-300 dark:border-slate-800/80 text-slate-700 dark:text-slate-300">
                        End Date*:
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="date"
                          required
                          value={newEnd}
                          onChange={(e) => setNewEnd(e.target.value)}
                          className="w-full bg-transparent border-none p-0 text-xs focus:outline-none text-slate-800 dark:text-slate-100 cursor-pointer"
                        />
                      </td>
                    </tr>

                    {/* Row 4: Lead Auditor */}
                    <tr>
                      <td className="px-4 py-3 bg-slate-50 dark:bg-slate-900/60 font-bold border-r border-slate-300 dark:border-slate-800/80 text-slate-700 dark:text-slate-300">
                        Lead Auditor:
                      </td>
                      <td colSpan={3} className="px-4 py-1.5">
                        <select
                          value={newLead}
                          onChange={(e) => setNewLead(e.target.value)}
                          className="w-full bg-transparent border-none p-0 text-xs focus:outline-none text-slate-800 dark:text-slate-100 cursor-pointer"
                        >
                          <option value="" className="bg-white dark:bg-slate-950">Select Lead Auditor...</option>
                          {leadAuditors.map((u) => (
                            <option key={u.id} value={u.id} className="bg-white dark:bg-slate-950">
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold rounded cursor-pointer text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#05375c] text-white hover:bg-[#074776] text-xs font-bold rounded cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" /> Create Audit Plan
                </button>
              </div>
            </form>
          </div>
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
                {canModify && <th className="px-6 py-4 text-center w-20">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredProjects.map((proj) => {
                let statusText = "Planning";
                let statusColor = "text-amber-500";
                
                if (proj.status === "RELEASED") {
                  statusText = "Released";
                  statusColor = "text-[#30b050]";
                } else if (proj.status === "SUBMITTED_FOR_APPROVAL") {
                  statusText = "Submitted for Approval";
                  statusColor = "text-blue-500";
                }

                return (
                  <tr 
                    key={proj.id}
                    onClick={() => setSelectedProjectId(proj.id === selectedProjectId ? "" : proj.id)}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors select-none cursor-pointer ${
                      proj.id === selectedProjectId ? "bg-slate-100/80 dark:bg-slate-800/50 font-medium" : ""
                    }`}
                  >
                    <td className="px-6 py-4 font-sans text-slate-800 dark:text-slate-200">
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
                    {(currentUser.role === "ADMIN" || isProjectMember(proj)) && (
                      <td className="px-6 py-4 text-center no-print">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(proj.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                          title="Delete Audit Plan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
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
                <div className="flex items-center gap-1.5 text-[15px] font-roboto text-400 font-bold">
                  <span>Audit Plan</span>
                  <span>&gt;</span>
                  <span className="text-slate-600 font-roboto dark:text-slate-300">{selectedProject.code}</span>
                </div>
                <input
                  type="text"
                  disabled={editStatus !== "PLANNING"}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={`text-lg md:text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100 bg-transparent border-b border-transparent focus:outline-none w-full pb-0.5 ${editStatus === "PLANNING" ? "hover:border-slate-300 focus:border-[#05375c]" : "cursor-not-allowed"}`}
                />
                
                {/* Meta details row under header */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-[10px] font-sans text-slate-400">
                  <span className="bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/50 px-2 py-0.5 rounded font-bold uppercase">
                    {editStatus === "PLANNING" ? "Planning" : editStatus === "SUBMITTED_FOR_APPROVAL" ? "Submitted for Approval" : editStatus === "RELEASED" ? "Released" : editStatus}
                  </span>
                  <span className="flex items-center gap-1 font-roboto">
                    <CalendarDays className="w-3.5 h-3.5 font-roboto" /> Created {selectedProject.startDate}
                  </span>
                  <span className="flex items-center gap-1 font-roboto">
                    <UserIcon className="w-3.5 h-3.5" /> Assigned to {users.find(u => u.id === editLead || u.name === editLead)?.name || "Unassigned"}
                  </span>
                  <span className="flex items-center gap-1 font-roboto">
                    <Activity className="w-3.5 h-3.5" /> Owner: Sarah Jenkins
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Execution: {editEnd}
                  </span>
                </div>
              </div>

              {/* Save feedback indicator */}
              {saveFeedback && (
                <div className="text-[10px] font-sans font-bold text-[#30b050] bg-green-500/10 dark:bg-green-500/5 border border-green-500/25 px-3 py-1.5 rounded animate-pulse shrink-0">
                  {saveFeedback}
                </div>
              )}

              {/* Action buttons (Header Right) */}
              <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0 no-print">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold rounded transition-colors cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5" /> Export PDF
                </button>

                {editStatus === "PLANNING" && (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveOnly}
                      className="flex items-center gap-1.5 px-3 py-2 border border-black-300 dark:border-blue-700 bg-black-50/50 dark:bg-white-900/10 hover:bg-blue-100/50 text-[#0066cc] text-xs font-bold rounded transition-colors cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" /> Save Plan
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitForApproval}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#0a1128] dark:bg-accent text-white dark:text-slate-950 hover:opacity-90 text-xs font-bold rounded transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" /> Submit for Approval
                    </button>
                  </>
                )}

                {editStatus === "SUBMITTED_FOR_APPROVAL" && (
                  <>
                    {canModify && (
                      <button
                        type="button"
                        onClick={handleReopenPlan}
                        className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Reopen Plan
                      </button>
                    )}
                    {(currentUser.role === "ADMIN" || currentUser.role === "LEAD_AUDITOR") ? (
                      <>
                        <button
                          type="button"
                          onClick={handleApprovePlan}
                          className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded transition-colors cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve Plan
                        </button>
                        <button
                          type="button"
                          onClick={handleRejectPlan}
                          className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded transition-colors cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject Plan
                        </button>
                      </>
                    ) : (
                      !canModify && (
                        <span className="text-xs font-sans font-bold text-blue-600 dark:text-sky-400 bg-blue-50 dark:bg-blue-950/40 px-3 py-2 rounded border border-blue-100 dark:border-blue-900/40">
                          Waiting for Approval (Locked)
                        </span>
                      )
                    )}
                  </>
                )}

                {editStatus === "RELEASED" && (
                  <span className="text-xs font-sans font-bold text-[#30b050] bg-green-500/10 px-3 py-2 rounded border border-green-500/25 font-sans">
                    Approved & Released (Locked)
                  </span>
                )}

                <button
                  type="button"
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

              {/* Quick Summary Panel at the Top */}
              <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg p-6 space-y-4 shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-150 dark:border-slate-800 pb-2">
                  <h3 className="text-xs font-roboto font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Plan Members
                  </h3>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                    Last edited by AI 2 hours ago
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Column 2: Lead & Auditors */}
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-sans font-bold uppercase text-slate-500">Lead Auditor</label>
                      <MultiSelect
                        selectedValues={editLead ? editLead.split(",").map(s => s.trim()).filter(Boolean) : []}
                        onChange={(values) => setEditLead(values.join(", "))}
                        disabled={isReadOnly}
                        options={users
                          .map(u => ({
                            value: u.name,
                            label: u.name,
                            subLabel: `${u.role.replace("_", " ")}${u.email ? ` • ${u.email}` : ""}`
                          }))}
                        placeholder="Select Lead Auditors..."
                      />
                    </div>

                    <div className="space-y-2 relative">
                      <label className="text-xs font-sans font-bold uppercase text-slate-500">Auditors</label>
                      <MultiSelect
                        selectedValues={editAuditorIds}
                        onChange={(values) => setEditAuditorIds(values)}
                        disabled={isReadOnly}
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
                      <label className="text-xs font-sans font-bold uppercase text-slate-500">Department PIC</label>
                      <MultiSelect
                        selectedValues={editDeptPicIds}
                        onChange={(values) => setEditDeptPicIds(values)}
                        disabled={isReadOnly}
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

                {/* Linked Items Section */}
                {selectedProject && (
                  <div className="pt-4 border-t border-slate-150 dark:border-slate-800 space-y-2.5">
                    <h4 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-850 dark:text-slate-205">
                      Linked Items
                    </h4>
                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 font-sans">
                      {/* Meetings */}
                      {(() => {
                        const meetings = selectedProject.executionSchedules?.filter(e => e.language === "meeting") || [];
                        if (meetings.length === 0) return null;
                        return meetings.map(m => (
                          <div key={m.id} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-sky-500 rounded-full shrink-0" />
                            <span>Open Meetings: </span>
                            <a 
                              href={`/meetings?id=${m.id}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-[#0066cc] hover:underline font-bold"
                            >
                              OM-{m.visitNumber} ({m.organization})
                            </a>
                          </div>
                        ));
                      })()}

                      {/* Schedules */}
                      {(() => {
                        const schedules = selectedProject.executionSchedules?.filter(e => e.language !== "meeting" && e.language !== "finding") || [];
                        if (schedules.length === 0) return null;
                        return schedules.map(s => (
                          <div key={s.id} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" />
                            <span>Execution schedule: </span>
                            <a 
                              href={`/schedule?id=${s.id}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-[#0066cc] hover:underline font-bold"
                            >
                              SCH-{s.visitNumber} ({s.organization})
                            </a>
                          </div>
                        ));
                      })()}

                      {/* Findings */}
                      {(() => {
                        const dbFindings = selectedProject.findings || [];
                        const scheduleFindings = selectedProject.executionSchedules?.filter(e => e.language === "finding") || [];
                        if (dbFindings.length === 0 && scheduleFindings.length === 0) return null;
                        
                        return (
                          <>
                            {dbFindings.map(f => (
                              <div key={f.id} className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0" />
                                <span>Audit Findings: </span>
                                <a 
                                  href={`/findings?id=${f.id}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-[#0066cc] hover:underline font-bold"
                                >
                                  {f.title} ({f.status})
                                </a>
                              </div>
                            ))}
                            {scheduleFindings.map(sf => (
                              <div key={sf.id} className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0" />
                                <span>Audit Findings: </span>
                                <a 
                                  href={`/findings?id=${sf.id}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-[#0066cc] hover:underline font-bold"
                                >
                                  FD-{sf.visitNumber} ({sf.organization})
                                </a>
                              </div>
                            ))}
                          </>
                        );
                      })()}

                      {/* Fallback if nothing is linked */}
                      {(!selectedProject.executionSchedules?.length && !selectedProject.findings?.length) && (
                        <div className="text-slate-400 italic text-[11px] font-sans">
                          No linked meetings, schedules, or findings for this Audit Plan.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Panel 1: Objectives & Scope (Full Width) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4 shadow-sm">
                <h3 className="text-md font-roboto font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-150 dark:border-slate-800 pb-2">
                  I. Objectives & Scope
                </h3>

                <div className="space-y-1.5">
                  <label className="text-[14px] font-sans font-bold text-slate-750 dark:text-slate-355 uppercase">1.1 Objectives</label>
                  <RichEditor value={editObjectives} onChange={setEditObjectives} editable={!isReadOnly} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[14px] font-sans font-bold text-slate-750 dark:text-slate-355 uppercase">1.2 Audit Scope</label>
                  <RichEditor value={editScope} onChange={setEditScope} editable={!isReadOnly} />
                </div>
              </div>

              {/* Panel 2: Risk Mapping & Classification */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-150 dark:border-slate-800 pb-2">
                  <h3 className="text-[20px] text-xs font-sans font-bold uppercase tracking-wider text-slate-1000 border-b border-slate-150 dark:border-slate-800 pb-2">
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
                    <label className="text-[15px] font-sans font-bold text-slate-800 uppercase">Risk meets company process</label>
                    <RichEditor value={editRiskProcess} onChange={setEditRiskProcess} editable={!isReadOnly} />
                  </div>
                  <div className="space-y-1.5">
                    <label className=" text-[15px] font-sans font-bold text-slate-800 uppercase">Classify risk base on potential impact</label>
                    <RichEditor value={editRiskClass} onChange={setEditRiskClass} editable={!isReadOnly} />
                  </div>
                </div>
              </div>

              {/* Panel 3: Operational Excellence */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-5">
                <h3 className="text-[20px] text-xs font-sans font-bold uppercase tracking-wider text-slate-1000 border-b border-slate-150 dark:border-slate-800 pb-2">
                  III. Operational excellence technique/approach
                </h3>
                
                <div className="space-y-1.5">
                  <label className="text-[15px] font-sans font-bold text-slate-800 uppercase">Obtain data error to fieldwork mapping</label>
                  <RichEditor value={editOpEx} onChange={setEditOpEx} editable={!isReadOnly} />
                </div>

                <div className="pt-4 border-t border-slate-150 dark:border-slate-800/80 space-y-1">
                  <h4 className="text-[20px] text-xs font-sans font-bold uppercase tracking-wider text-slate-1000 border-b border-slate-150 dark:border-slate-800 pb-2">IV. Obtain data error to fieldwork parameters</h4>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[15px] font-sans font-bold text-slate-800 uppercase">Type of data to request for information</label>
                      <RichEditor value={editDataRequestType} onChange={setEditDataRequestType} editable={!isReadOnly} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[15px] font-sans font-bold text-slate-800 uppercase">Which part need to focus on</label>
                      <RichEditor value={editFocusArea} onChange={setEditFocusArea} editable={!isReadOnly} />
                    </div>
                  </div>
                </div>
              </div>
              {/* Panel 5: Operational Excellence Timeline */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-6">
                <h3 className="text-[20px] text-xs font-sans font-bold uppercase tracking-wider text-slate-1000 border-b border-slate-150 dark:border-slate-800 pb-2">
                  V. Operational Excellence timeline
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Interactive Inputs */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-sans font-bold text-slate-700 dark:text-slate-300 uppercase">Planning Presentation Date</label>
                      <input 
                        type="date" 
                        value={editTimelinePresDate}
                        disabled={isReadOnly}
                        onChange={(e) => setEditTimelinePresDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[12px] font-sans font-bold text-slate-700 dark:text-slate-300 uppercase">Notification to Department in charge</label>
                      <input 
                        type="date" 
                        value={editTimelineNotificationDate}
                        disabled={isReadOnly}
                        onChange={(e) => setEditTimelineNotificationDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-sans font-bold text-slate-700 dark:text-slate-300 uppercase">Field Work Start</label>
                        <input 
                          type="date" 
                          value={editTimelineFieldWorkStart}
                          disabled={isReadOnly}
                          onChange={(e) => setEditTimelineFieldWorkStart(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-sans font-bold text-slate-700 dark:text-slate-300 uppercase">Field Work End</label>
                        <input 
                          type="date" 
                          value={editTimelineFieldWorkEnd}
                          disabled={isReadOnly}
                          onChange={(e) => setEditTimelineFieldWorkEnd(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-sans font-bold text-slate-700 dark:text-slate-300 uppercase">Finding/Observation Offset (Days)</label>
                        <input 
                          type="number" 
                          value={editTimelineFindingReportOffset}
                          disabled={isReadOnly}
                          onChange={(e) => setEditTimelineFindingReportOffset(parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-sans font-bold text-slate-700 dark:text-slate-300 uppercase">Final Report Offset (Days)</label>
                        <input 
                          type="number" 
                          value={editTimelineFinalReportOffset}
                          disabled={isReadOnly}
                          onChange={(e) => setEditTimelineFinalReportOffset(parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Visual Timeline Stepper */}
                  <div className="bg-slate-50 dark:bg-slate-950 rounded-lg p-5 border border-slate-100 dark:border-slate-900 space-y-4">
                    <h4 className="text-[11px] font-sans font-bold uppercase tracking-wider text-slate-400">Timeline Milestone Preview</h4>
                    
                    <div className="relative pl-6 border-l-2 border-blue-500/30 dark:border-blue-900/40 space-y-6">
                      {/* Milestone 1 */}
                      <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 border-blue-500 bg-white dark:bg-slate-950 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        </div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Planning Presentation Date</div>
                        <div className="text-[11px] font-sans text-slate-500">{formatDateString(editTimelinePresDate)}</div>
                      </div>

                      {/* Milestone 2 */}
                      <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 border-blue-500 bg-white dark:bg-slate-950 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        </div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Notification to Department in charge</div>
                        <div className="text-[11px] font-sans text-slate-500">{formatDateString(editTimelineNotificationDate)}</div>
                      </div>

                      {/* Milestone 3 */}
                      <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 border-blue-500 bg-white dark:bg-slate-950 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        </div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Field Work Duration</div>
                        <div className="text-[11px] font-sans text-slate-500">
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
                        <div className="text-[11px] font-sans text-slate-500">
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
                        <div className="text-[11px] font-sans text-slate-500">
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
                <h3 className="text-[20px] text-xs font-sans font-bold uppercase tracking-wider text-slate-1000 border-b border-slate-150 dark:border-slate-800 pb-2">
                  VI.Expected Outcomes
                </h3>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[15px] font-sans font-bold text-slate-800 uppercase">Expected Outcomes</label>
                    <RichEditor value={editFieldwork} onChange={setEditFieldwork} editable={!isReadOnly} />
                  </div>
                </div>
              </div>
              {/* Panel 7: Sign-off & Approvals */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-6">
                <h3 className="text-[20px] text-xs font-sans font-bold uppercase tracking-wider text-slate-1000 border-b border-slate-150 dark:border-slate-800 pb-2">
                  VII. Scoping Approvals & Sign-off
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Prepared By Section */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-lg border border-slate-100 dark:border-slate-855 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                      <h4 className="text-[12px] font-sans font-bold text-slate-700 dark:text-slate-300 uppercase">Prepared By</h4>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-sans font-bold text-slate-450 uppercase block mb-1">Name</label>
                        <input 
                          type="text" 
                          value={editPreparedByName}
                          disabled={isReadOnly}
                          onChange={(e) => setEditPreparedByName(e.target.value)}
                          placeholder="e.g. Sarah Jenkins"
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-sans font-bold text-slate-450 uppercase block mb-1">Position</label>
                        <input 
                          type="text" 
                          value={editPreparedByTitle}
                          disabled={isReadOnly}
                          onChange={(e) => setEditPreparedByTitle(e.target.value)}
                          placeholder="e.g. Lead Auditor"
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-sans font-bold text-slate-450 uppercase block mb-1">Date</label>
                        <input 
                          type="date" 
                          value={editPreparedDate}
                          disabled={isReadOnly}
                          onChange={(e) => setEditPreparedDate(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Approved By Section */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-lg border border-slate-100 dark:border-slate-855 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#00cc66]"></div>
                      <h4 className="text-[12px] font-sans font-bold text-slate-700 dark:text-slate-300 uppercase">Approved By</h4>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-sans font-bold text-slate-450 uppercase block mb-1">Name</label>
                        <input 
                          type="text" 
                          value={editApprovedByName}
                          disabled={isReadOnly}
                          onChange={(e) => setEditApprovedByName(e.target.value)}
                          placeholder="e.g. Alice Auditee"
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#00cc66]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-sans font-bold text-slate-450 uppercase block mb-1">Position</label>
                        <input 
                          type="text" 
                          value={editApprovedByTitle}
                          disabled={isReadOnly}
                          onChange={(e) => setEditApprovedByTitle(e.target.value)}
                          placeholder="e.g. Compliance Director"
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#00cc66]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-sans font-bold text-slate-450 uppercase block mb-1">Date</label>
                        <input 
                          type="date" 
                          value={editApprovedDate}
                          disabled={isReadOnly}
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
                  <h3 className="flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-wider text-slate-400">
                    <FileText className="w-4 h-4" /> Plan Attachments & Files
                  </h3>
                  {!isReadOnly && (
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
                  )}
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
                              <div className="text-[9px] font-sans text-slate-400">
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
                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={() => handleDeleteFile(file.id)}
                                className="p-1 text-slate-500 hover:text-red-500 cursor-pointer"
                                title="Remove Attachment"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Page Footer */}
            <div className="px-8 py-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-sans text-slate-400 shrink-0">
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
