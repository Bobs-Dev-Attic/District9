# Changelog

The version shown on the game's loading screen comes from `src/version.js`.
Bump that file, `package.json`, and add an entry here on every update.

## v1.7.1
- Corrected the pelvis "tail": it now sits at the **front** of the pelvis and
  points **down/forward** between the legs (was drooping out the back), and it's
  **shorter** (3 segments) — a codpiece-like central keel matching the reference.

## v1.7.0
- Added the distinctive pelvis **"inverted tail"** (`buildPelvisTail`): a
  segmented, faceted keel that droops down and back from the rear of the pelvis,
  tapering to a pointed tip between the legs like a rudder/stinger. Exposed as
  `userData.tail` for future secondary animation.

## v1.6.1
- Extended the head/beak a little further forward, and reattached the mandible
  "tentacles" at the tip — they were floating detached in front of the beak.
  They now cluster on a knuckle at the beak tip and curl down/forward.

## v1.6.0
- Added the exosuit's distinctive **beaked head/"face"** (`buildHead`): an
  elongated angular snout that juts forward and down from between the shoulder
  yokes — layered brow plates, a central spine ridge, flared cheek plates with
  hex sensor bolts (orange glow), a tapering beak, and small mandible claws at
  the tip. Matches the side/top reference profiles.

## v1.5.0
- Reworked the upper body to match the detailed reference turnaround and get
  the signature hunched, wide-shouldered "vulture" silhouette:
  - Added broad **shoulder yokes** — curved cantilever booms that sweep up and
    out from the upper back to shoulder balls at the outer ends, with orange
    accent caps. The arms now hang from these wide outer ends.
  - Added thick **cable bundles** draping over the yokes and down the chest.
  - Added a forward-jutting **chest keel** (the "beak").
  - The arms hang near-vertically from the wide shoulders (the yoke provides the
    width) with the weapons draping down outside the thighs.

## v1.4.0
- Reworked the arm pose to match the second walking reference: the arms now
  **hang down at the sides with bent elbows**, the upper arms angling down from
  the high shoulders and the weapons draping down alongside the thighs (muzzles
  pitched down/slightly forward) — instead of being held up horizontally.

## v1.3.1
- Decoupled movement from the camera: the mouse is now **strictly look/orbit**.
  WASD moves the suit along fixed world axes regardless of the camera angle, so
  rotating the view no longer changes the walk direction.

## v1.3.0
- Reworked the arms to the **bent-elbow walk pose** from the reference GIF: the
  forearms now bend forward and hold the weapons up in front of the chassis
  instead of hanging straight down. The chaingun / claw are re-aimed to read
  forward with a slight downward pitch.
- The walk animation layers on top of the new bent base — the arms bob and the
  shoulders swing (opposite their same-side leg) through the gait, and the gun
  arm still kicks back on recoil.

## v1.2.0
- Switched to an **exosuit viewer / showcase** mode while the graphics and
  animation are being dialled in:
  - Removed the enemy drones and combat (waves, damage, enemy fire) for now.
  - Added full **orbit camera** control: drag to rotate, scroll/pinch to zoom,
    right-drag / two-finger to pan, and `R` (or the RESET VIEW button) to
    recentre. The camera rig follows the suit so it stays framed while walking.
  - The suit can still walk (WASD/joystick), boost (Shift), and fire (Space /
    FIRE button) so all the animations can be inspected from any angle.
  - Mouse no longer aims/fires (it drives the camera); simplified the HUD to a
    boost bar, a controls legend, and a reset-view button.
  - Vendored three.js `OrbitControls` locally for offline use.

## v1.1.0
- Refined exosuit animation for a heavier, more grounded feel, informed by the
  reference turntable pose:
  - Wider, planted stance and a baked-in forward hunch (chassis tips over hips).
  - Weighted walk: anti-phase thigh swing, knees that bend through the swing and
    plant straight, shins counter-rotating to keep the feet level, a heavy
    double-bounce bob, and a stomp settle jolt on every footfall.
  - Forward lean when moving/boosting; torso counter-rotates and lags into turns.
  - Backpack/antenna secondary motion that lags the body sway.
  - Punchier gun recoil (whole-arm kick + snappy recovery) with a firing shudder
    that nudges the torso and rig.
  - "Breathing" idle sway instead of a frozen stance.

## v1.0.0
- Initial release: 3D isometric low-poly District 9 exosuit combat simulator.
- Faithful exosuit model (antenna backpack, chaingun arm, claw arm,
  digitigrade legs with clustered thruster-pod feet).
- Procedural wasteland, escalating drone waves (walker + hover), projectiles,
  explosions, thruster boost, HUD.
- Keyboard/mouse and mobile touch controls.
- three.js r160 vendored locally for offline play.
- Version number displayed on the loading screen.
