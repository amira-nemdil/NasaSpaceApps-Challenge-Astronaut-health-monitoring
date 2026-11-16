"""Repeat participant-held-out evaluation; never report clinical accuracy.

Run: python backend/scripts/evaluate_mmash.py --output docs/model-evaluation.json
"""
import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
from train_mmash import build_dataset, discover_actigraph_files, train_model, FEATURE_NAMES

def evaluate(data_dir, seeds):
    files = discover_actigraph_files(data_dir)
    windows, quality = build_dataset(files)
    runs = []
    for seed in seeds:
        artifact, metadata = train_model(windows, seed=seed)
        test = windows.loc[windows.participant.isin(metadata['participant_splits']['test'])].copy()
        calibration = artifact['calibration_scores']
        def flags(frame):
            raw = -artifact['pipeline'].score_samples(frame[FEATURE_NAMES])
            return np.searchsorted(calibration, raw, side='right') / len(calibration) >= .99
        test['flagged'] = flags(test)
        # This artificial stress test has a known injected change, not a disease label.
        perturbed = test.copy()
        perturbed['hr_mean_bpm'] = np.minimum(240, perturbed.hr_mean_bpm + 45)
        perturbed['hr_std_bpm'] = np.minimum(100, perturbed.hr_std_bpm + 16)
        perturbed['activity_mean_log'] = 0.0
        perturbed['steps_sum_log'] = 0.0
        perturbed['lying_fraction'] = 1.0
        reference = artifact['reference_stats']
        def baseline_flags(frame):
            first_five = FEATURE_NAMES[:5]
            deviations = [(frame[name] - reference[name]['median']).abs() / max(reference[name]['iqr'] / 1.349, 1e-6) for name in first_five]
            return np.stack(deviations, axis=1).max(axis=1) >= 3
        runs.append({
            'seed': seed, 'participant_splits': metadata['participant_splits'],
            'window_counts': metadata['window_counts'], 'held_out_test': metadata['held_out_test'],
            'per_participant': test.groupby('participant').agg(windows=('flagged','size'), flagged=('flagged','sum'), alert_fraction=('flagged','mean')).reset_index().to_dict('records'),
            'synthetic_perturbation_flag_fraction': float(flags(perturbed).mean()),
            'reference_deviation_baseline': {'reference_alert_fraction': float(baseline_flags(test).mean()), 'synthetic_perturbation_flag_fraction': float(baseline_flags(perturbed).mean()), 'threshold': 'maximum absolute robust feature deviation >= 3; illustrative comparator'},
        })
    return {'created_at':datetime.now(timezone.utc).isoformat(), 'participants':len(files), 'windows':len(windows), 'threshold_percentile':.99, 'source_quality':quality,
        'source_sha256':{str(p.relative_to(data_dir)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files},
        'evaluation_script_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), 'runs':runs,
        'interpretation':'Alert rates on healthy terrestrial reference data and responses to artificial perturbations only. No medical outcome labels, sensitivity/specificity, astronaut validation or clinical accuracy established. Windows within a person are correlated; repeated splits reuse participants and are not independent cohorts.'}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    root = Path(__file__).resolve().parents[2]
    parser.add_argument('--data-dir', type=Path, default=root/'data/raw/mmash')
    parser.add_argument('--output', type=Path, default=root/'docs/model-evaluation.json')
    parser.add_argument('--seeds', type=int, nargs='+', default=[42,43,44,45,46])
    args = parser.parse_args()
    result = evaluate(args.data_dir, args.seeds)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'participants':result['participants'],'windows':result['windows'],'runs':[{'seed':run['seed'],'reference_alert_fraction':run['held_out_test']['flagged_fraction_at_threshold'],'synthetic_perturbation_flag_fraction':run['synthetic_perturbation_flag_fraction']} for run in result['runs']],'report':str(args.output)},indent=2))
