import { A2AClient } from "@a2a-js/sdk/client";

/**
 * AuthenticatedA2AClient wraps A2AClient to inject Authorization headers
 * into all requests. This is necessary because A2AClient doesn't natively
 * support custom headers.
 * 
 * Implementation uses composition and dynamic method replacement to bypass
 * TypeScript's private method visibility constraints.
 */
export class AuthenticatedA2AClient extends A2AClient {
    private token: string;

    constructor(agentBaseUrl: string, agentCardPath: string, token: string) {
        super(agentBaseUrl, agentCardPath);
        this.token = token;

        // Dynamically replace the private _postRpcRequest method
        // This is a workaround since we can't properly override private methods
        const originalPostRpc = (this as any)._postRpcRequest;
        (this as any)._postRpcRequest = this.authenticatedPostRpcRequest.bind(this);
    }

    private getAuthHeaders() {
        return {
            "Authorization": this.token,
            "Content-Type": "application/json",
            "Accept": "application/json"
        };
    }

    /**
     * Custom implementation that replaces _postRpcRequest to inject auth headers
     */
    private async authenticatedPostRpcRequest(method: string, params: any) {
        const endpoint = await (this as any)._getServiceEndpoint();
        const requestId = (this as any).requestIdCounter++;

        const rpcRequest = {
            jsonrpc: "2.0",
            method,
            params,
            id: requestId
        };

        const httpResponse = await fetch(endpoint, {
            method: "POST",
            headers: this.getAuthHeaders(),
            body: JSON.stringify(rpcRequest)
        });

        if (!httpResponse.ok) {
            let errorBodyText = "(empty or non-JSON response)";
            try {
                errorBodyText = await httpResponse.text();
                const errorJson = JSON.parse(errorBodyText);
                if (!errorJson.jsonrpc && errorJson.error) {
                    throw new Error(
                        `RPC error for ${method}: ${errorJson.error.message} ` +
                        `(Code: ${errorJson.error.code}, HTTP Status: ${httpResponse.status}) ` +
                        `Data: ${JSON.stringify(errorJson.error.data || {})}`
                    );
                } else if (!errorJson.jsonrpc) {
                    throw new Error(
                        `HTTP error for ${method}! Status: ${httpResponse.status} ${httpResponse.statusText}. ` +
                        `Response: ${errorBodyText}`
                    );
                }
            } catch (e: any) {
                if (e.message.startsWith("RPC error for") || e.message.startsWith("HTTP error for")) {
                    throw e;
                }
                throw new Error(
                    `HTTP error for ${method}! Status: ${httpResponse.status} ${httpResponse.statusText}. ` +
                    `Response: ${errorBodyText}`
                );
            }
        }

        const rpcResponse = await httpResponse.json();
        if (rpcResponse.id !== requestId) {
            console.error(
                `CRITICAL: RPC response ID mismatch for method ${method}. ` +
                `Expected ${requestId}, got ${rpcResponse.id}. ` +
                `This may lead to incorrect response handling.`
            );
        }
        return rpcResponse;
    }

    /**
     * Override sendMessageStream to inject auth headers for streaming requests
     */
    async *sendMessageStream(params: any) {
        const agentCard = await (this as any).agentCardPromise;
        if (!agentCard.capabilities?.streaming) {
            throw new Error("Agent does not support streaming (AgentCard.capabilities.streaming is not true).");
        }

        const endpoint = await (this as any)._getServiceEndpoint();
        const clientRequestId = (this as any).requestIdCounter++;

        const rpcRequest = {
            jsonrpc: "2.0",
            method: "message/stream",
            params,
            id: clientRequestId
        };

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                ...this.getAuthHeaders(),
                "Accept": "text/event-stream"
            },
            body: JSON.stringify(rpcRequest)
        });

        if (!response.ok) {
            let errorBody = "";
            try {
                errorBody = await response.text();
                const errorJson = JSON.parse(errorBody);
                if (errorJson.error) {
                    throw new Error(
                        `HTTP error establishing stream for message/stream: ${response.status} ${response.statusText}. ` +
                        `RPC Error: ${errorJson.error.message} (Code: ${errorJson.error.code})`
                    );
                }
            } catch (e: any) {
                if (e.message.startsWith("HTTP error establishing stream")) {
                    throw e;
                }
                throw new Error(
                    `HTTP error establishing stream for message/stream: ${response.status} ${response.statusText}. ` +
                    `Response: ${errorBody || "(empty)"}`
                );
            }
            throw new Error(
                `HTTP error establishing stream for message/stream: ${response.status} ${response.statusText}`
            );
        }

        if (!response.headers.get("Content-Type")?.startsWith("text/event-stream")) {
            throw new Error("Invalid response Content-Type for SSE stream. Expected 'text/event-stream'.");
        }

        yield* (this as any)._parseA2ASseStream(response, clientRequestId);
    }
}
