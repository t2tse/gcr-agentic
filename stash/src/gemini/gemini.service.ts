import { Injectable } from '@nestjs/common';
import { Logger } from 'winston';
import { createLogger } from '../logger/logger';
import { VertexAI } from '@google-cloud/vertexai';

@Injectable()
export class GeminiService {
    private vertexAI: VertexAI;
    private readonly logger: Logger = createLogger(GeminiService.name);

    constructor() {
        this.vertexAI = new VertexAI({ project: process.env.GCP_PROJECT_ID, location: process.env.GCP_REGION });
    }

    async summarize(content: string): Promise<{ summary: string; tags: string[] }> {
        this.logger.info('summarize invoked');
        try {
            const model = this.vertexAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const prompt = `
        Analyze the following text content from a webpage.
        1. Generate a concise summary (max 2 sentences).
        2. Generate up to 3 relevant tags (e.g., Tech, Food, AI).
        
        Return the result as a VALID JSON object with the keys "summary" and "tags". Do not include markdown code blocks.
        
        Content:
        ${content.substring(0, 5000)} // Truncate to avoid token limits
      `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) return { summary: '', tags: [] };

            // Basic cleanup if model returns markdown
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (error) {
            this.logger.error('Gemini processing failed', error);
            return { summary: '', tags: [] };
        }
    }
}
