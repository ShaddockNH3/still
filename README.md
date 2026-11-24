# below-the-fold

> Sit still. We'll do the rest.
> 坐好。剩下的交给我们。

A landing page for a meditation app. It behaves like a normal marketing site for about
ninety seconds.

The product is stillness. The page requires you to keep moving to read it. That is the
whole idea, and it stops being funny the further down you go.

Ships in **English and Chinese**. The switch is in the nav.

---

## Two brands, one joke

The English brand is **STILL**, and the whole page leans on one word doing two jobs:
*sit still*, and *still here*. Chinese has no equivalent — 静 doesn't carry "still" as in
"continuing". So the Chinese version isn't a translation. It is the same product, sold by
a different company: **常住**.

常住 is a Buddhist term for that which neither arises nor passes away. Read literally it
means *residing permanently*. The Chinese page ends on 「你还住在这儿。」 — you still live
here. The English page ends on "Still here." Neither is a translation of the other; both
land on the same idea from a different direction.

Copy is stored in `i18n.js`, keyed flat, and applied through `data-i18n` attributes.
Dynamically generated strings (the counter labels, the terminal lines, the returned-visit
hero) read from the same dictionary, so switching language mid-scroll rebuilds everything
including the damage already done to the text.

## The descent

| # | Section | What it does |
|---|---------|--------------|
| 0 | Hero | Clean, quiet, plausible. There is a two-pixel dot in the corner of the screen. It is easy to miss. It does not go away. |
| 1 | The method | Three cards. The third one has a second sentence that arrives a beat too late. |
| 2 | In practice | A counter that only goes up while you scroll, because it is counting your scrolling. |
| 3 | Voices | The last two testimonials are dated `11.24` and describe someone reading the page. From here on, **if you stop moving for twenty-five seconds the page says so**. |
| 4 | Access | One tier, free forever. The terms quietly stop being terms. A `sound?` button fades in at the corner. |
| 5 | — | The background goes grey. Four sentences arrive one at a time and never retract. The block drifts as you scroll; the type is slightly off-register. |
| 6 | — | The lights go out, the cursor disappears, and a terminal types three lines at you. One of them contradicts the page you are on. |
| 7 | — | `You can stop now.` Then `Still here.` Then the dark starts breathing. |

## Load-bearing pieces

**The lie.** At act 6 the page tells you how long it is. The number is smaller than the
distance you have actually scrolled. Both figures are measured at runtime, so the gap
widens the longer you spend getting there.

**The point of no return.** Past 86% the page records it. Reload and the hero is no longer
an invitation:

> You came back. / It doesn't work like that. Nothing here begins.

Closing the tab clears it. Refreshing does not.

**It notices when you stop.** The product is about sitting still, so the page rewards
stillness — badly. Stay put for twenty-five seconds anywhere from act 3 to act 5 and a line
fades in at the bottom of the screen:

> You stopped. / 你停下来了。 → Good. → Keep still. → You're getting good at this.

**The sound.** There is no audio file. Everything is synthesised on demand with WebAudio:
two sine tones a few Hz apart so the drone beats against itself, filtered noise for air,
and a heartbeat whose interval tightens as you approach the bottom. It stays silent until
you ask for it.

## Build

Plain HTML, CSS and JavaScript. No build step, no dependencies, no images.

```sh
python3 -m http.server 8080
# then open http://localhost:8080
```

Deploys as-is to GitHub Pages, Netlify, or anything that serves static files.

## Implementation notes

- Stage colour is driven by whichever `.act` sits under the middle of the viewport, so the
  palette falls in steps. The jump between act 5 and act 6 is meant to feel like a light
  going out.
- Text corruption swaps Latin letters for Cyrillic homoglyphs (`a → а`, `o → о`). It is
  seeded deterministically from the original string plus the stage, so scrolling back shows
  the same damage instead of re-rolling it. It is skipped entirely for Chinese, where the
  same trick just reads as a smudge.
- `prefers-reduced-motion` is honoured: grain stops animating, the terminal prints each line
  at once, and the late-stage breathing stops.
- The tab title changes at act 6 and does not change back.
- The Chinese typography is not the English one with different strings. CJK takes no
  negative tracking, needs looser leading, and a three-character headline has to be set much
  larger than a nine-character one to carry the same weight.
