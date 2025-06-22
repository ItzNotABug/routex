import path from 'path';
import { promises as fs } from 'fs';
import { Logger } from './logger.js';
import { Template } from './template.js';
import { sanitizePath } from './utils.js';
import type { RedirectMap, RedirectOptions, VitePressConfig } from './types.js';

/**
 * Handles generation of redirect files and scripts
 */
export class RedirectGenerator {
    constructor(
        private rules: RedirectMap,
        private options: RedirectOptions,
        private vitepressConfig?: VitePressConfig,
    ) {}

    injectClientScript(html: string): string {
        const redirectsJson = JSON.stringify(this.rules, null, 2);

        const scriptContent = `
            function performRedirect() {
                const redirects = ${redirectsJson};
                const destination = redirects[location.pathname];

                if (destination) {
                    try {
                        location.replace(destination);
                    } catch (error) {
                        console.warn('Redirect failed, using fallback:', error);
                        location.href = destination;
                    }
                }
            }

            performRedirect();
        `.trim();

        const script = `<script>\n        ${scriptContent.split('\n').join('\n        ')}\n    </script>`;
        return html.replace('<head>', `<head>\n    ${script}`);
    }

    async generateRedirectPage(
        source: string,
        destination: string,
        templateManager: Template,
    ): Promise<string> {
        const delay = this.options.redirectDelay || 0;
        const template = await templateManager.resolveTemplate();
        const metaTags = this.createMetaTags(destination, delay);

        return templateManager.processTemplate(
            template,
            source,
            destination,
            metaTags,
            delay,
        );
    }

    async generateAllRedirectFiles(outDir: string): Promise<void> {
        const redirectCount = Object.keys(this.rules).length;
        if (redirectCount === 0) return;

        Logger.log(
            `Generating ${redirectCount} redirect page${redirectCount > 1 ? 's' : ''}...`,
            true,
        );

        const templateManager = new Template(
            this.options,
            this.vitepressConfig,
        );

        await Promise.all(
            Object.entries(this.rules).map(async ([from, to]) => {
                const filePath = path.join(
                    outDir,
                    sanitizePath(from),
                    'index.html',
                );

                const html = await this.generateRedirectPage(
                    from,
                    to,
                    templateManager,
                );

                await fs.mkdir(path.dirname(filePath), { recursive: true });
                await fs.writeFile(filePath, html, 'utf8');
            }),
        );

        Logger.log(
            `✓ Generated ${redirectCount} redirect page${redirectCount > 1 ? 's' : ''}`,
        );
    }

    private createMetaTags(destination: string, delay: number): string {
        const tags: string[] = [];

        // Meta refresh for SEO, crawlers, and non-JS fallback
        tags.push(
            `<meta http-equiv="refresh" content="${delay}; url=${destination}">`,
        );

        if (this.options.addNoIndexMeta) {
            tags.push(`<meta name="robots" content="noindex, nofollow">`);
        }

        if (this.options.addCanonical) {
            tags.push(`<link rel="canonical" href="${destination}">`);
        }

        return tags.join('\n    ');
    }
}
