# District 9 · Exosuit Simulator

A 3D **isometric** low-poly action simulator loosely based on the film
*District 9*. Pilot the captured alien **exosuit** across a dusty wasteland and
fend off escalating waves of hostile drones.

The suit is rendered in flat-shaded low-poly graphics and modelled after the
reference art — a hunched, heavily-armoured chassis with a sensor-antenna
backpack, cable-wrapped tubular arms, an arm-mounted chaingun, a manipulator
claw, and reverse-jointed digitigrade legs ending in clustered thruster pods.

## Play

The game uses ES modules and loads [three.js](https://threejs.org) from a CDN,
so it must be served over HTTP (opening `index.html` directly via `file://`
will be blocked by the browser). From the project root:

```bash
# Option A — Python (no install)
npm start          # → http://localhost:8080

# Option B — Node
npm run serve      # → http://localhost:8080
```

Then open **http://localhost:8080** in a modern browser.

## Controls

### Desktop
| Action | Input |
| --- | --- |
| Move | `W` `A` `S` `D` or Arrow keys |
| Aim | Mouse |
| Fire chaingun | Left-click or `Space` |
| Thruster boost (dash) | `Shift` (drains Boost, auto-recharges) |

### Mobile / touch
On-screen controls appear automatically on the first touch:
- **Left virtual joystick** — move
- **FIRE** button — chaingun
- **BOOST** button — thruster dash

## Gameplay

- Survive endless **waves** of drones — each wave sends more, faster enemies.
- **Walkers** are ground units (tougher); **Hovers** float and strafe (weaker, faster).
- Your **Hull** bar is your health; the **Boost** bar fuels the thruster dash.
- Rack up **Score** for each kill. If your hull hits zero, redeploy and try again.

## Project layout

```
index.html          HUD, overlay, mobile controls, importmap + boot
src/game.js         Main loop: camera, waves, projectiles, collisions, HUD
src/exosuit.js      Low-poly player exosuit model + animation pivots
src/enemies.js      Drone models (walker / hover) + pursuit AI
src/environment.js  Wasteland ground, shacks, containers, debris
src/input.js        Unified keyboard / mouse / touch input
```

Built with [three.js](https://threejs.org). No build step required.
