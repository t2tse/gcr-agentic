"use client";
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useSearchParams, useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { AVAILABLE_ICONS } from '@/lib/constants';
import { useLists } from '@/lib/lists-context';

export default function CheckmatePage() {
    const { getToken, user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const listId = searchParams.get('listId');
    const { refreshLists } = useLists();

    const [tasks, setTasks] = useState<any[]>([]);

    const [newTask, setNewTask] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newDueDate, setNewDueDate] = useState('');
    const [filter, setFilter] = useState('all');
    const [priority, setPriority] = useState('medium');
    const [listTitle, setListTitle] = useState('Inbox');
    const [listIcon, setListIcon] = useState('list');
    const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
    const [listToDelete, setListToDelete] = useState<string | null>(null);
    const [listToClear, setListToClear] = useState<string | null>(null);
    const [clearingList, setClearingList] = useState(false);
    const [deletingList, setDeletingList] = useState(false);
    const [showListOptions, setShowListOptions] = useState(false);

    // Edit Mode State
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: ''
    });

    // List Edit State
    const [isEditingList, setIsEditingList] = useState(false);
    const [editListTitle, setEditListTitle] = useState('');
    const [editListIcon, setEditListIcon] = useState('');
    const [sortBy, setSortBy] = useState('dueDate');
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const fetchTasks = async () => {
        if (user) {
            const getTokenFn = async () => {
                const token = await getToken();
                return token || null;
            };

            try {
                const fetchListId = listId || 'inbox';
                const res = await api.checkmate.getTasks(getTokenFn, fetchListId);
                console.log('Fetched Tasks:', res.data);
                setTasks(res.data);

                if (listId) {
                    // Fetch list details for title (optimization: pass in query or context)
                    // For now, simpler to just get all lists and find it or duplicate filtered request
                    // We'll create a getList endpoint or just reuse getLists for sidebar cache?
                    // Let's just fetch everything for now or assume listId is valid
                    const listsRes = await api.checkmate.getLists(getTokenFn);
                    const currentList = listsRes.data.lists.find((l: any) => l.id === listId);
                    setListTitle(currentList?.title || 'Unknown List');
                    setListIcon(currentList?.icon || 'list');
                } else {
                    setListTitle('Inbox');
                    setListIcon('inbox');
                }
            } catch (e) {
                console.error("Error fetching tasks", e);
            }
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [user, listId]);

    const addTask = async () => {
        if (!newTask.trim()) return;
        try {
            const getTokenFn = async () => {
                const token = await getToken();
                return token || null;
            };
            await api.checkmate.createTask(getTokenFn, {
                title: newTask,
                description: newDescription,
                priority,
                dueDate: newDueDate || undefined,
                listId: listId || undefined // Default to undefined (Inbox) if no listId
            });
            setNewTask('');
            setNewDescription('');
            setNewDueDate('');
            fetchTasks(); // Refresh list
            refreshLists(); // Refresh sidebar
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
            refreshLists(); // Refresh sidebar counts
        } catch (e) {
            console.error(e);
            fetchTasks(); // Revert on error
        }
    };

    const deleteTask = (id: string) => {
        setTaskToDelete(id);
    };

    const confirmDeleteTask = async () => {
        if (!taskToDelete) return;
        try {
            const getTokenFn = async () => {
                const token = await getToken();
                return token || null;
            };
            await api.checkmate.deleteTask(getTokenFn, taskToDelete);
            setTasks(tasks.filter(t => t.id !== taskToDelete));
            setTaskToDelete(null);
            refreshLists(); // Refresh sidebar counts
        } catch (e) {
            console.error(e);
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
            fetchTasks();
            refreshLists();
        } catch (e) {
            console.error(e);
        }
    };

    const startEditingList = () => {
        setEditListTitle(listTitle);
        setEditListIcon(listIcon);
        setIsEditingList(true);
    };

    const saveList = async () => {
        if (!listId || !editListTitle.trim()) return;
        try {
            const getTokenFn = async () => {
                const token = await getToken();
                return token || null;
            };
            await api.checkmate.updateList(getTokenFn, listId, {
                title: editListTitle,
                icon: editListIcon
            });
            setListTitle(editListTitle);
            setListIcon(editListIcon);
            setIsEditingList(false);
            refreshLists();
        } catch (e) {
            console.error(e);
        }
    };

    const confirmClearList = async () => {
        if (!listToClear) return;
        setClearingList(true);
        try {
            const getTokenFn = async () => {
                const token = await getToken();
                return token || null;
            };
            await api.checkmate.clearListTasks(getTokenFn, listToClear);
            setTasks([]); // Optimistically clear
            setListToClear(null);
            setShowListOptions(false);
            refreshLists(); // Refresh sidebar counts
        } catch (e) {
            console.error("Failed to clear list", e);
            alert("Failed to clear list");
        } finally {
            setClearingList(false);
        }
    };

    const confirmDeleteList = async () => {
        if (!listToDelete) return;
        setDeletingList(true);
        try {
            const getTokenFn = async () => {
                const token = await getToken();
                return token || null;
            };
            await api.checkmate.deleteList(getTokenFn, listToDelete);
            setListToDelete(null);
            setShowListOptions(false);
            refreshLists(); // Refresh sidebar (list removed)
            router.push('/checkmate'); // Redirect to Inbox
        } catch (e) {
            console.error("Failed to delete list", e);
            alert("Failed to delete list");
        } finally {
            setDeletingList(false);
        }
    };

    const filteredTasks = tasks.filter(t => {
        if (filter === 'incomplete') return t.status !== 'done';
        if (filter === 'completed') return t.status === 'done';
        return true;
    });

    const sortedTasks = useMemo(() => {
        return [...filteredTasks].sort((a, b) => {
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
    }, [filteredTasks, sortBy]);

    const stats = {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'done').length,
        overdue: tasks.filter(t => {
            if (t.status === 'done' || !t.dueDate) return false;
            // Check if due date is before today (ignoring time for simplicity or strict comparison)
            // Using strict comparison against current time for now since dueDate is ISO string
            return new Date(t.dueDate) < new Date();
        }).length
    };

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            <div className="max-w-[1600px] w-full mx-auto p-4 md:p-8 flex flex-col gap-6">
                {/* Header */}
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1 w-full max-w-2xl">
                        {isEditingList ? (
                            <div className="flex flex-col gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">List Name</label>
                                        <input
                                            className="text-2xl font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border-none rounded-lg w-full focus:ring-2 focus:ring-primary/50"
                                            value={editListTitle}
                                            onChange={(e) => setEditListTitle(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Icon</label>
                                    <div className="flex flex-wrap gap-2">
                                        {AVAILABLE_ICONS.map((icon) => (
                                            <button
                                                key={icon}
                                                onClick={() => setEditListIcon(icon)}
                                                className={`p-2 rounded-lg flex items-center justify-center transition-all ${editListIcon === icon
                                                    ? 'bg-primary text-white shadow-md scale-105'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                    }`}
                                            >
                                                <span className="material-symbols-outlined text-[20px]">{icon}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-2">
                                    <button
                                        onClick={() => setIsEditingList(false)}
                                        className="px-3 py-1.5 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={saveList}
                                        className="px-3 py-1.5 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-primary text-3xl md:text-4xl">{listIcon}</span>
                                    <h1 className="text-3xl md:text-4xl font-black leading-tight text-slate-900 dark:text-white">{listTitle}</h1>
                                    {listId && (
                                        <button
                                            onClick={startEditingList}
                                            className="text-slate-400 hover:text-primary transition-colors p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">edit</span>
                                        </button>
                                    )}
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 text-base">Manage your daily todos</p>
                            </>
                        )}
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setShowListOptions(!showListOptions)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            <span>List Options</span>
                            <span className="material-symbols-outlined text-[18px]">expand_more</span>
                        </button>

                        {showListOptions && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl z-20 py-1">
                                <button
                                    onClick={() => { setListToClear(listId || 'inbox'); setShowListOptions(false); }}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">layers_clear</span>
                                    Clear all tasks
                                </button>
                                {listId && (
                                    <button
                                        onClick={() => { setListToDelete(listId); setShowListOptions(false); }}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                        Delete List
                                    </button>
                                )}
                            </div>
                        )}
                        {showListOptions && (
                            <div className="fixed inset-0 z-10" onClick={() => setShowListOptions(false)} />
                        )}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-2 rounded-xl p-5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                        <div className="flex justify-between items-start">
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Total Tasks</p>
                            <span className="material-symbols-outlined text-primary">list_alt</span>
                        </div>
                        <p className="text-slate-900 dark:text-white text-3xl font-bold">{stats.total}</p>
                    </div>
                    <div className="flex flex-col gap-2 rounded-xl p-5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                        <div className="flex justify-between items-start">
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Completed</p>
                            <span className="material-symbols-outlined text-green-500">check_circle</span>
                        </div>
                        <p className="text-slate-900 dark:text-white text-3xl font-bold">{stats.completed}</p>
                    </div>
                    <div className="flex flex-col gap-2 rounded-xl p-5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                        <div className="flex justify-between items-start">
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Overdue</p>
                            <span className="material-symbols-outlined text-red-500">warning</span>
                        </div>
                        <p className="text-slate-900 dark:text-white text-3xl font-bold">{stats.overdue}</p>
                    </div>
                </div>

                {/* Sticky Add Task */}
                <div className="flex flex-col gap-3 sticky top-0 z-10 pt-2 pb-4 bg-background-light dark:bg-background-dark">
                    <label className="relative flex items-center w-full shadow-lg rounded-xl overflow-hidden group focus-within:ring-2 ring-primary/50 transition-shadow">
                        <span className="absolute left-4 text-slate-400 flex items-center">
                            <span className="material-symbols-outlined">add_task</span>
                        </span>
                        <div className="flex flex-col w-full">
                            <input
                                className="w-full h-10 pl-12 pr-32 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 border-none focus:ring-0 text-base"
                                placeholder={`Add task to '${listTitle}'...`}
                                type="text"
                                value={newTask}
                                onChange={(e) => setNewTask(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                            />
                            <input
                                className="w-full h-8 pl-12 pr-32 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 placeholder:text-slate-300 border-none focus:ring-0 text-sm"
                                placeholder="Description (optional)"
                                type="text"
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                            />
                        </div>
                        <div className="absolute right-2 flex items-center gap-1">
                            <input
                                type="date"
                                className="h-9 px-2 bg-transparent text-slate-500 dark:text-slate-400 border-none focus:ring-0 text-xs cursor-pointer"
                                value={newDueDate}
                                onChange={(e) => setNewDueDate(e.target.value)}
                            />
                            <button
                                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Set Priority"
                                onClick={() => setPriority(priority === 'medium' ? 'high' : priority === 'high' ? 'low' : 'medium')}
                            >
                                <span className={`material-symbols-outlined text-[20px] ${priority === 'high' ? 'text-red-500' : priority === 'low' ? 'text-green-500' : 'text-slate-400'}`}>flag</span>
                            </button>
                            <button
                                onClick={addTask}
                                className="hidden sm:flex h-10 px-4 items-center justify-center bg-primary text-white rounded-lg text-sm font-bold shadow-md hover:bg-blue-600 transition-colors ml-1"
                            >
                                Add
                            </button>
                        </div>
                    </label>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap justify-between items-center gap-4 px-2">
                    <div className="relative">
                        {isFilterOpen && (
                            <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)} />
                        )}
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[16px]">filter_alt</span>
                            <span>
                                {filter === 'all' ? 'All Tasks' :
                                    filter === 'incomplete' ? 'Incomplete' : 'Completed'}
                            </span>
                        </button>
                        {isFilterOpen && (
                            <div className="absolute left-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-20 py-1 flex flex-col">
                                <button
                                    onClick={() => { setFilter('all'); setIsFilterOpen(false); }}
                                    className={`px-4 py-2 text-left text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 ${filter === 'all' ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                                >
                                    All Tasks
                                </button>
                                <button
                                    onClick={() => { setFilter('incomplete'); setIsFilterOpen(false); }}
                                    className={`px-4 py-2 text-left text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 ${filter === 'incomplete' ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                                >
                                    Incomplete
                                </button>
                                <button
                                    onClick={() => { setFilter('completed'); setIsFilterOpen(false); }}
                                    className={`px-4 py-2 text-left text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 ${filter === 'completed' ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                                >
                                    Completed
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="relative">
                        {isSortOpen && (
                            <div className="fixed inset-0 z-10" onClick={() => setIsSortOpen(false)} />
                        )}
                        <button
                            onClick={() => setIsSortOpen(!isSortOpen)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[16px]">sort</span>
                            <span>
                                {sortBy === 'dueDate' ? 'Due Date' :
                                    sortBy === 'priority' ? 'Priority' :
                                        sortBy === 'newest' ? 'Newest' : 'Oldest'}
                            </span>
                        </button>
                        {isSortOpen && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-20 py-1 flex flex-col">
                                <button
                                    onClick={() => { setSortBy('dueDate'); setIsSortOpen(false); }}
                                    className={`px-4 py-2 text-left text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 ${sortBy === 'dueDate' ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                                >
                                    Oldest Due Date
                                </button>
                                <button
                                    onClick={() => { setSortBy('priority'); setIsSortOpen(false); }}
                                    className={`px-4 py-2 text-left text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 ${sortBy === 'priority' ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                                >
                                    Priority (High to Low)
                                </button>
                                <button
                                    onClick={() => { setSortBy('newest'); setIsSortOpen(false); }}
                                    className={`px-4 py-2 text-left text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 ${sortBy === 'newest' ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                                >
                                    Newest Created
                                </button>
                                <button
                                    onClick={() => { setSortBy('oldest'); setIsSortOpen(false); }}
                                    className={`px-4 py-2 text-left text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 ${sortBy === 'oldest' ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                                >
                                    Oldest Created
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Task List */}
                <div className="flex flex-col gap-3 pb-10">
                    {sortedTasks.map((task) => (
                        <div
                            key={task.id}
                            className={`group flex items-start gap-4 p-4 rounded-xl border border-transparent hover:border-primary/30 shadow-sm hover:shadow-md transition-all ${task.status === 'done' ? 'bg-slate-50 dark:bg-slate-800/50 opacity-75' : 'bg-white dark:bg-slate-900'
                                }`}
                        >
                            {editingTaskId === task.id ? (
                                <div className="flex flex-col w-full gap-3">
                                    <input
                                        className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                        value={editForm.title}
                                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                        placeholder="Task title"
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
                                        <p className={`text-slate-900 dark:text-gray-100 font-medium truncate group-hover:text-primary transition-colors ${task.status === 'done' ? 'line-through text-slate-500' : ''}`}>
                                            {task.title}
                                        </p>
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
                                                {task.priority || 'Medium'}
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
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                                            className="p-2 text-slate-300 hover:text-red-500 transition-all rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                                        >
                                            <span className="material-symbols-outlined">delete</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                    {sortedTasks.length === 0 && (
                        <div className="text-center p-8 text-slate-400">
                            No tasks found.
                        </div>
                    )}
                </div>
            </div>

            <Modal
                isOpen={!!taskToDelete}
                onClose={() => setTaskToDelete(null)}
                title="Delete Task"
                footer={
                    <>
                        <button
                            onClick={() => setTaskToDelete(null)}
                            className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDeleteTask}
                            className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg shadow-sm transition-colors"
                        >
                            Delete
                        </button>
                    </>
                }
            >
                <div className="flex flex-col gap-3">
                    <p className="text-slate-600 dark:text-slate-300">
                        Are you sure you want to delete this task? This action cannot be undone.
                    </p>
                    {taskToDelete && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                            <p className="font-medium text-slate-900 dark:text-white">
                                {tasks.find(t => t.id === taskToDelete)?.title}
                            </p>
                        </div>
                    )}
                </div>
            </Modal>

            <Modal
                isOpen={!!listToClear}
                onClose={() => setListToClear(null)}
                title="Clear List"
            >
                <div className="flex flex-col gap-4">
                    <p className="text-slate-600 dark:text-slate-300">
                        Are you sure you want to clear <b>all tasks</b> from this list?
                    </p>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setListToClear(null)}
                            className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmClearList}
                            disabled={clearingList}
                            className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg"
                        >
                            {clearingList ? 'Clearing...' : 'Clear All Tasks'}
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={!!listToDelete}
                onClose={() => setListToDelete(null)}
                title="Delete List"
            >
                <div className="flex flex-col gap-4">
                    <p className="text-slate-600 dark:text-slate-300">
                        Are you sure you want to delete this list?
                        <br />
                        <span className="text-red-500 font-bold">This will delete the list and all its tasks permanently.</span>
                    </p>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setListToDelete(null)}
                            className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDeleteList}
                            disabled={deletingList}
                            className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg"
                        >
                            {deletingList ? 'Deleting...' : 'Delete List'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
