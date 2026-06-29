# Third-Party Notices

## Series
**Narrated History Map Documentary Series**
Creator: Johnny — https://linkedin.com/in/icomppower/

---

This project bundles and/or fetches third-party software and data. Each retains
its own license, reproduced or referenced below.

---

## 1. Three.js (r128): bundled software

Files: `lib/three.min.js`, `lib/OrbitControls.js`, `lib/CSS2DRenderer.js`
(unmodified Three.js r128; `three.min.js` carries the inline header
`@license Copyright 2010-2021 Three.js Authors / SPDX-License-Identifier: MIT`;
the two example files ship without a per-file header and are covered by this notice).

```
The MIT License

Copyright © 2010-2021 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

---

## 2. Map data: fetched at setup, NOT redistributed in this repository

The terrain and imagery tiles are **not** committed to this repository (see
`.gitignore`). They are downloaded from their source providers by
`tools/fetch_tiles.mjs` and displayed at runtime. The required attributions are
shown persistently in the app UI and reproduced here:

### Satellite imagery: `lib/tiles/img/`
> **Sentinel-2 cloudless 2016** © EOX IT Services GmbH, https://s2maps.eu
> (contains modified Copernicus Sentinel data 2016)

License: Creative Commons Attribution 4.0 (CC BY 4.0) as indexed on the current
EOX portal for the 2016 layer. Note: EOX's 2017 announcement described the 2016
layer as CC BY-SA 4.0; if you intend to **redistribute the tiles themselves** (this
repo does not), confirm the exact license with EOX (cloudless@eox.at).
Source: https://s2maps.eu · https://cloudless.eox.at

### Elevation: `lib/tiles/dem/`
> United States 3DEP (formerly NED) and global GMTED2010 and **SRTM** terrain data
> courtesy of the **U.S. Geological Survey** (public domain).

Delivered as Terrarium terrain-RGB via the AWS Open Data "Terrain Tiles" program
(`s3://elevation-tiles-prod`). Source: https://registry.opendata.aws/terrain-tiles/
· https://github.com/tilezen/joerd/blob/master/docs/attribution.md
