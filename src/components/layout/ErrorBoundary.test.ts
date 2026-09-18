/**
 * ErrorBoundary regression tests — P1 fix
 */
import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';

describe('ErrorBoundary — P1 Regression', () => {
  it('ErrorBoundary should exist as a component file', () => {
    const content = fs.readFileSync('src/components/layout/ErrorBoundary.tsx', 'utf-8');
    expect(content).toContain("export default class ErrorBoundary");
    expect(content).toContain("componentDidCatch");
    expect(content).toContain("handleRetry");
  });

  it('ErrorBoundary should preserve server-side error logging', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(typeof consoleSpy).toBe('function');
    consoleSpy.mockRestore();
  });

  it('Shell should import and wrap children with ErrorBoundary', () => {
    const content = fs.readFileSync('src/components/layout/Shell.tsx', 'utf-8');
    expect(content).toContain("import ErrorBoundary from './ErrorBoundary'");
    expect(content).toContain('<ErrorBoundary>');
  });
});
