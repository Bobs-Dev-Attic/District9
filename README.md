# District 9 · Exosuit Viewer

A 3D low-poly **showcase** of the captured alien **exosuit** loosely based on the
film *District 9*. Orbit around the suit from any angle and drive its walk,
boost and firing animations while the graphics and animation are dialled in.

> **Note:** enemies and combat are disabled for now — this is currently a
> graphics/animation viewer. The drone-wave combat lives in the git history
> (v1.1.0) and will return once the look is finalised.

The suit is rendered in flat-shaded low-poly graphics and modelled after the
reference art — a hunched, heavily-armoured chassis with a sensor-antenna
backpack, cable-wrapped tubular arms, an arm-mounted chaingun, a manipulator
claw, and reverse-jointed digitigrade legs ending in clustered thruster pods.

## Run

The app uses ES modules and loads [three.js](https://threejs.org) from a locally
vendored copy, so it must be served over HTTP (opening `index.html` directly via
`file://` is blocked by the browser). From the project root:

```bash
# Option A — Python (no install)
npm start          # → http://localhost:8080

# Option B — Node
npm run serve      # → http://localhost:8080
```

Then open **http://localhost:8080** in a modern browser. The current version is
shown on the loading screen.

## Controls

### Camera (orbit)
| Action | Desktop | Touch |
| --- | --- | --- |
| Rotate | Drag | One finger drag |
| Zoom | Scroll wheel | Pinch |
| Pan | Right-drag | Two-finger drag |
| Reset view | `R` or **RESET VIEW** button | **RESET VIEW** button |

### Exosuit
| Action | Desktop | Touch |
| --- | --- | --- |
| Walk | `W` `A` `S` `D` / Arrows | Left virtual joystick |
| Thruster boost | `Shift` | **BOOST** button |
| Fire chaingun | `Space` | **FIRE** button |

The camera rig follows the suit as it walks, so it stays framed at whatever
angle/zoom you set.

## Project layout

```
index.html          HUD, overlay, mobile controls, importmap + boot
src/game.js         Main loop: orbit camera, animation, input, HUD
src/exosuit.js      Low-poly exosuit model + animation pivots
src/environment.js  Wasteland ground, shacks, containers, debris (context)
src/enemies.js      Drone models + AI (retained for when combat returns)
src/input.js        Keyboard / touch input (mouse drives the orbit camera)
src/version.js      Single source of truth for the displayed version
vendor/             three.js + OrbitControls, vendored for offline use
```

Built with [three.js](https://threejs.org). No build step required.
