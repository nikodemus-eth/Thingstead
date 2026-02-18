import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Traps focus within a container while active.
 * Restores focus to the previously focused element when the trap is removed.
 *
 * @param {React.RefObject} containerRef - ref attached to the trapping container
 * @param {boolean} active - whether the trap is currently active (default: true)
 */
export function useFocusTrap(containerRef, active = true) {
  const previousFocus = useRef(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    previousFocus.current = document.activeElement;

    const container = containerRef.current;
    const focusable = container.querySelectorAll(FOCUSABLE);
    if (focusable.length > 0) focusable[0].focus();

    const handleKeyDown = (e) => {
      if (e.key !== "Tab") return;
      const nodes = container.querySelectorAll(FOCUSABLE);
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      if (previousFocus.current instanceof HTMLElement) {
        previousFocus.current.focus();
      }
    };
  }, [containerRef, active]);
}
