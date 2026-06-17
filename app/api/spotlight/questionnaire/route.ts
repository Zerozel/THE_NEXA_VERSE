// app/api/spotlight/questionnaire/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Public endpoint. No authentication required.
// Returns the full questionnaire structure: groups + questions.
// ─────────────────────────────────────────────────────────────────────────────
import { NextResponse } from 'next/server';
import { getQuestionnaireData } from '@/lib/spotlight/questionnaire';

export async function GET() {
  try {
    const config = await getQuestionnaireData();
    return NextResponse.json(config, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (err) {
    console.error('[/api/spotlight/questionnaire]', err);
    return NextResponse.json({ error: 'Failed to load questionnaire configuration.' }, { status: 500 });
  }
}
