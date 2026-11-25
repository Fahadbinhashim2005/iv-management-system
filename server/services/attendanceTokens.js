import crypto from 'node:crypto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BASE64URL_SIG_REGEX = /^[A-Za-z0-9_-]{22}$/;

/**
 * Generate a 32-byte random hex secret for a new attendance session.
 */
export function generateSessionSecret() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Compute the discrete time slot for a given unix timestamp (seconds) and rotation interval.
 */
export function computeSlot(unixSeconds, rotateSeconds) {
  return Math.floor(unixSeconds / rotateSeconds);
}

/**
 * Compute the 22-char base64url HMAC-SHA256 signature (first 16 bytes).
 */
export function computeTokenSignature(sessionId, issuerId, slot, secret) {
  const digest = crypto
    .createHmac('sha256', secret)
    .update(`${sessionId}.${issuerId}.${slot}`)
    .digest();
  return digest.subarray(0, 16).toString('base64url');
}

/**
 * Sign a v1 attendance QR token.
 * Format: v1.<sessionId>.<issuerId>.<slot>.<sig>
 */
export function signAttendanceToken({ sessionId, issuerId, slot, secret }) {
  const sig = computeTokenSignature(sessionId, issuerId, slot, secret);
  return `v1.${sessionId}.${issuerId}.${slot}.${sig}`;
}

/**
 * Extract a bare token from either a full URL (`?t=...`) or a bare `v1....` string.
 * Returns parsed fields or null if malformed.
 */
export function parseAttendanceToken(rawInput) {
  if (typeof rawInput !== 'string') return null;
  let candidate = rawInput.trim();
  if (!candidate || candidate.length > 512) return null;

  if (/^https?:\/\//i.test(candidate) || candidate.includes('?')) {
    try {
      const url = candidate.startsWith('http')
        ? new URL(candidate)
        : new URL(candidate, 'https://placeholder.local');
      const tParam = url.searchParams.get('t');
      if (!tParam) return null;
      candidate = tParam.trim();
    } catch {
      return null;
    }
  }

  const parts = candidate.split('.');
  if (parts.length !== 5) return null;

  const [version, sessionId, issuerId, slotStr, sig] = parts;
  if (version !== 'v1') return null;
  if (!UUID_REGEX.test(sessionId) || !UUID_REGEX.test(issuerId)) return null;
  if (!/^\d+$/.test(slotStr)) return null;
  if (!BASE64URL_SIG_REGEX.test(sig)) return null;

  const slot = Number(slotStr);
  if (!Number.isSafeInteger(slot) || slot < 0) return null;

  return {
    version,
    sessionId,
    issuerId,
    slot,
    sig,
    token: candidate,
  };
}

/**
 * Verify signature using constant-time comparison and validate slot window
 * (current slot or previous slot).
 */
export function verifyAttendanceToken({
  parsed,
  secret,
  rotateSeconds,
  nowSeconds = Math.floor(Date.now() / 1000),
}) {
  if (!parsed || !secret || !rotateSeconds) {
    return { ok: false, code: 'INVALID_TOKEN' };
  }

  const expectedSig = computeTokenSignature(
    parsed.sessionId,
    parsed.issuerId,
    parsed.slot,
    secret
  );

  const actualBuf = Buffer.from(parsed.sig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');

  if (actualBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(actualBuf, expectedBuf)) {
    return { ok: false, code: 'INVALID_TOKEN' };
  }

  const currentSlot = computeSlot(nowSeconds, rotateSeconds);
  if (parsed.slot !== currentSlot && parsed.slot !== currentSlot - 1) {
    return { ok: false, code: 'EXPIRED_TOKEN' };
  }

  return { ok: true, currentSlot };
}

/**
 * Build the full URL encoded inside the QR code.
 */
export function buildQrUrl(appPublicUrl, token) {
  const base = (appPublicUrl || 'https://iv-management-system.vercel.app').replace(/\/+$/, '');
  return `${base}/student/attendance/scan?t=${encodeURIComponent(token)}`;
}
