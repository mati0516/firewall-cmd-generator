(function () {
  function parseServices(text) {
    const lines = window.parserUtils ? window.parserUtils.toLines(text) : [];
    const services = [];

    lines.forEach((line) => {
      if (!line.startsWith("services:")) return;
      const body = line.slice("services:".length).trim();
      if (!body) return;
      body.split(/\s+/).forEach((item) => {
        if (item === "http") return;
        services.push(item);
      });
    });

    const serviceSet = new Set(services);

    return {
      list: Array.from(serviceSet),
      https: serviceSet.has("https"),
      ssh: serviceSet.has("ssh")
    };
  }

  window.parseServices = parseServices;
})();
