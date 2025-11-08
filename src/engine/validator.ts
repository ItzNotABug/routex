import path from 'path';
import { promises as fs } from 'fs';
import { Logger } from './logger.js';
import type { RedirectMap, RedirectOptions, VitePressConfig } from './types.js';

/**
 * Handles validation of redirect configuration
 */
export class RedirectValidator {
    constructor(
        private rules: RedirectMap,
        private options: RedirectOptions,
        private vitepressConfig?: VitePressConfig,
    ) {}

    async validate(): Promise<void> {
        this.validateSelfReferences();
        this.validateCircularRedirects();
        this.validatePaths();
        this.validateDelay();

        if (this.vitepressConfig) {
            await this.validateFileConflicts();
            await this.validateDeadLinks();
        }
    }

    private validateSelfReferences(): void {
        const selfRefs = Object.keys(this.rules).filter(
            (source) => this.rules[source] === source,
        );

        if (selfRefs.length > 0) {
            throw new Error(
                `Self-referencing redirects detected: ${selfRefs.join(', ')}`,
            );
        }
    }

    private validateCircularRedirects(): void {
        const visited = new Set<string>();
        const visiting = new Set<string>();

        const detectCircular = (source: string): boolean => {
            if (visiting.has(source)) return true;
            if (visited.has(source)) return false;

            visiting.add(source);
            const dest = this.rules[source];
            if (dest && this.rules[dest] && detectCircular(dest)) {
                return true;
            }

            visiting.delete(source);
            visited.add(source);
            return false;
        };

        for (const source of Object.keys(this.rules)) {
            if (detectCircular(source)) {
                throw new Error(
                    `Circular redirect detected involving: ${source}`,
                );
            }
        }
    }

    private validatePaths(): void {
        // Validate source paths
        Object.keys(this.rules).forEach((source) => {
            if (!source.startsWith('/')) {
                throw new Error(`Source "${source}" must start with "/"`);
            }
        });

        // Validate destination paths
        Object.values(this.rules).forEach((destination) => {
            if (
                !destination.startsWith('/') &&
                !destination.startsWith('http')
            ) {
                throw new Error(
                    `Destination "${destination}" must start with "/" or be a full URL`,
                );
            }
        });
    }

    private validateDelay(): void {
        const delay = this.options.redirectDelay || 0;

        if (delay > 5) {
            Logger.warn(
                `redirectDelay of ${delay}s may negatively impact user experience.`,
                true,
            );
        }
    }

    private async validateFileConflicts(): Promise<void> {
        if (this.options.overrideExisting) return;

        const srcDir = this.vitepressConfig!.vitepress?.srcDir || process.cwd();

        const fileChecks = Object.keys(this.rules).flatMap((source) => {
            const possibleFiles = [
                path.join(srcDir, source.slice(1) + '.md'),
                path.join(srcDir, source.slice(1), 'index.md'),
                path.join(srcDir, source.slice(1) + '.html'),
            ];

            return possibleFiles.map((filePath) => ({
                source,
                filePath,
                check: fs
                    .access(filePath)
                    .then(() => true)
                    .catch(() => false),
            }));
        });

        // execute all file checks in parallel
        const results = await Promise.all(
            fileChecks.map(async (item) => ({
                ...item,
                exists: await item.check,
            })),
        );

        // collect conflicts
        const conflicts = results
            .filter((result) => result.exists)
            .map(
                (result) =>
                    `${result.source} (conflicts with existing file: ${path.relative(process.cwd(), result.filePath)})`,
            );

        if (conflicts.length > 0) {
            throw new Error(
                `Redirect sources conflict with existing pages:\n${conflicts
                    .map((c) => `  - ${c}`)
                    .join(
                        '\n',
                    )}\n\nTo override existing pages, set 'overrideExisting: true' in options.`,
            );
        }
    }

    private async validateDeadLinks(): Promise<void> {
        if (this.options.ignoreDeadLinks) return;

        const srcDir = this.vitepressConfig!.vitepress?.srcDir || process.cwd();
        const internalDestinations = Object.values(this.rules).filter(
            (dest) => !dest.startsWith('http'),
        );

        // build all file existence checks for parallel execution
        const destinationChecks = internalDestinations.map((dest) => {
            const cleanDest = dest.slice(1);
            const possibleDestFiles = [
                path.join(srcDir, cleanDest + '.md'),
                path.join(srcDir, cleanDest, 'index.md'),
                path.join(srcDir, cleanDest + '.html'),
                dest === '/' ? path.join(srcDir, 'index.md') : null,
            ].filter(Boolean) as string[];

            return {
                dest,
                checks: possibleDestFiles.map((filePath) =>
                    fs
                        .access(filePath)
                        .then(() => true)
                        .catch(() => false),
                ),
            };
        });

        // execute all checks in parallel and determine if any file exists
        const results = await Promise.all(
            destinationChecks.map(async (item) => ({
                dest: item.dest,
                exists: (await Promise.all(item.checks)).some(Boolean),
            })),
        );

        // collect dead links
        const deadLinks = results
            .filter((result) => !result.exists)
            .map((result) => result.dest);

        if (deadLinks.length > 0) {
            throw new Error(
                `Dead destination links detected:\n${deadLinks
                    .map((link) => `  - ${link}`)
                    .join(
                        '\n',
                    )}\n\nTo ignore dead links, set 'ignoreDeadLinks: true' in options.`,
            );
        }
    }
}
