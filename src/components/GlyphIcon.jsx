import { useEffect, useRef } from "react";
import { glyphRegistry } from "../icons/glyphRegistry.js";
import styles from "./GlyphIcon.module.css";

export default function GlyphIcon({
  name,
  size = 16,
  label,
  className = "",
  title,
}) {
  const hostRef = useRef(null);
  const markup = glyphRegistry[name];

  const ariaProps = label
    ? { role: "img", "aria-label": label }
    : { "aria-hidden": true };

  useEffect(() => {
    if (!markup) return;
    const host = hostRef.current;
    if (!host) return;

    const svg = host.querySelector("svg");
    if (!svg) return;

    // Safari/WebKit can sometimes ignore inherited presentation attributes when SVG is injected
    // via innerHTML. Normalize common stroke-only glyph defaults without clobbering explicitly
    // filled elements (those include a fill attribute or inline style).
    const shapeSelector =
      "path,rect,circle,ellipse,line,polyline,polygon";
    const shapes = svg.querySelectorAll(shapeSelector);
    for (const el of shapes) {
      const style = el.getAttribute("style") || "";
      const hasFillAttr = el.hasAttribute("fill");
      const hasInlineFill = /(^|;)\\s*fill\\s*:/.test(style);
      if (!hasFillAttr && !hasInlineFill) {
        el.setAttribute("fill", "none");
      }

      const hasStrokeAttr = el.hasAttribute("stroke");
      const hasInlineStroke = /(^|;)\\s*stroke\\s*:/.test(style);
      if (!hasStrokeAttr && !hasInlineStroke) {
        el.setAttribute("stroke", "currentColor");
      }

      if (!el.hasAttribute("stroke-width")) el.setAttribute("stroke-width", "2");
      if (!el.hasAttribute("stroke-linecap")) el.setAttribute("stroke-linecap", "round");
      if (!el.hasAttribute("stroke-linejoin")) el.setAttribute("stroke-linejoin", "round");
    }
  }, [name, markup]);

  if (!markup) return null;

  return (
    <span
      ref={hostRef}
      {...ariaProps}
      title={title || label || undefined}
      className={`${styles.glyph} ${className}`.trim()}
      style={{ "--glyph-size": `${size}px` }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
