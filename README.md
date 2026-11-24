# below-the-fold

> Sit still. We'll do the rest.

A landing page for a meditation app called **STILL**. It behaves like a normal marketing
site for about ninety seconds.

The product is stillness. The page requires you to keep moving to read it. That is the
whole idea, and it stops being funny the further down you go.

---

## The descent

| # | Section | What it does |
|---|---------|--------------|
| 0 | Hero | Clean, quiet, plausible. There is a two-pixel dot in the corner of the screen. It is easy to miss. It does not go away. |
| 1 | The method | Three cards. The third one has a second sentence that arrives a beat too late. |
| 2 | In practice | A counter that only goes up while you scroll, because it is counting your scrolling. |
| 3 | Voices | The first two testimonials are normal. The last two are dated `11.24` and describe someone reading the page. |
| 4 | Access | One tier, free forever. The terms quietly stop being terms. |
| 5 | — | The background goes grey. Four sentences arrive one at a time. The block drifts as you scroll. The type is slightly off-register. |
| 6 | — | The lights go out. A terminal types three lines at you, and one of them contradicts the page you are reading. |
| 7 | — | `You can stop now.` Then, a few seconds later, `Still here.` |

Two things are load-bearing:

- **The lie.** At act 6 the page tells you how long it is. The number is smaller than the
  distance you have actually scrolled. Both figures are measured at runtime.
- **The point of no return.** Once you pass 86%, the page records it. Reload, and the hero
  is no longer an invitation: *You came back. It doesn't work like that.* Closing the tab
  clears it. Refreshing does not.

## Build

Plain HTML, CSS and JavaScript. No build step, no dependencies, no images — every visual
is a gradient, a border, a character swap or a box-shadow.

```sh
python3 -m http.server 8080
# then open http://localhost:8080
```

Deploys as-is to GitHub Pages, Netlify, or anything that serves static files.

## Notes on the implementation

- Stage colour is driven by which `.act` sits under the middle of the viewport, so the
  palette falls in steps rather than smoothly. The jump between act 5 and act 6 is meant
  to feel like a light going out.
- Text corruption swaps Latin letters for Cyrillic homoglyphs (`a → а`, `o → о`). It is
  seeded deterministically from the original string plus the stage, so scrolling back
  shows the same damage instead of re-rolling it.
- `prefers-reduced-motion` is honoured: the grain stops animating and the terminal prints
  each line at once instead of character by character.
- The tab title changes at act 6 and does not change back.
