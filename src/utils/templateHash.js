/**
 * Template hash utilities — delegates to the governance kernel.
 *
 * The canonical SHA-256 and stable stringify implementations now
 * live in the kernel. This module re-exports for backward compatibility.
 */

export { sha256HexFromString, stableHashObject, stableStringify as stableCanonicalJson } from "../kernel/hash.js";
