// Page shell: <head>, header, footer and shared dialogs.
import { esc, telHref, whatsappHref, parseTally } from '../lib/html.mjs';
import { icon } from '../lib/icons.mjs';
import { button, tallyEmbed } from './ui.mjs';

function brand(ctx, { tag = 'a' } = {}) {
  const { settings } = ctx;
  return `<a class="brand" href="${ctx.home}" aria-label="${esc(settings.business.name)} home">
  <img class="brand__mark" src="${esc(settings.logo.mark)}" alt="" width="37" height="48">
  <span class="brand__name">${esc(settings.business.name)}</span>
</a>`;
}

function socialLinks(settings) {
  const items = [
    ['whatsapp', 'WhatsApp', whatsappHref(settings)],
    ['instagram', 'Instagram', settings.social.instagram],
    ['tiktok', 'TikTok', settings.social.tiktok],
    ['facebook', 'Facebook', settings.social.facebook],
  ].filter(([, , url]) => url);
  if (!items.length) return '';
  return `<ul class="social" role="list">${items
    .map(([key, name, url]) => `<li><a href="${esc(url)}" target="_blank" rel="noopener" aria-label="${esc(settings.business.name)} on ${name}">${icon(key, { size: 22 })}</a></li>`)
    .join('')}</ul>`;
}

export function header(ctx) {
  const { settings, text } = ctx;
  const navItems = text.nav
    .map((n) => `<li><a href="${ctx.href(n.href)}"${n.href === '#top' && ctx.page === 'home' ? ' aria-current="page"' : ''} data-nav="${esc(n.href.slice(1))}">${esc(n.label)}</a></li>`)
    .join('');
  return `<header class="site-header" id="site-header">
  <div class="container site-header__inner">
    ${brand(ctx)}
    <nav class="main-nav" aria-label="Main">
      <ul role="list">${navItems}</ul>
    </nav>
    <div class="site-header__actions">
      <a class="phone-pill" href="${telHref(settings)}">${icon('phone', { size: 18 })}<span>${esc(settings.contact.phoneDisplay)}</span></a>
      <a class="wa-circle" href="${esc(whatsappHref(settings))}" target="_blank" rel="noopener" aria-label="Message ${esc(settings.business.name)} on WhatsApp">${icon('whatsapp', { size: 20 })}</a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu">
        ${icon('menu', { size: 28, className: 'menu-toggle__open' })}${icon('close', { size: 28, className: 'menu-toggle__close' })}
      </button>
    </div>
  </div>
  <div class="mobile-menu" id="mobile-menu" hidden>
    <nav class="container" aria-label="Mobile">
      <ul role="list">${navItems}</ul>
      <div class="mobile-menu__actions">
        ${button({ href: telHref(settings), label: settings.contact.phoneDisplay, iconLeft: 'phone' })}
        ${button({ href: whatsappHref(settings), label: text.contact.whatsappButton, iconLeft: 'whatsapp', variant: 'outline-light', attrs: 'target="_blank" rel="noopener"' })}
      </div>
    </nav>
  </div>
</header>`;
}

export function footer(ctx) {
  const { settings, text } = ctx;
  const year = new Date().getFullYear();
  const links = text.nav.filter((n) => n.href !== '#quote');
  return `<footer class="site-footer">
  <div class="container site-footer__inner">
    <div class="site-footer__brand">
      ${brand(ctx)}
      <div class="site-footer__summary">${text.footer.summary.map((l) => `<p>${esc(l)}</p>`).join('')}
        <p class="site-footer__links"><a href="${telHref(settings)}">${icon('phone', { size: 14 })}${esc(settings.contact.phoneDisplay)}</a>${settings.contact.email ? `<a href="mailto:${esc(settings.contact.email)}">${icon('mail', { size: 14 })}${esc(settings.contact.email)}</a>` : ''}</p>
      </div>
    </div>
    <nav class="site-footer__nav" aria-label="Footer">
      <ul role="list">${links.map((n) => `<li><a href="${ctx.href(n.href)}"${n.href === '#top' && ctx.page === 'home' ? ' aria-current="page"' : ''}>${esc(n.label)}</a></li>`).join('')}</ul>
    </nav>
    <div class="site-footer__contact">
      ${socialLinks(settings)}
    </div>
  </div>
  <div class="site-footer__bar">
    <div class="container site-footer__bar-inner">
      <p>© ${year} ${esc(settings.business.name)}. All rights reserved. <span class="sep" aria-hidden="true">|</span> <a href="privacy.html">${esc(text.footer.privacyLink)}</a></p>
      <p>${esc(text.footer.bottomLine)}</p>
    </div>
  </div>
</footer>`;
}

/** Dialog for site survey requests (Tally), plus the gallery lightbox. */
export function dialogs(ctx) {
  const { settings, text } = ctx;
  const form = settings.tally.siteVisitForm || settings.tally.enquiryForm;
  const body = parseTally(form)
    ? tallyEmbed(ctx, form, { title: text.siteVisit.dialogTitle })
    : `<div class="dialog__fallback">
        <p><strong>${esc(text.quote.notConnected)}</strong></p>
        <p>To request a site survey, please call or message us on WhatsApp.</p>
        <div class="dialog__actions">
          ${button({ href: telHref(settings), label: settings.contact.phoneDisplay, iconLeft: 'phone' })}
          ${button({ href: whatsappHref(settings), label: text.contact.whatsappButton, iconLeft: 'whatsapp', variant: 'outline', attrs: 'target="_blank" rel="noopener"' })}
        </div>
      </div>`;
  return `<dialog class="dialog" id="site-visit-dialog" aria-labelledby="site-visit-title">
  <div class="dialog__head">
    <h2 id="site-visit-title">${esc(text.siteVisit.dialogTitle)}</h2>
    <button type="button" class="dialog__close" data-close-dialog aria-label="Close">${icon('close', { size: 24 })}</button>
  </div>
  <p class="dialog__note">${icon('calendar', { size: 18 })}${esc(text.siteVisit.note)}</p>
  ${body}
</dialog>
<dialog class="lightbox" id="lightbox" aria-label="Project photo">
  <button type="button" class="lightbox__close" data-close-dialog aria-label="Close">${icon('close', { size: 28 })}</button>
  <button type="button" class="lightbox__nav lightbox__nav--prev" data-lightbox-prev aria-label="Previous photo">${icon('chevronLeft', { size: 32 })}</button>
  <figure class="lightbox__figure"><img src="" alt=""><figcaption></figcaption></figure>
  <button type="button" class="lightbox__nav lightbox__nav--next" data-lightbox-next aria-label="Next photo">${icon('chevronRight', { size: 32 })}</button>
</dialog>`;
}

function structuredData(ctx) {
  const { settings, services } = ctx;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    name: settings.business.name,
    description: settings.seo.homeDescription,
    telephone: settings.contact.phoneInternational,
    areaServed: [settings.business.serviceArea, ...settings.business.areasCovered].map((name) => ({ '@type': 'Place', name })),
    address: { '@type': 'PostalAddress', addressLocality: 'Glasgow', addressCountry: 'GB' },
    knowsAbout: services.map((s) => s.title),
    sameAs: Object.values(settings.social).filter(Boolean),
  };
  if (settings.contact.email) data.email = settings.contact.email;
  if (settings.siteUrl) {
    data.url = `${settings.siteUrl}/`;
    data.image = `${settings.siteUrl}/${settings.seo.shareImage}`;
    data.logo = `${settings.siteUrl}/images/icon-512.png`;
  }
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

export function documentShell(ctx, { title, description, path, body, noindex = false }) {
  const { settings } = ctx;
  const url = settings.siteUrl ? `${settings.siteUrl}/${path}` : '';
  const shareImg = settings.siteUrl ? `${settings.siteUrl}/${settings.seo.shareImage}` : '';
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">' : ''}
${url ? `<link rel="canonical" href="${esc(url)}">` : ''}
<meta name="theme-color" content="${esc(settings.brand.charcoal)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(settings.business.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:locale" content="en_GB">
${url ? `<meta property="og:url" content="${esc(url)}">` : ''}
${shareImg ? `<meta property="og:image" content="${esc(shareImg)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="images/favicon-32.png">
<link rel="apple-touch-icon" href="images/apple-touch-icon.png">
<link rel="manifest" href="site.webmanifest">
<link rel="preload" href="fonts/inter-400.woff" as="font" type="font/woff" crossorigin>
<link rel="preload" href="fonts/inter-600.woff" as="font" type="font/woff" crossorigin>
<link rel="stylesheet" href="assets/site.css?v=${ctx.version}">
${ctx.page === 'home' ? structuredData(ctx) : ''}
<script src="assets/site.js?v=${ctx.version}" defer></script>
</head>
<body class="page-${ctx.page}">
<a class="skip-link" href="#main">Skip to content</a>
${header(ctx)}
<main id="main" tabindex="-1">
${body}
</main>
${footer(ctx)}
${dialogs(ctx)}
</body>
</html>
`;
}
