// Page definitions: which sections appear on each page, in order.
import { esc, fill } from './lib/html.mjs';
import { icon } from './lib/icons.mjs';
import { documentShell } from './components/layout.mjs';
import { button, sectionHeading, img } from './components/ui.mjs';
import { hero, servicesSection, projectsSection, aboutSection, quoteSection, reviewsSection } from './components/sections.mjs';

export function homePage(ctx) {
  const { settings } = ctx;
  return documentShell(ctx, {
    title: settings.seo.homeTitle,
    description: settings.seo.homeDescription,
    path: '',
    body: [hero(ctx), servicesSection(ctx), projectsSection(ctx), aboutSection(ctx), quoteSection(ctx), reviewsSection(ctx)].join('\n'),
  });
}

function pageBanner({ eyebrow, heading, intro }) {
  return `<section class="page-banner">
  <div class="container">
    ${eyebrow ? `<p class="eyebrow eyebrow--light">${esc(eyebrow)}</p>` : ''}
    <h1 class="page-banner__title">${esc(heading)}</h1>
    ${intro ? `<p class="page-banner__intro">${esc(intro)}</p>` : ''}
  </div>
</section>`;
}

export function servicesPage(ctx) {
  const { settings, text, services } = ctx;
  const t = text.servicesPage;
  const rows = services
    .map((s, i) => `<article class="service-row${i % 2 ? ' service-row--flip' : ''}" id="${esc(s.id)}" aria-labelledby="${esc(s.id)}-title">
  <div class="service-row__media">${img(ctx, { src: s.image, alt: s.imageAlt, sizes: '(min-width: 1024px) 560px, 100vw' })}<span class="service-card__icon">${icon(s.icon, { size: 18 })}</span></div>
  <div class="service-row__body">
    <h2 id="${esc(s.id)}-title">${esc(s.title)}</h2>
    <p class="service-row__summary">${esc(s.summary)}</p>
    <p>${esc(s.details)}</p>
    <h3>${esc(t.listHeading)}</h3>
    <ul class="tick-list" role="list">${s.includes.map((x) => `<li>${icon('check', { size: 18 })}<span>${esc(x)}</span></li>`).join('')}</ul>
    ${button({ href: 'index.html#quote', label: text.hero.button, arrow: true })}
  </div>
</article>`)
    .join('\n');
  return documentShell(ctx, {
    title: settings.seo.servicesTitle,
    description: settings.seo.servicesDescription,
    path: 'services.html',
    body: `${pageBanner(t)}
<div class="section services-page"><div class="container">
  <nav class="jump-links" aria-label="Services on this page"><ul role="list">${services.map((s) => `<li><a href="#${esc(s.id)}">${esc(s.title)}</a></li>`).join('')}</ul></nav>
  ${rows}
</div></div>
<section class="cta-band">
  <div class="container cta-band__inner">
    <div><h2>${esc(t.ctaHeading)}</h2><p>${esc(t.ctaText)}</p></div>
    ${button({ href: 'index.html#quote', label: text.hero.button, arrow: true })}
  </div>
</section>`,
  });
}

export function privacyPage(ctx) {
  const { settings, privacy } = ctx;
  const f = (s) => esc(fill(s, settings));
  const sections = privacy.sections
    .map((s) => `<section>
  <h2>${f(s.heading)}</h2>
  ${(s.paragraphs || []).map((p) => `<p>${f(p)}</p>`).join('\n')}
  ${s.list && s.list.length ? `<ul>${s.list.map((li) => `<li>${f(li)}</li>`).join('')}</ul>` : ''}
  ${[].concat(s.after || []).map((p) => `<p>${f(p)}</p>`).join('\n')}
</section>`)
    .join('\n');
  return documentShell(ctx, {
    title: `${privacy.title} | ${settings.business.name}`,
    description: `How ${settings.business.name} collects and uses personal information.`,
    path: 'privacy.html',
    body: `${pageBanner({ heading: privacy.title, intro: `Last updated: ${privacy.lastUpdated}` })}
<div class="section"><div class="container prose">
  <p class="prose__lead">${f(privacy.intro)}</p>
  ${sections}
</div></div>`,
  });
}

export function notFoundPage(ctx) {
  return documentShell(ctx, {
    title: `Page not found | ${ctx.settings.business.name}`,
    description: 'This page could not be found.',
    path: '404.html',
    noindex: true,
    body: `${pageBanner({ heading: 'Page not found', intro: 'Sorry, that page does not exist or has moved.' })}
<div class="section"><div class="container">${button({ href: 'index.html', label: 'Back to the homepage', arrow: true })}</div></div>`,
  });
}
