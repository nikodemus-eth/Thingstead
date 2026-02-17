

---

# **CPMAI Project Tracker**

## **Technical Architecture and Implementation Contract**

**Version:** 0.3  
**Last Updated:** 2026-01-26  
**Status:** Architecture Finalized. Ready for Implementation.

---

## **1\. Purpose and Intent**

Build a **single-user, local-first CPMAI project tracking application** that enables structured management of AI project artifacts across the **six PMI-CPMAI phases**, with optional supplemental PMP and Agile artifacts.

This application is:

* Deterministic  
* Offline-capable  
* Explicitly human-mediated for sync  
* Designed to minimize hidden complexity

This document is the **authoritative architectural contract** for Cursor and Claude Pro sessions. Generated code must conform to the constraints and decisions defined here.

---

## **2\. Primary User**

**Nick (developer)**

* Single user  
* Full local data control  
* Two devices: laptop and Mac Mini  
* Cross-device sync via **manual JSON export/import using Google Drive**

No other user personas are in scope.

---

## **3\. Scope Boundaries**

### **In Scope**

* CPMAI 6-phase artifact tracking  
* Go / No-Go decision gates per phase  
* Supplemental PMP and Agile artifacts  
* Local data persistence  
* Manual export/import for cross-device sync  
* Undo/redo via snapshot history

### **Explicitly Out of Scope**

* Multi-user collaboration  
* Authentication or identity  
* Real-time sync  
* Cloud backend  
* Mobile applications  
* Automatic conflict resolution  
* AI-generated content  
* External integrations (Jira, Drive API, etc.)

---

## **4\. Core Architectural Principles**

1. **Local-First Sovereignty**  
   * Data lives locally by default  
   * Export is explicit  
   * Import is user-confirmed  
2. **Human-Mediated Sync**  
   * No background sync  
   * No merge logic  
   * No distributed systems  
3. **Transparency Over Automation**  
   * All persistence is visible and explainable  
   * No silent overwrites  
4. **Constraint-Driven Design**  
   * Exactly six CPMAI phases  
   * Artifact names immutable  
   * Gate logic deterministic

---

## **5\. Technology Stack**

### **Core Technologies**

* **Framework:** React 18+  
* **Language:** JavaScript (ES2022), JSX  
* **Build Tool:** Vite  
* **Styling:** CSS Modules  
* **State Management:** React Context \+ `useReducer`  
* **Testing:** Vitest \+ React Testing Library

No Redux. No MobX. No Tailwind. No backend.

---

## **6\. Canonical Storage Architecture**

### **Storage Strategy (Final)**

**Per-project storage keys. No global blob.**

#### **Keys**

* `cpmai-project-index`  
* `cpmai-project-{projectId}`  
* `cpmai-settings`

### **`cpmai-project-index`**

{  
  "currentProjectId": "uuid",  
  "projects": {  
    "uuid": {  
      "id": "uuid",  
      "name": "string",  
      "lastModified": "ISO8601",  
      "lastSavedFrom": "laptop | macmini"  
    }  
  }  
}

### **`cpmai-project-{projectId}`**

{  
  "current": Project,  
  "history": Project\[\],  
  "historyIndex": number  
}

### **`cpmai-settings`**

{  
  "deviceId": "laptop | macmini",  
  "autoSaveDelayMs": 2000,  
  "theme": "light | dark"  
}

---

## **7\. Auto-Save and Undo/Redo Contract**

### **Auto-Save**

* Debounced at **2000 ms**  
* Saves only when state is dirty  
* Wrapped in try/catch  
* Disabled if quota exceeded

### **History Semantics**

* **Snapshot-based undo/redo**  
* History entries created **only on successful auto-save**  
* Maximum **5 snapshots per project**  
* New changes clear forward history

Undo/redo does **not** operate at keystroke granularity.

---

## **8\. Import / Export Contract**

### **Export**

* User-initiated only  
* Produces prettified JSON  
* Filename: `{projectName}-{timestamp}.json`

### **Import Validation**

* Schema version match or migrate  
* Exactly 6 phases  
* Required fields present  
* Timestamp validity  
* Artifact immutability enforced

### **Import Collision Policy**

If a project with the same `id` exists locally:

* Prompt user:  
  * Overwrite local project  
  * Keep both (new UUID assigned)  
  * Cancel import

No silent overwrite is permitted.

---

## **9\. Data Model (Canonical)**

### **Project**

{  
  schemaVersion: 1,  
  id: "uuid",  
  name: "string",  
  description: "string",  
  created: "ISO8601",  
  lastModified: "ISO8601",  
  lastSavedFrom: "laptop | macmini",  
  phases: Phase\[\]  
}

### **Phase**

{  
  id: 1-6,  
  name: "string",  
  goNoGoDecision: {  
    status: "pending | go | no-go",  
    decidedAt: "ISO8601 | null",  
    notes: "string"  
  },  
  artifacts: Artifact\[\]  
}

### **Artifact**

{  
  id: "uuid",  
  name: "string",  
  category: "core | conditional | supplemental",  
  isGateBlocking: boolean,  
  status: "not-started | in-progress | in-review | complete | not-required",  
  rationale: "string",  
  notes: "string",  
  lastModified: "ISO8601"  
}

Artifact names are immutable.

---

## **10\. Validation Rules**

* Project name: 1–200 chars, trimmed  
* Rationale:  
  * Required when `status = not-required`  
  * Minimum 20 non-whitespace characters  
* Phase count: exactly 6  
* All timestamps stored as UTC ISO8601  
* Markdown rendering sanitized (no raw HTML)

---

## **11\. Go / No-Go Gate Rules**

### **Gate Availability**

A gate becomes **Ready** when all artifacts where `isGateBlocking = true` are either:

* `complete`, or  
* `not-required` with valid rationale

### **Gate States**

* **Locked:** Blocking artifacts incomplete  
* **Ready:** Decision available  
* **Decided:** Go or No-Go recorded

### **Gate Reversibility**

* Decisions can be edited  
* Editing clears decision and returns to Ready

### **Phase Independence**

* Phases may be worked in any order  
* A warning banner appears if:  
  * A later phase is edited while an earlier phase is No-Go  
* Warning is dismissible and non-blocking

---

## **12\. CPMAI Template Source of Truth**

All CPMAI artifact definitions live in:

src/data/cpmai-template.json

The application:

* Loads this template at project creation  
* Never hardcodes artifact lists in UI components

This file is authoritative for:

* Artifact names  
* Categories  
* Gate-blocking flags

---

## **13\. Error Handling Strategy**

### **localStorage Failures**

* Quota exceeded:  
  * Disable auto-save  
  * Show persistent warning  
  * Prompt export  
* Storage unavailable:  
  * Disable auto-save  
  * Require manual export

### **Import Failures**

* Invalid JSON  
* Schema mismatch  
* Validation errors

All errors surface via UI feedback. No silent failures.

---

## **14\. Development Order (Mandatory)**

1. Data schema and validation  
2. CPMAI template JSON  
3. Storage wrapper  
4. Schema migration  
5. State reducer  
6. Auto-save \+ history  
7. Import/export  
8. UI components  
9. Gate logic  
10. Cross-browser testing

---

## **15\. Anti-Patterns (Hard Constraints)**

* No Redux or MobX  
* No implicit persistence  
* No silent overwrites  
* No magic numbers  
* No inline styles  
* No unsanitized markdown  
* No dynamic phase or artifact creation

---

## **16\. Success Criteria**

* Data survives refresh  
* Undo/redo behaves predictably  
* Gate logic enforces constraints  
* Import never overwrites silently  
* Export produces valid JSON  
* No data loss paths identified

---

## **17\. Final Declaration**

All critical architectural decisions are complete.  
No blocking unknowns remain.

This document is the **single source of truth** for implementation and future Cursor or Claude Pro sessions.

### **High Priority**

1. **Dashboard customization**: How granular? Drag-and-drop widgets or predefined layouts?

Drag-and-drop widgets, which means each user profile is going to need those stored as preferences.

2. **Notification system**: Email alerts for gate decisions? In-app only?

In app only, but leave a *stub* saying “Email Function goes here”, so it’s a cleaner add-on later.

3. **Markdown editor**: Simple textarea or rich editor (with preview)?

Rich editor with preview.

4. **Version diffs**: Show markdown diffs between versions? (Complex but valuable)

Yes. 

### **Medium Priority**

5. **Export formats**: JSON only or also PDF reports per dashboard?

Both

6. **Artifact templates**: Pre-fill markdown templates for each artifact type?

Yes,

7. **Search**: Full-text search across artifact content?

Yes

8. **Comments**: Allow stakeholders to comment on artifacts (read-only users)?

Yes.  PM or Stakeholder can “clear” them.

### **Low Priority**

9. **Real-time updates**: WebSocket for live dashboard updates when others edit?

Yes.

10. **Mobile app**: Responsive web sufficient or native app needed?

Responsive web

11. **Integration**: Webhook support for external system notifications?

Yes

