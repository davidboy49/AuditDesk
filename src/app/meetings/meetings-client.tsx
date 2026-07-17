"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  User as UserIcon,
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
  Lock,
  Unlock,
  BadgeCheck
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
  getExecutionSchedulesAction,
  sendEmailNotificationAction,
  sendMeetingReleaseNotificationAction
} from "@/app/actions";
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

interface MeetingsClientProps {
  initialSchedules: ExecutionSchedule[];
  projects: AuditProject[];
  users: User[];
  currentUser: User;
}

export default function MeetingsClient({ 
  initialSchedules, 
  projects, 
  users, 
  currentUser 
}: MeetingsClientProps) {
  const [schedules, setSchedules] = useState<ExecutionSchedule[]>(initialSchedules.filter(s => s.language === "meeting"));
  
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
  const [standards, setStandards] = useState("Meeting Alignment Agenda");
  const [objectives, setObjectives] = useState("");
  const [scope, setScope] = useState("");
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [meetingStatus, setMeetingStatus] = useState<"DRAFT" | "RELEASED">("DRAFT");
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
    subLabel: `${u.role.replace("_", " ")}${u.email ? ` - ${u.email}` : ""}`
  }));

  const isProjectMember = (proj: any) => {
    if (!proj) return false;
    if (currentUser.role === "ADMIN") return true;
    if (proj.leadAuditorId === currentUser.id) return true;
    const auditorsList = proj.auditorNames ? proj.auditorNames.split(",").map((s: string) => s.trim()) : [];
    if (auditorsList.includes(currentUser.name)) return true;
    if (proj.auditorIds?.includes(currentUser.id)) return true;
    const picList = proj.deptPicIds ? proj.deptPicIds.split(",") : [];
    if (picList.includes(currentUser.id) || picList.includes(currentUser.name)) return true;
    return false;
  };

  const isScheduleOrMeetingAllowed = (sched: any) => {
    if (!sched) return false;
    if (currentUser.role === "ADMIN") return true;
    if (sched.ownerName === currentUser.name || sched.lastModifiedBy === currentUser.name) return true;
    const proj = projects.find(p => p.id === sched.projectId);
    return isProjectMember(proj);
  };

  const canManage = true;

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Prepopulate schedule fields when project is selected in Create mode
  const handleProjectSelect = (projId: string) => {
    setSelectedProjectId(projId);
  };

  const openCreateModal = () => {
    setModalMode("create");
    setSelectedScheduleId(null);
    setSelectedProjectId("");
    setOrganization("");
    setAddress("");
    setVisitNumber("");
    setActualVisitDate("");
    setAuditPeriod("");
    setLeadExecution("");
    setTeamMembers("");
    setAdditionalAttendees("");
    setStandards("");
    setObjectives("");
    setScope("");
    setRows([]);
    setMeetingStatus("DRAFT");
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
    setMeetingStatus((sched.status as any) || "DRAFT");
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
          setTimeout(() => {
            openEditModal(sched);
          }, 100);
        }
      }
    }
  }, [schedules]);

  const handleSaveSchedule = async (e?: React.FormEvent, nextStatus?: "DRAFT" | "RELEASED") => {
    if (e) e.preventDefault();

    const targetStatus = nextStatus || meetingStatus;
    if (meetingStatus === "RELEASED" && targetStatus !== "DRAFT") {
      showFeedback("This meeting record is already released. Reopen it before making edits.");
      return;
    }

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
      language: "meeting",
      status: targetStatus,
      objectives,
      scope,
      scheduleRows: JSON.stringify(rows),
      ownerName: modalMode === "create" ? currentUser.name : (schedules.find(x => x.id === selectedScheduleId)?.ownerName || currentUser.name),
      lastModifiedBy: currentUser.name
    };

    try {
      let savedId = selectedScheduleId;

      if (modalMode === "create") {
        const result = await createExecutionScheduleAction(payload);
        if (result) {
          savedId = result.id || savedId;
          setSelectedScheduleId(savedId || null);
          setMeetingStatus(targetStatus);
          const fresh = await getExecutionSchedulesAction();
          setSchedules(fresh.filter((s: any) => s.language === "meeting"));

          if (targetStatus === "RELEASED" && savedId) {
            await sendMeetingReleaseNotificationAction(savedId);
          } else {
            const emailResult = await sendEmailNotificationAction("meetings", payload.projectId, {
              organization: payload.organization,
              visitDate: payload.actualVisitDate,
              ownerName: payload.ownerName
            });
            if (emailResult.success) {
              for (const alert of emailResult.simulatedAlerts) {
                window.dispatchEvent(new CustomEvent("send-simulated-email", { detail: alert }));
              }
            }
          }

          showFeedback(targetStatus === "RELEASED" ? "Open meeting report released and locked." : "Open meeting record generated successfully.");
          setIsModalOpen(false);
        }
      } else {
        if (!selectedScheduleId) return;
        const result = await updateExecutionScheduleAction(selectedScheduleId, payload);
        if (result) {
          savedId = result.id || savedId;
          setMeetingStatus(targetStatus);
          const fresh = await getExecutionSchedulesAction();
          setSchedules(fresh.filter((s: any) => s.language === "meeting"));

          if (targetStatus === "RELEASED" && savedId) {
            await sendMeetingReleaseNotificationAction(savedId);
          } else {
            const emailResult = await sendEmailNotificationAction("meetings", payload.projectId, {
              organization: payload.organization,
              visitDate: payload.actualVisitDate,
              ownerName: payload.ownerName
            });
            if (emailResult.success) {
              for (const alert of emailResult.simulatedAlerts) {
                window.dispatchEvent(new CustomEvent("send-simulated-email", { detail: alert }));
              }
            }
          }

          showFeedback(targetStatus === "RELEASED" ? "Open meeting report released and locked." : "Open meeting changes updated.");
          setIsModalOpen(false);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(`Save failed: ${err.message || err.toString()}`);
    }
  };

  const handleReleaseSchedule = async () => {
    await handleSaveSchedule(undefined, "RELEASED");
  };

  const handleReopenSchedule = async () => {
    if (!selectedScheduleId) return;
    try {
      const result = await updateExecutionScheduleAction(selectedScheduleId, {
        status: "DRAFT",
        lastModifiedBy: currentUser.name
      });
      if (result) {
        setMeetingStatus("DRAFT");
        const fresh = await getExecutionSchedulesAction();
        setSchedules(fresh.filter((s: any) => s.language === "meeting"));
        showFeedback("Meeting record reopened for editing.");
      }
    } catch (err: any) {
      console.error(err);
      alert(`Reopen failed: ${err.message || err.toString()}`);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!selectedScheduleId) return;
    const s = schedules.find(x => x.id === selectedScheduleId);
    if (!s) return;

    showConfirm(
      "Delete Meeting Record",
      `Are you sure you want to delete the meeting record for "${s.projectName}"? This action cannot be undone.`,
      async () => {
        try {
          const success = await deleteExecutionScheduleAction(selectedScheduleId);
          if (success) {
            showFeedback("Meeting record removed from ledger.");
            setSelectedScheduleId(null);
            const fresh = await getExecutionSchedulesAction();
            setSchedules(fresh.filter((s: any) => s.language === "meeting"));
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
      "Delete Agenda Item",
      "Are you sure you want to delete this agenda item? This action cannot be undone.",
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
          "You have unsaved changes in this item. Are you sure you want to discard them?",
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
  const isLocked = meetingStatus === "RELEASED";

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print border-b border-slate-200 dark:border-slate-850 pb-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Open Meetings & Minutes</h1>
          <p className="text-xs text-muted-foreground">
            Log alignment sessions, cross-department governance agendas, and minutes of meetings.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#05375c] text-white hover:bg-[#074776] text-xs font-bold rounded-md shadow transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Meeting Ledger
          </button>
        )}
      </div>

      {/* Feedback notifier */}
      {feedback && (
        <div className="fixed bottom-8 right-8 z-50 flex items-center gap-2 bg-[#05375c] text-white px-4 py-3 rounded-md shadow-md text-xs font-sans font-semibold animate-slide-up border border-[#05375c] no-print">
          <span>{feedback}</span>
        </div>
      )}

      {/* Main layout */}
      <div className="space-y-6 no-print">
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
          
          {/* ActionToolbar */}
          <ActionToolbar
            onCreate={openCreateModal}
            onEdit={selectedScheduleId && activeSchedule && isScheduleOrMeetingAllowed(activeSchedule) ? () => openEditModal(activeSchedule) : undefined}
            onDelete={selectedScheduleId && activeSchedule && isScheduleOrMeetingAllowed(activeSchedule) ? handleDeleteSchedule : undefined}
            onRefresh={() => {
              setSearchQuery("");
              setProjectFilter("ALL");
              setSelectedScheduleId(null);
            }}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchPlaceholder="Search meetings..."
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
                  <th className="px-6 py-4">Meeting Date</th>
                  <th className="px-6 py-4">Facilitator</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">
                      No meetings matched filters or none have been created. Click "+" above to create a meeting alignment record.
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
                      <td className="px-6 py-4.5 font-roboto text-slate-777 dark:text-slate-300">
                        {s.projectCode}
                      </td>
                      <td 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedScheduleId(s.id);
                          openEditModal(s);
                        }}
                        className="px-6 py-4.5 text-[#0066cc] font-roboto font-medium hover:underline cursor-pointer"
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
                      <td className="px-6 py-4.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-bold ${s.status === "RELEASED" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"}`}>
                          {s.status === "RELEASED" ? "Released" : "Draft"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit/Create Popup Modal Styled Like Word Document */}
      {isModalOpen && (
        <div id="scoping-modal-root" className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 flex justify-center z-50 overflow-y-auto p-4 md:p-8 animate-fade-in no-print-backdrop">
          <div className="bg-white dark:bg-slate-955 w-full max-w-[98vw] xl:max-w-[98vw] rounded-lg shadow-2xl flex flex-col overflow-hidden h-fit border border-slate-200 dark:border-slate-850 scoping-modal-container">
            
            {/* Modal Header */}
            <div className="px-8 py-5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-roboto text-slate-400 font-bold uppercase tracking-wider">
                  DOCUMENT 2. OPEN MEETINGS
                </div>
                <h2 className="text-lg font-roboto font-bold text-slate-800 dark:text-slate-100">
                  Open Meeting Report
                </h2>
                {/* Meta details row under header */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-[10px] font-roboto text-slate-400 mt-1">
                  {modalMode === "edit" && activeSchedule ? (
                    <>
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3.5 h-3.5" /> Owner: {activeSchedule.ownerName || "System"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Edit className="w-3.5 h-3.5" /> Last Modified By: {activeSchedule.lastModifiedBy || "System"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Last Modified: {activeSchedule.updatedAt ? new Date(activeSchedule.updatedAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A"}
                      </span>
                      <span className="flex items-center gap-1">
                        <BadgeCheck className="w-3.5 h-3.5" /> Status: {meetingStatus === "RELEASED" ? "Released" : "Draft"}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3.5 h-3.5" /> Owner: {currentUser.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Date: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </>
                  )}
                </div>
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
                {!isLocked ? (
                  <button
                    type="button"
                    onClick={handleSaveSchedule}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#05375c] text-white hover:bg-[#074776] text-xs font-bold rounded cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" /> Save Changes
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleReopenSchedule}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white hover:bg-amber-600 text-xs font-bold rounded cursor-pointer"
                  >
                    <Unlock className="w-3.5 h-3.5" /> Reopen
                  </button>
                )}
                {!isLocked ? (
                  <button
                    type="button"
                    onClick={handleReleaseSchedule}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold rounded cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" /> Release
                  </button>
                ) : null}
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
            <form onSubmit={handleSaveSchedule} className={`p-8 space-y-8 overflow-y-auto max-h-[86vh] ${isLocked ? "pointer-events-none select-none opacity-70" : ""}`}>
              
              {/* Linked Audit Plan and QR Code Card */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 p-5 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                
                {/* Linked Audit Plan Left section */}
                <div className="flex-1 w-full">
                  <div className="flex border border-slate-250 dark:border-slate-800 rounded-lg overflow-hidden h-12 items-center">
                    <div className="bg-slate-50 dark:bg-slate-900/60 px-4 h-full flex items-center font-roboto font-bold text-xs text-slate-700 dark:text-slate-355 border-r border-slate-250 dark:border-slate-800 shrink-0 w-36">
                      Linked Audit Plan
                    </div>
                    <div className="px-4 h-full flex items-center flex-1 bg-white dark:bg-slate-950">
                      {modalMode === "create" ? (
                        <select
                          required
                          value={selectedProjectId}
                          onChange={(e) => handleProjectSelect(e.target.value)}
                          className="w-full bg-transparent border-none p-0 text-xs focus:outline-none cursor-pointer text-slate-800 dark:text-slate-200 font-roboto font-bold"
                        >
                          <option value="">Choose Audit Plan...</option>
                          {projects.filter(isProjectMember).map(p => (
                            <option key={p.id} value={p.id} className="bg-white dark:bg-slate-900">
                              {p.code} - {p.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs font-roboto font-bold text-slate-800 dark:text-slate-200 font-sans">
                          {projects.find(p => p.id === selectedProjectId)?.code} - {projects.find(p => p.id === selectedProjectId)?.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* QR Code Right section */}
                <div className="flex flex-col items-center gap-1.5 shrink-0 select-none">
                  {selectedScheduleId ? (
                    <>
                      <div className="relative w-[110px] h-[110px] bg-white border border-slate-200 rounded p-1 flex items-center justify-center">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                            typeof window !== "undefined" 
                              ? `${window.location.origin}/meetings?id=${selectedScheduleId}` 
                              : `/meetings?id=${selectedScheduleId}`
                          )}`} 
                          alt="QR Code" 
                          className="w-[100px] h-[100px]"
                        />
                        <div className="absolute top-[43px] left-[43px] w-6 h-6 bg-white rounded-sm p-0.5 shadow-sm border border-slate-100 flex items-center justify-center">
                          <img 
                            src="/hanuman-logo.png" 
                            alt="Logo" 
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>
                      <span className="text-[11px] font-roboto font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">
                        {(() => {
                          const clean = selectedScheduleId.replace(/-/g, "").toUpperCase();
                          return `${clean.slice(0, 5)}-${clean.slice(5, 9)}`;
                        })()}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="relative w-[110px] h-[110px] bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded p-1 flex flex-col items-center justify-center text-center text-slate-400 gap-1">
                        <BookOpen className="w-5 h-5 text-slate-350" />
                        <span className="text-[8px] font-bold uppercase tracking-wider leading-tight">Save meeting to link QR</span>
                      </div>
                      <span className="text-[11px] font-roboto font-bold uppercase tracking-widest text-slate-400">
                        PENDING-SAVE
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Document Summary Info Grid */}
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
                            className="w-full bg-transparent border-none p-0 text-xs focus:outline-none font-bold text-slate-800 dark:text-slate-100"
                          />
                        </td>
                      </tr>
                      {/* Row 3: Visit Number + Actual Visit Date */}
                      <tr className="border-b border-slate-300 dark:border-slate-800/80">

                        <td className="w-1/4 px-4 py-3 bg-slate-50 dark:bg-slate-900/60 font-bold border-r border-slate-300 dark:border-slate-800/80 text-slate-700 dark:text-slate-300">
                          Meeting Date:
                        </td>
                        <td className="px-4 py-2 bg-white-100 dark:bg-slate-900/20 font-bold text-slate-900 dark:text-white-100">
                          <input 
                            type="date" 
                            required
                            value={actualVisitDate}
                            onChange={(e) => setActualVisitDate(e.target.value)}
                            placeholder="20 July 2026"
                            className="w-full bg-transparent border-none p-0 text-xs focus:outline-none font-bold text-slate-900 dark:text-slate-100"
                          />
                        </td>
                      </tr>
                      {/* Row 5: Facilitator */}
                      <tr className="border-b border-slate-300 dark:border-slate-800/80">
                        <td className="px-4 py-3 bg-slate-50 dark:bg-slate-900/60 font-bold border-r border-slate-300 dark:border-slate-800/80 text-slate-700 dark:text-slate-300">
                          Facilitator / Organizer:
                        </td>
                        <td colSpan={3} className="px-4 py-2.5">
                          <MultiSelect
                            selectedValues={leadExecutionArray}
                            onChange={(values) => setLeadExecution(values.join(", "))}
                            options={userOptions}
                            placeholder="Select facilitators..."
                            disabled={isLocked}
                          />
                        </td>
                      </tr>


                      {/* Row 7: Attendees */}
                      <tr className="border-b border-slate-300 dark:border-slate-800/80">
                        <td className="px-4 py-3 bg-slate-50 dark:bg-slate-900/60 font-bold border-r border-slate-300 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 leading-normal">
                          Attendees:
                        </td>
                        <td colSpan={3} className="px-4 py-2.5">
                          <MultiSelect
                            selectedValues={additionalAttendeesArray}
                            onChange={(values) => setAdditionalAttendees(values.join(", "))}
                            options={userOptions}
                            placeholder="Select attendees..."
                            disabled={isLocked}
                          />
                        </td>
                      </tr>
                      {/* Row 10: OPE Objectives */}
                      <tr className="border-b border-slate-300 dark:border-slate-800/80">
                        <td className="px-4 py-3 bg-slate-50 dark:bg-slate-900/60 font-bold border-r border-slate-300 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 align-top">
                          Objective and Scope:
                        </td>
                        <td colSpan={3} className="px-4 py-3">
                          <RichEditor 
                            value={objectives}
                            onChange={setObjectives}
                            placeholder="Objectives of this alignment session..."
                            editorClassName="min-h-[160px] max-h-[300px]"
                            editable={!isLocked}
                          />
                        </td>
                      </tr>

                      {/* Row 11: OPE Scope */}
                      <tr>
                        <td className="px-4 py-3 bg-slate-50 dark:bg-slate-900/60 font-bold border-r border-slate-300 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 align-top">
                         The Concern of the Department Owner:
                        </td>
                        <td colSpan={3} className="px-4 py-3">
                          <RichEditor 
                            value={scope}
                            onChange={setScope}
                            placeholder="Functional scope of the alignment..."
                            editorClassName="min-h-[120px] max-h-[250px]"
                            editable={!isLocked}
                          />
                        </td>
                      </tr>

                    </tbody>
                  </table>
                </div>
              </div>

              {/* PDF Print Footer Note */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 text-[12px] font-roboto text-slate-400 leading-relaxed italic">
                Note: Alignment agendas and decision minutes represent binding milestones of coordinated department.
                {isLocked && <span className="not-italic text-amber-600 dark:text-amber-300">This record is released and locked. Use Reopen to edit.</span>}
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
