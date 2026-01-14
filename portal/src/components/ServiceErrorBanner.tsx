"use client";
import { useServiceErrors } from "@/lib/service-error-context";

export function ServiceErrorBanner() {
    const { errors } = useServiceErrors();

    const unavailableServices = Object.entries(errors)
        .filter(([_, isError]) => isError)
        .map(([name]) => name.charAt(0).toUpperCase() + name.slice(1));

    if (unavailableServices.length === 0) return null;

    return (
        <div className="bg-red-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold animate-in slide-in-from-top duration-300">
            <span className="material-symbols-outlined text-[18px]">warning</span>
            <span>
                Service Unavailable: {unavailableServices.join(", ")} seems to be offline. Some features may not work.
            </span>
        </div>
    );
}
