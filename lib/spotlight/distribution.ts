// lib/spotlight/distribution.ts
// ─────────────────────────────────────────────────────────────────────────────
// SERVER-ONLY. Service layer for the Distribution Toolkit.
// Manages the manual distribution checklist — separate from the automated
// publishing queue in spotlight_queue_entries.
// ─────────────────────────────────────────────────────────────────────────────
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  PublishingChannel,
  DistributionLogEntry,
  ChannelDistributionStatus,
} from './types';

export class DistributionServiceError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'DistributionServiceError';
    this.code = code;
  }
}

// ── CHANNELS ──────────────────────────────────────────────────────────────

export async function getActiveChannels(
  db: SupabaseClient,
): Promise<PublishingChannel[]> {
  const { data, error } = await db
    .from('spotlight_publishing_channels')
    .select('id, channel_key, channel_name, channel_type, description, config, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw new DistributionServiceError('Failed to load channels.', 'server_error');
  return (data ?? []) as PublishingChannel[];
}

// ── DISTRIBUTION LOG ──────────────────────────────────────────────────────

export async function getDistributionLog(
  db: SupabaseClient,
  profileId: string,
): Promise<DistributionLogEntry[]> {
  const { data, error } = await db
    .from('spotlight_distribution_log')
    .select('id, profile_id, channel_id, channel_name, marked_by_email, marked_at')
    .eq('profile_id', profileId)
    .order('marked_at', { ascending: false });

  if (error) throw new DistributionServiceError('Failed to load distribution log.', 'server_error');
  return data ?? [];
}

/** Merges channels with their distribution state for the checklist UI. */
export function buildChannelDistributionStatus(
  channels: PublishingChannel[],
  log: DistributionLogEntry[],
): ChannelDistributionStatus[] {
  // Build a map: channel_id → latest log entry for that channel
  const logByChannel = new Map<string, DistributionLogEntry>();
  for (const entry of log) {
    if (entry.channel_id && !logByChannel.has(entry.channel_id)) {
      logByChannel.set(entry.channel_id, entry); // log is newest-first, so first wins
    }
  }

  return channels.map(channel => ({
    ...channel,
    is_distributed:  logByChannel.has(channel.id),
    log_entry:       logByChannel.get(channel.id) ?? null,
  }));
}

// ── MARK / UNMARK ─────────────────────────────────────────────────────────

export async function markChannelDistributed(
  db: SupabaseClient,
  profileId: string,
  channelId: string,
  channelName: string,
  adminId: string,
  adminEmail: string,
): Promise<{ log_id: string }> {
  // Guard: confirm the profile exists and is public
  const { data: profile } = await db
    .from('spotlight_profiles')
    .select('id, is_public')
    .eq('id', profileId)
    .maybeSingle();

  if (!profile) {
    throw new DistributionServiceError('Profile not found.', 'missing_profile');
  }
  if (!profile.is_public) {
    throw new DistributionServiceError('Profile is not published.', 'profile_not_published');
  }

  // Allow re-marking (admin may want to re-confirm after redistribution)
  const { data: logEntry, error } = await db
    .from('spotlight_distribution_log')
    .insert({
      profile_id:     profileId,
      channel_id:     channelId,
      channel_name:   channelName,
      marked_by:      adminId,
      marked_by_email: adminEmail,
    })
    .select('id')
    .single();

  if (error || !logEntry) {
    throw new DistributionServiceError('Failed to record distribution.', 'insert_failed');
  }
  return { log_id: logEntry.id };
}

export async function unmarkChannelDistributed(
  db: SupabaseClient,
  logId: string,
): Promise<void> {
  const { error } = await db
    .from('spotlight_distribution_log')
    .delete()
    .eq('id', logId);

  if (error) {
    throw new DistributionServiceError('Failed to remove distribution record.', 'delete_failed');
  }
}
