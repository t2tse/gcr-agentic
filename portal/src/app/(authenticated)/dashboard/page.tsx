"use client";
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { useLists } from '@/lib/lists-context';

export default function DashboardPage() {
    const { user, getToken } = useAuth();
    const { lists, refreshLists } = useLists();
    const [taskStats, setTaskStats] = useState<any>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [sortBy, setSortBy] = useState('dueDate');
    const [isSortOpen, setIsSortOpen] = useState(false);

    const sortedTasks = useMemo(() => {
        return [...tasks].sort((a, b) => {
            if (sortBy === 'dueDate') {
                const dateA = a.dueDate || '9999-12-31';
                const dateB = b.dueDate || '9999-12-31';
                return dateA.localeCompare(dateB);
            }
            if (sortBy === 'priority') {
                const priorityMap: any = { high: 3, medium: 2, low: 1 };
                const pA = priorityMap[a.priority] || 0;
                const pB = priorityMap[b.priority] || 0;
                return pB - pA;
            }
            if (sortBy === 'newest') {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            }
            if (sortBy === 'oldest') {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateA - dateB;
            }
            return 0;
        });
    }, [tasks, sortBy]);

    // Quick Add Modal State
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDescription, setNewTaskDescription] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState('medium');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');
    const [selectedListId, setSelectedListId] = useState('inbox');

    // Inline Edit State
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: ''
    });

    const refreshData = () => {
        if (user) {
            const getTokenFn = async () => {
                const token = await getToken();
                return token || null;
            };
            api.checkmate.getStats(getTokenFn).then(res => setTaskStats(res.data)).catch(console.error);
            api.checkmate.getTasks(getTokenFn, undefined, 'todo').then(res => setTasks(res.data)).catch(console.error);
        }
    };

    useEffect(() => {
        refreshData();
    }, [user, getToken]);

    // Handle Quick Add Submit
    const handleQuickAdd = async () => {
        if (!newTaskTitle.trim()) return;
        try {
            const getTokenFn = async () => {
                const token = await getToken();
                return token || null;
            };
            await api.checkmate.createTask(getTokenFn, {
                title: newTaskTitle,
                description: newTaskDescription,
                priority: newTaskPriority,
                dueDate: newTaskDueDate || undefined,
                listId: selectedListId === 'inbox' ? undefined : selectedListId
            });

            // Reset and Close
            setNewTaskTitle('');
            setNewTaskDescription('');
            setNewTaskPriority('medium');
            setNewTaskDueDate('');
            setIsQuickAddOpen(false);

            refreshData();
            refreshLists();
        } catch (e) {
            console.error(e);
        }
    };

    const toggleTask = async (task: any) => {
        const status = task.status === 'done' ? 'todo' : 'done';
        // Optimistic update
        setTasks(tasks.map(t => t.id === task.id ? { ...t, status } : t));
        try {
            const getTokenFn = async () => {
                const token = await getToken();
                return token || null;
            };
            await api.checkmate.updateTask(getTokenFn, task.id, { status });
            // refreshData will happen eventually or on navigation, but we updated optimistically
            refreshData();
            refreshLists();
        } catch (e) {
            console.error(e);
            refreshData(); // Revert
        }
    };

    const startEditing = (task: any) => {
        setEditingTaskId(task.id);
        setEditForm({
            title: task.title,
            description: task.description || '',
            priority: task.priority || 'medium',
            dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
        });
    };

    const cancelEditing = () => {
        setEditingTaskId(null);
        setEditForm({ title: '', description: '', priority: 'medium', dueDate: '' });
    };

    const saveTask = async () => {
        if (!editingTaskId || !editForm.title.trim()) return;
        try {
            const getTokenFn = async () => {
                const token = await getToken();
                return token || null;
            };
            await api.checkmate.updateTask(getTokenFn, editingTaskId, {
                title: editForm.title,
                description: editForm.description,
                priority: editForm.priority,
                dueDate: editForm.dueDate ? new Date(editForm.dueDate).toISOString() : undefined
            });
            setEditingTaskId(null);
            refreshData();
            refreshLists();
        } catch (e) {
            console.error(e);
        }
    };

    const totalTasks = (taskStats?.remaining || 0) + (taskStats?.completed || 0);
    const completionRate = totalTasks > 0 ? Math.round(((taskStats?.completed || 0) / totalTasks) * 100) : 0;
    const remainingTasks = taskStats?.remaining || 0;
    const completedCount = taskStats?.completed || 0;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <header className="flex-shrink-0 px-8 py-8">
                <div className="flex flex-wrap justify-between items-end gap-4">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                            {(() => {
                                const hour = new Date().getHours();
                                if (hour < 5) return 'Good Evening';
                                if (hour < 12) return 'Good Morning';
                                if (hour < 18) return 'Good Afternoon';
                                return 'Good Evening';
                            })()}, {user?.displayName?.split(' ')[0]}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-base">
                            You have {remainingTasks} tasks remaining for today.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center justify-center h-10 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
                            <span className="material-symbols-outlined text-[20px] mr-2">calendar_month</span>
                            <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </button>
                        <button
                            onClick={() => setIsQuickAddOpen(true)}
                            className="flex items-center justify-center h-10 px-6 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-bold shadow-md shadow-primary/30 transition-all">
                            <span className="material-symbols-outlined text-[20px] mr-2">add</span>
                            <span>Quick Add</span>
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-8 pb-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-[1600px]">
                    <div className="lg:col-span-8 flex flex-col gap-6">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">wb_sunny</span>
                                    Today's Focus
                                </h2>
                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{completedCount} of {totalTasks} completed</span>
                            </div>

                            <div className="flex justify-end mb-2 relative">
                                {isSortOpen && (
                                    <div className="fixed inset-0 z-10" onClick={() => setIsSortOpen(false)} />
                                )}
                                <button
                                    onClick={() => setIsSortOpen(!isSortOpen)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[16px]">sort</span>
                                    <span>
                                        {sortBy === 'dueDate' ? 'Due Date' :
                                            sortBy === 'priority' ? 'Priority' :
                                                sortBy === 'newest' ? 'Newest' : 'Oldest'}
                                    </span>
                                </button>
                                {isSortOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-20 py-1 flex flex-col">
                                        <button
                                            onClick={() => { setSortBy('dueDate'); setIsSortOpen(false); }}
                                            className={`px-4 py-2 text-left text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 ${sortBy === 'dueDate' ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                                        >
                                            Oldest Due Date
                                        </button>
                                        <button
                                            onClick={() => { setSortBy('priority'); setIsSortOpen(false); }}
                                            className={`px-4 py-2 text-left text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 ${sortBy === 'priority' ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                                        >
                                            Priority (High to Low)
                                        </button>
                                        <button
                                            onClick={() => { setSortBy('newest'); setIsSortOpen(false); }}
                                            className={`px-4 py-2 text-left text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 ${sortBy === 'newest' ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                                        >
                                            Newest Created
                                        </button>
                                        <button
                                            onClick={() => { setSortBy('oldest'); setIsSortOpen(false); }}
                                            className={`px-4 py-2 text-left text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 ${sortBy === 'oldest' ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                                        >
                                            Oldest Created
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-3">
                                {sortedTasks.map((task: any) => (
                                    <div key={task.id} className={`group flex items-start gap-4 p-4 rounded-xl border border-transparent hover:border-primary/30 shadow-sm hover:shadow-md transition-all ${task.status === 'done' ? 'bg-slate-50 dark:bg-slate-800/50 opacity-75' : 'bg-white dark:bg-slate-900'}`}>
                                        {editingTaskId === task.id ? (
                                            <div className="flex flex-col w-full gap-3">
                                                <input
                                                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                                    value={editForm.title}
                                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                                    placeholder="Task title"
                                                    autoFocus
                                                />
                                                <input
                                                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                                                    value={editForm.description}
                                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                                    placeholder="Description (optional)"
                                                />
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                                                        value={editForm.priority}
                                                        onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                                                    >
                                                        <option value="low">Low Priority</option>
                                                        <option value="medium">Medium Priority</option>
                                                        <option value="high">High Priority</option>
                                                    </select>
                                                    <input
                                                        type="date"
                                                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                                                        value={editForm.dueDate}
                                                        onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                                                    />
                                                    <div className="flex-1"></div>
                                                    <button onClick={saveTask} className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg">
                                                        <span className="material-symbols-outlined">check</span>
                                                    </button>
                                                    <button onClick={cancelEditing} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                                                        <span className="material-symbols-outlined">close</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center justify-center pt-1">
                                                    <input
                                                        className="size-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                                        type="checkbox"
                                                        checked={task.status === 'done'}
                                                        onChange={() => toggleTask(task)}
                                                    />
                                                </div>
                                                <div className="flex flex-col flex-1 min-w-0 gap-1 cursor-pointer" onClick={() => startEditing(task)}>
                                                    <span className={`text-slate-900 dark:text-white font-medium text-base group-hover:text-primary transition-colors ${task.status === 'done' ? 'line-through text-slate-500' : ''}`}>{task.title}</span>
                                                    {task.description && (
                                                        <p className={`text-slate-500 dark:text-slate-400 text-sm truncate ${task.status === 'done' ? 'line-through text-slate-400' : ''}`}>
                                                            {task.description}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center gap-3 text-xs mt-1">
                                                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide ${task.priority === 'high' ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400' :
                                                            task.priority === 'low' ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' :
                                                                'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                                            }`}>
                                                            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>flag</span>
                                                            {task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : 'Medium'}
                                                        </span>
                                                        {task.dueDate && (
                                                            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                                                <span className="material-symbols-outlined text-[14px]">event</span>
                                                                {new Date(task.dueDate).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); startEditing(task); }}
                                                        className="p-2 text-slate-300 hover:text-primary transition-all rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                                                    >
                                                        <span className="material-symbols-outlined">edit</span>
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                                {tasks.length === 0 && (
                                    <div className="text-center p-8 text-slate-400">
                                        No active tasks. Enjoy your day!
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4 flex flex-col gap-6">
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center gap-2">
                            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 mb-1">
                                <span className="material-symbols-outlined">check_circle</span>
                            </div>
                            <span className="text-2xl font-bold text-slate-900 dark:text-white">{completionRate}%</span>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Completion</span>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center gap-2">
                            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 mb-1">
                                <span className="material-symbols-outlined">warning</span>
                            </div>
                            <span className="text-2xl font-bold text-slate-900 dark:text-white">{taskStats?.overdue || 0}</span>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Overdue</span>
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isQuickAddOpen}
                onClose={() => setIsQuickAddOpen(false)}
                title="Quick Add Task"
                footer={
                    <>
                        <button
                            onClick={() => setIsQuickAddOpen(false)}
                            className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleQuickAdd}
                            className="px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors"
                        >
                            Add Task
                        </button>
                    </>
                }
            >
                <div className="flex flex-col gap-4">
                    <input
                        className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-lg font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-primary/50"
                        placeholder="What needs to be done?"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
                    />
                    <textarea
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/50 resize-none"
                        placeholder="Description (optional)"
                        rows={3}
                        value={newTaskDescription}
                        onChange={(e) => setNewTaskDescription(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">List</label>
                            <select
                                className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50"
                                value={selectedListId}
                                onChange={(e) => setSelectedListId(e.target.value)}
                            >
                                <option value="inbox">Inbox</option>
                                {lists.map(list => (
                                    <option key={list.id} value={list.id}>{list.title}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Priority</label>
                            <select
                                className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50"
                                value={newTaskPriority}
                                onChange={(e) => setNewTaskPriority(e.target.value)}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Due Date</label>
                        <input
                            type="date"
                            className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50"
                            value={newTaskDueDate}
                            onChange={(e) => setNewTaskDueDate(e.target.value)}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
