// MM Projects Design Studio: homepage section, landing page and the studio pages.
// The studios themselves are drawn in the browser by src/scripts/studio.js from
// content/studios/<id>.json. Image prompts in those files are for making the
// images only and are never sent to the browser.
import { esc } from '../lib/html.mjs';
import { icon } from '../lib/icons.mjs';
import { img } from './ui.mjs';

/** Where an option's picture lives (several options can share one base picture). */
export function optionImage(studioId, questionId, option) {
  const shot = String(option.shot || '');
  if (option.image) return option.image;
  if (shot.startsWith('base:')) return `images/studio/${studioId}/base-${shot.slice(5)}.jpg`;
  return `images/studio/${studioId}/${questionId}-${option.id}.jpg`;
}

/** The studio settings the browser needs: steps, questions, options and their pictures. */
export function clientConfig(studio, imageSizes, imageExists) {
  return {
    id: studio.id,
    name: studio.name,
    short: studio.short,
    intro: studio.intro,
    imageCredit: studio.imageCredit,
    budgets: studio.budgets,
    timeframes: studio.timeframes,
    steps: studio.steps.map((s) => ({
      id: s.id, title: s.title, intro: s.intro, review: Boolean(s.review), showIf: s.showIf,
      questions: (s.questions || []).map((q) => ({
        id: q.id, label: q.label, type: q.type, required: q.required !== false, hint: q.hint, showIf: q.showIf,
        options: q.options.map((o) => {
          const src = optionImage(studio.id, q.id, o);
          const has = imageExists(src);
          const size = imageSizes[src];
          return { id: o.id, label: o.label, desc: o.desc, showIf: o.showIf, img: has ? src : null, webp: has && imageExists(src.replace(/\.jpe?g$/, '.webp')) ? src.replace(/\.jpe?g$/, '.webp') : null, w: size?.width, h: size?.height };
        }),
      })),
    })),
  };
}

/** List of every option still without a picture (shown as build warnings; blocks going live). */
export function missingImages(studio, imageExists) {
  const out = [];
  for (const s of studio.steps) for (const q of s.questions || []) for (const o of q.options) {
    const src = optionImage(studio.id, q.id, o);
    if (!imageExists(src)) out.push(`${studio.id}: ${s.title} > ${q.label} > ${o.label} (${src})`);
  }
  return [...new Set(out)];
}

/** Homepage: "Bring Your Ideas to Life" with three cards and a button. */
export function studioTeaser(ctx) {
  const d = ctx.design;
  if (!d) return '';
  const t = d.teaser;
  return `<section class="section studio-teaser" id="design-studio" aria-labelledby="studio-title">
  <div class="container studio-teaser__inner">
    <p class="studio-teaser__eyebrow">${esc(t.eyebrow)}</p>
    <h2 class="studio-teaser__title" id="studio-title">${esc(t.heading)}</h2>
    <p class="studio-teaser__intro">${esc(t.intro)}</p>
    <ul class="studio-teaser__cards" role="list">
      ${d.studios.map((s) => `<li><a class="studio-card" href="design/${esc(s.id)}/">
        <span class="studio-card__img">${img(ctx, { src: s.image, alt: s.alt, sizes: '(min-width: 1040px) 330px, 31vw' })}</span>
        <span class="studio-card__name">${esc(s.label)}</span></a></li>`).join('')}
    </ul>
    <a class="btn studio-teaser__btn" href="design/">${esc(t.button)}${icon('arrowRight', { size: 18 })}</a>
  </div>
</section>`;
}

/** /design: introduces the studio and offers the three studios. */
export function designLandingBody(ctx) {
  const d = ctx.design; const t = d.landing;
  return `<section class="page-banner page-banner--studio">
  <div class="container">
    <p class="eyebrow eyebrow--light">${esc(t.eyebrow)}</p>
    <h1 class="page-banner__title">${esc(t.heading)}</h1>
    <p class="page-banner__intro">${esc(t.intro)}</p>
  </div>
</section>
<section class="section studio-landing" aria-label="Choose a studio">
  <div class="container">
    <ul class="studio-picks" role="list">
      ${d.studios.map((s) => {
        const ready = ctx.studios.some((x) => x.id === s.id);
        return `<li class="studio-pick${ready ? '' : ' studio-pick--soon'}">
        <a class="studio-pick__link" href="${ready ? `design/${esc(s.id)}/` : '#'}"${ready ? '' : ' aria-disabled="true" tabindex="-1"'}>
          <span class="studio-pick__img">${img(ctx, { src: s.image, alt: s.alt, sizes: '(min-width: 1040px) 360px, (min-width: 700px) 46vw, 100vw' })}</span>
          <span class="studio-pick__body">
            <span class="studio-pick__title">${esc(s.title)}</span>
            <span class="studio-pick__text">${esc(s.text)}</span>
            <span class="btn ${ready ? 'btn--primary' : 'btn--outline'} studio-pick__btn">${ready ? `Start Designing${icon('arrowRight', { size: 18 })}` : 'Coming soon'}</span>
          </span>
        </a>
      </li>`;
      }).join('')}
    </ul>
    <ol class="studio-how" role="list">
      ${t.steps.map((s, i) => `<li><span class="studio-how__num">${i + 1}</span><span><strong>${esc(s.title)}</strong><span>${esc(s.text)}</span></span></li>`).join('')}
    </ol>
    <p class="studio-note">${esc(t.note)}</p>
  </div>
</section>`;
}

/** /design/<id>: the studio shell; studio.js draws the steps. */
export function studioBody(ctx, studio) {
  const config = { icons: ctx.studioIcons, ...clientConfig(studio, ctx.imageSizes, ctx.imageExists) };
  const json = JSON.stringify(config).replace(/</g, '\\u003c');
  return `<div class="studio" id="studio" data-studio="${esc(studio.id)}" data-preview="${ctx.studioPreview ? '1' : ''}">
  <div class="studio__top">
    <div class="container studio__top-inner">
      <a class="studio__back-link" href="design/">${icon('arrowLeft', { size: 18 })}<span>Design Studio</span></a>
      <p class="studio__name">${esc(studio.name)}</p>
      <p class="studio__count" id="studio-count" aria-live="polite"></p>
    </div>
    <div class="studio__progress" aria-hidden="true"><span id="studio-bar"></span></div>
  </div>
  <div class="container studio__main" id="studio-main">
    <noscript><p class="studio-note">The Design Studio needs JavaScript. You can still <a href="index.html#quote">send us an enquiry</a>.</p></noscript>
  </div>
  <div class="studio__nav" id="studio-nav" hidden>
    <div class="container studio__nav-inner">
      <button type="button" class="btn btn--outline studio__prev" id="studio-prev">${icon('arrowLeft', { size: 18 })}<span>Back</span></button>
      <p class="studio__nav-hint" id="studio-hint"></p>
      <button type="button" class="btn btn--primary studio__next" id="studio-next"><span>Continue</span>${icon('arrowRight', { size: 18 })}</button>
    </div>
  </div>
  <script type="application/json" id="studio-config">${json}</script>
</div>`;
}
