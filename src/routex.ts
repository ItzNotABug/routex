import type { Plugin, ResolvedConfig } from 'vite';
import {
    normalizeConfig,
    type RedirectConfig,
    RedirectGenerator,
    RedirectValidator,
    type VitePressConfig,
} from './engine/index.js';

/**
 * VitePress plugin for handling client-side static redirects
 *
 * @param config - Redirect configuration mapping old paths to new ones
 * @returns Vite plugin for VitePress
 *
 * @example
 * ```ts
 * // Basic usage
 * routex({
 *   '/old-page': '/new-page',
 *   '/legacy/docs': '/docs'
 * })
 *
 * // With options
 * routex({
 *   rules: {
 *     '/old-api': '/api/v2'
 *   },
 *   options: {
 *     redirectDelay: 3,
 *     addCanonical: true,
 *     template: './custom-redirect.html'
 *   }
 * })
 * ```
 */
export function routex(config: RedirectConfig): Plugin {
    const { rules, options } = normalizeConfig(config);

    if (!options.enable) {
        return {
            name: 'routex',
            transformIndexHtml: (html: string) => html,
        };
    }

    let isSsrBuild = false;
    let vitePressConfig: VitePressConfig;

    return {
        name: 'routex',

        transformIndexHtml(html: string) {
            const generator = new RedirectGenerator(
                rules,
                options,
                vitePressConfig,
            );
            return generator.injectDevelopmentClientScript(html);
        },

        async configResolved(resolvedConfig: ResolvedConfig) {
            isSsrBuild = !!resolvedConfig.build?.ssr;
            vitePressConfig = resolvedConfig as VitePressConfig;

            // Validate after config is resolved
            if (!isSsrBuild) {
                const validator = new RedirectValidator(
                    rules,
                    options,
                    vitePressConfig,
                );
                await validator.validate();
            }
        },

        async generateBundle() {
            if (isSsrBuild) return;

            const outDir = vitePressConfig?.vitepress?.outDir ?? 'dist';
            const generator = new RedirectGenerator(
                rules,
                options,
                vitePressConfig,
            );

            await generator.generateAllRedirectFiles(outDir);
        },
    };
}

export type {
    RedirectConfig,
    RedirectMap,
    RedirectOptions,
    VitePressConfig,
} from './engine/index.js';
