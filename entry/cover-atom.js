(() => {
  const screen = document.querySelector('.atom-screen');
  const canvas = screen.querySelector('.atom-canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const button = document.querySelector('.atom-motion');
  const label = button.querySelector('.atom-motion-label');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const turn = 2 * Math.PI;
  const cycle = 8000;
  const samples = 72;
  const size = 480;
  const cameraDistance = 6;
  const cameraPitch = 0.21;
  const phi = (1 + Math.sqrt(5)) / 2;
  const vertices = [
    [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
    [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
    [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1],
  ].map(vertex => vertex.map(component => component * 0.29));
  const faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];

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
    {tilt: 0.42, bearing: 0.94, phase: 0.24, radius: 1.91},
    {tilt: 0.86, bearing: -0.68, phase: 2.50, radius: 1.87},
    {tilt: 1.24, bearing: 0.14, phase: 4.72, radius: 1.94},
  ].map(orbit => ({
    ...orbit,
    points: Array.from({length: samples}, (_, index) =>
      orbitPoint(index * turn / samples, orbit.tilt, orbit.bearing, orbit.radius)),
  }));

  function project([x, y, z], sin, cos) {
    const horizontal = x * cos + z * sin;
    const rotatedDepth = z * cos - x * sin;
    const vertical = y * Math.cos(cameraPitch) - rotatedDepth * Math.sin(cameraPitch);
    const depth = y * Math.sin(cameraPitch) + rotatedDepth * Math.cos(cameraPitch);
    const scale = 111 * cameraDistance / (cameraDistance - depth);
    return {x: size / 2 + horizontal * scale, y: size / 2 - vertical * scale, depth, scale};
  }

  function drawOrbit(paths, front) {
    ctx.lineWidth = front ? 10 : 6;
    ctx.strokeStyle = front ? '#f0913426' : '#e3a0521b';
    ctx.stroke(paths);
    ctx.lineWidth = front ? 4 : 3;
    ctx.strokeStyle = front ? '#ed943e72' : '#e4a3514f';
    ctx.stroke(paths);
    ctx.lineWidth = front ? 1.8 : 1.4;
    ctx.strokeStyle = front ? '#ffd89a' : '#b27b48';
    ctx.stroke(paths);
  }

  function drawElectron({x, y, scale, depth}) {
    const radius = scale * 0.052;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 3.4);
    glow.addColorStop(0, depth > 0 ? '#fff2c5' : '#f6ca91');
    glow.addColorStop(0.24, '#ffd18cf0');
    glow.addColorStop(0.44, '#ef9a486c');
    glow.addColorStop(1, '#ef9a4800');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius * 3.4, 0, turn);
    ctx.fill();
    ctx.fillStyle = '#ffedc7';
    ctx.fillRect(x - radius / 2, y - radius / 2, radius, radius);
  }

  function drawNucleus(sin, cos) {
    const points = vertices.map(vertex => project(vertex, sin, cos));
    const visibleFaces = faces.map(face => face.map(index => points[index])).filter(([a, b, c]) =>
      (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) < 0);
    for (const [a, b, c] of visibleFaces) {
      const ab = [b.x - a.x, a.y - b.y, (b.depth - a.depth) * 111];
      const ac = [c.x - a.x, a.y - c.y, (c.depth - a.depth) * 111];
      const nx = ab[1] * ac[2] - ab[2] * ac[1];
      const ny = ab[2] * ac[0] - ab[0] * ac[2];
      const nz = ab[0] * ac[1] - ab[1] * ac[0];
      const light = Math.max(0, (-0.48 * nx + 0.64 * ny + 0.60 * nz) / Math.hypot(nx, ny, nz));
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.closePath();
      ctx.fillStyle = `hsl(${25 + light * 14} 59% ${22 + light * 44}%)`;
      ctx.fill();
      ctx.strokeStyle = `rgb(255 193 121 / ${0.22 + light * 0.30})`;
      ctx.lineWidth = 0.9;
      ctx.stroke();
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
      const position = orbitPoint(orbit.phase + 2 * progress, orbit.tilt, orbit.bearing, orbit.radius);
      electrons.push(project(position, sin, cos));
    }

    ctx.clearRect(0, 0, size, size);
    ctx.lineCap = 'round';
    drawOrbit(back, false);
    electrons.filter(electron => electron.depth <= 0).forEach(drawElectron);
    drawNucleus(sin, cos);
    drawOrbit(front, true);
    electrons.filter(electron => electron.depth > 0).forEach(drawElectron);
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
    button.toggleAttribute('data-playing', playing);
    label.textContent = playing ? 'Пауза' : 'Вращать атом';
    button.setAttribute('aria-label', playing ? 'Приостановить вращение атома' : 'Запустить вращение атома');
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
