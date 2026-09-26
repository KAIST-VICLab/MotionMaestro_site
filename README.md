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
static/css/family.css     styles shared with the GeoSET, GeoCR and MotionMaestro pages (the same file on all three)
static/js/family.js       scripts shared with those pages: navigation, abstract toggle, pending links, BibTeX copy,
                          image lightbox, tabs, table scroll cues
static/css/style.css      MotionMaestro brand colours (top of the file), the logo animation and the video cards and clip strips
static/js/main.js         video cards (loaded and played only when on screen), clip and figure strips, video lightbox
static/images/            figures (web size + *_full.* for the lightbox), og.jpg (social preview) and the icon files
static/videos/<category>/ 34 demo videos (unified, baseline, stride, bodypart) with posters and thumbnails
```

## Logo

The MotionMaestro logo is included: it is the hero title, inlined as SVG in `index.html`. There a brace marks "Mae" as
Masked AutoEncoder (the label is drawn by `style.css`) and "Mae" is rebuilt from masked tokens once on load; with reduced
motion or without JavaScript the logo is shown as is. `static/images/icon.svg` is the navigation and footer mark, and
`icon_square.svg` (the SVG favicon), `favicon-32.png`, `favicon-64.png` and `apple-touch-icon.png` are the browser and
home-screen icons. The page title and headings use the logo's typeface, Outfit (loaded from Google Fonts), and the logo's
colours (ink `#1C2738`, orange `#F4661B`).

## arXiv link

The arXiv ID is not assigned yet. Until it is, the Paper and arXiv buttons, the navigation bar's Paper link, the footer's
arXiv link and the BibTeX entry hold a placeholder ID; a link that holds it is shown as pending (the Paper and arXiv buttons
carry a "soon" badge) and does not navigate, with or without JavaScript. The arXiv link will be added once the paper is on arXiv: replacing the placeholder in
`index.html` with the real ID is enough, and the links then work as normal links. No CSS or JavaScript file needs editing.
