import { vol } from 'memfs';
import { routex } from '../src/routex';
import type { RedirectConfig } from '../src/engine';
import { beforeEach, describe, expect, it } from 'vitest';

declare function setupFileSystem(files: Record<string, string>): void;

describe('routex', () => {
    beforeEach(() => {
        vol.reset();
    });

    describe('plugin creation', () => {
        it('should return a valid Vite plugin', () => {
            const config: RedirectConfig = { '/old': '/new' };
            const plugin = routex(config);

            expect(plugin).toHaveProperty('name', 'routex');
            expect(plugin).toHaveProperty('transformIndexHtml');
            expect(plugin).toHaveProperty('configResolved');
            expect(plugin).toHaveProperty('generateBundle');
            expect(typeof plugin.transformIndexHtml).toBe('function');
            expect(typeof plugin.configResolved).toBe('function');
            expect(typeof plugin.generateBundle).toBe('function');
        });

        it('should handle simple redirect map', () => {
            const config: RedirectConfig = {
                '/old-page': '/new-page',
                '/legacy': '/modern',
            };

            const plugin = routex(config);
            expect(plugin.name).toBe('routex');
        });

        it('should handle config object with options', () => {
            const config: RedirectConfig = {
                rules: { '/api/v1': '/api/v2' },
                options: { redirectDelay: 3 },
            };

            const plugin = routex(config);
            expect(plugin.name).toBe('routex');
        });
    });

    describe('disabled plugin', () => {
        it('should return minimal plugin when disabled', () => {
            const config: RedirectConfig = {
                rules: { '/old': '/new' },
                options: { enable: false },
            };

            const plugin = routex(config);
            const html = '<html><head></head><body></body></html>';

            if (typeof plugin.transformIndexHtml === 'function') {
                const result = plugin.transformIndexHtml(html, {} as any);
                expect(result).toBe(html); // Should return unchanged
            }
        });
    });

    describe('transformIndexHtml', () => {
        it('should inject client script for enabled plugin', () => {
            const config: RedirectConfig = { '/old': '/new' };
            const plugin = routex(config);
            const html =
                '<html><head><title>Test</title></head><body></body></html>';

            if (typeof plugin.transformIndexHtml === 'function') {
                const result = plugin.transformIndexHtml(
                    html,
                    {} as any,
                ) as string;

                expect(result).toContain('<script>');
                expect(result).toContain('function performRedirect()');
                expect(result).toContain('"/old":"/new"');
                expect(result).toContain('location.replace(destination)');
            }
        });

        it('should handle empty redirect rules', () => {
            const config: RedirectConfig = {};
            const plugin = routex(config);
            const html = '<html><head></head><body></body></html>';

            if (typeof plugin.transformIndexHtml === 'function') {
                const result = plugin.transformIndexHtml(
                    html,
                    {} as any,
                ) as string;
                expect(result).toContain('const redirects = {}');
            }
        });
    });

    describe('configResolved', () => {
        it('should handle config resolution', async () => {
            setupFileSystem({
                '/test/src/target.md': '# Target Page',
            });

            const config: RedirectConfig = { '/test': '/target' };
            const plugin = routex(config);

            const mockResolvedConfig = {
                build: { ssr: false },
                vitepress: {
                    srcDir: '/test/src',
                    outDir: '/test/dist',
                },
            };

            if (typeof plugin.configResolved === 'function') {
                // Should not throw
                await expect(
                    plugin.configResolved(mockResolvedConfig as any),
                ).resolves.not.toThrow();
            }
        });

        it('should skip validation for SSR builds', async () => {
            const config: RedirectConfig = { '/test': '/target' };
            const plugin = routex(config);

            const mockSSRConfig = {
                build: { ssr: true },
                vitepress: {
                    srcDir: '/test/src',
                    outDir: '/test/dist',
                },
            };

            if (typeof plugin.configResolved === 'function') {
                // Should not throw even with invalid redirects in SSR mode
                await expect(
                    plugin.configResolved(mockSSRConfig as any),
                ).resolves.not.toThrow();
            }
        });
    });

    describe('generateBundle', () => {
        it('should generate redirect files', async () => {
            setupFileSystem({
                '/test/src/target.md': '# Target Page',
            });

            const config: RedirectConfig = {
                '/old': '/target',
                '/legacy': '/target',
            };

            const plugin = routex(config);

            const mockConfig = {
                build: { ssr: false },
                vitepress: {
                    srcDir: '/test/src',
                    outDir: '/test/dist',
                },
            };

            // Simulate the plugin lifecycle
            if (typeof plugin.configResolved === 'function') {
                await plugin.configResolved(mockConfig as any);
            }

            if (typeof plugin.generateBundle === 'function') {
                const args = {} as any;
                await plugin.generateBundle.call(args, args, args, true);
            }

            // Check that files were created
            const files = vol.toJSON();
            expect(files['/test/dist/old/index.html']).toBeDefined();
            expect(files['/test/dist/legacy/index.html']).toBeDefined();
        });

        it('should skip generation for SSR builds', async () => {
            const config: RedirectConfig = { '/old': '/new' };
            const plugin = routex(config);

            const mockSSRConfig = {
                build: { ssr: true },
                vitepress: {
                    srcDir: '/test/src',
                    outDir: '/test/dist',
                },
            };

            if (typeof plugin.configResolved === 'function') {
                await plugin.configResolved(mockSSRConfig as any);
            }

            if (typeof plugin.generateBundle === 'function') {
                const args = {} as any;
                await plugin.generateBundle.call(args, args, args, true);
            }

            // No files should be created for SSR builds
            const files = vol.toJSON();
            expect(Object.keys(files)).toHaveLength(0);
        });
    });

    describe('integration', () => {
        it('should handle complete plugin lifecycle', async () => {
            setupFileSystem({
                '/test/src/new-page.md': '# New Page',
                '/test/src/api/v2.md': '# API v2',
            });

            const config: RedirectConfig = {
                rules: {
                    '/old-page': '/new-page',
                    '/api/v1': '/api/v2',
                },
                options: {
                    addCanonical: true,
                    redirectDelay: 2,
                },
            };

            const plugin = routex(config);

            // Transform HTML
            const html =
                '<html><head><title>Test</title></head><body></body></html>';
            let transformedHtml = html;
            if (typeof plugin.transformIndexHtml === 'function') {
                transformedHtml = plugin.transformIndexHtml(
                    html,
                    {} as any,
                ) as string;
            }

            expect(transformedHtml).toContain('<script>');
            expect(transformedHtml).toContain('"/old-page":"/new-page"');
            expect(transformedHtml).toContain('"/api/v1":"/api/v2"');

            // Resolve config and generate bundle
            const mockConfig = {
                build: { ssr: false },
                vitepress: {
                    srcDir: '/test/src',
                    outDir: '/test/dist',
                },
            };

            if (typeof plugin.configResolved === 'function') {
                await plugin.configResolved(mockConfig as any);
            }

            if (typeof plugin.generateBundle === 'function') {
                const args = {} as any;
                await plugin.generateBundle.call(args, args, args, true);
            }

            // Verify generated files
            const files = vol.toJSON();
            expect(files['/test/dist/old-page/index.html']).toBeDefined();
            expect(files['/test/dist/api/v1/index.html']).toBeDefined();

            const pageContent = files[
                '/test/dist/old-page/index.html'
            ] as string;

            expect(pageContent).toContain(
                '<meta http-equiv="refresh" content="2; url=/new-page">',
            );

            expect(pageContent).toContain(
                '<link rel="canonical" href="/new-page">',
            );
        });
    });
});
