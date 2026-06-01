import React from 'react';

import { useStore } from '@/store';
import { apiRedmine } from '@/services/apiRedmine';

interface Task {
  id: number;
  subject: string;
  status: { id: number; name: string };
  tracker: { id: number; name: string };
  assigned_to?: { id: number; name: string };
  spent_hours?: number;
  project?: { id: number; name: string };
  subtasks?: Task[];
}

interface ProjectTree {
  id: number;
  name: string;
  identifier?: string;
  tasks?: Task[];
  subProjects?: ProjectTree[];
}

let cachedProjectTree: ProjectTree[] | null = null;
let cachedLastUpdated: string = 'Never';
let cachedOnlyMyTasks: boolean = false;

const RedmineExplorerTab: React.FC = () => {
  const {
    redmineUserStore: {
      redmineUrl
    },
    draftStore: {
      activities,
      loadActivities,
      loadDraftsFromServer
    }
  } = useStore();
  const redmineBaseUrl = redmineUrl || '#';

  const [globalProjectTreeData, setGlobalProjectTreeData] = React.useState<ProjectTree[] | null>(cachedProjectTree);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = React.useState<string>(cachedLastUpdated);

  const [onlyMyTasks, setOnlyMyTasks] = React.useState<boolean>(cachedOnlyMyTasks);
  const [searchProjectQuery, setSearchProjectQuery] = React.useState<string>('');
  const [searchTaskQuery, setSearchTaskQuery] = React.useState<string>('');
  const [expandedNodes, setExpandedNodes] = React.useState<Record<string, boolean>>({});

  const [isLogTimeModalOpen, setIsLogTimeModalOpen] = React.useState<boolean>(false);
  const [selectedTaskForLog, setSelectedTaskForLog] = React.useState<Task | null>(null);
  const [logHours, setLogHours] = React.useState<string>('');
  const [logDate, setLogDate] = React.useState<string>('');
  const [logActivity, setLogActivity] = React.useState<string>('');
  const [logComments, setLogComments] = React.useState<string>('');
  const [isLoggingTime, setIsLoggingTime] = React.useState<boolean>(false);

  const fetchFullProjectTree = async (forceReload: boolean = false, isOnlyMyTasks: boolean = onlyMyTasks) => {
    if (!forceReload && cachedProjectTree) {
      setGlobalProjectTreeData(cachedProjectTree);
      setLastUpdated(cachedLastUpdated);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRedmine.getFullProjectTree(forceReload, isOnlyMyTasks);
      if (response.data) {
        const newData = response.data;

        const now = new Date();
        const pad = (num: number) => String(num).padStart(2, '0');
        const formattedTime = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

        cachedProjectTree = newData;
        cachedLastUpdated = formattedTime;
        cachedOnlyMyTasks = isOnlyMyTasks;

        setGlobalProjectTreeData(newData);
        setLastUpdated(formattedTime);
        setExpandedNodes({});
      }
    } catch (error) {
      console.error("Failed to fetch project tree:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMyTasks = (checked: boolean) => {
    setOnlyMyTasks(checked);
    fetchFullProjectTree(true, checked);
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim() || !text) return text;
    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${safeQuery})`, 'gi');
    return text.toString().split(regex).map((part, idx) =>
      regex.test(part) ? <mark key={idx} className="bg-yellow-200 text-slate-900 rounded-sm px-0.5">{part}</mark> : part
    );
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-teal-50', 'border-teal-400');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('bg-teal-50', 'border-teal-400');
  };

  const handleDropTask = async (e: React.DragEvent<HTMLDivElement>, task: Task) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-teal-50', 'border-teal-400');

    const dragDataString = e.dataTransfer.getData('application/json');
    if (!dragDataString) return;

    try {
      const draftData = JSON.parse(dragDataString);
      const parentTaskId = task.id;
      const projectId = task.project?.id;

      if (!draftData._id) return;

      if (confirm(`🤖 Automation: \n\nCreate sub-task "${draftData.subject}" for Task #${parentTaskId}. Then log ${draftData.hours}h on ${draftData.spentOn}\n\nProcess now?`)) {
        setIsLoading(true);
        const res = await apiRedmine.executeDraftPipeline({
          draftId: draftData._id,
          parentTaskId: parentTaskId,
          projectId: projectId || 0,
          activityId: draftData.activityId,
          trackerId: draftData.trackerId,
        });

        if (res.data?.success) {
          alert(`🎉 ${res.data.message}\nTask #${res.data.data.newTaskId} created.`);
          await loadDraftsFromServer();

          const newTask = res.data.data.newTask;
          if (newTask) {
            setGlobalProjectTreeData(prevTree => {
              if (!prevTree) return prevTree;

              const insertNewTaskIntoTree = (tree: ProjectTree[]): ProjectTree[] => {
                return tree.map(proj => {
                  const insertIntoTasks = (tasks: Task[]): Task[] => {
                    return tasks.map(t => {
                      if (t.id === parentTaskId) {
                        return { ...t, subtasks: [newTask, ...(t.subtasks || [])] };
                      }
                      if (t.subtasks && t.subtasks.length > 0) {
                        return { ...t, subtasks: insertIntoTasks(t.subtasks) };
                      }
                      return t;
                    });
                  };

                  const updatedTasks = insertIntoTasks(proj.tasks || []);
                  const updatedSubProjects = proj.subProjects ? insertNewTaskIntoTree(proj.subProjects) : [];

                  return { ...proj, tasks: updatedTasks, subProjects: updatedSubProjects };
                });
              };

              const updatedTree = insertNewTaskIntoTree(prevTree);
              cachedProjectTree = updatedTree;
              return updatedTree;
            });

            setExpandedNodes(prev => ({ ...prev, [`t-${parentTaskId}`]: true }));
          }

        } else {
          alert(`❌ Error: ${res.data?.message || 'Automation failed'}`);
        }
      }
    } catch (error) {
      console.error("Drop processing failed", error);
      alert("Format error or Network error.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenLogTimeModal = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setSelectedTaskForLog(task);
    setLogDate(new Date().toLocaleDateString('en-CA'));
    setLogHours('');
    setLogComments('');
    setLogActivity('');
    setIsLogTimeModalOpen(true);
  };

  const handleLogTimeSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!selectedTaskForLog || !logHours || !logActivity || !logDate) {
      alert("Please enter hours, activity, and date!");
      return;
    }

    setIsLoggingTime(true);
    try {
      const addedHours = parseFloat(logHours);
      const res = await apiRedmine.logTime({
        issue_id: selectedTaskForLog.id,
        hours: addedHours,
        spent_on: logDate,
        activity_id: logActivity,
        comments: logComments
      });

      if (res.status === 200 || res.status === 201) {
        alert("🕒 Time logged successfully!");
        setIsLogTimeModalOpen(false);

        setGlobalProjectTreeData(prevTree => {
          if (!prevTree) return prevTree;

          const updateTasks = (tasks: Task[]): { updatedTasks: Task[], isFound: boolean } => {
            let isFoundInThisBranch = false;
            const newTasks = tasks.map(t => {
              if (t.id === selectedTaskForLog.id) {
                isFoundInThisBranch = true;
                return { ...t, spent_hours: (t.spent_hours || 0) + addedHours };
              }
              if (t.subtasks && t.subtasks.length > 0) {
                const { updatedTasks: newSubtasks, isFound: foundInSub } = updateTasks(t.subtasks);
                if (foundInSub) {
                  isFoundInThisBranch = true;
                  return { ...t, subtasks: newSubtasks, spent_hours: (t.spent_hours || 0) + addedHours };
                }
                return { ...t, subtasks: newSubtasks };
              }
              return t;
            });
            return { updatedTasks: newTasks, isFound: isFoundInThisBranch };
          };

          const updateProjects = (projects: ProjectTree[]): ProjectTree[] => {
            return projects.map(proj => {
              const { updatedTasks: newTasks } = updateTasks(proj.tasks || []);
              const newSubProjects = proj.subProjects ? updateProjects(proj.subProjects) : [];
              return { ...proj, tasks: newTasks, subProjects: newSubProjects };
            });
          };

          const updatedTree = updateProjects(prevTree);
          cachedProjectTree = updatedTree;
          return updatedTree;
        });
      }
    } catch (error) {
      console.error("Log time failed", error);
      alert("Failed to log time. Please check your connection or permission.");
    } finally {
      setIsLoggingTime(false);
    }
  };

  const renderTasks = (tasks: Task[], parentLevel: number = 0) => {
    if (!tasks || tasks.length === 0) return null;

    return (
      <div className="space-y-1 mt-1">
        {tasks.map(task => {
          const hasChildren = task.subtasks && task.subtasks.length > 0;
          const isExpanded = expandedNodes[`t-${task.id}`];

          return (
            <div key={`task-${task.id}`} className="ml-4 pl-3 border-l border-slate-200">
              <div
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border border-transparent hover:bg-slate-50 hover:border-slate-200 hover:shadow-xs transition-all group ${hasChildren ? 'cursor-pointer' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDropTask(e, task)}
                onClick={() => hasChildren ? toggleNode(`t-${task.id}`) : null}
              >
                <span className={`text-[10px] text-slate-400 w-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : 'rotate-0'}`}>
                  {hasChildren ? '▶' : '•'}
                </span>

                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 font-mono rounded border border-slate-200 shrink-0">
                  <a href={`${redmineBaseUrl}/issues/${task.id}`} target="_blank" rel="noreferrer" className="hover:text-teal-600 hover:underline" onClick={e => e.stopPropagation()}>
                    #{highlightText(task.id.toString(), searchTaskQuery)}
                  </a>
                </span>

                <span className="text-xs font-semibold text-slate-700 truncate min-w-0 flex-1 group-hover:text-teal-700">
                  {highlightText(task.subject, searchTaskQuery)}
                </span>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-slate-500 font-medium px-2 bg-slate-50 border border-slate-100 rounded-full hidden sm:block">
                    {task.tracker?.name || 'Task'}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${task.status?.name.toLowerCase().includes('closed') ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'}`}>
                    {task.status?.name || 'Open'}
                  </span>
                  <span className="text-[10px] font-mono text-teal-600 font-bold bg-teal-50 px-1.5 rounded">
                    {Number(task.spent_hours || 0).toFixed(1)}h
                  </span>

                  <button
                    onClick={(e) => handleOpenLogTimeModal(e, task)}
                    title="Quick Log Time"
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 cursor-pointer text-base hover:scale-110 active:scale-95"
                  >
                    🕒
                  </button>
                </div>
              </div>

              {isExpanded && hasChildren && (
                <div className="mt-1">
                  {renderTasks(task.subtasks || [], parentLevel + 1)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderProjects = (projects: ProjectTree[], parentLevel: number = 0) => {
    if (!projects || projects.length === 0) return null;

    return (
      <div className="space-y-3">
        {projects.map(proj => {
          const isExpanded = expandedNodes[`p-${proj.id}`];
          const hasChildren = (proj.subProjects && proj.subProjects.length > 0) || (proj.tasks && proj.tasks.length > 0);

          return (
            <div key={`proj-${proj.id}`} className="bg-slate-50/50 border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div
                onClick={() => toggleNode(`p-${proj.id}`)}
                className="flex items-center justify-between px-3 py-2 bg-slate-100/80 hover:bg-teal-50 border-b border-transparent cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-xs text-slate-500 w-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : 'rotate-0'}`}>
                    {hasChildren ? '▶' : '•'}
                  </span>
                  <span className="text-sm">📁</span>
                  <span className="text-xs font-bold text-slate-800">
                    <a href={`${redmineBaseUrl}/projects/${proj.identifier || proj.id}`} target="_blank" rel="noreferrer" className="text-teal-700 hover:underline" onClick={e => e.stopPropagation()}>
                      #{highlightText(proj.id.toString(), searchProjectQuery)}
                    </a>
                    <span className="ml-1">{highlightText(proj.name, searchProjectQuery)}</span>
                  </span>
                </div>
                <span className="bg-white border border-slate-200 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                  {proj.tasks?.length || 0} Tasks
                </span>
              </div>

              {isExpanded && (
                <div className="p-2 space-y-2 bg-white">
                  {proj.subProjects && proj.subProjects.length > 0 && (
                    <div className="ml-2 pl-2 border-l-2 border-slate-100">
                      {renderProjects(proj.subProjects, parentLevel + 1)}
                    </div>
                  )}

                  {proj.tasks && proj.tasks.length > 0 && (
                    <div className="ml-1">
                      {renderTasks(proj.tasks, parentLevel)}
                    </div>
                  )}

                  {!hasChildren && (
                    <div className="text-xs text-slate-400 italic px-8 py-2">Folder is empty</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const filteredTree = React.useMemo(() => {
    if (!globalProjectTreeData) return [];
    const pName = searchProjectQuery.trim().toLowerCase();
    const tName = searchTaskQuery.trim().toLowerCase();

    const filterTasks = (tasks: Task[]): Task[] => {
      if (!tName) return tasks;
      return tasks.reduce((acc: Task[], task) => {
        const matchSelf = task.subject.toLowerCase().includes(tName) || task.id.toString().includes(tName);
        const filteredSubtasks = filterTasks(task.subtasks || []);
        if (matchSelf || filteredSubtasks.length > 0) {
          acc.push({ ...task, subtasks: filteredSubtasks });
        }
        return acc;
      }, []);
    };

    const filterProjects = (projects: ProjectTree[]): ProjectTree[] => {
      return projects.reduce((acc: ProjectTree[], p) => {
        const filteredTasks = filterTasks(p.tasks || []);
        const filteredSubProjects = filterProjects(p.subProjects || []);
        const matchPName = !pName || p.name.toLowerCase().includes(pName) || p.id.toString().includes(pName);
        const hasTasks = filteredTasks.length > 0;
        const hasSubProjects = filteredSubProjects.length > 0;

        let keep = false;
        if (pName && tName) {
          keep = hasSubProjects || (matchPName && hasTasks);
        } else if (pName) {
          keep = matchPName || hasSubProjects;
        } else if (tName) {
          keep = hasTasks || hasSubProjects;
        } else {
          keep = true;
        }

        if (keep) {
          acc.push({ ...p, tasks: filteredTasks, subProjects: filteredSubProjects });
        }
        return acc;
      }, []);
    };

    const resultTree = filterProjects(globalProjectTreeData);

    if ((pName || tName) && resultTree.length > 0 && !isLoading) {
      const newExpandedState: Record<string, boolean> = {};
      const autoExpandProject = (projects: ProjectTree[]) => {
        projects.forEach(p => {
          newExpandedState[`p-${p.id}`] = true;
          if (p.tasks && tName) {
            p.tasks.forEach(t => { if (t.subtasks && t.subtasks.length > 0) newExpandedState[`t-${t.id}`] = true; });
          }
          if (p.subProjects) autoExpandProject(p.subProjects);
        });
      };
      autoExpandProject(resultTree);
      setExpandedNodes(newExpandedState);
    }
    return resultTree;
  }, [globalProjectTreeData, searchProjectQuery, searchTaskQuery, isLoading]);

  React.useEffect(() => {
    if (!cachedProjectTree) {
      fetchFullProjectTree(false, onlyMyTasks);
    }
  }, []);

  React.useEffect(() => {
    if (activities.length === 0) {
      loadActivities();
    }
  }, []);

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex flex-col xl:flex-row gap-3 justify-between items-start xl:items-center pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchFullProjectTree(true, onlyMyTasks)}
            disabled={isLoading}
            className="px-4 py-2 bg-slate-900 hover:bg-teal-600 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-md"
          >
            <svg
              className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span>Sync Now</span>
          </button>
          <label className="flex items-center gap-2 cursor-pointer bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors">
            <input
              type="checkbox"
              checked={onlyMyTasks}
              onChange={(e) => handleToggleMyTasks(e.target.checked)}
              className="accent-teal-600 cursor-pointer w-4 h-4 rounded"
            />
            Only My Tasks
          </label>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full xl:w-auto">
          <input
            type="text"
            placeholder="🔍 Search Project Name or #ID..."
            value={searchProjectQuery}
            onChange={e => setSearchProjectQuery(e.target.value)}
            className="flex-1 w-full sm:w-60 px-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white outline-none focus:border-teal-500 shadow-xs"
          />
          <input
            type="text"
            placeholder="🔍 Search Task Subject or #ID..."
            value={searchTaskQuery}
            onChange={e => setSearchTaskQuery(e.target.value)}
            className="flex-1 w-full sm:w-60 px-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white outline-none focus:border-teal-500 shadow-xs"
          />
        </div>
      </div>
      <div className="flex justify-between items-center text-xs font-medium text-slate-500">
        <div>
          Last synced: <span className="font-bold text-slate-700">{lastUpdated}</span>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setExpandedNodes({})} className="text-teal-600 font-bold hover:underline cursor-pointer">Collapse All</button>
        </div>
      </div>
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 overflow-y-auto relative min-h-[500px]">
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-2xl">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin mb-3"></div>
            <div className="text-sm font-bold text-slate-700">Retrieving the latest data from Redmine...</div>
            <div className="text-xs text-slate-500 mt-1">Please wait, caching large tasks may take a while.</div>
          </div>
        )}
        {filteredTree.length === 0 && !isLoading ? (
          <div className="text-center py-16">
            <span className="text-4xl block mb-2">🍃</span>
            <div className="text-sm text-slate-500 font-medium">
              {(searchProjectQuery || searchTaskQuery)
                ? "No matching data found"
                : "No projects to display. Try to sync Redmine."}
            </div>
          </div>
        ) : (
          renderProjects(filteredTree)
        )}
      </div>

      {isLogTimeModalOpen && selectedTaskForLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleLogTimeSubmit}
            className="bg-white max-w-md w-full p-6 rounded-2xl border border-slate-200 shadow-2xl space-y-4 animate-[scaleIn_0.2s_ease-out]"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">🕒 Quick Log Time</h3>
              <button
                type="button"
                onClick={() => setIsLogTimeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-1 mb-2">
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Target Task</div>
              <div className="text-sm font-semibold text-slate-800 break-words leading-snug">
                <span className="text-teal-600">#{selectedTaskForLog.id}</span> - {selectedTaskForLog.subject}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Date</label>
                <input
                  type="date"
                  required
                  value={logDate}
                  onChange={e => setLogDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:border-teal-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Hours</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="24"
                  required
                  placeholder="e.g., 2.5"
                  value={logHours}
                  onChange={e => setLogHours(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Activity</label>
              <select
                required
                value={logActivity}
                onChange={e => setLogActivity(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="">-- Select an activity --</option>
                {activities.map(act => (
                  <option key={act.id} value={act.id}>{act.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Comment (Optional)</label>
              <input
                type="text"
                placeholder="What did you do?"
                value={logComments}
                onChange={e => setLogComments(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:border-teal-500"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setIsLogTimeModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoggingTime}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex justify-center items-center gap-2"
              >
                {isLoggingTime ? <span className="animate-pulse">Saving...</span> : 'Save Log Time'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default RedmineExplorerTab;
