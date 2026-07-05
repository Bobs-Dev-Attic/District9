// ---------------------------------------------------------------------------
// Unified input: keyboard + mouse for desktop, on-screen virtual joystick +
// buttons for touch devices. Exposes a simple polled state object:
//   move: {x, y}   normalised movement vector (screen-relative)
//   aim:  {x, y}   world-plane aim point requested (from mouse) or null
//   firing: bool
//   boosting: bool (dash / thruster)
// ---------------------------------------------------------------------------

export function createInput(domElement) {
  const state = {
    move: { x: 0, y: 0 },
    firing: false,
    boosting: false,
    mouse: { x: 0, y: 0, active: false }, // NDC coords for aiming
    isTouch: false,
  };

  const keys = new Set();
  const KEYMAP = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
  };

  window.addEventListener('keydown', (e) => {
    if (e.code in KEYMAP || e.code === 'Space' || e.code === 'ShiftLeft') e.preventDefault();
    keys.add(e.code);
    if (e.code === 'Space') state.firing = true;
    if (e.code === 'ShiftLeft') state.boosting = true;
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
    if (e.code === 'Space') state.firing = false;
    if (e.code === 'ShiftLeft') state.boosting = false;
  });

  // Mouse aim + fire (desktop)
  domElement.addEventListener('mousemove', (e) => {
    const r = domElement.getBoundingClientRect();
    state.mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    state.mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    state.mouse.active = true;
  });
  domElement.addEventListener('mousedown', (e) => { if (e.button === 0) state.firing = true; });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) state.firing = false; });
  domElement.addEventListener('contextmenu', (e) => e.preventDefault());

  // ---- Touch controls ----
  const joystick = document.getElementById('joystick');
  const stick = document.getElementById('stick');
  const btnFire = document.getElementById('btn-fire');
  const btnBoost = document.getElementById('btn-boost');
  const touchUI = document.getElementById('touch-controls');

  function enableTouchUI() {
    if (state.isTouch) return;
    state.isTouch = true;
    if (touchUI) touchUI.classList.add('active');
  }

  if (joystick && stick) {
    let jid = null, cx = 0, cy = 0;
    const R = 55;
    const start = (e) => {
      enableTouchUI();
      const t = e.changedTouches[0];
      jid = t.identifier;
      const r = joystick.getBoundingClientRect();
      cx = r.left + r.width / 2;
      cy = r.top + r.height / 2;
      move(t);
      e.preventDefault();
    };
    const move = (t) => {
      let dx = t.clientX - cx, dy = t.clientY - cy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
      stick.style.transform = `translate(${dx}px, ${dy}px)`;
      state.move.x = dx / R;
      state.move.y = -dy / R; // up on screen = +y
    };
    const end = () => {
      jid = null;
      stick.style.transform = 'translate(0,0)';
      state.move.x = 0; state.move.y = 0;
    };
    joystick.addEventListener('touchstart', start, { passive: false });
    window.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) if (t.identifier === jid) move(t);
    }, { passive: false });
    window.addEventListener('touchend', (e) => {
      for (const t of e.changedTouches) if (t.identifier === jid) end();
    });
    window.addEventListener('touchcancel', end);
  }

  function bindButton(el, prop) {
    if (!el) return;
    el.addEventListener('touchstart', (e) => { enableTouchUI(); state[prop] = true; el.classList.add('pressed'); e.preventDefault(); }, { passive: false });
    el.addEventListener('touchend', (e) => { state[prop] = false; el.classList.remove('pressed'); e.preventDefault(); }, { passive: false });
    el.addEventListener('touchcancel', () => { state[prop] = false; el.classList.remove('pressed'); });
  }
  bindButton(btnFire, 'firing');
  bindButton(btnBoost, 'boosting');

  window.addEventListener('touchstart', enableTouchUI, { once: true });

  // Poll keyboard into move vector each frame.
  function update() {
    if (!state.isTouch) {
      let x = 0, y = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      const m = Math.hypot(x, y);
      state.move.x = m ? x / m : 0;
      state.move.y = m ? y / m : 0;
    }
    return state;
  }

  return { state, update };
}
