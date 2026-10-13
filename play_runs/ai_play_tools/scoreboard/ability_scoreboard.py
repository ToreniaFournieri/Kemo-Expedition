"""Ability scoreboard: what `stagedEquipmentTuning` accepted and rejected across every AI play run.

Run from the repo root after each AI play run (stdlib only):

    python3 play_runs/ai_play_tools/scoreboard/ability_scoreboard.py

It reads every run folder in play_runs/ and writes AI_play_report/Ability_scoreboard.md.
* `tuning_responses.jsonl` (build 47+, written by client/t.py): one full tuning response per line, `{n, build, request, data}`
  (`build` is the `versionBuild` of `fundamental/status` when the client has read it, else the report name decides).
* `tune_log.jsonl` (older runs, the players' own compact logs): back-filled. It lists only the candidates that passed the
  quick check, so `tried` and `freeGain` are unknown for those runs; the destination comes from PT1's `changeExpedition`
  calls in `batch_calls.jsonl`, and the build from the run's report file name.
Special-bonus abilities and their items come from Spec 3.2.1, enemy drops from Spec 4.2 (tests keep both equal to the runtime).
"""
import collections, datetime, glob, json, os, re, statistics

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
OUT = os.path.join(ROOT, 'AI_play_report', 'Ability_scoreboard.md')
ITEM_IN_CHANGE = re.compile(r'=\d/(\d+)/')


def item_ids(changes):
    return [int(m.group(1)) for change in changes for m in [ITEM_IN_CHANGE.search(change)] if m]


def spec_item_abilities():
    """ability -> [(itemId, tier, rarity)] from the Spec 3.2.1 special-bonus column."""
    rows = collections.defaultdict(list)
    text = open(os.path.join(ROOT, 'Specification_3.2_ITEM_MASTER_DATA.md'), encoding='utf-8').read()
    for line in text.split('### 3.2.2')[0].split('\n'):
        cells = [cell.strip() for cell in line.split('|')]
        if len(cells) < 8 or not re.fullmatch(r'\d{4}', cells[1]):
            continue
        for ability in re.findall(r'`(a\.[a-z_-]+)`', cells[7]):
            rows[ability.replace('_', '-')].append((int(cells[1]), int(cells[2]), cells[3]))
    return rows


def spec_dropped_items():
    """Item IDs some enemy of Spec 4.2 drops (any cell that is a list of item IDs)."""
    text = open(os.path.join(ROOT, 'Specification_4.2_EXPEDITION_&_ENEMY_MASTER_DATA.md'), encoding='utf-8').read()
    dropped = set()
    for line in text.split('\n'):
        for cell in line.split('|'):
            if re.fullmatch(r'\s*\d{4}(\s*,\s*\d{4})*\s*', cell):
                dropped.update(int(value) for value in cell.split(','))
    return dropped


def run_build(run):
    """The build from the run's report name `v<version>(<build>)_<Account>_...`."""
    account = re.match(r'normal_api_exp8_([^_]+)_', os.path.basename(os.path.normpath(run)))
    if account:
        for path in glob.glob(os.path.join(ROOT, 'AI_play_report', f'v*_{account.group(1)}_*.md')):
            match = re.match(r'v[\d.]+\((\d+)\)', os.path.basename(path))
            if match:
                return int(match.group(1))
    return None


def build_number(value):
    """`47`, or the `versionBuild` string of `fundamental/status` (`v0.10.1 (47)`), as an integer."""
    if isinstance(value, int):
        return value
    match = re.search(r'\((\d+)\)', value or '')
    return int(match.group(1)) if match else None


def pt1_destinations(run):
    """call number -> PT1 destination, from `batch_calls.jsonl`."""
    by_call, current = {}, 1
    path = os.path.join(run, 'batch_calls.jsonl')
    if not os.path.exists(path):
        return by_call
    for line in open(path, encoding='utf-8'):
        call = json.loads(line)
        parameters = call.get('parameters') or {}
        if call['path'].startswith('/commit/expedition/1/changeExpedition') and 'destination' in parameters:
            current = parameters['destination']
        by_call[call['n']] = current
    return by_call


def ability_label(entry):
    return [ability for ability in entry if ability.startswith('a.')] if isinstance(entry, list) else []


def load_records():
    """One normalized record per tuning."""
    records = []
    for run in sorted(glob.glob(os.path.join(ROOT, 'play_runs', '*', ''))):
        name = os.path.basename(os.path.dirname(run))
        full = os.path.join(run, 'tuning_responses.jsonl')
        if os.path.exists(full):
            for line in open(full, encoding='utf-8'):
                entry = json.loads(line)
                data = entry['data']
                tried = [(c['abilities'], item_ids(c['changes']), c['improvement'], c['recorded']) for c in data['triedCandidates']['ability']]
                records.append({
                    'run': name, 'build': build_number(entry.get('build')) or run_build(run), 'destination': data['destination'],
                    'objective': data['objective'], 'accepted': data['accepted'], 'gain': data['gain'],
                    'tried': tried,
                    'recorded': [(c['abilities'], item_ids(c['changes'])) for c in data['steps']['ability']],
                    'kept': [(c.get('abilities') or [], item_ids(c['changes'])) for c in data['steps']['finalTuning']],
                    'counters': data['bottleneckCounters'],
                })
            continue
        legacy = os.path.join(run, 'tune_log.jsonl')
        if not os.path.exists(legacy):
            continue
        build, destinations = run_build(run), pt1_destinations(run)
        for line in open(legacy, encoding='utf-8'):
            entry = json.loads(line)
            steps = entry['steps']
            records.append({
                'run': name, 'build': build, 'destination': destinations.get(entry['n']),
                'objective': entry['body'].get('objective', 'success'), 'accepted': entry['accepted'], 'gain': entry['gain'],
                'tried': None,
                'recorded': [(ability_label(c[0]), item_ids(c[2])) for c in steps.get('ability') or []],
                'kept': [(ability_label(c[0]), item_ids(c[2])) for c in steps.get('finalTuning') or []],
                'counters': None,
            })
    return records


def score(records):
    board = collections.defaultdict(lambda: {'runs': set(), 'tried': 0, 'recorded': 0, 'kept': 0, 'accepted': 0, 'alone': 0,
                                             'gains': [], 'items': collections.Counter(), 'where': collections.Counter(),
                                             'free': [], 'triedKnown': False, 'acceptedFull': 0})
    for record in records:
        if record['tried'] is not None:
            for abilities, _items, _improvement, _recorded in record['tried']:
                for ability in abilities:
                    row = board[ability]; row['tried'] += 1; row['triedKnown'] = True; row['runs'].add(record['run'])
        for abilities, _items in record['recorded']:
            for ability in abilities:
                board[ability]['recorded'] += 1; board[ability]['runs'].add(record['run'])
        for abilities, items in record['kept']:
            for ability in abilities:
                row = board[ability]; row['kept'] += 1
                if record['accepted']:
                    row['accepted'] += 1
                    row['acceptedFull'] += record['tried'] is not None
                    row['gains'].append(record['gain'] * 100)
                    row['alone'] += len(record['kept']) == 1
                    row['items'].update(items)
                    row['where'][f"D{record['destination']}" if record['destination'] else '?'] += 1
        for counter in record['counters'] or []:
            if counter.get('freeGain') is not None:
                board[counter['ability']]['free'].append((counter['freeGain'] * 100, (counter.get('freeStandardError') or 0) * 100))
    return board


def render(records, board):
    abilities = spec_item_abilities()
    dropped = spec_dropped_items()
    runs = collections.OrderedDict()
    for record in sorted(records, key=lambda entry: (entry['build'] or 0, entry['run'])):
        runs.setdefault(record['run'], {'build': record['build'], 'tunings': 0, 'accepted': 0, 'full': record['tried'] is not None})
        runs[record['run']]['tunings'] += 1
        runs[record['run']]['accepted'] += record['accepted']
    out = ['# Ability scoreboard (staged tuning across AI play runs)', '',
           f'Generated by `play_runs/ai_play_tools/scoreboard/ability_scoreboard.py` on {datetime.date.today():%Y/%m/%d}. '
           'Do not edit by hand: run the script again after each AI play run.', '',
           f'{len(records)} tunings from {len(runs)} runs:', '',
           '| Run | Build | Tunings | Accepted | Record |', '|---|---:|---:|---:|---|']
    for name, run in runs.items():
        out.append(f"| {name} | {run['build'] or '?'} | {run['tunings']} | {run['accepted']} | {'full (tuning_responses.jsonl)' if run['full'] else 'back-filled (tune_log.jsonl)'} |")
    out += ['', '## How to read', '',
            '* **Accepted** (step 6, beat the current build by 7 % and 2 SE) is the strength signal. **Passed** (the 7 % quick check) is not: '
            'quick runs are noisy, and many candidates that pass are rejected later.',
            '* **Tried** is known only for full records (build 47+, last column). An ability that is never tried was never owned (or never fit); '
            'that is availability, by design, not weakness. Only "tried often, rarely accepted" points to a weak ability.',
            '* A gain is the whole item swap: a strong item can carry a weak ability. **Alone** counts acceptances where the ability '
            'item was the only change; **Items** shows which item carried it. **freeGain** (build 47+) measures the ability itself, '
            'given for free with no item change: near or below 0 means the counter does little or harms in that room.',
            '* Gains are in the tuning\'s score: route success for `success` tunings, boss damage share for `bossDamage` ones.',
            '* The AI runs use similar parties and strategies, and the tuning rules changed between builds 41 and 47: compare like with like.',
            '', '## Ability items in tuning', '',
            '| Ability | Runs | Passed | Kept (step 5) | Accepted | Alone | Median gain when accepted | Items (accepted) | Accepted at | Full records: accepted / tried | freeGain median (n) |',
            '|---|---:|---:|---:|---:|---:|---:|---|---|---:|---:|']
    order = sorted(board.items(), key=lambda kv: (-kv[1]['accepted'], -kv[1]['recorded'], kv[0]))
    for ability, row in order:
        if not (row['recorded'] or row['tried'] or row['kept']):
            continue
        gain = f"+{statistics.median(row['gains']):.1f} pt" if row['gains'] else '–'
        items = ', '.join(f'{item} ×{count}' for item, count in row['items'].most_common(3)) or '–'
        where = ' '.join(f'{key}:{value}' for key, value in sorted(row['where'].items())) or '–'
        free = f"{statistics.median(value for value, _ in row['free']):+.1f} pt ({len(row['free'])})" if row['free'] else '–'
        rate = f"{row['acceptedFull']} / {row['tried']}" if row['triedKnown'] else '–'
        out.append(f"| `{ability}` | {len(row['runs'])} | {row['recorded']} | {row['kept']} | {row['accepted']} | {row['alone']} | {gain} | {items} | {where} | {rate} | {free} |")
    counters = sorted((ability, row) for ability, row in board.items() if row['free'])
    out += ['', '## Counter abilities measured for free (freeGain)', '']
    if counters:
        out += ['| Ability | Checks | Helps (> 2 SE) | Harms (< -2 SE) | Median freeGain |', '|---|---:|---:|---:|---:|']
        for ability, row in counters:
            helps = sum(1 for value, error in row['free'] if value > 2 * error)
            harms = sum(1 for value, error in row['free'] if value < -2 * error)
            out.append(f"| `{ability}` | {len(row['free'])} | {helps} | {harms} | {statistics.median(value for value, _ in row['free']):+.1f} pt |")
    else:
        out.append('No full records yet: `freeGain` starts with build 47 runs.')
    seen = {ability for ability, row in board.items() if row['recorded'] or row['tried'] or row['kept']}
    out += ['', '## Special-bonus abilities never seen in tuning', '',
            'Abilities that an item grants (Spec 3.2.1) but that no tuning tried or recorded. "Shop only" means no enemy in Spec 4.2 drops '
            'any of its items, so a run owns one only if the shop sold it.', '',
            '| Ability | Items (tier, rarity) | Source |', '|---|---|---|']
    for ability in sorted(set(abilities) - seen):
        items = abilities[ability]
        source = 'enemy drop' if any(item in dropped for item, _, _ in items) else 'shop only'
        out.append(f"| `{ability}` | {', '.join(f'{item} (T{tier} {rarity})' for item, tier, rarity in items)} | {source} |")
    return '\n'.join(out) + '\n'


if __name__ == '__main__':
    records = load_records()
    open(OUT, 'w', encoding='utf-8').write(render(records, score(records)))
    print(f'wrote {os.path.relpath(OUT, ROOT)}: {len(records)} tunings')
