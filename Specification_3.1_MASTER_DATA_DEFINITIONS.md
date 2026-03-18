## 3 Master
### 3.1 Master_Data_Definitions

**Expedition Floor generation**
- This part is discribe process to make @Specification_3.2_MASTER.md 3.2.1 Enemy table.

**Step**  
  - 1. Define `Expedition Enemy Types`
    2. Define `Standard template` for the expedition
    3. Allocate Special elite enemy, replaced by floor X, room 3.
   
**Expedition Enemy Types**

| `x.exp_id` | `x.enemy_type`A | `x.enemy_type` B | `x.enemy_type` C | `x.enemy_type` D  |
|-|-|-|-|-|
| 1 | `Beast` | `Aerial` | `Insect_Swarm` | `Caninian` |
| 2 | `Frost` | `Golem` | `Plant_Fungal` | `Lupinian` |
| 3 | `Marine` | `Slime_Colony` | `Spirit` | `Vulpinian` |
| 4 | `Shadowfang` | `Felidian` | `Titan` | `Felidian` |
| 5 | `Beast` | `Dragon` | `Ursan` | `Ursan` |
| 6 | `Mech` | `Golem` | `Chimera` | `Mustelid` |
| 7 | `Titan` | `Undead` | `Aerial` | `Leporian` |
| 8 | `Dragon` | `Ghost` | `Jinma` | `Cervin` |

**Standard template**

| `x.floor` | `x.room`| `x.level_offset` | `x.type` | `x.enemy_type` | `x.class` | `x.drop` |
|-|-|-|-|-|-|-|
| 1 | 1-2 | +0 | Normal | A | Rogue | `i.bolt`U, `i.armor`U |
| 1 | 1-2 | +0 | Normal | A | Wizard | `i.wand`U, `i.catalyst`U |
| 1 | 1-2 | +0 | Normal | A | Ranger | `i.arrow`U, `i.archery`U |
| 1 | 3 | +1 | Normal | A | Fighter | `i.sword`U, `i.gauntlet`U |
| 1 | 3 | +1 | Normal | A | Lord | `i.shield`U, `i.robe`U |
| 1 | 4 | +3 | Elite | A | ELITE1.class | ELITE1.drop |
| 2 | 1-2 | +1 | Normal | A | Ninja | `i.katana`U,`i.armor`U |
| 2 | 1-2 | +1 | Normal | A | Samurai | `i.katana`U, `i.catalyst`U |
| 2 | 1-2 | +1 | Normal | A | Sage | `i.grimoire`U, `i.robe`U |
| 2 | 3 | +2 | Normal | B | Duelist | `i.sword`U, `i.arrow`U |
| 2 | 3 | +2 | Normal | B | Pilgrim | `i.armor`U, `i.wand`U |
| 2 | 4 | +4 | Elite | A | ELITE2.class | ELITE2.drop |
| 3 | 1-2 | +2 | Normal | C | Lord | `i.shield`U,`i.robe`U |
| 3 | 1-2 | +2 | Normal | C | Wizard | `i.wand`U, `i.catalyst`U |
| 3 | 1-2 | +2 | Normal | C | Fighter | `i.sword`U, `i.gauntlet`U |
| 3 | 3 | +3 | Normal | A | Samurai | `i.katana`U, `i.bolt`U |
| 3 | 3 | +3 | Normal | A | Ranger | `i.arrow`U, `i.archery`U |
| 3 | 4 | +5 | Elite | C | ELITE3.class | ELITE3.drop |
| 4 | 1-2 | +3 | Normal | B | Rogue | `i.bolt`U, `i.armor`U |
| 4 | 1-2 | +3 | Normal | B | Wizard | `i.wand`U, `i.catalyst`U |
| 4 | 1-2 | +3 | Normal | B | Ranger | `i.arrow`U, `i.archery`U |
| 4 | 3 | +4 | Normal | C | Fighter | `i.sword`U, `i.gauntlet`U |
| 4 | 3 | +4 | Normal | C | Lord | `i.shield`U, `i.robe`U |
| 4 | 4 | +6 | Elite | B | ELITE4.class | ELITE4.drop |
| 5 | 1-2 | +4 | Normal | C | Ninja | `i.katana`U,`i.armor`U |
| 5 | 1-2 | +4 | Normal | C | Samurai | `i.katana`U, `i.catalyst`U |
| 5 | 1-2 | +4 | Normal | C | Sage | `i.grimoire`U, `i.robe`U |
| 5 | 3 | +5 | Normal | B | Duelist | `i.sword`U, `i.arrow`U |
| 5 | 3 | +5 | Normal | B | Pilgrim | `i.armor`U, `i.grimoire`U |
| 5 | 4 | +7 | Elite | B | ELITE5.class | ELITE5.drop |
| 6 | 1-2 | +5 | Normal | A | Lord | `i.shield`U,`i.robe`U |
| 6 | 1-2 | +5 | Normal | A | Wizard | `i.wand`U, `i.catalyst`U |
| 6 | 1-2 | +5 | Normal | A | Fighter | `i.sword`U, `i.gauntlet`U |
| 6 | 3 | +6 | Normal | B | Samurai | `i.katana`U, `i.bolt`U |
| 6 | 3 | +6 | Normal | B | Ranger | `i.arrow`U, `i.archery`U |
| 6 | 4 | +10 | BOSS | D | BOSS.class | BOSS.drop |

**Special elite enemy**

| `x.exp_id` | expedition unique | `x.class`  | `x.drop` |
|-|-|-|-|
| 1 | ELITE1 | Duelist | `i.gauntlet`EA, `i.katana`EA |
| 1 | ELITE2 | Fighter | `i.shield`EA, `i.robe`EA |
| 1 | ELITE3 | Rogue | `i.sword`EC, `i.armor`EC |
| 1 | ELITE4 | Ranger | `i.arrow`EB, `i.bolt`EB, `i.archery`EB |
| 1 | ELITE5 | Sage | `i.wand`EB, `i.grimoire`EB, `i.catalyst`EB |
| 1 | BOSS | Fighter | `i.sword`BD, `i.grimoire`BD |
| 2 | ELITE1 | Rogue | `i.sword`EA, `i.armor`EA |
| 2 | ELITE2 | Fighter | `i.shield`EA, `i.robe`EA |
| 2 | ELITE3 | Ranger | `i.arrow`EC, `i.bolt`EC, `i.archery`EC |
| 2 | ELITE4 | Duelist | `i.gauntlet`EB, `i.katana`EB |
| 2 | ELITE5 | Sage | `i.wand`EB, `i.grimoire`EB, `i.catalyst`EB |
| 2 | BOSS | Rogue | `i.armor`BD, `i.arrow`BD |
| 3 | ELITE1 | Pilgrim | `i.catalyst`EA, `i.robe`EA |
| 3 | ELITE2 | Lord | `i.shield`EA, `i.sword`EA, `i.armor`EA |
| 3 | ELITE3 | Wizard | `i.wand`EC, `i.grimoire`EC  |
| 3 | ELITE4 | Ninja | `i.gauntlet`EB, `i.katana`EB |
| 3 | ELITE5 | Rogue | `i.arrow`EB, `i.bolt`EB, `i.archery`EB |
| 3 | BOSS | Wizard | `i.wand`BD, `i.robe`BD |
| 4 | ELITE1 | Rogue | `i.arrow`EA, `i.archery`EA |
| 4 | ELITE2 | Samurai | `i.katana`EA, `i.shield`EA,  `i.gauntlet`EA |
| 4 | ELITE3 | Fighter | `i.armor`EC, `i.bolt`EC |
| 4 | ELITE4 | Duelist | `i.robe`EB, `i.sword`EB |
| 4 | ELITE5 | Sage | `i.wand`EB, `i.grimoire`EB, `i.catalyst`EB |
| 4 | BOSS | Ranger | `i.bolt`BD, `i.archery`BD |
| 5 | ELITE1 | Ranger | `i.arrow`EA, `i.bolt`EA, `i.archery`EA |
| 5 | ELITE2 | Pilgrim | `i.gauntlet`EA, `i.catalyst`EA |
| 5 | ELITE3 | Fighter | `i.sword`EC, `i.armor`EC |
| 5 | ELITE4 | Lord | `i.shield`EB, `i.katana`EB, `i.robe`EB |
| 5 | ELITE5 | Wizard | `i.wand`EB, `i.grimoire`EB  |
| 5 | BOSS | Samurai | `i.katana`BD, `i.shield`BD |
| 6 | ELITE1 | Fighter | `i.shield`EA, `i.robe`EA |
| 6 | ELITE2 | Rogue | `i.sword`EA, `i.armor`EA |
| 6 | ELITE3 | Sage | `i.wand`EC, `i.grimoire`EC, `i.catalyst`EC |
| 6 | ELITE4 | Samurai | `i.katana`EB, `i.arrow`EB |
| 6 | ELITE5 | Ninja | `i.gauntlet`EB, `i.bolt`EB, `i.archery`EB |
| 6 | BOSS | Sage | `i.armor`BD, `i.catalyst`BD |
| 7 | ELITE1 | Lord | `i.sword`EA, `i.shield`EA |
| 7 | ELITE2 | Sage | `i.wand`EA, `i.grimoire`EA, `i.robe`EA |
| 7 | ELITE3 | Pilgrim | `i.armor`EC, `i.catalyst`EC |
| 7 | ELITE4 | Ranger | `i.arrow`EB, `i.bolt`EB, `i.archery`EB  |
| 7 | ELITE5 | Duelist | `i.gauntlet`EB, `i.katana`EB |
| 7 | BOSS | Lord | `i.sword`BD, `i.wand`BD |
| 8 | ELITE1 | Fighter | `i.sword`EA, `i.armor`EA |
| 8 | ELITE2 | Sage | `i.wand`EA, `i.bolt`EA |
| 8 | ELITE3 | Pilgrim | `i.catalyst`EC, `i.robe`EC, `i.archery`EC |
| 8 | ELITE4 | Samurai | `i.gauntlet`EB, `i.katana`EB, `i.arrow`EB |
| 8 | ELITE5 | Wizard | `i.grimoire`EB, `i.shield`EB  |
| 8 | BOSS | Ninja | `i.katana`BD, `i.bolt`BD, `i.grimoire`BD |


| `x.exp_id` | replace target | `x.level_offset` | `x.type` | `x_enemy_type` | `x.class` | `x.drop` |
|-|-|-|-|-|-|-|
| 1 | 4 | +6 | Elite | Caninian | Lord | `i.shield`BD, `i.robe`BD |
| 1 | 4 | +6 | Elite | Caninian | Fighter | `i.katana`BD, `i.gauntlet`BD |
| 2 | 5 | +7 | Elite | Lupinian |  Wizard | `i.wand`BD, `i.catalyst`BD |
| 2 | 5 | +7 | Elite | Lupinian | Ninja | `i.bolt`BD, `i.archery`BD |
| 3 | 5 | +7 | Elite | Vulpinian | Duelist | `i.sword`BD, `i.shield`BD |
| 3 | 5 | +7 | Elite | Vulpinian | Pilgrim | `i.catalyst`BD, `i.gauntlet`BD |
| 4 | 4 | +6 | Elite | Felidian | Rogue | `i.grimoire`BD, `i.arrow`BD |
| 4 | 4 | +6 | Elite | Felidian | Ninja | `i.robe`BD, `i.sword`BD |
| 5 | 3 | +5 | Elite | Ursan | Fighter | `i.gauntlet`BD, `i.armor`BD |
| 5 | 3 | +5 | Elite | Ursan | Sage | `i.wand`BD, `i.catalyst`BD |
| 6 | 6 | +8 | Elite | Mustelid | Samurai | `i.shield`BD, `i.katana`BD |
| 6 | 6 | +8 | Elite | Mustelid | Ranger | `i.arrow`BD, `i.archery`BD |
| 7 | 2 | +4 | Elite | Leporian | Pilgrim | `i.armor`BD, `i.gauntlet`BD |
| 7 | 2 | +4 | Elite | Leporian | Wizard | `i.archery`BD, `i.grimoire`BD |
| 8 | 5 | +7 | Elite | Cervin | Sage | `i.catalyst`BD, `i.robe`BD |
| 8 | 5 | +7 | Elite | Cervin | Rogue | `i.arrow`BD, `i.sword`BD |


- Drop code format: `i.item_type`<Rarity><EnemyTypeSource>

<Rarity>
- `U`: Uncommon  (No enemy type specific)
- `E`: Elite Rare
- `B`: Boss Rare

<EnemyTypeSource>
- A = common local ecology
- B = later threat / stronger regional pressure
- C = accent floor enemy 
- D = symbolic / boss-linked presence

- Within the same `x.item_tier`, Common and Uncommon drop code resolves to a fixed item. (Common can be dropped by all enemy, so it is omitted by the list)
- Example: if `i.archeryEA` in `x.exp_id = 1` is set to `つる巻き弓`, then every enemy in that expedition that drops `i.archeryEA` drops `つる巻き弓`.
- Different expeditions may assign different concrete items to the same drop code.
