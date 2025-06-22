/**
 * Handles logging with consistent formatting for the redirects plugin
 */
export class Logger {
    private static readonly PREFIX = '\x1b[2m\x1b[36m[redirects]\x1b[0m';

    static log(message: string): void {
        console.log(`\n${Logger.PREFIX} ${message}`);
    }

    static warn(message: string): void {
        console.warn(`\n${Logger.PREFIX} \x1b[33m⚠\x1b[0m ${message}`);
    }

    static error(message: string): void {
        console.error(`\n${Logger.PREFIX} \x1b[31m✖\x1b[0m ${message}`);
    }
}
