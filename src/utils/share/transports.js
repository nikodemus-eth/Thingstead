function hasClipboardApi() {
  return Boolean(navigator?.clipboard?.writeText);
}

function canExecCommandCopy() {
  return (
    typeof document !== "undefined" &&
    typeof document.queryCommandSupported === "function" &&
    document.queryCommandSupported("copy")
  );
}

function buildFile({ jsonString, filename }) {
  return new File([jsonString], filename, { type: "application/json" });
}

export const webShareFileTransport = {
  id: "web-share",
  label: "Share via device",
  isSupported() {
    if (typeof navigator === "undefined") return false;
    if (typeof navigator.share !== "function") return false;
    // Do not hard-require canShare(): some browsers implement navigator.share but not file sharing.
    return true;
  },
  async run({ jsonString, filename }) {
    // Prefer sharing a file when supported; otherwise fall back to sharing text.
    const file = buildFile({ jsonString, filename });
    const canShareFiles =
      typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });

    const url = typeof location !== "undefined" ? location.href : undefined;

    if (canShareFiles) {
      await navigator.share({
        files: [file],
        title: "Thingstead Project",
        text: "Thingstead project export bundle.",
        url,
      });
      return;
    }

    // Text share fallback: size guard to avoid hanging share sheets.
    const MAX_TEXT_SHARE_CHARS = 50_000;
    if (jsonString.length > MAX_TEXT_SHARE_CHARS) {
      throw new Error("Export bundle is too large for Web Share text. Use Download JSON instead.");
    }

    await navigator.share({
      title: "Thingstead Project",
      text: jsonString,
      url,
    });
  },
};

export const downloadJsonTransport = {
  id: "download-json",
  label: "Download JSON",
  isSupported() {
    return true;
  },
  async run({ jsonString, filename }) {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};

export const clipboardJsonTransport = {
  id: "clipboard-json",
  label: "Copy JSON to clipboard",
  isSupported() {
    return hasClipboardApi() || canExecCommandCopy();
  },
  async run({ jsonString }) {
    if (hasClipboardApi()) {
      await navigator.clipboard.writeText(jsonString);
      return;
    }

    // Fallback for older contexts.
    const textarea = document.createElement("textarea");
    textarea.value = jsonString;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    if (!ok) throw new Error("Copy to clipboard failed.");
  },
};

export const shareTransports = Object.freeze([
  webShareFileTransport,
  downloadJsonTransport,
  clipboardJsonTransport,
]);
