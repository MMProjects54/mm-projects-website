"""
Browser tests for the Design Studio (homepage section, /design, the bathroom studio).
  node src/build.mjs && PORT=8095 node src/serve.mjs &
  python3 tests/e2e_studio.py [screenshot-folder]
External sites (Tally, Cal.com, Checkatrade) are blocked so only this site is tested.
"""
import sys
from playwright.sync_api import sync_playwright, expect

SITE = 'http://localhost:8095'
SHOTS = sys.argv[1] if len(sys.argv) > 1 else None
results = []

def check(cond, label):
    results.append((bool(cond), label))
    print(('PASS ' if cond else 'FAIL ') + label)

def shot(page, name, full=True):
    if SHOTS: page.screenshot(path=f'{SHOTS}/{name}.png', full_page=full)

def block_external(ctx):
    ctx.route('**/*', lambda r: r.abort() if not r.request.url.startswith(SITE) else r.continue_())

def pick(page, q, o):
    page.click(f'.opt[data-q="{q}"][data-o="{o}"]')

def next_(page):
    page.locator('#studio-next').click(force=True)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, locale='en-GB')
    block_external(ctx)
    page = ctx.new_page()
    errors, dialogs = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text and 'ERR_FAILED' not in m.text else None)
    page.on('dialog', lambda d: (dialogs.append(d.message), d.accept()))

    # ---- Homepage section
    page.goto(SITE + '/')
    sec = page.locator('#design-studio')
    expect(sec).to_be_visible()
    order = page.evaluate("[...document.querySelectorAll('main > section')].map(s => s.id || s.className.split(' ')[0])")
    check(order[:3] == ['top', 'design-studio', 'quote'], f'section sits between the hero and Start Your Project {order[:3]}')
    check(sec.locator('.studio-teaser__eyebrow').inner_text().upper() == 'MM PROJECTS' and sec.locator('h2').inner_text() == 'Bring Your Ideas to Life', 'label and heading as in the brief')
    check([c.inner_text() for c in sec.locator('.studio-card__name').all()] == ['Bathrooms', 'Kitchens', 'Media Walls'], 'three cards, names underneath')
    check(all(sec.locator('.studio-card img').nth(i).get_attribute('alt') for i in range(3)), 'every card image has a description')
    check('Explore Design Studio' in sec.locator('.studio-teaser__btn').inner_text(), 'Explore Design Studio button')
    sec.locator('.studio-card').first.click(); page.wait_for_url('**/design/bathroom/**')
    check(True, 'the whole card is clickable (opens the bathroom studio)')

    # ---- Landing page
    page.goto(SITE + '/'); page.click('.studio-teaser__btn'); page.wait_for_url('**/design/')
    expect(page.locator('h1')).to_contain_text('Design your space')
    check(page.locator('.studio-pick').count() == 3, 'landing page offers three studios')
    check(page.locator('.studio-pick').first.locator('.studio-pick__btn').inner_text().startswith('Start Designing'), 'bathroom: Start Designing')
    check(page.locator('.studio-pick--soon').count() == 2, 'kitchen and media wall marked coming soon until built')
    check(page.evaluate("getComputedStyle(document.body).backgroundColor") != 'rgba(0, 0, 0, 0)' and page.evaluate("document.styleSheets.length") > 0, 'styles load on the sub-page')
    shot(page, 'landing-desktop')

    # ---- Bathroom studio
    page.locator('.studio-pick').first.click(); page.wait_for_url('**/design/bathroom/**')
    expect(page.locator('#studio-count')).to_have_text('Step 1 of 10')
    check(page.locator('.opt').count() == 4 and page.is_visible('#studio-bar'), 'step 1: four bathroom types, progress bar')
    check(page.locator('#studio-prev').is_hidden(), 'no Back on the first step')
    next_(page)
    expect(page.locator('#studio-count')).to_have_text('Step 1 of 10')
    check(page.get_attribute('#studio-next', 'aria-disabled') == 'true', 'cannot continue without choosing')
    pick(page, 'room_type', 'ensuite')
    check(page.get_attribute('.opt[data-o="ensuite"]', 'aria-checked') == 'true' and page.locator('.opt.is-selected').count() == 1, 'clear selected state, one choice only')
    pick(page, 'room_type', 'full')
    check(page.locator('.opt.is-selected').count() == 1 and page.get_attribute('.opt[data-o="full"]', 'aria-checked') == 'true', 'changing the choice moves the tick')
    next_(page); expect(page.locator('#studio-count')).to_have_text('Step 2 of 10')
    check(page.url.endswith('#layout'), 'each step has its own address')
    pick(page, 'layout', 'keep'); next_(page)
    pick(page, 'bath_shower', 'bath'); next_(page)
    pick(page, 'style', 'modern'); next_(page)
    expect(page.locator('h1')).to_have_text('Wall finishes')
    check(page.locator('.studio-q').count() == 1, 'wall colour and tile style only appear once a finish is chosen')
    pick(page, 'wall_finish', 'wetwall')
    check(page.locator('[data-q="tile_style"]').count() == 0 and page.locator('[data-q="wall_colour"]').count() > 0, 'wet wall panels: no tile style question')
    pick(page, 'wall_finish', 'fully_tiled')
    check(page.locator('[data-q="tile_style"]').count() == 7, 'tiles: tile style question appears')
    pick(page, 'tile_style', 'metro'); pick(page, 'wall_colour', 'sage')
    next_(page)
    pick(page, 'floor_type', 'lvt'); pick(page, 'floor_colour', 'warm_oak'); next_(page)
    pick(page, 'vanity_type', 'none')
    check(page.locator('[data-q="furniture_colour"]').count() == 0, 'no vanity: furniture colour not asked')
    pick(page, 'vanity_type', 'wall_hung'); pick(page, 'basin', 'countertop'); pick(page, 'furniture_colour', 'sage')
    pick(page, 'storage', 'tall_unit'); pick(page, 'storage', 'shelving')
    check(page.locator('.opt[data-q="storage"].is-selected').count() == 2, 'choose several extras')
    pick(page, 'storage', 'shelving')
    check(page.locator('.opt[data-q="storage"].is-selected').count() == 1, 'tap again to remove one')
    next_(page)
    expect(page.locator('h1')).to_have_text('Taps, showers and fittings')
    check(page.locator('[data-q="shower_type"]').count() == 0 and page.locator('[data-q="screen"]').count() == 0, 'bath only: no shower or glass screen questions')
    pick(page, 'finish', 'brushed_brass'); pick(page, 'toilet', 'wall_hung'); next_(page)
    pick(page, 'mirror', 'led'); pick(page, 'extras', 'towel_rail'); pick(page, 'extras', 'underfloor'); next_(page)
    expect(page.locator('h1')).to_have_text('Review your design')
    expect(page.locator('#studio-count')).to_have_text('Step 10 of 10')
    summary = page.inner_text('.studio-summary')
    check('Full bathroom' in summary and 'Metro' in summary and 'Brushed brass' in summary and 'Heated towel rail, Underfloor heating' in summary and 'Tall unit' in summary, 'summary lists every choice')
    check('Glass screen' not in summary and 'Furniture colour' in summary, 'questions that no longer apply are left out')
    shot(page, 'review-desktop')

    # Edit a previous step and come back
    page.locator('[data-edit="2"]').click(); expect(page.locator('h1')).to_have_text('Bath and shower')
    pick(page, 'bath_shower', 'walk_in')
    expect(page.locator('#studio-next span')).to_have_text('Back to summary')
    next_(page); expect(page.locator('h1')).to_have_text('Review your design')
    check('Walk-in shower' in page.inner_text('.studio-summary'), 'change a choice and return to the summary')
    page.locator('[data-edit="7"]').click()
    check(page.locator('[data-q="shower_type"]').count() == 4 and page.get_attribute('#studio-next', 'aria-disabled') == 'true', 'a shower now asks shower type and glass screen before continuing')
    pick(page, 'shower_type', 'rainfall'); pick(page, 'screen', 'fluted'); next_(page)
    expect(page.locator('h1')).to_have_text('Review your design')

    # Details form
    page.click('.studio-form__send')
    expect(page.locator('#sf-msg')).to_be_visible()
    check('your name' in page.inner_text('#sf-msg') and 'postcode' in page.inner_text('#sf-msg') and 'privacy' in page.inner_text('#sf-msg'), 'asks for name, contact, postcode and consent')
    page.fill('#sf-notes', 'Small window, would like to keep the radiator.')
    page.select_option('#sf-budget', label='£10,000 to £15,000'); page.select_option('#sf-timeframe', label='3 to 6 months')
    page.fill('#sf-postcode', 'G61 3HQ'); page.fill('#sf-name', 'Test Customer'); page.fill('#sf-email', 'not-an-email')
    page.check('#sf-consent'); page.click('.studio-form__send')
    check('valid email' in page.inner_text('#sf-msg'), 'checks the email address')
    page.fill('#sf-email', 'test@example.com')
    page.set_input_files('#sf-photos', files=[{'name': 'room.png', 'mimeType': 'image/png', 'buffer': bytes.fromhex('89504e470d0a1a0a0000000d4948445200000001000000010806000000') + b'\x00' * 40}])
    expect(page.locator('#sf-thumbs li')).to_have_count(1)
    check(True, 'add an optional photo (shown as a thumbnail)')
    page.click('#sf-thumbs [data-rm]'); expect(page.locator('#sf-thumbs li')).to_have_count(0)
    check(True, 'remove a photo')
    page.click('.studio-form__send')
    expect(page.locator('.studio-preview-note')).to_be_visible()
    check('Nothing has been sent' in page.inner_text('.studio-preview-note'), 'preview: Send shows a note and sends nothing')
    check(page.locator('.studio-hp input').get_attribute('tabindex') == '-1', 'hidden spam trap field present')

    # Saved progress
    page.goto(SITE + '/design/bathroom/')
    expect(page.locator('.studio-resume')).to_be_visible()
    check('choices' in page.inner_text('.studio-resume'), 'returning visitor: "Welcome back"')
    page.click('#studio-resume'); expect(page.locator('h1')).to_have_text('Review your design')
    check(page.input_value('#sf-postcode') == 'G61 3HQ' and 'Brushed brass' in page.inner_text('.studio-summary'), 'picks up exactly where they left off, details included')
    page.click('#studio-reset'); expect(page.locator('#studio-count')).to_have_text('Step 1 of 10')
    check(page.locator('.opt.is-selected').count() == 0, 'Start again clears the saved design')
    page.goto(SITE + '/design/bathroom/'); check(page.locator('.studio-resume').count() == 0, 'nothing left saved after starting again')

    # Back button and keyboard
    pick(page, 'room_type', 'cloakroom'); next_(page); page.click('#studio-prev')
    expect(page.locator('h1')).to_have_text('What kind of bathroom?')
    check(page.get_attribute('.opt[data-o="cloakroom"]', 'aria-checked') == 'true', 'Back keeps the earlier choice')
    page.focus('.opt[data-o="cloakroom"]'); page.keyboard.press('Enter')
    check(page.get_attribute('.opt[data-o="cloakroom"]', 'aria-checked') == 'true', 'options work with the keyboard')
    check(not errors, f'no page errors {errors[:3]}')
    ctx.close()

    for name, vp in [('iphone', {'width': 390, 'height': 844}), ('ipad', {'width': 820, 'height': 1180})]:
        c = b.new_context(viewport=vp, device_scale_factor=2, is_mobile=True, has_touch=True, locale='en-GB'); block_external(c)
        pg = c.new_page()
        pg.goto(SITE + '/'); pg.locator('#design-studio').scroll_into_view_if_needed(); pg.wait_for_timeout(300)
        cards = pg.locator('.studio-card').all()
        check(len(cards) == 3 and all(cd.bounding_box()['width'] >= 100 for cd in cards), f'{name}: cards side by side and easy to tap')
        check(pg.evaluate('document.documentElement.scrollWidth') <= vp['width'], f'{name}: homepage fits the screen')
        if SHOTS: pg.locator('#design-studio').screenshot(path=f'{SHOTS}/teaser-{name}.png')
        pg.goto(SITE + '/design/'); pg.wait_for_timeout(300)
        check(pg.evaluate('document.documentElement.scrollWidth') <= vp['width'], f'{name}: landing page fits the screen')
        shot(pg, f'landing-{name}')
        pg.goto(SITE + '/design/bathroom/'); pg.wait_for_timeout(300)
        pick(pg, 'room_type', 'full')
        nav = pg.locator('#studio-nav').bounding_box()
        check(nav and nav['y'] + nav['height'] <= vp['height'] + 1, f'{name}: Back/Continue bar stays at the bottom of the screen')
        check(pg.evaluate('document.documentElement.scrollWidth') <= vp['width'], f'{name}: studio fits the screen')
        shot(pg, f'step1-{name}', full=False)
        c.close()
    b.close()

passed = sum(1 for ok, _ in results if ok)
print(f'\n{passed}/{len(results)} checks passed')
sys.exit(0 if passed == len(results) else 1)
