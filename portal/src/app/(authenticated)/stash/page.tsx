'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';

interface Link {
    id: string;
    url: string;
    title: string;
    image?: string;
    summary?: string;
    tags?: string[];
    createdAt: any;
}

interface StashStats {
    totalStashed: number;
    aiSummarized: number;
}

export default function StashPage() {
    const { user, getToken } = useAuth();
    const [links, setLinks] = useState<Link[]>([]);
    const [stats, setStats] = useState<StashStats>({ totalStashed: 0, aiSummarized: 0 });
    const [loading, setLoading] = useState(true);
    const [url, setUrl] = useState('');
    const [adding, setAdding] = useState(false);

    // UI State
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [autoTag, setAutoTag] = useState(true);
    const [generateSummary, setGenerateSummary] = useState(true);
    const [selectedLinkIds, setSelectedLinkIds] = useState<Set<string>>(new Set());
    const [linksToDelete, setLinksToDelete] = useState<string[] | null>(null);
    const [filterCategory, setFilterCategory] = useState('All Categories');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');

    // Dropdown state
    const [showOptions, setShowOptions] = useState(false);

    const fetchData = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const token = await getToken();
            if (!token) return;
            const getTokenFn = async () => token;

            const [fetchedLinks, fetchedStats] = await Promise.all([
                api.stash.getLinks(getTokenFn),
                api.stash.getStats(getTokenFn)
            ]);
            setLinks(fetchedLinks.data);
            setStats(fetchedStats.data);
        } catch (error) {
            console.error('Failed to fetch stash data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const handleAddLink = async () => {
        if (!url.trim() || !user) return;
        setAdding(true);

        let finalUrl = url.trim();
        if (!/^https?:\/\//i.test(finalUrl)) {
            finalUrl = 'http://' + finalUrl;
        }

        try {
            const token = await getToken();
            if (!token) throw new Error("No token");
            const getTokenFn = async () => token;

            const response = await api.stash.createLink(getTokenFn, finalUrl, generateSummary, autoTag);
            const newLink = response.data;
            setLinks([newLink, ...links]);
            setUrl('');

            // Update stats optimistically
            setStats(prev => ({
                totalStashed: prev.totalStashed + 1,
                aiSummarized: (generateSummary && newLink.summary) ? prev.aiSummarized + 1 : prev.aiSummarized
            }));
        } catch (error) {
            console.error('Failed to add link:', error);
            alert('Failed to add link. Please try again.');
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = (ids: string[]) => {
        setLinksToDelete(ids);
    };

    const confirmDeleteLinks = async () => {
        if (!linksToDelete) return;
        const ids = linksToDelete;

        // Optimistic update
        const previousLinks = [...links];
        const previousStats = { ...stats };

        // Filter out deleted links locally first
        const itemsToDelete = links.filter(l => ids.includes(l.id));
        setLinks(prev => prev.filter(l => !ids.includes(l.id)));
        setStats(prev => ({
            totalStashed: Math.max(0, prev.totalStashed - itemsToDelete.length),
            aiSummarized: Math.max(0, prev.aiSummarized - itemsToDelete.filter(l => l.summary).length)
        }));
        setSelectedLinkIds(prev => {
            const next = new Set(prev);
            ids.forEach(id => next.delete(id));
            return next;
        });

        setLinksToDelete(null); // Close modal immediately

        try {
            const token = await getToken();
            if (!token) throw new Error("No token");
            const getTokenFn = async () => token;

            await Promise.all(ids.map(id => api.stash.deleteLink(getTokenFn, id)));
        } catch (error) {
            console.error('Failed to delete links:', error);
            // Revert on error - tough to reopen modal here, maybe use a toast in future
            alert('Failed to delete some items.');
            setLinks(previousLinks);
            setStats(previousStats);
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedLinkIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedLinkIds(new Set(links.map(l => l.id)));
        } else {
            setSelectedLinkIds(new Set());
        }
    };

    const getHostname = (linkUrl: string) => {
        try {
            return new URL(linkUrl).hostname;
        } catch {
            return linkUrl;
        }
    };

    const getTimeAgo = (dateStr: any) => {
        // Basic implementation or placeholder as actual parsing depends on API date format
        // Assuming Firestore timestamp or ISO string
        return "Just now"; // Placeholder for simplicity in this iteration
    };

    const allTags = Array.from(new Set(links.flatMap(l => l.tags || []))).sort();

    const filteredLinks = links
        .filter(l => filterCategory === 'All Categories' || (l.tags && l.tags.includes(filterCategory)))
        .sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            if (sortBy === 'title') return (a.title || a.url).localeCompare(b.title || b.url);
            return 0;
        });

    return (
        <div className="max-w-[1200px] mx-auto p-4 md:p-8 flex flex-col gap-6 h-full">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-3xl md:text-4xl">link</span>
                        <h1 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">Stash Links</h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-base font-normal leading-normal">Your saved articles and resources</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative group">
                        {showOptions && (
                            <div className="fixed inset-0 z-10" onClick={() => setShowOptions(false)} />
                        )}
                        <button
                            onClick={() => setShowOptions(!showOptions)}
                            className="relative z-20 flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            <span>Options</span>
                            <span className="material-symbols-outlined text-[18px]">expand_more</span>
                        </button>
                        <div className={`absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg transition-all z-20 ${showOptions || 'group-hover:opacity-100 group-hover:visible opacity-0 invisible'}`}>
                            <a className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm text-slate-900 dark:text-slate-200" href="#">
                                <span className="material-symbols-outlined text-[18px]">ios_share</span> Export Links
                            </a>
                            <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
                            <button
                                onClick={() => handleDelete(links.map(l => l.id))}
                                className="flex w-full items-center gap-2 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm text-red-600 dark:text-red-400"
                            >
                                <span className="material-symbols-outlined text-[18px]">delete_sweep</span> Clear All
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-2 rounded-xl p-5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                    <div className="flex justify-between items-start">
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Total Stashed</p>
                        <span className="material-symbols-outlined text-primary">library_books</span>
                    </div>
                    <p className="text-slate-900 dark:text-white tracking-tight text-3xl font-bold leading-tight">{stats.totalStashed}</p>
                </div>
                <div className="flex flex-col gap-2 rounded-xl p-5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                    <div className="flex justify-between items-start">
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">AI Summarized</p>
                        <span className="material-symbols-outlined text-purple-500" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                    </div>
                    <p className="text-slate-900 dark:text-white tracking-tight text-3xl font-bold leading-tight">{stats.aiSummarized}</p>
                </div>
            </div>

            {/* Sticky Add Bar */}
            <div className="flex flex-col gap-3 sticky top-0 z-10 pt-2 pb-4 bg-background-light dark:bg-background-dark">
                <label className="relative flex items-center w-full shadow-lg rounded-xl overflow-hidden group focus-within:ring-2 ring-primary/50 transition-shadow">
                    <span className="absolute left-4 text-slate-500 flex items-center">
                        <span className="material-symbols-outlined">add_link</span>
                    </span>
                    <input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
                        className="w-full h-14 pl-12 pr-32 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 border-none focus:ring-0 text-base"
                        placeholder="Paste a URL to stash (e.g. https://example.com/article)..."
                        type="url"
                    />
                    <div className="absolute right-2 flex items-center gap-1">
                        <button
                            onClick={() => setAutoTag(!autoTag)}
                            className={`p-2 rounded-lg transition-colors ${autoTag ? 'text-primary bg-primary/10' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                            title="Auto Tag"
                        >
                            <span className="material-symbols-outlined text-[20px]">label</span>
                        </button>
                        <button
                            onClick={() => setGenerateSummary(!generateSummary)}
                            className={`p-2 rounded-lg transition-colors ${generateSummary ? 'text-purple-500 bg-purple-500/10' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                            title="Generate Summary"
                        >
                            <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                        </button>
                        <button
                            onClick={handleAddLink}
                            disabled={adding || !url}
                            className="hidden sm:flex h-10 px-4 items-center justify-center bg-primary text-white rounded-lg text-sm font-bold shadow-md hover:bg-blue-600 transition-colors ml-1 disabled:opacity-50"
                        >
                            {adding ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </label>
            </div>

            {/* Controls: Filter & View Toggle */}
            <div className="flex flex-wrap justify-between items-center gap-4 px-2">
                <div className="flex items-center gap-2">
                    {/* Batch Actions if selection exists */}
                    {selectedLinkIds.size > 0 ? (
                        <button
                            onClick={() => handleDelete(Array.from(selectedLinkIds))}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-sm font-bold hover:bg-red-200 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                            Delete ({selectedLinkIds.size})
                        </button>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-slate-400">filter_alt</span>
                            <span className="text-sm font-bold text-slate-400 uppercase tracking-wide">Category:</span>
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="text-sm font-bold text-slate-900 dark:text-white bg-transparent border-none p-0 pr-6 focus:ring-0 cursor-pointer"
                            >
                                <option>All Categories</option>
                                {allTags.map(tag => (
                                    <option key={tag} value={tag}>{tag}</option>
                                ))}
                            </select>
                        </>
                    )}
                </div>
                <div className="flex gap-2 items-center">
                    <div className="flex bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-slate-100 dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                            title="List View"
                        >
                            <span className="material-symbols-outlined text-[18px]">view_list</span>
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-slate-100 dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                            title="Grid View"
                        >
                            <span className="material-symbols-outlined text-[18px]">grid_view</span>
                        </button>
                    </div>
                    <div className="relative group/sort">
                        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                            <span className="material-symbols-outlined text-[18px]">sort</span>
                            <span>{sortBy === 'newest' ? 'Newest' : sortBy === 'oldest' ? 'Oldest' : 'Title'}</span>
                        </button>
                        <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg opacity-0 invisible group-hover/sort:opacity-100 group-hover/sort:visible transition-all z-20">
                            <button onClick={() => setSortBy('newest')} className="flex w-full items-center px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm text-left">Newest</button>
                            <button onClick={() => setSortBy('oldest')} className="flex w-full items-center px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm text-left">Oldest</button>
                            <button onClick={() => setSortBy('title')} className="flex w-full items-center px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm text-left">Title</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
            ) : links.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
                    <span className="material-symbols-outlined text-6xl mb-4">inbox</span>
                    <p className="text-xl font-medium">Your stash is empty.</p>
                    <p>Paste a URL above to get started!</p>
                </div>
            ) : (
                <div className={viewMode === 'grid' ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-10" : "flex flex-col gap-3 pb-10"}>
                    {filteredLinks.map((link) => (
                        <div key={link.id} className={`group flex ${viewMode === 'grid' ? 'flex-col gap-4' : 'flex-col sm:flex-row gap-4'} p-5 rounded-xl bg-white dark:bg-slate-800 border border-transparent hover:border-primary/30 shadow-sm hover:shadow-md transition-all cursor-pointer relative`}>
                            {/* Icon/Image Placeholder */}
                            {viewMode === 'list' && (
                                <div className="flex items-start justify-center pt-1">
                                    <div className="size-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined">public</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col flex-1 min-w-0 gap-2">
                                {/* Title Row */}
                                <div className={`flex ${viewMode === 'list' ? 'flex-col sm:flex-row sm:items-center justify-between' : 'items-center'} gap-2`}>
                                    {viewMode === 'grid' && (
                                        <div className="size-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-primary flex-shrink-0">
                                            <span className="material-symbols-outlined text-[18px]">public</span>
                                        </div>
                                    )}
                                    <a href={link.url} target="_blank" rel="noreferrer" className="text-primary font-bold text-base truncate hover:underline">
                                        {link.title || link.url}
                                    </a>
                                    {viewMode === 'list' && <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">{getTimeAgo(link.createdAt)}</span>}
                                </div>

                                {/* Summary */}
                                {link.summary && (
                                    <div className="flex items-start gap-2">
                                        <span className="material-symbols-outlined text-[16px] text-purple-500 mt-0.5 flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                                        <p className="text-slate-900 dark:text-slate-200 text-sm leading-relaxed line-clamp-3">
                                            {link.summary}
                                        </p>
                                    </div>
                                )}

                                {/* Tags */}
                                {link.tags && link.tags.length > 0 && (
                                    <div className={`flex flex-wrap items-center gap-2 ${viewMode === 'grid' ? 'mt-auto' : 'mt-1'}`}>
                                        {link.tags.slice(0, 3).map((tag, i) => (
                                            <span key={i} className="flex items-center gap-1 text-blue-700 bg-blue-100 dark:bg-blue-900/30 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide border border-blue-200 dark:border-blue-800">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Actions / Selection */}
                            <div className={viewMode === 'grid' ? "absolute top-4 right-4 flex flex-col items-end gap-2" : "flex sm:flex-col items-center justify-between sm:justify-start gap-2 pl-2 border-l border-slate-100 dark:border-slate-800"}>
                                <input
                                    type="checkbox"
                                    checked={selectedLinkIds.has(link.id)}
                                    onChange={() => toggleSelection(link.id)}
                                    className={`size-5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer ${viewMode === 'list' ? 'mb-auto' : ''}`}
                                    title="Select"
                                />
                                <button className={`p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 ${viewMode === 'grid' ? 'opacity-100 group-hover:opacity-100' : 'opacity-100 sm:opacity-0 group-hover:opacity-100'}`}>
                                    <span className="material-symbols-outlined text-[18px]">more_vert</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <Modal
                isOpen={!!linksToDelete}
                onClose={() => setLinksToDelete(null)}
                title="Delete Links"
                footer={
                    <>
                        <button
                            onClick={() => setLinksToDelete(null)}
                            className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDeleteLinks}
                            className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg shadow-sm transition-colors"
                        >
                            Delete {linksToDelete?.length ? `(${linksToDelete.length})` : ''}
                        </button>
                    </>
                }
            >
                <div className="flex flex-col gap-3">
                    <p className="text-slate-600 dark:text-slate-300">
                        Are you sure you want to delete {linksToDelete?.length && linksToDelete.length > 1 ? 'these items' : 'this item'}?
                        This action cannot be undone.
                    </p>
                    {linksToDelete && linksToDelete.length === 1 && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                            <p className="font-medium text-slate-900 dark:text-white truncate">
                                {links.find(l => l.id === linksToDelete[0])?.title || links.find(l => l.id === linksToDelete[0])?.url}
                            </p>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}
