"use client";
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { setApiErrorReporter } from './api';

type ServiceType = 'checkmate' | 'stash';

interface ServiceErrorContextType {
    errors: Record<ServiceType, boolean>;
    reportError: (service: ServiceType, isError: boolean) => void;
}

const ServiceErrorContext = createContext<ServiceErrorContextType | undefined>(undefined);

export function ServiceErrorProvider({ children }: { children: React.ReactNode }) {
    const [errors, setErrors] = useState<Record<ServiceType, boolean>>({
        checkmate: false,
        stash: false,
    });

    const reportError = useCallback((service: ServiceType, isError: boolean) => {
        setErrors(prev => {
            if (prev[service] === isError) return prev;
            return { ...prev, [service]: isError };
        });
    }, []);

    useEffect(() => {
        setApiErrorReporter(reportError);
    }, [reportError]);

    return (
        <ServiceErrorContext.Provider value={{ errors, reportError }}>
            {children}
        </ServiceErrorContext.Provider>
    );
}

export function useServiceErrors() {
    const context = useContext(ServiceErrorContext);
    if (context === undefined) {
        throw new Error('useServiceErrors must be used within a ServiceErrorProvider');
    }
    return context;
}
