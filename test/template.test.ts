import { vol } from 'memfs';
import { beforeEach, describe, expect, it } from 'vitest';
import {
    type RedirectOptions,
    Template,
    type VitePressConfig,
} from '../src/engine';

describe('Template', () => {
    const mockVitePressConfig: VitePressConfig = {
        build: { ssr: false },
        vitepress: {
            srcDir: '/test/src',
            outDir: '/test/dist',
        },
    } as VitePressConfig;

    const defaultOptions: RedirectOptions = {
        enable: true,
        template: '',
    };

    beforeEach(() => {
        vol.reset();
    });

    describe('resolveTemplate', () => {
        it('should return default template when no custom template is provided', async () => {
            const template = new Template(defaultOptions, mockVitePressConfig);

            const result = await template.resolveTemplate();

            expect(result).toContain('<!DOCTYPE html>');
            expect(result).toContain('<title>Redirecting...</title>');
            expect(result).toContain('{metaTags}');
            expect(result).toContain('{destination}');
        });

        it('should return inline HTML template when provided', async () => {
            const options = {
                ...defaultOptions,
                template:
                    '<html><head><title>Custom</title></head><body>{destination}</body></html>',
            };
            const template = new Template(options, mockVitePressConfig);

            const result = await template.resolveTemplate();

            expect(result).toBe(
                '<html><head><title>Custom</title></head><body>{destination}</body></html>',
            );
        });

        it('should load template from file path', async () => {
            setupFileSystem({
                '/test/src/custom-template.html':
                    '<html><body>Custom template for {destination}</body></html>',
            });

            const options = {
                ...defaultOptions,
                template: 'custom-template.html',
            };
            const template = new Template(options, mockVitePressConfig);

            const result = await template.resolveTemplate();

            expect(result).toBe(
                '<html><body>Custom template for {destination}</body></html>',
            );
        });

        it('should fallback to default template when file loading fails', async () => {
            const options = {
                ...defaultOptions,
                template: 'non-existent-template.html',
            };
            const template = new Template(options, mockVitePressConfig);

            const result = await template.resolveTemplate();

            expect(result).toContain('<!DOCTYPE html>');
            expect(result).toContain('<title>Redirecting...</title>');
        });
    });

    describe('processTemplate', () => {
        it('should replace all placeholders in template', () => {
            const template = new Template(defaultOptions, mockVitePressConfig);
            const templateString =
                'Redirecting from {source} to {destination} in {redirectDelay}s. {metaTags}';

            const result = template.processTemplate(
                templateString,
                '/old-page',
                '/new-page',
                '<meta name="test">',
                5,
            );

            expect(result).toBe(
                'Redirecting from /old-page to /new-page in 5s. <meta name="test">',
            );
        });

        it('should handle multiple occurrences of same placeholder', () => {
            const template = new Template(defaultOptions, mockVitePressConfig);
            const templateString =
                'Go to {destination} or click {destination} again';

            const result = template.processTemplate(
                templateString,
                '/source',
                '/target',
                '',
                0,
            );

            expect(result).toBe('Go to /target or click /target again');
        });

        it('should handle empty meta tags', () => {
            const template = new Template(defaultOptions, mockVitePressConfig);
            const templateString = '<head>{metaTags}<title>Test</title></head>';

            const result = template.processTemplate(
                templateString,
                '/source',
                '/target',
                '',
                0,
            );

            expect(result).toBe('<head><title>Test</title></head>');
        });
    });
});
