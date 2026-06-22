// app/api/spotlight/track/[trackingToken]/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/spotlight/track/[trackingToken]
//
// Public, read-only. No authentication. The token IS the authorization.
//
// RETURNS ONLY: current_status, submitted_at, timeline_events,
//               current_stage, next_stage
//
// NEVER RETURNS: submission id, email, phone, questionnaire responses,
//                agreement data, internal notes, reviewer identity,
//                admin metadata, or non-public tracking events.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient }         from '@/lib/supabase-server';
import {
  getStatusConfig,
  getNextStageConfig,
  buildTimelineSteps,
} from '@/lib/spotlight/trackingMessages';
import type {
  SpotlightSubmissionStatus,
  TrackingErrorResponse,
} from '@/lib/spotlight/types';

export const dynamic = 'force-dynamic';

type Params = { params: { trackingToken: string } };

function isValidToken(token: string): boolean {
  return /^sp_trk_[0-9a-f]{32}$/.test(token);
}

function errorResponse(body: TrackingErrorResponse, status: number) {
  return NextResponse.json(body, { status });
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { trackingToken } = params;

  // ── Layer 1: format check ──────────────────────────────────────────────
  // Draft placeholder tokens (Phase 2 column default) never carry the
  // sp_trk_ prefix, so this alone already filters them out before any
  // database query runs.
  if (!trackingToken || !isValidToken(trackingToken)) {
    return errorResponse({
      error: 'That tracking code doesn\u2019t look right. Please check and try again.',
      code: 'invalid_token',
    }, 400);
  }

  const db = createAdminClient();

  // ── Lookup — select ONLY fields we're willing to expose downstream ─────
  const { data: submission, error } = await db
    .from('spotlight_submissions')
    .select('id, status, submitted_at')
    .eq('tracking_token', trackingToken)
    .maybeSingle();

  if (error) {
    console.error('[GET /api/spotlight/track]', error);
    return errorResponse({
      error: 'Something went wrong on our end. Please try again shortly.',
      code: 'server_error',
    }, 500);
  }

  if (!submission) {
    return errorResponse({
      error: 'We could not find a Spotlight application with that tracking code.',
      code: 'not_found',
    }, 404);
  }

  // ── Layer 2: explicit draft guard (defense-in-depth) ────────────────────
  if (submission.status === 'draft') {
    return errorResponse({
      error: 'We could not find a Spotlight application with that tracking code.',
      code: 'not_found',
    }, 404);
  }

  // ── Public timeline events only ─────────────────────────────────────────
  const { data: events, error: eventsError } = await db
    .from('spotlight_tracking_events')
    .select('event_type, event_label, event_description, created_at')
    .eq('submission_id', submission.id)
    .eq('is_public', true)
    .order('created_at', { ascending: true });

  if (eventsError) {
    console.error('[GET /api/spotlight/track] events', eventsError);
    return errorResponse({
      error: 'Something went wrong on our end. Please try again shortly.',
      code: 'server_error',
    }, 500);
  }

  const status = submission.status as SpotlightSubmissionStatus;

  return NextResponse.json({
    current_status:  status,
    submitted_at:    submission.submitted_at,
    timeline_events: buildTimelineSteps(events ?? [], status),
    current_stage:   getStatusConfig(status),
    next_stage:      getNextStageConfig(status),
  });
  // Note: submission.id was required for the events join above but is
  // never included in this response.
}
