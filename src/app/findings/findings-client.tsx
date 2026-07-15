"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Building, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  FileDown, 
  X, 
  Calendar, 
  Clock, 
  Info,
  ChevronRight,
  BookOpen,
  AlertTriangle
} from "lucide-react";
import { 
  User, 
  AuditProject, 
  ExecutionSchedule as FindingReport, 
  ScheduleRow as FindingRow 
} from "@/lib/mockData";
import { 
  createExecutionScheduleAction as createFindingReportAction, 
  updateExecutionScheduleAction as updateFindingReportAction, 
  deleteExecutionScheduleAction as deleteFindingReportAction,
  getExecutionSchedulesAction as getFindingReportsAction
} from "@/app/actions";
import { RBAC } from "@/lib/auth";
import ActionToolbar from "@/components/ui/action-toolbar";
import RichEditor from "@/components/ui/rich-editor";
import MultiSelect from "@/components/ui/multi-select";

// Helper to format date strings for display
const formatDateString = (dateStr: string) => {
  if (!dateStr) return "Date not selected";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    try {
      const parts = dateStr.split('-');
      const year = parts[0];
      const monthIndex = parseInt(parts[1]) - 1;
      const day = parts[2];
      const date = new Date(parseInt(year), monthIndex, parseInt(day));
      return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return dateStr;
    }
  }
  return dateStr;
};

// Helper to check if an HTML string is empty or contains only whitespace/empty tags
const isHtmlEmpty = (html?: string) => {
  if (!html) return true;
  const clean = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim();
  return clean === "";
};

// Helpers to parse and format HTML5 time picker values
const parseTimeRange = (timeStr: string) => {
  if (!timeStr) return { from: "09:00", to: "10:00" };
  const parts = timeStr.split(/[-–]/);
  const fromPart = parts[0]?.trim() || "09:00";
  const toPart = parts[1]?.trim() || "10:00";

  const to24h = (s: string) => {
    const clean = s.toLowerCase().replace(/\s+/g, "");
    const match = clean.match(/^(\d{1,2}):(\d{2})(am|pm)?$/);
    if (!match) {
      const numbersOnly = clean.replace(/[^0-9:]/g, "");
      if (numbersOnly.includes(":")) {
        const [h, m] = numbersOnly.split(":");
        return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
      }
      return "09:00";
    }
    let hours = parseInt(match[1]);
    const minutes = match[2];
    const ampm = match[3];
    if (ampm === "pm" && hours < 12) hours += 12;
    if (ampm === "am" && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, "0")}:${minutes}`;
  };

  return { from: to24h(fromPart), to: to24h(toPart) };
};

const formatTimeRange = (from: string, to: string) => {
  const to12h = (t: string) => {
    if (!t) return "";
    const [h, m] = t.split(":");
    let hours = parseInt(h);
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${hours}:${m} ${ampm}`;
  };
  return `${to12h(from)} - ${to12h(to)}`;
};

interface FindingsClientProps {
  initialSchedules: FindingReport[];
  projects: AuditProject[];
  users: User[];
  currentUser: User;
}

export default function FindingsClient({ 
  initialSchedules, 
  projects, 
  users, 
  currentUser 
}: FindingsClientProps) {
  const [schedules, setSchedules] = useState<FindingReport[]>(initialSchedules.filter(s => s.language === "finding"));
  
  // Search/Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("ALL");

  // Selection & Modal
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  
  // Form fields
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [organization, setOrganization] = useState("");
  const [address, setAddress] = useState("HB-HQ");
  const [visitNumber, setVisitNumber] = useState("NCN #001/26");
  const [actualVisitDate, setActualVisitDate] = useState("");
  const [auditPeriod, setAuditPeriod] = useState("");
  const [leadExecution, setLeadExecution] = useState("");
  const [teamMembers, setTeamMembers] = useState("");
  const [additionalAttendees, setAdditionalAttendees] = useState("");
  const [standards, setStandards] = useState("Operational and Compliance Gaps in Sales Operation Execution");
  const [language, setLanguage] = useState("finding"); // Hidden type flag
  const [objectives, setObjectives] = useState("");
  const [scope, setScope] = useState("");
  const [rows, setRows] = useState<FindingRow[]>([]);
  // Active row index for card editing
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  // Draft state for unsaved edits in configuring slot
  const [draftRow, setDraftRow] = useState<FindingRow | null>(null);
  // Expand/collapse parameters panel in Configure Slot popup
  const [isParamsExpanded, setIsParamsExpanded] = useState(true);

  // Feedback notifier
  const [feedback, setFeedback] = useState<string | null>(null);

  // Custom dialog alert states
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm,
    });
  };

  // Convert teamMembers string to array for MultiSelect component
  const teamMembersArray = teamMembers
    ? teamMembers.split(",").map(name => name.trim()).filter(Boolean)
    : [];

  // Convert leadExecution string to array for MultiSelect component
  const leadExecutionArray = leadExecution
    ? leadExecution.split(",").map(name => name.trim()).filter(Boolean)
    : [];

  // Convert additionalAttendees string to array for MultiSelect component
  const additionalAttendeesArray = additionalAttendees
    ? additionalAttendees.split(",").map(name => name.trim()).filter(Boolean)
    : [];

  // Options derived from users in system
  const userOptions = users.map(u => ({
    value: u.name,
    label: u.name,
    subLabel: `${u.role.replace("_", " ")}${u.email ? ` • ${u.email}` : ""}`
  }));

  const canManage = currentUser.role !== "AUDITEE";

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Prepopulate scoping fields when project is selected in Create mode
  const handleProjectSelect = (projId: string) => {
    setSelectedProjectId(projId);
    if (!projId) return;

    const proj = projects.find(p => p.id === projId);
    if (!proj) return;

    const leadUser = users.find(u => u.id === proj.leadAuditorId);
    const orgVal = leadUser?.departmentName ? `${leadUser.departmentName} Department` : "Sales Distribution Function";
    setOrganization(orgVal);

    setActualVisitDate(`${proj.startDate} to ${proj.endDate}`);
    setAuditPeriod("Compliance Gap Assessment");

    setLeadExecution(leadUser?.name || "EL Thany");

    const auditorNames = users
      .filter(u => proj.auditorIds?.includes(u.id))
      .map(u => u.name)
      .join(", ") || "Mao Sokpisith";
    setTeamMembers(auditorNames);

    const picNames = users
      .filter(u => proj.deptPicIds?.split(",").includes(u.id))
      .map(u => u.name)
      .join(", ") || "By Vireak";
    setAdditionalAttendees(picNames);

    setObjectives(proj.objectives || "");
    setScope(proj.scope || "");

    setRows([
      {
        date: "NCN #001/26",
        time: "CRITICAL",
        activity: "<strong>Noncompliance with outlet visit protocol (184/1640 outlets)</strong>\n\n- Detailed observed data indicates distributed sales teams failed to synchronize GPS node coordinates during physical customer visits.",
        conductBy: leadUser?.name || "EL Thany",
        pIncharge: "<strong>Corrective action:</strong> Implement real-time geo-fencing audits.\n\n<strong>Completed Corrective Action Date:</strong> 22 April 2026",
        implication: "<p>Risk of undetected sales representative absences and inaccurate visit verification reports.</p>",
        recommendation: "<p>Establish automatic alert system in core CRM for visits outside of designated geofence ranges.</p>"
      },
      {
        date: "NCN #002/26",
        time: "HIGH",
        activity: "<strong>NCP Redemption related complaints to Distributor (Cash 139 & Can 163/1640 outlets)</strong>\n\n- Promotion redemptions processed without signature verification matches.",
        conductBy: leadUser?.name || "EL Thany",
        pIncharge: "<strong>Corrective action:</strong> Transition redemption records to dynamic QR validations.\n\n<strong>Completed Corrective Action Date:</strong> 30 May 2026",
        implication: "<p>Distributors might claim unauthorized promotion redemptions resulting in financial leakages.</p>",
        recommendation: "<p>Enforce mandatory OTP verification sent to customer phone before distributor can process promo redemptions.</p>"
      }
    ]);
  };

  const openCreateModal = () => {
    setModalMode("create");
    setSelectedProjectId("");
    setOrganization("");
    setAddress("HB-HQ");
    setVisitNumber("NCN #001/26");
    setActualVisitDate("");
    setAuditPeriod("");
    setLeadExecution("");
    setTeamMembers("");
    setAdditionalAttendees("");
    setStandards("Operational and Compliance Gaps in Sales Operation Execution");
    setLanguage("finding");
    setObjectives("");
    setScope("");
    setRows([]);
    setIsModalOpen(true);
  };

  const openEditModal = (sched: FindingReport) => {
    setModalMode("edit");
    setSelectedProjectId(sched.projectId);
    setOrganization(sched.organization);
    setAddress(sched.address);
    setVisitNumber(sched.visitNumber);
    setActualVisitDate(sched.actualVisitDate);
    setAuditPeriod(sched.auditPeriod);
    setLeadExecution(sched.leadExecution);
    setTeamMembers(sched.teamMembers);
    setAdditionalAttendees(sched.additionalAttendees);
    setStandards(sched.standards);
    setLanguage(sched.language || "finding");
    setObjectives(sched.objectives);
    setScope(sched.scope);
    
    try {
      setRows(JSON.parse(sched.scheduleRows));
    } catch {
      setRows([]);
    }
    
    setSelectedScheduleId(sched.id);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const idParam = params.get("id");
      if (idParam) {
        const sched = schedules.find(s => s.id === idParam);
        if (sched) {
          setSelectedScheduleId(sched.id);
          setTimeout(() => {
            openEditModal(sched);
          }, 100);
        }
      }
    }
  }, [schedules]);

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !organization || !actualVisitDate) {
      alert("Please fill in the required fields.");
      return;
    }

    const payload = {
      projectId: selectedProjectId,
      organization,
      address,
      visitNumber,
      actualVisitDate,
      auditPeriod,
      leadExecution,
      teamMembers,
      additionalAttendees,
      standards,
      language: "finding", // Enforce type flag
      objectives,
      scope,
      scheduleRows: JSON.stringify(rows)
    };

    try {
      if (modalMode === "create") {
        const result = await createFindingReportAction(payload);
        if (result) {
          showFeedback("Audit findings report generated successfully.");
          setIsModalOpen(false);
          const fresh = await getFindingReportsAction();
          setSchedules(fresh.filter((s: any) => s.language === "finding"));
        }
      } else {
        if (!selectedScheduleId) return;
        const result = await updateFindingReportAction(selectedScheduleId, payload);
        if (result) {
          showFeedback("Audit findings report updated.");
          setIsModalOpen(false);
          const fresh = await getFindingReportsAction();
          setSchedules(fresh.filter((s: any) => s.language === "finding"));
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(`Save failed: ${err.message || err.toString()}`);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!selectedScheduleId) return;
    const s = schedules.find(x => x.id === selectedScheduleId);
    if (!s) return;

    showConfirm(
      "Delete Audit Findings Report",
      `Are you sure you want to delete the findings report for "${s.projectName}"? This action cannot be undone.`,
      async () => {
        try {
          const success = await deleteFindingReportAction(selectedScheduleId);
          if (success) {
            showFeedback("Report removed from ledger.");
            setSelectedScheduleId(null);
            const fresh = await getFindingReportsAction();
            setSchedules(fresh.filter((s: any) => s.language === "finding"));
          }
        } catch (err: any) {
          console.error(err);
          alert(`Delete error: ${err.message || err.toString()}`);
        }
      }
    );
  };

  // Interactive Row Editor Handlers
  const startEditingRow = (index: number) => {
    setActiveRowIndex(index);
    const row = { ...rows[index] };
    
    // If structured fields do not exist but pIncharge does, parse them
    if (!row.correctiveActionRemarks && !row.correctiveActionDate && row.pIncharge) {
      if (row.pIncharge.includes("Corrective action:") || row.pIncharge.includes("Corrective Action")) {
        const parts = row.pIncharge.split(/Completed Corrective Action Date:|Corrective Action Date:/i);
        const remarksHtml = parts[0]?.replace(/<strong>Corrective action:<\/strong>/i, '')
                                   .replace(/Corrective action:/i, '')
                                   .trim() || "";
        row.correctiveActionRemarks = remarksHtml;
        if (parts[1]) {
          const cleanHtml = (html: string) => {
            return html
              .replace(/<br\s*\/?>/gi, '\n')
              .replace(/<\/p>/gi, '\n')
              .replace(/<[^>]*>/g, '')
              .trim();
          };
          const dateStr = cleanHtml(parts[1]);
          const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
          const shortMonths = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
          const dateParts = dateStr.toLowerCase().split(/\s+/);
          if (dateParts.length === 3) {
            const day = dateParts[0].replace(/[^0-9]/g, "").padStart(2, '0');
            const mIndex = months.indexOf(dateParts[1]) !== -1 ? months.indexOf(dateParts[1]) : shortMonths.indexOf(dateParts[1]);
            const year = dateParts[2].replace(/[^0-9]/g, "");
            if (mIndex !== -1 && day && year) {
              row.correctiveActionDate = `${year}-${(mIndex + 1).toString().padStart(2, '0')}-${day}`;
            }
          }
        }
      } else {
        row.correctiveActionRemarks = row.pIncharge;
      }
    }
    
    setDraftRow(row);
  };

  const startCreatingRow = () => {
    setActiveRowIndex(-1);
    setDraftRow({
      date: "",
      time: "",
      activity: "",
      conductBy: "",
      pIncharge: "",
      implication: "",
      recommendation: "",
      correctiveActionDate: "",
      correctiveActionRemarks: "",
      correctiveFinalDate: "",
      correctiveFinalRemarks: ""
    });
  };

  const cancelRowEdit = () => {
    setActiveRowIndex(null);
    setDraftRow(null);
  };

  const saveRowEdit = () => {
    if (!draftRow) return;
    
    // Compile structured fields into pIncharge HTML for compatibility
    let compiledHtml = "";
    if (draftRow.correctiveActionDate || !isHtmlEmpty(draftRow.correctiveActionRemarks)) {
      compiledHtml += `<strong>Corrective action:</strong> ${draftRow.correctiveActionRemarks || ""}`;
      if (draftRow.correctiveActionDate) {
        compiledHtml += `<br/><br/><strong>Completed Corrective Action Date:</strong> ${formatDateString(draftRow.correctiveActionDate)}`;
      }
    }
    if (draftRow.correctiveFinalDate || !isHtmlEmpty(draftRow.correctiveFinalRemarks)) {
      if (compiledHtml) compiledHtml += "<br/><br/>";
      compiledHtml += `<strong>Final Verification Remarks:</strong> ${draftRow.correctiveFinalRemarks || ""}`;
      if (draftRow.correctiveFinalDate) {
        compiledHtml += `<br/><br/><strong>Completed Final Verification Date:</strong> ${formatDateString(draftRow.correctiveFinalDate)}`;
      }
    }
    
    const updatedDraft = {
      ...draftRow,
      pIncharge: compiledHtml || draftRow.pIncharge
    };
    
    if (activeRowIndex === -1) {
      // Append new row
      setRows([...rows, updatedDraft]);
    } else if (activeRowIndex !== null) {
      // Update existing
      const updated = [...rows];
      updated[activeRowIndex] = updatedDraft;
      setRows(updated);
    }
    
    setActiveRowIndex(null);
    setDraftRow(null);
  };

  const deleteRowItem = (index: number) => {
    showConfirm(
      "Delete Line Item",
      "Are you sure you want to remove this finding line item from the report?",
      () => {
        setRows(rows.filter((_, idx) => idx !== index));
      }
    );
  };

  const moveRowUp = (index: number) => {
    if (index === 0) return;
    const updated = [...rows];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setRows(updated);
  };

  const moveRowDown = (index: number) => {
    if (index === rows.length - 1) return;
    const updated = [...rows];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setRows(updated);
  };

  // Filtered schedules for rendering in list
  const filteredSchedules = schedules.filter(s => {
    const matchesSearch = s.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.organization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.standards?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = projectFilter === "ALL" || s.projectId === projectFilter;
    return matchesSearch && matchesProject;
  });

  const projectFilterOptions = projects.map(p => ({
    label: p.code,
    value: p.id
  }));

  const activeSchedule = schedules.find(s => s.id === selectedScheduleId);

  return (
    <div className="space-y-6">
      
      {/* Dynamic Feedback Popup Alert */}
      {feedback && (
        <div className="fixed top-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded shadow-lg z-[60] flex items-center gap-2 animate-bounce">
          <Save className="w-4 h-4" />
          <span className="text-xs font-bold font-mono">{feedback}</span>
        </div>
      )}

      {/* Confirmation Dialog Box */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-[100] animate-fade-in no-print">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-sm p-6 space-y-4 shadow-xl text-left">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">{confirmDialog.title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded text-xs hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }}
                className="px-3 py-1.5 bg-red-600 text-white rounded text-xs hover:bg-red-700 font-semibold cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Title */}
      <div className="flex justify-between items-center no-print">
        <div className="space-y-0.5">
          <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Audit Findings</h1>
          <p className="text-xs text-muted-foreground">Outline nonconformities, observations, and corrective actions from departments.</p>
        </div>
      </div>

      {/* Main layout table ledger */}
      <div className="space-y-6 no-print">
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
          
          {/* ActionToolbar */}
          <ActionToolbar
            onCreate={canManage ? openCreateModal : undefined}
            onEdit={canManage && selectedScheduleId && activeSchedule ? () => openEditModal(activeSchedule) : undefined}
            onDelete={canManage && selectedScheduleId ? handleDeleteSchedule : undefined}
            onRefresh={() => {
              setSearchQuery("");
              setProjectFilter("ALL");
              setSelectedScheduleId(null);
            }}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchPlaceholder="Search findings..."
            filterLabel="Project"
            filterValue={projectFilter}
            setFilterValue={setProjectFilter}
            filterOptions={projectFilterOptions}
            activeFilterCountLabel={projectFilter === "ALL" ? "ALL" : "FILTERED"}
          />

          {/* List Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-sans font-bold">
                <tr>
                  <th className="px-6 py-4">Audit Plan Code</th>
                  <th className="px-6 py-4">Project Name</th>
                  <th className="px-6 py-4">Organization</th>
                  <th className="px-6 py-4">Finding Date</th>
                  <th className="px-6 py-4">Lead Auditor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">
                      No findings reports matched filters or none have been created. Click "+" above to create one.
                    </td>
                  </tr>
                ) : (
                  filteredSchedules.map((s) => (
                    <tr 
                      key={s.id} 
                      onClick={() => setSelectedScheduleId(s.id === selectedScheduleId ? null : s.id)}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors select-none cursor-pointer ${
                        s.id === selectedScheduleId ? "bg-slate-100/80 dark:bg-slate-800/50 font-medium" : ""
                      }`}
                    >
                      <td className="px-6 py-4.5 font-mono text-slate-700 dark:text-slate-300">
                        {s.projectCode}
                      </td>
                      <td 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedScheduleId(s.id);
                          openEditModal(s);
                        }}
                        className="px-6 py-4.5 text-[#0066cc] font-medium hover:underline cursor-pointer"
                      >
                        {s.projectName}
                      </td>
                      <td className="px-6 py-4.5 text-slate-600 dark:text-slate-400">
                        {s.organization}
                      </td>
                      <td className="px-6 py-4.5 text-slate-600 dark:text-slate-400">
                        {s.actualVisitDate}
                      </td>
                      <td className="px-6 py-4.5 text-slate-700 dark:text-slate-300">
                        {s.leadExecution}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Audit Findings Report Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 overflow-y-auto p-4 no-print animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg w-full max-w-6xl shadow-2xl flex flex-col max-h-[94vh] animate-scale-up">
            
            {/* Modal Header */}
            <div className="px-8 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900 rounded-t-lg shrink-0">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Ledger Configuration</span>
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {modalMode === "create" ? "New Audit Findings Report" : `Edit Findings Report - ${projects.find(p => p.id === selectedProjectId)?.code}`}
                </h2>
              </div>
              <div className="flex gap-2">
                {modalMode === "edit" && canManage && (
                  <button
                    type="button"
                    onClick={handleDeleteSchedule}
                    className="flex items-center gap-1.5 px-3 py-2 border border-red-200 dark:border-red-900/30 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold rounded cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Report
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold rounded cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5" /> Export PDF
                </button>
                <button
                  type="button"
                  onClick={handleSaveSchedule}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#05375c] text-white hover:bg-[#074776] text-xs font-bold rounded cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" /> Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleSaveSchedule} className="p-8 space-y-8 overflow-y-auto max-h-[86vh]">
              
              {/* Select Project Plan dropdown (only in create mode) */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-850 space-y-3 no-print">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Info className="w-4 h-4 text-[#0066cc]" />
                  <span>Choose an Audit Plan to extract scoping details and pre-populate findings fields.</span>
                </div>
                {modalMode === "create" ? (
                  <select
                    required
                    value={selectedProjectId}
                    onChange={(e) => handleProjectSelect(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-md px-3 py-2 text-xs focus:outline-none cursor-pointer text-slate-800 dark:text-slate-200"
                  >
                    <option value="">Choose Audit Plan...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name} ({p.status})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                    Linked Plan: {projects.find(p => p.id === selectedProjectId)?.code} - {projects.find(p => p.id === selectedProjectId)?.name}
                  </div>
                )}
              </div>

              {/* Document Summary Info Grid matching the user's blue rounded border 2-column table design */}
              <div className="space-y-4">
                <div className="border border-[#0066cc] rounded-lg relative z-30">
                  <table className="w-full border-collapse text-xs">
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {/* Row 1: Organization */}
                      <tr className="align-middle">
                        <td className="w-1/4 px-6 py-4 bg-slate-50 dark:bg-slate-900/60 font-bold border-r border-[#0066cc]/40 text-slate-700 dark:text-slate-300">
                          Organization
                        </td>
                        <td className="px-6 py-3">
                          <input 
                            type="text" 
                            required
                            value={organization}
                            onChange={(e) => setOrganization(e.target.value)}
                            placeholder="Sales Distribution Function"
                            className="w-full bg-transparent border-none p-0 text-xs focus:outline-none font-bold text-slate-800 dark:text-slate-100"
                          />
                        </td>
                      </tr>

                      {/* Row 2: NCN */}
                      <tr className="align-middle">
                        <td className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 font-bold border-r border-[#0066cc]/40 text-slate-700 dark:text-slate-300">
                          NCN
                        </td>
                        <td className="px-6 py-3">
                          <input 
                            type="text" 
                            value={visitNumber}
                            onChange={(e) => setVisitNumber(e.target.value)}
                            placeholder="NCN #001/26"
                            className="w-full bg-transparent border-none p-0 text-xs focus:outline-none text-slate-800 dark:text-slate-100"
                          />
                        </td>
                      </tr>

                      {/* Row 3: Execution Date */}
                      <tr className="align-middle">
                        <td className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 font-bold border-r border-[#0066cc]/40 text-slate-700 dark:text-slate-300">
                          Execution Date
                        </td>
                        <td className="px-6 py-3">
                          <input 
                            type="text" 
                            required
                            value={actualVisitDate}
                            onChange={(e) => setActualVisitDate(e.target.value)}
                            placeholder="e.g. 22 April 2026"
                            className="w-full bg-transparent border-none p-0 text-xs focus:outline-none font-bold text-slate-800 dark:text-slate-100"
                          />
                        </td>
                      </tr>

                      {/* Row 4: Examiner */}
                      <tr className="align-middle relative z-30">
                        <td className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 font-bold border-r border-[#0066cc]/40 text-slate-700 dark:text-slate-300">
                          Examiner
                        </td>
                        <td className="px-6 py-2.5">
                          <MultiSelect
                            selectedValues={leadExecutionArray}
                            onChange={(values) => setLeadExecution(values.join(", "))}
                            options={userOptions}
                            placeholder="Select lead auditors..."
                          />
                        </td>
                      </tr>

                      {/* Row 5: Assistant */}
                      <tr className="align-middle relative z-20">
                        <td className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 font-bold border-r border-[#0066cc]/40 text-slate-700 dark:text-slate-300">
                          Assistant
                        </td>
                        <td className="px-6 py-2.5">
                          <MultiSelect
                            selectedValues={teamMembersArray}
                            onChange={(values) => setTeamMembers(values.join(", "))}
                            options={userOptions}
                            placeholder="Select assistant auditors..."
                          />
                        </td>
                      </tr>

                      {/* Row 6: Reviewee */}
                      <tr className="align-middle relative z-10">
                        <td className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 font-bold border-r border-[#0066cc]/40 text-slate-700 dark:text-slate-300">
                          Reviewee
                        </td>
                        <td className="px-6 py-2.5">
                          <MultiSelect
                            selectedValues={additionalAttendeesArray}
                            onChange={(values) => setAdditionalAttendees(values.join(", "))}
                            options={userOptions}
                            placeholder="Select department reviewees..."
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Collapsible Scoping details preview block */}
              <div className="bg-slate-50 dark:bg-slate-900/40 p-4 border border-slate-200 dark:border-slate-800 rounded-lg no-print">
                <button
                  type="button"
                  onClick={() => setIsParamsExpanded(!isParamsExpanded)}
                  className="flex items-center justify-between w-full font-bold text-xs text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-none"
                >
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-[#0066cc]" />
                    <span>Scoping Plan details extracted from linked plan</span>
                  </span>
                  <span className="text-[10px] text-[#0066cc] font-semibold hover:underline">
                    {isParamsExpanded ? "Collapse Details" : "Expand Details"}
                  </span>
                </button>

                {isParamsExpanded && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/80 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Objectives:</span>
                      <div 
                        className="prose dark:prose-invert text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-850"
                        dangerouslySetInnerHTML={{ __html: objectives || "<p className='italic text-slate-400'>No objectives specified.</p>" }}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Scope Boundaries:</span>
                      <div 
                        className="prose dark:prose-invert text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-855"
                        dangerouslySetInnerHTML={{ __html: scope || "<p className='italic text-slate-400'>No scope boundaries defined.</p>" }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Finding Rows Builder */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Finding & Nonconformity Line Items
                  </h3>
                  {canManage && activeRowIndex === null && (
                    <button
                      type="button"
                      onClick={startCreatingRow}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#0066cc] text-white hover:bg-[#004499] text-[10px] font-bold rounded cursor-pointer transition-colors shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Finding Line
                    </button>
                  )}
                </div>
                {activeRowIndex !== null && draftRow && (
                  <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/85 flex justify-center items-center z-[60] p-4 animate-fade-in no-print">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-4xl md:max-w-5xl h-[90vh] max-h-[850px] rounded-lg shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-slide-up">
                      
                      {/* Modal Header */}
                      <div className="px-6 py-4.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                        <div>
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[9px] font-mono font-bold text-slate-555 dark:text-slate-400">
                            ROW #{activeRowIndex === -1 ? rows.length + 1 : activeRowIndex + 1}
                          </span>
                          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">
                            {activeRowIndex === -1 ? "Add Finding Line Item" : `Configure Finding Row #${activeRowIndex + 1}`}
                          </h3>
                        </div>
                        <button 
                          type="button"
                          onClick={cancelRowEdit}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Modal Body (Scrollable) */}
                      <div className="p-6 space-y-4 flex-1 overflow-y-auto text-left">


                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[14px] font-mono font-bold text-slate-750 dark:text-slate-355 uppercase block mb-1">Findings & Observation</label>
                            <RichEditor 
                              value={draftRow.activity} 
                              onChange={(html) => setDraftRow({ ...draftRow, activity: html })} 
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[14px] font-mono font-bold text-slate-750 dark:text-slate-355 uppercase block mb-1">Implication</label>
                            <RichEditor 
                              value={draftRow.implication || ""} 
                              onChange={(html) => setDraftRow({ ...draftRow, implication: html })} 
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[14px] font-mono font-bold text-slate-750 dark:text-slate-355 uppercase block mb-1">Recommendation</label>
                            <RichEditor 
                              value={draftRow.recommendation || ""} 
                              onChange={(html) => setDraftRow({ ...draftRow, recommendation: html })} 
                            />
                          </div>
                          {/* Management's response & corrective action Section */}
                          <div className="space-y-4 pt-2">
                            <div className="space-y-1">
                              <label className="text-[14px] font-mono font-bold text-slate-750 dark:text-slate-355 uppercase block">
                                Management 's response & corrective action
                              </label>
                              <div className="border-b border-slate-250 dark:border-slate-800 my-2" />
                            </div>

                            <div className="space-y-4">
                              {/* Corrective Action Sub-panel */}
                              <div className="border border-slate-200 dark:border-slate-800 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 rounded-md p-4 bg-white dark:bg-slate-950/20 space-y-4 transition-all">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                  <span className="text-sm  font-bold text-slate-700 dark:text-slate-300 w-40 sm:shrink-0">
                                    Corrective Action Date:
                                  </span>
                                  <input 
                                    type="date"
                                    required
                                    value={draftRow.correctiveActionDate || ""}
                                    onChange={(e) => setDraftRow({ ...draftRow, correctiveActionDate: e.target.value })}
                                    className="px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer w-full max-w-[200px]"
                                  />
                                </div>
                                <div className="space-y-3">
                                  <label className="text-sm  font-semibold text-slate-700 dark:text-slate-300 w-40 sm:shrink-0">Remarks</label>
                                  <RichEditor 
                                    value={draftRow.correctiveActionRemarks || ""} 
                                    onChange={(html) => setDraftRow({ ...draftRow, correctiveActionRemarks: html })} 
                                  />
                                </div>
                              </div>

                              {/* Final Verification Sub-panel */}
                              <div className="border border-slate-200 dark:border-slate-800 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 rounded-md p-4 bg-white dark:bg-slate-950/20 space-y-4 transition-all">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300 w-40 sm:shrink-0">
                                    Corrective Final Date:
                                  </span>
                                  <input 
                                    type="date"
                                    required
                                    value={draftRow.correctiveFinalDate || ""}
                                    onChange={(e) => setDraftRow({ ...draftRow, correctiveFinalDate: e.target.value })}
                                    className="px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer w-full max-w-[200px]"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-sm  font-semibold text-slate-700 dark:text-slate-300 w-40 sm:shrink-0">Remarks</label>
                                  <RichEditor 
                                    value={draftRow.correctiveFinalRemarks || ""} 
                                    onChange={(html) => setDraftRow({ ...draftRow, correctiveFinalRemarks: html })} 
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Modal Footer */}
                      <div className="px-6 py-4.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2 justify-end shrink-0">
                        <button
                          type="button"
                          onClick={cancelRowEdit}
                          className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={saveRowEdit}
                          className="px-3 py-1.5 bg-[#0066cc] text-white rounded text-xs font-bold hover:bg-[#004499] cursor-pointer"
                        >
                          Apply Changes
                        </button>
                      </div>

                    </div>
                  </div>
                )}
                <div className="overflow-hidden border border-[#0066cc] rounded-lg">
                  <table className="w-full border-collapse text-left text-xs bg-white dark:bg-slate-950">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 border-b border-[#0066cc] font-bold text-slate-700 dark:text-slate-200">
                        <th className="px-4 py-3 w-[5%] text-center border-r border-[#0066cc]/30">No</th>
                        <th className="px-4 py-3 w-[30%] border-r border-[#0066cc]/30">Finding & Observations</th>
                        <th className="px-4 py-3 w-[20%] border-r border-[#0066cc]/30">Implication</th>
                        <th className="px-4 py-3 w-[20%] border-r border-[#0066cc]/30">Recommendation</th>
                        <th className="px-4 py-3 w-[25%]">Management Response & corrective action</th>
                        {canManage && <th className="px-4 py-3 w-16 text-right no-print"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={canManage ? 6 : 5} className="px-4 py-8 text-center text-slate-400 italic">
                            No finding line items recorded in this report. Click "Add Finding Line" to add one.
                          </td>
                        </tr>
                      ) : (
                        rows.map((row, idx) => (
                          <tr key={idx} className="align-top hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                            <td className="px-4 py-3.5 text-center font-mono text-slate-400 border-r border-slate-200 dark:border-slate-800">{idx + 1}</td>
                            <td className="px-4 py-3.5 border-r border-slate-200 dark:border-slate-800">
                              <div className="space-y-1.5">
                                <div className="flex gap-1.5 items-center flex-wrap">
                                  {row.date && <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{row.date}</span>}
                                  {row.time && (
                                    <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                                      row.time === "CRITICAL" ? "bg-red-500/10 border-red-500/20 text-red-500" :
                                      row.time === "HIGH" ? "bg-orange-500/10 border-orange-500/20 text-orange-500" :
                                      row.time === "MEDIUM" ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                                      "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"
                                    }`}>
                                      {row.time}
                                    </span>
                                  )}
                                  {row.conductBy && <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">by {row.conductBy}</span>}
                                </div>
                                <div className="prose dark:prose-invert text-[11px] leading-relaxed" dangerouslySetInnerHTML={{ __html: row.activity }} />
                              </div>
                            </td>
                            <td className="px-4 py-3.5 border-r border-slate-200 dark:border-slate-800">
                              <div className="prose dark:prose-invert text-[11px] leading-relaxed text-slate-600 dark:text-slate-400" dangerouslySetInnerHTML={{ __html: !isHtmlEmpty(row.implication) ? row.implication || "" : "" }} />
                            </td>
                            <td className="px-4 py-3.5 border-r border-slate-200 dark:border-slate-800">
                              <div className="prose dark:prose-invert text-[11px] leading-relaxed text-slate-600 dark:text-slate-400" dangerouslySetInnerHTML={{ __html: !isHtmlEmpty(row.recommendation) ? row.recommendation || "" : "" }} />
                            </td>
                            <td className="px-4 py-3.5">
                              {row.correctiveActionDate || !isHtmlEmpty(row.correctiveActionRemarks) || row.correctiveFinalDate || !isHtmlEmpty(row.correctiveFinalRemarks) ? (
                                <div className="space-y-2 text-[11px]">
                                  {(row.correctiveActionDate || !isHtmlEmpty(row.correctiveActionRemarks)) && (
                                    <div className="p-2 rounded bg-amber-500/5 border border-amber-500/10 space-y-1">
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-1 h-3 bg-[#f0810f] rounded-full" />
                                        <span className="font-bold text-amber-700 dark:text-amber-400">Corrective Action</span>
                                        {row.correctiveActionDate && (
                                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">({formatDateString(row.correctiveActionDate)})</span>
                                        )}
                                      </div>
                                      {!isHtmlEmpty(row.correctiveActionRemarks) && (
                                        <div className="prose dark:prose-invert text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 font-sans" dangerouslySetInnerHTML={{ __html: row.correctiveActionRemarks || "" }} />
                                      )}
                                    </div>
                                  )}
                                  {(row.correctiveFinalDate || !isHtmlEmpty(row.correctiveFinalRemarks)) && (
                                    <div className="p-2 rounded bg-emerald-500/5 border border-emerald-500/10 space-y-1">
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-1 h-3 bg-[#10b981] rounded-full" />
                                        <span className="font-bold text-emerald-700 dark:text-emerald-400">Final Verification</span>
                                        {row.correctiveFinalDate && (
                                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">({formatDateString(row.correctiveFinalDate)})</span>
                                        )}
                                      </div>
                                      {!isHtmlEmpty(row.correctiveFinalRemarks) && (
                                        <div className="prose dark:prose-invert text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 font-sans" dangerouslySetInnerHTML={{ __html: row.correctiveFinalRemarks || "" }} />
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="prose dark:prose-invert text-[11px] leading-relaxed text-slate-650" dangerouslySetInnerHTML={{ __html: !isHtmlEmpty(row.pIncharge) ? row.pIncharge || "" : "" }} />
                              )}
                            </td>
                            
                            {canManage && (
                              <td className="px-4 py-3.5 text-right space-x-1 whitespace-nowrap no-print">
                                <button
                                  type="button"
                                  onClick={() => startEditingRow(idx)}
                                  className="p-1 text-slate-400 hover:text-blue-500 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                  title="Edit Line"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteRowItem(idx)}
                                  className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                  title="Remove Line"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}