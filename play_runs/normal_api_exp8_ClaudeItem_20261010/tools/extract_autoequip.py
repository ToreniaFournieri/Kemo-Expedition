# Regenerates tools/autoequip.ts: the FULL/SEMI auto-equipment planner copied out of the HomeScreen React component
# (planAutoEquipment useCallback) so the offline emulator can equip drops after each elapsed chunk like the live API.
# Run from the repo root: python3 play_runs/normal_api_exp8_ClaudeCharge_20261009/tools/extract_autoequip.py
import re, os
HERE = os.path.dirname(os.path.abspath(__file__))
src = open('src/components/HomeScreen.tsx').read()
lines = src.split('\n')
start = next(i for i, l in enumerate(lines) if 'const planAutoEquipment = useCallback((' in l)
end = next(i for i in range(start, len(lines)) if lines[i].strip() == '}, []);')
body = '\n'.join(lines[start + 1:end])
rel = os.path.relpath('src/components', HERE)
keep = []
for imp in re.findall(r'(?ms)^import\b.*?from\s+[\'"][^\'"]+[\'"];', src):
    m = re.match(r'(?s)import\s+(type\s+)?(.*?)\s+from\s+[\'"]([^\'"]+)[\'"];', imp)
    if not m or m.group(1):
        continue
    spec, path = m.group(2), m.group(3)
    inner = re.search(r'\{(.*)\}', spec, re.S)
    if not inner:
        continue
    used = [p.strip() for p in inner.group(1).split(',') if p.strip() and re.search(r'\b' + re.escape(p.strip().split(' as ')[-1].replace('type ', '').strip()) + r'\b', body)]
    if used:
        if path.startswith('.'):
            path = os.path.normpath(os.path.join(rel, path))
        keep.append('import { ' + ', '.join(used) + " } from '" + path + "';")
types_path = os.path.normpath(os.path.join(rel, '../types'))
hook_path = os.path.normpath(os.path.join(rel, '../hooks/useGameState'))
out = '\n'.join(keep) + f"\nimport type {{ GameState }} from '{types_path}';\nimport {{ gameReducer as __gr }} from '{hook_path}';\n"
out += 'export const planAutoEquipment = (\n' + body + '\n};\n'
out += """
export function applyAutoEquipment(sourceState: GameState, partyIndex: number, characterId?: number, forceFull = false): GameState {
  const plan = planAutoEquipment(sourceState, [partyIndex], characterId === undefined ? undefined : [characterId], { forceFull });
  return __gr(sourceState, { type: 'APPLY_AUTO_EQUIPMENT_ACTIONS', actions: plan.actions } as any);
}
"""
open(os.path.join(HERE, 'autoequip.ts'), 'w').write(out)
print('wrote autoequip.ts with', len(keep), 'imports')
