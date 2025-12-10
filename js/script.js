document.addEventListener("DOMContentLoaded", () => {
  const zoneTabs = document.querySelectorAll(".zone-tab");
  const zoneInput = document.getElementById("zoneInput");

  const pasteArea = document.getElementById("pasteArea");
  const parseBtn = document.getElementById("parseBtn");
  const clearPasteBtn = document.getElementById("clearPasteBtn");
  const importStatus = document.getElementById("importStatus");

  const permanentCheckbox = document.getElementById("permanent");
  const reloadCheckbox = document.getElementById("reload");
  const ipv6Checkbox = document.getElementById("ipv6");

  const rolesContainer = document.getElementById("rolesContainer");
  const customPortsTextarea = document.getElementById("customPorts");

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
      const prefersDark = window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
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
      zoneTabs.forEach((tab) =>
        tab.classList.toggle("active", tab.dataset.zone === "public")
      );
    }
    zoneInput.value = zone;
  }

  zoneTabs.forEach((tab) => {
    tab.addEventListener("click", () => selectZoneTab(tab.dataset.zone));
  });

  /* ================================
     ロール UI 生成
  =================================*/
  function buildRolesUI() {
    rolesContainer.innerHTML = "";

    Object.entries(ROLE_DEFINITION).forEach(([roleKey, roleDef]) => {
      const box = document.createElement("div");
      box.className = "role-box";
      box.dataset.role = roleKey;

      const title = document.createElement("div");
      title.className = "role-title";
      title.dataset.i18n = roleDef.labelKey;
      title.textContent = roleDef.labelKey;
      box.appendChild(title);

      const hint = document.createElement("div");
      hint.className = "role-port-hint";
      hint.dataset.i18n = "role_port_hint";
      hint.textContent = "ポート番号は必要に応じて変更できます。";
      box.appendChild(hint);

      const servicesWrapper = document.createElement("div");
      servicesWrapper.className = "role-services";

      Object.entries(roleDef.services).forEach(([srvKey, srv]) => {
        const row = document.createElement("div");
        row.className = "role-service";
        row.dataset.role = roleKey;
        row.dataset.service = srvKey;

        const label = document.createElement("label");
        label.className = "service-label";

        const chk = document.createElement("input");
        chk.type = "checkbox";
        chk.checked = srv.defaultEnabled;
        chk.dataset.role = roleKey;
        chk.dataset.service = srvKey;

        const span = document.createElement("span");
        span.dataset.i18n = srv.labelKey;
        span.textContent = srv.labelKey;

        label.appendChild(chk);
        label.appendChild(span);

        const portInput = document.createElement("input");
        portInput.type = "text";
        portInput.value = srv.defaultPort;
        portInput.dataset.role = roleKey;
        portInput.dataset.service = srvKey;

        row.appendChild(label);
        row.appendChild(portInput);
        servicesWrapper.appendChild(row);

        function updateRowActive() {
          row.classList.toggle("active", chk.checked);
        }
        updateRowActive();
        chk.addEventListener("change", updateRowActive);

        label.addEventListener("click", (e) => {
          e.preventDefault(); // ← label が勝手に checkbox を操作するのを止める
        });

        row.addEventListener("click", (e) => {
          const chk = row.querySelector('input[type="checkbox"]');
          const portInput = row.querySelector('input[type="text"]');

          // ① ポート入力欄をクリックしたときは何もしない
          if (e.target === portInput) return;

          // ② チェックボックスを直接押したときはブラウザの動作に任せる
          if (e.target === chk) return;

          // ③ それ以外（行・ラベル・サービス名など）のクリックで切り替え
          chk.checked = !chk.checked;

          // ④ 見た目更新
          row.classList.toggle("active", chk.checked);
        });

      });

      box.appendChild(servicesWrapper);

      if (roleDef.allowlist) {
        const allowBlock = document.createElement("div");
        allowBlock.className = "allowlist-block";

        const lbl = document.createElement("div");
        lbl.className = "allowlist-label";
        lbl.dataset.i18n = "allowlist_label";
        lbl.textContent = "この IP だけ許可（複数行）";

        const ta = document.createElement("textarea");
        ta.className = "allowlist-textarea";
        ta.id = `allowlist-${roleKey}`;
        ta.dataset.i18nPlaceholder = "allowlist_placeholder";
        ta.placeholder = "例:\n  203.0.113.10\n  198.51.100.0/24";

        allowBlock.appendChild(lbl);
        allowBlock.appendChild(ta);
        box.appendChild(allowBlock);
      }

      rolesContainer.appendChild(box);
    });

    if (window.applyTranslations) window.applyTranslations();
  }

  buildRolesUI();

  /* ================================
     設定読み込み
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

  function parseFirewallListAll(text) {
    const zoneMatch = text.match(/^(\S+)\s*\(active\)/m);
    const zone = zoneMatch ? zoneMatch[1] : null;
    return { zone };
  }

  parseBtn.addEventListener("click", () => {
    const raw = pasteArea.value.trim();
    if (!raw) return;

    if (!confirm("解析すると現在の UI に反映されます。よかですか？")) return;

    const state = parseFirewallListAll(raw);
    if (state.zone) {
      selectZoneTab(state.zone);
      importStatus.textContent = `${state.zone} ゾーンを検出しました。`;
    } else {
      importStatus.textContent = "ゾーンを検出できませんでした。";
    }
  });

  /* ================================
     UI → 設定オブジェクト
  =================================*/
  function splitLines(text) {
    return String(text || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l);
  }

  function collectConfigFromUI() {
    const config = {
      zone: zoneInput.value,
      options: {
        permanent: permanentCheckbox.checked,
        reload: reloadCheckbox.checked,
        ipv6: ipv6Checkbox.checked
      },
      roles: {},
      customPorts: splitLines(customPortsTextarea.value)
    };

    Object.entries(ROLE_DEFINITION).forEach(([roleKey, roleDef]) => {
      const roleCfg = { services: {}, allowlist: [] };

      Object.keys(roleDef.services).forEach((srvKey) => {
        const row = document.querySelector(
          `.role-service[data-role="${roleKey}"][data-service="${srvKey}"]`
        );
        const chk = row.querySelector('input[type="checkbox"]');
        const port = row.querySelector('input[type="text"]');

        roleCfg.services[srvKey] = {
          enabled: chk.checked,
          port: port.value.trim()
        };
      });

      if (roleDef.allowlist) {
        const ta = document.getElementById(`allowlist-${roleKey}`);
        roleCfg.allowlist = splitLines(ta.value);
      }

      config.roles[roleKey] = roleCfg;
    });

    return config;
  }

  /* ================================
     コマンド生成
  =================================*/
  function generateCommands(cfg) {
    const base = ["firewall-cmd"];
    if (cfg.options.permanent) base.push("--permanent");
    base.push(`--zone=${cfg.zone}`);

    const cmds = [];

    if (cfg.options.ipv6) {
      cmds.push("# IPv6 を利用する前提です");
    }

    function addPort(port) {
      const np = normalizePort(port);
      if (np) cmds.push(`${base.join(" ")} --add-port=${np}`);
    }

    function addRich(roleCfg) {
      if (!roleCfg.allowlist.length) return;

      Object.values(roleCfg.services).forEach((srv) => {
        if (!srv.enabled) return;

        const np = normalizePort(srv.port);
        if (!np) return;
        const [port, proto] = np.split("/");

        roleCfg.allowlist.forEach((addr) => {
          const rule = `rule family="ipv4" source address="${addr}" port port="${port}" protocol="${proto}" accept`;
          cmds.push(`${base.join(" ")} --add-rich-rule='${rule}'`);
        });
      });
    }

    Object.values(cfg.roles).forEach((r) => {
      if (r.allowlist.length) {
        addRich(r);
      } else {
        Object.values(r.services).forEach((srv) => {
          if (srv.enabled) addPort(srv.port);
        });
      }
    });

    cfg.customPorts.forEach(addPort);

    if (cfg.options.reload) cmds.push("firewall-cmd --reload");

    return cmds.join("\n");
  }

  generateBtn.addEventListener("click", () => {
    outputTextarea.value = generateCommands(collectConfigFromUI());
  });

  /* ================================
     コピー
  =================================*/
  copyBtn.addEventListener("click", () => {
    if (!outputTextarea.value) return;
    navigator.clipboard.writeText(outputTextarea.value);
    alert("コピーしました！");
  });

  /* ================================
     全部リセット
  =================================*/
  clearAllBtn.addEventListener("click", () => {
    if (!confirm("初期状態に戻しますか？")) return;

    selectZoneTab("public");
    permanentCheckbox.checked = true;
    reloadCheckbox.checked = true;
    ipv6Checkbox.checked = false;

    buildRolesUI();
    customPortsTextarea.value = "";
    outputTextarea.value = "";
  });

  /* ================================
     ダウンロード処理
  =================================*/
  function downloadConfig(cfg, filename) {
    const blob = new Blob([JSON.stringify(cfg, null, 2)], {
      type: "application/json"
    });
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

  // ❗既存イベント削除のためクローンして置換
  downloadBtn.replaceWith(downloadBtn.cloneNode(true));
  const fixedDownloadBtn = document.getElementById("downloadBtn");

  fixedDownloadBtn.addEventListener("click", () => {
    openDownloadModal();
  });

  /* ================================
     アップロード
  =================================*/
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
        uploadStatus.textContent = "設定を読み込みました。";
      } catch {
        uploadStatus.textContent = "読み込みに失敗しました。";
      }
    };
    reader.readAsText(file, "utf-8");
  });

  function applyConfigToUI(cfg) {
    if (cfg.zone) selectZoneTab(cfg.zone);

    permanentCheckbox.checked = !!cfg.options?.permanent;
    reloadCheckbox.checked = !!cfg.options?.reload;
    ipv6Checkbox.checked = !!cfg.options?.ipv6;

    Object.entries(ROLE_DEFINITION).forEach(([roleKey, roleDef]) => {
      const roleCfg = cfg.roles?.[roleKey];

      Object.entries(roleDef.services).forEach(([srvKey, srv]) => {
        const row = document.querySelector(
          `.role-service[data-role="${roleKey}"][data-service="${srvKey}"]`
        );

        const chk = row.querySelector('input[type="checkbox"]');
        const port = row.querySelector('input[type="text"]');
        const saved = roleCfg?.services?.[srvKey];

        chk.checked = saved ? saved.enabled : srv.defaultEnabled;
        port.value = saved ? saved.port : srv.defaultPort;

        row.classList.toggle("active", chk.checked);
      });

      if (roleDef.allowlist) {
        const ta = document.getElementById(`allowlist-${roleKey}`);
        if (ta && roleCfg?.allowlist) {
          ta.value = roleCfg.allowlist.join("\n");
        }
      }
    });

    customPortsTextarea.value = (cfg.customPorts || []).join("\n");

    if (window.applyTranslations) window.applyTranslations();
  }
});
