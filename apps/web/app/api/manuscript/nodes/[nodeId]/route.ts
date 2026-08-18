import { NextResponse } from 'next/server';
import { ensureStableBlockIds, manuscriptDocumentSchema } from '@authorhub/manuscript';
import { createClient } from '@/lib/supabase/server';
import { saveNodeContent } from '@/features/manuscript/repository';

export async function PUT(
  request: Request,
  context: { params: Promise<{ nodeId: string }> },
) {
  const { nodeId } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const version = (body as { version?: unknown }).version;
  const content = (body as { content?: unknown }).content;
  if (!Number.isInteger(version) || typeof version !== 'number' || version < 1) {
    return NextResponse.json({ error: 'A valid content version is required.' }, { status: 400 });
  }

  try {
    const normalized = ensureStableBlockIds(content as never);
    const validated = manuscriptDocumentSchema.parse(normalized);
    const nextVersion = await saveNodeContent(supabase, user.id, nodeId, version, validated);
    return NextResponse.json({ version: nextVersion, content: validated });
  } catch (error) {
    if (error instanceof Error && error.message === 'VERSION_CONFLICT') {
      return NextResponse.json(
        { error: 'This chapter changed elsewhere. Reload before saving again.', code: 'VERSION_CONFLICT' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: 'Unable to save manuscript.' }, { status: 400 });
  }
}
