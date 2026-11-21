# MaxJubayerYT.github.io

Static, single-page profile site for MaxJubayerYT. Material 3 Expressive, blue/aqua theme, light and dark mode.

Style based on the [Copper Launcher website](https://github.com/CopperLauncher/copperlauncher.github.io).

## Files

| Path | What it is |
| --- | --- |
| `index.html` | The whole page: hero, about, projects, links, contact |
| `style.css` | Design tokens (light/dark), components and layout |
| `index.js` | Theme toggle, nav highlighting, copy button, optional GitHub stats |
| `images/` | Profile picture and favicon (project icons load from cdn.modrinth.com) |

## Run it

No build step. Open `index.html`, or serve the folder with any static host (GitHub Pages, `python3 -m http.server`).

## Edit

- Colors: the `--c-*` tokens at the top of `style.css`.
- Links: the `ccard` blocks inside `#links` in `index.html`.
- Projects: the `card` blocks inside `#projects`.
- Profile picture: replace `images/pfp.webp` and `images/favicon.webp`.
