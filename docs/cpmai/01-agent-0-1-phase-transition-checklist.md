---
id: cpmai-agent-0-1
name: CPMAI Agent 0.1
artifact_type: Checklist
phase: all
status: template
---

# CPMAI Agent 0.1: CPMAI Phase Transition Checklist

## Workbook Fields
"
"- Project Name: [TBD]
"
"- Owner: [TBD]
"
"- Date Created: [YYYY-MM-DD]
"
"- Last Updated: [YYYY-MM-DD]
"
"- Version: [0.1]
"
"- Status: [Draft/In Review/Approved]
"
"- Related Agents: [List IDs]
"
"
"
"## Usage
"
"Use this document as a structured worksheet. Fill in the tables and prompts, and keep the workbook fields updated as decisions change.
"


This checklist provides the "exit criteria" for each phase of the AI lifecycle. It ensures that the project maintains the CPMAI hierarchy, moving logically from general objectives to specialized records and results.

## Phase I -> Phase II: Business to Data
- [ ] Go/No-Go Approval: All nine feasibility factors (Business, Data, and Execution) have been marked as "Go" or have a documented mitigation plan.
- [ ] Pattern Confirmed: The project has been mapped to one of the Seven Patterns of AI to guide tool and algorithm selection.
- [ ] Success Defined: Objective business success criteria (e.g., specific ROI or KPI targets) are documented and approved by stakeholders.

## Phase II -> Phase III: Understanding to Preparation
- [ ] Data Inventory Complete: All required datasets (structured, semi-structured, and unstructured) have been located and accessed.
- [ ] Quality Baseline Established: A Data Quality Report has identified specific errors, missing values, and "noise" that require cleaning.
- [ ] Sufficiency Verified: Initial exploration confirms the data quantity is sufficient for training, validation, and testing purposes.

## Phase III -> Phase IV: Preparation to Development
- [ ] Clean Dataset Produced: Data pipelines have successfully deduplicated, normalized, and anonymized the raw data.
- [ ] Labeling Validated: If using supervised learning, data labels have been verified for accuracy and consistency.
- [ ] Transformation Complete: Unstructured text or raw values have been converted into machine-readable formats suitable for the selected modeling technique.

## Phase IV -> Phase V: Development to Evaluation
- [ ] Model Generated: At least one model or model ensemble has been produced by the modeling tool.
- [ ] Overfitting Checked: Model fit has been measured against separate training, validation, and test datasets to ensure generalizability.
- [ ] Hyperparameters Optimized: Final settings have been chosen and documented based on systematic grid search or AutoML results.

## Phase V -> Phase VI: Evaluation to Operationalization
- [ ] KPI Match: The model's technical performance (Accuracy, F1, ROC) aligns with the business requirements set in Phase I.
- [ ] Stakeholder Sign-off: Business owners have reviewed the Evaluation Scorecard and approved the model for production.
- [ ] Governance Ready: An owner has been identified for the model, and a framework for monitoring bias and ethics is in place.

## Summary of Artifact Mapping
| Transition | Logic Trigger | Required Output |
| --- | --- | --- |
| I to II | Is the problem clearly defined and feasible? | CPMAI Agent 1 & 2 |
| II to III | Is the data relevant and accessible? | CPMAI Agent 3 |
| III to IV | Is the data formatted and labeled for a model? | CPMAI Agent 4 |
| IV to V | Is the model trained and optimized? | CPMAI Agent 5 |
| V to VI | Does the model meet the business ROI? | CPMAI Agent 6 |
| Complete | Is the model governed and monitored? | CPMAI Agent 7 |
