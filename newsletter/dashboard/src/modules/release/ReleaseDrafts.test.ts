/*
=== GENERATOR ===
Goal: Prove the calendar's copy resolves by key — bundled markdown by repo path, X posts by group or by index — with frontmatter stripped and threads split.
// domain-invariant: $ReleaseDrafts — If a key names a whole X group, then the draft carries one segment per post
Impossible if true: a key that names nothing resolves to a draft

=== GENERATOR-DESCRIBED ===
$ReleaseDrafts is the read side of the release calendar's copy until the press system's rows replace it.
*/
import { describe, expect, it } from 'vitest';
import { ReleaseDrafts } from './ReleaseDrafts';

describe('ReleaseDrafts', () => {
  it('reads a pitch email: frontmatter becomes the title line, the body stays whole', () => {
    const draft = ReleaseDrafts.Class.resolve('tasks/press-drafts/sol/01-javascript-weekly.md')!;
    expect(draft.title).toBe('JavaScript Weekly');
    expect(draft.subtitle).toContain('pitch-email');
    expect(draft.segments).toBeNull();
    expect(draft.body).toMatch(/^To: editor@cooperpress\.com/);
  });

  it('groups X copy: the whole group as segments, one post by index', () => {
    const thread = ReleaseDrafts.Class.resolve('x:thread')!;
    expect(thread.segments).toHaveLength(9);
    expect(thread.body).toContain(thread.segments![8]);
    const hook = ReleaseDrafts.Class.resolve('x:hooks:2')!;
    expect(hook.subtitle).toContain('the agents');
    expect(ReleaseDrafts.Class.resolve('x:nothing')).toBeNull();
    expect(ReleaseDrafts.Class.resolve('x:hooks:9')).toBeNull();
  });
});
