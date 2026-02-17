import add from "./glyphs/add.svg?raw";
import artifact from "./glyphs/artifact.svg?raw";
import audit from "./glyphs/audit.svg?raw";
import check from "./glyphs/check.svg?raw";
import conflict from "./glyphs/conflict.svg?raw";
import direct from "./glyphs/direct.svg?raw";
import exportGlyph from "./glyphs/export.svg?raw";
import field from "./glyphs/field.svg?raw";
import flag from "./glyphs/flag.svg?raw";
import gate from "./glyphs/gate.svg?raw";
import guided from "./glyphs/guided.svg?raw";
import immutable from "./glyphs/immutable.svg?raw";
import lock from "./glyphs/lock.svg?raw";
import modify from "./glyphs/modify.svg?raw";
import pending from "./glyphs/pending.svg?raw";
import phase from "./glyphs/phase.svg?raw";
import project from "./glyphs/project.svg?raw";
import remove from "./glyphs/remove.svg?raw";
import report from "./glyphs/report.svg?raw";
import review from "./glyphs/review.svg?raw";
import template from "./glyphs/template.svg?raw";
import waiver from "./glyphs/waiver.svg?raw";
import warning from "./glyphs/warning.svg?raw";
import x from "./glyphs/x.svg?raw";

export const glyphRegistry = {
  phase,
  gate,
  artifact,
  field,
  template,
  project,
  check,
  x,
  warning,
  pending,
  lock,
  waiver,
  conflict,
  add,
  remove,
  modify,
  review,
  flag,
  audit,
  immutable,
  guided,
  direct,
  report,
  export: exportGlyph,
};

export const glyphNames = Object.freeze(Object.keys(glyphRegistry));
