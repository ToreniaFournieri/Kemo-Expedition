import assert from 'node:assert/strict';
import test from 'node:test';

import { replaceFlatItemStat } from '../src/game/equipmentDisplay.ts';

test('projected flat defense does not overwrite a percentage defense bonus', () => {
  assert.equal(
    replaceFlatItemStat('[8E] Melee NoA+0.73 [Melee NoA+10, Physical DEF +11%]', 'Physical DEF ', 'Physical DEF -72'),
    '[8E] Melee NoA+0.73 [Melee NoA+10, Physical DEF +11%]',
  );
});

test('projected flat defense replaces only the flat item stat', () => {
  assert.equal(
    replaceFlatItemStat('[8E] Melee NoA+2.75 Physical DEF +369 HP+84 [Physical DEF +8%]', 'Physical DEF ', 'Physical DEF +297'),
    '[8E] Melee NoA+2.75 Physical DEF +297 HP+84 [Physical DEF +8%]',
  );
});
