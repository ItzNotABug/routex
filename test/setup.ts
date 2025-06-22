// noinspection JSUnusedGlobalSymbols

import { vol } from 'memfs';
import { beforeEach, vi } from 'vitest';
import type { VitePressConfig } from '../src/engine';

vi.mock('fs', async () => {
    const memfs = await vi.importActual<typeof import('memfs')>('memfs');
    return {
        default: memfs.fs,
        ...memfs.fs,
    };
});

vi.mock('fs/promises', async () => {
    const memfs = await vi.importActual<typeof import('memfs')>('memfs');
    return memfs.fs.promises;
});

// Mock console methods to reduce noise in tests
const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
};

beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Reset in-memory file system
    vol.reset();

    // Mock console methods with quiet versions
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
});

// Global test utilities with JSDoc for IntelliJ IDE support
declare global {
    /**
     * Creates a mock VitePress configuration for testing
     * @param overrides - Partial configuration to override defaults
     * @returns Complete VitePressConfig object
     */
    function createMockVitePressConfig(
        overrides?: Partial<VitePressConfig>,
    ): VitePressConfig;

    /**
     * Restores original console methods after test mocking
     */
    function restoreConsole(): void;

    /**
     * Sets up an in-memory file system for testing file operations
     * @param files - Record of file paths to file contents
     */
    function setupFileSystem(files: Record<string, string>): void;
}

global.createMockVitePressConfig = (
    overrides: Partial<VitePressConfig> = {},
): VitePressConfig =>
    ({
        build: {
            ssr: false,
            outDir: 'dist',
            ...overrides.build,
        },
        vitepress: {
            srcDir: './src',
            outDir: './dist',
            ...overrides.vitepress,
        },
        ...overrides,
    }) as VitePressConfig;

global.restoreConsole = (): void => {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
};

global.setupFileSystem = (files: Record<string, string>): void => {
    vol.fromJSON(files);
};
