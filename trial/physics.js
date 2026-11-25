export function motion(t, x0, v0, a) {
  return {x: x0 + v0 * t + a * t ** 2 / 2, v: v0 + a * t, a};
}

export function route(t, segments) {
  let distance = 0;
  let x = segments[0].from;
  for (const {from, to, duration} of segments) {
    const part = Math.min(1, Math.max(0, t / duration));
    x = from + (to - from) * part;
    distance += Math.abs(to - from) * part;
    if (part < 1) break;
    t -= duration;
  }
  return {x, distance, displacement: x - segments[0].from};
}

export function fall(t, h, g, vx) {
  const duration = Math.sqrt(2 * h / g);
  const time = Math.min(t, duration);
  return {duration, x: vx * time, y: Math.max(0, h - g * time ** 2 / 2), vy: -g * time, speed: Math.hypot(vx, g * time)};
}

export function incline(t, {m, H, L, g, Ff}) {
  const a = Math.max(0, g * H / L - Ff / m);
  const duration = a ? Math.sqrt(2 * L / a) : 5;
  const time = Math.min(t, duration);
  const s = Math.min(L, a * time ** 2 / 2);
  const h = H * (1 - s / L);
  const v = a * time;
  return {duration, a, s, h, v, ep: m * g * h, ek: m * v ** 2 / 2, thermal: Ff * s, total: m * g * H};
}

export function staticContact({m, g, fx, fy, mus, muk}) {
  const normal = m * g - fy;
  const friction = fx <= mus * normal ? fx : muk * normal;
  return {normal, friction, a: (fx - friction) / m};
}

export function circuit({U, r = 0, Rseries = 0, Rbranch1, Rbranch2, closed = true, branchSwitch = false}) {
  const active = branchSwitch || closed;
  const branch2On = Boolean(Rbranch2 && closed);
  const equivalent = branch2On ? 1 / (1 / Rbranch1 + 1 / Rbranch2) : Rbranch1;
  const current = active ? U / (r + Rseries + equivalent) : 0;
  const voltage = current * equivalent;
  return {current, voltage, i1: voltage / Rbranch1, i2: branch2On ? voltage / Rbranch2 : 0};
}
