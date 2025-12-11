document.addEventListener("DOMContentLoaded", () => {
  const translate = (key, fallback = "", vars = {}) =>
    (window.t ? window.t(key, fallback, vars) : fallback || key);

  const zoneTabs = document.querySelectorAll(".zone-tab");
  const zoneInput = document.getElementById("zoneInput");

  const pasteArea = document.getElementById("pasteArea");
  const parseBtn = document.getElementById("parseBtn");
  const clearPasteBtn = document.getElementById("clearPasteBtn");
  const importStatus = document.getElementById("importStatus");

  const permanentCheckbox = document.getElementById("permanent");
  const reloadCheckbox = document.getElementById("reload");

  const httpsIpv4EnabledCheckbox = document.getElementById("httpsIpv4Enabled");
  const httpsIpv4AllowedIPsTextarea = document.getElementById("httpsIpv4AllowedIPs");
  const httpsIpv6EnabledCheckbox = document.getElementById("httpsIpv6Enabled");
  const httpsIpv6AllowedIPsTextarea = document.getElementById("httpsIpv6AllowedIPs");
  const sshEnabledCheckbox = document.getElementById("sshEnabled");
  const sshAllowedIPsTextarea = document.getElementById("sshAllowedIPs");
  const customPortsList = document.getElementById("customPortsList");
  const addCustomPortBtn = document.getElementById("addCustomPortBtn");

  const outputTextarea = document.getElementById("output");
  const generateBtn = document.getElementById("generateBtn");
  const copyBtn = document.getElementById("copyBtn");
  const clearAllBtn = document.getElementById("clearAllBtn");

  const downloadBtn = document.getElementById("downloadBtn");
  const uploadBtn = document.getElementById("uploadBtn");
  const uploadInput = document.getElementById("uploadInput");
  const uploadFileName = document.getElementById("uploadFileName");
  const uploadStatus = document.getElementById("uploadStatus");

  const modal = document.getElementById("downloadModal");
  const modalFilename = document.getElementById("downloadFilename");
  const modalCancel = document.getElementById("modalCancel");
  const modalSave = document.getElementById("modalSave");

  const themeToggle = document.getElementById("themeToggle");

  /* ================================
      テーマ
  =================================*/
  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    themeToggle.textContent = theme === "dark" ? "☀" : "🌙";
  }

  function initTheme() {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
    }
  }

  themeToggle.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    setTheme(cur === "dark" ? "light" : "dark");
  });

  initTheme();

  /* ================================
      ゾーンタブ
  =================================*/
  function selectZoneTab(zone) {
    let hit = false;
    zoneTabs.forEach((tab) => {
      if (tab.dataset.zone === zone) {
        tab.classList.add("active");
        hit = true;
      } else {
        tab.classList.remove("active");
      }
    });

    if (!hit) {
      zone = "public";
      zoneTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.zone === "public"));
    }
    zoneInput.value = zone;
  }

  zoneTabs.forEach((tab) => {
    tab.addEventListener("click", () => selectZoneTab(tab.dataset.zone));
  });

  /* ================================
      共通ヘルパー
  =================================*/
  function splitLines(text) {
    return String(text || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l);
  }

  function createCustomPortRow(data = {}) {
    const row = document.createElement("div");
    row.className = "custom-port-row";

    const grid = document.createElement("div");
    grid.className = "custom-port-grid";

    const portWrap = document.createElement("label");
    portWrap.textContent = "Port";
    const portInput = document.createElement("input");
    portInput.type = "number";
    portInput.min = "1";
    portInput.max = "65535";
    portInput.value = data.port || "";
    portInput.className = "custom-port-port";
    portWrap.appendChild(portInput);

    const protoWrap = document.createElement("label");
    protoWrap.textContent = "Protocol";
    const protoSelect = document.createElement("select");
    protoSelect.className = "custom-port-protocol";
    ["tcp", "udp"].forEach((opt) => {
      const o = document.createElement("option");
      o.value = opt;
      o.textContent = opt;
      protoSelect.appendChild(o);
    });
    protoSelect.value = data.protocol === "udp" ? "udp" : "tcp";
    protoWrap.appendChild(protoSelect);

    grid.appendChild(portWrap);
    grid.appendChild(protoWrap);

    const ips = document.createElement("textarea");
    ips.className = "custom-port-ips";
    ips.placeholder = "203.0.113.10\n198.51.100.0/24";
    ips.value = (data.allowedIPs || []).join("\n");

    const actions = document.createElement("div");
    actions.className = "custom-port-actions";
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn-secondary remove-port-btn";
    removeBtn.setAttribute("data-i18n", "remove");
    removeBtn.textContent = translate("remove", "削除");
    removeBtn.addEventListener("click", () => {
      row.remove();
    });
    actions.appendChild(removeBtn);

    row.appendChild(grid);
    row.appendChild(ips);
    row.appendChild(actions);

    return row;
  }

  function addCustomPortRow(data = {}) {
    const row = createCustomPortRow(data);
    customPortsList.appendChild(row);
    return row;
  }

  function renderCustomPorts(list) {
    customPortsList.innerHTML = "";
    if (Array.isArray(list) && list.length > 0) {
      list.forEach((item) => addCustomPortRow(item));
    } else {
      addCustomPortRow();
    }
  }

  addCustomPortBtn.addEventListener("click", () => addCustomPortRow());

  /* ================================
      貼り付けエリア
  =================================*/
  pasteArea.addEventListener("input", () => {
    parseBtn.disabled = pasteArea.value.trim().length === 0;
    importStatus.textContent = "";
  });

  clearPasteBtn.addEventListener("click", () => {
    pasteArea.value = "";
    parseBtn.disabled = true;
    importStatus.textContent = "";
  });

  /* ================================
      UI 反映 / 収集
  =================================*/
  function applyFirewallModelToUI(model) {
    if (!model) return;

    if (model.httpsIpv4) {
      httpsIpv4EnabledCheckbox.checked = !!model.httpsIpv4.enabled;
      const allowed4 = Array.isArray(model.httpsIpv4.allowed) ? model.httpsIpv4.allowed : model.httpsIpv4.allowedIPs || [];
      httpsIpv4AllowedIPsTextarea.value = allowed4.join("\n");
    }

    if (model.httpsIpv6) {
      httpsIpv6EnabledCheckbox.checked = !!model.httpsIpv6.enabled;
      const allowed6 = Array.isArray(model.httpsIpv6.allowed) ? model.httpsIpv6.allowed : model.httpsIpv6.allowedIPs || [];
      httpsIpv6AllowedIPsTextarea.value = allowed6.join("\n");
    }

    if (model.ssh) {
      sshEnabledCheckbox.checked = !!model.ssh.enabled;
      sshAllowedIPsTextarea.value = (model.ssh.allowedIPs || []).join("\n");
    }

    renderCustomPorts(model.customPorts || []);
  }

  function collectFirewallModelFromUI() {
    return {
      httpsIpv4: {
        enabled: !!httpsIpv4EnabledCheckbox.checked,
        allowed: splitLines(httpsIpv4AllowedIPsTextarea.value)
      },
      httpsIpv6: {
        enabled: !!httpsIpv6EnabledCheckbox.checked,
        allowed: splitLines(httpsIpv6AllowedIPsTextarea.value)
      },
      ssh: {
        enabled: !!sshEnabledCheckbox.checked,
        allowedIPs: splitLines(sshAllowedIPsTextarea.value)
      },
      customPorts: Array.from(customPortsList.querySelectorAll(".custom-port-row")).map((row) => {
        const portInput = row.querySelector(".custom-port-port");
        const protoSelect = row.querySelector(".custom-port-protocol");
        const ipsTextarea = row.querySelector(".custom-port-ips");

        const port = parseInt(portInput?.value, 10);
        const protocol = protoSelect?.value === "udp" ? "udp" : "tcp";
        const allowedIPs = splitLines(ipsTextarea?.value || "");

        if (!Number.isFinite(port) || port <= 0) return null;
        return { port, protocol, allowedIPs };
      }).filter(Boolean)
    };
  }

  function legacyToModel(cfg) {
    const source = cfg && cfg.firewall ? cfg.firewall : cfg;
    const alreadyNewShape = source?.httpsIpv4 || source?.httpsIpv6;

    const toArray = (val) => (Array.isArray(val) ? val : []);
    if (alreadyNewShape) {
      return {
        httpsIpv4: {
          enabled: !!source.httpsIpv4?.enabled,
          allowed: toArray(source.httpsIpv4?.allowed || source.httpsIpv4?.allowedIPs)
        },
        httpsIpv6: {
          enabled: !!source.httpsIpv6?.enabled,
          allowed: toArray(source.httpsIpv6?.allowed || source.httpsIpv6?.allowedIPs)
        },
        ssh: {
          enabled: !!source.ssh?.enabled,
          allowedIPs: toArray(source.ssh?.allowedIPs)
        },
        customPorts: Array.isArray(source.customPorts) ? source.customPorts : []
      };
    }

    const legacyCustomPorts = Array.isArray(source?.customPorts) ? source.customPorts : [];
    const toPort = (token) => {
      const normalized = typeof window.normalizePort === "function" ? window.normalizePort(token) : String(token);
      const m = normalized.match(/^(\d+)(?:\/(tcp|udp))$/i);
      if (!m) return null;
      return { port: parseInt(m[1], 10), protocol: m[2].toLowerCase(), allowedIPs: [] };
    };

    const webRole = source?.roles?.web;
    const sshRole = source?.roles?.ssh;
    const flatWeb = source?.web;
    const flatSsh = source?.ssh;
    const nestedWeb = flatWeb && (flatWeb.http || flatWeb.https) ? flatWeb : null;

    const httpsAllowedFromNested = toArray(nestedWeb?.https?.allowed || nestedWeb?.https?.allowedIPs);
    const httpsAllowedFromFlat = Array.isArray(flatWeb?.allowedIPs) ? flatWeb.allowedIPs : [];
    const httpsAllowlistFromRole = Array.isArray(webRole?.allowlist) ? webRole.allowlist : [];
    const httpsAllowedIpv6FromNested = toArray(
      nestedWeb?.https?.allowedIPv6 || nestedWeb?.https?.allowed || nestedWeb?.https?.allowedIPs
    );
    const httpsAllowedIpv6FromFlat = Array.isArray(flatWeb?.allowedIPv6) ? flatWeb.allowedIPv6 : [];

    const resolvedHttpsAllowed =
      toArray(httpsAllowedFromNested).length > 0
        ? toArray(httpsAllowedFromNested)
        : toArray(httpsAllowedFromFlat).length > 0
          ? toArray(httpsAllowedFromFlat)
          : toArray(httpsAllowlistFromRole);

    const resolvedIpv6Allowed =
      httpsAllowedIpv6FromNested.length > 0
        ? httpsAllowedIpv6FromNested
        : httpsAllowedIpv6FromFlat;

    const resolvedIpv6Enabled =
      !!(nestedWeb?.https?.ipv6Enabled || flatWeb?.ipv6Enabled) || resolvedIpv6Allowed.length > 0;
    const resolvedHttpsEnabled =
      nestedWeb?.https?.enabled !== undefined
        ? !!nestedWeb.https.enabled
        : flatWeb?.enabled !== undefined
          ? !!flatWeb.enabled
          : !!(webRole?.services?.https?.enabled);

    return {
      httpsIpv4: {
        enabled: resolvedHttpsEnabled,
        allowed: resolvedHttpsAllowed
      },
      httpsIpv6: {
        enabled: resolvedIpv6Enabled,
        allowed: resolvedIpv6Allowed
      },
      ssh: {
        enabled: flatSsh?.enabled !== undefined ? !!flatSsh.enabled : !!(sshRole?.services?.ssh?.enabled),
        allowedIPs: Array.isArray(flatSsh?.allowedIPs)
          ? flatSsh.allowedIPs
          : Array.isArray(sshRole?.allowlist)
            ? sshRole.allowlist
            : []
      },
      customPorts: legacyCustomPorts.map(toPort).filter(Boolean)
    };
  }

  function collectConfigFromUI() {
    return {
      zone: zoneInput.value,
      options: {
        permanent: permanentCheckbox.checked,
        reload: reloadCheckbox.checked
      },
      firewall: collectFirewallModelFromUI()
    };
  }

  function applyConfigToUI(cfg) {
    if (!cfg) return;
    if (cfg.zone) selectZoneTab(cfg.zone);

    permanentCheckbox.checked = !!cfg.options?.permanent;
    reloadCheckbox.checked = !!cfg.options?.reload;

    if (cfg.firewall || cfg.roles || cfg.customPorts || cfg.web || cfg.httpsIpv4 || cfg.httpsIpv6) {
      const model = legacyToModel(cfg);
      applyFirewallModelToUI(model);
    }

    if (window.applyTranslations) window.applyTranslations();
  }

  /* ================================
      解析ボタン
  =================================*/
  parseBtn.addEventListener("click", () => {
    const raw = pasteArea.value.trim();
    if (!raw) return;

    if (!confirm(translate("parse_confirm", "解析すると現在の UI に反映されます。よろしいですか？"))) {
      return;
    }

    if (typeof window.parseFirewall !== "function") {
      importStatus.textContent = translate("import_failure", "パーサーが読み込めませんでした。");
      return;
    }

    const parsed = window.parseFirewall(raw);
    applyFirewallModelToUI(parsed);
    if (parsed.zone) selectZoneTab(parsed.zone);

    if (parsed) {
      const zoneName = parsed.zone || zoneInput.value || "public";
      importStatus.textContent = translate("import_success", `${zoneName} の設定を反映しました`, {
        zone: zoneName
      });
    } else {
      importStatus.textContent = translate("import_failure", "解析に失敗しました。");
    }
  });

  /* ================================
      生成 / 操作
  =================================*/
  function generateCommands(cfg) {
    if (typeof window.generateFirewallCommands !== "function") return "";
    return window.generateFirewallCommands(cfg.firewall, {
      zone: cfg.zone,
      permanent: cfg.options.permanent,
      reload: cfg.options.reload
    });
  }

  generateBtn.addEventListener("click", () => {
    outputTextarea.value = generateCommands(collectConfigFromUI());
  });

  copyBtn.addEventListener("click", () => {
    if (!outputTextarea.value) return;
    navigator.clipboard.writeText(outputTextarea.value);
    alert(translate("copy_success", "コピーしました。"));
  });

  clearAllBtn.addEventListener("click", () => {
    if (!confirm(translate("reset_confirm", "初期状態に戻しますか？"))) return;

    selectZoneTab("public");
    permanentCheckbox.checked = true;
    reloadCheckbox.checked = true;
    httpsIpv4EnabledCheckbox.checked = true;
    httpsIpv4AllowedIPsTextarea.value = "";
    httpsIpv6EnabledCheckbox.checked = false;
    httpsIpv6AllowedIPsTextarea.value = "";
    sshEnabledCheckbox.checked = true;
    sshAllowedIPsTextarea.value = "";
    renderCustomPorts([]);

    outputTextarea.value = "";
  });

  /* ================================
      ダウンロード / アップロード
  =================================*/
  function downloadConfig(cfg, filename) {
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  function openDownloadModal() {
    modal.classList.remove("hidden");
    modalFilename.value = "my-firewall.json";
    modalFilename.focus();
  }

  function closeDownloadModal() {
    modal.classList.add("hidden");
  }

  modalCancel.addEventListener("click", closeDownloadModal);

  modalSave.addEventListener("click", () => {
    const cfg = collectConfigFromUI();
    const filename = modalFilename.value.trim() || "my-firewall.json";
    downloadConfig(cfg, filename);
    closeDownloadModal();
  });

  modalFilename.addEventListener("keydown", (e) => {
    if (e.key === "Enter") modalSave.click();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      closeDownloadModal();
    }
  });

  downloadBtn.addEventListener("click", () => {
    openDownloadModal();
  });

  uploadBtn.addEventListener("click", () => uploadInput.click());

  uploadInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    uploadFileName.textContent = file.name;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const cfg = JSON.parse(ev.target.result);
        applyConfigToUI(cfg);
        uploadStatus.textContent = translate("upload_success", "設定を読み込みました。");
      } catch {
        uploadStatus.textContent = translate("upload_failure", "読み込みに失敗しました。");
      }
    };
    reader.readAsText(file, "utf-8");
  });

  /* ================================
      初期化
  =================================*/
  httpsIpv4EnabledCheckbox.checked = true;
  httpsIpv6EnabledCheckbox.checked = false;
  sshEnabledCheckbox.checked = true;
  renderCustomPorts([]);

  if (window.applyTranslations) window.applyTranslations();
});
