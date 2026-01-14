"use client";
import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ListsProvider } from '@/lib/lists-context';
import { ServiceErrorProvider } from '@/lib/service-error-context';
import { ServiceErrorBanner } from '@/components/ServiceErrorBanner';

export default function AuthenticatedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        setIsSidebarOpen(false);
    }, [pathname]);

    if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
    if (!user) return null;

    return (
        <ServiceErrorProvider>
            <ListsProvider>
                <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100">
                    <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                    <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                        <ServiceErrorBanner />
                        {/* Mobile Header */}
                        <header className="md:hidden flex items-center justify-between p-4 bg-surface-light dark:bg-surface-dark border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">check_circle</span>
                                <span className="font-bold text-lg dark:text-white">My Personal Assistant</span>
                            </div>
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="text-slate-900 dark:text-white p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                            >
                                <span className="material-symbols-outlined">menu</span>
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto">
                            {children}
                        </div>
                    </main>
                </div>
            </ListsProvider>
        </ServiceErrorProvider>
    );
}
