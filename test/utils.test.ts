import { describe, expect, it } from 'vitest';
import type { RedirectConfig, RedirectMap } from '../src/engine';
import {
    isRedirectConfigObject,
    normalizeConfig,
    sanitizePath,
} from '../src/engine/utils';

describe('utils', () => {
    describe('normalizeConfig', () => {
        it('should normalize simple redirect map', () => {
            const input: RedirectMap = {
                '/old': '/new',
                '/legacy': '/modern',
            };

            const result = normalizeConfig(input);

            expect(result.rules).toEqual(input);
            expect(result.options.enable).toBe(true);
            expect(result.options.redirectDelay).toBe(0);
        });

        it('should normalize config object with rules and options', () => {
            const input: RedirectConfig = {
                rules: {
                    '/old': '/new',
                },
                options: {
                    addCanonical: true,
                    redirectDelay: 2,
                },
            };

            const result = normalizeConfig(input);

            expect(result.rules).toEqual(input.rules);
            expect(result.options.addCanonical).toBe(true);
            expect(result.options.redirectDelay).toBe(2);
            expect(result.options.enable).toBe(true);
        });

        it('should handle disabled configuration', () => {
            const input: RedirectConfig = {
                rules: { '/old': '/new' },
                options: { enable: false },
            };

            const result = normalizeConfig(input);

            expect(result.options.enable).toBe(false);
            expect(result.rules).toEqual({ '/old': '/new' });
        });

        it('should handle empty rules', () => {
            const input: RedirectMap = {};

            const result = normalizeConfig(input);

            expect(result.rules).toEqual({});
            expect(result.options.enable).toBe(true);
        });
    });

    describe('isRedirectConfigObject', () => {
        it('should return true for config object with rules', () => {
            const config = {
                rules: { '/old': '/new' },
                options: { enable: true },
            };

            expect(isRedirectConfigObject(config)).toBe(true);
        });

        it('should return false for simple redirect map', () => {
            const config = {
                '/old': '/new',
                '/legacy': '/modern',
            };

            expect(isRedirectConfigObject(config)).toBe(false);
        });

        it('should return false for invalid inputs', () => {
            expect(isRedirectConfigObject(null as any)).toBe(false);
            expect(isRedirectConfigObject(undefined as any)).toBe(false);
            expect(isRedirectConfigObject('string' as any)).toBe(false);
            expect(isRedirectConfigObject([] as any)).toBe(false);
        });
    });

    describe('sanitizePath', () => {
        it('should remove leading and trailing slashes', () => {
            expect(sanitizePath('/path')).toBe('path');
            expect(sanitizePath('path/')).toBe('path');
            expect(sanitizePath('/path/')).toBe('path');
            expect(sanitizePath('//path//')).toBe('path');
        });

        it('should handle empty string and slashes only', () => {
            expect(sanitizePath('')).toBe('');
            expect(sanitizePath('/')).toBe('');
            expect(sanitizePath('//')).toBe('');
        });

        it('should preserve internal slashes', () => {
            expect(sanitizePath('/path/to/file/')).toBe('path/to/file');
            expect(sanitizePath('/api/v1/users/')).toBe('api/v1/users');
        });

        it('should handle special characters', () => {
            expect(sanitizePath('/path-with-dashes/')).toBe('path-with-dashes');
            expect(sanitizePath('/path.with.dots/')).toBe('path.with.dots');
        });
    });
});
