// lib/spotlight/profiles.ts
// ─────────────────────────────────────────────────────────────────────────────
// SERVER-ONLY. All business logic for public profile lifecycle:
// slug generation, profile publication, public data fetching, admin views.
//
// Public profile pages use createAdminClient() — see schema assessment above
// for why this is correct and safe.
// ─────────────────────────────────────────────────────────────────────────────
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchProfileFacts } from './adminReview';
import {
  CONTENT_TYPES,
  CONTENT_TYPE_LABELS,
  type ContentType,
} from './contentTypes';
import type {
  PublicProfile,
  ProfileSection,
  AdminProfileView,
  AdminProfilesListItem,
  AdminProfilesListResponse,
  AdminProfileContentItem,
} from './types';

export class ProfileServiceError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'ProfileServiceError';
    this.code = code;
  }
}

// ── CONSTANTS ─────────────────────────────────────────────────────────────

/**
 * Content types that appear on the public profile, in display order.
 * whatsapp_short and channel_long are reserved for Phase 6B / Phase 10.
 */
const PUBLIC_PROFILE_FORMATS: ContentType[] = [
  CONTENT_TYPES.SPOTLIGHT_INTRO,
  CONTENT_TYPES.FOUNDER_STORY,
  CONTENT_TYPES.SERVICE_HIGHLIGHT,
  CONTENT_TYPES.COMMUNITY_QUESTION,
];

const PROFILE_SECTION_LABELS: Record<string, string> = {
  spotlight_intro:    'Introduction',
  founder_story:      'Their Story',
  service_highlight:  'What They Do',
  community_question: 'Community Question',
};

/**
 * Slugs that must never be assigned to a profile because they clash with
 * existing or planned Spotlight routes.
 */
const RESERVED_SLUGS = new Set([
  'submit', 'track', 'search', 'admin', 'success',
  'card', 'feed', 'api', 'login', 'signup',
]);

// ── SLUG GENERATION ───────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // strip diacritics
    .replace(/[^a-z0-9\s-]/g, '')     // remove non-alphanumeric except spaces/hyphens
    .trim()
    .replace(/[\s_]+/g, '-')          // spaces to hyphens
    .replace(/-+/g, '-')              // collapse multiple hyphens
    .replace(/^-|-$/g, '');           // trim leading/trailing hyphens
}

export function generateBaseSlug(
  participantName: string,
  category: string | null,
): string {
  const namePart     = slugify(participantName);
  const categoryPart = category ? slugify(category) : '';
  const base         = categoryPart ? `${namePart}-${categoryPart}` : namePart;
  // Max 80 chars to keep URLs clean
  return base.slice(0, 80).replace(/-$/, '');
}

export async function ensureUniqueSlug(
  db: SupabaseClient,
  baseSlug: string,
): Promise<string> {
  if (RESERVED_SLUGS.has(baseSlug)) {
    // Append a suffix to avoid collision with a reserved route
    return ensureUniqueSlug(db, `${baseSlug}-profile`);
  }

  // Check if the slug is already taken
  const { data: existing } = await db
    .from('spotlight_profiles')
    .select('slug')
    .eq('slug', baseSlug)
    .maybeSingle();

  if (!existing) return baseSlug; // available

  // Try numbered suffixes
  for (let i = 2; i <= 20; i++) {
    const candidate = `${baseSlug}-${i}`;
    const { data: collision } = await db
      .from('spotlight_profiles')
      .select('slug')
      .eq('slug', candidate)
      .maybeSingle();

    if (!collision) return candidate;
  }

  // Fallback: append a short random suffix
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${baseSlug}-${suffix}`;
}

// ── PUBLISH PROFILE ───────────────────────────────────────────────────────

export async function publishProfile(
  db: SupabaseClient,
  submissionId: string,
  adminId: string,
): Promise<{ slug: string; profileId: string }> {

  // ── 1. Load submission ─────────────────────────────────────────────────
  const { data: submission, error: subErr } = await db
    .from('spotlight_submissions')
    .select('id, participant_name, display_name, bio, tagline, profile_image_url, location, social_links, category, skills, status, approved_at')
    .eq('id', submissionId)
    .maybeSingle();

  if (subErr || !submission) {
    throw new ProfileServiceError('Submission not found.', 'missing_submission');
  }

  if (!['approved', 'queued'].includes(submission.status)) {
    throw new ProfileServiceError(
      `Cannot publish a submission with status "${submission.status}". Only approved or queued submissions can be published.`,
      'invalid_submission_status',
    );
  }

  // ── 2. Check for existing profile ─────────────────────────────────────
  const { data: existingProfile } = await db
    .from('spotlight_profiles')
    .select('id, slug, is_public')
    .eq('submission_id', submissionId)
    .maybeSingle();

  if (existingProfile?.is_public === true) {
    throw new ProfileServiceError(
      'This profile is already published.',
      'already_published',
    );
  }

  // ── 3. Resolve profile facts (category, skills) ────────────────────────
  const factsMap = await fetchProfileFacts(db, [submissionId]);
  const facts     = factsMap[submissionId] ?? { category: null, skills: [] };

  const resolvedCategory = facts.category ?? submission.category ?? null;
  const resolvedSkills   = facts.skills.length > 0 ? facts.skills : (submission.skills ?? []);

  // ── 4. Generate slug ───────────────────────────────────────────────────
  const participantName = submission.participant_name;
  const baseSlug        = generateBaseSlug(participantName, resolvedCategory);

  // If re-publishing an existing profile, reuse its slug for URL stability
  const slug = existingProfile?.slug ?? await ensureUniqueSlug(db, baseSlug);

  const now = new Date().toISOString();

  // ── 5. Create or update the profile row ───────────────────────────────
  let profileId: string;

  if (!existingProfile) {
    // First publication — create the profile row
    const { data: newProfile, error: insertErr } = await db
      .from('spotlight_profiles')
      .insert({
        submission_id:    submissionId,
        slug,
        participant_name: participantName,
        display_name:     submission.display_name ?? null,
        headline:         submission.tagline ?? null,
        bio:              submission.bio ?? null,
        profile_image_url: submission.profile_image_url ?? null,
        category:         resolvedCategory,
        skills:           resolvedSkills,
        location:         submission.location ?? null,
        social_links:     submission.social_links ?? {},
        is_public:        true,
        published_at:     now,
        published_by:     adminId,
      })
      .select('id')
      .single();

    if (insertErr || !newProfile) {
      throw new ProfileServiceError('Failed to create the profile record.', 'profile_create_failed');
    }
    profileId = newProfile.id;
  } else {
    // Re-publishing an unpublished profile — just flip is_public
    const { error: updateErr } = await db
      .from('spotlight_profiles')
      .update({
        is_public:    true,
        published_at: now,
        published_by: adminId,
        updated_at:   now,
      })
      .eq('id', existingProfile.id);

    if (updateErr) {
      throw new ProfileServiceError('Failed to publish the profile.', 'profile_update_failed');
    }
    profileId = existingProfile.id;
  }

  // ── 6. Update submission status and slug ──────────────────────────────
  // Non-fatal: the profile row is already live. Log failure but don't throw.
  const { error: subUpdateErr } = await db
    .from('spotlight_submissions')
    .update({
      status:       'published',
      published_at: now,
      slug,
      updated_at:   now,
    })
    .eq('id', submissionId);

  if (subUpdateErr) {
    console.error('[publishProfile] submission update failed after profile was published', subUpdateErr);
  }
  // Note: spotlight_submission_status_to_event trigger fires automatically,
  // writing "Your Spotlight is now live!" to spotlight_tracking_events.

  return { slug, profileId };
}

// ── UNPUBLISH PROFILE ─────────────────────────────────────────────────────

export async function unpublishProfile(
  db: SupabaseClient,
  submissionId: string,
): Promise<void> {
  const { data: profile, error } = await db
    .from('spotlight_profiles')
    .select('id, is_public')
    .eq('submission_id', submissionId)
    .maybeSingle();

  if (error || !profile) {
    throw new ProfileServiceError('Profile not found.', 'missing_profile');
  }

  if (!profile.is_public) {
    throw new ProfileServiceError('Profile is already unpublished.', 'already_unpublished');
  }

  const { error: updateErr } = await db
    .from('spotlight_profiles')
    .update({ is_public: false, updated_at: new Date().toISOString() })
    .eq('id', profile.id);

  if (updateErr) {
    throw new ProfileServiceError('Failed to unpublish the profile.', 'profile_update_failed');
  }

  // Revert submission status to 'approved' (still approved, just not public)
  await db
    .from('spotlight_submissions')
    .update({ status: 'approved', published_at: null, updated_at: new Date().toISOString() })
    .eq('id', submissionId);
}

// ── GET PUBLIC PROFILE ────────────────────────────────────────────────────

export async function getPublicProfile(
  db: SupabaseClient,
  slug: string,
): Promise<PublicProfile | null> {
  // ── 1. Load profile ────────────────────────────────────────────────────
  const { data: profile, error } = await db
    .from('spotlight_profiles')
    .select('id, submission_id, slug, participant_name, display_name, headline, bio, profile_image_url, category, skills, location, social_links, is_featured, published_at')
    .eq('slug', slug)
    .eq('is_public', true)
    .maybeSingle();

  if (error || !profile) return null;

  // ── 2. Load approved content for ALL formats (profile sections + sharing caption).
  // PUBLIC_PROFILE_FORMATS filters which ones appear as rendered sections.
  // whatsapp_short is loaded here but rendered only as the sharing caption.
  const { data: contentRows } = await db
    .from('spotlight_content_items')
    .select(`
      format,
      approved_version_id,
      spotlight_content_versions!approved_version_id (
        body,
        version_number
      )
    `)
    .eq('submission_id', profile.submission_id)
    .not('approved_version_id', 'is', null);

  let sharingCaption: string | null = null;
  const sections: ProfileSection[] = [];

  for (const row of contentRows ?? []) {
    const version = (row.spotlight_content_versions as {
		body: string;
		version_number: number;
	}[])?.[0] ?? null;

    if (!version?.body?.trim()) continue;

    if (row.format === CONTENT_TYPES.WHATSAPP_SHORT) {
      sharingCaption = version.body;
      continue; // not a rendered section
    }

    if (PUBLIC_PROFILE_FORMATS.includes(row.format as ContentType)) {
      sections.push({
        format:         row.format,
        label:          PROFILE_SECTION_LABELS[row.format] ?? row.format,
        body:           version.body,
        version_number: version.version_number,
      });
    }
    // channel_long is also excluded — reserved for Phase 10
  }

  sections.sort((a, b) =>
    PUBLIC_PROFILE_FORMATS.indexOf(a.format as ContentType) -
    PUBLIC_PROFILE_FORMATS.indexOf(b.format as ContentType)
  );

  return {
    slug:              profile.slug,
    participant_name:  profile.participant_name,
    display_name:      profile.display_name,
    headline:          profile.headline,
    bio:               profile.bio,
    profile_image_url: profile.profile_image_url,
    category:          profile.category,
    skills:            profile.skills ?? [],
    location:          profile.location,
    social_links:      (profile.social_links as Record<string, string>) ?? {},
    is_featured:       profile.is_featured ?? false,
    published_at:      profile.published_at ?? '',
    sections,
    sharing_caption: sharingCaption,
  };
}

// ── ADMIN: PROFILE VIEW ────────────────────────────────────────────────────

export async function getAdminProfileBySubmission(
  db: SupabaseClient,
  submissionId: string,
): Promise<AdminProfileView | null> {
  const { data: submission } = await db
    .from('spotlight_submissions')
    .select('id, participant_name, status, submitted_at, approved_at')
    .eq('id', submissionId)
    .maybeSingle();

  if (!submission) return null;

  const [profileRes, factsMap, contentRes] = await Promise.all([
    db
      .from('spotlight_profiles')
      .select('id, slug, is_public, published_at, published_by')
      .eq('submission_id', submissionId)
      .maybeSingle(),
    fetchProfileFacts(db, [submissionId]),
    db
      .from('spotlight_content_items')
      .select('id, format, status, approved_version_id')
      .eq('submission_id', submissionId),
  ]);

  const profile = profileRes.data;
  const facts   = factsMap[submissionId] ?? { category: null, skills: [] };
  const items   = contentRes.data ?? [];

  // Resolve published_by email if we have the reviewer ID
  let publishedByEmail: string | null = null;
  if (profile?.published_by) {
    const { data: userData } = await db.auth.admin.getUserById(profile.published_by);
    publishedByEmail = userData?.user?.email ?? null;
  }

  const contentItems: AdminProfileContentItem[] = items.map(item => ({
    id:                  item.id,
    format:              item.format,
    status:              item.status,
    has_approved_version: item.approved_version_id !== null,
  }));

  const approvedCount = contentItems.filter(i => i.has_approved_version).length;

  return {
    submission_id:         submission.id,
    participant_name:      submission.participant_name,
    category:              facts.category,
    submission_status:     submission.status,
    submitted_at:          submission.submitted_at,
    approved_at:           submission.approved_at,
    profile_id:            profile?.id ?? null,
    slug:                  profile?.slug ?? null,
    is_public:             profile?.is_public ?? false,
    published_at:          profile?.published_at ?? null,
    published_by_email:    publishedByEmail,
    approved_content_count: approvedCount,
    total_content_count:   items.length,
    content_items:         contentItems,
  };
}

// ── ADMIN: PROFILES LIST ──────────────────────────────────────────────────

const PROFILES_PAGE_SIZE = 20;

export async function getAdminProfilesList(
  db: SupabaseClient,
  page: number,
  pageSize: number,
): Promise<AdminProfilesListResponse> {
  pageSize = Math.min(Math.max(pageSize, 1), 50);

  // Load all approved/queued/published submissions (these are candidates)
  const { data: submissions } = await db
    .from('spotlight_submissions')
    .select('id, participant_name, status, approved_at')
    .in('status', ['approved', 'queued', 'published'])
    .order('approved_at', { ascending: false });

  if (!submissions || submissions.length === 0) {
    return { items: [], total: 0, page, pageSize };
  }

  const submissionIds = submissions.map(s => s.id);

  // Parallel: profiles + content item counts per submission
  const [profilesRes, contentRes, factsMap] = await Promise.all([
    db
      .from('spotlight_profiles')
      .select('id, submission_id, slug, is_public, published_at')
      .in('submission_id', submissionIds),
    db
      .from('spotlight_content_items')
      .select('id, submission_id, approved_version_id')
      .in('submission_id', submissionIds),
    fetchProfileFacts(db, submissionIds),
  ]);

  const profileMap = new Map(
    (profilesRes.data ?? []).map(p => [p.submission_id, p])
  );

  // Count content items per submission
  const totalCountMap    = new Map<string, number>();
  const approvedCountMap = new Map<string, number>();
  for (const item of contentRes.data ?? []) {
    totalCountMap.set(item.submission_id, (totalCountMap.get(item.submission_id) ?? 0) + 1);
    if (item.approved_version_id) {
      approvedCountMap.set(item.submission_id, (approvedCountMap.get(item.submission_id) ?? 0) + 1);
    }
  }

  const items: AdminProfilesListItem[] = submissions.map(sub => {
    const profile = profileMap.get(sub.id);
    const facts   = factsMap[sub.id] ?? { category: null };
    return {
      submission_id:         sub.id,
      participant_name:      sub.participant_name,
      category:              facts.category,
      submission_status:     sub.status,
      profile_id:            profile?.id ?? null,
      slug:                  profile?.slug ?? null,
      is_public:             profile?.is_public ?? false,
      published_at:          profile?.published_at ?? null,
      approved_content_count: approvedCountMap.get(sub.id) ?? 0,
      total_content_count:   totalCountMap.get(sub.id)    ?? 0,
    };
  });

  const total = items.length;
  const from  = page * pageSize;
  return { items: items.slice(from, from + pageSize), total, page, pageSize };
}
