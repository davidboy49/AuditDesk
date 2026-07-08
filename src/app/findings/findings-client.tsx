"use client";

import { useState } from "react";
import { 
  ChevronDown, 
  ChevronUp, 
  User as UserIcon, 
  FileText,
  Lightbulb,
  X
} from "lucide-react";
import { Finding, AuditProject, User } from "@/lib/mockData";
import { updateFindingStatusAction, createFindingAction } from "@/app/actions";
import RichEditor from "@/components/ui/rich-editor";
import ActionToolbar from "@/components/ui/action-toolbar";

interface FindingsClientProps {
  initialFindings: Finding[];
  projects: AuditProject[];
  users: User[];
  currentUser: User;
}

export default function FindingsClient({ initialFindings, projects, users, currentUser }: FindingsClientProps) {
  const [findings, setFindings] = useState<Finding[]>(initialFindings);
  const [expandedFindingId, setExpandedFindingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [showCharts, setShowCharts] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("ALL");

  // New Finding form state
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [severity, setSeverity] = useState<any>("MEDIUM");
  const [description, setDescription] = useState("");
  const [recommendation, setRecommendation] = useState("");

  const toggleRow = (id: string) => {
    setExpandedFindingId(expandedFindingId === id ? null : id);
  };

  const handleUpdateStatus = async (findingId: string, newStatus: any) => {
    const updated = await updateFindingStatusAction(findingId, newStatus);
    if (updated) {
      setFindings(findings.map(f => f.id === findingId ? { ...f, status: newStatus } : f));
    }
  };

  const handleCreateFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !projectId || !severity || !description || !recommendation) return;

    const newFinding = await createFindingAction(
      title,
      description,
      severity,
      "OPEN",
      recommendation,
      projectId,
      currentUser.id
    );

    setFindings([newFinding, ...findings]);
    setIsCreating(false);
    
    // Reset form
    setTitle("");
    setProjectId("");
    setSeverity("MEDIUM");
    setDescription("");
    setRecommendation("");
  };

  // Filter logic
  const filteredFindings = findings.filter(f => {
    const matchesSearch = f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          f.projectName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = projectFilter === "ALL" || f.projectId === projectFilter;
    return matchesSearch && matchesProject;
  });

  const projectFilterOptions = projects.map(p => ({
    label: p.code,
    value: p.id
  }));

  return (
    <div className="space-y-6">
      
      {/* Title block */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Findings Ledger</h1>
        <p className="text-xs text-muted-foreground">
          Review, edit, and update active non-conformance records and security vulnerabilities.
        </p>
      </div>

      {/* visual summary graphs block when showCharts is active */}
      {showCharts && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg animate-fade-in shadow-xs">
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Total Logged</div>
            <div className="text-2xl font-bold font-mono text-[#05375c] dark:text-[#a5c1dc]">{findings.length}</div>
          </div>
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Open Vulnerabilities</div>
            <div className="text-2xl font-bold font-mono text-red-500">{findings.filter(f => f.status === "OPEN").length}</div>
          </div>
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Mitigated / Resolved</div>
            <div className="text-2xl font-bold font-mono text-green-600">{findings.filter(f => f.status === "CLOSED").length}</div>
          </div>
        </div>
      )}

      {/* Record New Finding Panel */}
      {isCreating && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Record a New Audit Finding</h3>
            <button 
              onClick={() => setIsCreating(false)}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          <form onSubmit={handleCreateFinding} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-mono text-slate-500 uppercase">Finding Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Unencrypted data transfer detected"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-500 uppercase">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-500 uppercase">Scope Project</label>
                <select
                  required
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
                >
                  <option value="">Select Audit Project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-500 uppercase">Description / Evidence</label>
              <RichEditor value={description} onChange={setDescription} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-500 uppercase">Audit Recommendation</label>
              <RichEditor value={recommendation} onChange={setRecommendation} />
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
                Publish Finding
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table & Toolbar Container */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        
        {/* Action Toolbar matching screenshot layout */}
        <ActionToolbar 
          onCreate={currentUser.role !== "AUDITEE" ? () => setIsCreating(true) : undefined}
          onChartToggle={() => setShowCharts(!showCharts)}
          onRefresh={() => {
            setSearchQuery("");
            setProjectFilter("ALL");
          }}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchPlaceholder="Search findings..."
          filterLabel="Sub Block"
          filterValue={projectFilter}
          setFilterValue={setProjectFilter}
          filterOptions={projectFilterOptions}
          activeFilterCountLabel={projectFilter === "ALL" ? "ALL" : "FILTERED"}
        />

        {/* Table layout matching screenshot */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-sans font-bold">
              <tr>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Sub Block (Project)</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Auditor</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4">Severity</th>
                <th className="px-6 py-4 text-right">Status</th>
                <th className="px-4 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredFindings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-mono">
                    No findings matching the filter criteria were found.
                  </td>
                </tr>
              ) : (
                filteredFindings.map((find) => {
                  const isExpanded = expandedFindingId === find.id;
                  
                  // Map statuses to exact color labels matching screenshot
                  let statusText = "Released";
                  let statusColor = "text-[#30b050]"; // Green
                  
                  if (find.status === "OPEN") {
                    statusText = "Open";
                    statusColor = "text-red-500";
                  } else if (find.status === "UNDER_REVIEW") {
                    statusText = "Review";
                    statusColor = "text-orange-500";
                  }

                  return (
                    <>
                      <tr 
                        key={find.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors select-none"
                      >
                        <td className="px-6 py-4.5 font-mono text-slate-800 dark:text-slate-200">
                          {find.id.split("-")[1] || "51145"}
                        </td>
                        <td className="px-6 py-4.5 text-slate-500">
                          {find.projectName?.split(" ")[0] || "General"}
                        </td>
                        <td 
                          onClick={() => toggleRow(find.id)}
                          className="px-6 py-4.5 text-[#0066cc] hover:text-[#004499] hover:underline font-medium cursor-pointer"
                        >
                          {find.title}
                        </td>
                        <td className="px-6 py-4.5 text-slate-500">
                          {find.auditorName?.toUpperCase() || "AUDITOR"}
                        </td>
                        <td className="px-6 py-4.5 text-slate-500">
                          {find.createdAt.split("T")[0]}
                        </td>
                        <td className="px-6 py-4.5">
                          <span className={`font-semibold ${
                            find.severity === "CRITICAL" ? "text-red-600 font-bold" :
                            find.severity === "HIGH" ? "text-orange-500" :
                            find.severity === "MEDIUM" ? "text-amber-500" : "text-slate-400"
                          }`}>
                            {find.severity}
                          </span>
                        </td>
                        <td className={`px-6 py-4.5 text-right font-bold ${statusColor}`}>
                          {statusText}
                        </td>
                        <td className="px-4 py-4.5" onClick={() => toggleRow(find.id)}>
                          <button className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expander block */}
                      {isExpanded && (
                        <tr className="bg-slate-50/30 dark:bg-slate-900/40">
                          <td colSpan={8} className="px-8 py-5 border-b border-slate-200 dark:border-slate-800">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              
                              {/* Details */}
                              <div className="space-y-1.5">
                                <h4 className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 pb-1">
                                  <FileText className="w-3.5 h-3.5" /> Description & Observed Details
                                </h4>
                                <div 
                                  className="prose dark:prose-invert text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-4 rounded border border-slate-200 dark:border-slate-800"
                                  dangerouslySetInnerHTML={{ __html: find.description }}
                                />
                              </div>

                              {/* Action Mitigation and recommendation */}
                              <div className="space-y-4">
                                <div className="space-y-1.5">
                                  <h4 className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 pb-1">
                                    <Lightbulb className="w-3.5 h-3.5" /> Corrective Action Plan
                                  </h4>
                                  <div 
                                    className="prose dark:prose-invert text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-4 rounded border border-slate-200 dark:border-slate-800"
                                    dangerouslySetInnerHTML={{ __html: find.recommendation }}
                                  />
                                </div>

                                {/* Status triggers */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    Set mitigation status:
                                  </div>
                                  <div className="flex gap-2">
                                    {find.status !== "OPEN" && (
                                      <button
                                        onClick={() => handleUpdateStatus(find.id, "OPEN")}
                                        className="px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 text-[10px] font-semibold rounded cursor-pointer"
                                      >
                                        Re-open
                                      </button>
                                    )}
                                    {find.status !== "UNDER_REVIEW" && (
                                      <button
                                        onClick={() => handleUpdateStatus(find.id, "UNDER_REVIEW")}
                                        className="px-2 py-1 bg-orange-500/10 border border-orange-500/20 text-orange-500 hover:bg-orange-500/20 text-[10px] font-semibold rounded cursor-pointer"
                                      >
                                        Mark Review
                                      </button>
                                    )}
                                    {find.status !== "CLOSED" && (
                                      <button
                                        onClick={() => handleUpdateStatus(find.id, "CLOSED")}
                                        className="px-2 py-1 bg-green-500/10 border border-green-500/20 text-[#30b050] hover:bg-green-500/20 text-[10px] font-bold rounded cursor-pointer"
                                      >
                                        Mitigated (Release)
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
