"use client";
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { api, CheckmateList } from '@/lib/api';
import { Modal } from './ui/Modal';
import { AVAILABLE_ICONS } from '@/lib/constants';
import { useLists } from '@/lib/lists-context';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, logout, getToken } = useAuth();
    const { lists, inboxCount, refreshLists, isLoading } = useLists();

    // Add List Modal State
    const [isAddListModalOpen, setIsAddListModalOpen] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('list');
    const [creatingList, setCreatingList] = useState(false);

    const isActive = (path: string) => pathname === path;
    const isListActive = (id: string) => pathname.startsWith('/checkmate') && searchParams.get('listId') === id;
    const isInboxActive = () => pathname.startsWith('/checkmate') && !searchParams.has('listId');

    const openAddListModal = () => {
        setNewListName('');
        setSelectedIcon('list');
        setIsAddListModalOpen(true);
    };

    const confirmAddList = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newListName.trim()) return;

        setCreatingList(true);
        try {
            const token = await getToken();
            if (!token) return;
            const getTokenFn = async () => token;
            await api.checkmate.createList(getTokenFn, newListName, 'blue', selectedIcon);
            await refreshLists(); // Sync
            setIsAddListModalOpen(false);
        } catch (error) {
            console.error('Failed to create list', error);
            alert('Failed to create list');
        } finally {
            setCreatingList(false);
        }
    };

    return (
        <>
            <Modal
                isOpen={isAddListModalOpen}
                onClose={() => setIsAddListModalOpen(false)}
                title="Create New List"
            >
                <form onSubmit={confirmAddList} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            List Name
                        </label>
                        <input
                            type="text"
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            placeholder="e.g. Work, Shopping"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Icon
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                            {AVAILABLE_ICONS.map((icon) => (
                                <button
                                    key={icon}
                                    type="button"
                                    onClick={() => setSelectedIcon(icon)}
                                    className={`p-2 rounded-lg flex items-center justify-center transition-all ${selectedIcon === icon
                                        ? 'bg-primary text-white shadow-md scale-105'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-[20px]">{icon}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsAddListModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={creatingList || !newListName.trim()}
                            className="px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {creatingList ? 'Creating...' : 'Create List'}
                        </button>
                    </div>
                </form>
            </Modal>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={onClose}
                />
            )}

            <aside className={`
                fixed inset-y-0 left-0 z-50 md:static md:z-auto
                flex flex-col w-64 h-full flex-shrink-0
                border-r border-slate-200 dark:border-slate-800 
                bg-white dark:bg-slate-900 
                transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="p-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined">check_circle</span>
                        </div>
                        <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">My Personal Assistant</span>
                    </div>
                </div>
                <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                    <Link
                        href="/dashboard"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg group transition-colors ${isActive('/dashboard')
                            ? 'bg-primary/10 text-primary'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                            }`}
                    >
                        <span className={`material-symbols-outlined ${isActive('/dashboard') ? 'text-primary' : ''}`} style={isActive('/dashboard') ? { fontVariationSettings: "'FILL' 1" } : {}}>dashboard</span>
                        <span className="text-sm font-medium">Dashboard</span>
                    </Link>

                    {pathname.startsWith('/checkmate') ? (
                        <div className="pt-4">
                            <div className="flex items-center justify-between px-3 mb-2">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">My Lists</p>
                                <button onClick={openAddListModal} className="text-slate-400 hover:text-primary transition-colors">
                                    <span className="material-symbols-outlined text-[16px]">add</span>
                                </button>
                            </div>

                            <Link
                                href="/checkmate"
                                className={`flex items-center justify-between px-3 py-2.5 rounded-lg group transition-colors ${isInboxActive()
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`material-symbols-outlined ${isInboxActive() ? 'text-primary' : ''}`}>inbox</span>
                                    <span className="text-sm font-medium">Inbox</span>
                                </div>
                                {inboxCount > 0 && (
                                    <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                        {inboxCount}
                                    </span>
                                )}
                            </Link>

                            {lists.map(list => (
                                <Link
                                    key={list.id}
                                    href={`/checkmate?listId=${list.id}`}
                                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg group transition-colors ${isListActive(list.id)
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <span className={`material-symbols-outlined text-[20px] ${isListActive(list.id) ? 'text-primary' : ''}`}>{list.icon || 'list'}</span>
                                        <p className={`text-sm font-medium truncate ${isListActive(list.id) ? 'font-bold' : ''}`}>{list.title}</p>
                                    </div>
                                    {list.taskCount !== undefined && list.taskCount > 0 && (
                                        <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                            {list.taskCount}
                                        </span>
                                    )}
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <Link
                            href="/checkmate"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg group transition-colors text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                        >
                            <span className="material-symbols-outlined">check_box</span>
                            <span className="text-sm font-medium">Checkmate Todo</span>
                        </Link>
                    )}

                    {pathname.startsWith('/checkmate') && (
                        <div className="my-2 border-t border-slate-200 dark:border-slate-800"></div>
                    )}

                    <Link
                        href="/stash"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg group transition-colors ${isActive('/stash')
                            ? 'bg-primary/10 text-primary'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                            }`}
                    >
                        <span className={`material-symbols-outlined ${isActive('/stash') ? 'text-primary' : ''}`} style={isActive('/stash') ? { fontVariationSettings: "'FILL' 1" } : {}}>link</span>
                        <span className="text-sm font-medium">Stash Links</span>
                    </Link>
                </nav>
                <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                    {user && (
                        <div className="flex items-center gap-3 px-2 py-2 mb-2">
                            {user.photoURL ? (
                                <img src={user.photoURL} alt={user.displayName || 'User'} className="h-10 w-10 rounded-full object-cover border-2 border-white dark:border-slate-800" />
                            ) : (
                                <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                                    {user.displayName ? user.displayName[0] : 'U'}
                                </div>
                            )}
                            <div className="flex flex-col justify-center overflow-hidden">
                                <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.displayName || user.email}</span>
                            </div>
                        </div>
                    )}
                    <button onClick={logout} className="flex w-full items-center gap-3 px-3 py-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        <span className="material-symbols-outlined">logout</span>
                        <span className="text-sm font-medium">Sign Out</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
