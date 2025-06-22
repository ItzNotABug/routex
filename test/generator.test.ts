import { vol } from 'memfs';
import { describe, it, expect, beforeEach } from 'vitest';
import {
    RedirectGenerator,
    type RedirectMap,
    type RedirectOptions,
    type VitePressConfig,
} from '../src/engine';

describe('RedirectGenerator', () => {
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

    describe('injectClientScript', () => {
        it('should inject redirect script with rules', () => {
            const rules: RedirectMap = {
                '/old-page': '/new-page',
                '/legacy': '/modern',
            };

            const generator = new RedirectGenerator(
                rules,
                defaultOptions,
                mockVitePressConfig,
            );

            const html =
                '<html><head><title>Test</title></head><body></body></html>';
            const result = generator.injectDevelopmentClientScript(html);

            expect(result).toContain('<script>');
            expect(result).toContain('function performRedirect()');
            expect(result).toContain('"/old-page": "/new-page"');
            expect(result).toContain('"/legacy": "/modern"');
            expect(result).toContain('location.replace(destination)');
        });

        it('should handle empty rules', () => {
            const generator = new RedirectGenerator(
                {},
                defaultOptions,
                mockVitePressConfig,
            );

            const html = '<html><head></head><body></body></html>';
            const result = generator.injectDevelopmentClientScript(html);

            expect(result).toContain('const redirects = {}');
        });
    });

    describe('generateAllRedirectFiles', () => {
        it('should create redirect files for all rules', async () => {
            const rules: RedirectMap = {
                '/old-page': '/new-page',
                '/api/v1': '/api/v2',
            };

            const generator = new RedirectGenerator(
                rules,
                defaultOptions,
                mockVitePressConfig,
            );

            await generator.generateAllRedirectFiles('/test/dist');

            const files = vol.toJSON();
            expect(files['/test/dist/old-page/index.html']).toBeDefined();
            expect(files['/test/dist/api/v1/index.html']).toBeDefined();

            const content = files['/test/dist/old-page/index.html'] as string;
            expect(content).toContain('/new-page');
            expect(content).toContain('<!DOCTYPE html>');
        });

        it('should skip generation when no rules exist', async () => {
            const generator = new RedirectGenerator(
                {},
                defaultOptions,
                mockVitePressConfig,
            );

            await generator.generateAllRedirectFiles('/test/dist');

            const files = vol.toJSON();
            expect(Object.keys(files)).toHaveLength(0);
        });

        it('should include meta tags when options are enabled', async () => {
            const options: Required<RedirectOptions> = {
                ...defaultOptions,
                addCanonical: true,
                addNoIndexMeta: true,
                redirectDelay: 3,
            };

            const generator = new RedirectGenerator(
                { '/old': '/new' },
                options,
                mockVitePressConfig,
            );

            await generator.generateAllRedirectFiles('/test/dist');

            const files = vol.toJSON();
            const content = files['/test/dist/old/index.html'] as string;

            expect(content).toContain(
                '<meta http-equiv="refresh" content="3; url=/new">',
            );
            expect(content).toContain(
                '<meta name="robots" content="noindex, nofollow">',
            );
            expect(content).toContain('<link rel="canonical" href="/new">');
        });

        it('should inject client script for immediate redirect when delay is 0', async () => {
            const options: Required<RedirectOptions> = {
                ...defaultOptions,
                redirectDelay: 0,
            };

            const generator = new RedirectGenerator(
                { '/instant': '/target' },
                options,
                mockVitePressConfig,
            );

            await generator.generateAllRedirectFiles('/test/dist');

            const files = vol.toJSON();
            const content = files['/test/dist/instant/index.html'] as string;

            // Should have meta refresh AND client script for immediate redirect
            expect(content).toContain(
                '<meta http-equiv="refresh" content="0; url=/target">',
            );

            // destination variable definition
            expect(content).toContain(`var d=${JSON.stringify('/target')}`);
            expect(content).toContain('location.replace(d)'); // try block
            expect(content).toContain('location.href=d'); // catch block
        });
    });
});
