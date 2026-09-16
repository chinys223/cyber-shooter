export function stepFlight(body, dt, homeX) {
  const next = { ...body };
  let remaining = Math.min(Math.max(dt, 0), 0.1);
  while (remaining > 0) {
    const step = Math.min(remaining, 1 / 120);
    next.vx += ((homeX - next.x) * 7 - next.vx * 3) * step;
    next.vy -= 9.8 * step;
    next.x += next.vx * step;
    next.y += next.vy * step;
    if (next.y < 0) {
      next.y = 0;
      next.vy = Math.abs(next.vy) > 0.8 ? -next.vy * 0.38 : 0;
    }
    if (next.y > 2.5) { next.y = 2.5; next.vy = Math.min(0, next.vy); }
    next.x = Math.max(-2.1, Math.min(2.1, next.x));
    remaining -= step;
  }
  return next;
}
