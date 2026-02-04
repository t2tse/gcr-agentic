import { NextRequest } from "next/server";
import { CopilotRuntime, EmptyAdapter, copilotRuntimeNextJSAppRouterEndpoint } from "@copilotkit/runtime";
import { A2AAgent } from "@ag-ui/a2a";
import { AuthenticatedA2AClient } from "@/lib/AuthenticatedA2AClient";

const copilotHandler = async (req: NextRequest) => {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader || "";

    const client = new AuthenticatedA2AClient(
        process.env.NEXT_PUBLIC_PAA_AGENT || "http://localhost:8001/a2a/app",
        ".well-known/agent-card.json",
        token
    );

    const agent = new A2AAgent({ a2aClient: client });

    const serviceAdapter = new EmptyAdapter();

    const runtime = new CopilotRuntime({
        agents: {
            "default": agent as any
        }
    });

    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
        runtime,
        serviceAdapter,
        endpoint: '/api/copilotkit',
    });

    return handleRequest(req);
};

export const POST = copilotHandler;
export const GET = copilotHandler;
