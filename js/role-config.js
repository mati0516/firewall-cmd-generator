// Web / SSH ロール定義
const ROLE_DEFINITION = {
  web: {
    labelKey: "role_web",
    allowlist: true,
    services: {
      http: {
        labelKey: "service_http",
        defaultEnabled: false,
        defaultPort: "80"
      },
      https: {
        labelKey: "service_https",
        defaultEnabled: true,
        defaultPort: "443"
      }
    }
  },
  ssh: {
    labelKey: "role_ssh",
    allowlist: true,
    services: {
      ssh: {
        labelKey: "service_ssh",
        defaultEnabled: true,
        defaultPort: "22"
      }
    }
  }
};

window.ROLE_DEFINITION = ROLE_DEFINITION;
