import { Router } from 'express';
import { requireAuth, requireRole, supabaseAdmin } from '../middleware/auth.js';

const router = Router();
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_CATEGORIES = ['urgent', 'logistics', 'general', 'info'];

function buildGoogleMapsUrl({ locationUrl, locationLat, locationLng, locationName }) {
  if (typeof locationUrl === 'string' && locationUrl.trim()) {
    const trimmed = locationUrl.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
  }
  if (
    typeof locationLat === 'number' &&
    typeof locationLng === 'number' &&
    Number.isFinite(locationLat) &&
    Number.isFinite(locationLng)
  ) {
    return `https://www.google.com/maps/search/?api=1&query=${locationLat},${locationLng}`;
  }
  if (typeof locationName === 'string' && locationName.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationName.trim())}`;
  }
  return null;
}

async function resolveAuthorUuid(sb, user) {
  if (UUID_REGEX.test(String(user?.id || ''))) {
    return user.id;
  }
  if (user?.email) {
    const { data } = await sb
      .from('profiles')
      .select('id')
      .eq('email', user.email.toLowerCase())
      .maybeSingle();
    if (data?.id) return data.id;
  }
  const { data: fallback } = await sb
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'coordinator'])
    .limit(1)
    .maybeSingle();
  return fallback?.id || null;
}

function getDbClient() {
  if (!supabaseAdmin) {
    const err = new Error('Server missing SUPABASE_SERVICE_ROLE_KEY.');
    err.statusCode = 503;
    throw err;
  }
  return supabaseAdmin;
}

router.use(requireAuth);

/**
 * GET /api/announcements
 * Fetch broadcast notices, instructions & Google Maps locations
 */
router.get('/', async (req, res) => {
  try {
    const sb = getDbClient();

    let query = sb
      .from('announcements')
      .select('*, profiles:author_id(full_name)')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100);

    if (req.user.role === 'student') {
      const { data: enrollments } = await sb
        .from('visit_enrollments')
        .select('visit_id')
        .eq('student_id', req.user.id)
        .eq('status', 'approved');
      const visitIds = (enrollments || []).map((e) => e.visit_id);
      if (visitIds.length > 0) {
        query = query.or(`visit_id.is.null,visit_id.in.(${visitIds.join(',')})`);
      } else {
        query = query.is('visit_id', null);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    const announcements = (data || []).map((row) => ({
      id: row.id,
      visitId: row.visit_id,
      title: row.title,
      content: row.content,
      instructions: row.instructions || null,
      category: row.category || 'general',
      isPinned: Boolean(row.is_pinned),
      locationName: row.location_name || null,
      locationUrl: row.location_url || null,
      locationLat: row.location_lat ?? null,
      locationLng: row.location_lng ?? null,
      playSound: row.play_sound !== false,
      author: row.author_name || row.profiles?.full_name || 'Faculty Coordinator',
      createdAt: row.created_at,
    }));

    return res.json({ ok: true, data: announcements });
  } catch (err) {
    console.error('[Announcements Get Error]:', err);
    return res.status(err.statusCode || 500).json({
      ok: false,
      error: { message: err.message || 'Failed to load announcements.' },
    });
  }
});

/**
 * POST /api/announcements
 * Broadcast a new notice with optional instructions & Google Maps location
 */
router.post('/', requireRole('coordinator', 'admin'), async (req, res) => {
  try {
    const sb = getDbClient();
    const {
      visitId = null,
      title,
      content,
      instructions = null,
      category = 'general',
      isPinned = false,
      locationName = null,
      locationUrl = null,
      locationLat = null,
      locationLng = null,
      playSound = true,
    } = req.body || {};

    const cleanTitle = typeof title === 'string' ? title.trim() : '';
    const cleanContent = typeof content === 'string' ? content.trim() : '';
    if (cleanTitle.length < 3 || cleanTitle.length > 160) {
      return res.status(400).json({
        ok: false,
        error: { message: 'Title must be between 3 and 160 characters.' },
      });
    }
    if (!cleanContent || cleanContent.length > 3000) {
      return res.status(400).json({
        ok: false,
        error: { message: 'Message content is required (max 3000 chars).' },
      });
    }

    const cleanCategory = String(category || 'general').toLowerCase();
    if (!VALID_CATEGORIES.includes(cleanCategory)) {
      return res.status(400).json({
        ok: false,
        error: { message: 'Invalid notice category.' },
      });
    }

    if (visitId && !UUID_REGEX.test(String(visitId))) {
      return res.status(400).json({
        ok: false,
        error: { message: 'Invalid visitId.' },
      });
    }

    const authorId = await resolveAuthorUuid(sb, req.user);
    if (!authorId) {
      return res.status(400).json({
        ok: false,
        error: { message: 'Could not resolve author profile in database.' },
      });
    }

    const latNum = locationLat !== null && locationLat !== '' ? Number(locationLat) : null;
    const lngNum = locationLng !== null && locationLng !== '' ? Number(locationLng) : null;

    const resolvedMapUrl = buildGoogleMapsUrl({
      locationUrl,
      locationLat: latNum,
      locationLng: lngNum,
      locationName,
    });

    const { data, error } = await sb
      .from('announcements')
      .insert({
        visit_id: visitId || null,
        title: cleanTitle,
        content: cleanContent,
        instructions: typeof instructions === 'string' && instructions.trim() ? instructions.trim() : null,
        category: cleanCategory,
        is_pinned: Boolean(isPinned),
        location_name: typeof locationName === 'string' && locationName.trim() ? locationName.trim() : null,
        location_url: resolvedMapUrl,
        location_lat: Number.isFinite(latNum) ? latNum : null,
        location_lng: Number.isFinite(lngNum) ? lngNum : null,
        play_sound: Boolean(playSound),
        author_id: authorId,
        author_name: req.user.name || 'Faculty Coordinator',
      })
      .select('*')
      .single();

    if (error) throw error;

    return res.status(201).json({
      ok: true,
      data: {
        id: data.id,
        visitId: data.visit_id,
        title: data.title,
        content: data.content,
        instructions: data.instructions || null,
        category: data.category,
        isPinned: Boolean(data.is_pinned),
        locationName: data.location_name || null,
        locationUrl: data.location_url || null,
        locationLat: data.location_lat ?? null,
        locationLng: data.location_lng ?? null,
        playSound: data.play_sound !== false,
        author: data.author_name || req.user.name || 'Faculty Coordinator',
        createdAt: data.created_at,
      },
    });
  } catch (err) {
    console.error('[Announcements Create Error]:', err);
    return res.status(err.statusCode || 500).json({
      ok: false,
      error: { message: err.message || 'Failed to broadcast announcement.' },
    });
  }
});

/**
 * PATCH /api/announcements/:id/pin
 */
router.patch('/:id/pin', requireRole('coordinator', 'admin'), async (req, res) => {
  try {
    if (!UUID_REGEX.test(req.params.id)) {
      return res.status(400).json({ ok: false, error: { message: 'Invalid ID.' } });
    }
    const sb = getDbClient();
    const { isPinned } = req.body || {};
    const { data, error } = await sb
      .from('announcements')
      .update({ is_pinned: Boolean(isPinned) })
      .eq('id', req.params.id)
      .select('id, is_pinned')
      .single();
    if (error) throw error;
    return res.json({ ok: true, data: { id: data.id, isPinned: Boolean(data.is_pinned) } });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      ok: false,
      error: { message: err.message || 'Failed to update pin status.' },
    });
  }
});

/**
 * DELETE /api/announcements/:id
 */
router.delete('/:id', requireRole('coordinator', 'admin'), async (req, res) => {
  try {
    if (!UUID_REGEX.test(req.params.id)) {
      return res.status(400).json({ ok: false, error: { message: 'Invalid ID.' } });
    }
    const sb = getDbClient();
    const { error } = await sb.from('announcements').delete().eq('id', req.params.id);
    if (error) throw error;
    return res.json({ ok: true, data: { deleted: true } });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      ok: false,
      error: { message: err.message || 'Failed to delete announcement.' },
    });
  }
});

export default router;
