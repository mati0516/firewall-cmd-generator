(function () {
  function mergeAllowed(existing, extra) {
    if (!window.parserUtils) return [];
    return window.parserUtils.uniqueList([...(existing || []), ...(extra || [])]);
  }

  function parseFirewall(text) {
    const safeText = String(text || "");
    const servicesInfo = typeof window.parseServices === "function" ? window.parseServices(safeText) : { https: false, ssh: false, list: [] };
    const portsInfo = typeof window.parsePorts === "function" ? window.parsePorts(safeText) : [];
    const richInfo = typeof window.parseRichRules === "function" ? window.parseRichRules(safeText) : { services: {}, ports: {} };
    const zone = window.parserUtils ? window.parserUtils.detectZone(safeText) : null;

    let httpsIpv4Allowed = mergeAllowed(richInfo.services?.https?.allowedIPv4, []);
    let httpsIpv6Allowed = mergeAllowed(richInfo.services?.https?.allowedIPv6, []);
    let sshAllowedIPs = window.parserUtils
      ? window.parserUtils.uniqueList(richInfo.services?.ssh?.allowedIPv4 || [])
      : (richInfo.services?.ssh?.allowedIPv4 || []);

    let httpsIpv4Enabled =
      !!servicesInfo.https ||
      httpsIpv4Allowed.length > 0 ||
      !!richInfo.services?.https?.dropIPv4;
    let httpsIpv6Enabled = httpsIpv6Allowed.length > 0 || !!richInfo.services?.https?.dropIPv6;
    let sshEnabled = !!servicesInfo.ssh || sshAllowedIPs.length > 0;

    const customPortsMap = new Map();
    const basePorts = portsInfo || [];

    const isHttpsPort = (port) => port === 443;
    const isSshPort = (port) => port === 22;

    function ensureCustomPort(port, protocol) {
      const key = `${port}/${protocol}`;
      if (!customPortsMap.has(key)) {
        customPortsMap.set(key, { port, protocol, allowedIPs: [] });
      }
      return customPortsMap.get(key);
    }

    basePorts.forEach(({ port, protocol }) => {
      if (port === 80) return;
      if (isHttpsPort(port)) {
        httpsIpv4Enabled = true;
        return;
      }
      if (isSshPort(port)) {
        sshEnabled = true;
        return;
      }
      ensureCustomPort(port, protocol);
    });

    Object.entries(richInfo.ports || {}).forEach(([key, rule]) => {
      const match = key.match(/^(\d+)\/(tcp|udp)$/i);
      if (!match) return;
      const port = parseInt(match[1], 10);
      const protocol = match[2].toLowerCase();
      const allowed4 = rule.allowedIPv4 || [];
      if (port === 80) return;

      if (isHttpsPort(port)) {
        httpsIpv4Enabled = true;
        httpsIpv4Allowed = mergeAllowed(httpsIpv4Allowed, allowed4);
        if (rule.allowedIPv6 && rule.allowedIPv6.length) {
          httpsIpv6Enabled = true;
          httpsIpv6Allowed = mergeAllowed(httpsIpv6Allowed, rule.allowedIPv6 || []);
        }
        return;
      }
      if (isSshPort(port)) {
        sshEnabled = true;
        sshAllowedIPs = mergeAllowed(sshAllowedIPs, allowed4);
        return;
      }

      const target = ensureCustomPort(port, protocol);
      target.allowedIPs = mergeAllowed(target.allowedIPs, allowed4);
    });

    const customPorts = Array.from(customPortsMap.values());

    return {
      zone,
      httpsIpv4: {
        enabled: httpsIpv4Enabled,
        allowed: window.parserUtils ? window.parserUtils.uniqueList(httpsIpv4Allowed) : httpsIpv4Allowed
      },
      httpsIpv6: {
        enabled: httpsIpv6Enabled,
        allowed: window.parserUtils ? window.parserUtils.uniqueList(httpsIpv6Allowed) : httpsIpv6Allowed
      },
      ssh: {
        enabled: sshEnabled,
        allowedIPs: window.parserUtils ? window.parserUtils.uniqueList(sshAllowedIPs) : sshAllowedIPs
      },
      customPorts
    };
  }

  window.parseFirewall = parseFirewall;
})();
