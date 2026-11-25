const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIG_REGEX = /^[A-Za-z0-9_-]{22}$/;

/**
 * Parse a scanned QR payload (either full URL with ?t=... or bare v1.<sessionId>.<issuerId>.<slot>.<sig>).
 */
export function parseScanPayload(rawText) {
  if (typeof rawText !== 'string') {
    return { ok: false, message: 'Not an attendance QR.' };
  }

  let candidate = rawText.trim();
  if (!candidate || candidate.length > 512) {
    return { ok: false, message: 'Not an attendance QR.' };
  }

  if (/^https?:\/\//i.test(candidate) || candidate.includes('?')) {
    try {
      const url = candidate.startsWith('http')
        ? new URL(candidate)
        : new URL(candidate, 'https://placeholder.local');
      const tParam = url.searchParams.get('t');
      if (!tParam) {
        return { ok: false, message: 'Not an attendance QR.' };
      }
      candidate = tParam.trim();
    } catch {
      return { ok: false, message: 'Not an attendance QR.' };
    }
  }

  const parts = candidate.split('.');
  if (parts.length !== 5) {
    return { ok: false, message: 'Not an attendance QR.' };
  }

  const [version, sessionId, issuerId, slotStr, sig] = parts;
  if (
    version !== 'v1' ||
    !UUID_REGEX.test(sessionId) ||
    !UUID_REGEX.test(issuerId) ||
    !/^\d+$/.test(slotStr) ||
    !SIG_REGEX.test(sig)
  ) {
    return { ok: false, message: 'Not an attendance QR.' };
  }

  return { ok: true, token: candidate };
}
