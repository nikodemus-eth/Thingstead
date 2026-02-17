---
id: cpmai-red-flag-diagnostic
name: Red Flag Diagnostic
artifact_type: Diagnostic
phase: all
status: template
---

# Red Flag Diagnostic for AI Go/No-Go

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


## I. Business Feasibility Red Flags
These indicators suggest that even a perfect technical model may fail to provide organizational value.
- Vague Success Metrics: If the success criteria are purely subjective such as "give useful insights" without a designated judge or objective baseline, the project lacks a clear finish line.
- Misalignment with Non-AI Alternatives: If a simple "heuristic" or rule-based approach can achieve "good enough" results for significantly less cost and complexity, the cognitive approach is likely unnecessary.
- Lack of Production Commitment: If you cannot obtain a verbal or written commitment from the business owner to put the solution into production, the project is a "No-Go".
- ROI Implausibility: If the projected annual savings or impact do not clearly offset the implementation and cloud infrastructure costs within a reasonable timeframe (typically 12 to 24 months), the project is financially unfeasible.

## II. Data Feasibility Red Flags
Data is the primary dependency for any CPMAI project; these flags indicate a weak foundation.
- Measurement Mismatch: If the available data does not actually measure the attributes you care about or align with your business objectives, it cannot be used to create a valid model.
- Access Barriers: If the IT team cannot provide direct, authenticated access to necessary repositories (e.g., CRM tables or chat logs), execution is impossible.
- Irremediable Data Quality: While some "noise" is expected, if data errors are so common or formats are so inconsistent that standard cleansing cannot fix them, the model will be inherently unreliable.
- Quantity Deficit: If the available data volume is insufficient to split into robust training, validation, and test sets, the model risks severe overfitting.

## III. Technology & Execution Red Flags
These flags identify gaps in the practical ability to deliver and maintain the solution.
- "Maybe" Skills Gap: If you have internal AI knowledge but lack the budget approval to hire external consultants for necessary expertise, the project is a "Maybe" (yellow light) and should not proceed to Phase II until funded.
- Infrastructure Constraints: If the resultant model will not fit within the technical constraints of where it must be used (e.g., edge devices with limited connectivity), it cannot be successfully operationalized.
- Integration Deadlocks: If the chatbot must interface with existing order management or CRM systems, but there are no well-documented APIs or secure webhooks available, the project will fail during operationalization.
- Unclear Failure Handling: If there is no plan for how the system will handle failure modes or situations where the model provides less-than-required confidence, the project lacks the necessary "Trustworthy AI" safeguards.

## Red Flag Summary Matrix
| Risk Category | Red Flag Indicator | CPMAI Rationale | Strategy |
| --- | --- | --- | --- |
| Trust | No heuristic baseline identified | AI might not be the best tool |  |
| Trust | No plan for "human-in-the-loop" | High penalty for false positives/negatives |  |
| Schedule | No short iteration/sprint plan | AI projects are probabilistic and need agility |  |
| Compliance | Missing CCPA/Data Privacy plan | Regulatory or liability issues may halt project |  |
