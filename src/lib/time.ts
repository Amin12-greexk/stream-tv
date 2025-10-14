export function nowLocal() {
  return new Date();
}

export function timeToMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function minutesNow() {
  const d = nowLocal();
  return d.getHours() * 60 + d.getMinutes();
}

export function dowNow() {
  return nowLocal().getDay(); // 0=Sun ... 6=Sat
}
