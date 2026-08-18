import { describe, expect, it } from 'vitest';
import { can } from './permissions';

describe('book permissions', () => {
  it('allows authors to edit manuscript content', () => {
    expect(can('author', 'manuscript:write')).toBe(true);
  });

  it('prevents viewers from editing manuscript content', () => {
    expect(can('viewer', 'manuscript:write')).toBe(false);
  });

  it('allows owners to publish and manage members', () => {
    expect(can('owner', 'publication:manage')).toBe(true);
    expect(can('owner', 'members:manage')).toBe(true);
  });

  it('prevents reviewers from publishing', () => {
    expect(can('reviewer', 'publication:manage')).toBe(false);
  });
});
