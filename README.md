# witnessMe - vtuber 3D portal

A browser-based VTuber program with real-time face & body tracking for VRM 3D avatars — no installation required.

> Inspired by [kalidoface-3d](https://github.com/yeemachine/kalidoface-3d). Built with a modern Vite stack for minimal lag and easy customization.

![Preview](https://img.shields.io/badge/status-active-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ Features

- 🎭 **VRM avatar support** — drag & drop any `.vrm` file
- 👁️ **Face tracking** — eyes, brows, mouth shapes, head rotation, pupil tracking
- 🕺 **Full-body tracking** — upper body, arms, hands & fingers (Holistic mode)
- 📷 **4 camera presets** — Front, Side, Bust, Full body (animated transitions)
- 🎨 **Custom backgrounds** — chroma key colors (green/blue/red/black/white) or image upload
- 🪞 **Webcam preview** with mirror toggle
- ⚡ **Minimal lag** — optimized Three.js render loop, delta-time VRM updates
- 📦 **Zero backend** — runs entirely in the browser

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/vtuber3d.git
cd vtuber3d

# Install dependencies
npm install

# Run dev server
npm run dev
# → Open http://localhost:5173
```

## 🏗️ Build for Production

```bash
npm run build
# Output in /dist — deploy to GitHub Pages, Vercel, Netlify, etc.
```

### Deploy to GitHub Pages

```bash
npm run build
# In repo Settings → Pages → Source: gh-pages branch
# Or use the gh-pages package:
npx gh-pages -d dist
```

## 🧱 Tech Stack

| Layer | Library |
|---|---|
| Rendering | [Three.js](https://threejs.org/) r160 |
| VRM | [@pixiv/three-vrm](https://github.com/pixiv/three-vrm) v2 |
| Face Tracking | [MediaPipe FaceMesh](https://google.github.io/mediapipe/solutions/face_mesh) |
| Body Tracking | [MediaPipe Holistic](https://google.github.io/mediapipe/solutions/holistic) |
| Kinematics | [KalidoKit](https://github.com/yeemachine/kalidokit) |
| Bundler | [Vite](https://vitejs.dev/) v5 |

## 🎮 Usage

### Adding a Custom Avatar

1. Get a `.vrm` file from [VRoid Hub](https://hub.vroid.com/) (free)
2. Drag & drop the file onto the **drop zone** in the sidebar
3. Your avatar loads instantly — saved for the session

### Tracking Modes

| Mode | What's tracked |
|---|---|
| **Face** | Head rotation, blink, mouth shapes, pupils, brows |
| **Body** | All of the above + upper body, arms, hands, fingers |

> Body mode uses MediaPipe Holistic which is heavier — recommended for machines with a dedicated GPU or recent CPU.

### Camera Presets

- **Front** — Default portrait view
- **Side** — Profile angle
- **Bust** — Close-up torso
- **Full** — Full-body view

### Background

- Pick a **chroma key** color for use in OBS (Browser Source)
- Upload a custom **image background**

### OBS Integration

1. Add a **Browser Source** in OBS
2. Set the URL to your hosted app (or `http://localhost:5173`)
3. Enable **Chroma Key** filter with the matching color
4. Your avatar overlays cleanly on any scene

## 📁 Project Structure

```
vtuber3d/
├── index.html          # Entry point
├── vite.config.js      # Vite config
├── src/
│   ├── main.js         # App orchestrator
│   ├── scene.js        # Three.js scene, camera, VRM loader
│   ├── rigger.js       # KalidoKit → VRM blendshape/bone mapper
│   ├── tracker.js      # MediaPipe FaceMesh / Holistic setup
│   ├── preview.js      # Webcam preview canvas renderer
│   └── style.css       # UI styles
└── public/
    └── models/         # (optional) place local .vrm files here
```

## 🔧 Customization

### Add a default avatar

Place your `.vrm` in `public/models/` and update `loadDefaultAvatar()` in `src/main.js`:

```js
const resp = await fetch('/models/my-avatar.vrm');
```

### Adjust tracking smoothness

In `src/rigger.js`, the `lerp` alpha values control smoothing (0 = very smooth/laggy, 1 = instant):

```js
// Example: smoother head tracking
lerp(head.rotation.x, rig.head.x, 0.3); // was 0.5
```

### Enable orbit controls (dev)

In `src/scene.js`, set:
```js
controls.enabled = true;
```

## 🤝 Credits

- [KalidoKit](https://github.com/yeemachine/kalidokit) — blendshape & kinematics solver
- [three-vrm](https://github.com/pixiv/three-vrm) — VRM support for Three.js
- [MediaPipe](https://mediapipe.dev/) — ML face & body models
- Default avatar from [KalidoKit docs](https://github.com/yeemachine/kalidokit)

## 📄 License

MIT — do whatever you want, attribution appreciated.
