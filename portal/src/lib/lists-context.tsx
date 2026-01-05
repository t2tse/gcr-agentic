"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, CheckmateList } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface ListsContextType {
    lists: CheckmateList[];
    inboxCount: number;
    refreshLists: () => Promise<void>;
    isLoading: boolean;
}

const ListsContext = createContext<ListsContextType | undefined>(undefined);

export function ListsProvider({ children }: { children: React.ReactNode }) {
    const { user, getToken } = useAuth();
    const [lists, setLists] = useState<CheckmateList[]>([]);
    const [inboxCount, setInboxCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const refreshLists = useCallback(async () => {
        if (!user) {
            setLists([]);
            setInboxCount(0);
            setIsLoading(false);
            return;
        }

        try {
            const getTokenFn = async () => {
                const token = await getToken();
                return token || null;
            };
            const res = await api.checkmate.getLists(getTokenFn);
            setLists(res.data.lists);
            setInboxCount(res.data.inboxCount);
        } catch (error) {
            console.error('Failed to fetch lists:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user, getToken]);

    // Initial fetch
    useEffect(() => {
        refreshLists();
    }, [refreshLists]);

    return (
        <ListsContext.Provider value={{ lists, inboxCount, refreshLists, isLoading }}>
            {children}
        </ListsContext.Provider>
    );
}

export function useLists() {
    const context = useContext(ListsContext);
    if (context === undefined) {
        throw new Error('useLists must be used within a ListsProvider');
    }
    return context;
}
