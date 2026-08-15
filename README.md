<div align="center">
<table>
    <tr><td> <strong>
 witnessMe👁™  </strong> <br><br><br><br><br>
        alpha release<br> □□□□□□□□□□□□□□□
  </td><td>
    <img src = "https://github.com/aura7822/witnessMe/blob/main/Screenshot_20260815_022454.png" width="300" height="190" />
</td>
<td>A Web-based VTuber FOSS program containing <br> comprehensive face & body tracking by 3D <br> VRM avatars <strong>＠</strong>no installation complexities</td></tr>
    
</table>
<p>
 <img src="https://skillicons.dev/icons?i=blender,vite,threejs,,nodejs,wasm,js,coffeescript,,,npm,html,ts,vscode,git" />
    
</p>

<a><img src='https://i.imgur.com/LyHic3i.gif'/></a>

### LAUNCHING :


    
<table><tr><td><p>LINUX_ TERMINAL _ SHELL</p>   </td><td>WINDOWS _POWER _SHELL</td></tr></table>


<table><tr><td>
    
    
    git clone git@github.com:aura7822/witnessMe.git
    cd witnessMe
    npm install --legacy-peer-deps
    npm run dev
    
</td><td>

    
    
    git clone git@github.com:aura7822/witnessMe.git
    cd witnessMe
    npm install --legacy-peer-deps
    npm run dev
    
</td></tr></table>
</td></div>
<a><img src='https://i.imgur.com/LyHic3i.gif'/></a>

##  COMPONENTS

⿻  **VRM avatar support** — drag & drop any `.vrm` file

⿻  **Face tracking** — eyes, brows, mouth shapes, head rotation, pupil tracking

⿻  **Full-body tracking** — upper body, arms, hands & fingers (Holistic mode)

⿻  **4 camera presets** — Front, Side, Bust, Full body (animated transitions)

⿻  **Custom backgrounds** — chroma key colors (green/blue/red/black/white) or image upload

⿻  **Webcam preview** with mirror toggle

⿻  **Minimal lag** — optimized Three.js render loop, delta-time VRM updates

⿻  **Zero backend** — runs entirely in the browser



## MANIPULATION-

### Adding a Custom Avatar-

1. Aquire a `.vrm` file from [VRoid Hub](https://hub.vroid.com/) (free)
2. Drag & drop the file onto the **drop zone** in the sidebar
3. Your avatar loads instantly — saved for the session
<div align="center">
    
### Tracking Modes-

| Mode | What's tracked |
|---|---|
| **Face** | Head rotation, blink, mouth shapes, pupils, brows |
| **Body** | All of the above + upper body, arms, hands, fingers |

</div>

<table><tr><td>TIP:</td></tr></table> Body mode uses MediaPipe Holistic which is heavier — recommended for machines with a dedicated GPU or recent CPU.

<a><img src='https://i.imgur.com/LyHic3i.gif'/></a>
<table>
    <tr><td>  Camera Presets </td></tr>
</table>


- **Front** — Default portrait view
- **Side** — Profile angle
- **Bust** — Close-up torso
- **Full** — Full-body view
<table><tr><td>Backround</td></tr></table>


- Pick a **chroma key** color for use in OBS (Browser Source)
- Upload a custom **image background**

<table><tr><td>OBS Integration</td></tr></table>

1. Add a **Browser Source** in OBS
2. Set the URL to your hosted app (or `http://localhost:5173`)
3. Enable **Chroma Key** filter with the matching color
4. Your avatar overlays cleanly on any scene

<a><img src='https://i.imgur.com/LyHic3i.gif'/></a>

##  Customization

### Initialize a default avatar

Place your `.vrm` in `public/models/` and update `loadDefaultAvatar()` in `src/main.js`:

```js
const resp = await fetch('/models/my-avatar.vrm');
```

### Adjust tracking smoothness

In `src/rigger.js`, the `lerp` alpha values control smoothing (0 = very smooth/laggy, 1 = instant):

```js
// Instance: smoother head tracking
lerp(head.rotation.x, rig.head.x, 0.3); // was 0.5
```

### Enable orbit controls [dev]

In `src/scene.js`, set:
```js
controls.enabled = true;
```
<div align="center">
    

    
### Credits-
<table><tr><td
    [KalidoKit](https://github.com/yeemachine/kalidokit) — blendshape & kinematics solver
</td></tr><tr><td>
    [three-vrm](https://github.com/pixiv/three-vrm) — VRM support for Three.js
</td></tr><tr><td>
     [MediaPipe](https://mediapipe.dev/) — ML face & body models
</td></tr><tr><td>
    Default avatar from [KalidoKit docs](https://github.com/yeemachine/kalidokit)
</td></tr></table>


[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-☕-ff0000?style=for-the-badge)](https://www.buymeacoffee.com/aura7822)

</div>
