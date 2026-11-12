# 🌸 Breathe

> A calm little mobile game: pop soft bubbles, grow a bonsai, learn to breathe.
> *Un petit jeu zen : éclate des bulles, fais pousser un bonsaï, apprends à respirer.*

**Play it:** enable GitHub Pages on the `/docs` folder (Settings → Pages → `main` / `/docs`).

---

## English

Breathe is a zen bubble-popping game for mobile (portrait), drawn entirely on a canvas.
No ads, no tracking, no dependencies — free and open.

- **Pop bubbles** — tap the soft ones; swipe a golden bonus bubble to launch it like a billiard ball. Every ricochet scores ×5.
- **Fill the heart** — pop enough bubbles and the heart bursts into butterflies, then a Japanese scroll reveals a proverb (wise, funny, or a little sarcastic).
- **Grow a bonsai** — 7 species (maple, black pine, cherry, juniper, elm, azalea, yew), 888 levels each, 88 leaves per tree. One finished session = one level.
- **Moods** — each species has its own game backdrop. Moonlit starry night is done; mountain, oasis, snow and rain are coming.
- **Calm detection** — if you tap too fast, the game pauses and guides you through a breathing exercise (4-4-6).
- **Meditation mode** — guided breathing, and a progressive muscle relaxation (crown of the head → toes) to help you sleep.

### Run it

Open `docs/index.html` in a browser. That's it.

### Develop it

```bash
node build.js   # bundles src/*.js into docs/index.html (single file)
```

Edit the modules in `src/`, open the root `index.html` while developing (it loads the modules directly), then run `node build.js` before committing.

### Structure

| Module | Role |
|---|---|
| `quotes.js` | Proverbs and sayings bank |
| `theme_moonlit.js` | Moonlit night backdrop |
| `scenery.js` | Day backdrop and theme switching |
| `bubbles.js` | Bubbles, tap, swipe launch, ricochets |
| `heart.js` | Progress heart and butterfly burst |
| `scroll.js` | Japanese scroll (makimono) end screen |
| `bonsai.js` | Procedural bonsai: species, pots, bark, leaves |
| `progress.js` | Saved progress (`localStorage`, or `window.storage` inside Claude) |
| `garden.js` | Garden screen (bonsai on a gardener's shelf) |
| `poptext.js` | Onomatopoeia (POP!, BAM!…) |
| `calm.js` | Fast-tapping detection and breathing overlay |
| `meditation.js` | Meditation mode |
| `game.js` | Main loop, score, input |

### Roadmap

- [ ] Backdrops: mountain, oasis, snow, rain
- [ ] Celebration screen when a tree reaches level 888
- [ ] More proverbs

## Français

Breathe est un jeu zen pour mobile (portrait), entièrement dessiné en canvas. Sans pub, sans traceur, sans dépendance — libre et ouvert.

Ouvre simplement `docs/index.html` dans un navigateur. Pour modifier le jeu, édite les modules dans `src/` puis lance `node build.js`.

## License

[MIT](LICENSE) — free to use, share and modify.
