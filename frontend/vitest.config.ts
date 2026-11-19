import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Runners de CI compartilhados precisam de paralelismo limitado.
    maxWorkers: process.env.CI ? 2 : undefined,
    testTimeout: process.env.CI ? 15_000 : 5_000,
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    outputFile: process.env.CI
      ? { junit: './test-results/junit.xml' }
      : undefined,
    coverage: {
      provider: 'v8',
      // A cobertura mínima vale para as camadas de lógica (domain, model, api e lib).
      // As telas (.tsx) serão cobertas por testes de componente quando existirem.
      include: [
        'src/shared/domain/**/*.ts',
        'src/features/**/model/**/*.ts',
        'src/features/**/api/**/*.ts',
        'src/shared/lib/**/*.ts',
      ],
      exclude: ['**/*.test.ts', '**/index.ts'],
      reporter: ['text', 'html', 'lcov', 'cobertura'],
      reportsDirectory: './coverage',
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
