# InfinityDz — proposed collaboration plan

> Verify these roles with your six teammates. Nobody has yet agreed to an assignment in this document.

| Member | Proposed responsibility | First deliverable |
|---|---|---|
| Amira Nemdil | Monitoring logic, AI/data analysis, model explanations | Synthetic data, baselines and tests |
| Ferkous Lina Darine | Medical research and wording, non-diagnostic safety review | Review health signals and safe alert text |
| Anis Belil | Technical lead, integration, deployment, React architecture | Set up development workflow and demo host |
| Douaa Khouni | Product design, visual identity and frontend | Responsive crew dashboard |
| Djawad Benzira | API design, data formats, integration tests | REST endpoints and documentation |
| Fettous Yousra Lyna | Electronics/sensor feasibility and system QA | Sensor-to-API proposal + test plan |

## Short Discord call agenda (15 minutes)

1. Confirm everyone is registered on Space Apps and listed on the InfinityDz team page.
2. Confirm remote participation and whether any member must present in person with the Boumerdès local organizer.
3. Agree on the minimum demo: three crew, 14 simulated mission days, selectable scenario, baseline-aware alerts, one NASA API feature.
4. Confirm roles and GitHub usernames. Use pull requests; protect main if practical.
5. Agree on the API shape before parallel work and select a final integration owner.
6. Confirm the NASA project submission owner and local deadline.

## Git workflow

```bash
# After the organizer has created an online repository and given access:
git clone https://github.com/OWNER/InfinityDz-AstroPulse.git
cd InfinityDz-AstroPulse
git checkout -b feat/your-area
# edit, commit, then push
git add .
git commit -m "feat: short meaningful summary"
git push -u origin feat/your-area
```

Suggested branch names: `feat/anomaly-engine`, `feat/medical-review`, `feat/crew-dashboard`, `feat/api-contract`, `docs/sensor-feasibility`.

## Suggested sprint checkpoints

- **First 2–3 hours:** agree on one working user journey and API contract; every teammate has a defined task
- **Middle of day 1:** API and UI connected; use fake sensor feeds openly labeled synthetic
- **Day 2 morning:** stabilize and test, validate messages, capture visuals
- **Final hours:** submit a short video, clear attribution, repo and one-paragraph impact statement

NASA's main event is **November 14–15, 2026**; consult the local event for additional scheduling details. Do not assume remote eligibility for local judging without asking the organizer.

## Async/remote work habits

Use Discord voice or a pinned text channel for decisions. Post daily status as **working / blocked / needs review**. Do a screen-share integration demo early and never store passwords, personal medical records, or API secrets in Git.
