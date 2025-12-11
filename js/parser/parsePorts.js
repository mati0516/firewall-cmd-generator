(function () {
  function parsePorts(text) {
    const lines = window.parserUtils ? window.parserUtils.toLines(text) : [];
    const map = new Map();

    lines.forEach((line) => {
      if (!line.startsWith("ports:")) return;
      const body = line.slice("ports:".length).trim();
      if (!body) return;

      body.split(/\s+/).forEach((token) => {
        const match = token.match(/^(\d+)(?:\/(tcp|udp))?$/i);
        if (!match) return;
        const port = parseInt(match[1], 10);
        if (!Number.isFinite(port)) return;
        const protocol = (match[2] || "tcp").toLowerCase();
        const key = `${port}/${protocol}`;
        map.set(key, { port, protocol });
      });
    });

    return Array.from(map.values());
  }

  window.parsePorts = parsePorts;
})();
