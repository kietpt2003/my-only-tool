import React from 'react';

import { useStore } from '@/store';
import { apiRedmine } from '@/services/apiRedmine';

interface ProjectNode {
  id: number;
  name: string;
  level: number;
  identifier?: string;
}

interface TaskNode {
  id: number;
  subject: string;
  parent?: { id: number };
  isVirtual?: boolean;
}

interface TaskOption {
  id: string | number;
  name: string;
}

interface CustomFieldConfig {
  id: number;
  options: Array<{ value: string; label: string } | string>;
}

function buildProjectTree(projects: any[]) {
  const projectMap: any = {};
  const tree: any[] = [];
  projects.forEach((p) => { projectMap[p.id] = { ...p, children: [] }; });
  projects.forEach((p) => {
    const projectType = p.custom_fields?.find((cf: any) => cf.name === "Project Type")?.value;
    let parentProject = null;
    if (p.parent?.id) parentProject = projectMap[p.parent.id];
    else if (projectType) parentProject = Object.values(projectMap).find((parent: any) => parent.name === projectType);
    if (parentProject) parentProject.children.push(projectMap[p.id]);
    else tree.push(projectMap[p.id]);
  });
  return tree;
}

function flattenProjectTree(projects: any[], level = 0) {
  let flat: ProjectNode[] = [];
  projects.forEach((p) => {
    flat.push({ id: p.id, name: p.name, level: level, identifier: p?.identifier || "" });
    if (p.children && p.children.length > 0) flat = flat.concat(flattenProjectTree(p.children, level + 1));
  });
  return flat;
}

function processTaskHierarchy(tasks: any[]) {
  if (!tasks || tasks.length === 0) return [];
  let ordered: TaskNode[] = [];
  const parents = tasks.filter((t) => !t.parent);
  const children = tasks.filter((t) => t.parent);

  parents.forEach((p) => {
    ordered.push(p);
    const subTasks = children.filter((c) => c.parent.id === p.id);
    ordered.push(...subTasks);
  });

  children.forEach((c) => {
    if (!ordered.find((ot) => ot.id === c.id)) {
      const alreadyAddedParent = ordered.find((ot) => ot.id === c.parent.id);
      if (!alreadyAddedParent) {
        ordered.push({ id: c.parent.id, subject: c.parent.subject || `PARENT TASK #${c.parent.id}`, isVirtual: true });
      }
      ordered.push(c);
    }
  });
  return ordered;
}

const RedmineCreateTaskTab: React.FC = () => {
  const {
    redmineUserStore: {
      redmineUrl
    }
  } = useStore();
  const redmineBaseUrl = redmineUrl || '#';

  const [allProjects, setAllProjects] = React.useState<ProjectNode[]>([]);
  const [allTasks, setAllTasks] = React.useState<TaskNode[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = React.useState<boolean>(true);
  const [trackers, setTrackers] = React.useState<TaskOption[]>([]);
  const [statuses, setStatuses] = React.useState<TaskOption[]>([]);
  const [priorities, setPriorities] = React.useState<TaskOption[]>([]);
  const [assignees, setAssignees] = React.useState<TaskOption[]>([]);
  const [doneRatios, setDoneRatios] = React.useState<TaskOption[]>([]);
  const [customFieldConfigs, setCustomFieldConfigs] = React.useState<Record<string, CustomFieldConfig>>({});
  const [isLoadingOptions, setIsLoadingOptions] = React.useState<boolean>(false);
  const [projectSearch, setProjectSearch] = React.useState<string>('');
  const [taskSearch, setTaskSearch] = React.useState<string>('');
  const [showProjectList, setShowProjectList] = React.useState<boolean>(false);
  const [showTaskList, setShowTaskList] = React.useState<boolean>(false);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('');
  const [selectedParentTaskId, setSelectedParentTaskId] = React.useState<string>('');
  const [subject, setSubject] = React.useState<string>('');
  const [trackerId, setTrackerId] = React.useState<string>('');
  const [statusId, setStatusId] = React.useState<string>('');
  const [priorityId, setPriorityId] = React.useState<string>('2'); // Default Normal
  const [assigneeId, setAssigneeId] = React.useState<string>('');
  const [doneRatio, setDoneRatio] = React.useState<string>('0');
  const [epicType, setEpicType] = React.useState<string>('');
  const [wbs, setWbs] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  const isFormDisabled = !selectedProjectId || isLoadingOptions;

  const projectRef = React.useRef<HTMLDivElement>(null);
  const taskRef = React.useRef<HTMLDivElement>(null);

  const fetchTasksAndOptions = async (projectId: string) => {
    setIsLoadingOptions(true);
    setAllTasks([]);

    // Reset defaults
    setTrackerId('5');
    setPriorityId('2');
    setDoneRatio('0');
    setAssigneeId('');
    setEpicType('');
    setWbs('');
    setCustomFieldConfigs({});

    try {
      const resTasks = await apiRedmine.getProjectTasks(projectId);
      if (resTasks.data?.tasks) {
        setAllTasks(processTaskHierarchy(resTasks.data.tasks));
      }

      const resOpt = await apiRedmine.getProjectTaskOptions(projectId);
      const dataOpt = resOpt.data?.data;
      if (dataOpt) {
        setTrackers(dataOpt.trackers || []);
        setPriorities(dataOpt.priorities || []);
        setDoneRatios(dataOpt.doneRatios || []);
        setCustomFieldConfigs(dataOpt.customFields || {});

        const assigneesList = dataOpt.assignees || [];
        setAssignees(assigneesList);

        const meOption = assigneesList.find((a: any) => a.name.includes("<< me >>"));
        if (meOption) setAssigneeId('me');
      }
    } catch (err) {
      console.error("Failed to fetch task options", err);
    } finally {
      setIsLoadingOptions(false);
    }
  };

  const handleSelectProject = (proj: ProjectNode) => {
    setSelectedProjectId(proj.id.toString());
    setProjectSearch(`[${proj.id}] ${proj.name}`);
    setShowProjectList(false);

    setSelectedParentTaskId('');
    setTaskSearch('');

    fetchTasksAndOptions(proj.id.toString());
  };

  const handleSelectTask = (task: TaskNode | null) => {
    if (!task) {
      setSelectedParentTaskId('');
      setTaskSearch('-- No Parent (Main Task) --');
    } else {
      setSelectedParentTaskId(task.id.toString());
      setTaskSearch(`[${task.id}] ${task.subject}`);
    }
    setShowTaskList(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !subject) {
      alert("Please select a project and enter a subject.");
      return;
    }

    setIsSubmitting(true);
    try {
      const custom_fields: Array<{ id: number; value: string }> = [];

      if (epicType && customFieldConfigs["Epic Type"]) {
        custom_fields.push({ id: customFieldConfigs["Epic Type"].id, value: epicType });
      }
      if (wbs && customFieldConfigs["WBS"]) {
        custom_fields.push({ id: customFieldConfigs["WBS"].id, value: wbs });
      }

      const payload = {
        project_id: selectedProjectId,
        subject: subject,
        parent_issue_id: selectedParentTaskId || null,
        tracker_id: trackerId,
        status_id: statusId,
        priority_id: priorityId,
        assigned_to_id: assigneeId || undefined,
        done_ratio: doneRatio ? parseInt(doneRatio, 10) : undefined,
        custom_fields: custom_fields.length > 0 ? custom_fields : undefined,
      };

      const res = await apiRedmine.createTask(payload);

      if (res.status === 200 || res.status === 201) {
        alert("✅ Task Created!");
        setSubject('');
        fetchTasksAndOptions(selectedProjectId); // Refresh list
      } else {
        alert("Failed to create task.");
      }
    } catch (error: any) {
      console.error("Error creating task:", error);
      alert(`❌ Error: ${error.response?.data?.message || 'Failed to create task.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim() || !text) return text;
    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${safeQuery})`, 'gi');
    return text.toString().split(regex).map((part, idx) =>
      regex.test(part) ? <mark key={idx} className="bg-yellow-200 text-slate-900 rounded-sm px-0.5">{part}</mark> : part
    );
  };

  const getCustomFieldOptions = (fieldName: string) => {
    const config = customFieldConfigs[fieldName];
    if (!config || !config.options) return [];

    return config.options.map((opt: any) => {
      // Ép kiểu chuẩn: Xử lý trường hợp opt là string hoặc object lồng
      let rawValue = opt.value ?? opt;
      let rawLabel = opt.label ?? opt;

      // Nếu rawValue/rawLabel vô tình vẫn là một Object {id, name}, bóc tách nó ra
      const finalValue = typeof rawValue === 'object' && rawValue !== null ? rawValue.value || rawValue.name || rawValue.id : rawValue;
      const finalLabel = typeof rawLabel === 'object' && rawLabel !== null ? rawLabel.label || rawLabel.name || rawLabel.id : rawLabel;

      return {
        value: String(finalValue),
        label: String(finalLabel)
      };
    });
  };

  const filteredProjects = allProjects.filter(p =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
    p.id.toString().includes(projectSearch.toLowerCase())
  );

  const filteredTasks = allTasks.filter(t =>
    t.subject.toLowerCase().includes(taskSearch.toLowerCase()) ||
    t.id.toString().includes(taskSearch.toLowerCase())
  );

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectRef.current && !projectRef.current.contains(event.target as Node)) {
        setShowProjectList(false);
      }
      if (taskRef.current && !taskRef.current.contains(event.target as Node)) {
        setShowTaskList(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. LOAD PROJECT BAN ĐẦU
  React.useEffect(() => {
    let isMounted = true;
    const loadInitData = async () => {
      try {
        const resProj = await apiRedmine.getProjects();
        if (isMounted && resProj.data?.projects) {
          const projectTree = buildProjectTree(resProj.data.projects);
          const flatProjects = flattenProjectTree(projectTree);
          setAllProjects(flatProjects);
        }

        const resStatus = await apiRedmine.getStatuses();
        if (isMounted && resStatus.data?.statuses) {
          setStatuses(resStatus.data.statuses);
          const newStatus = resStatus.data.statuses.find((s: any) => s.name.toLowerCase() === 'new') || resStatus.data.statuses[0];
          if (newStatus) setStatusId(newStatus.id.toString());
        }
      } catch (error) {
        console.error("Failed to load initial data", error);
      } finally {
        if (isMounted) setIsLoadingProjects(false);
      }
    };
    loadInitData();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide pb-2 border-b border-slate-100 flex items-center gap-2">
        <span className="text-lg">🆕</span> Create New Task / Sub-task
      </h3>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs max-w-4xl space-y-6">

        {/* EXPLORER STYLE: PROJECT */}
        <div className="space-y-1.5 relative" ref={projectRef}>
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Target Project <span className="text-rose-500">*</span></label>
          <input
            type="text"
            placeholder={isLoadingProjects ? "Loading projects..." : "🔍 Search project name or ID..."}
            disabled={isLoadingProjects}
            value={projectSearch}
            onChange={e => { setProjectSearch(e.target.value); setShowProjectList(true); }}
            onFocus={() => setShowProjectList(true)}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:border-teal-500 transition-colors"
          />

          {showProjectList && (
            <div className="absolute z-50 w-full mt-1 max-h-[300px] overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl py-1">
              {filteredProjects.map(p => (
                <div
                  key={`p-${p.id}`}
                  onClick={() => handleSelectProject(p)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-teal-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0"
                  style={{ paddingLeft: `${p.level * 16 + 12}px` }}
                >
                  <span className="text-slate-400 text-xs">{p.level === 0 ? "📂" : "📁"}</span>
                  <span className="text-xs font-bold text-slate-800 truncate">
                    <a href={`${redmineBaseUrl}/projects/${p?.identifier || p.id}`} target="_blank" rel="noreferrer" className="text-teal-600 hover:underline px-1 py-0.5 bg-slate-100 rounded" onClick={e => e.stopPropagation()}>
                      #{highlightText(p.id.toString(), projectSearch)}
                    </a>
                    <span className="ml-1.5">{highlightText(p.name, projectSearch)}</span>
                  </span>
                </div>
              ))}
              {filteredProjects.length === 0 && <div className="p-3 text-center text-xs text-slate-400">No project found.</div>}
            </div>
          )}
        </div>

        {/* EXPLORER STYLE: PARENT TASK */}
        <div className="space-y-1.5 relative" ref={taskRef}>
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Parent Task (Optional)</label>
          <input
            type="text"
            placeholder={!selectedProjectId ? "🔍 Search task name or #ID..." : "🔍 Search task name or #ID..."}
            disabled={isFormDisabled}
            value={taskSearch}
            onChange={e => { setTaskSearch(e.target.value); setShowTaskList(true); }}
            onFocus={() => setShowTaskList(true)}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:border-teal-500 transition-colors disabled:opacity-50 disabled:bg-slate-100"
          />

          {showTaskList && selectedProjectId && (
            <div className="absolute z-50 w-full mt-1 max-h-[300px] overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl py-1">
              <div onClick={() => handleSelectTask(null)} className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 border-b border-slate-100 cursor-pointer">
                -- No Parent (Main Task) --
              </div>

              {isLoadingOptions ? (
                <div className="p-4 text-center text-xs text-slate-400 animate-pulse">Loading tasks...</div>
              ) : (
                filteredTasks.map(t => (
                  <div
                    key={`t-${t.id}`}
                    onClick={() => handleSelectTask(t)}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-teal-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0"
                  >
                    <span className="text-slate-400 text-[10px]">{t.parent ? "\u00A0\u00A0\u00A0\u00A0🔹" : "📦"}</span>
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      <a href={`${redmineBaseUrl}/issues/${t.id}`} target="_blank" rel="noreferrer" className="text-teal-600 font-mono hover:underline px-1 py-0.5 bg-slate-100 rounded" onClick={e => e.stopPropagation()}>
                        #{highlightText(t.id.toString(), taskSearch)}
                      </a>
                      <span className="ml-1.5">{highlightText(t.subject, taskSearch)}</span>
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <hr className="border-slate-100" />

        {/* TASK SUBJECT */}
        <div className="space-y-1.5 relative">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Task Subject <span className="text-rose-500">*</span></label>
          <input
            type="text"
            required
            disabled={isFormDisabled}
            placeholder="Enter task title..."
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-teal-500 disabled:opacity-50 disabled:bg-slate-50 transition-colors"
          />
          {isLoadingOptions && (
            <div className="absolute top-1/2 right-3 translate-y-[-20%] text-slate-400 animate-spin text-sm">↻</div>
          )}
        </div>

        {/* 2-COLUMN LAYOUT ROWS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Tracker <span className="text-rose-500">*</span></label>
            <select required disabled={isFormDisabled} value={trackerId} onChange={e => setTrackerId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-teal-500 disabled:opacity-50 disabled:bg-slate-50 cursor-pointer">
              {trackers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Status <span className="text-rose-500">*</span></label>
            <select disabled value={statusId} onChange={e => setStatusId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-100 text-slate-500 font-bold outline-none cursor-not-allowed disabled:opacity-70">
              {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Priority <span className="text-rose-500">*</span></label>
            <select disabled={isFormDisabled} value={priorityId} onChange={e => setPriorityId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-teal-500 disabled:opacity-50 disabled:bg-slate-50 cursor-pointer">
              {priorities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Assignee</label>
            <select disabled={isFormDisabled} value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-teal-500 disabled:opacity-50 disabled:bg-slate-50 cursor-pointer">
              <option value="">-- Unassigned --</option>
              {assignees.map((m, idx) => <option key={`${m.id}-${idx}`} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">% Done</label>
            <select disabled={isFormDisabled} value={doneRatio} onChange={e => setDoneRatio(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-teal-500 disabled:opacity-50 disabled:bg-slate-50 cursor-pointer">
              {doneRatios.map(dr => <option key={dr.id} value={dr.id}>{dr.name}</option>)}
              {doneRatios.length === 0 && <option value="0">0 %</option>}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Epic Type</label>
            <select disabled={isFormDisabled} value={epicType} onChange={e => setEpicType(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-teal-500 disabled:opacity-50 disabled:bg-slate-50 cursor-pointer">
              <option value="">-- Select Epic Type --</option>
              {getCustomFieldOptions("Epic Type").map((opt: any, idx) => (
                <option key={idx} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">WBS</label>
            <select disabled={isFormDisabled} value={wbs} onChange={e => setWbs(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-teal-500 disabled:opacity-50 disabled:bg-slate-50 cursor-pointer">
              <option value="">-- Select WBS --</option>
              {getCustomFieldOptions("WBS").map((opt: any, idx) => (
                <option key={idx} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5"></div>

        </div>

        <button
          type="submit"
          disabled={isFormDisabled || isSubmitting}
          className="w-full mt-2 py-3 bg-slate-900 hover:bg-teal-600 text-white font-bold rounded-lg text-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex justify-center items-center gap-2"
        >
          {isSubmitting ? <><span className="animate-spin text-lg leading-none">↻</span> Creating...</> : 'Create Task'}
        </button>

      </form>
    </div>
  );
};

export default RedmineCreateTaskTab;
