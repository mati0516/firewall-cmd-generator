# firewall-cmd-generator

A lightweight interactive generator for `firewall-cmd` rules.  
Designed to create clean HTTPS/SSH rules and custom ports with minimal steps.

🔗 Live Demo  
https://mati0516.github.io/firewall-cmd-generator/

---

## Features
- HTTPS (IPv4 / IPv6) allowlist configuration  
- SSH allowlist (IPv4)  
- Custom port rules with protocol + optional IP restrictions  
- Auto-generated rich-rules  
- Import from `firewall-cmd --list-all`  
- JSON export / import  
- Dark mode  
- Full multilingual UI

---

## Experimental
An early-stage rule analysis module is included.

---

## Development
Open `index.html` directly or serve locally:

```bash
npx serve .
