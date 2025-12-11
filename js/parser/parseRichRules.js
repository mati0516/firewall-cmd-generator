(function () {
  function ensureTarget(map, key) {
    if (!map[key]) {
      map[key] = {
        allowedIPv4: [],
        allowedIPv6: [],
        dropIPv4: false,
        dropIPv6: false
      };
    }
    return map[key];
  }

  function parseRichRules(text) {
    const lines = window.parserUtils ? window.parserUtils.toLines(text) : [];
    const services = {};
    const ports = {};

    lines.forEach((line) => {
      if (!line.startsWith("rule ")) return;

      const sourceMatch = line.match(/source address="([^"]+)"/);
      const serviceMatch = line.match(/service name="([^"]+)"/);
      const portMatch = line.match(/port port="(\d+)" protocol="(tcp|udp)"/i);
      const actionMatch = line.match(/\b(accept|drop|reject)\b/i);
      const action = actionMatch ? actionMatch[1].toLowerCase() : null;
      const familyMatch = line.match(/family="(ipv4|ipv6)"/i);
      const family = familyMatch ? familyMatch[1].toLowerCase() : "ipv4";

      if (serviceMatch) {
        if (serviceMatch[1] === "http") return;
        const target = ensureTarget(services, serviceMatch[1]);
        if (sourceMatch && action === "accept") {
          if (family === "ipv4") target.allowedIPv4.push(sourceMatch[1]);
          if (family === "ipv6") target.allowedIPv6.push(sourceMatch[1]);
        } else if (!sourceMatch && action === "drop") {
          if (family === "ipv4") target.dropIPv4 = true;
          if (family === "ipv6") target.dropIPv6 = true;
        }
      } else if (portMatch) {
        const port = parseInt(portMatch[1], 10);
        if (!Number.isFinite(port)) return;
        const protocol = portMatch[2].toLowerCase();
        const key = `${port}/${protocol}`;
        const target = ensureTarget(ports, key);

        if (sourceMatch && action === "accept") {
          if (family === "ipv4") target.allowedIPv4.push(sourceMatch[1]);
          if (family === "ipv6") target.allowedIPv6.push(sourceMatch[1]);
        } else if (!sourceMatch && action === "drop") {
          if (family === "ipv4") target.dropIPv4 = true;
          if (family === "ipv6") target.dropIPv6 = true;
        }
      }
    });

    if (window.parserUtils) {
      Object.values(services).forEach((item) => {
        item.allowedIPv4 = window.parserUtils.uniqueList(
          (item.allowedIPv4 || []).filter((ip) => window.parserUtils.isIPv4(ip))
        );
        item.allowedIPv6 = window.parserUtils.uniqueList(item.allowedIPv6 || []);
      });

      Object.values(ports).forEach((item) => {
        item.allowedIPv4 = window.parserUtils.uniqueList(
          (item.allowedIPv4 || []).filter((ip) => window.parserUtils.isIPv4(ip))
        );
        item.allowedIPv6 = window.parserUtils.uniqueList(item.allowedIPv6 || []);
      });
    }

    return { services, ports };
  }

  window.parseRichRules = parseRichRules;
})();
