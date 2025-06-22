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
        const conflicts: string[] = [];

        for (const source of Object.keys(this.rules)) {
            const possibleFiles = [
                path.join(srcDir, source.slice(1) + '.md'),
                path.join(srcDir, source.slice(1), 'index.md'),
                path.join(srcDir, source.slice(1) + '.html'),
            ];

            for (const filePath of possibleFiles) {
                try {
                    await fs.access(filePath);
                    conflicts.push(
                        `${source} (conflicts with existing file: ${path.relative(process.cwd(), filePath)})`,
                    );
                } catch {
                    // ignore.
                }
            }
        }

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
        const deadLinks: string[] = [];

        for (const dest of Object.values(this.rules)) {
            // Skip external URLs
            if (dest.startsWith('http')) continue;

            const cleanDest = dest.slice(1);
            const possibleDestFiles = [
                path.join(srcDir, cleanDest + '.md'),
                path.join(srcDir, cleanDest, 'index.md'),
                path.join(srcDir, cleanDest + '.html'),
                dest === '/' ? path.join(srcDir, 'index.md') : null,
            ].filter(Boolean);

            let destExists = false;
            for (const filePath of possibleDestFiles) {
                try {
                    await fs.access(filePath!);
                    destExists = true;
                    break;
                } catch (error) {
                    // File doesn't exist, continue checking
                }
            }

            if (!destExists) {
                deadLinks.push(dest);
            }
        }

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
