# Home concept v2: source

A separate try-out of a new Home for the Mandate Decision Studio. It is not part of the studios or their GitHub repos.
The built page is `../index.html` (`../home-concept-v2.html` in the Drive project), one offline file with the font and logos inside it.

**Live:** https://mukhrizizraf.github.io/website-design-idea/mpob-mandate-home/

**The idea:** one camera flies through one 3D world, with no crossfades, driven by scroll or Play. Sea of clouds, then MANDATE
standing in the estate, through the hole in the D, into a fruit-bunch macro (OBJ1), past the plant in a storm (OBJ2), to the tanker at
sunset (OBJ3), down the coast road under the B20/B30 gantry (OBJ4), to the drop you can fill to B20 or B30 (Decision now).

## Commands

| Command | What it does |
|---|---|
| `node build.mjs` | Builds the page from `hero.src.html`, `hero.css`, `hero.js` |
| `node test.mjs` | Acceptance checks in a real browser on the real GPU (38 checks) |
| `node make_poster.mjs` | Recaptures the real first frame as `poster.jpg`. Run it, then build again, whenever the opening scene changes |

Open the page with `?debug` for a live readout (fps, frame ms, tier, resolution). `?tier=0|1|2` forces a quality tier, and `?g=2.0` holds the camera at a chapter.

## How it stays smooth

- **First paint is instant.** The poster is a tiny real frame of the first scene, inside the file, under an iOS-style spring that runs on the compositor.
- **Nothing heavy runs until the spring lands.** The GL context waits for it. Noise and meshes build in slices of about 6 ms, shaders compile in parallel where the driver allows, and every shader is warmed up before the reveal, so no first use can hitch mid-flight.
- **Resolution changes never reallocate.** The scene draws into part of a fixed buffer. Slow frames lower resolution within about 0.3 s, and a level that failed is not retried for a while, so sharpness does not pump.
- **The address bar cannot cause a resize.** The canvas is sized to `100lvh` once; the controls follow `100dvh`.
- **Scrolling is native.** It feeds a critically damped spring on the camera, so a wheel notch cannot read as a jump. Words change only `opacity` and `transform`. There is no `backdrop-filter`.
- **Three tiers** (phone, laptop, desktop) set MSAA, cloud steps, palm counts and blur taps. Phones start at tier 0 and 80% resolution, then earn sharpness.

## Moving it into the studios later

1. `hero.js` becomes the story section in `src/home.js`. Keep its boot order; the deferred start is what makes opening smooth.
2. The tab links here go to the live Pages site. In the app they become `data-tab` buttons, and the Mandate tab bar and Looks stay the app's own.
3. The app's sound, the hive and the "slide to start" control (`guide.js`) are not in this concept. Decide which of them stay.
4. The objective pages still use the hive, so going from this world into them is a jump in style. Plan a hand-off.
5. `home.js` and `shared.css` must stay byte-identical between the User and Developer levels: edit in USER, copy to DEVELOPER.
