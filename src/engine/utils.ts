import type { RedirectConfig, RedirectMap, RedirectOptions } from './types.js';

/**
 * Default options for redirect configuration
 */
const DEFAULT_OPTIONS: Required<RedirectOptions> = {
    enable: true,
    addCanonical: false,
    addNoIndexMeta: false,
    redirectDelay: 0,
    template: '',
    overrideExisting: false,
    ignoreDeadLinks: false,
};

/**
 * Normalizes config input to always return rules + options with defaults
 * @param config - Raw redirect configuration
 * @returns Normalized configuration with default options
 */
export function normalizeConfig(config: RedirectConfig): {
    rules: RedirectMap;
    options: Required<RedirectOptions>;
} {
    if (isRedirectConfigObject(config)) {
        return {
            rules: config.rules,
            options: { ...DEFAULT_OPTIONS, ...config.options },
        };
    }

    return {
        rules: config,
        options: DEFAULT_OPTIONS,
    };
}

/**
 * Type guard to check if config is the object format with rules and options
 */
export function isRedirectConfigObject(
    config: RedirectConfig,
): config is { rules: RedirectMap; options?: RedirectOptions } {
    return typeof config === 'object' && config !== null && 'rules' in config;
}

/**
 * Sanitizes a path for use in file system operations
 */
export function sanitizePath(inputPath: string): string {
    return inputPath.replace(/^\/+/, '').replace(/\/+$/, '');
}
