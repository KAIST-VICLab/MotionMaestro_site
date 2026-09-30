# MotionMaestro project page

Source of the project page for **MotionMaestro: Masked Tokenization for Unified Motion Generation**
(Yun Chen, Munchurl Kim, Jeonghyeok Do; KAIST; arXiv preprint, 2026).

- Live page: https://kaist-viclab.github.io/MotionMaestro_site/
- Code repository: https://github.com/KAIST-VICLab/MotionMaestro

The page is plain HTML, CSS and JavaScript with no build step and no dependencies other than Google Fonts.
GitHub Pages serves it from the repository root (`.nojekyll` turns off Jekyll processing).

## Preview locally

Serve the folder over HTTP rather than opening `index.html` from disk, so that every path resolves as it does on GitHub Pages:

```bash
cd MotionMaestro_site
python3 -m http.server 8000
# then open localhost:8000 in a browser
```

## Layout

```
index.html                the page (results first: the nine-task clips, baseline comparison, stride and body-part clips, paper figures, quantitative results, then a compact method overview)
static/css/family.css     styles shared by every page in the KAIST-VICLab project-page family (the same file on each)
static/js/family.js       scripts shared with those pages: navigation, abstract toggle, pending links, BibTeX copy,
                          image lightbox, tabs, table scroll cues
static/css/style.css      MotionMaestro brand colours (top of the file), the logo animation and the video cards and clip strips
static/js/main.js         video cards (loaded and played only when on screen), clip and figure strips, video lightbox
static/images/            paper figures (*_1200.jpg and the 2000 px *.jpg are inline, *_full.* open in the lightbox),
                          og.jpg (social preview) and the icon files
static/videos/<category>/ 34 demo videos (unified, baseline, stride, bodypart) with posters and thumbnails
static/paper/MotionMaestro.pdf  the paper (PDF), opened by the Paper button and the navigation bar's Paper link
```

## Logo

The MotionMaestro logo is included: it is the hero title, inlined as SVG in `index.html`. There a brace marks "Mae" as
Masked AutoEncoder (the label is drawn by `style.css`) and "Mae" is rebuilt halfway from masked tokens once the logo is on
screen (hovering over or clicking the logo replays it); with reduced motion or without JavaScript it rests half
reconstructed. `static/images/icon.svg` is the navigation and footer mark, and
`icon_square.svg` (the SVG favicon), `favicon-32.png`, `favicon-64.png` and `apple-touch-icon.png` are the browser and
home-screen icons. The page title and headings use the logo's typeface, Outfit (loaded from Google Fonts), and the logo's
colours (ink `#1C2738`, orange `#F4661B`).

## arXiv link

The paper is on arXiv as [arXiv:2609.37495](https://arxiv.org/abs/2609.37495). The arXiv button, the footer's arXiv link
and the BibTeX entry point to it. The Paper button and the navigation bar's Paper link open the hosted PDF,
`static/paper/MotionMaestro.pdf`.
