/**
 * Handles logging with consistent formatting for the redirects plugin
 */
export class Logger {
    private static readonly PREFIX = '\x1b[2m\x1b[36m[redirects]\x1b[0m';

    static log(message: string, spaced = false): void {
        console.log(`${spaced ? '\n' : ''}${Logger.PREFIX} ${message}`);
    }

    static warn(message: string, spaced = false): void {
        console.warn(
            `${spaced ? '\n' : ''}${Logger.PREFIX} \x1b[33m⚠\x1b[0m ${message}`,
        );
    }

    static error(message: string, spaced = false): void {
        console.error(
            `${spaced ? '\n' : ''}${Logger.PREFIX} \x1b[31m✖\x1b[0m ${message}`,
        );
    }
}
