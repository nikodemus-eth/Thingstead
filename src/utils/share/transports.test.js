import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  clipboardJsonTransport,
  downloadJsonTransport,
  webShareFileTransport,
} from "./transports.js";

describe("share transports", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("downloadJsonTransport creates a JSON blob and triggers a download click", async () => {
    if (!URL.createObjectURL) {
      Object.defineProperty(URL, "createObjectURL", {
        value: () => "blob:mock",
        configurable: true,
      });
    }
    if (!URL.revokeObjectURL) {
      Object.defineProperty(URL, "revokeObjectURL", {
        value: () => {},
        configurable: true,
      });
    }

    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const click = vi.fn();
    const appendChild = vi.spyOn(document.body, "appendChild").mockImplementation(() => {});
    const remove = vi.fn();
    vi.spyOn(document, "createElement").mockReturnValue({
      href: "",
      download: "",
      click,
      remove,
    });

    await downloadJsonTransport.run({ jsonString: "{\n}", filename: "x.json" });

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock");
    appendChild.mockRestore();
  });

  it("clipboardJsonTransport uses navigator.clipboard when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    await clipboardJsonTransport.run({ jsonString: "hello" });
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("webShareFileTransport feature-detects file share support", () => {
    Object.defineProperty(navigator, "share", { value: () => {}, configurable: true });
    expect(webShareFileTransport.isSupported()).toBe(true);
  });

  it("webShareFileTransport falls back to sharing text when file sharing is unavailable", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true });

    await webShareFileTransport.run({ jsonString: "{\"a\":1}", filename: "x.json" });
    expect(share).toHaveBeenCalledTimes(1);
    expect(share.mock.calls[0][0]).toMatchObject({ title: "Thingstead Project" });
  });
});
