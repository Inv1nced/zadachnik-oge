(() => {
  const screen = document.querySelector('.atom-screen');
  const canvas = screen.querySelector('.atom-canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const button = document.querySelector('.atom-toggle');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const turn = 2 * Math.PI;
  const cycle = 8000;
  const samples = 96;
  const size = 480;
  const cameraDistance = 6;
  const cameraPitch = 0.21;
  const pitchSin = Math.sin(cameraPitch);
  const pitchCos = Math.cos(cameraPitch);
  const core = [[-0.12, 0.04, 0.02], [0.06, 0.13, -0.08], [0.1, -0.06, 0.11]];

  function orbitPoint(angle, tilt, bearing, radius) {
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * Math.cos(tilt);
    return [
      x * Math.cos(bearing) - y * Math.sin(bearing),
      x * Math.sin(bearing) + y * Math.cos(bearing),
      Math.sin(angle) * radius * Math.sin(tilt),
    ];
  }

  const orbits = [
    {tilt: 0.89, bearing: 0.89, phase: 2.40, radius: 1.94},
    {tilt: 0.94, bearing: -0.96, phase: 2.76, radius: 1.91},
    {tilt: 1.28, bearing: -0.07, phase: 1.36, radius: 1.96},
  ].map(orbit => ({
    ...orbit,
    points: Array.from({length: samples}, (_, index) =>
      orbitPoint(index * turn / samples, orbit.tilt, orbit.bearing, orbit.radius)),
  }));

  function project([x, y, z], sin, cos) {
    const horizontal = x * cos + z * sin;
    const rotatedDepth = z * cos - x * sin;
    const vertical = y * pitchCos - rotatedDepth * pitchSin;
    const depth = y * pitchSin + rotatedDepth * pitchCos;
    const scale = 106 * cameraDistance / (cameraDistance - depth);
    return {x: size / 2 + horizontal * scale, y: size / 2 - vertical * scale, depth, scale};
  }

  function drawOrbit(paths, front) {
    ctx.lineWidth = front ? 13 : 8;
    ctx.strokeStyle = front ? '#a92dfb23' : '#932bfa15';
    ctx.stroke(paths);
    ctx.lineWidth = front ? 5 : 3;
    ctx.strokeStyle = front ? '#bc51fb76' : '#8c3fec65';
    ctx.stroke(paths);
    ctx.lineWidth = front ? 1.7 : 1.25;
    ctx.strokeStyle = front ? '#edd0ff' : '#a56cf2';
    ctx.stroke(paths);
  }

  function drawGlow(x, y, radius, stops) {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    for (const [position, color] of stops) glow.addColorStop(position, color);
    ctx.fillStyle = glow;
    ctx.fillRect(x - radius, y - radius, 2 * radius, 2 * radius);
  }

  function drawElectron(track) {
    const head = track[track.length - 1];
    const radius = head.scale * 0.078;
    const attenuation = 0.74 + 0.26 * Math.min(1, Math.max(0, head.depth + 0.5));
    const tail = new Path2D();
    tail.moveTo(track[0].x, track[0].y);
    for (const point of track.slice(1)) tail.lineTo(point.x, point.y);

    const fading = ctx.createLinearGradient(track[0].x, track[0].y, head.x, head.y);
    fading.addColorStop(0, '#a32af300');
    fading.addColorStop(0.40, '#a73aff56');
    fading.addColorStop(0.78, '#cf84ffde');
    fading.addColorStop(1, '#fff0ff');
    const halo = ctx.createLinearGradient(track[0].x, track[0].y, head.x, head.y);
    halo.addColorStop(0, '#8a29fa00');
    halo.addColorStop(0.52, '#8a29fa20');
    halo.addColorStop(1, '#a94fff66');
    ctx.globalAlpha = attenuation;
    ctx.lineWidth = radius * 3.15;
    ctx.strokeStyle = halo;
    ctx.stroke(tail);
    ctx.lineWidth = radius * 1.33;
    ctx.strokeStyle = fading;
    ctx.stroke(tail);
    ctx.lineWidth = radius * 0.30;
    ctx.stroke(tail);
    drawGlow(head.x, head.y, radius * 4, [
      [0, '#ffffff'], [0.15, '#fff1ff'], [0.25, '#eac6ffec'],
      [0.43, '#ae56fc9b'], [0.67, '#8b2be438'], [1, '#8b2be400'],
    ]);
    ctx.globalAlpha = 1;
  }

  function drawNucleus(sin, cos, progress) {
    const center = size / 2;
    const pulse = 1 + 0.075 * Math.sin(progress * 3);
    drawGlow(center, center, 119 * pulse, [
      [0, '#f1b0ffbf'], [0.23, '#cf59f890'], [0.47, '#a02dfb44'],
      [0.72, '#871cef19'], [1, '#831bea00'],
    ]);

    const flare = ctx.createRadialGradient(center, center, 0, center, center, 83 * pulse);
    flare.addColorStop(0, '#fff5ffcc');
    flare.addColorStop(0.42, '#dc86ff5e');
    flare.addColorStop(1, '#b852ff00');
    ctx.fillStyle = flare;
    for (let ray = 0; ray < 10; ray++) {
      const angle = ray * turn / 10 + progress;
      const length = (56 + 24 * Math.sin(3.1 * ray)) * pulse;
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(center - y * 7, center + x * 7);
      ctx.lineTo(center + x * length, center + y * length);
      ctx.lineTo(center + y * 7, center - x * 7);
      ctx.fill();
    }

    for (const point of core) {
      const {x, y} = project(point, sin, cos);
      drawGlow(x, y, 31 * pulse, [
        [0, '#ffffff'], [0.38, '#fff2ff'], [0.53, '#f2cafff0'],
        [0.69, '#c960fb9c'], [1, '#a849f600'],
      ]);
    }
  }

  function render(elapsed) {
    const progress = elapsed / cycle * turn;
    const angle = progress + 0.39;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    const front = new Path2D();
    const back = new Path2D();
    const electrons = [];
    for (const orbit of orbits) {
      const points = orbit.points.map(point => project(point, sin, cos));
      for (let i = 0; i < samples; i++) {
        const start = points[i];
        const end = points[(i + 1) % samples];
        const path = start.depth + end.depth > 0 ? front : back;
        path.moveTo(start.x, start.y);
        path.lineTo(end.x, end.y);
      }
      const heading = orbit.phase + 2 * progress;
      const trail = Array.from({length: 15}, (_, index) => {
        const angle = heading - 0.83 * (1 - index / 14);
        return project(orbitPoint(angle, orbit.tilt, orbit.bearing, orbit.radius), sin, cos);
      });
      electrons.push(trail);
    }

    ctx.clearRect(0, 0, size, size);
    ctx.lineCap = 'round';
    drawOrbit(back, false);
    electrons.filter(trail => trail[trail.length - 1].depth <= 0).forEach(drawElectron);
    drawNucleus(sin, cos, progress);
    drawOrbit(front, true);
    electrons.filter(trail => trail[trail.length - 1].depth > 0).forEach(drawElectron);
  }

  let inView = !('IntersectionObserver' in window);
  let paused = false;
  let frame = 0;
  let previousTime;
  let elapsed = 0;

  function tick(time) {
    if (previousTime !== undefined) elapsed = (elapsed + time - previousTime) % cycle;
    previousTime = time;
    render(elapsed);
    frame = requestAnimationFrame(tick);
  }

  function updatePlayback() {
    const playing = !paused && !reducedMotion.matches;
    button.hidden = reducedMotion.matches;
    const action = playing ? 'Приостановить вращение атома' : 'Запустить вращение атома';
    button.setAttribute('aria-label', action);
    button.title = action;
    if (playing && inView && !document.hidden) {
      if (!frame) frame = requestAnimationFrame(tick);
      return;
    }
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    previousTime = undefined;
  }

  canvas.width = size;
  canvas.height = size;
  render(0);
  screen.setAttribute('data-has-frame', '');
  button.addEventListener('click', () => {
    paused = !paused;
    updatePlayback();
  });
  reducedMotion.addEventListener('change', updatePlayback);
  document.addEventListener('visibilitychange', updatePlayback);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      updatePlayback();
    });
    observer.observe(screen);
  }
  updatePlayback();
})();
