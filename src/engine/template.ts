import path from 'path';
import { promises as fs } from 'fs';
import { Logger } from './logger.js';
import type { RedirectOptions, VitePressConfig } from './types.js';

/**
 * Handles template resolution and processing
 */
export class Template {
    private cachedTemplate?: string;

    constructor(
        private options: RedirectOptions,
        private vitepressConfig?: VitePressConfig,
    ) {}

    async resolveTemplate(): Promise<string> {
        // return cached if available
        if (this.cachedTemplate !== undefined) {
            return this.cachedTemplate;
        }

        let template = this.options.template;

        if (template) {
            template = await this.loadTemplate(template);
        }

        // cache the resolved template
        this.cachedTemplate = template || this.getDefaultTemplate();
        return this.cachedTemplate;
    }

    private async loadTemplate(template: string): Promise<string | undefined> {
        try {
            // Check if it's inline HTML
            if (template.includes('<html') || template.includes('<!DOCTYPE')) {
                return template;
            }

            // It's a file path, resolve and read it
            let templatePath = template;
            if (!path.isAbsolute(templatePath)) {
                const configDir =
                    this.vitepressConfig?.vitepress?.srcDir || process.cwd();
                templatePath = path.resolve(configDir, templatePath);
            }

            return await fs.readFile(templatePath, 'utf8');
        } catch (error) {
            Logger.error(`Failed to read template file: ${template}`);
            return undefined;
        }
    }

    processTemplate(
        template: string,
        source: string,
        destination: string,
        metaTags: string,
        delay: number,
    ): string {
        return template
            .replace(/{source}/g, source)
            .replace(/{destination}/g, destination)
            .replace(/{redirectDelay}/g, delay.toString())
            .replace(/{metaTags}/g, metaTags);
    }

    private getDefaultTemplate(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redirecting...</title>
    {metaTags}
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8f9fa;
            color: #495057;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
        }

        .container {
            text-align: center;
            max-width: 400px;
        }

        h1 {
            font-size: 1.25rem;
            margin-bottom: 12px;
            font-weight: 500;
        }

        p {
            margin-bottom: 20px;
            font-size: 0.9rem;
            line-height: 1.4;
        }

        a {
            color: #6c757d;
            text-decoration: none;
            font-size: 0.9rem;
        }

        a:hover {
            color: #495057;
            text-decoration: underline;
        }

        noscript {
            display: none;
        }

        @media (prefers-color-scheme: dark) {
            body {
                background: #1a1a1a;
                color: #d4d4d4;
            }

            a {
                color: #a8a8a8;
            }

            a:hover {
                color: #d4d4d4;
            }
        }
    </style>
    <script>
        setTimeout(() => {
            try {
                location.replace('{destination}');
            } catch (error) {
                location.href = '{destination}';
            }
        }, {redirectDelay} * 1000);
    </script>
</head>
<body>
    <div class="container js-content">
        <h1>Redirecting…</h1>
        <p>You're being redirected to <span style="color: #6c757d">{destination}</span></p>
        <p>If you're not redirected automatically, <a href="{destination}">click here to continue</a>.</p>
    </div>

    <noscript>
        <style>
            noscript { display: block !important; }
            .js-content { display: none !important; }
        </style>
        <div class="container">
            <h1>Redirecting…</h1>
            <p>JavaScript is disabled in your browser.</p>
            <p>Please <a href="{destination}">click here</a> to continue to <span style="color: #6c757d">{destination}</span>.</p>
        </div>
    </noscript>
</body>
</html>`;
    }
}
