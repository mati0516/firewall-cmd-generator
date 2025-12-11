(function () {
  function toLines(text) {
    return String(text || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  function uniqueList(items) {
    return Array.from(
      new Set(
        (items || [])
          .map((item) => (item === undefined || item === null ? "" : String(item).trim()))
          .filter((item) => item.length > 0)
      )
    );
  }

  function isIPv4(text) {
    const trimmed = String(text || "").trim();
    return /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(trimmed);
  }

  function detectZone(text) {
    const lines = String(text || "").split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i].trim();
      if (!line) continue;

      const match = line.match(/^(\S+)\s*\((active|default)\)/i);
      if (match) return match[1];
    }
    return null;
  }

  window.parserUtils = {
    toLines,
    uniqueList,
    isIPv4,
    detectZone
  };
})();
