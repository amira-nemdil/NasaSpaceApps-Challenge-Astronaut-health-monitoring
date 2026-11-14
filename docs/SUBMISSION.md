# NASA Space Apps project submission plan — InfinityDz

## Working title
AstroPulse — Explainable Astronaut Health Monitoring

## One-line pitch
An offline-friendly, crew-first monitoring prototype that helps astronauts understand changes in their own health indicators and prepares clear, explainable prompts for flight-medical review.

## Problem
Astronauts on long missions may need to evaluate multiple health and behavioral indicators while operating under communication and resource constraints. Personal context and transparent explanations matter; a generic alert-only dashboard is not enough.

## Solution and innovation
AstroPulse simulates three crew profiles, each with their own 14-day timeline. A transparent baseline-comparison engine shows when sleep, resting heart rate, fatigue, or mood shift and explains the contribution of each measurement. It optionally displays actual NASA space-weather event reports as separate, non-clinical context.

## Live demonstration (90 seconds)

1. Show the **synthetic demonstration** label. Select the first astronaut.
2. Select **Nominal mission**: at day 14, most indicators should be near baseline.
3. Select **Sleep debt**: inspect day 7 then day 14, showing the trend chart and the explanation for a review state.
4. Select **Heart-rate shift**: explain the alternate scenario and how personalized baselines are computed.
5. Load **NASA DONKI SEP** data when internet is available, explaining it is a real solar-event report and **not** personal radiation dose.
6. Show the architecture, ethical limits, and the team's proposed path to real validation.

## Suggested abstract

> AstroPulse is an educational, offline-friendly astronaut health-monitoring prototype developed by InfinityDz for the 2026 NASA Space Apps Challenge. It visualizes simulated long-duration mission vital signs and self-reports, compares new readings with each astronaut's own synthetic baseline, and explains changes that may merit reassessment or flight-medical review. An optional NASA DONKI integration adds real space-weather event context while keeping it separate from crew health data. AstroPulse is not clinically validated and does not provide diagnosis or treatment. Our objective is to demonstrate a transparent, crew-centered workflow that could be extended with secure mission telemetry, validated decision support, and flight-medicine review.

## Checklist

- [ ] Confirm all six teammates are registered under InfinityDz on the official NASA event website
- [ ] Ask Boumerdès organizer how remote participation, in-person presentation and judging work
- [ ] Assign team roles explicitly and document actual contributions
- [ ] Run the backend tests and frontend build
- [ ] Record screenshots / 90–120 second walkthrough
- [ ] Credit NASA Space Apps, NASA DONKI data if used, and acknowledge AI-assisted starter code
- [ ] Add repository URL and software instructions in the team project page
- [ ] Submit via the NASA Space Apps website before the event's local deadline

NASA's event lists **November 15, 2026 at 11:59 PM local time** as the global project submission closing time. Check local event requirements as well: https://www.spaceappschallenge.org/2026/
