# MMASH data for AstroPulse

AstroPulse uses **MMASH v1.0.0** as Earth-based reference data for its optional wearable-window anomaly model. The raw recordings are local development data. They are not NASA astronaut measurements and do not validate the model for clinical or spaceflight use.

## Expected local layout

Download the ZIP from [PhysioNet](https://physionet.org/content/mmash/1.0.0/), extract it, and copy the contents of its `DataPaper` folder into `data/raw/mmash/`:

```text
data/
  README.md
  raw/
    mmash/
      user_1/
        Actigraph.csv
        Activity.csv
        questionnaire.csv
        RR.csv
        saliva.csv
        sleep.csv
        user_info.csv
      user_2/
      ...
      user_22/
  processed/
```

There should be 22 `user_*` directories. User 21 has no usable saliva record in the published dataset; the Isolation Forest pipeline does not use saliva data.

`data/raw/` and `data/processed/` are intentionally ignored by Git. Each teammate should download the source dataset independently. Do not commit the ZIP, extracted participant records, or generated intermediate tables.

## Training

Install the backend dependencies, then run from the repository root:

```bash
python -m pip install -r backend/requirements.txt
python backend/scripts/train_mmash.py
```

The script reads `data/raw/mmash/user_*/Actigraph.csv`, creates non-overlapping five-minute windows, uses participant-level train/calibration/test splits, and writes the model artifact and metadata to `backend/models/`.

Each accepted five-minute window must contain valid heart rate values for at least 60% of its expected samples. The seven model features, in fixed order, are:

1. `hr_mean_bpm`
2. `hr_std_bpm`
3. `activity_mean_log`
4. `steps_sum_log`
5. `lying_fraction`
6. `hour_sin`
7. `hour_cos`

The first five are derived from `Actigraph.csv`; the last two encode time of day. `sleep.csv` supports separate daily sleep analysis. Fatigue and mood remain self-reported mission signals rather than MMASH model features.

ActiGraph movement counts are device-specific. A different wearable must be calibrated to the MMASH feature scale before its values are scored. The request timestamp should represent the crew member's mission/local clock because the time-of-day features describe a daily schedule.

## Source, license and citation

- Dataset: [Multilevel Monitoring of Activity and Sleep in Healthy People, version 1.0.0](https://physionet.org/content/mmash/1.0.0/)
- DOI: [10.13026/cerq-fc86](https://doi.org/10.13026/cerq-fc86)
- License: [Open Data Commons Open Database License v1.0](https://physionet.org/content/mmash/view-license/1.0.0/)

When presenting or publishing work based on the dataset, cite:

> Rossi, A., Da Pozzo, E., Menicagli, D., Tremolanti, C., Priami, C., Sirbu, A., Clifton, D., Martini, C., & Morelli, D. (2020). Multilevel Monitoring of Activity and Sleep in Healthy People (version 1.0.0). PhysioNet. https://doi.org/10.13026/cerq-fc86

Also cite the accompanying paper listed on the PhysioNet dataset page.

## Limits

MMASH contains about 24 hours of recordings from 22 healthy young adult male participants on Earth. It cannot establish multiweek personal sleep trends, represent the diversity of an astronaut corps, or show how physiology changes in microgravity. AstroPulse therefore treats the resulting score as statistical rarity within this reference dataset, not as a disease probability, diagnosis, or flight-safety decision.
