import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: false,
        environment: 'jsdom',
        include: ['**/*.test.ts'],
        exclude: ['node_modules', 'dist'],
        typecheck: {
            enabled: false,
        },

        testTimeout: 10000,
        setupFiles: ['./test/setup.ts'],
    },

    resolve: {
        alias: {
            '@': './src',
        },
    },
});
