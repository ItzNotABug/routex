import type { ResolvedConfig } from 'vite';
import type { SiteConfig, UserConfig } from 'vitepress';

/** Vitepress config type mapping */
export interface VitePressConfig
    extends Omit<UserConfig, keyof ResolvedConfig>,
        ResolvedConfig {
    vitepress: SiteConfig;
}

/** Mapping of source paths to destination URLs */
export type RedirectMap = Record<string, string>;

/** Configuration options for redirect behavior */
export interface RedirectOptions {
    /** Enable or disable redirect functionality. */
    enable?: boolean;

    /** Add canonical link tag for SEO. */
    addCanonical?: boolean;

    /** Add noindex meta tag to prevent indexing of redirect pages. */
    addNoIndexMeta?: boolean;

    /** Delay before redirect in seconds. */
    redirectDelay?: number;

    /**
     * Custom template - can be file path or HTML content with placeholders.
     * Available placeholders: {source}, {destination}, {redirectDelay}, {metaTags}
     *
     * @example './redirect.html' or '<html>...</html>'
     */
    template?: string;

    /** Allow redirects to override existing pages. */
    overrideExisting?: boolean;

    /** Skip validation for dead destination links. */
    ignoreDeadLinks?: boolean;
}

/**
 * Redirect configuration - either a simple map or detailed config with options.
 *
 * @example
 * // simple usage
 * { '/old': '/new', '/legacy': '/modern' }
 *
 * // with options
 * {
 *   rules: { '/old': '/new' },
 *   options: { redirectDelay: 2, addCanonical: true }
 * }
 */
export type RedirectConfig =
    | RedirectMap
    | {
          rules: RedirectMap;
          options?: RedirectOptions;
      };
