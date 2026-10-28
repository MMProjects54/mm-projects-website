// Homepage sections. Each takes the shared context and returns HTML.
import { esc, telHref, whatsappHref, parseTally, dims } from '../lib/html.mjs';
import { icon } from '../lib/icons.mjs';
import { button, sectionHeading, img, serviceCard, galleryTile, beforeAfter, reviewCard, tallyEmbed, placeholderTag } from './ui.mjs';

export function hero(ctx) {
  const h = ctx.text.hero;
  return `<section class="hero" id="top" aria-labelledby="hero-title">
  <picture class="hero__media">
    <source media="(max-width: 640px)" srcset="${esc(h.imageMobile)}" ${dims(ctx, h.imageMobile)}>
    ${img(ctx, { src: h.image, alt: h.imageAlt, className: 'hero__img', eager: true })}
  </picture>
  <div class="container hero__inner">
    <div class="hero__content">
      <p class="eyebrow eyebrow--light">${esc(h.eyebrow)}</p>
      <h1 class="hero__title" id="hero-title">${esc(h.heading)}</h1>
      <p class="hero__sub">${esc(h.subheading)}<br>${esc(h.location)}</p>
      ${button({ href: '#quote', label: h.button, arrow: true, className: 'hero__cta' })}
      <ul class="hero__highlights" role="list">
        ${h.highlights.map((x) => `<li>${icon('check', { size: 18 })}<span>${esc(x)}</span></li>`).join('')}
      </ul>
    </div>
  </div>
</section>`;
}

export function servicesSection(ctx) {
  const t = ctx.text.services;
  return `<section class="section services" id="services" aria-labelledby="services-title">
  <div class="container">
    <div class="section-head">
      ${sectionHeading({ eyebrow: t.eyebrow, heading: t.heading, intro: t.intro, id: 'services-title' })}
      <a class="text-link section-head__link" href="services.html">${esc(t.viewAll)}${icon('arrowRight', { size: 16 })}</a>
    </div>
    <ul class="services__grid" role="list" id="services-list">
      ${ctx.services.map((s, i) => serviceCard(ctx, s, { hiddenOnMobile: i >= t.mobileShowCount })).join('\n')}
    </ul>
    ${ctx.services.length > t.mobileShowCount
      ? `<div class="services__more">${button({ label: 'View All Services', arrow: true, className: 'btn--block', attrs: 'data-show-all-services aria-controls="services-list" aria-expanded="false"' })}</div>`
      : ''}
  </div>
</section>`;
}

export function projectsSection(ctx) {
  const t = ctx.text.projects;
  const { gallery, beforeAfter: pairs } = ctx.projects;
  const insta = ctx.settings.social.instagram;
  return `<section class="section projects" id="projects" aria-labelledby="projects-title">
  <div class="container">
    <div class="section-head">
      ${sectionHeading({ eyebrow: t.eyebrow, heading: t.heading, intro: t.intro, id: 'projects-title', className: 'on-dark' })}
      ${insta ? `<a class="text-link text-link--light section-head__link" href="${esc(insta)}" target="_blank" rel="noopener">${esc(t.viewMore)}${icon('arrowRight', { size: 16 })}</a>` : ''}
    </div>
    <ul class="gallery" role="list" data-gallery>
      ${gallery.map((p, i) => galleryTile(ctx, p, i, t.placeholderLabel)).join('\n')}
    </ul>
    ${pairs.length ? `<div class="before-after">
      <div class="before-after__intro">
        <h3>${esc(t.beforeAfterHeading)}</h3>
        <p>${esc(t.beforeAfterIntro)}</p>
      </div>
      <div class="before-after__list">${pairs.map((p) => beforeAfter(ctx, p, t.placeholderLabel)).join('\n')}</div>
    </div>` : ''}
  </div>
  <script type="application/json" id="gallery-data">${JSON.stringify(gallery.map((p) => ({ src: p.image, alt: p.alt, caption: [p.title, p.location].filter(Boolean).join(' · ') + (p.placeholder ? ` (${t.placeholderLabel})` : '') }))).replace(/</g, '\\u003c')}</script>
</section>`;
}

export function aboutSection(ctx) {
  const t = ctx.text.about;
  const areas = ctx.settings.business.areasCovered;
  return `<section class="section about" id="about" aria-labelledby="about-title">
  <div class="container about__inner">
    <div class="about__media">
      ${img(ctx, { src: t.image, alt: t.imageAlt, sizes: '(min-width: 1024px) 520px, 100vw' })}
      ${t.imageIsPlaceholder ? placeholderTag(ctx.text.projects.placeholderLabel) : ''}
    </div>
    <div class="about__content">
      ${sectionHeading({ eyebrow: t.eyebrow, heading: t.heading, id: 'about-title' })}
      ${t.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('\n')}
      <ul class="about__points" role="list">
        ${t.points.map((p) => `<li>${icon('check', { size: 20 })}<span><strong>${esc(p.title)}</strong>${esc(p.text)}</span></li>`).join('\n')}
      </ul>
      ${areas.length ? `<p class="about__areas">${icon('mapPin', { size: 18 })}<span><strong>Areas we cover:</strong> ${areas.map(esc).join(', ')}</span></p>` : ''}
    </div>
  </div>
</section>`;
}

function siteVisitButton(ctx) {
  const { settings, text } = ctx;
  if (settings.booking.url) {
    return button({ href: settings.booking.url, label: text.siteVisit.button, arrow: true, attrs: 'target="_blank" rel="noopener"' });
  }
  const tally = parseTally(settings.tally.siteVisitForm || settings.tally.enquiryForm);
  return button({ href: tally ? tally.shareUrl : '#contact', label: text.siteVisit.button, arrow: true, attrs: 'data-open-dialog="site-visit-dialog"' });
}

export function quoteSection(ctx) {
  const { settings, text } = ctx;
  const q = text.quote;
  const sv = text.siteVisit;
  const c = text.contact;
  return `<section class="quote" id="quote" aria-labelledby="quote-title">
  <div class="container quote__grid">
    <div class="quote__intro">
      ${sectionHeading({ eyebrow: q.eyebrow, heading: q.heading, intro: q.intro, id: 'quote-title' })}
      <ul class="quote__steps" role="list">
        ${q.steps.map((s) => `<li>${icon(s.icon, { size: 22 })}<span>${esc(s.text)}</span></li>`).join('\n')}
      </ul>
    </div>
    <div class="quote__form card${parseTally(settings.tally.enquiryForm) ? ' quote__form--live' : ''}">
      ${tallyEmbed(ctx, settings.tally.enquiryForm, { title: q.formTitle })}
    </div>
    <div class="quote__aside">
      <div class="consult card" id="site-visit">
        ${sv.image ? `<div class="consult__bg" aria-hidden="true" style="background-image:url('${esc(sv.image)}')"></div>` : ''}
        <div class="consult__content">
          ${sectionHeading({ eyebrow: sv.eyebrow, heading: sv.heading, intro: sv.intro })}
          ${siteVisitButton(ctx)}
          <p class="consult__note">${icon('calendar', { size: 16 })}${esc(sv.note)}</p>
        </div>
      </div>
      <div class="chat card" id="contact">
        <h2 class="chat__title">${esc(c.heading)}</h2>
        <p>${esc(c.intro)}</p>
        <div class="chat__actions">
          ${button({ href: whatsappHref(settings), label: c.whatsappButton, iconLeft: 'whatsapp', attrs: 'target="_blank" rel="noopener"' })}
          ${button({ href: telHref(settings), label: settings.contact.phoneDisplay, iconLeft: 'phone' })}
        </div>
      </div>
    </div>
  </div>
</section>`;
}

export function reviewsSection(ctx) {
  const t = ctx.text.reviews;
  const items = ctx.reviews.length ? ctx.reviews : [null, null, null];
  return `<section class="section reviews" id="reviews" aria-labelledby="reviews-title">
  <div class="container">
    <div class="section-head">
      ${sectionHeading({ eyebrow: t.eyebrow, heading: t.heading, intro: t.intro, id: 'reviews-title' })}
      ${ctx.settings.reviewsLink ? `<a class="text-link section-head__link" href="${esc(ctx.settings.reviewsLink)}" target="_blank" rel="noopener">${esc(t.leaveReview)}${icon('arrowRight', { size: 16 })}</a>` : ''}
    </div>
    <ul class="reviews__grid" role="list">
      ${items.map((r) => reviewCard(r, t)).join('\n')}
    </ul>
  </div>
</section>`;
}
