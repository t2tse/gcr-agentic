import * as winston from 'winston';

const { combine, timestamp, printf, colorize } = winston.format;

const logFormat = printf(({ level, message, timestamp, context }) => {
    return `${timestamp} [${context || 'Application'}] ${level}: ${message}`;
});

export const createLogger = (context: string) => {
    return winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: combine(
            colorize(),
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            logFormat
        ),
        transports: [
            new winston.transports.Console({
                stderrLevels: ['error'], // Ensure errors go to stderr
            }),
        ],
        defaultMeta: { context },
    });
};
