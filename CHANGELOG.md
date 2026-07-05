# Changelog

The version shown on the game's loading screen comes from `src/version.js`.
Bump that file, `package.json`, and add an entry here on every update.

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
