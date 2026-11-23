(() => {
  const examLinks = [...document.querySelectorAll('.exam')];
  const hoverCapable = matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 640;
  const releaseStart = 94;
  const releaseSpan = 320;
  const releaseEnd = releaseStart + releaseSpan;
  const masks = new Map();
  let selection;

  const clamp = value => Math.max(0, Math.min(1, value));
  const spread = amount => (Math.random() - 0.5) * amount;

  function prepare(link) {
    const canvas = link.querySelector('.particles');
    const word = link.querySelector('.exam-word');
    const baseline = link.querySelector('.baseline');
    const rect = link.getBoundingClientRect();
    const wordRect = word.getBoundingClientRect();
    const style = getComputedStyle(word);
    const scale = Math.min(devicePixelRatio || 1, 1.75);
    const width = link.clientWidth;
    const height = link.clientHeight;
    const x = wordRect.left - rect.left - link.clientLeft;
    const y = baseline.getBoundingClientRect().top - rect.top - link.clientTop;
    const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const signature = [width, height, scale, x, y, wordRect.width, font].join('|');
    if (masks.get(link)?.signature === signature) return masks.get(link);

    const glyphs = document.createElement('canvas');
    const top = Math.floor(wordRect.top - rect.top - link.clientTop) - 8;
    const left = Math.floor(x) - 8;
    glyphs.width = Math.ceil((wordRect.width + 16) * scale);
    glyphs.height = Math.ceil((wordRect.height + 16) * scale);
    const pixels = glyphs.getContext('2d', {willReadFrequently: true});
    const output = canvas.getContext('2d');
    if (!pixels || !output) return null;
    pixels.scale(scale, scale);
    pixels.font = font;
    pixels.textBaseline = 'alphabetic';
    pixels.fillStyle = style.getPropertyValue('--accent').trim();
    pixels.fillText(word.firstChild.data, x - left, y - top);

    const {data} = pixels.getImageData(0, 0, glyphs.width, glyphs.height);
    const points = [];
    const budget = rect.width < 420 ? 610 : 1350;
    let filled = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] >= 120) filled++;
    }
    const step = Math.max(2, Math.ceil(Math.sqrt(filled / budget)));
    for (let row = 0; row < glyphs.height; row += step) {
      for (let col = 0; col < glyphs.width; col += step) {
        const gx = col + Math.floor(Math.random() * Math.min(step, glyphs.width - col));
        const gy = row + Math.floor(Math.random() * Math.min(step, glyphs.height - row));
        if (data[(gy * glyphs.width + gx) * 4 + 3] < 120) continue;
        const px = left + gx / scale;
        const py = top + gy / scale;
        const shear = (py - y + wordRect.height / 2) * 0.28;
        const front = clamp((px + shear - x + spread(8)) / wordRect.width);
        const drift = (py - (top + wordRect.height / 2)) * 0.3;
        points.push({
          x: px, y: py, at: releaseStart + releaseSpan * front,
          dx: 36 + front * 57 + spread(86), dy: drift + spread(100),
          size: 0.60 + Math.random() * 1.2,
          life: 146 + Math.random() * 86,
          brightness: 0.62 + Math.random() * 0.38,
          glint: Math.random() < 0.21,
        });
      }
    }
    if (!points.length) return null;
    const mask = {signature, canvas, output, glyphs, points, scale, width, height, x, y, top, left,
      wordWidth: wordRect.width, wordHeight: wordRect.height, color: pixels.fillStyle};
    masks.set(link, mask);
    return mask;
  }

  function paint(mask, elapsed) {
    const {output, glyphs, points, scale, width, height, x, y, top, left, wordHeight, wordWidth, color} = mask;
    output.clearRect(0, 0, width, height);
    if (elapsed < releaseEnd) {
      // The same slanted edge uncovers the dots and clips the intact glyphs.
      const t = clamp((elapsed - releaseStart) / releaseSpan);
      const edge = x + t * (wordWidth + 20) - 10;
      const center = y - wordHeight / 2;
      output.save();
      output.beginPath();
      output.moveTo(edge + center * 0.28, 0);
      output.lineTo(width, 0);
      output.lineTo(width, height);
      output.lineTo(edge + (center - height) * 0.28, height);
      output.closePath();
      output.clip();
      output.drawImage(glyphs, left, top, glyphs.width / scale, glyphs.height / scale);
      output.restore();
    }

    for (const point of points) {
      const age = (elapsed - point.at) / point.life;
      if (age <= 0 || age >= 1) continue;
      const travel = 1 - Math.pow(1 - age, 2.4);
      const size = point.size * (1.5 - 0.72 * age);
      output.fillStyle = point.glint ? '#fff6e8' : color;
      output.globalAlpha = point.brightness * Math.pow(1 - age, 0.9);
      output.fillRect(point.x + point.dx * travel, point.y + point.dy * travel + 9 * age * age, size, size);
    }
    output.globalAlpha = 1;
  }

  function finish(active) {
    if (selection !== active || active.navigating) return;
    active.navigating = true;
    clearTimeout(active.backup);
    cancelAnimationFrame(active.frame);
    window.InvariantExamEntry?.prepareArrival(active.link);
    location.assign(active.link.href);
  }

  function animate(active, now) {
    if (selection !== active) return;
    try {
      const elapsed = now - active.started;
      if (elapsed >= duration) {
        finish(active);
        return;
      }
      if (elapsed >= releaseStart) {
        if (!active.mask) {
          active.mask = prepare(active.link);
          if (!active.mask) {
            finish(active);
            return;
          }
          const {canvas, output, width, height, scale} = active.mask;
          canvas.width = Math.ceil(width * scale);
          canvas.height = Math.ceil(height * scale);
          output.setTransform(scale, 0, 0, scale, 0, 0);
          canvas.hidden = false;
          active.link.classList.add('is-dispersing');
        }
        paint(active.mask, elapsed);
      }
      active.frame = requestAnimationFrame(time => animate(active, time));
    } catch {
      finish(active);
    }
  }

  function reset() {
    if (!selection) return;
    clearTimeout(selection.backup);
    cancelAnimationFrame(selection.frame);
    delete document.documentElement.dataset.entryDeparting;
    selection.link.classList.remove('is-choosing', 'is-dispersing');
    selection.link.querySelector('.particles').hidden = true;
    selection = undefined;
  }

  function warmMasks() {
    masks.clear();
    if (selection || reducedMotion.matches) return;
    for (const link of examLinks) {
      try { prepare(link); } catch { /* The anchors still work if canvas is unavailable. */ }
    }
  }

  for (const link of examLinks) {
    const shine = link.querySelector('.exam-shine');
    let sweep;
    let highlighted = false;

    function updateShine() {
      if (typeof shine.animate !== 'function') return;
      const shouldHighlight = !selection && !reducedMotion.matches &&
        (link.matches(':focus-visible') || (hoverCapable.matches && link.matches(':hover')));
      if (shouldHighlight === highlighted) return;
      highlighted = shouldHighlight;
      if (highlighted) {
        sweep?.cancel();
        sweep = shine.animate([
          {opacity: 1, backgroundPositionX: '100%'},
          {opacity: 1, backgroundPositionX: '0%'},
        ], {duration: 550, id: 'shine'});
      } else if (sweep?.playState === 'running') {
        const {backgroundPositionX} = getComputedStyle(shine);
        sweep.cancel();
        sweep = shine.animate([
          {opacity: 1, backgroundPositionX},
          {opacity: 0, backgroundPositionX},
        ], {duration: 150, easing: 'cubic-bezier(0.23, 1, 0.32, 1)'});
      }
    }

    for (const eventName of ['pointerenter', 'pointerleave', 'focus', 'blur']) {
      link.addEventListener(eventName, updateShine);
    }

    link.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
          event.shiftKey || event.altKey || (link.target && link.target !== '_self') ||
          link.hasAttribute('download')) return;
      if (selection) {
        event.preventDefault();
        return;
      }
      if (reducedMotion.matches) {
        selection = {link};
        return;
      }
      event.preventDefault();
      const active = {link, started: performance.now()};
      selection = active;
      window.InvariantExamEntry?.remember(link);
      document.documentElement.dataset.entryDeparting = '';
      active.backup = setTimeout(() => finish(active), 750);
      updateShine();
      link.classList.add('is-choosing');
      active.frame = requestAnimationFrame(time => animate(active, time));
    });
  }

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(warmMasks);
    for (const link of examLinks) observer.observe(link.querySelector('.exam-sign'));
  }
  document.fonts?.ready.then(warmMasks);
  document.fonts?.addEventListener('loadingdone', warmMasks);
  reducedMotion.addEventListener('change', () => {
    if (selection && reducedMotion.matches) finish(selection);
  });
  addEventListener('pagehide', () => {
    if (!selection) return;
    clearTimeout(selection.backup);
    cancelAnimationFrame(selection.frame);
  });
  addEventListener('pageshow', event => {
    if (event.persisted) reset();
  });
})();
