function normalizePort(p) {
  if (!p) return null;
  p = String(p).trim();
  if (!p) return null;

  if (p.includes("/tcp") || p.includes("/udp")) {
    return p;
  }
  return p + "/tcp";
}

window.normalizePort = normalizePort;
