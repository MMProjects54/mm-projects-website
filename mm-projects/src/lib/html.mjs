// Small helpers shared by every component.

/** Escape text so it is safe to place inside HTML. */
export function esc(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Join HTML fragments, skipping empty ones. */
export const join = (parts) => parts.filter(Boolean).join('\n');

/** Turn a heading into a URL-safe id. */
export const slug = (s) => String(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function telHref(settings) {
  return `tel:${settings.contact.phoneInternational.replace(/\s+/g, '')}`;
}

export function whatsappHref(settings) {
  const { whatsappNumber, whatsappMessage } = settings.contact;
  const msg = whatsappMessage ? `?text=${encodeURIComponent(whatsappMessage)}` : '';
  return `https://wa.me/${whatsappNumber.replace(/\D/g, '')}${msg}`;
}

/**
 * Accepts any Tally link (tally.so/r/ID, tally.so/embed/ID or tally.so/forms/ID)
 * and returns { id, shareUrl, embedUrl } or null if empty/invalid.
 */
export function parseTally(link) {
  if (!link) return null;
  const m = String(link).trim().match(/tally\.so\/(?:r|embed|forms)\/([A-Za-z0-9]+)/);
  if (!m) return null;
  const id = m[1];
  return {
    id,
    shareUrl: `https://tally.so/r/${id}`,
    // Official Tally embed. The form keeps its own background colours from Tally.
    embedUrl: `https://tally.so/embed/${id}?alignLeft=1&hideTitle=1&dynamicHeight=1`,
  };
}

/** Width/height attributes for an image (filled in by the build from the real files). */
export function dims(ctx, src) {
  const d = ctx.imageSizes[src];
  return d ? `width="${d.width}" height="${d.height}"` : '';
}

/** Fill {business}, {phone}, {email}, {emailSentence} tokens. */
export function fill(str, settings) {
  const email = settings.contact.email;
  return String(str)
    .replace(/\{business\}/g, settings.business.name)
    .replace(/\{phone\}/g, settings.contact.phoneDisplay)
    .replace(/\{email\}/g, email)
    .replace(/\{emailSentence\}/g, email ? ` or by email at ${email}` : '');
}
