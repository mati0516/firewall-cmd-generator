(function () {
  function uniqueList(items) {
    return Array.from(
      new Set(
        (items || [])
          .map((item) => (item === undefined || item === null ? "" : String(item).trim()))
          .filter((item) => item.length > 0)
      )
    );
  }

  function toList(value) {
    return Array.isArray(value) ? value : [];
  }

  function buildBaseCommand(zone, permanent) {
    const parts = ["firewall-cmd"];
    if (permanent) parts.push("--permanent");
    if (zone) parts.push(`--zone=${zone}`);
    return parts.join(" ");
  }

  function buildDropRules(base, ruleBuilder) {
    return [`${base} --add-rich-rule='${ruleBuilder("ipv4")}'`];
  }

  function buildServiceCommands(base, serviceName, allowedIPs, families, options = {}) {
    const cleanedIPs = uniqueList(allowedIPs);
    const targetFamilies = Array.isArray(families) && families.length ? families : ["ipv4"];
    const alwaysDrop = !!options.alwaysDrop;
    const commands = [];

    targetFamilies.forEach((family) => {
      if (!cleanedIPs.length) {
        if (alwaysDrop) {
          commands.push(`${base} --add-rich-rule='rule family="${family}" service name="${serviceName}" drop'`);
        } else {
          commands.push(`${base} --add-service=${serviceName}`);
        }
        return;
      }

      cleanedIPs.forEach((ip) => {
        const rule = `rule family="${family}" source address="${ip}" service name="${serviceName}" accept`;
        commands.push(`${base} --add-rich-rule='${rule}'`);
      });
      commands.push(`${base} --add-rich-rule='rule family="${family}" service name="${serviceName}" drop'`);
    });

    return commands;
  }

  function buildPortCommands(base, port, protocol, allowedIPs) {
    const portNumber = parseInt(port, 10);
    if (!Number.isFinite(portNumber) || portNumber <= 0) return [];
    const proto = protocol === "udp" ? "udp" : "tcp";
    const cleanedIPs = uniqueList(allowedIPs);

    if (!cleanedIPs.length) {
      return [`${base} --add-port=${portNumber}/${proto}`];
    }

    const commands = cleanedIPs.map(
      (ip) =>
        `${base} --add-rich-rule='rule family="ipv4" source address="${ip}" port port="${portNumber}" protocol="${proto}" accept'`
    );

    commands.push(
      `${base} --add-rich-rule='rule family="ipv4" port port="${portNumber}" protocol="${proto}" drop'`
    );

    return commands;
  }

  function normalizeFirewallModel(model = {}) {
    if (model.httpsIpv4 || model.httpsIpv6) return model;

    const web = model.web || {};
    const https = web.https || {};

    return {
      httpsIpv4: {
        enabled: https.enabled !== undefined ? !!https.enabled : !!web.enabled,
        allowed: toList(https.allowed || https.allowedIPs || web.allowedIPs)
      },
      httpsIpv6: {
        enabled: !!https.ipv6Enabled,
        allowed: toList(https.allowedIPv6 || https.allowed || https.allowedIPs)
      },
      ssh: model.ssh || {},
      customPorts: model.customPorts || []
    };
  }

  function generateFirewallCommands(model, options = {}) {
    const zone = options.zone || "public";
    const permanent = !!options.permanent;
    const reload = !!options.reload;

    const base = buildBaseCommand(zone, permanent);
    const commands = [];

    const normalizedModel = normalizeFirewallModel(model || {});
    const httpsIpv4Model = normalizedModel.httpsIpv4 || { enabled: false, allowed: [] };
    const httpsIpv6Model = normalizedModel.httpsIpv6 || { enabled: false, allowed: [] };
    const sshModel = normalizedModel.ssh || { enabled: false, allowedIPs: [] };
    const customPorts = Array.isArray(normalizedModel.customPorts) ? normalizedModel.customPorts : [];
    const httpsIpv4Allowed = uniqueList(toList(httpsIpv4Model.allowed || httpsIpv4Model.allowedIPs));
    const httpsIpv6Allowed = uniqueList(toList(httpsIpv6Model.allowed || httpsIpv6Model.allowedIPs));

    if (httpsIpv4Model.enabled) {
      commands.push(
        ...buildServiceCommands(base, "https", httpsIpv4Allowed, ["ipv4"], {
          alwaysDrop: true
        })
      );
    }

    if (httpsIpv6Model.enabled) {
      if (!httpsIpv6Allowed.length) {
        commands.push(`${base} --add-rich-rule='rule family="ipv6" service name="https" accept'`);
      } else {
        httpsIpv6Allowed.forEach((ip) => {
          const rule = `rule family="ipv6" source address="${ip}" service name="https" accept`;
          commands.push(`${base} --add-rich-rule='${rule}'`);
        });
        commands.push(`${base} --add-rich-rule='rule family="ipv6" service name="https" drop'`);
      }
    }

    if (sshModel.enabled) {
      commands.push(...buildServiceCommands(base, "ssh", sshModel.allowedIPs, ["ipv4"]));
    }

    customPorts.forEach((entry) => {
      commands.push(...buildPortCommands(base, entry.port, entry.protocol, entry.allowedIPs));
    });

    if (reload) commands.push("firewall-cmd --reload");

    return commands.filter((cmd) => cmd && cmd.trim().length > 0).join("\n");
  }

  window.generateFirewallCommands = generateFirewallCommands;
})();
