// Reusable building blocks used across the site.
import { esc, dims, parseTally } from '../lib/html.mjs';
import { icon } from '../lib/icons.mjs';

/** Button or link styled as a button. variant: 'primary' | 'outline' | 'ghost' */
export function button({ href, label, variant = 'primary', iconLeft, arrow = false, attrs = '', className = '' }) {
  const inner = `${iconLeft ? icon(iconLeft, { size: 18 }) : ''}<span>${esc(label)}</span>${arrow ? icon('arrowRight', { size: 18, className: 'btn__arrow' }) : ''}`;
  const cls = `btn btn--${variant} ${className}`.trim();
  return href
    ? `<a class="${cls}" href="${esc(href)}" ${attrs}>${inner}</a>`
    : `<button type="button" class="${cls}" ${attrs}>${inner}</button>`;
}

/** Eyebrow + heading + optional intro paragraph. */
export function sectionHeading({ eyebrow, heading, intro, id, level = 2, className = '' }) {
  return `<div class="section-heading ${className}">
  ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
  <h${level} class="section-title"${id ? ` id="${id}"` : ''}>${esc(heading)}</h${level}>
  ${intro ? `<p class="section-intro">${esc(intro)}</p>` : ''}
</div>`;
}

/** Responsive, lazy-loaded image with width/height to prevent layout jumps. */
export function img(ctx, { src, alt = '', className = '', eager = false, sizes = '' }) {
  return `<img class="${className}" src="${esc(src)}" alt="${esc(alt)}" ${dims(ctx, src)} ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"${sizes ? ` sizes="${sizes}"` : ''}>`;
}

export function placeholderTag(label) {
  return `<span class="placeholder-tag">${icon('image', { size: 14 })}${esc(label)}</span>`;
}

/** Homepage service card (desktop: tile, mobile: list row). */
export function serviceCard(ctx, s, { hiddenOnMobile = false } = {}) {
  return `<li class="service-card${hiddenOnMobile ? ' is-extra' : ''}">
  <a class="service-card__link" href="services.html#${esc(s.id)}">
    <span class="service-card__media">
      ${img(ctx, { src: s.image, alt: s.imageAlt, sizes: '(min-width: 1024px) 190px, 120px' })}
      <span class="service-card__icon">${icon(s.icon, { size: 16 })}</span>
    </span>
    <span class="service-card__body">
      <span class="service-card__title">${esc(s.title)}</span>
      <span class="service-card__text">${esc(s.summary)}</span>
    </span>
    ${icon('chevronRight', { size: 22, className: 'service-card__chevron' })}
  </a>
</li>`;
}

/** Recent projects gallery tile. Opens the lightbox when clicked. */
export function galleryTile(ctx, p, index, placeholderLabel) {
  const caption = [p.title, p.location].filter(Boolean).join(' · ');
  return `<li class="gallery__item">
  <button type="button" class="gallery__button" data-lightbox="${index}" aria-label="View larger: ${esc(caption || p.alt)}">
    ${img(ctx, { src: p.image, alt: p.alt, sizes: '(min-width: 1024px) 220px, 70vw' })}
    ${p.placeholder ? placeholderTag(placeholderLabel) : ''}
    ${caption ? `<span class="gallery__caption">${esc(caption)}</span>` : ''}
  </button>
</li>`;
}

/** Accessible before/after comparison slider. Works as a side-by-side pair without JavaScript. */
export function beforeAfter(ctx, item, placeholderLabel) {
  return `<figure class="ba" data-ba>
  <div class="ba__frame" style="--pos:50%">
    ${img(ctx, { src: item.after, alt: item.afterAlt, className: 'ba__img ba__img--after' })}
    <div class="ba__before">${img(ctx, { src: item.before, alt: item.beforeAlt, className: 'ba__img' })}</div>
    <span class="ba__label ba__label--before" aria-hidden="true">Before</span>
    <span class="ba__label ba__label--after" aria-hidden="true">After</span>
    <span class="ba__handle" aria-hidden="true">${icon('swap', { size: 20 })}</span>
    <input class="ba__range" type="range" min="0" max="100" value="50" aria-label="Compare before and after: ${esc(item.title)}">
    ${item.placeholder ? placeholderTag(placeholderLabel) : ''}
  </div>
  <figcaption class="ba__caption"><strong>${esc(item.title)}</strong>${item.description ? ` <span>${esc(item.description)}</span>` : ''}</figcaption>
</figure>`;
}

/** A genuine customer review, or a labelled placeholder when review is null. */
export function reviewCard(review, t) {
  if (!review) {
    return `<li class="review-card review-card--placeholder">
  ${icon('quote', { size: 28, className: 'review-card__quote' })}
  <p class="review-card__title">${esc(t.placeholderTitle)}</p>
  <p class="review-card__text">${esc(t.placeholderText)}</p>
</li>`;
  }
  const stars = Number.isFinite(review.rating) && review.rating > 0
    ? `<p class="review-card__stars" aria-label="${review.rating} out of 5 stars">${Array.from({ length: Math.min(5, Math.round(review.rating)) }, () => icon('star', { size: 16 })).join('')}</p>`
    : '';
  const meta = [review.project, review.location].filter(Boolean).join(' · ');
  const source = review.source
    ? (review.sourceUrl ? `<a href="${esc(review.sourceUrl)}" rel="noopener" target="_blank">${esc(review.source)}</a>` : esc(review.source))
    : '';
  return `<li class="review-card">
  ${icon('quote', { size: 28, className: 'review-card__quote' })}
  ${stars}
  <blockquote class="review-card__text"><p>${esc(review.text)}</p></blockquote>
  <p class="review-card__name">${esc(review.name)}</p>
  ${meta || source ? `<p class="review-card__meta">${esc(meta)}${meta && source ? ' · ' : ''}${source}</p>` : ''}
</li>`;
}

/**
 * Tally form embed. When no Tally link is set, shows a clearly labelled,
 * non-working preview of the form layout so the design can be reviewed.
 */
export function tallyEmbed(ctx, link, { title, height = 520 }) {
  const tally = parseTally(link);
  if (tally) {
    const bg = ctx.settings.tally.formBackground || '';
    return `<div class="tally tally--live"${bg ? ` style="--tally-bg:${esc(bg)}"` : ''}>
  <iframe data-tally-src="${esc(tally.embedUrl)}" loading="lazy" width="100%" height="${height}" frameborder="0" marginheight="0" marginwidth="0" title="${esc(title)}"></iframe>
  <noscript><p><a href="${esc(tally.shareUrl)}">Open the ${esc(title.toLowerCase())}</a></p></noscript>
</div>`;
  }
  const t = ctx.text.quote;
  const field = (label, ph = '', type = 'input', wide = false) => `<label class="fake-field${wide ? ' fake-field--wide' : ''}"><span>${esc(label)} <em>*</em></span>${type === 'select'
    ? `<span class="fake-input fake-input--select">Select an option ${icon('chevronDown', { size: 16 })}</span>`
    : type === 'textarea' ? `<span class="fake-input fake-input--area">${esc(ph)}</span>` : `<span class="fake-input">${esc(ph)}</span>`}</label>`;
  return `<div class="tally tally--preview" role="group" aria-label="${esc(t.notConnected)}">
  <p class="tally__notice">${icon('image', { size: 16 })}<span><strong>${esc(t.notConnected)}</strong> ${esc(t.notConnectedHelp)}</span></p>
  <div class="fake-form" aria-hidden="true">
    ${field('What project are you planning?', '', 'select')}
    ${field('When would you like the work to start?', '', 'select')}
    ${field('Postcode', 'e.g. G1 1AA')}
    ${field('Phone')}
    ${field('First name')}
    ${field('Last name')}
    ${field('Email', '', 'input', true)}
    ${field('How can we help?', 'Tell us a bit more about your project…', 'textarea', true)}
    <div class="fake-upload">${icon('upload', { size: 22 })}<span><strong>Upload photos (optional)</strong><small>You can add photos of your current space</small></span></div>
    <span class="btn btn--primary fake-submit">Send Enquiry ${icon('arrowRight', { size: 18 })}</span>
  </div>
</div>`;
}
