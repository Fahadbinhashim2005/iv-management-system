/**
 * Client-side mirror of room eligibility & window status for crisp UI hints.
 * Authoritative enforcement always happens in Postgres transactions.
 */

export function checkClientEligibility(profile, room, stay) {
  if (!profile || !room) {
    return { eligible: false, code: 'UNKNOWN', reason: 'Checking eligibility...' };
  }

  const role = String(profile.role || 'student').toLowerCase();
  const gender = profile.gender ? String(profile.gender).toLowerCase() : null;
  const allowedRoles = room.allowed_roles || [];
  const allowedGenders = room.allowed_genders || null;

  const roleOk =
    allowedRoles.includes(role) ||
    (role === 'coordinator' &&
      Boolean(stay?.coordinator_can_use_gender_rooms) &&
      ['girls', 'boys'].includes(room.type_key));

  if (!roleOk) {
    return {
      eligible: false,
      code: 'INELIGIBLE_ROLE',
      reason: `Reserved for ${allowedRoles.join(' / ')} only.`,
    };
  }

  if (Array.isArray(allowedGenders) && allowedGenders.length > 0) {
    if (!gender || !['male', 'female', 'other'].includes(gender)) {
      return {
        eligible: false,
        code: 'GENDER_REQUIRED',
        reason: 'Contact admin to update your profile (gender is not set).',
      };
    }
    if (!allowedGenders.includes(gender)) {
      return {
        eligible: false,
        code: 'INELIGIBLE_GENDER',
        reason: `Restricted to ${allowedGenders.join(' / ')} rooms.`,
      };
    }
  }

  return { eligible: true, code: null, reason: null };
}

export function getWindowBannerState(stay, nowMs = Date.now()) {
  if (!stay) {
    return { state: 'none', isOpen: false, label: 'No stay configured', tone: 'gray' };
  }

  if (stay.selection_status === 'draft') {
    return {
      state: 'draft',
      isOpen: false,
      label: stay.opens_at
        ? `Selection opens at ${new Date(stay.opens_at).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}`
        : 'Selection has not opened yet (Draft)',
      tone: 'amber',
    };
  }

  if (stay.selection_status === 'closed') {
    return {
      state: 'closed',
      isOpen: false,
      label: 'Selection closed — room layout is read-only',
      tone: 'red',
    };
  }

  // selection_status === 'open'
  const opensMs = stay.opens_at ? new Date(stay.opens_at).getTime() : null;
  const closesMs = stay.closes_at ? new Date(stay.closes_at).getTime() : null;

  if (opensMs && nowMs < opensMs) {
    return {
      state: 'scheduled',
      isOpen: false,
      label: `Selection opens at ${new Date(opensMs).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      tone: 'amber',
    };
  }

  if (closesMs && nowMs > closesMs) {
    return {
      state: 'closed',
      isOpen: false,
      label: 'Selection closed — deadline has passed',
      tone: 'red',
    };
  }

  if (closesMs) {
    const diffMin = Math.max(0, Math.round((closesMs - nowMs) / 60000));
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    const countdown = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    return {
      state: 'open',
      isOpen: true,
      label: `Selection open • closes in ${countdown}`,
      tone: 'emerald',
    };
  }

  return {
    state: 'open',
    isOpen: true,
    label: 'Selection is LIVE — tap any eligible room to claim a bed',
    tone: 'emerald',
  };
}

/**
 * Generates preview room objects from layout generator rows.
 */
export function expandLayoutRows(rows) {
  const generated = [];
  const seen = new Set();

  for (const row of rows) {
    const start = Number(row.startNo);
    const end = Number(row.endNo);
    const cap = Math.min(20, Math.max(1, Number(row.capacity) || 3));
    const prefix = String(row.prefix || '').trim();
    const floor = String(row.floor || '').trim();
    const excluded = new Set(
      String(row.exclude || '')
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    );

    if (!Number.isInteger(start) || !Number.isInteger(end) || end < start) continue;
    const count = Math.min(200, end - start + 1);

    for (let i = 0; i < count; i++) {
      const numStr = String(start + i);
      const roomNo = `${prefix}${numStr}`;
      if (excluded.has(numStr) || excluded.has(roomNo) || seen.has(roomNo)) continue;
      seen.add(roomNo);
      generated.push({
        tempId: `${roomNo}_${row.id}`,
        roomNo,
        floor: floor || '',
        capacity: cap,
        roomTypeId: row.roomTypeId,
      });
    }
  }

  return generated;
}

export function hexToRgba(hex, alpha = 1) {
  const clean = String(hex || '#3B82F6').replace('#', '');
  if (clean.length !== 6) return `rgba(59, 130, 246, ${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
