import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Logger } from 'winston';
import { createLogger } from '../logger/logger';
import * as admin from 'firebase-admin';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { FirestoreDatabaseProvider } from '../firestore/firestore.providers';
import { GeminiService } from '../gemini/gemini.service';
import { CreateLinkDto } from './dto/create-link.dto';

@Injectable()
export class LinksService {
    private readonly logger: Logger = createLogger(LinksService.name);

    constructor(
        @Inject(FirestoreDatabaseProvider)
        private readonly firestore: admin.firestore.Firestore,
        private readonly geminiService: GeminiService,
    ) { }

    private get collection() {
        return this.firestore.collection('stash_links');
    }

    async create(userId: string, createLinkDto: CreateLinkDto) {
        this.logger.info('create invoked');
        try {
            const { url } = createLinkDto;
            let title = url;
            let image = '';
            let contentForGemini = '';

            try {
                const response = await axios.get(url, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StashBot/1.0)' },
                    timeout: 5000
                });
                const $ = cheerio.load(response.data);
                title = $('meta[property="og:title"]').attr('content') || $('title').text() || url;
                image = $('meta[property="og:image"]').attr('content') || '';
                // Simple text extraction
                contentForGemini = $('body').text().replace(/\s+/g, ' ').trim();
            } catch (e) {
                this.logger.warn(`Failed to fetch metadata for ${url}: ${e.message}`);
            }

            let aiData = { summary: '', tags: [] as string[] };

            // If either AI feature is requested, we might need to call Gemini
            // Ideally Gemini service could handle this granularity, but for now we'll fetch both if either is needed
            // and filter the result. Or simpler: if both are false, skip.
            const shouldCallGemini = (createLinkDto.generateSummary !== false) || (createLinkDto.autoTag !== false);

            if (shouldCallGemini && contentForGemini) {
                const result = await this.geminiService.summarize(contentForGemini);
                if (createLinkDto.generateSummary !== false) {
                    aiData.summary = result.summary;
                }
                if (createLinkDto.autoTag !== false) {
                    aiData.tags = result.tags;
                }
            }

            const link = {
                userId,
                url,
                title,
                image,
                summary: aiData.summary,
                tags: aiData.tags,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            const docRef = await this.collection.add(link);
            const doc = await docRef.get();
            return { id: doc.id, ...doc.data() };
        } catch (error) {
            this.logger.error('Error in create', error);
            throw error;
        }
    }

    async findAll(userId: string, tag?: string) {
        this.logger.info('findAll invoked');
        try {
            let query = this.collection.where('userId', '==', userId);

            if (tag) {
                query = query.where('tags', 'array-contains', tag);
            }

            const snapshot = await query.get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            this.logger.error('Error in findAll', error);
            throw error;
        }
    }

    async remove(userId: string, id: string) {
        this.logger.info('remove invoked');
        try {
            const docRef = this.collection.doc(id);
            const doc = await docRef.get();
            if (!doc.exists) throw new NotFoundException('Link not found');
            if (doc.data()!.userId !== userId) throw new NotFoundException('Link not found');

            await docRef.delete();
            return { id };
        } catch (error) {
            this.logger.error('Error in remove', error);
            throw error;
        }
    }

    async getStats(userId: string) {
        this.logger.info('getStats invoked');
        try {
            const snapshot = await this.collection.where('userId', '==', userId).get();
            const links = snapshot.docs.map(d => d.data());
            const totalStashed = links.length;
            const aiSummarized = links.filter(l => l.summary && l.summary.length > 0).length;
            return { totalStashed, aiSummarized };
        } catch (error) {
            this.logger.error('Error in getStats', error);
            throw error;
        }
    }
}
