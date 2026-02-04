import { beforeEach, describe, expect, it } from 'vitest';
import { vol } from 'memfs';
import {
    type RedirectMap,
    type RedirectOptions,
    RedirectValidator,
    type VitePressConfig,
} from '../src/engine';

describe('RedirectValidator', () => {
    const mockVitePressConfig: VitePressConfig = {
        build: { ssr: false, outDir: 'dist' },
        vitepress: {
            srcDir: '/test/src',
            outDir: '/test/dist',
        },
    } as VitePressConfig;

    const defaultOptions: Required<RedirectOptions> = {
        enable: true,
        addCanonical: false,
        addNoIndexMeta: false,
        redirectDelay: 0,
        template: '',
        overrideExisting: false,
        ignoreDeadLinks: false,
    };

    beforeEach(() => {
        vol.reset();
    });

    describe('basic validation', () => {
        it('should pass for valid redirects', async () => {
            setupFileSystem({
                '/test/src/new-page.md': '# New Page',
                '/test/src/api/v2.md': '# API v2',
            });

            const rules: RedirectMap = {
                '/old-page': '/new-page',
                '/api/v1': '/api/v2',
                '/external': 'https://example.com',
            };

            const validator = new RedirectValidator(
                rules,
                defaultOptions,
                mockVitePressConfig,
            );

            expect(validator.validate()).resolves.not.toThrow();
        });

        it('should detect self-referencing redirects', async () => {
            const rules: RedirectMap = {
                '/page': '/page',
                '/other': '/different',
            };

            const validator = new RedirectValidator(
                rules,
                defaultOptions,
                mockVitePressConfig,
            );

            expect(validator.validate()).rejects.toThrow(
                'Self-referencing redirects detected: /page',
            );
        });

        it('should detect circular redirects', async () => {
            const rules: RedirectMap = {
                '/a': '/b',
                '/b': '/a',
            };

            const validator = new RedirectValidator(
                rules,
                defaultOptions,
                mockVitePressConfig,
            );

            expect(validator.validate()).rejects.toThrow(
                'Circular redirect detected involving: /a',
            );
        });
    });

    describe('path validation', () => {
        it('should reject invalid source paths', async () => {
            const rules: RedirectMap = {
                'invalid-source': '/valid-destination',
            };

            const validator = new RedirectValidator(
                rules,
                defaultOptions,
                mockVitePressConfig,
            );

            expect(validator.validate()).rejects.toThrow(
                'Source "invalid-source" must start with "/"',
            );
        });

        it('should reject invalid destination paths', async () => {
            const rules: RedirectMap = {
                '/source': 'invalid-destination',
            };

            const validator = new RedirectValidator(
                rules,
                defaultOptions,
                mockVitePressConfig,
            );

            expect(validator.validate()).rejects.toThrow(
                'must start with "/" or be a full URL',
            );
        });

        it('should accept external URLs as destinations', async () => {
            const rules: RedirectMap = {
                '/external1': 'https://example.com',
                '/external2': 'http://github.com',
            };

            const validator = new RedirectValidator(
                rules,
                defaultOptions,
                mockVitePressConfig,
            );

            expect(validator.validate()).resolves.not.toThrow();
        });
    });

    describe('file conflict validation', () => {
        it('should detect conflicts with existing files', async () => {
            setupFileSystem({
                '/test/src/existing-page.md': '# Existing Page',
            });

            const rules: RedirectMap = {
                '/existing-page': '/new-location',
            };

            const validator = new RedirectValidator(
                rules,
                defaultOptions,
                mockVitePressConfig,
            );

            expect(validator.validate()).rejects.toThrow(
                'Redirect sources conflict with existing pages',
            );
        });

        it('should allow conflicts when overrideExisting is true', async () => {
            setupFileSystem({
                '/test/src/existing-page.md': '# Existing Page',
                '/test/src/new-location.md': '# New Location',
            });

            const options = { ...defaultOptions, overrideExisting: true };
            const rules: RedirectMap = {
                '/existing-page': '/new-location',
            };

            const validator = new RedirectValidator(
                rules,
                options,
                mockVitePressConfig,
            );

            expect(validator.validate()).resolves.not.toThrow();
        });
    });

    describe('dead link validation', () => {
        it('should detect dead internal links', async () => {
            const rules: RedirectMap = {
                '/old-page': '/non-existent-page',
            };

            const validator = new RedirectValidator(
                rules,
                defaultOptions,
                mockVitePressConfig,
            );

            expect(validator.validate()).rejects.toThrow(
                'Dead destination links detected',
            );
        });

        it('should ignore external URLs', async () => {
            const rules: RedirectMap = {
                '/external': 'https://example.com',
            };

            const validator = new RedirectValidator(
                rules,
                defaultOptions,
                mockVitePressConfig,
            );

            expect(validator.validate()).resolves.not.toThrow();
        });

        it('should skip dead link validation when ignoreDeadLinks is true', async () => {
            const options = { ...defaultOptions, ignoreDeadLinks: true };
            const rules: RedirectMap = {
                '/old-page': '/non-existent-page',
            };

            const validator = new RedirectValidator(
                rules,
                options,
                mockVitePressConfig,
            );

            expect(validator.validate()).resolves.not.toThrow();
        });

        it('should accept redirects with hash fragments', async () => {
            setupFileSystem({
                '/test/src/page.md': '# Page Content',
            });

            const rules: RedirectMap = {
                '/old': '/page#section',
                '/another': '/page#another-section',
            };

            const validator = new RedirectValidator(
                rules,
                defaultOptions,
                mockVitePressConfig,
            );

            expect(validator.validate()).resolves.not.toThrow();
        });

        it('should accept redirects with query parameters', async () => {
            setupFileSystem({
                '/test/src/search.md': '# Search Page',
            });

            const rules: RedirectMap = {
                '/old-search': '/search?query=test',
                '/filter': '/search?category=docs&sort=date',
            };

            const validator = new RedirectValidator(
                rules,
                defaultOptions,
                mockVitePressConfig,
            );

            expect(validator.validate()).resolves.not.toThrow();
        });

        it('should accept redirects with both hash and query parameters', async () => {
            setupFileSystem({
                '/test/src/docs/api.md': '# API Documentation',
            });

            const rules: RedirectMap = {
                '/api-old': '/docs/api?version=2#authentication',
                '/auth': '/docs/api#auth?section=oauth',
            };

            const validator = new RedirectValidator(
                rules,
                defaultOptions,
                mockVitePressConfig,
            );

            expect(validator.validate()).resolves.not.toThrow();
        });

        it('should still detect dead links even with hash fragments', async () => {
            const rules: RedirectMap = {
                '/old': '/non-existent#section',
            };

            const validator = new RedirectValidator(
                rules,
                defaultOptions,
                mockVitePressConfig,
            );

            expect(validator.validate()).rejects.toThrow(
                'Dead destination links detected',
            );
        });

        it('should still detect dead links even with query parameters', async () => {
            const rules: RedirectMap = {
                '/search': '/non-existent?query=test',
            };

            const validator = new RedirectValidator(
                rules,
                defaultOptions,
                mockVitePressConfig,
            );

            expect(validator.validate()).rejects.toThrow(
                'Dead destination links detected',
            );
        });
    });

    describe('edge cases', () => {
        it('should handle empty rules', async () => {
            const validator = new RedirectValidator(
                {},
                defaultOptions,
                mockVitePressConfig,
            );

            expect(validator.validate()).resolves.not.toThrow();
        });

        it('should work without VitePress config', async () => {
            const rules: RedirectMap = {
                '/basic': '/target',
            };

            const validator = new RedirectValidator(
                rules,
                defaultOptions,
                undefined,
            );

            expect(validator.validate()).resolves.not.toThrow();
        });
    });
});
