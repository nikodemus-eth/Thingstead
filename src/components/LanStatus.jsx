import { useEffect, useState } from "react";
import GlyphIcon from "./GlyphIcon.jsx";
import styles from "../App.module.css";

const POLL_INTERVAL_MS = 10_000;

export default function LanStatus() {
  const [status, setStatus] = useState("unknown"); // "connected" | "disconnected" | "unknown"

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch("/api/health", { method: "GET" });
        if (!cancelled) setStatus(res.ok ? "connected" : "disconnected");
      } catch {
        if (!cancelled) setStatus("disconnected");
      }
    };

    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const icon = status === "connected" ? "check" : "warning";
  const label =
    status === "connected"
      ? "LAN sync connected"
      : "LAN sync disconnected (local only)";

  return (
    <span className={styles.lanStatus} title={label} aria-label={label}>
      <GlyphIcon name={icon} size={12} label={label} />
    </span>
  );
}
