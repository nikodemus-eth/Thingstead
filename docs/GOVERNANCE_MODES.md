# Governance Modes

Thingstead supports two governance modes that reflect how decisions are made within an AI/ML project team. The mode is set at project creation and shapes attestation requirements throughout the project lifecycle.

---

## 1. Overview

| Attribute | Solo (`"solo"`) | Team (`"team"`) |
|-----------|----------------|-----------------|
| **Intent** | Single practitioner owning all decisions | Multiple stakeholders sharing accountability |
| **Attestation type** | `"solo_attestation"` | `"team_decision"` |
| **Decision notes minimum** | >= 30 non-whitespace characters | None |
| **Template set profile** | `"minimum-compliance"` | `"standard"` |
| **Badge label** | "Single-Actor Governance" | "Team Governance" |
| **Default at creation** | No | Yes |

---

## 2. Setting Governance Mode

Governance mode is selected once at project creation via the **CreateModal**. It is stored in `project.governance_mode`.

```js
buildNewCpmaiProject(name, deviceId, governanceMode)
// governanceMode: "solo" | "team"  (default: "team")
```

The mode is **not changeable after creation** without a manual data migration. This is intentional: changing governance mid-project would invalidate prior attestations and their audit trail.

---

## 3. Effect on Template Set Profile

`project.template_set_profile` records which artifact template set was active at creation:

| Mode | Profile | Meaning |
|------|---------|---------|
| `"solo"` | `"minimum-compliance"` | Fewer required conditional artifacts |
| `"team"` | `"standard"` | Full complement of conditional artifacts |

This profile is recorded for auditability and future rule-engine enforcement. It does not currently restrict which artifacts are displayed in the UI.

---

## 4. Effect on Go/No-Go Attestation

When recording a phase gate decision, attestation requirements differ by mode.

### Solo mode (`"solo_attestation"`)

Decision notes are **mandatory** and must contain at least **30 non-whitespace characters**. This creates a meaningful written self-attestation that the practitioner has personally verified the phase criteria.

```js
// Validation logic in src/components/PhaseDetail.jsx:
function isValidSoloAttestation(notes) {
  const normalized = notes.trim().replace(/\s+/g, "");
  return normalized.length >= 30;
}
```

If violated: _"Solo mode requires attestation notes (minimum 30 non-whitespace characters)."_

### Team mode (`"team_decision"`)

No minimum notes requirement. A decision may be recorded with empty notes. The assumption is that team governance relies on external process (meetings, sign-offs, recorded votes) rather than requiring the tool to capture the full rationale inline.

---

## 5. Effect on GoNoGo Decision Shape

`goNoGoDecision.attestation_type` is set from the project's governance mode at creation and carried into every phase:

```jsonc
// Solo project
{
  "status": "pending",
  "decidedAt": null,
  "notes": "",
  "attestation_type": "solo_attestation"
}

// Team project
{
  "status": "pending",
  "decidedAt": null,
  "notes": "",
  "attestation_type": "team_decision"
}
```

---

## 6. Display in UI

- The **header badge** in `App.jsx` shows: **"Single-Actor Governance"** or **"Team Governance"**.
- The **Go/No-Go decision panel** in `PhaseDetail.jsx` adapts its validation and error messaging based on `project.governance_mode`.
- The **CreateModal** presents both modes with descriptive labels and icons during project setup.

---

## 7. Rationale for Two Modes

**Solo mode** targets individual ML practitioners who are the sole decision-maker on a project. The mandatory attestation note creates a lightweight, durable audit trail — proof that the practitioner intentionally approved each phase gate rather than clicking through automatically.

**Team mode** targets multi-stakeholder projects (data scientists, product owners, legal/compliance, leadership sign-off). Here the tool tracks *that* a decision was made and *when*; the richer decision record (meeting minutes, sign-off emails, Jira tickets) lives in external systems. Imposing a character minimum would add friction without proportional auditability gain.
