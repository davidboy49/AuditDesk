"use client";

import { useState } from "react";
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
  BookOpen
} from "lucide-react";
import { 
  User, 
  AuditProject, 
  ExecutionSchedule, 
  ScheduleRow 
} from "@/lib/mockData";
import { 
  createExecutionScheduleAction, 
  updateExecutionScheduleAction, 
  deleteExecutionScheduleAction,
  getExecutionSchedulesAction
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

interface ScheduleClientProps {
  initialSchedules: ExecutionSchedule[];
  projects: AuditProject[];
  users: User[];
  currentUser: User;
}

export default function ScheduleClient({ 
  initialSchedules, 
  projects, 
  users, 
  currentUser 
}: ScheduleClientProps) {
  const [schedules, setSchedules] = useState<ExecutionSchedule[]>(initialSchedules);
  
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
  const [visitNumber, setVisitNumber] = useState("01");
  const [actualVisitDate, setActualVisitDate] = useState("");
  const [auditPeriod, setAuditPeriod] = useState("");
  const [leadExecution, setLeadExecution] = useState("");
  const [teamMembers, setTeamMembers] = useState("");
  const [additionalAttendees, setAdditionalAttendees] = useState("");
  const [standards, setStandards] = useState("Work Procedure, work instruction, and policy");
  const [language, setLanguage] = useState("English");
  const [objectives, setObjectives] = useState("");
  const [scope, setScope] = useState("");
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  // Active row index for card editing
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  // Draft state for unsaved edits in configuring slot
  const [draftRow, setDraftRow] = useState<ScheduleRow | null>(null);
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

  const canManage = currentUser.role !== "AUDITEE"; // Auditor/Lead/Admin can manage schedules

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Prepopulate schedule fields when project is selected in Create mode
  const handleProjectSelect = (projId: string) => {
    setSelectedProjectId(projId);
    if (!projId) return;

    const proj = projects.find(p => p.id === projId);
    if (!proj) return;

    // Organization mapping based on Lead Auditor's department or default
    const leadUser = users.find(u => u.id === proj.leadAuditorId);
    const orgVal = leadUser?.departmentName ? `${leadUser.departmentName} Department` : "Finance Department";
    setOrganization(orgVal);

    // Date formatting (e.g. 20-31 July 2026)
    setActualVisitDate(`${proj.startDate} to ${proj.endDate}`);
    
    // Default Audit Period (usually preceding 3 months)
    setAuditPeriod("1 Apr - 30 Jun 2026 (Three months)");

    // Lead Execution name
    setLeadExecution(leadUser?.name || "Mr. El Thany");

    // Retrieve implicit Auditors and PICs names
    const auditorNames = users
      .filter(u => proj.auditorIds?.includes(u.id))
      .map(u => u.name)
      .join(", ") || "Hong Solina, Mao Sokpisith";
    setTeamMembers(auditorNames);

    const picNames = users
      .filter(u => proj.deptPicIds?.split(",").includes(u.id))
      .map(u => u.name)
      .join(", ") || "Kong Thida, Malyneth";
    setAdditionalAttendees(picNames);

    // Stripping objectives/scope from HTML tags to text for plain textarea editing
    const cleanHTML = (html: string) => {
      if (typeof window === "undefined") return html;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return doc.body.textContent || "";
    };
    
    setObjectives(cleanHTML(proj.objectives));
    setScope(cleanHTML(proj.scope));

    // Default template schedule rows matching word document "2. Schedule"
    setRows([
      {
        date: "17-Jul-26",
        time: "9:30am-10:00am",
        activity: "- Open Meeting & discuss any SOP or Work Instruction updated.\n\nDocument request:\n- Policy, work procedure/instruction up to date related to Expenses, Revenue, & Fixed Asset.\n- General ledger & Trial balance from 01 April to 30 June 2026\n- Listing (Expense, Revenue, Fixed Asset)\n- Fixed asset register Addition from 1st August 2025 to 30th June 2026\n- Fixed asset movement and disposal listing\n- Bank Statement\n- Supporting document like PVs, invoices, and related supporting document.\n- Sample select email confirm",
        conductBy: leadUser?.name || "El Thany",
        pIncharge: picNames || "Kong Thida, Malyneth"
      },
      {
        date: "20-29 Jul",
        time: "8:00am-6:00pm",
        activity: "- Review Expenses Management\n- Review Revenue Management\n- Review Fixed Asset Management\n- Fixed Asset physical count (samples select)",
        conductBy: leadUser?.name || "El Thany",
        pIncharge: "Da Pich"
      },
      {
        date: "30 Jul",
        time: "9:00am-11:00am",
        activity: "- Final Issues Clarification",
        conductBy: leadUser?.name || "El Thany",
        pIncharge: "Chanthorn"
      }
    ]);
  };

  const openCreateModal = () => {
    setModalMode("create");
    setSelectedProjectId("");
    setOrganization("");
    setAddress("HB-HQ");
    setVisitNumber("01");
    setActualVisitDate("");
    setAuditPeriod("");
    setLeadExecution("");
    setTeamMembers("");
    setAdditionalAttendees("");
    setStandards("Work Procedure, work instruction, and policy");
    setLanguage("English");
    setObjectives("");
    setScope("");
    setRows([]);
    setIsModalOpen(true);
  };

  const openEditModal = (sched: ExecutionSchedule) => {
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
    setLanguage(sched.language);
    setObjectives(sched.objectives);
    setScope(sched.scope);
    
    try {
      setRows(JSON.parse(sched.scheduleRows));
    } catch {
      setRows([]);
    }
    
    setIsModalOpen(true);
  };

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
      language,
      objectives,
      scope,
      scheduleRows: JSON.stringify(rows)
    };

    try {
      if (modalMode === "create") {
        const result = await createExecutionScheduleAction(payload);
        if (result) {
          showFeedback("Execution schedule generated successfully.");
          setIsModalOpen(false);
          const fresh = await getExecutionSchedulesAction();
          setSchedules(fresh);
        }
      } else {
        if (!selectedScheduleId) return;
        const result = await updateExecutionScheduleAction(selectedScheduleId, payload);
        if (result) {
          showFeedback("Execution schedule changes updated.");
          setIsModalOpen(false);
          const fresh = await getExecutionSchedulesAction();
          setSchedules(fresh);
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
      "Delete Execution Schedule",
      `Are you sure you want to delete the execution schedule for "${s.projectName}"? This action cannot be undone.`,
      async () => {
        try {
          const success = await deleteExecutionScheduleAction(selectedScheduleId);
          if (success) {
            showFeedback("Schedule removed from ledger.");
            setSelectedScheduleId(null);
            const fresh = await getExecutionSchedulesAction();
            setSchedules(fresh);
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
    setDraftRow({ ...rows[index] });
  };

  const addRow = () => {
    const newRow = { day: "", date: new Date().toISOString().split('T')[0], time: "09:00 AM - 10:00 AM", activity: "", conductBy: "", pIncharge: "" };
    setRows([...rows, newRow]);
    setActiveRowIndex(rows.length);
    setDraftRow({ ...newRow });
  };

  const removeRow = (index: number) => {
    showConfirm(
      "Delete Execution Slot",
      "Are you sure you want to delete this execution slot? This action cannot be undone.",
      () => {
        setRows(rows.filter((_, idx) => idx !== index));
        if (activeRowIndex === index) {
          setActiveRowIndex(null);
          setDraftRow(null);
        }
      }
    );
  };

  const updateDraftField = (field: keyof ScheduleRow, value: string) => {
    if (draftRow) {
      setDraftRow({ ...draftRow, [field]: value });
    }
  };

  const saveDraftRow = () => {
    if (activeRowIndex !== null && draftRow) {
      setRows(rows.map((r, idx) => idx === activeRowIndex ? draftRow : r));
      setActiveRowIndex(null);
      setDraftRow(null);
    }
  };

  const cancelDraftRow = () => {
    if (activeRowIndex !== null && draftRow) {
      const original = rows[activeRowIndex];
      const hasChanges = 
        original.day !== draftRow.day ||
        original.date !== draftRow.date ||
        original.time !== draftRow.time ||
        original.activity !== draftRow.activity ||
        original.conductBy !== draftRow.conductBy ||
        original.pIncharge !== draftRow.pIncharge;

      if (hasChanges) {
        showConfirm(
          "Discard Changes",
          "You have unsaved changes in this slot. Are you sure you want to discard them?",
          () => {
            setActiveRowIndex(null);
            setDraftRow(null);
          }
        );
      } else {
        setActiveRowIndex(null);
        setDraftRow(null);
      }
    } else {
      setActiveRowIndex(null);
      setDraftRow(null);
    }
  };

  // Filter & Search
  const filteredSchedules = schedules.filter(s => {
    const matchesSearch = s.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.projectCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.leadExecution?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = projectFilter === "ALL" || s.projectId === projectFilter;
    return matchesSearch && matchesProject;
  });

  const projectFilterOptions = projects.map(p => ({
    label: `${p.code} - ${p.name}`,
    value: p.id
  }));

  const activeSchedule = schedules.find(x => x.id === selectedScheduleId);

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print border-b border-slate-200 dark:border-slate-850 pb-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Execution Schedule & Document Request</h1>
          <p className="text-xs text-muted-foreground">
            Outline physical visit dates, interview sequences, and files requested from departments.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#05375c] text-white hover:bg-[#074776] text-xs font-bold rounded-md shadow transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Schedule
          </button>
        )}
      </div>

      {/* Feedback notifier */}
      {feedback && (
        <div className="fixed bottom-8 right-8 z-50 flex items-center gap-2 bg-[#05375c] text-white px-4 py-3 rounded-md shadow-md text-xs font-mono font-semibold animate-slide-up border border-[#05375c] no-print">
          <span>{feedback}</span>
        </div>
      )}

      {/* Main layout */}
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
            searchPlaceholder="Search schedules..."
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
                  <th className="px-6 py-4">Visit Date</th>
                  <th className="px-6 py-4">Lead Auditor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">
                      No schedules matched filters or none have been created. Click "+" above to link an Audit Plan.
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

      {/* Edit/Create Popup Modal Styled Like "2. Schedule.doc" Document */}
      {isModalOpen && (
        <div id="scoping-modal-root" className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 flex justify-center z-50 overflow-y-auto p-4 md:p-8 animate-fade-in no-print-backdrop">
          <div className="bg-white dark:bg-slate-950 w-full max-w-[98vw] xl:max-w-[98vw] rounded-lg shadow-2xl flex flex-col overflow-hidden h-fit border border-slate-200 dark:border-slate-850 scoping-modal-container">
            
            {/* Modal Header */}
            <div className="px-8 py-5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                  Document 2. Schedule
                </div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {modalMode === "create" ? "Link New Audit Schedule" : "Edit Execution Schedule"}
                </h2>
              </div>

              {/* Actions Header Bar */}
              <div className="flex items-center gap-2.5 shrink-0 no-print">
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
                  <span>Choose an Audit Plan to extract scoping details and pre-populate schedule fields.</span>
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

              {/* Document Summary Info Grid styled like a Word Document table */}
              <div className="space-y-4">
                <div className="overflow-x-auto border border-slate-350 dark:border-slate-800 rounded-md">
                  <table className="w-full border-collapse text-xs">
                    <tbody>
                      {/* Row 1: Organization */}
                      <tr className="border-b border-slate-300 dark:border-slate-800/80">
                        <td className="w-1/4 px-4 py-3 bg-slate-50 dark:bg-slate-900/60 font-bold border-r border-slate-300 dark:border-slate-800/80 text-slate-700 dark:text-slate-300">
                          Organization:
                        </td>
                        <td colSpan={3} className="px-4 py-2">
                          <input 
                            type="text" 
                            required
                            value={organization}
                            onChange={(e) => setOrganization(e.target.value)}
                            placeholder="Finance Department"
                            className="w-full bg-transparent border-none p-0 text-xs focus:outline-none font-bold text-slate-800 dark:text-slate-100"
                          />
                        </td>
                      </tr>

                      {/* Row 2: Address */}
                      <tr className="border-b border-slate-300 dark:border-slate-800/80">
                        <td className="px-4 py-3 bg-slate-50 dark:bg-slate-900/60 font-bold border-r border-slate-300 dark:border-slate-800/80 text-slate-700 dark:text-slate-300">
                          Address:
                        </td>
                        <td colSpan={3} className="px-4 py-2">
                          <input 
                            type="text" 
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="HB-HQ"
                            className="w-full bg-transparent border-none p-0 text-xs focus:outline-none text-slate-800 dark:text-slate-100"
                          />
                        </td>
                      </tr>

                      {/* Row 3: Visit Number + Actual Visit Date */}
                      <tr className="border-b border-slate-300 dark:border-slate-800/80">
                        <td className="px-4 py-3 bg-slate-50 dark:bg-slate-900/60 font-bold border-r border-slate-300 dark:border-slate-800/80 text-slate-700 dark:text-slate-300">
                          Visit Number:
                        </td>
                        <td className="w-1/4 px-4 py-2 border-r border-slate-300 dark:border-slate-800/80">
                          <input 
                            type="text" 
                            value={visitNumber}
                            onChange={(e) => setVisitNumber(e.target.value)}
                            placeholder="V3"
                            className="w-full bg-transparent border-none p-0 text-xs focus:outline-none text-slate-800 dark:text-slate-100"
                          />
                        </td>
                        <td className="w-1/4 px-4 py-3 bg-slate-50 dark:bg-slate-900/60 font-bold border-r border-slate-300 dark:border-slate-800/80 text-slate-700 dark:text-slate-300">
                          Actual Visit Date:
                        </td>
                        <td className="px-4 py-2 bg-white-100 dark:bg-yellow-950/20 font-bold text-slate-900 dark:text-white-100">
                          <input 
                            type="text" 
                            required
                            value={actualVisitDate}
                            onChange={(e) => setActualVisitDate(e.target.value)}
                            placeholder="20-31 July 2026"
                            className="w-full bg-transparent border-none p-0 text-xs focus:outline-none font-bold text-slate-900"
                          />
                        </td>
                      </tr>

                      {/* Row 4: Audit Period + For OPE info only */}
                      <tr className="border-b border-slate-300 dark:border-slate-800/80">
                        <td className="px-4 py-3 bg-slate-50 dark:bg-slate-900/60 font-bold border-r border-slate-300 dark:border-slate-800/80 text-slate-700 dark:text-slate-300">
                          Audit Period:
                        </td>
                        <td className="px-4 py-2 border-r border-slate-300 dark:border-slate-800/80">
                          <input 
                            type="text" 
                            value={auditPeriod}
                            onChange={(e) => setAuditPeriod(e.target.value)}
                            placeholder="1 Apr-30 Jun, 2026 (Three months)"
                            className="w-full bg-transparent border-none p-0 text-xs focus:outline-none text-slate-800 dark:text-slate-100"
                          />
                        </td>
                        <td colSpan={2} className="px-4 py-3 bg-slate-50 dark:bg-slate-900/60 font-bold text-slate-500 italic">
                          For OPE information only
                        </td>
                      </tr>

                      {/* Row 5: Lead Execution */}
                      <tr className="border-b border-slate-300 dark:border-slate-800/80">
                        <td className="px-4 py-3 bg-slate-50 dark:bg-slate-900/60 font-bold border-r border-slate-300 dark:border-slate-800/80 text-slate-700 dark:text-slate-300">
                          Lead Execution:
                        </td>
                        <td colSpan={3} className="px-4 py-2.5">
                          <MultiSelect
                            selectedValues={leadExecutionArray}
                            onChange={(values) => setLeadExecution(values.join(", "))}
                            options={userOptions}
                            placeholder="Type to search system users or press Enter for custom names..."
                          />
                        </td>
                      </tr>

                      {/* Row 6: Team Member(s) */}
                      <tr className="border-b border-slate-300 dark:border-slate-800/80">
                        <td className="px-4 py-3 bg-slate-50 dark:bg-slate-900/60 font-bold border-r border-slate-300 dark:border-slate-800/80 text-slate-700 dark:text-slate-300">
                          Team Member(s):
                        </td>
                        <td colSpan={3} className="px-4 py-2.5">
                          <MultiSelect
                            selectedValues={teamMembersArray}
                            onChange={(values) => setTeamMembers(values.join(", "))}
                            options={userOptions}
                            placeholder="Type to search system users or press Enter for custom names..."
                          />
                        </td>
                      </tr>

                      {/* Row 7: Additional Attendees and Roles */}
                      <tr className="border-b border-slate-300 dark:border-slate-800/80">
                        <td className="px-4 py-3 bg-slate-50 dark:bg-slate-900/60 font-bold border-r border-slate-300 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 leading-normal">
                          Additional Attendees and Roles:
                        </td>
                        <td colSpan={3} className="px-4 py-2.5">
                          <MultiSelect
                            selectedValues={additionalAttendeesArray}
                            onChange={(values) => setAdditionalAttendees(values.join(", "))}
                            options={userOptions}
                            placeholder="Type to search system users or press Enter for custom names..."
                          />
                        </td>
                      </tr>

                      {/* Row 8: Standard(s) */}
                      <tr className="border-b border-slate-300 dark:border-slate-800/80">
                        <td className="px-4 py-3 bg-slate-50 dark:bg-slate-900/60 font-bold border-r border-slate-300 dark:border-slate-800/80 text-slate-700 dark:text-slate-300">
                          Standard(s):
                        </td>
                        <td colSpan={3} className="px-4 py-2">
                          <input 
                            type="text" 
                            value={standards}
                            onChange={(e) => setStandards(e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-xs focus:outline-none text-slate-800 dark:text-slate-100 font-semibold"
                          />
                        </td>
                      </tr>

                      {/* Row 9: OPE Language */}
                      <tr className="border-b border-slate-300 dark:border-slate-800/80">
                        <td className="px-4 py-3 bg-slate-50 dark:bg-slate-900/60 font-bold border-r border-slate-300 dark:border-slate-800/80 text-slate-700 dark:text-slate-300">
                          OPE Language:
                        </td>
                        <td colSpan={3} className="px-4 py-2">
                          <input 
                            type="text" 
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-xs focus:outline-none text-slate-800 dark:text-slate-100 font-semibold"
                          />
                        </td>
                      </tr>

                      {/* Row 10: OPE Objectives */}
                      <tr className="border-b border-slate-300 dark:border-slate-800/80">
                        <td className="px-4 py-3 bg-slate-50 dark:bg-slate-900/60 font-bold border-r border-slate-300 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 align-top">
                          OPE Objectives:
                        </td>
                        <td colSpan={3} className="px-4 py-3">
                          <textarea 
                            value={objectives}
                            onChange={(e) => setObjectives(e.target.value)}
                            rows={8}
                            placeholder="- To assess whether policies..."
                            className="w-full bg-transparent border-none p-0 text-xs focus:outline-none text-slate-800 dark:text-slate-100 leading-relaxed font-sans resize-y whitespace-pre-line"
                          />
                        </td>
                      </tr>

                      {/* Row 11: OPE Scope */}
                      <tr>
                        <td className="px-4 py-3 bg-slate-50 dark:bg-slate-900/60 font-bold border-r border-slate-300 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 align-top">
                          OPE Scope:
                        </td>
                        <td colSpan={3} className="px-4 py-3">
                          <textarea 
                            value={scope}
                            onChange={(e) => setScope(e.target.value)}
                            rows={5}
                            placeholder="- Work procedure (account revenue)..."
                            className="w-full bg-transparent border-none p-0 text-xs focus:outline-none text-slate-800 dark:text-slate-100 leading-relaxed font-sans resize-y whitespace-pre-line"
                          />
                        </td>
                      </tr>

                    </tbody>
                  </table>
                </div>
              </div>

              {/* Schedule Table Editor */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-[#05375c] dark:text-accent">
                    Execution Schedule Rows
                  </h3>
                  <button
                    type="button"
                    onClick={addRow}
                    className="flex items-center gap-1 px-3 py-1 bg-sky-500/10 hover:bg-sky-500/15 border border-sky-500/20 text-[#0066cc] dark:text-sky-400 text-xs font-semibold rounded cursor-pointer no-print"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Day/Slot
                  </button>
                </div>

                {/* 1. Interactive Table Editor View (Screen only) */}
                <div className="no-print overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-555 dark:text-slate-400 uppercase font-sans font-bold">
                      <tr>
                        <th className="px-4 py-3 w-16 border-r border-slate-200 dark:border-slate-800">Day</th>
                        <th className="px-4 py-3 w-28 border-r border-slate-200 dark:border-slate-800">Date</th>
                        <th className="px-4 py-3 w-36 border-r border-slate-200 dark:border-slate-800">Time</th>
                        <th className="px-4 py-3 border-r border-slate-200 dark:border-slate-800">Functional Units/Activities/ Document request</th>
                        <th className="px-4 py-3 w-40 border-r border-slate-200 dark:border-slate-800">Conduct by</th>
                        <th className="px-4 py-3 w-40 border-r border-slate-200 dark:border-slate-800">P-Incharge</th>
                        <th className="px-4 py-3 w-24 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-slate-950">
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-slate-400 italic">
                            No slots created yet. Click "+ Add Day/Slot" above.
                          </td>
                        </tr>
                      ) : (
                        rows.map((row, index) => (
                          <tr 
                            key={index}
                            onClick={() => startEditingRow(index)}
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-900/35 transition-colors cursor-pointer align-top border-b border-slate-200 dark:border-slate-800 last:border-0"
                          >
                            <td className="p-3 border-r border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                              {row.day || ""}
                            </td>
                            <td className="p-3 border-r border-slate-200 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {formatDateString(row.date)}
                            </td>
                            <td className="p-3 border-r border-slate-200 dark:border-slate-800 font-mono text-[10px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              {row.time || "Time not selected"}
                            </td>
                            <td 
                              className="p-3 border-r border-slate-200 dark:border-slate-800 leading-relaxed text-slate-700 dark:text-slate-355 rich-text-content"
                              dangerouslySetInnerHTML={{ __html: row.activity || "<i>No activities set. Click to configure.</i>" }}
                            />
                            <td className="p-3 border-r border-slate-200 dark:border-slate-800 font-semibold text-[#05375c] dark:text-sky-400 whitespace-pre-wrap">
                              {row.conductBy || "Unassigned"}
                            </td>
                            <td className="p-3 border-r border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                              {row.pIncharge || "Unassigned"}
                            </td>
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => startEditingRow(index)}
                                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 cursor-pointer"
                                  title="Edit Slot"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeRow(index)}
                                  className="p-1.5 hover:bg-red-500/10 rounded text-red-500 cursor-pointer"
                                  title="Delete Slot"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 2. Nested Schedule Slot Editor Modal (Screen only) */}
                {activeRowIndex !== null && draftRow !== null && (() => {
                  const timeVals = parseTimeRange(draftRow.time);
                  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(draftRow.date) 
                    ? draftRow.date 
                    : "";
                  const conductByArray = draftRow.conductBy
                    ? draftRow.conductBy.split(",").map(name => name.trim()).filter(Boolean)
                    : [];
                  const pInchargeArray = draftRow.pIncharge
                    ? draftRow.pIncharge.split(",").map(name => name.trim()).filter(Boolean)
                    : [];

                  const auditorOptions = users
                    .filter(u => u.role === "ADMIN" || u.role === "LEAD_AUDITOR" || u.role === "AUDITOR")
                    .map(u => ({
                      value: u.name,
                      label: u.name,
                      subLabel: `${u.role.replace("_", " ")}${u.email ? ` • ${u.email}` : ""}`
                    }));

                  const picOptions = users.map(u => ({
                    value: u.name,
                    label: u.name,
                    subLabel: `${u.role.replace("_", " ")}${u.email ? ` • ${u.email}` : ""}`
                  }));

                  return (
                    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/85 flex justify-center items-center z-[60] p-4 animate-fade-in no-print">
                      <div className="bg-white dark:bg-slate-950 w-full max-w-4xl md:max-w-5xl h-[90vh] max-h-[850px] rounded-lg shadow-2xl flex flex-col overflow-hidden border border-slate-250 dark:border-slate-800 animate-slide-up">
                        
                        {/* Slot Modal Header (Fixed at top) */}
                        <div className="px-6 py-4.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-855 flex justify-between items-center shrink-0">
                          <div>
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[9px] font-mono font-bold text-slate-555 dark:text-slate-400">
                              SLOT #{activeRowIndex + 1}
                            </span>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">
                              Configure Execution Slot
                            </h3>
                          </div>
                          <button 
                            type="button"
                            onClick={cancelDraftRow}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Slot Modal Body (Scrolls internally, keeping header/footer intact) */}
                        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                          
                          {/* Collapsible Parameters Section */}
                          <div className="border border-slate-200 dark:border-slate-800 rounded-lg shrink-0 relative z-30">
                            <button
                              type="button"
                              onClick={() => setIsParamsExpanded(!isParamsExpanded)}
                              className="w-full bg-slate-50 dark:bg-slate-900/60 px-4 py-2.5 flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-slate-100/80 dark:hover:bg-slate-850 transition-colors border-b border-slate-200 dark:border-slate-800 cursor-pointer"
                            >
                              <span className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-[#0066cc]" />
                                <span>Execution Parameters (Date, Time, Auditors, PIC)</span>
                              </span>
                              <ChevronRight className={`w-4 h-4 transition-transform duration-205 text-slate-400 ${isParamsExpanded ? "rotate-90" : ""}`} />
                            </button>
                            
                            {isParamsExpanded && (
                              <div className="p-4 bg-white dark:bg-slate-950/40 grid grid-cols-3 gap-4 animate-fade-in border-t border-slate-100 dark:border-slate-800">
                                {/* Day Input */}
                                <div className="space-y-1">
                                  <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                                    Day
                                  </label>
                                  <input 
                                    type="text"
                                    value={draftRow.day || ""}
                                    onChange={(e) => updateDraftField("day", e.target.value)}
                                    placeholder="e.g. 1-8 or empty"
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-805 rounded px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                                  />
                                </div>

                                {/* Date Selector */}
                                <div className="space-y-1">
                                  <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                                    Execution Date
                                  </label>
                                  <input 
                                    type="date"
                                    value={validDate}
                                    onChange={(e) => updateDraftField("date", e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-805 rounded px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                                  />
                                </div>

                                {/* Time Selector */}
                                <div className="space-y-1">
                                  <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Time Range</label>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[9px] text-slate-400 font-mono uppercase">From</span>
                                      <input 
                                        type="time" 
                                        value={timeVals.from} 
                                        onChange={(e) => {
                                          const newTime = formatTimeRange(e.target.value, timeVals.to);
                                          updateDraftField("time", newTime);
                                        }}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-805 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                                      />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[9px] text-slate-400 font-mono uppercase">To</span>
                                      <input 
                                        type="time" 
                                        value={timeVals.to} 
                                        onChange={(e) => {
                                          const newTime = formatTimeRange(timeVals.from, e.target.value);
                                          updateDraftField("time", newTime);
                                        }}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-805 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Conduct By Dropdown */}
                                <div className="space-y-1">
                                  <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Conducted By (Auditors)</label>
                                  <MultiSelect
                                    selectedValues={conductByArray}
                                    onChange={(values) => updateDraftField("conductBy", values.join(", "))}
                                    options={auditorOptions}
                                    placeholder="Select auditors or type custom name..."
                                  />
                                </div>

                                {/* PIC Dropdown */}
                                <div className="space-y-1">
                                  <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Person in Charge (PIC)</label>
                                  <MultiSelect
                                    selectedValues={pInchargeArray}
                                    onChange={(values) => updateDraftField("pIncharge", values.join(", "))}
                                    options={picOptions}
                                    placeholder="Select PICs or type custom name..."
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Activities & Document Requests Rich Text Editor */}
                          <div className="space-y-1 flex-1 flex flex-col">
                            <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold mb-1 ">
                              Activities & Document Requests
                            </label>
                            <RichEditor 
                              value={draftRow.activity}
                              onChange={(val) => updateDraftField("activity", val)}
                              placeholder="List activities or documents requested..."
                              editorClassName={isParamsExpanded ? "min-h-[220px] max-h-[300px]" : "min-h-[420px] max-h-[500px]"}
                            />
                          </div>

                        </div>

                        {/* Slot Modal Footer (Fixed at bottom) */}
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-850 flex justify-end gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={cancelDraftRow}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded cursor-pointer"
                          >
                            Discard
                          </button>
                          <button
                            type="button"
                            onClick={saveDraftRow}
                            className="px-5 py-2 bg-[#0066cc] hover:bg-[#0052a3] text-white text-xs font-bold rounded cursor-pointer"
                          >
                            Save
                          </button>
                        </div>

                      </div>
                    </div>
                  );
                })()}

                {/* 3. Flat Printout Table View (Print only - hidden on screen) */}
                <div className="hidden print:block overflow-x-auto border border-slate-350 dark:border-slate-800 rounded-md">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-300 dark:border-slate-800 text-slate-500 uppercase font-sans font-bold">
                      <tr>
                        <th className="px-4 py-3 w-16 border-r border-slate-300 dark:border-slate-800">Day</th>
                        <th className="px-4 py-3 w-28 border-r border-slate-300 dark:border-slate-800">Date</th>
                        <th className="px-4 py-3 w-36 border-r border-slate-300 dark:border-slate-800">Time</th>
                        <th className="px-4 py-3 border-r border-slate-300 dark:border-slate-800">Functional Units/Activities/ Document request</th>
                        <th className="px-4 py-3 w-40 border-r border-slate-300 dark:border-slate-800">Conduct by</th>
                        <th className="px-4 py-3 w-40">P-Incharge</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {rows.map((row, index) => (
                        <tr key={index} className="align-top border-b border-slate-300 dark:border-slate-800">
                          <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-medium whitespace-pre-wrap">{row.day || ""}</td>
                          <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-bold whitespace-pre-wrap">{formatDateString(row.date)}</td>
                          <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-mono text-[10px] whitespace-pre-wrap">{row.time || "Time not selected"}</td>
                          <td 
                            className="p-3 border-r border-slate-300 dark:border-slate-800 leading-relaxed rich-text-content"
                            dangerouslySetInnerHTML={{ __html: row.activity }}
                          />
                          <td className="p-3 border-r border-slate-300 dark:border-slate-800 font-medium whitespace-pre-wrap">{row.conductBy}</td>
                          <td className="p-3 font-medium whitespace-pre-wrap">{row.pIncharge}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PDF Print Footer Note (conditional on print) */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 text-[10px] font-mono text-slate-400 leading-relaxed italic">
                Note: The operational excellence execution schedule is subject to refinement based on real-time field risk discoveries.
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Custom Confirmation Alert Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/85 flex justify-center items-center z-[1000] p-4 animate-fade-in no-print">
          <div className="bg-white dark:bg-slate-950 w-full max-w-sm rounded-lg shadow-2xl overflow-hidden border border-slate-250 dark:border-slate-800 animate-slide-up">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-red-500">
                <Info className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  {confirmDialog.title}
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {confirmDialog.message}
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-755 text-white text-xs font-bold rounded cursor-pointer"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
