"use client";

import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { createA2UIMessageRenderer } from "@copilotkit/a2ui-renderer";
import { theme } from "@/components/AIAssistant/theme";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import "@copilotkit/react-ui/styles.css";

const A2UIMessageRenderer = createA2UIMessageRenderer({ theme });
const renderActivityMessages = [A2UIMessageRenderer];

export default function AIAssistantPage() {
    const { getToken } = useAuth();
    const [token, setToken] = useState<string>("");

    useEffect(() => {
        const fetchToken = async () => {
            const t = await getToken();
            if (t) setToken(t);
        };
        fetchToken();
    }, [getToken]);

    return (
        <CopilotKit
            runtimeUrl="/api/copilotkit"
            showDevConsole={false}
            renderActivityMessages={renderActivityMessages}
            headers={{
                Authorization: `Bearer ${token}`
            }}
        >
            <div className="flex flex-col h-full bg-surface-light dark:bg-surface-dark relative">
                <div className="absolute inset-0 z-0 flex items-center justify-center opacity-5 pointer-events-none">
                    <span className="material-symbols-outlined text-[200px] text-primary">smart_toy</span>
                </div>
                <div className="z-10 h-full relative flex flex-col">
                    <CopilotChat
                        className="flex-1 h-full"
                        labels={{
                            title: "AI Assistant",
                            initial: "Hi! I'm your AI Assistant. How can I help you today?",
                        }}
                    />
                </div>
            </div>
        </CopilotKit>
    );
}
