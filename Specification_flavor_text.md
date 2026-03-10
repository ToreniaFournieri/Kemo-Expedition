
- Priority logic

- **move state**
  - condition: sortie > none. 

- **return state**
  - condition: Defeat >  Wounded_Retreat > Draw_Retreat >  Turned_Back > Clear 

- master

| state | condition | flavor text |
|-|-|-|
| rest | none | 疲れを癒している |
| rest | none | name は焚き火のそばで静かに休んでいる |
| rest | none | name は深呼吸して張り詰めた心を落ち着かせている |
| rest | none | name は荷物を下ろして体の力を抜いている |
| rest | none | name は仲間の声を聞きながらひと息ついている |
| rest | none | name は空を見上げ、しばし何も考えずにいる |
| rest | none | name は傷の痛みをこらえつつ体勢を整えている |
| rest | none | name は温かい飲み物で体を内側から温めている |
| rest | none | name は次の行動に備えて体力を温存している |
| rest | none | name は静かな時間の中で気持ちを立て直している |
| rest | `d.HP` > 70% of max HP | name は余力を感じつつ、穏やかに休息を取っている |
| rest | `d.HP` > 70% of max HP | name は軽く肩を回しながら次の行動に備えている |
| rest | `d.HP` > 70% of max HP | name は表情に余裕を残したまま焚き火を見つめている |
| rest | `d.HP` > 70% of max HP | name は傷の少なさを確かめ、静かに体勢を整えている |
| rest | `d.HP` > 70% of max HP | name は仲間と談笑しながら落ち着いて呼吸を整えている |
| rest | `d.HP` > 70% of max HP | name は短い休息でも十分だと判断して周囲を見渡している |
| rest | `d.HP` > 70% of max HP | name は荷物を整えつつ、余裕をもって英気を養っている |
| rest | `d.HP` > 70% of max HP | name は疲労の少ない足取りで拠点の様子を確認している |
| rest | `d.HP` > 70% of max HP | name は体力の充実を感じながら静かな時間を楽しんでいる |
| rest | `d.HP` > 70% of max HP | name は次の遠征を思い描き、前向きに休んでいる |
| rest | `d.HP` < 20% of max HP |  早く楽になりたいと願ったら医者から安楽死を勧められた| 
| rest | `d.HP` < 5% of max HP (Serious injuries) | name は全身の激痛に耐えながら、かろうじて呼吸を整えている |
| rest | `d.HP` < 5% of max HP (Serious injuries) | name は止血した包帯を押さえ、意識を手放さないよう踏ん張っている |
| rest | `d.HP` < 5% of max HP (Serious injuries) | name は震える手で傷口を確認し、最小限の処置を続けている |
| rest | `d.HP` < 5% of max HP (Serious injuries) | name は立ち上がる力も残らず、地面に身を預けて回復を待っている |
| rest | `d.HP` < 5% of max HP (Serious injuries) | name は荒い呼吸の合間に、次の一歩だけを考えている |
| rest | `d.HP` < 5% of max HP (Serious injuries) | name は仲間の肩を借りながら、痛みに顔をしかめて休んでいる |
| rest | `d.HP` < 5% of max HP (Serious injuries) | name は深い傷の熱をこらえ、体温を失わないよう身を丸めている |
| rest | `d.HP` < 5% of max HP (Serious injuries) | name は目を閉じると意識が遠のくため、必死にまぶたを開いている |
| rest | `d.HP` < 5% of max HP (Serious injuries) | name は砕けた装備を外し、これ以上傷を広げないようじっとしている |
| rest | `d.HP` < 5% of max HP (Serious injuries) | name は生還への執念だけを支えに、静かに痛みをやり過ごしている |
| rest | `d.HP` < 20% of max HP | name は傷口を押さえながら浅く息を整えている |
| rest | `d.HP` < 20% of max HP | name は震える手で包帯を巻き直している |
| rest | `d.HP` < 20% of max HP | name は仲間の肩を借りてようやく座り込んだ |
| rest | `d.HP` < 20% of max HP | name は痛みに耐えながら温かい湯を口にした |
| rest | `d.HP` < 20% of max HP | name は荒い呼吸のまま焚き火の熱に身を寄せている |
| rest | `d.HP` < 20% of max HP | name は立ち上がる力を蓄えるように目を閉じている |
| rest | `d.HP` < 20% of max HP | name は手当てを受けつつ無言でうなずいた |
| rest | `d.HP` < 20% of max HP | name は汗をぬぐいながら鼓動が落ち着くのを待っている |
| rest | `d.HP` < 20% of max HP | name は今は生き延びることだけを考えて休んでいる |
| rest | `d.HP` < 20% of max HP | name はかすかな回復の兆しに希望をつないでいる |
| rest | with mainClass.`Fighter` | name は剣帯を外し、鍛えた体を壁にもたせて静かに息を整えている |
| rest | with mainClass.`Fighter` | name は鎧の留め具を緩め、肩の重みをほどいて休んでいる |
| rest | with mainClass.`Fighter` | name は手甲を磨きながら、次の戦いに備えて気力を蓄えている |
| rest | with mainClass.`Fighter` | name は仲間の前に座り、守りの要として周囲を見渡している |
| rest | with mainClass.`Fighter` | name は深い呼吸とともに筋肉の張りをゆっくり解いている |
| rest | with mainClass.`Fighter` | name は焚き火の火勢を整え、皆が休みやすい場を作っている |
| rest | with mainClass.`Fighter` | name は盾を膝に置き、静かに目を閉じて疲労を抜いている |
| rest | with mainClass.`Fighter` | name は足取りの重さを確かめつつ、無理せず休息に専念している |
| rest | with mainClass.`Fighter` | name は荒い息を整えたあと、短くうなずいて体勢を立て直した |
| rest | with mainClass.`Fighter` | name は仲間が眠るまで見張りを買って出て、その合間に休んでいる |
| rest | with mainClass.`Duelist` | name は愛剣の刃こぼれを確かめ、静かな所作で休息を取っている |
| rest | with mainClass.`Duelist` | name は手首を回し、次の斬撃に備えて力みを抜いている |
| rest | with mainClass.`Duelist` | name は一礼するように腰を下ろし、呼吸の間合いを整えている |
| rest | with mainClass.`Duelist` | name は剣先を布で拭い、心を澄ませながら疲れを癒している |
| rest | with mainClass.`Duelist` | name は姿勢を正して座り、静かに集中を取り戻している |
| rest | with mainClass.`Duelist` | name は鞘鳴りを確かめ、無駄のない動きで体を休めている |
| rest | with mainClass.`Duelist` | name は足運びを小さく反復し、最小限の力で体をほぐしている |
| rest | with mainClass.`Duelist` | name は勝負の余韻を胸に、穏やかな目で焚き火を見つめている |
| rest | with mainClass.`Duelist` | name は静かな呼吸に合わせ、乱れた拍動を整えている |
| rest | with mainClass.`Duelist` | name は次の一太刀を思い描きつつ、気配を消すように休んでいる |
| rest | with mainClass.`Ninja` | name は物陰に身を置き、気配を薄めながら静かに休息している |
| rest | with mainClass.`Ninja` | name は呼気を細く整え、消耗した体力を素早く回復している |
| rest | with mainClass.`Ninja` | name は装束の乱れを直し、次の潜入に備えている |
| rest | with mainClass.`Ninja` | name は足音を殺したまま姿勢を崩し、短時間で疲れを抜いている |
| rest | with mainClass.`Ninja` | name は暗がりで忍具を点検し、静かに体勢を整えている |
| rest | with mainClass.`Ninja` | name は壁際に背を預け、周囲の気配を探りながら休んでいる |
| rest | with mainClass.`Ninja` | name は脈を整えるように目を閉じ、わずかな休息を積み重ねている |
| rest | with mainClass.`Ninja` | name は細かな傷を素早く手当てし、無駄なく回復を進めている |
| rest | with mainClass.`Ninja` | name は忍び足の感覚を確かめ、静かに力を蓄えている |
| rest | with mainClass.`Ninja` | name は夜風に耳を澄ませ、緊張を解きすぎないよう休んでいる |
| rest | with mainClass.`Samurai` | name は刀を膝前に置き、背筋を伸ばして静かに休息している |
| rest | with mainClass.`Samurai` | name は鞘を撫で、心を落ち着けながら疲れを鎮めている |
| rest | with mainClass.`Samurai` | name は正座の姿勢で呼吸を整え、乱れた気を静めている |
| rest | with mainClass.`Samurai` | name は手拭いで汗を拭い、次の一閃へ備えている |
| rest | with mainClass.`Samurai` | name は焚き火の火に刃を映し、黙して体を休めている |
| rest | with mainClass.`Samurai` | name は小さく目を閉じ、精神統一で痛みを押し流している |
| rest | with mainClass.`Samurai` | name は具足を緩め、重みを外して静かに英気を養っている |
| rest | with mainClass.`Samurai` | name は仲間へ短く声を掛け、安心させてから腰を下ろした |
| rest | with mainClass.`Samurai` | name は乱れた衣を整え、礼節を崩さず休息を続けている |
| rest | with mainClass.`Samurai` | name は次の決戦を思い、揺るがぬ眼差しで休んでいる |
| rest | with mainClass.`Lord` | name は全員の休息状況を確認し、自身も椅子に深く腰掛けた |
| rest | with mainClass.`Lord` | name は地図を畳み、指揮の緊張を解いて静かに休んでいる |
| rest | with mainClass.`Lord` | name は茶を配って士気を整え、穏やかな表情で息をついた |
| rest | with mainClass.`Lord` | name は次の行程を頭で整理しながら体力を温存している |
| rest | with mainClass.`Lord` | name は背もたれに身を預け、遠征の負担を静かに解いている |
| rest | with mainClass.`Lord` | name は仲間へ労いの言葉をかけ、自らも短い休息を取っている |
| rest | with mainClass.`Lord` | name は焚き火の配置まで気を配り、安心して休める場を整えた |
| rest | with mainClass.`Lord` | name は報告を受け終えると、ようやく肩の力を抜いた |
| rest | with mainClass.`Lord` | name は静かな微笑みで隊を見渡し、落ち着いて回復している |
| rest | with mainClass.`Lord` | name は号令を控え、今は英気を養うことに専念している |
| rest | with mainClass.`Ranger` | name は弓弦の張りを確かめ、手早く体を休めている |
| rest | with mainClass.`Ranger` | name は矢羽の乱れを整え、視線を遠くへ向けて息をついた |
| rest | with mainClass.`Ranger` | name は足場の感触を確かめつつ、脚の疲れをほぐしている |
| rest | with mainClass.`Ranger` | name は索敵の耳を休めるように目を閉じている |
| rest | with mainClass.`Ranger` | name は水袋を口にし、乾いた喉と気力を潤している |
| rest | with mainClass.`Ranger` | name は周辺の地形を再確認し、無駄なく休息を進めている |
| rest | with mainClass.`Ranger` | name は背嚢を枕代わりに、短く深い休みを取っている |
| rest | with mainClass.`Ranger` | name は仲間に風向きを伝え、静かに体力を戻している |
| rest | with mainClass.`Ranger` | name は矢筒を抱え、警戒を保ったまま呼吸を整えている |
| rest | with mainClass.`Ranger` | name は次の追跡に備え、足取りの軽さを取り戻している |
| rest | with mainClass.`Wizard` | name は杖先の光を弱め、精神の消耗をゆっくり癒している |
| rest | with mainClass.`Wizard` | name は呪文書を閉じ、静かな呼吸で魔力の乱れを整えている |
| rest | with mainClass.`Wizard` | name は指先の痺れをほぐし、詠唱の感覚を取り戻している |
| rest | with mainClass.`Wizard` | name は小声で基礎詠唱を反復しながら休息している |
| rest | with mainClass.`Wizard` | name は焚き火の火に手をかざし、冷えた体を温めている |
| rest | with mainClass.`Wizard` | name は魔力循環を意識して姿勢を正し、疲労を抜いている |
| rest | with mainClass.`Wizard` | name は目を閉じて術式を整理し、無理なく気力を回復している |
| rest | with mainClass.`Wizard` | name は触媒の残量を確認し、安心して腰を下ろした |
| rest | with mainClass.`Wizard` | name は静かな笑みを浮かべ、乱れた思考を整えている |
| rest | with mainClass.`Wizard` | name は次の詠唱に備え、喉を潤してじっと休んでいる |
| rest | with mainClass.`Sage` | name は仲間の負傷を見回り、自身も静かに腰を下ろした |
| rest | with mainClass.`Sage` | name は呼吸法を整え、心身の回復効率を高めている |
| rest | with mainClass.`Sage` | name は書板に要点を書き留め、頭を空にして休んでいる |
| rest | with mainClass.`Sage` | name は温茶を淹れて配り、穏やかな空気を作っている |
| rest | with mainClass.`Sage` | name は乱れた脈拍を数え、落ち着いた調子へ戻している |
| rest | with mainClass.`Sage` | name は短い瞑想で雑念を払い、疲労を静かに解いている |
| rest | with mainClass.`Sage` | name は仲間へ回復の助言を伝え、自らも休息に入った |
| rest | with mainClass.`Sage` | name は焚き火のそばで姿勢を整え、静かに英気を養っている |
| rest | with mainClass.`Sage` | name は地図と記録を閉じ、いまは休むべきだと判断した |
| rest | with mainClass.`Sage` | name は穏やかな眼差しで周囲を見守りながら回復している |
| rest | with mainClass.`Rogue` | name は荷の陰に腰を落とし、周囲を窺いながら休んでいる |
| rest | with mainClass.`Rogue` | name は小道具を手入れしつつ、気配を消して体力を戻している |
| rest | with mainClass.`Rogue` | name は硬貨を指で遊ばせ、緊張をほどいている |
| rest | with mainClass.`Rogue` | name は素早く包帯を巻き直し、何事もなかった顔で座り込んだ |
| rest | with mainClass.`Rogue` | name は耳を澄ませたまま、短い休息で鋭さを取り戻している |
| rest | with mainClass.`Rogue` | name は刃先の汚れを落とし、次の隙を狙う準備をしている |
| rest | with mainClass.`Rogue` | name は仲間の会話に紛れ、さりげなく情報を拾っている |
| rest | with mainClass.`Rogue` | name は崩れた呼吸を整え、平然とした笑みを浮かべた |
| rest | with mainClass.`Rogue` | name は目立たぬ位置で体を丸め、疲労をやり過ごしている |
| rest | with mainClass.`Rogue` | name は次の手を考えながら、静かに回復の時間を稼いでいる |
| rest | with mainClass.`Pilgrim` | name は静かに手を合わせ、回復への感謝を胸に休んでいる |
| rest | with mainClass.`Pilgrim` | name は仲間へ水を配り、自身も穏やかに腰を下ろした |
| rest | with mainClass.`Pilgrim` | name は短い祈句を唱え、荒れた心を落ち着けている |
| rest | with mainClass.`Pilgrim` | name は傷口を清め、丁寧な所作で体を休めている |
| rest | with mainClass.`Pilgrim` | name は焚き火の前で目を閉じ、静謐の中に身を置いている |
| rest | with mainClass.`Pilgrim` | name は仲間の無事を願いつつ、ゆっくり呼吸を整えている |
| rest | with mainClass.`Pilgrim` | name は旅装をたたみ、無理のない姿勢で休息している |
| rest | with mainClass.`Pilgrim` | name は柔らかな声で励まし、皆の不安を和らげている |
| rest | with mainClass.`Pilgrim` | name は小さな灯に祈りを託し、体力の回復を待っている |
| rest | with mainClass.`Pilgrim` | name は明日の道行きを思い、静かな決意とともに休んでいる |
| rest | with race.`Caninian` | name は鼻先を地面へ近づけ、安心できる匂いを確かめながら休んでいる |
| rest | with race.`Caninian` | name は耳をぴくりと動かし、仲間の気配を聞き分けつつ体を休めている |
| rest | with race.`Caninian` | name は尻尾をゆるく揺らし、警戒を解いて穏やかに座り込んだ |
| rest | with race.`Caninian` | name は焚き火のそばで前脚を伸ばし、長い行軍の疲れを抜いている |
| rest | with race.`Caninian` | name は仲間の荷を守る位置に伏せ、静かに呼吸を整えている |
| rest | with race.`Caninian` | name は喉を潤してから低く息をつき、落ち着いた表情で休んでいる |
| rest | with race.`Caninian` | name は風向きを確かめる仕草を見せたあと、ゆっくり目を閉じた |
| rest | with race.`Caninian` | name は足裏の土を払ってから身を丸め、体温を保ちながら休息している |
| rest | with race.`Caninian` | name は仲間へ短くうなずき、見張りの交代まで静かに力を蓄えている |
| rest | with race.`Caninian` | name は遠吠えをこらえるように空を見上げ、心を落ち着けている |
| rest | with race.`Lupinian` | name は低く腰を下ろし、いつでも動ける姿勢のまま息を整えている |
| rest | with race.`Lupinian` | name は肩の筋をほぐし、激しい突撃で溜まった疲労を抜いている |
| rest | with race.`Lupinian` | name は鋭い眼差しを少し和らげ、焚き火の熱で体を温めている |
| rest | with race.`Lupinian` | name は前腕の傷を確かめ、静かに包帯を巻き直している |
| rest | with race.`Lupinian` | name は荒野の匂いを懐かしむように深呼吸し、心を鎮めている |
| rest | with race.`Lupinian` | name は仲間の背を守る位置で膝を抱え、無言で休息している |
| rest | with race.`Lupinian` | name は喉を鳴らすような低い息を漏らし、張り詰めた気を解いている |
| rest | with race.`Lupinian` | name は夜風に耳を向けつつ、必要最小限の動きで体力を温存している |
| rest | with race.`Lupinian` | name は足首を回して踏み込みの感覚を確かめ、再び腰を下ろした |
| rest | with race.`Lupinian` | name は群れの一員として仲間の無事を確かめ、安堵して休んでいる |
| rest | with race.`Vulpinian` | name は衣の乱れを整えてから座り、静かに呼吸を深めている |
| rest | with race.`Vulpinian` | name は細い指で茶器を温め、香りとともに緊張を解いている |
| rest | with race.`Vulpinian` | name は耳先をわずかに伏せ、慎重さを保ったまま休息している |
| rest | with race.`Vulpinian` | name は焚き火の明かりを眺め、次の一手を静かに思案している |
| rest | with race.`Vulpinian` | name は仲間の会話に微笑みを返しつつ、気力の回復に努めている |
| rest | with race.`Vulpinian` | name は小袋の口を閉じ直し、道具を揃えてから目を閉じた |
| rest | with race.`Vulpinian` | name は喉の渇きを潤し、澄んだ声を取り戻すように休んでいる |
| rest | with race.`Vulpinian` | name は尻尾をそっと体へ巻きつけ、冷気を避けて身を休めた |
| rest | with race.`Vulpinian` | name は穏やかな所作で膝を抱え、物音を聞きながら英気を養っている |
| rest | with race.`Vulpinian` | name は一礼するように頭を下げ、静かな夜へ身を委ねている |
| rest | with race.`Ursan` | name は大きな背を岩に預け、深い呼吸で疲労を吐き出している |
| rest | with race.`Ursan` | name は分厚い手で肩を揉み、重装備の負担をゆっくりほどいている |
| rest | with race.`Ursan` | name は焚き火の熱を受けながら、仲間を見守るように休んでいる |
| rest | with race.`Ursan` | name は低くうなってから静かになり、心身の力を蓄えている |
| rest | with race.`Ursan` | name は包帯の結び目を確かめ、痛みを押さえつつ腰を下ろした |
| rest | with race.`Ursan` | name は仲間へ毛布を回してから、自分もようやく目を閉じた |
| rest | with race.`Ursan` | name は足を投げ出して座り、張り詰めた筋肉をほぐしている |
| rest | with race.`Ursan` | name は大きな手のひらで湯杯を包み、体の芯を温めている |
| rest | with race.`Ursan` | name は見張りの交代を確認し、安心した表情で休息に入った |
| rest | with race.`Ursan` | name は静かな鼻息を立て、揺るがぬ落ち着きで回復している |
| rest | with race.`Felidian` | name は音を立てない歩みで寝床へ移り、しなやかに身を丸めた |
| rest | with race.`Felidian` | name は耳を澄ませたまま目を細め、浅く長い呼吸で疲れを抜いている |
| rest | with race.`Felidian` | name は手首のこわばりをほぐし、軽い身のこなしを取り戻している |
| rest | with race.`Felidian` | name は焚き火から少し離れた影で、静かに体温を保っている |
| rest | with race.`Felidian` | name は仲間の足音を聞き分け、安心して尻尾をゆるく揺らした |
| rest | with race.`Felidian` | name は短く伸びをしてから座り直し、目元の緊張を解いている |
| rest | with race.`Felidian` | name は喉を鳴らすように穏やかな息をつき、心を落ち着けている |
| rest | with race.`Felidian` | name は包み布にくるまり、冷えた指先を温めながら休んでいる |
| rest | with race.`Felidian` | name は細かな傷を丁寧に拭い、無理せず回復を優先している |
| rest | with race.`Felidian` | name は夜空へ視線を投げ、静かな自信を取り戻している |
| rest | with race.`Mustelid` | name は荷の結び目を再確認し、段取りを整えてから腰を下ろした |
| rest | with race.`Mustelid` | name は小さな帳面を閉じ、取引の計算を頭から離して休んでいる |
| rest | with race.`Mustelid` | name は器用な手つきで道具を並べ、乱れのない状態で息をついた |
| rest | with race.`Mustelid` | name は湯をひと口含み、せわしない思考を静かに鎮めている |
| rest | with race.`Mustelid` | name は仲間の補給品を数え終え、満足げに背を伸ばした |
| rest | with race.`Mustelid` | name は外套の内ポケットを確かめ、安心してまぶたを閉じた |
| rest | with race.`Mustelid` | name は周囲の気配を素早く点検し、短時間で効率よく休んでいる |
| rest | with race.`Mustelid` | name は足の疲れを揉みほぐし、次の移動に備えている |
| rest | with race.`Mustelid` | name は焚き火の明るさを調整し、皆が休みやすい場を作った |
| rest | with race.`Mustelid` | name は物資袋を枕にして横になり、計画通りに英気を養っている |
| rest | with race.`Leporian` | name は耳をぴんと立てて周囲を確かめ、安心して腰を下ろした |
| rest | with race.`Leporian` | name は軽やかに足を投げ出し、跳躍で張った脚をほぐしている |
| rest | with race.`Leporian` | name は水筒を両手で包み、弾む鼓動をゆっくり落ち着けている |
| rest | with race.`Leporian` | name は仲間に笑顔を向けてから目を閉じ、短い休息へ入った |
| rest | with race.`Leporian` | name は外套の裾を整え、すぐ動ける姿勢のまま体力を戻している |
| rest | with race.`Leporian` | name は足首を回し、着地の感覚を確かめてから深呼吸した |
| rest | with race.`Leporian` | name は焚き火の温かさに耳先を寄せ、冷えた体を温めている |
| rest | with race.`Leporian` | name は小さく鼻歌を口ずさみ、緊張を和らげながら休んでいる |
| rest | with race.`Leporian` | name は薬草の香りを吸い込み、心身を整えるように静かに座っている |
| rest | with race.`Leporian` | name は明日の先行偵察を思い描き、前向きな気持ちで息を整えている |
| rest | with race.`Cervin` | name は背筋を正して座り、静かな瞑想で疲労をほどいている |
| rest | with race.`Cervin` | name は記録帳を閉じ、観測結果を整理し終えてから休息に入った |
| rest | with race.`Cervin` | name は温茶の湯気を見つめ、乱れた思考を穏やかに整えている |
| rest | with race.`Cervin` | name は仲間の会話に耳を傾けつつ、静かに体力を回復している |
| rest | with race.`Cervin` | name は杖を膝に置き、支援の責任を一度手放して息をついた |
| rest | with race.`Cervin` | name は呼吸を数えながら、焦りを抑えて心を落ち着けている |
| rest | with race.`Cervin` | name は夜風の温度を確かめ、皆の寝具配置をそっと見直した |
| rest | with race.`Cervin` | name は小さな護符に触れ、無事への感謝を胸に目を閉じている |
| rest | with race.`Cervin` | name は足元の泥を払ってから腰を下ろし、穏やかに英気を養っている |
| rest | with race.`Cervin` | name は次の行程を頭でなぞり、安心できる結論を得てから休んだ |
| rest | with race.`Procyonian` | name は荷の影に身を預け、周囲の死角を確認してから休んでいる |
| rest | with race.`Procyonian` | name は指先で仕掛け紐を解きほぐし、緊張を抜くように息をついた |
| rest | with race.`Procyonian` | name は静かな笑みで仲間へ合図し、見張り交代まで体力を温存している |
| rest | with race.`Procyonian` | name は足音を消す癖のまま歩幅を整え、その場で膝を抱えて休んだ |
| rest | with race.`Procyonian` | name は小袋の中身を整頓し、必要品だけを手元に残している |
| rest | with race.`Procyonian` | name はフードを少し深くし、気配を薄めたまま目を閉じている |
| rest | with race.`Procyonian` | name は焚き火の明暗を利用して身を隠し、静かに呼吸を整えている |
| rest | with race.`Procyonian` | name は軽く肩をすくめ、張り詰めた空気を冗談で和らげてから休んだ |
| rest | with race.`Procyonian` | name は回収した道具を丁寧に拭い、次の任務へ備えている |
| rest | with race.`Procyonian` | name はいたずらめいた目を細め、疲労を悟らせぬまま英気を養っている |
| rest | with race.`Murid` | name は小さな寝床へ身を収め、物音に備えつつ静かに休んでいる |
| rest | with race.`Murid` | name は細い指で針具を片づけ、修繕作業を終えてから息をついた |
| rest | with race.`Murid` | name は足取りの疲れを確かめ、巻布を締め直して体勢を整えている |
| rest | with race.`Murid` | name は仲間の死角を埋める位置に座り、警戒を保ったまま休息している |
| rest | with race.`Murid` | name は水を少しずつ飲み、乾いた喉と集中力を回復している |
| rest | with race.`Murid` | name は短弓を抱えたまま目を閉じ、気配を消して体力を戻している |
| rest | with race.`Murid` | name は荷袋の口を結び直し、いつでも動ける準備を維持している |
| rest | with race.`Murid` | name は焚き火の端で膝を抱え、温もりを分けてもらいながら休んでいる |
| rest | with race.`Murid` | name は仲間に小さくうなずき、無理のない呼吸で心を落ち着けている |
| rest | with race.`Murid` | name は夜の静けさに溶け込むように、慎ましく英気を養っている |
| feast | none | nameはビールを追加で注文した |
| feast | none | name は焼きたての料理を頬張って笑みをこぼした |
| feast | none | name は香ばしい匂いに誘われて席についた |
| feast | none | name は山盛りの皿を前に満足げにうなずいた |
| feast | none | name は仲間と杯を交わし今日の武勇を語っている |
| feast | none | name は甘いデザートまでしっかり平らげた |
| feast | none | name は豪快に肉を切り分けて配っている |
| feast | none | name は温かなスープで冷えた体をほぐしている |
| feast | none | name は食卓を囲み、明日の計画を練っている |
| feast | none | name は最後の一口まで味わい尽くしている |
| feast | with mainClass.`Lord` | name は見栄を張って店を貸し切った |
| feast | with mainClass.`Rogue` | name は手品のように肉を切り分け、気づけば自分の皿を山盛りにしていた |
| feast | with mainClass.`Rogue` | name は店主の死角を突いて限定酒を確保し、仲間に得意げに注いだ |
| feast | with mainClass.`Rogue` | name は誰より早く焼き上がりを嗅ぎ取り、熱々の串をさらっていった |
| feast | with mainClass.`Rogue` | name は会話の隙に皿をすり替え、より豪華な一品を手に入れていた |
| feast | with mainClass.`Rogue` | name は軽口を飛ばしながら店員と打ち解け、裏メニューを引き出した |
| feast | with mainClass.`Rogue` | name は銀貨を弾いて賭けを始め、勝ち分で追加料理を注文した |
| feast | with mainClass.`Rogue` | name は一口ごとに味を見抜き、隠し香辛料まで言い当ててみせた |
| feast | with mainClass.`Rogue` | name は周囲の視線を散らしてから一番人気の皿を確保し、涼しい顔で頬張った |
| feast | with mainClass.`Rogue` | name は音もなく席を移って情報を拾い、戻る頃には次の獲物の話をしていた |
| feast | with mainClass.`Rogue` | name は乾杯の輪を渡り歩き、最終的に一番上等な酒の前へ落ち着いた |
| feast | with mainClass.`Lord` | name は給仕を呼び、最上級のワインを惜しみなく振る舞った |
| feast | with mainClass.`Lord` | name は山海の珍味を並べさせ、満足げに頷いている |
| feast | with mainClass.`Lord` | name は金貨の袋を卓上に置き、宴の延長を命じた |
| feast | with mainClass.`Lord` | name は楽師団まで招き入れ、華やかな夜を演出している |
| feast | with mainClass.`Lord` | name は一番高い樽酒を開けさせ、仲間へ次々と注いで回った |
| feast | with mainClass.`Lord` | name は豪奢な皿を追加させ、客席にどよめきを広げた |
| feast | with mainClass.`Lord` | name は宴席の全員分を払い、誇らしげに杯を掲げている |
| feast | with mainClass.`Lord` | name は店主に特別料理を求め、卓を王侯の晩餐へ変えた |
| feast | with mainClass.`Lord` | name は金細工の食器まで借り受け、贅沢の限りを尽くしている |
| feast | with mainClass.`Lord` | name は今宵は無礼講だと宣言し、豪勢な祝宴を主催した |
| feast | with mainClass.`Fighter` | name は大皿の肉を軽々と持ち上げ、仲間へ豪快に取り分けた |
| feast | with mainClass.`Fighter` | name は骨付き肉を平らげ、次の一皿を力強く注文した |
| feast | with mainClass.`Fighter` | name は重たい樽を運んで場を沸かせ、笑い声を引き出した |
| feast | with mainClass.`Fighter` | name は食卓を守る盾のように中央に陣取り、皆に料理を回している |
| feast | with mainClass.`Fighter` | name は焼き網の前で腕を振るい、山盛りの串を次々仕上げた |
| feast | with mainClass.`Fighter` | name は空いた皿を見つけるたびに追加を頼み、宴の勢いを保っている |
| feast | with mainClass.`Fighter` | name は豪快な乾杯で場の空気を一気に明るくした |
| feast | with mainClass.`Fighter` | name は温かい煮込みを大鍋ごと運び、皆を驚かせた |
| feast | with mainClass.`Fighter` | name は一口ごとにうなずき、力が満ちるのを実感している |
| feast | with mainClass.`Fighter` | name は最後まで食欲を落とさず、頼もしい笑顔を見せた |
| feast | with mainClass.`Duelist` | name はナイフさばきで料理を美しく切り分け、卓上を沸かせた |
| feast | with mainClass.`Duelist` | name は薄切りの肉を芸術のように並べ、仲間の視線を集めている |
| feast | with mainClass.`Duelist` | name は杯を掲げる所作まで優雅で、宴の空気を引き締めた |
| feast | with mainClass.`Duelist` | name は一口ごとの味の違いを語り、通な表情で微笑んだ |
| feast | with mainClass.`Duelist` | name は店主と軽妙な会話を交わし、逸品を引き出してみせた |
| feast | with mainClass.`Duelist` | name は皿の盛り付けを整え、見た目にも華やかな一卓に仕上げた |
| feast | with mainClass.`Duelist` | name は乾杯のタイミングを見計らい、場を美しくまとめ上げた |
| feast | with mainClass.`Duelist` | name は繊細な火入れを見抜き、職人の腕前を称賛している |
| feast | with mainClass.`Duelist` | name は静かな自信を漂わせつつ、気品ある食事を楽しんでいる |
| feast | with mainClass.`Duelist` | name は剣先のように鋭い舌で味を評し、仲間を感心させた |
| feast | with mainClass.`Ninja` | name は気配を消して厨房へ現れ、出来立ての一皿を運んできた |
| feast | with mainClass.`Ninja` | name は音もなく席を移り、気づけば皆の杯を満たしていた |
| feast | with mainClass.`Ninja` | name は香辛料の配合を見抜き、絶妙な味付けを再現してみせた |
| feast | with mainClass.`Ninja` | name は素早く串を返し、焼き加減ぴったりで配り始めた |
| feast | with mainClass.`Ninja` | name は目にも止まらぬ手つきで果物を刻み、見事な盛り合わせを作った |
| feast | with mainClass.`Ninja` | name は最小の動きで卓を整え、混雑した宴席を快適にしている |
| feast | with mainClass.`Ninja` | name は静かな笑みで追加料理を差し出し、誰より先に気を配った |
| feast | with mainClass.`Ninja` | name は背後の気配まで読み取り、絶妙なタイミングで乾杯を合わせた |
| feast | with mainClass.`Ninja` | name は夜風を読んで火加減を調整し、香ばしい香りを広げた |
| feast | with mainClass.`Ninja` | name は影のように働き、宴の裏方を完璧に支えている |
| feast | with mainClass.`Samurai` | name は姿勢を正して杯を受け取り、礼節ある乾杯を先導した |
| feast | with mainClass.`Samurai` | name は丁寧に料理を分け、年少の仲間へ先に勧めている |
| feast | with mainClass.`Samurai` | name は一椀ずつ味わい、素材への敬意を言葉にした |
| feast | with mainClass.`Samurai` | name は静かに箸を置き、今日の戦いを簡潔に語っている |
| feast | with mainClass.`Samurai` | name は出汁の香りに目を細め、満足げにうなずいた |
| feast | with mainClass.`Samurai` | name は店主へ深く礼を述べ、誠意あるもてなしに応えた |
| feast | with mainClass.`Samurai` | name は無駄のない所作で魚をさばき、見事な一皿を仕上げた |
| feast | with mainClass.`Samurai` | name は杯を掲げ、仲間の健勝を静かに祈っている |
| feast | with mainClass.`Samurai` | name は熱い茶で口を整え、次の料理を端正に味わった |
| feast | with mainClass.`Samurai` | name は宴の終わりに場を清めるように卓を整えて立ち上がった |
| feast | with mainClass.`Ranger` | name は森の香草を見分け、料理にぴったりの香りを添えた |
| feast | with mainClass.`Ranger` | name は獲物話に花を咲かせ、皆の食欲をさらに刺激している |
| feast | with mainClass.`Ranger` | name は焼き具合を見極め、最も旨い瞬間で配り始めた |
| feast | with mainClass.`Ranger` | name は木の実のソースを即興で作り、卓に新鮮な驚きを加えた |
| feast | with mainClass.`Ranger` | name は外の風を確かめ、焚き火の位置を調整して快適にした |
| feast | with mainClass.`Ranger` | name は地酒と燻製の相性を語り、仲間から歓声を浴びた |
| feast | with mainClass.`Ranger` | name は食材の鮮度を一目で見抜き、最良の皿を選んでいる |
| feast | with mainClass.`Ranger` | name は旅先で覚えた保存食の工夫を披露し、店主をうならせた |
| feast | with mainClass.`Ranger` | name は静かな笑顔で杯を受け、自然の恵みに感謝している |
| feast | with mainClass.`Ranger` | name は仲間の好みを覚えていて、最適な料理を次々勧めた |
| feast | with mainClass.`Wizard` | name は香り立つスープに小さな魔法を添え、温かさを長持ちさせた |
| feast | with mainClass.`Wizard` | name は甘味の風味を精密に調整し、理想の一口を作り上げた |
| feast | with mainClass.`Wizard` | name は空中に光の記号を描き、宴席を幻想的に照らしている |
| feast | with mainClass.`Wizard` | name は古文書の知識を語りながら、珍しい料理の由来を解説した |
| feast | with mainClass.`Wizard` | name は湯気の流れを操って香りを広げ、食欲を高めた |
| feast | with mainClass.`Wizard` | name は一口ごとに元素の調和を語り、仲間を不思議と納得させた |
| feast | with mainClass.`Wizard` | name は葡萄酒の色合いを観察し、最良の飲み頃を言い当てた |
| feast | with mainClass.`Wizard` | name は小さな火花で演出を加え、乾杯の瞬間を鮮やかに彩った |
| feast | with mainClass.`Wizard` | name は魔導杖を立てかけ、珍味を前に少年のように目を輝かせた |
| feast | with mainClass.`Wizard` | name は最後に香草茶を淹れ、宴の余韻を静かに整えている |
| feast | with mainClass.`Sage` | name は食材の効能を語り、体調に合わせた料理を勧めている |
| feast | with mainClass.`Sage` | name は一皿ごとの栄養バランスを見て、理にかなった献立に感心した |
| feast | with mainClass.`Sage` | name は仲間の疲労を見抜き、回復に良い温料理を取り分けた |
| feast | with mainClass.`Sage` | name は静かな口調で旅の教訓を語り、卓に落ち着きをもたらした |
| feast | with mainClass.`Sage` | name は香草の調合法を店主に伝え、さらに深い味わいを引き出した |
| feast | with mainClass.`Sage` | name は祈りにも似た所作で杯を掲げ、仲間の成長を称えている |
| feast | with mainClass.`Sage` | name は食後の茶を丁寧に淹れ、心まで温まる時間を作った |
| feast | with mainClass.`Sage` | name は異国の食文化を引き合いに出し、談笑を知的に盛り上げた |
| feast | with mainClass.`Sage` | name は控えめに微笑みながら、最も必要な一皿を見極めている |
| feast | with mainClass.`Sage` | name は宴の終盤に明日の行程を整理し、皆を安心させた |
| feast | with mainClass.`Pilgrim` | name は感謝の言葉を添えて一口ずつ味わい、静かな喜びを示した |
| feast | with mainClass.`Pilgrim` | name は貧しい旅人にも料理を分け、温かな拍手を受けた |
| feast | with mainClass.`Pilgrim` | name は祈りを捧げてから杯を取り、宴に厳かな空気を添えた |
| feast | with mainClass.`Pilgrim` | name は素朴な料理の尊さを語り、仲間の心を和ませている |
| feast | with mainClass.`Pilgrim` | name は店主の労をねぎらい、丁寧に礼を述べて席へ戻った |
| feast | with mainClass.`Pilgrim` | name は歌うような祈句で乾杯を導き、場をひとつにした |
| feast | with mainClass.`Pilgrim` | name は温かなパンを配り、空腹だった仲間を優しく支えた |
| feast | with mainClass.`Pilgrim` | name は質素な一皿にも満面の笑みを向け、感謝を忘れない |
| feast | with mainClass.`Pilgrim` | name は旅で出会った善意を語り、宴席に穏やかな希望を灯した |
| feast | with mainClass.`Pilgrim` | name は食後に静かに祈り、皆の明日を祝福している |
| feast | with mainClass.`Rogue` | name は店の裏動線を把握し、一番早く出来立て料理を確保した |
| feast | with mainClass.`Rogue` | name は会計の流れを見切って、無駄なく追加注文を通している |
| feast | with mainClass.`Rogue` | name は密かな情報交換を進めつつ、表向きは陽気に笑っていた |
| feast | with mainClass.`Rogue` | name は誰も気づかぬうちに空いた杯を満たし、場の主導権を握った |
| feast | with mainClass.`Rogue` | name は軽妙な口上で人気料理を引き当て、仲間へ分け与えた |
| feast | with mainClass.`Rogue` | name は店主の癖を読み、最良のタイミングで特注を通した |
| feast | with mainClass.`Rogue` | name は笑い話に紛れて有益な噂を拾い、次の遠征に備えている |
| feast | with mainClass.`Rogue` | name は絶妙な駆け引きで席順を整え、交渉しやすい空気を作った |
| feast | with mainClass.`Rogue` | name は指先の器用さで果物を飾り切りし、卓を華やかにした |
| feast | with mainClass.`Rogue` | name は最後に上等な酒を確保し、勝ち誇った笑みを見せた |
| feast | with mainClass.`Lord` | name は街の名士を招き入れ、宴をさらに壮大なものへ変えた |
| feast | with mainClass.`Lord` | name は料理長へ追加報酬を渡し、最高の献立を約束させた |
| feast | with mainClass.`Lord` | name は高価な香辛料を惜しみなく使わせ、卓を格別に彩った |
| feast | with mainClass.`Lord` | name は全員の杯を黄金色の酒で満たし、満悦の笑みを浮かべた |
| feast | with mainClass.`Lord` | name は祝砲代わりに栓を抜かせ、豪快な音で場を盛り上げた |
| feast | with mainClass.`Lord` | name は遠征の功績を称える演説を行い、仲間の士気を高めた |
| feast | with mainClass.`Lord` | name は特等席を仲間に譲り、器の大きさを示してみせた |
| feast | with mainClass.`Lord` | name は宴の費用を二重で支払い、店中を驚かせた |
| feast | with mainClass.`Lord` | name は祝宴の締めに希少な甘味を振る舞い、歓声をさらった |
| feast | with mainClass.`Lord` | name は今夜の宴を伝説にすると宣言し、堂々と杯を掲げた |
| sell | none | selling item を auto-sell price Gで売却交渉中 |
| sell | none | name は selling item の値札を見て少し首をかしげた |
| sell | none | name は売り場で selling item の相場を探っている |
| sell | none | name は小銭を数えながら selling item の取引を進めている |
| sell | none | name は慎重に言葉を選びつつ selling item を差し出した |
| sell | none | name は店主の反応を見ながら selling item の価格を探っている |
| sell | none | name は売却台帳に selling item の記録をつけている |
| sell | none | name は客の目線を読みつつ selling item を見せている |
| sell | none | name は selling item を磨いて少しでも高く売ろうとしている |
| sell | none | name は売上袋にコインをしまい、次の品を取り出した |
| sell | with ability. `a.cunning` | name は店主にselling item の価値を大袈裟にアピールしている( auto-sell price G) |
| sound_sleep | with race.`Caninian` | name は 未知なる地の探検を夢の中で夢見ている |
| sound_sleep | none | name はぐっすり眠り、次の遠征に備えている |
| sound_sleep | none | name は深い眠りの中で体力をしっかり回復している |
| sound_sleep | none | name は穏やかな寝息を立てて安心しきっている |
| sound_sleep | none | name は朝まで一度も目を覚まさず眠り続けた |
| sound_sleep | none | name は疲れを忘れるほど深く眠りに沈んでいる |
| sound_sleep | none | name は静かな夜に包まれて完全に休息している |
| sound_sleep | none | name はどんな物音にも動じず熟睡している |
| sound_sleep | none | name は夢も見ないほどの深い眠りにいる |
| sound_sleep | none | name は体の隅々まで力が抜けて眠っている |
| sound_sleep | none | name は十分な休息を得て顔色が良くなっている |
| nap_sleep | none | name は短い仮眠で疲れを払っている |
| nap_sleep | none | name は壁にもたれて目を閉じ、少しだけ眠った |
| nap_sleep | none | name はほんの数分の眠りで集中力を取り戻した |
| nap_sleep | none | name は荷物を枕にして手早く仮眠を取っている |
| nap_sleep | none | name は浅い眠りで体を軽く休めている |
| nap_sleep | none | name は短時間でも確実に気力を回復している |
| nap_sleep | none | name は仲間に見張りを任せてひと休みしている |
| nap_sleep | none | name は小休止の間に目元の疲れを取っている |
| nap_sleep | none | name は眠気を断ち切るために短い仮眠を選んだ |
| nap_sleep | none | name は立て直しのためにわずかな睡眠を取った |
| outfit | none | 身支度を整えている |
| outfit | with race.`Caninian` | name は首輪飾りを軽く締め直し、先頭を切る気配を整えている |
| outfit | with race.`Caninian` | name は外套の裾を払って鼻先で風向きを確かめ、出発の合図を待っている |
| outfit | with race.`Caninian` | name は仲間の荷紐を順に見回し、遠征前の点検を手早く終えた |
| outfit | with race.`Caninian` | name は胸当てを叩いて装着感を確かめ、頼れる足取りで立っている |
| outfit | with race.`Caninian` | name は靴紐を強く結び、長い踏破にも耐える準備を整えた |
| outfit | with race.`Caninian` | name は地図の端を指でなぞり、探索の順路を頭に入れている |
| outfit | with race.`Caninian` | name は水筒の留め具を確認し、補給の段取りを静かに固めた |
| outfit | with race.`Caninian` | name は肩掛け鞄を背負い直し、未知の地へ向かう意欲を見せている |
| outfit | with race.`Caninian` | name は仲間へ短くうなずき、護衛の位置取りを決めている |
| outfit | with race.`Caninian` | name は姿勢を正して立ち、探検の開始を誇らしげに待っている |
| outfit | with race.`Lupinian` | name は革鎧の留め金を締め、荒野を駆ける体勢を作っている |
| outfit | with race.`Lupinian` | name は肩当てを噛み合わせ、衝突にも揺るがぬ構えに整えた |
| outfit | with race.`Lupinian` | name は帯剣の位置を低く直し、素早い踏み込みへ備えている |
| outfit | with race.`Lupinian` | name は手甲を軽く打ち鳴らし、闘志を高めるように息を整えた |
| outfit | with race.`Lupinian` | name は膝当ての角度を直し、突進の軸をぶらさぬ準備をした |
| outfit | with race.`Lupinian` | name は背嚢を締め直し、長距離行軍でも崩れない形へ整えている |
| outfit | with race.`Lupinian` | name は夜目用の布を巻き、薄明かりでの索敵に備えた |
| outfit | with race.`Lupinian` | name は仲間と目配せを交わし、連携突撃の呼吸を合わせている |
| outfit | with race.`Lupinian` | name は足首の紐を結び直し、跳躍の反発を確かめた |
| outfit | with race.`Lupinian` | name は低い唸りを漏らしつつ、戦場へ向かう覚悟を固めている |
| outfit | with race.`Vulpinian` | name は装束の皺を丁寧に伸ばし、隙のない身なりを整えている |
| outfit | with race.`Vulpinian` | name は袖口の飾り紐を結び直し、所作が崩れぬよう仕上げた |
| outfit | with race.`Vulpinian` | name は細身の外套を羽織り、軽快な移動に向いた形へ整えた |
| outfit | with race.`Vulpinian` | name は小袋の封を確かめ、必要物資を即座に取り出せるようにした |
| outfit | with race.`Vulpinian` | name は腰帯の位置を微調整し、武具と道具の重さを均等にしている |
| outfit | with race.`Vulpinian` | name は鏡面金具に姿を映し、表情を整えてから一礼した |
| outfit | with race.`Vulpinian` | name は手袋の指先をならし、繊細な作業にも備えている |
| outfit | with race.`Vulpinian` | name は仲間の装いを褒めつつ、自分の結び目も抜かりなく直した |
| outfit | with race.`Vulpinian` | name は香油をひとしずくまとい、集中を高める呼吸を取っている |
| outfit | with race.`Vulpinian` | name は軽やかに身を翻し、華麗な出立の準備を終えた |
| outfit | with race.`Ursan` | name は胸当てを深く締め、揺るがぬ前衛の姿を作っている |
| outfit | with race.`Ursan` | name は肩口の防具を押し込み、重撃にも耐える固定を確かめた |
| outfit | with race.`Ursan` | name は腰帯を結び直し、荷重を受ける体幹を整えている |
| outfit | with race.`Ursan` | name は籠手を握り込み、守りの厚さを確かめるようにうなずいた |
| outfit | with race.`Ursan` | name は背中の荷を高く背負い、味方をかばう姿勢を取りやすくした |
| outfit | with race.`Ursan` | name は足甲の留め具を順に締め、地面を踏み抜く準備を固めた |
| outfit | with race.`Ursan` | name は防具の重みを受け止め、呼吸を一定に保っている |
| outfit | with race.`Ursan` | name は予備の包帯を差し込み、長期戦への備えを抜かりなくした |
| outfit | with race.`Ursan` | name は仲間を背で守る位置を確認し、静かに構えを取っている |
| outfit | with race.`Ursan` | name は大きく肩を回し、突撃を迎え撃つ準備を完了した |
| outfit | with race.`Felidian` | name は旅衣の襟を整え、しなやかな身のこなしに合わせている |
| outfit | with race.`Felidian` | name は手首の飾り紐を締め、素早い動作でも邪魔にならぬようにした |
| outfit | with race.`Felidian` | name は軽装の留め具を確かめ、無音の歩みに向いた形へ整えた |
| outfit | with race.`Felidian` | name は靴底を軽く払って足運びを確認し、満足げにうなずいた |
| outfit | with race.`Felidian` | name は小さな護符を胸元に収め、気持ちを落ち着けている |
| outfit | with race.`Felidian` | name は外套のフード角度を直し、視界を遮らぬよう調整した |
| outfit | with race.`Felidian` | name は腰の小袋を並べ替え、必要な道具へ即座に触れられるようにした |
| outfit | with race.`Felidian` | name は毛並みを整えるように装備を払って、集中を高めている |
| outfit | with race.`Felidian` | name は仲間の足並みを見て、先導と援護の位置を決めた |
| outfit | with race.`Felidian` | name は静かな笑みを浮かべ、軽快な出発の瞬間を待っている |
| outfit | with race.`Mustelid` | name は道具袋の口を広げ、商才を活かす備品確認を進めている |
| outfit | with race.`Mustelid` | name は肩掛けを斜めに直し、移動中でも荷を取り出しやすくした |
| outfit | with race.`Mustelid` | name は手袋の縫い目を確かめ、細かな作業に備えている |
| outfit | with race.`Mustelid` | name は矢筒の紐を締め、補充動作が滑らかになるよう調整した |
| outfit | with race.`Mustelid` | name は懐の帳面を閉じ、遠征用の取引計画を頭に刻んでいる |
| outfit | with race.`Mustelid` | name は靴紐を短くまとめ、走行時に絡まぬ形へ整えた |
| outfit | with race.`Mustelid` | name はベルトの金具を打って固定し、揺れによる音を抑えている |
| outfit | with race.`Mustelid` | name は仲間の消耗品を数え、必要分を配る支度を終えた |
| outfit | with race.`Mustelid` | name は荷の重心を寄せ、長距離移動に強い背負い方へ変えた |
| outfit | with race.`Mustelid` | name は素早く身を翻して、機動力重視の装いを完成させた |
| outfit | with race.`Leporian` | name は耳元の飾り布を整え、視界の邪魔にならぬようにした |
| outfit | with race.`Leporian` | name は軽鎧の留め紐をきゅっと締め、跳躍時のぶれを抑えている |
| outfit | with race.`Leporian` | name は脚甲の角度を確かめ、連続移動に向いた姿勢を作った |
| outfit | with race.`Leporian` | name は弓帯を肩へ掛け直し、素早い射撃に備えている |
| outfit | with race.`Leporian` | name は小瓶の栓を確認し、補助薬を使いやすい位置へ並べた |
| outfit | with race.`Leporian` | name は袖口を折り返し、指先の操作精度を高めている |
| outfit | with race.`Leporian` | name は足元を軽く弾ませ、機敏な踏み込みを最終確認した |
| outfit | with race.`Leporian` | name は外套を短くまとめ、障害物に引っかからぬ形へ整えた |
| outfit | with race.`Leporian` | name は仲間の合図を待ちつつ、先行偵察の準備を固めている |
| outfit | with race.`Leporian` | name は深呼吸して緊張を解き、軽やかな出立へ心を合わせた |
| outfit | with race.`Cervin` | name は胸元の留め具を静かに締め、落ち着いた装いを整えている |
| outfit | with race.`Cervin` | name は外套の折り目を正し、知的な所作を崩さぬ準備をした |
| outfit | with race.`Cervin` | name は杖先を点検し、後衛支援の間合いを確認している |
| outfit | with race.`Cervin` | name は地図へ印を追記し、探索時の観測点を共有した |
| outfit | with race.`Cervin` | name は筆記具を腰へ収め、記録を即座に取れるよう整えた |
| outfit | with race.`Cervin` | name は袖の結び目を整え、詠唱時の動きを滑らかにしている |
| outfit | with race.`Cervin` | name は小さな護符を撫で、冷静な判断力を保つ呼吸を取った |
| outfit | with race.`Cervin` | name は仲間の役割を見直し、支援位置の最適化を終えた |
| outfit | with race.`Cervin` | name は靴の泥を払って歩幅を整え、長い行軍へ備えている |
| outfit | with race.`Cervin` | name は静かに視線を上げ、先を読むように出発時刻を待っている |
| outfit | with race.`Procyonian` | name は外套の内側を確かめ、隠し道具の収まりを見直している |
| outfit | with race.`Procyonian` | name は小袋の重さを量り、必要品だけを残して身軽にした |
| outfit | with race.`Procyonian` | name は帯の結び目を素早く解ける形に変え、緊急時へ備えた |
| outfit | with race.`Procyonian` | name は靴底を拭って足音を抑え、潜入向けの装いを整えている |
| outfit | with race.`Procyonian` | name は手首の仕掛け紐を巻き直し、道具操作の精度を高めた |
| outfit | with race.`Procyonian` | name はフードを深く被り、輪郭を目立たせない姿勢を取っている |
| outfit | with race.`Procyonian` | name は予備の投具を並べ替え、取り回しを最短にした |
| outfit | with race.`Procyonian` | name は仲間へ合図を送り、攪乱と回収の段取りを合わせている |
| outfit | with race.`Procyonian` | name は肩をすくめる仕草で緊張をほぐし、柔軟な対応に備えた |
| outfit | with race.`Procyonian` | name はいたずらめいた笑みを浮かべ、巧妙な出立を始めようとしている |
| outfit | with race.`Murid` | name は軽布の留め紐を丁寧に締め、素早い移動に向けて整えている |
| outfit | with race.`Murid` | name は腰袋の配置を入れ替え、必要な品へ迷わず手を伸ばせるようにした |
| outfit | with race.`Murid` | name は袖口を細くまとめ、狭い通路でも引っかからぬ準備をした |
| outfit | with race.`Murid` | name は足元の巻布を巻き直し、静かな歩みを維持している |
| outfit | with race.`Murid` | name は小さな針具を点検し、緊急修繕にも対応できるよう備えた |
| outfit | with race.`Murid` | name は肩掛けの重さを左右で揃え、長時間の偵察に耐える形へ整えた |
| outfit | with race.`Murid` | name は短弓の弦を確かめ、確実に射抜くための感覚を温めている |
| outfit | with race.`Murid` | name は仲間の死角を埋める位置を選び、支援の段取りを決めた |
| outfit | with race.`Murid` | name は深く息を吸って気配を薄め、見つかりにくい身支度を終えた |
| outfit | with race.`Murid` | name は小さくうなずき、慎重で確かな出発を選んでいる |
| outfit | with mainClass.`Fighter` | name は鎧の継ぎ目を締め直し、前線に立つ準備を整えている |
| outfit | with mainClass.`Fighter` | name は盾紐の長さを調整し、受け流しやすい構えを確認した |
| outfit | with mainClass.`Fighter` | name は手甲を叩いて装着感を確かめ、深くうなずいた |
| outfit | with mainClass.`Fighter` | name は剣帯の位置を低く直し、抜刀の軌道を最短にしている |
| outfit | with mainClass.`Fighter` | name は肩当ての留め具を締め、重さの偏りをなくしている |
| outfit | with mainClass.`Fighter` | name は予備の包帯を胸当てに差し込み、持久戦へ備えた |
| outfit | with mainClass.`Fighter` | name は靴紐を固く結び、踏み込みの安定を確かめている |
| outfit | with mainClass.`Fighter` | name は仲間の装備も一瞥し、守る順番を頭に入れた |
| outfit | with mainClass.`Fighter` | name は刃の反りを見て鞘に収め、静かに気合を入れている |
| outfit | with mainClass.`Fighter` | name は胸を張って立ち、出発の号令を待っている |
| outfit | with mainClass.`Duelist` | name は外套の裾を払って整え、軽やかな足さばきを確かめた |
| outfit | with mainClass.`Duelist` | name は鍔元を磨き、ひと太刀の美しさにこだわっている |
| outfit | with mainClass.`Duelist` | name は手首の角度を微調整し、最速の抜き打ちを準備した |
| outfit | with mainClass.`Duelist` | name は細身の剣を回し、重心の癖を最終確認している |
| outfit | with mainClass.`Duelist` | name は胸元の留め金を直し、所作が乱れないよう整えた |
| outfit | with mainClass.`Duelist` | name は鞘走りの音を確かめ、納得して一礼した |
| outfit | with mainClass.`Duelist` | name は手袋の皺を伸ばし、指先の感覚を研ぎ澄ませている |
| outfit | with mainClass.`Duelist` | name は鏡代わりの刃面を見て、姿勢をわずかに正した |
| outfit | with mainClass.`Duelist` | name は腰の角度を調整し、間合いを制する準備を終えた |
| outfit | with mainClass.`Duelist` | name は静かな笑みを浮かべ、華麗な一撃の機を待っている |
| outfit | with mainClass.`Ninja` | name は装束の結び目を増やし、走っても音が出ないようにした |
| outfit | with mainClass.`Ninja` | name は足袋の底を触って摩耗を確認し、忍び足に備えている |
| outfit | with mainClass.`Ninja` | name は苦無の位置を入れ替え、利き手で即座に抜けるよう整えた |
| outfit | with mainClass.`Ninja` | name は頭巾を深く被り、輪郭を影に溶かしている |
| outfit | with mainClass.`Ninja` | name は毒消しと煙玉を分けて仕舞い、緊急時の手順を固めた |
| outfit | with mainClass.`Ninja` | name は衣擦れの音を確かめるように軽く身をひねった |
| outfit | with mainClass.`Ninja` | name は袖口を締め、障害物に引っかからぬ形へ整えている |
| outfit | with mainClass.`Ninja` | name は影の濃い色布を選び、潜入向けに身支度を終えた |
| outfit | with mainClass.`Ninja` | name は巻物を胸元に固定し、気配を消して立っている |
| outfit | with mainClass.`Ninja` | name は頷きひとつで合図し、誰より先に出発位置へついた |
| outfit | with mainClass.`Samurai` | name は具足の紐を順に締め、乱れのない姿へ整えている |
| outfit | with mainClass.`Samurai` | name は刀の目釘を確かめ、静かに鞘へ納め直した |
| outfit | with mainClass.`Samurai` | name は袴の折り目を正し、礼を失わぬ装いを保っている |
| outfit | with mainClass.`Samurai` | name は佩刀の位置をわずかに上げ、居合の間を合わせた |
| outfit | with mainClass.`Samurai` | name は手拭いで鍔を拭い、澄んだ眼差しで前を見据えた |
| outfit | with mainClass.`Samurai` | name は草履紐を結び直し、踏み込みの軸を確かめている |
| outfit | with mainClass.`Samurai` | name は肩口の防具を打って固定し、構えの安定を高めた |
| outfit | with mainClass.`Samurai` | name は短く黙礼し、出陣の作法を整えている |
| outfit | with mainClass.`Samurai` | name は鎧通しを差し込み、近間での備えを万全にした |
| outfit | with mainClass.`Samurai` | name は姿勢を正したまま、静かに号令を待っている |
| outfit | with mainClass.`Ranger` | name は外套の留め具を軽くし、弓を引きやすい形に整えた |
| outfit | with mainClass.`Ranger` | name は矢羽の向きを揃え、矢筒の取り回しを最適化している |
| outfit | with mainClass.`Ranger` | name は靴底の泥を落とし、足跡を読みやすくしている |
| outfit | with mainClass.`Ranger` | name は革手袋を馴染ませ、弦を放つ指先の感覚を確かめた |
| outfit | with mainClass.`Ranger` | name は双眼鏡を胸元へ掛け、索敵の準備を終えている |
| outfit | with mainClass.`Ranger` | name は乾燥肉と水袋の位置を調整し、長距離行動へ備えた |
| outfit | with mainClass.`Ranger` | name は罠道具の紐を束ね、移動中に絡まぬよう整えている |
| outfit | with mainClass.`Ranger` | name は風向きを見て帽子の角度を変え、視界を確保した |
| outfit | with mainClass.`Ranger` | name は小さく屈伸し、森道での足運びを確認している |
| outfit | with mainClass.`Ranger` | name は地図を畳んで胸に収め、先導の準備を告げた |
| outfit | with mainClass.`Wizard` | name は法衣の袖を留め、詠唱時に邪魔が出ないよう整えた |
| outfit | with mainClass.`Wizard` | name は杖頭の宝珠を磨き、魔力の流れを確かめている |
| outfit | with mainClass.`Wizard` | name は触媒袋を分類し、必要な素材を取り出しやすくした |
| outfit | with mainClass.`Wizard` | name は術式札を並べ替え、優先呪文の順を決めている |
| outfit | with mainClass.`Wizard` | name は手袋の指先を開き、精密な印を結べるようにした |
| outfit | with mainClass.`Wizard` | name は魔導書の栞を挟み直し、即応詠唱の頁を固定した |
| outfit | with mainClass.`Wizard` | name は護符の結界を再点検し、暴発防止の準備を整えている |
| outfit | with mainClass.`Wizard` | name は眼鏡の位置を直し、魔法陣の細部へ視線を合わせた |
| outfit | with mainClass.`Wizard` | name は小声で起動句を反復し、発声の精度を高めている |
| outfit | with mainClass.`Wizard` | name は外套を翻して立ち、理論通りの戦闘開始を待った |
| outfit | with mainClass.`Sage` | name は記録板を閉じ、必要な助言だけを即座に出せるよう整えた |
| outfit | with mainClass.`Sage` | name は薬瓶の色帯を揃え、取り違えのない配置にしている |
| outfit | with mainClass.`Sage` | name は羽根ペンを耳へ挟み、観察結果を書き留める準備をした |
| outfit | with mainClass.`Sage` | name は巻物の順序を入れ替え、状況別の対処を整理している |
| outfit | with mainClass.`Sage` | name は静かに脈を取り、仲間の体調確認を終えた |
| outfit | with mainClass.`Sage` | name は防塵布で道具を覆い、精密器具を守る支度を整えた |
| outfit | with mainClass.`Sage` | name は腰袋の仕切りを増やし、試薬を安全に固定している |
| outfit | with mainClass.`Sage` | name は護身短杖を点検し、後衛の間合いを確認した |
| outfit | with mainClass.`Sage` | name は眼前の地図に印を付け、進路の根拠を共有している |
| outfit | with mainClass.`Sage` | name は深呼吸して思考を整え、冷静な指揮に備えた |
| outfit | with mainClass.`Lord` | name は胸当ての紋章を拭い、隊を率いる威厳を整えている |
| outfit | with mainClass.`Lord` | name は肩章の位置を直し、号令が届く姿勢を作った |
| outfit | with mainClass.`Lord` | name は指揮杖を握り直し、行軍の合図を確認している |
| outfit | with mainClass.`Lord` | name は外套の留め金を締め、風雨でも乱れぬ装いにした |
| outfit | with mainClass.`Lord` | name は作戦図を折り畳み、即座に展開できるよう差し込んだ |
| outfit | with mainClass.`Lord` | name は仲間の列を見渡し、配置の微調整を指示している |
| outfit | with mainClass.`Lord` | name は剣の飾り紐を結び直し、儀礼と実戦の均衡を保った |
| outfit | with mainClass.`Lord` | name は革靴の金具を鳴らし、行進開始の気配を作っている |
| outfit | with mainClass.`Lord` | name は短く激励を飛ばし、全員の士気を引き上げた |
| outfit | with mainClass.`Lord` | name は顎を上げて立ち、先頭へ進む覚悟を示した |
| outfit | with mainClass.`Rogue` | name は小袋の留め紐を緩め、必要な道具へ素早く触れられるようにした |
| outfit | with mainClass.`Rogue` | name は外套の内ポケットを確認し、隠し鍵の位置を覚え直した |
| outfit | with mainClass.`Rogue` | name は短剣の柄を布で巻き、滑らぬ握りへ整えている |
| outfit | with mainClass.`Rogue` | name は軽装のまま防具を分散し、目立たぬ防御を仕込んだ |
| outfit | with mainClass.`Rogue` | name は手首の仕込み針を試し、機会を逃さぬ準備を終えた |
| outfit | with mainClass.`Rogue` | name は靴音を確かめ、石床でも響かぬ歩幅へ調整した |
| outfit | with mainClass.`Rogue` | name は細いロープを腰に回し、撤退経路の備えを固めている |
| outfit | with mainClass.`Rogue` | name は笑みを作る練習をして、交渉用の顔を整えた |
| outfit | with mainClass.`Rogue` | name は錠前道具を指先で転がし、感覚を温めている |
| outfit | with mainClass.`Rogue` | name は何気ない仕草で装備を隠し、自然体を装っている |
| outfit | with mainClass.`Pilgrim` | name は旅衣の皺を伸ばし、祈りにふさわしい身なりを整えた |
| outfit | with mainClass.`Pilgrim` | name は護符を胸元へ掛け直し、加護の位置を確かめている |
| outfit | with mainClass.`Pilgrim` | name は念珠の糸を点検し、切れ目のない祈念に備えた |
| outfit | with mainClass.`Pilgrim` | name は薬草袋を結び、仲間へ分けやすい位置へ移した |
| outfit | with mainClass.`Pilgrim` | name は杖先の金具を締め、巡礼路での歩みを安定させている |
| outfit | with mainClass.`Pilgrim` | name は肩掛けを深く直し、寒風から体を守る準備をした |
| outfit | with mainClass.`Pilgrim` | name は小さな聖印をなぞり、心を静かに整えている |
| outfit | with mainClass.`Pilgrim` | name は仲間の荷を少し持ち、道中の負担を分け合う支度をした |
| outfit | with mainClass.`Pilgrim` | name は祈句をひとつ唱え、迷いを払って足元を見据えた |
| outfit | with mainClass.`Pilgrim` | name は穏やかな表情で頷き、出立の時を待っている |
| pray | none | name は神々に無事の帰還を祈っている |
| pray | none | name は胸の前で手を組み、静かに祈りを捧げている |
| pray | none | name は灯りの前で旅の安全を願っている |
| pray | none | name は小さな祭壇に頭を垂れている |
| pray | none | name は仲間の無事を思いながら祈っている |
| pray | none | name は心を鎮め、感謝の言葉を口にしている |
| pray | none | name は明日の勝利を願って祈りを続けている |
| pray | none | name は困難を乗り越える力を求めている |
| pray | none | name は静寂の中で自らの弱さと向き合っている |
| pray | none | name は祈りを終え、決意を新たにした |
| pray | with religion.`Goddess of Restoration` | name は癒しの光を胸に受け、傷ついた仲間の快復を祈っている |
| pray | with religion.`Goddess of Restoration` | name は静かな聖句を唱え、再び立ち上がる力を願っている |
| pray | with religion.`Goddess of Restoration` | name は温かな息を整え、失われた活力の再生を祈願した |
| pray | with religion.`Goddess of Restoration` | name は包帯に手を添え、痛みが和らぐよう真摯に祈っている |
| pray | with religion.`Goddess of Restoration` | name は淡い祈り火の前で、心身の修復を託している |
| pray | with religion.`Goddess of Restoration` | name は折れかけた気持ちを抱え、慈愛の導きを求めている |
| pray | with religion.`Goddess of Restoration` | name は再起の朝を思い描き、静かに祝福を願った |
| pray | with religion.`Goddess of Restoration` | name は仲間の名を一人ずつ唱え、癒しを乞うている |
| pray | with religion.`Goddess of Restoration` | name は深い呼吸とともに、生命のめぐりが戻ることを祈っている |
| pray | with religion.`Goddess of Restoration` | name は祈りの結びに額を垂れ、再生の加護へ感謝を捧げた |
| pray | with religion.`God of Attrition` | name は消耗の神へ刃の鋭さを捧げ、代償と引き換えの力を願っている |
| pray | with religion.`God of Attrition` | name は息を削るような祈りで、敵を削り切る執念を求めている |
| pray | with religion.`God of Attrition` | name は拳を握りしめ、痛みを力へ変える誓いを立てた |
| pray | with religion.`God of Attrition` | name は擦り切れた装備に触れ、損耗を恐れぬ覚悟を示している |
| pray | with religion.`God of Attrition` | name は短い言葉を刻み、戦い続ける意志を研いでいる |
| pray | with religion.`God of Attrition` | name は疲労を受け入れ、敵の耐久を上回る消耗戦を願った |
| pray | with religion.`God of Attrition` | name は荒い鼓動の中で、削り勝つ未来だけを見据えている |
| pray | with religion.`God of Attrition` | name は静かな祭壇に硬貨を置き、勝利までの摩耗を受け入れた |
| pray | with religion.`God of Attrition` | name は唇を結び、重ねた傷が勝因になることを祈っている |
| pray | with religion.`God of Attrition` | name は祈りの終わりに刃を抜き、消耗の果ての突破を誓った |
| pray | with religion.`God of Cunning` | name は狡猾の神へ微笑み、抜け道を見抜く知恵を願っている |
| pray | with religion.`God of Cunning` | name は指先で硬貨を弾き、取引の裏を読む眼力を求めている |
| pray | with religion.`God of Cunning` | name は低く祈詞を唱え、損を避ける機転を授かろうとしている |
| pray | with religion.`God of Cunning` | name は影に身を寄せ、敵の虚を突く策が閃くよう祈った |
| pray | with religion.`God of Cunning` | name は祭壇前で地図を畳み、最短で得を拾う道を願っている |
| pray | with religion.`God of Cunning` | name は笑みを消さずに一礼し、交渉で優位に立つ加護を乞うた |
| pray | with religion.`God of Cunning` | name は僅かな沈黙の中で、敵意を逸らす言葉を探している |
| pray | with religion.`God of Cunning` | name は祈りと同時に算盤を弾き、損益の先読みを固めている |
| pray | with religion.`God of Cunning` | name は盗まれぬ財布を願うより、巧みに増やす術を祈った |
| pray | with religion.`God of Cunning` | name は最後に肩をすくめ、狡知の祝福を軽やかに受け取った |
| pray | with religion.`God of Fortification` | name は防備の神へ盾を掲げ、崩れぬ守りを祈っている |
| pray | with religion.`God of Fortification` | name は鎧の継ぎ目に触れ、破られない陣形の維持を願った |
| pray | with religion.`God of Fortification` | name は重い呼吸を整え、耐え切る心の堅牢さを求めている |
| pray | with religion.`God of Fortification` | name は祭壇に膝をつき、雷撃にも折れぬ覚悟を誓った |
| pray | with religion.`God of Fortification` | name は仲間の前衛を思い、守護の加護が届くよう祈っている |
| pray | with religion.`God of Fortification` | name は盾面を磨きながら、被弾の衝撃を受け流す力を願った |
| pray | with religion.`God of Fortification` | name は祈り火の前で姿勢を正し、不動の防線を思い描いている |
| pray | with religion.`God of Fortification` | name は慎重な所作で祈詞を重ね、崩壊しない隊列を求めている |
| pray | with religion.`God of Fortification` | name は剣より先に盾へ口づけし、守り抜く誓いを固めた |
| pray | with religion.`God of Fortification` | name は祈りを終えると兜を被り、鉄壁の意志で立ち上がった |
| pray | with religion.`Goddess of Fertility` | name は豊穣の女神へ果実を供え、実り多い遠征を祈っている |
| pray | with religion.`Goddess of Fertility` | name は温かな香の中で、仲間全員の活力充填を願った |
| pray | with religion.`Goddess of Fertility` | name は空の皿を見つめ、次の宴が満ちるよう感謝を捧げている |
| pray | with religion.`Goddess of Fertility` | name は柔らかな祈詞で、心と胃袋の両方が満たされる未来を祈った |
| pray | with religion.`Goddess of Fertility` | name は穀粒を手に取り、欠乏のない日々を願っている |
| pray | with religion.`Goddess of Fertility` | name は仲間の笑顔を思い浮かべ、豊かな食卓の加護を乞うた |
| pray | with religion.`Goddess of Fertility` | name は満ち足りた呼吸で、疲れた体に巡る活力を願っている |
| pray | with religion.`Goddess of Fertility` | name は祈り火へ香草をくべ、明日の糧が尽きぬよう祈った |
| pray | with religion.`Goddess of Fertility` | name は祝福の詞を穏やかに繰り返し、飢えなき行軍を願っている |
| pray | with religion.`Goddess of Fertility` | name は祈りを結ぶと小さく微笑み、実りの兆しを胸に抱いた |
| pray | with religion.`God of Resonance` | name は共鳴の神へ耳を澄まし、仲間の魔力が重なる瞬間を祈っている |
| pray | with religion.`God of Resonance` | name は低音の詠唱を重ね、連鎖する術式の波を願っている |
| pray | with religion.`God of Resonance` | name は脈動する結晶に手を置き、共振の深まりを求めた |
| pray | with religion.`God of Resonance` | name は仲間の呼吸に合わせて祈り、位相の一致を願っている |
| pray | with religion.`God of Resonance` | name は静かな拍を刻み、呪力の連携が途切れぬよう祈った |
| pray | with religion.`God of Resonance` | name は光る符を並べ、魔法の重なりが増幅する未来を描いている |
| pray | with religion.`God of Resonance` | name は祈詞の余韻に身を任せ、仲間同士の響応を高めている |
| pray | with religion.`God of Resonance` | name は指先に走る微振動を感じ、連撃魔法の精度向上を願った |
| pray | with religion.`God of Resonance` | name は祭壇の鐘を一打し、響き合う力の導きを求めている |
| pray | with religion.`God of Resonance` | name は最後に目を開き、共鳴の波へ同調する覚悟を決めた |
| pray | with religion.`Goddess of Precision` | name は精密の女神へ視線を捧げ、狙いの誤差が消えるよう祈っている |
| pray | with religion.`Goddess of Precision` | name は呼吸を一拍で止め、必中の集中を授かろうとしている |
| pray | with religion.`Goddess of Precision` | name は照準具を整え、一矢で要所を射抜く加護を願った |
| pray | with religion.`Goddess of Precision` | name は静かな祈詞で、揺れない手元と視界を求めている |
| pray | with religion.`Goddess of Precision` | name は瞬きの間隔まで整え、最適な一撃の機会を祈った |
| pray | with religion.`Goddess of Precision` | name は地図の一点を指し、最短で核心を突く導線を願っている |
| pray | with religion.`Goddess of Precision` | name は指先の震えを抑え、計算通りの回避を求めている |
| pray | with religion.`Goddess of Precision` | name は祭壇前で矢羽を撫で、狙撃の冴えが鈍らぬよう祈った |
| pray | with religion.`Goddess of Precision` | name は周囲の雑音を切り離し、照準だけに意識を澄ませている |
| pray | with religion.`Goddess of Precision` | name は祈りの終わりに頷き、誤差なき一手を胸に刻んだ |
| pray | with religion.`God of Fate` | name は運命の神へ掌を開き、絡み合う未来線の改変を祈っている |
| pray | with religion.`God of Fate` | name は砂時計を見つめ、巡る時の目盛りが味方するよう願った |
| pray | with religion.`God of Fate` | name は祈詞を逆順に唱え、望む分岐へ針路を寄せようとしている |
| pray | with religion.`God of Fate` | name は偶然の一撃が必然になる瞬間を思い描いている |
| pray | with religion.`God of Fate` | name は細い糸飾りを結び、破滅の筋道が遠のくよう祈った |
| pray | with religion.`God of Fate` | name は沈黙の間に未来を数え、最善の選択肢を求めている |
| pray | with religion.`God of Fate` | name は祈り火へ小石を落とし、運命の波紋が有利に広がることを願った |
| pray | with religion.`God of Fate` | name は胸元の護符を握り、悪い巡り合わせの反転を祈っている |
| pray | with religion.`God of Fate` | name は一礼とともに、定めを超える意志を神へ示した |
| pray | with religion.`God of Fate` | name は祈りを終えて深呼吸し、書き換わる未来に歩を進めた |
| pray | with religion.`God of Dusk` | name は黄昏の神へ硬貨を捧げ、取引で優位を得る加護を祈っている |
| pray | with religion.`God of Dusk` | name は夕闇の色を見つめ、曖昧な境界を渡る知恵を願った |
| pray | with religion.`God of Dusk` | name は静かに帳面を閉じ、商談の駆け引きが冴えるよう祈っている |
| pray | with religion.`God of Dusk` | name は薄暮の祈詞を重ね、相手の懐へ入り込む術を求めた |
| pray | with religion.`God of Dusk` | name は影の伸びる方角へ一礼し、機を見る目を願っている |
| pray | with religion.`God of Dusk` | name は売買の帳尻が合うよう、慎重に祝詞を唱えた |
| pray | with religion.`God of Dusk` | name は小袋の口を結び、損失を薄暮に溶かす祈りを捧げている |
| pray | with religion.`God of Dusk` | name は揺らぐ光の中で、避けるべき危機の気配を願っている |
| pray | with religion.`God of Dusk` | name は祭壇の端に立ち、明暗の狭間で勝つ術を求めた |
| pray | with religion.`God of Dusk` | name は祈りの締めに肩を払って、黄昏の加護を携えた |
| pray | with religion.`Goddess of Mirage` | name は幻影の女神へ鏡片を供え、虚実を操る力を祈っている |
| pray | with religion.`Goddess of Mirage` | name は揺れる影を追い、敵の目を欺く幻術の冴えを願った |
| pray | with religion.`Goddess of Mirage` | name は淡い笑みで祈詞を紡ぎ、実像を覆う霧の加護を求めている |
| pray | with religion.`Goddess of Mirage` | name は瞳を伏せ、敵意の焦点をずらす祝福を願っている |
| pray | with religion.`Goddess of Mirage` | name は祭壇へ薄絹を結び、偽像が本物のように映ることを祈った |
| pray | with religion.`Goddess of Mirage` | name は足音を消したまま、幻の分身が戦場を舞う未来を思い描いている |
| pray | with religion.`Goddess of Mirage` | name は囁くように祈り、敵の判断を狂わせる気配を求めた |
| pray | with religion.`Goddess of Mirage` | name は揺らめく火を見つめ、現実との境界を曖昧にしている |
| pray | with religion.`Goddess of Mirage` | name は祈りの最中に指を鳴らし、幻惑の開幕を静かに告げた |
| pray | with religion.`Goddess of Mirage` | name は最後に一礼し、見抜かれぬ幻の帳をまとった |
| pray | with religion.`God of Oblivion` | name は忘却されし神へ名もなき祈りを捧げ、痕跡を消す力を願っている |
| pray | with religion.`God of Oblivion` | name は記録帳を閉じ、見られた記憶が霞むよう祈っている |
| pray | with religion.`God of Oblivion` | name は低い声で古い祝詞を唱え、不都合な痕跡の消失を願った |
| pray | with religion.`God of Oblivion` | name は足跡の残らぬ帰還を求め、静かに額を垂れている |
| pray | with religion.`God of Oblivion` | name は失われた碑文に触れ、沈黙の加護を乞うている |
| pray | with religion.`God of Oblivion` | name は祈り火を小さくして、存在感そのものを薄める願いを託した |
| pray | with religion.`God of Oblivion` | name は胸中の迷いを削ぎ、不要な執着を忘却へ流している |
| pray | with religion.`God of Oblivion` | name は闇に同化するよう祈り、追手の記憶から抜け落ちることを願った |
| pray | with religion.`God of Oblivion` | name は古傷の記憶すら遠ざけ、無心で次の歩みを準備している |
| pray | with religion.`God of Oblivion` | name は祈りを結ぶと振り返らず、忘却の帳へ身を投じた |
| pray | with religion.`Goddess of Discord` | name は不和の神へ短剣を供え、敵陣に亀裂が走るよう祈っている |
| pray | with religion.`Goddess of Discord` | name は低く笑い、敵同士が疑い合う火種の拡大を願った |
| pray | with religion.`Goddess of Discord` | name は祈りの言葉に棘を含め、結束を崩す風を求めている |
| pray | with religion.`Goddess of Discord` | name は祭壇へ二つの硬貨を離して置き、分断の兆しを祈った |
| pray | with religion.`Goddess of Discord` | name は静かな所作で、相手の連携が噛み合わぬ未来を願っている |
| pray | with religion.`Goddess of Discord` | name は囁く祈詞で、敵の判断に小さな齟齬を刻もうとしている |
| pray | with religion.`Goddess of Discord` | name は視線を逸らさず、協調が崩れる一瞬の到来を待ち望んだ |
| pray | with religion.`Goddess of Discord` | name は祈り火を左右に揺らし、陣形の乱れを象っている |
| pray | with religion.`Goddess of Discord` | name は微かな挑発の言葉を胸中で反復し、混乱の連鎖を願った |
| pray | with religion.`Goddess of Discord` | name は祈りを終えると口元を引き締め、亀裂を突く覚悟を決めた |
| idle | none | name は拠点で静かに待機している |
| idle | none | name は装備を点検しながら手持ち無沙汰に過ごしている |
| idle | none | name は周囲の様子を眺めつつ時間を潰している |
| idle | none | name は物資を整理しながら次の指示を待っている |
| idle | none | name は地図を見返してぼんやり考え込んでいる |
| idle | none | name は壁にもたれてゆっくりと休んでいる |
| idle | none | name は仲間の会話に耳を傾けている |
| idle | none | name は剣の手入れをして気を紛らわせている |
| idle | none | name は空いた時間に軽い準備運動をしている |
| idle | none | name は何か起きる気配を待ちながら立っている |
| move | none | name は次の目的地へ移動している |
| move | none | name は足場を確かめながら慎重に進んでいる |
| move | none | name は地図と方角を見比べながら歩いている |
| move | none | name は荷物の重さに耐えつつ前進している |
| move | none | name は仲間と隊列を保って進んでいる |
| move | none | name は周囲を警戒しながら道をたどっている |
| move | none | name は近道を探しつつテンポよく進んでいる |
| move | none | name は荒れた地面を踏みしめて進んでいる |
| move | none | name は視界の開けた先を目指して歩いている |
| move | none | name は立ち止まらず一定の速度で進軍している |
| explore | `x.exp_id`1 and `x.floor`1 | name は風渡る草原で古き道標石を見つけ、旅の祝福を祈りつつ進んでいる |
| explore | `x.exp_id`1 and `x.floor`1 | name は陽光にきらめく草海のうねりを読み、精霊が囁く方角へ足を向けた |
| explore | `x.exp_id`1 and `x.floor`1 | name は岩陰に咲く小さな守り花を見つけ、この地の加護が残ると確かめている |
| explore | `x.exp_id`1 and `x.floor`1 | name は獣道に残るひづめ跡をなぞり、平穏を守る巡礼路を探している |
| explore | `x.exp_id`1 and `x.floor`1 | name は草の梢に揺れる羽飾りを拾い、先人の旅団の痕跡として記録した |
| explore | `x.exp_id`1 and `x.floor`1 | name は遠い丘の石碑へ目を凝らし、古詩に詠まれた境界を見定めている |
| explore | `x.exp_id`1 and `x.floor`1 | name は澄んだ風音に耳を澄ませ、精霊獣の通る静かな回廊を選び取った |
| explore | `x.exp_id`1 and `x.floor`1 | name は草葉の露を指で払い、夜明けに刻まれた新しい足跡を追っている |
| explore | `x.exp_id`1 and `x.floor`1 | name は開けた空の下で祈り札を結び、邪気を避ける進路を整えている |
| explore | `x.exp_id`1 and `x.floor`1 | name は平原の果てに揺らぐ蜃気楼を見据え、幻惑に呑まれぬよう歩を進めた |
| explore | `x.exp_id`1 and `x.floor`2 | name は赤黒い土に刻まれた爪痕を読み、魔獣の縄張りを慎重に外している |
| explore | `x.exp_id`1 and `x.floor`2 | name は骨の散る獣道で短く祈詞を唱え、荒ぶる気配を鎮めながら進んだ |
| explore | `x.exp_id`1 and `x.floor`2 | name は風下へ回り込み、狩りを司る獣王の眷属に見つからぬ道を選んでいる |
| explore | `x.exp_id`1 and `x.floor`2 | name は倒木に残る牙の痕へ手を当て、この地の掟を仲間へ静かに伝えた |
| explore | `x.exp_id`1 and `x.floor`2 | name は草陰で気配を殺し、唸り声が遠ざかる刻を待って一気に駆け抜けた |
| explore | `x.exp_id`1 and `x.floor`2 | name は裂かれた地面の血痕を見つめ、つい先ほどの死闘を読み解いている |
| explore | `x.exp_id`1 and `x.floor`2 | name は獣臭まじりの風に眉をひそめ、呪除け香を焚いて進路を確保した |
| explore | `x.exp_id`1 and `x.floor`2 | name は蹄跡と爪跡の交差を地図へ写し、狩る者と狩られる者の流れを掴んだ |
| explore | `x.exp_id`1 and `x.floor`2 | name は槍先で高草を払い、伏せる影を暴くように一歩ずつ前進している |
| explore | `x.exp_id`1 and `x.floor`2 | name は月の紋を刻んだ護符を握り、牙の領域を越える覚悟を固めた |
| explore | `x.exp_id`1 and `x.floor`3 | name は湖のように雨を湛えた巨獣の足跡を見下ろし、太古の回遊路を辿っている |
| explore | `x.exp_id`1 and `x.floor`3 | name は踏み伏せられた草原の幅を測り、古の巨躯が今も息づくと知った |
| explore | `x.exp_id`1 and `x.floor`3 | name は地鳴りめく鼓動を聞き分け、巨獣の群れと距離を取る陣形へ組み替えた |
| explore | `x.exp_id`1 and `x.floor`3 | name は泥に埋もれた角片を拾い、太古の王獣の証として袋へ収めている |
| explore | `x.exp_id`1 and `x.floor`3 | name は草が倒れた帯を追い、星巡りのように続く獣群の道を横切った |
| explore | `x.exp_id`1 and `x.floor`3 | name は雷鳴に似た遠吠えへ耳を澄ませ、群れを刺激せぬ静路を選んでいる |
| explore | `x.exp_id`1 and `x.floor`3 | name は抉れた土手を登り、見晴らしの高みから回遊線の結び目を見定めた |
| explore | `x.exp_id`1 and `x.floor`3 | name は杖で地を叩いて足場を確かめ、巨体の通り道を慎重に渡っている |
| explore | `x.exp_id`1 and `x.floor`3 | name は岩肌の擦過痕に触れ、この谷が王獣の古き回廊だと悟った |
| explore | `x.exp_id`1 and `x.floor`3 | name は風上から静かに迂回し、視界を埋める群れに気取られず進んだ |
| explore | `x.exp_id`1 and `x.floor`4 | name は疎林の影を渡る気配を追い、狩人たちの見張り座を先に押さえている |
| explore | `x.exp_id`1 and `x.floor`4 | name は木肌の刻印を読み、森の民が残した合図網の境を見抜こうとしている |
| explore | `x.exp_id`1 and `x.floor`4 | name は不自然な枝揺れを察し、囮道を外れて側面の獣径へ回り込んだ |
| explore | `x.exp_id`1 and `x.floor`4 | name は岩陰ごとに息を潜め、弦鳴りに似た軋みへ神経を研ぎ澄ませている |
| explore | `x.exp_id`1 and `x.floor`4 | name は小石の並びを見て、見張りが入れ替わった直後の足取りを割り出した |
| explore | `x.exp_id`1 and `x.floor`4 | name は木立の隙間に刺さる視線を感じ、隊の間隔を詰めて奇襲を防いでいる |
| explore | `x.exp_id`1 and `x.floor`4 | name は高低差ある岩場を使い、包囲されにくい立体の進路を選び取った |
| explore | `x.exp_id`1 and `x.floor`4 | name は落ち葉に紛れた罠縄の繊維を拾い、罠師の活動域を仲間へ告げた |
| explore | `x.exp_id`1 and `x.floor`4 | name は尾根筋の狭路を避け、退路を失わぬよう樹間の小道へ降りている |
| explore | `x.exp_id`1 and `x.floor`4 | name は逆光の稜線を離れ、月影に溶けるように潜行を続けている |
| explore | `x.exp_id`1 and `x.floor`5 | name は葦の切れ目を流れる浅瀬を見つけ、沈まぬ渡り道として印を結んだ |
| explore | `x.exp_id`1 and `x.floor`5 | name は泥炭の泡立ちを見極め、踏み抜く沼域を避ける細道を選んでいる |
| explore | `x.exp_id`1 and `x.floor`5 | name は腐葉の匂いの薄い高まりを探し、休息に足る乾いた島を確保した |
| explore | `x.exp_id`1 and `x.floor`5 | name は水面を覆う胞子膜を見て口布を固く締め、瘴気への備えを整えた |
| explore | `x.exp_id`1 and `x.floor`5 | name は朽木に這う菌糸の色を読み、毒茸の群生帯を大きく迂回している |
| explore | `x.exp_id`1 and `x.floor`5 | name は湧水の温みを辿り、ぬかるみの浅い帯を安全路として仲間に示した |
| explore | `x.exp_id`1 and `x.floor`5 | name は吸血虫の群れへ燻煙玉を投げ、視界を守りながら短距離で進んだ |
| explore | `x.exp_id`1 and `x.floor`5 | name は沈んだ杭列を見つけ、失われた堤道の名残を道標として活かしている |
| explore | `x.exp_id`1 and `x.floor`5 | name は黴の濃い窪地を外し、装備を蝕む湿気から仲間を守って進んだ |
| explore | `x.exp_id`1 and `x.floor`5 | name は泥はねの高さを見て荷重を配り直し、沼渡りの手順を全員に共有した |
| explore | `x.exp_id`1 and `x.floor`6 | name は草に埋もれた石畳を払い、滅びた古都の大路をひと筋ずつ辿っている |
| explore | `x.exp_id`1 and `x.floor`6 | name は崩れ塔の骨格越しに空中回廊の跡を見つけ、上層への道筋を読んだ |
| explore | `x.exp_id`1 and `x.floor`6 | name は地中から覗く封印板に耳を当て、地下聖域の空洞を見抜いている |
| explore | `x.exp_id`1 and `x.floor`6 | name は風化した石標の古語を解き、禁域と祈殿の境を丁寧に切り分けた |
| explore | `x.exp_id`1 and `x.floor`6 | name は苔むす導水溝をたどり、王都中枢へ続く巡礼路の名残を探っている |
| explore | `x.exp_id`1 and `x.floor`6 | name は半ば埋もれた青銅の取手を掘り出し、閉ざされた祭室への口を開いた |
| explore | `x.exp_id`1 and `x.floor`6 | name は宮壁の浮彫に触れ、栄華の時代に捧げられた祈りの形を読み取った |
| explore | `x.exp_id`1 and `x.floor`6 | name は反響する足音を数え、崩れていない螺旋階の位置を慎重に絞っている |
| explore | `x.exp_id`1 and `x.floor`6 | name は樹根に裂かれた石管の温みを感じ、今なお息づく霊脈の流れを知った |
| explore | `x.exp_id`1 and `x.floor`6 | name は瓦礫に眠る古い護符片を拾い、失われた王朝の記憶として保管した |
| explore | `x.exp_id`1 and `x.floor`1 | 風渡る草原で道標石が見つかり、旅人を守る古い加護が息づいている |
| explore | `x.exp_id`1 and `x.floor`1 | 陽光に揺れる草海のうねりが、精霊の通り道を示すように連なっていた |
| explore | `x.exp_id`1 and `x.floor`1 | 岩陰に咲く守り花が点在し、この層が穏やかな祝福に包まれていると分かる |
| explore | `x.exp_id`1 and `x.floor`1 | 獣道の新しいひづめ跡が続き、巡礼路へ重なる安全な進路が特定された |
| explore | `x.exp_id`1 and `x.floor`1 | 草葉の露に残る微細な乱れから、夜明け直後の通行が推定されている |
| explore | `x.exp_id`1 and `x.floor`1 | 古詩に記された境界石が確認され、平原の区画認識が更新された |
| explore | `x.exp_id`1 and `x.floor`1 | 風音に混じる低い唄声が観測され、精霊獣の回廊が共有地図へ追記された |
| explore | `x.exp_id`1 and `x.floor`1 | 蜃気楼の揺らぎが視線を誘うため、幻惑対策を前提に隊列が組み直された |
| explore | `x.exp_id`1 and `x.floor`1 | 開けた地形ほど影が薄く、見張り役の配置密度が引き上げられている |
| explore | `x.exp_id`1 and `x.floor`1 | 小さな羽飾りの遺物が回収され、先人旅団の通過記録として保管された |
| explore | `x.exp_id`1 and `x.floor`2 | 赤黒い土に深い爪痕が残り、魔獣の縄張り線が明確に引かれている |
| explore | `x.exp_id`1 and `x.floor`2 | 骨片の散る分岐が続き、狩り場の重なりを避ける迂回路運用に切り替えられた |
| explore | `x.exp_id`1 and `x.floor`2 | 風下移動を徹底することで、獣王眷属への被発見率が抑えられている |
| explore | `x.exp_id`1 and `x.floor`2 | 倒木に残る牙痕の新しさから、直近で大型個体が巡回したと判断された |
| explore | `x.exp_id`1 and `x.floor`2 | 高草の陰は視界を奪うため、槍先で払う前進手順が全体へ共有された |
| explore | `x.exp_id`1 and `x.floor`2 | 血痕の乾き具合が浅く、つい先ほどの死闘痕が残る危険帯と見なされている |
| explore | `x.exp_id`1 and `x.floor`2 | 交差する蹄跡と爪跡が記録され、捕食と逃走の流れが図示された |
| explore | `x.exp_id`1 and `x.floor`2 | 呪除け香の使用で獣臭の濃い区画を突破し、隊の動揺が抑えられた |
| explore | `x.exp_id`1 and `x.floor`2 | 唸り声の反響方向が分析され、待ち伏せを避ける静路が再設定された |
| explore | `x.exp_id`1 and `x.floor`2 | 護符消費を前提にした短時間侵入へ改められ、被害拡大が抑制されている |
| explore | `x.exp_id`1 and `x.floor`3 | 湖のような足跡が連続し、太古の王獣回廊が現役であると裏付けられた |
| explore | `x.exp_id`1 and `x.floor`3 | 踏み伏せられた草原の幅から、群れ規模が従来想定を上回ると判明した |
| explore | `x.exp_id`1 and `x.floor`3 | 地鳴りめく振動周期が共有され、接近兆候の早期察知体制が強化された |
| explore | `x.exp_id`1 and `x.floor`3 | 角片と新しい足跡が同時に見つかり、長期回遊地であることが補強された |
| explore | `x.exp_id`1 and `x.floor`3 | 倒伏帯の向きが揃い、獣群の主流動線が一本化されていると分かる |
| explore | `x.exp_id`1 and `x.floor`3 | 雷鳴に似る遠吠えが連鎖し、群れ内連絡の広さに警戒が高まった |
| explore | `x.exp_id`1 and `x.floor`3 | 高所観測で回遊線の合流点が特定され、安全横断窓が再計算された |
| explore | `x.exp_id`1 and `x.floor`3 | 地盤を叩く確認手順により、崩れやすい帯の外周が更新されている |
| explore | `x.exp_id`1 and `x.floor`3 | 岩肌の擦過痕が広範囲に残り、巨躯通行の頻度が高い区画と判定された |
| explore | `x.exp_id`1 and `x.floor`3 | 風上迂回を徹底した運用で、王獣群との不要接触が回避された |
| explore | `x.exp_id`1 and `x.floor`4 | 疎林と岩棚の重なりが多く、待ち伏せに適した死角が密集している |
| explore | `x.exp_id`1 and `x.floor`4 | 木肌の刻印に規則性があり、森の狩人による合図網が機能していると判明した |
| explore | `x.exp_id`1 and `x.floor`4 | 枝揺れが風向と合致せず、監視者の移動路が逆算されている |
| explore | `x.exp_id`1 and `x.floor`4 | 小石の配置変化から見張り交代が推測され、警戒線幅が更新された |
| explore | `x.exp_id`1 and `x.floor`4 | 樹上射線を切る進路へ改めることで、頭上奇襲の危険が軽減された |
| explore | `x.exp_id`1 and `x.floor`4 | 低位置で折れた枝が多く、伏兵が低姿勢で潜む傾向が共有されている |
| explore | `x.exp_id`1 and `x.floor`4 | 岩陰ごとの停止観測で、連携包囲に使われる導線が順次潰された |
| explore | `x.exp_id`1 and `x.floor`4 | 罠縄の繊維片が回収され、罠師活動域の地図精度が引き上げられた |
| explore | `x.exp_id`1 and `x.floor`4 | 尾根筋の狭路は退路封鎖に使われやすく、先行偵察比率が上げられている |
| explore | `x.exp_id`1 and `x.floor`4 | 逆光稜線を避ける潜行で輪郭露出が抑えられ、被発見率が低下した |
| explore | `x.exp_id`1 and `x.floor`5 | 葦原の切れ目に浅瀬が続き、沈みにくい渡り道として活用可能と判断された |
| explore | `x.exp_id`1 and `x.floor`5 | 泥炭の泡立ちが活発で、踏み抜き危険帯の外周線が更新されている |
| explore | `x.exp_id`1 and `x.floor`5 | 腐葉臭の薄い高まりが見つかり、休止点候補として登録された |
| explore | `x.exp_id`1 and `x.floor`5 | 水面の胞子膜が厚く、口布と解毒薬を優先する運用へ切り替えられた |
| explore | `x.exp_id`1 and `x.floor`5 | 菌糸色の差異から毒茸群の分布線が特定され、迂回路が再設定された |
| explore | `x.exp_id`1 and `x.floor`5 | 湧水温度の偏りが明瞭で、ぬかるみの浅い帯が安全路として確保された |
| explore | `x.exp_id`1 and `x.floor`5 | 吸血虫密集域は燻煙で散らし、短距離移動を重ねる方針が採択された |
| explore | `x.exp_id`1 and `x.floor`5 | 沈下杭列の並びから、失われた堤道の走向が読み取られている |
| explore | `x.exp_id`1 and `x.floor`5 | 黴の濃い窪地を外す運用で、装備腐食の進行が抑制された |
| explore | `x.exp_id`1 and `x.floor`5 | 泥はね高さの計測結果を反映し、荷重配分手順が全体に共有された |
| explore | `x.exp_id`1 and `x.floor`6 | 草に埋もれた石畳が現れ、滅びた古都区画の輪郭が再構築されつつある |
| explore | `x.exp_id`1 and `x.floor`6 | 崩れ塔越しに空中回廊跡が確認され、上層導線の残存が裏付けられた |
| explore | `x.exp_id`1 and `x.floor`6 | 地中露出した封印板の反響が空洞を示し、地下聖域の存在が補強された |
| explore | `x.exp_id`1 and `x.floor`6 | 風化石標の古語が解読され、禁域ごとの進入優先度が整理された |
| explore | `x.exp_id`1 and `x.floor`6 | 苔むす導水溝が連続し、王都中枢へ向かう巡礼路候補が抽出された |
| explore | `x.exp_id`1 and `x.floor`6 | 半没した青銅取手が掘り出され、閉鎖祭室へのアクセスが確保された |
| explore | `x.exp_id`1 and `x.floor`6 | 宮壁の浮彫意匠が残り、往時の祈礼文化がこの層まで広がっていたと分かる |
| explore | `x.exp_id`1 and `x.floor`6 | 反響差を使った測位で、崩れていない螺旋階候補が絞り込まれた |
| explore | `x.exp_id`1 and `x.floor`6 | 樹根に裂かれた石管に微かな温みが残り、霊脈の一部生存が示唆されている |
| explore | `x.exp_id`1 and `x.floor`6 | 瓦礫中の古い護符片が回収され、失われた王朝史の手掛かりとして保管された |
| explore | `x.exp_id`2 and `x.floor`1 | name は岩だらけの山裾で足場を選び、崩れやすい斜面を慎重に登っている |
| explore | `x.exp_id`2 and `x.floor`1 | name は砕けた礫の音を殺しながら、風に削られた細道を一歩ずつ進んだ |
| explore | `x.exp_id`2 and `x.floor`1 | name は山肌に刻まれた古い道標を見つけ、かつての巡礼路を辿っている |
| explore | `x.exp_id`2 and `x.floor`1 | name は脆い岩棚を杖で叩いて確かめ、落石帯を避ける進路を選んでいる |
| explore | `x.exp_id`2 and `x.floor`1 | name は谷から吹き上がる乾いた風を読み、安定した稜線側へ回り込んだ |
| explore | `x.exp_id`2 and `x.floor`1 | name は裂け目に残る獣毛を摘み取り、山獣の通り道を地図へ書き込んでいる |
| explore | `x.exp_id`2 and `x.floor`1 | name は崩れた石段の痕を見つけ、この山が古道で結ばれていたと悟った |
| explore | `x.exp_id`2 and `x.floor`1 | name は岩陰に身を寄せて落石の間を見極め、短い合図で仲間を導いた |
| explore | `x.exp_id`2 and `x.floor`1 | name は高みの白い鷹影を追い、獣の少ない上風側のルートを確保している |
| explore | `x.exp_id`2 and `x.floor`1 | name は擦り減った登攀杭を見つめ、先人の苦難を胸に歩幅を整えた |
| explore | `x.exp_id`2 and `x.floor`2 | name は断崖の爪痕をなぞり、山の捕食者が巡る狩場の境を見極めている |
| explore | `x.exp_id`2 and `x.floor`2 | name は骨片が散る棚道で呼吸を殺し、見張る獣影の死角を渡っている |
| explore | `x.exp_id`2 and `x.floor`2 | name は風下へ身を伏せ、崖上を巡る狩人獣に匂いを悟られぬよう進んだ |
| explore | `x.exp_id`2 and `x.floor`2 | name は岩壁に残る牙研ぎ痕を見て、縄張り争いの激しさを仲間へ告げた |
| explore | `x.exp_id`2 and `x.floor`2 | name は裂けた外套布を拾い、旅人を襲った伏撃地点を推定している |
| explore | `x.exp_id`2 and `x.floor`2 | name は落差の大きい崖路を避け、追跡されにくい横穴沿いへ迂回した |
| explore | `x.exp_id`2 and `x.floor`2 | name は獣臭混じりの突風を受け、護符を結び直して警戒線を上げている |
| explore | `x.exp_id`2 and `x.floor`2 | name は鷲の鳴き交わしを聞き分け、上層からの急襲に備えて陣形を縮めた |
| explore | `x.exp_id`2 and `x.floor`2 | name は崖下の暗がりで光る目を確認し、松明を覆って気配を断っている |
| explore | `x.exp_id`2 and `x.floor`2 | name は石灰色の急斜へ爪先を掛け、獣道と交差しない脇道を選び取った |
| explore | `x.exp_id`2 and `x.floor`3 | name は断崖に隠れた木造家屋を見つけ、荒らされた集落跡へ足を踏み入れた |
| explore | `x.exp_id`2 and `x.floor`3 | name は切れた縄橋の端を握り、急襲の夜に断たれた逃走路を想像している |
| explore | `x.exp_id`2 and `x.floor`3 | name は崩れた戸口の刻印を拭い、住民が守った家紋を静かに記録した |
| explore | `x.exp_id`2 and `x.floor`3 | name は炉に残る灰の冷たさを確かめ、放棄から日が浅いと読み取っている |
| explore | `x.exp_id`2 and `x.floor`3 | name は山霧に消える足跡を追い、略奪団の撤退路を尾根側へ辿った |
| explore | `x.exp_id`2 and `x.floor`3 | name は倒れた見張り柱を起こし、村路に潜む死角を仲間へ示している |
| explore | `x.exp_id`2 and `x.floor`3 | name は戸棚に残る祈り札を見つけ、守護の誓いが破られた痕に目を伏せた |
| explore | `x.exp_id`2 and `x.floor`3 | name は軋む板廊下を渡り、崖間に張られた廃索道の先を探っている |
| explore | `x.exp_id`2 and `x.floor`3 | name は石垣裏の隠し貯蔵庫を開け、急場で捨てられた生活具を確認した |
| explore | `x.exp_id`2 and `x.floor`3 | name は鐘楼跡で風鈴の欠片を拾い、失われた村の静けさに耳を澄ませた |
| explore | `x.exp_id`2 and `x.floor`4 | name は崩れた監視塔の螺旋階を登り、山路を睨む盗賊の視界を測っている |
| explore | `x.exp_id`2 and `x.floor`4 | name は矢傷だらけの胸壁に触れ、往来を襲う無法者の戦跡を読み解いた |
| explore | `x.exp_id`2 and `x.floor`4 | name は見張り鐘の台座を調べ、警報網がまだ一部機能すると突き止めた |
| explore | `x.exp_id`2 and `x.floor`4 | name は砦門の焼け痕を辿り、強襲で奪われた関所の末路を見つめている |
| explore | `x.exp_id`2 and `x.floor`4 | name は隠し矢座の裂け目を覗き、峠道を狙う射線を仲間へ共有した |
| explore | `x.exp_id`2 and `x.floor`4 | name は崩落した兵舎床を跨ぎ、略奪品が運び出された倉路を追っている |
| explore | `x.exp_id`2 and `x.floor`4 | name は塔上の旗杭を見上げ、幾度も主を変えた血塗られた拠点を悟った |
| explore | `x.exp_id`2 and `x.floor`4 | name は石畳に残る蹄鉄痕を数え、山賊隊の規模をおおよそ割り出している |
| explore | `x.exp_id`2 and `x.floor`4 | name は崖縁の抜け道を押さえ、包囲されぬよう退路を先に確保した |
| explore | `x.exp_id`2 and `x.floor`4 | name は塔影に潜み、巡回の切れ目で関門跡を無音のまま突破した |
| explore | `x.exp_id`2 and `x.floor`5 | name は風に削られた深い峡谷で、唸る気流を読んで足を進めている |
| explore | `x.exp_id`2 and `x.floor`5 | name は狭い石回廊の反響を測り、崩落を招かぬ歩調へ整えた |
| explore | `x.exp_id`2 and `x.floor`5 | name は横殴りの砂塵から目を守り、刻まれた裂谷の底へ降りている |
| explore | `x.exp_id`2 and `x.floor`5 | name は細い岩橋に身を伏せ、突風の止む瞬間だけを選んで渡った |
| explore | `x.exp_id`2 and `x.floor`5 | name は風鳴りに混じる笛音を聞き、迷わせる自然の残響を切り分けている |
| explore | `x.exp_id`2 and `x.floor`5 | name は磨かれた岩肌を手探りし、風蝕洞へ続く避難路を見つけ出した |
| explore | `x.exp_id`2 and `x.floor`5 | name は谷底の渦風を避けるため、斜めの亀裂帯を鎖で進んでいる |
| explore | `x.exp_id`2 and `x.floor`5 | name は砂礫に埋もれた石碑を掘り、古い峠道の境界文を読み上げた |
| explore | `x.exp_id`2 and `x.floor`5 | name は白く乾いた骨片を見つめ、風葬の地であることを慎重に告げた |
| explore | `x.exp_id`2 and `x.floor`5 | name は裂谷を渡る綱杭を打ち直し、後続隊が安全に越えられるよう整えた |
| explore | `x.exp_id`2 and `x.floor`6 | name は蒼白の石で築かれた古神殿へ至り、風化した柱列の間を進んでいる |
| explore | `x.exp_id`2 and `x.floor`6 | name は欠けた神像の面差しを拭い、忘れられた誓約の文字を読み取った |
| explore | `x.exp_id`2 and `x.floor`6 | name は祭壇に積もる苔を払って、時を越えた祈祷痕を確かめている |
| explore | `x.exp_id`2 and `x.floor`6 | name は割れた天蓋から差す光を追い、主殿へ続く聖路を見定めた |
| explore | `x.exp_id`2 and `x.floor`6 | name は風に鳴る石鈴を聞き、神殿守護の機構がまだ眠ると悟っている |
| explore | `x.exp_id`2 and `x.floor`6 | name は回廊の浮彫に指を這わせ、古き山民の祈りの系譜を辿った |
| explore | `x.exp_id`2 and `x.floor`6 | name は半壊した香炉を起こし、祭儀再開の道筋を静かに整えている |
| explore | `x.exp_id`2 and `x.floor`6 | name は聖堂床の亀裂を跨ぎ、崩れぬ石脈を選んで中心壇へ向かった |
| explore | `x.exp_id`2 and `x.floor`6 | name は色褪せた壁画の狼紋を見つめ、この地の守護伝承を胸に刻んだ |
| explore | `x.exp_id`2 and `x.floor`6 | name は祈りの間で短く黙礼し、風と時に耐えた神意へ敬意を捧げた |
| explore | `x.exp_id`2 and `x.floor`1 | 山裾の礫斜面は不安定で、進路は岩質ごとの荷重分散で維持されている |
| explore | `x.exp_id`2 and `x.floor`1 | 風化した細道の連続により、転落防止の間隔管理が最優先へ引き上げられた |
| explore | `x.exp_id`2 and `x.floor`1 | 古い道標石が点在し、かつて巡礼路として機能した痕跡が確認された |
| explore | `x.exp_id`2 and `x.floor`1 | 脆い岩棚は打音検査で判別され、落石帯を外す迂回線が再設定された |
| explore | `x.exp_id`2 and `x.floor`1 | 谷風の流向差が明瞭で、安定した稜線側ルートの有効性が補強された |
| explore | `x.exp_id`2 and `x.floor`1 | 裂け目周辺の獣毛採取により、山獣通行帯の地図精度が向上している |
| explore | `x.exp_id`2 and `x.floor`1 | 崩れ石段の残存幅から、古道網が現在の登攀路に重なると推定された |
| explore | `x.exp_id`2 and `x.floor`1 | 落石間隔の観測結果が共有され、停止判断の統一手順が整備された |
| explore | `x.exp_id`2 and `x.floor`1 | 上空の猛禽行動を指標化し、獣接触の少ない上風側誘導が機能している |
| explore | `x.exp_id`2 and `x.floor`1 | 旧登攀杭の劣化が進み、補助索の常時展張が安全条件として固定された |
| explore | `x.exp_id`2 and `x.floor`2 | 断崖の爪痕分布から、捕食者の巡回境界が複層化していると判定された |
| explore | `x.exp_id`2 and `x.floor`2 | 骨片密度の高い棚道は待ち伏せ危険帯とされ、通過時間が短縮運用へ改められた |
| explore | `x.exp_id`2 and `x.floor`2 | 風下潜行の徹底で、嗅覚追跡による接敵頻度が有意に低下している |
| explore | `x.exp_id`2 and `x.floor`2 | 岩壁の牙研ぎ痕が新しく、縄張り争いの活発化が確認された |
| explore | `x.exp_id`2 and `x.floor`2 | 破れた旅装備の散在により、伏撃常習地点の再警戒が指示された |
| explore | `x.exp_id`2 and `x.floor`2 | 高低差の大きい崖路を外す方針で、追尾戦への移行リスクが抑制された |
| explore | `x.exp_id`2 and `x.floor`2 | 獣臭を伴う突風発生域が整理され、護符使用の優先区画が更新された |
| explore | `x.exp_id`2 and `x.floor`2 | 猛禽の鳴き交わし解析により、上層接近の前兆検知精度が強化された |
| explore | `x.exp_id`2 and `x.floor`2 | 崖下の反射光観測で潜伏個体が確認され、灯火遮蔽手順が標準化された |
| explore | `x.exp_id`2 and `x.floor`2 | 急斜横断の足場評価を反映し、獣道交差を避ける脇路が常用化された |
| explore | `x.exp_id`2 and `x.floor`3 | 断崖間の廃村構造が確認され、襲撃後に放棄された生活圏の全体像が判明した |
| explore | `x.exp_id`2 and `x.floor`3 | 断裂した縄橋位置から、急襲時の退避線が寸断された経緯が裏付けられた |
| explore | `x.exp_id`2 and `x.floor`3 | 家紋刻印の残存率が高く、住民共同体の結束痕跡が記録された |
| explore | `x.exp_id`2 and `x.floor`3 | 炉灰温度の調査で放棄時期が比較的新しいと推定されている |
| explore | `x.exp_id`2 and `x.floor`3 | 霧中の足跡連続から、略奪団が尾根側へ撤退した線が有力となった |
| explore | `x.exp_id`2 and `x.floor`3 | 倒壊見張り柱の再配置で、集落内死角の把握精度が大幅に向上した |
| explore | `x.exp_id`2 and `x.floor`3 | 戸棚内の祈り札群が回収され、守護儀礼が日常化していた証拠となった |
| explore | `x.exp_id`2 and `x.floor`3 | 廃索道の荷重試験結果により、限定的な横断利用が可能と判定された |
| explore | `x.exp_id`2 and `x.floor`3 | 隠し貯蔵庫の残置物から、避難準備の途中で襲撃を受けた可能性が高まった |
| explore | `x.exp_id`2 and `x.floor`3 | 鐘楼破片の分布から、警鐘機能が意図的に破壊されたと分析されている |
| explore | `x.exp_id`2 and `x.floor`4 | 監視塔の残階段が接続し、山路全域を監督した視界網の規模が判明した |
| explore | `x.exp_id`2 and `x.floor`4 | 胸壁の矢傷密度が高く、長期にわたる往来襲撃拠点であったと裏付けられた |
| explore | `x.exp_id`2 and `x.floor`4 | 見張り鐘台座の機構痕から、警報連鎖が部分的に稼働可能と判定された |
| explore | `x.exp_id`2 and `x.floor`4 | 砦門の焼損痕解析により、強襲時の突破方向が特定された |
| explore | `x.exp_id`2 and `x.floor`4 | 隠し矢座の射線復元で、峠道封鎖運用の詳細が再現されつつある |
| explore | `x.exp_id`2 and `x.floor`4 | 兵舎床下の搬出痕から、略奪品が系統的に移送された記録が補強された |
| explore | `x.exp_id`2 and `x.floor`4 | 旗杭交換痕が複数確認され、勢力交代の頻度が高かったと推定された |
| explore | `x.exp_id`2 and `x.floor`4 | 蹄鉄痕数の統計により、山賊隊の常駐規模が上方修正された |
| explore | `x.exp_id`2 and `x.floor`4 | 崖縁抜け道の先行確保で、包囲時の退避成功率が改善している |
| explore | `x.exp_id`2 and `x.floor`4 | 巡回間隔の観測蓄積により、無音突破に適した時間窓が標準化された |
| explore | `x.exp_id`2 and `x.floor`5 | 風蝕峡谷の気流は周期変動が大きく、移動は風止み窓依存へ再編された |
| explore | `x.exp_id`2 and `x.floor`5 | 石回廊の反響特性が共有され、崩落誘発を避ける歩調制御が徹底された |
| explore | `x.exp_id`2 and `x.floor`5 | 砂塵横圧の観測値から、遮眼具と隊列間隔の規定が引き上げられた |
| explore | `x.exp_id`2 and `x.floor`5 | 細岩橋の通行は突風待機前提となり、単独横断が禁止運用へ変更された |
| explore | `x.exp_id`2 and `x.floor`5 | 風鳴りに混ざる残響解析で、錯聴誘導域の地図化が進んでいる |
| explore | `x.exp_id`2 and `x.floor`5 | 風蝕洞の連結が確認され、緊急退避路の候補網が拡張された |
| explore | `x.exp_id`2 and `x.floor`5 | 谷底渦風を外す斜行ルートが定着し、転倒事故率の低下が報告された |
| explore | `x.exp_id`2 and `x.floor`5 | 砂礫下の境界碑文が復元され、古峠道の管理範囲が再定義された |
| explore | `x.exp_id`2 and `x.floor`5 | 乾骨分布と祭祀痕が一致し、風葬文化圏としての性格が補強された |
| explore | `x.exp_id`2 and `x.floor`5 | 綱杭再整備の効果で、後続隊の裂谷横断時間が短縮されている |
| explore | `x.exp_id`2 and `x.floor`6 | 蒼白石造の神殿群が残存し、高地祭祀圏の中心遺構と確認された |
| explore | `x.exp_id`2 and `x.floor`6 | 欠損神像の銘文解読で、古誓約体系の断片が新たに記録された |
| explore | `x.exp_id`2 and `x.floor`6 | 苔下の祭壇痕から、長期にわたる継続祈祷の存在が裏付けられた |
| explore | `x.exp_id`2 and `x.floor`6 | 破天蓋からの採光線が主殿導線と一致し、儀礼設計の意図が示された |
| explore | `x.exp_id`2 and `x.floor`6 | 風鳴石鈴の応答により、守護機構の一部が休眠状態で残ると推定された |
| explore | `x.exp_id`2 and `x.floor`6 | 回廊浮彫の連続性が確認され、山民信仰の系譜再構築が進展している |
| explore | `x.exp_id`2 and `x.floor`6 | 半壊香炉群の配置復元で、祭儀動線の再現精度が向上した |
| explore | `x.exp_id`2 and `x.floor`6 | 床亀裂の石脈評価により、安全に主壇へ至る線が確保された |
| explore | `x.exp_id`2 and `x.floor`6 | 壁画の狼紋が高頻度で出現し、守護獣信仰の中核性が確認された |
| explore | `x.exp_id`2 and `x.floor`6 | 祈りの間の遺留痕が整理され、終末期まで礼式が継続した可能性が高まった |
| explore | `x.exp_id`3 and `x.floor`1 | name は雪を払って針葉の枝を潜り、白銀の獣道を静かにたどっている |
| explore | `x.exp_id`3 and `x.floor`1 | name は凍った下草を杖先で確かめ、沈み雪を避ける歩幅を刻んだ |
| explore | `x.exp_id`3 and `x.floor`1 | name は松の幹に残る擦り痕を読み、冬毛の群れが通る方角を示した |
| explore | `x.exp_id`3 and `x.floor`1 | name は吐息を白く曳きながら、風下へ伸びる細道に耳を澄ませている |
| explore | `x.exp_id`3 and `x.floor`1 | name は霜に埋もれた境石を掘り起こし、古い狩路の起点を見つけた |
| explore | `x.exp_id`3 and `x.floor`1 | name は雪明かりで樹間の陰を測り、伏せ身で抜ける安全帯を選んでいる |
| explore | `x.exp_id`3 and `x.floor`1 | name は凍枝の鳴る高さを見比べ、重雪で折れやすい林冠を避けた |
| explore | `x.exp_id`3 and `x.floor`1 | name は狐火めいた燐光を遠目に捉え、迷い森へ入らぬよう印を付けた |
| explore | `x.exp_id`3 and `x.floor`1 | name は獣脂の匂いが残る幹を確かめ、昨夜の巡回圏を地図へ刻んでいる |
| explore | `x.exp_id`3 and `x.floor`1 | name は白樺の裂け目から樹液氷を採り、凍傷避けの手当てを整えた |
| explore | `x.exp_id`3 and `x.floor`2 | name は雪面の細い縄跡を見つけ、狩人が張った罠列の端を特定した |
| explore | `x.exp_id`3 and `x.floor`2 | name は樹上見張り台の影を数え、視線が交わらない進路を選んでいる |
| explore | `x.exp_id`3 and `x.floor`2 | name は撒かれた灰の筋を読み取り、足音を消す回り道へ仲間を導いた |
| explore | `x.exp_id`3 and `x.floor`2 | name は枝先の鈴罠を息で揺らし、鳴らさず解ける張力を見極めた |
| explore | `x.exp_id`3 and `x.floor`2 | name は雪庇の裏に伏せ、巡回する猟手の合図笛を聞き分けている |
| explore | `x.exp_id`3 and `x.floor`2 | name は皮紐で結ばれた警戒符を外し、気付かれぬ道筋を再構成した |
| explore | `x.exp_id`3 and `x.floor`2 | name は矢羽の落ちる向きを追って、待ち伏せ角度の死角へ滑り込んだ |
| explore | `x.exp_id`3 and `x.floor`2 | name は松脂の焦げ跡を拾い、狩場境界を示す夜火の位置を記した |
| explore | `x.exp_id`3 and `x.floor`2 | name は狐皮で覆われた落とし戸を見破り、踏み抜き地帯を大きく迂回した |
| explore | `x.exp_id`3 and `x.floor`2 | name は風向きと足跡の乱れから、追跡班が戻る時刻を読み当てた |
| explore | `x.exp_id`3 and `x.floor`3 | name は煙突から昇る細煙を見つめ、隠れ里がまだ息づく証に目を細めた |
| explore | `x.exp_id`3 and `x.floor`3 | name は雪冠の丸太家屋を巡り、灯籠道に刻まれた家紋を写し取っている |
| explore | `x.exp_id`3 and `x.floor`3 | name は凍った井戸枠の祈り札を直し、冬越しの無事をそっと願った |
| explore | `x.exp_id`3 and `x.floor`3 | name は干し肉棚の残り香から、住民が急ぎ避難した時期を見極めた |
| explore | `x.exp_id`3 and `x.floor`3 | name は雪に半ば埋もれた神楽面を拾い、祭礼の名残を丁重に包んだ |
| explore | `x.exp_id`3 and `x.floor`3 | name は戸板の傷筋をなぞり、襲撃時の進入路を静かに復元している |
| explore | `x.exp_id`3 and `x.floor`3 | name は凍土の倉に残る穀印を調べ、里の備蓄規模を記録へ残した |
| explore | `x.exp_id`3 and `x.floor`3 | name は雪灯の並びを読み解き、吹雪時に使う避難導線を再確認した |
| explore | `x.exp_id`3 and `x.floor`3 | name は木橋下の護符結びを解き、よそ者除けの結界を丁寧に迂回した |
| explore | `x.exp_id`3 and `x.floor`3 | name は炉端石の温もりを測り、先行隊との時差を慎重に見積もっている |
| explore | `x.exp_id`3 and `x.floor`4 | name は凍湖の白い平面に膝をつき、氷鳴りの間隔から厚みを測っている |
| explore | `x.exp_id`3 and `x.floor`4 | name は吹雪で隠れた割れ目を杖で探り、安全な渡湖線を引き直した |
| explore | `x.exp_id`3 and `x.floor`4 | name は風紋の向きを追って、薄氷が広がる危険帯を先に外した |
| explore | `x.exp_id`3 and `x.floor`4 | name は氷下に揺れる影を見定め、群泳獣の通路を横切らぬ角度を選んだ |
| explore | `x.exp_id`3 and `x.floor`4 | name は岸辺の石杭を掘り出し、冬だけ現れる渡り道の目印を確認した |
| explore | `x.exp_id`3 and `x.floor`4 | name は裂氷音が重なる方位を聞き取り、停止すべき区画を即座に告げた |
| explore | `x.exp_id`3 and `x.floor`4 | name は雪煙に消える対岸灯を見つけ、進路を北尾根へ微修正している |
| explore | `x.exp_id`3 and `x.floor`4 | name は氷晶に映る月輪を頼りに、帰路標を失わぬよう印を刻んだ |
| explore | `x.exp_id`3 and `x.floor`4 | name は裂けた漁網の位置を記録し、落氷が頻発する帯を地図へ追記した |
| explore | `x.exp_id`3 and `x.floor`4 | name は凍結した舟着きを見つけ、かつての湖上交易路に思いを巡らせた |
| explore | `x.exp_id`3 and `x.floor`5 | name は青白く光る氷晶柱の間を進み、反射迷路の規則を確かめている |
| explore | `x.exp_id`3 and `x.floor`5 | name は洞壁の霜紋を指でなぞり、魔力が濃い流脈の曲がりを読んだ |
| explore | `x.exp_id`3 and `x.floor`5 | name は結晶音の反響差を測り、崩れやすい空洞を先に封鎖した |
| explore | `x.exp_id`3 and `x.floor`5 | name は氷底に眠る古骨を避け、聖域を穢さぬ迂回線を仲間へ示した |
| explore | `x.exp_id`3 and `x.floor`5 | name は蒼光を返す鉱脈を見つけ、道標として使える稜線を刻んでいる |
| explore | `x.exp_id`3 and `x.floor`5 | name は結露が凍る速さを確かめ、長居できる区画の限界を算出した |
| explore | `x.exp_id`3 and `x.floor`5 | name は氷花が咲く裂け目に耳を寄せ、奥層の風道を静かに聞き取った |
| explore | `x.exp_id`3 and `x.floor`5 | name は晶洞の天井に吊る霜柱を見上げ、接触を避ける低姿勢で進んだ |
| explore | `x.exp_id`3 and `x.floor`5 | name は青光に紛れる幻影を見破り、本物の通路だけを白墨で示した |
| explore | `x.exp_id`3 and `x.floor`5 | name は凍土祭壇の欠片を拾い、結晶信仰の古語を記録帳へ写した |
| explore | `x.exp_id`3 and `x.floor`6 | name は降りしきる雪の静寂で歩を緩め、古き長老庭へ一礼して入った |
| explore | `x.exp_id`3 and `x.floor`6 | name は石標に刻まれた狐印を拭い、評議の席順を慎ましく読み解いた |
| explore | `x.exp_id`3 and `x.floor`6 | name は御神木の根元で風の詞を聞き、失われた盟約の断章を拾っている |
| explore | `x.exp_id`3 and `x.floor`6 | name は雪に埋もれた座石を掘り出し、供物の並べ方を古式どおり整えた |
| explore | `x.exp_id`3 and `x.floor`6 | name は祈念杭の傾きを正し、結界線がまだ生きていることを確かめた |
| explore | `x.exp_id`3 and `x.floor`6 | name は聖庭を巡る足跡の疎密から、守り手が交替する時刻を推し量った |
| explore | `x.exp_id`3 and `x.floor`6 | name は氷結した香炉を温め、淡い煙で方位を読む古儀を再現している |
| explore | `x.exp_id`3 and `x.floor`6 | name は長老碑の欠けた一文を継ぎ、冬盟の誓いが続いた証を見いだした |
| explore | `x.exp_id`3 and `x.floor`6 | name は梢を渡る雪片の舞いから、聖域に触れてはならぬ境を見極めた |
| explore | `x.exp_id`3 and `x.floor`6 | name は白狐像へ小枝を供え、この森を守る誓約に静かに頭を垂れた |
| explore | `x.exp_id`3 and `x.floor`1 | 深雪の針葉林では獣道が細く続き、白い静けさの中で進路が慎重に定められた |
| explore | `x.exp_id`3 and `x.floor`1 | 樹冠から落ちる粉雪が視界を曇らせ、足場確認を優先する運用へ切り替えられた |
| explore | `x.exp_id`3 and `x.floor`1 | 凍てた境石が掘り当てられ、古い森路の輪郭が探索図へ再記録された |
| explore | `x.exp_id`3 and `x.floor`1 | 松脂の匂いが濃い帯は野獣巡回圏と判断され、風下迂回が徹底されている |
| explore | `x.exp_id`3 and `x.floor`1 | 雪面反射で遠近感が狂いやすく、隊列間隔の固定規定が強化された |
| explore | `x.exp_id`3 and `x.floor`1 | 枝鳴りの高さ差から重雪域が推定され、倒木危険帯の外周が更新された |
| explore | `x.exp_id`3 and `x.floor`1 | 薄い燐光が見える区画は迷い現象の兆候とされ、目印杭の追加が実施された |
| explore | `x.exp_id`3 and `x.floor`1 | 凍傷予防の小休止間隔が見直され、長時間行軍時の損耗が抑制された |
| explore | `x.exp_id`3 and `x.floor`1 | 獣毛の付着点分布から、夜間の移動流向が高精度で推定されている |
| explore | `x.exp_id`3 and `x.floor`1 | 白樺林の風裏を使う進行法が定着し、体温低下率の改善が報告された |
| explore | `x.exp_id`3 and `x.floor`2 | 狩人道には擬装罠が密集し、踏査は先端検知を伴う低速運用へ移行した |
| explore | `x.exp_id`3 and `x.floor`2 | 樹上見張り台の視線重複が解析され、無露見で抜ける時間窓が設定された |
| explore | `x.exp_id`3 and `x.floor`2 | 枝先鈴罠の共鳴範囲が測定され、接近時の無音解除手順が標準化された |
| explore | `x.exp_id`3 and `x.floor`2 | 足跡に混ざる灰散布は追跡攪乱策と判明し、逆算読図の精度が向上した |
| explore | `x.exp_id`3 and `x.floor`2 | 落とし戸の偽装材質が共有され、雪下空洞を避ける迂回路網が拡張された |
| explore | `x.exp_id`3 and `x.floor`2 | 合図笛の節回しが採譜され、巡回班の交代周期が見える化された |
| explore | `x.exp_id`3 and `x.floor`2 | 矢羽落下の偏りから伏撃角度が再現され、死角進行の成功率が高まった |
| explore | `x.exp_id`3 and `x.floor`2 | 樹皮刻印の更新時期が比較され、最近稼働した狩場境が限定された |
| explore | `x.exp_id`3 and `x.floor`2 | 風向固定の匂い対策により、追尾獣への被発見率低下が維持されている |
| explore | `x.exp_id`3 and `x.floor`2 | 罠列の空白区画が洗い出され、安全通過の基準線として全隊へ共有された |
| explore | `x.exp_id`3 and `x.floor`3 | 雪屋根の集落遺構が確認され、冬適応型の生活動線が体系的に記録された |
| explore | `x.exp_id`3 and `x.floor`3 | 灯籠道の配列復元により、吹雪時の避難誘導設計が再現されつつある |
| explore | `x.exp_id`3 and `x.floor`3 | 井戸縁の祈札群が保全され、共同体の守護儀礼が継続していたと裏付けられた |
| explore | `x.exp_id`3 and `x.floor`3 | 倉印の残存率から、急退避時の備蓄搬出優先順位が推定された |
| explore | `x.exp_id`3 and `x.floor`3 | 戸板の斬痕方向が一致し、襲撃主力の進入線が一本化されていると判定された |
| explore | `x.exp_id`3 and `x.floor`3 | 神楽面の散布範囲が整理され、祭礼場崩壊の時系列が更新された |
| explore | `x.exp_id`3 and `x.floor`3 | 木橋下の護符結びは外来除け機能を持ち、回避導線の再設定が行われた |
| explore | `x.exp_id`3 and `x.floor`3 | 炉端石の温度差測定により、先行調査隊との時間差が精密化された |
| explore | `x.exp_id`3 and `x.floor`3 | 路地の雪踏み密度から、住民集合地点の候補が段階的に絞り込まれた |
| explore | `x.exp_id`3 and `x.floor`3 | 屋根雪落下帯の監視強化で、市街通過時の負傷率が抑制されている |
| explore | `x.exp_id`3 and `x.floor`4 | 凍湖横断は氷厚観測を前提とし、停止合図の閾値が再定義された |
| explore | `x.exp_id`3 and `x.floor`4 | 風紋と亀裂線の相関解析で、薄氷危険帯の地図精度が向上した |
| explore | `x.exp_id`3 and `x.floor`4 | 裂氷音の周波数分類が進み、崩断前兆の早期検知が可能となった |
| explore | `x.exp_id`3 and `x.floor`4 | 岸杭の埋没深度比較から、季節ごとの安全渡湖線が再構築された |
| explore | `x.exp_id`3 and `x.floor`4 | 雪煙で消える対岸灯は方位誤認を誘発し、補助羅針運用が義務化された |
| explore | `x.exp_id`3 and `x.floor`4 | 氷下影の移動流が記録され、群泳獣との交差回避計画が更新された |
| explore | `x.exp_id`3 and `x.floor`4 | 漁網残骸の位置一致から、落氷頻発区画の境界が確定した |
| explore | `x.exp_id`3 and `x.floor`4 | 月光反射で生じる視差対策として、隊列内標識の色規定が改訂された |
| explore | `x.exp_id`3 and `x.floor`4 | 凍舟着き場の遺構確認により、旧交易路の補給点候補が復元された |
| explore | `x.exp_id`3 and `x.floor`4 | 横風強度の蓄積値を基に、渡湖可否の判断基準が厳格化された |
| explore | `x.exp_id`3 and `x.floor`5 | 晶洞内の反射迷路は方位喪失を招きやすく、標識連結法が強化された |
| explore | `x.exp_id`3 and `x.floor`5 | 霜紋の成長方向が魔力流脈と一致し、進行可能帯の推定精度が上がった |
| explore | `x.exp_id`3 and `x.floor`5 | 結晶共鳴音の分布図作成で、崩落予兆区画の監視密度が増強された |
| explore | `x.exp_id`3 and `x.floor`5 | 氷底古骨の周辺は禁足扱いとなり、聖域保全を伴う迂回導線が設定された |
| explore | `x.exp_id`3 and `x.floor`5 | 蒼光鉱脈の連なりが道標化され、往復経路の再現性が改善している |
| explore | `x.exp_id`3 and `x.floor`5 | 低温滞在限界の再評価により、探索と退避の切替時刻が前倒しされた |
| explore | `x.exp_id`3 and `x.floor`5 | 霜柱落下の危険評価が更新され、通過時の姿勢規定が低位化された |
| explore | `x.exp_id`3 and `x.floor`5 | 幻影発生域の色差検証で、偽通路誤進入の件数が有意に減少した |
| explore | `x.exp_id`3 and `x.floor`5 | 凍土祭壇片の読解が進み、結晶信仰圏の儀礼語彙が新規登録された |
| explore | `x.exp_id`3 and `x.floor`5 | 洞気流の脈動観測から、奥層と外縁を結ぶ風道網が推定された |
| explore | `x.exp_id`3 and `x.floor`6 | 聖庭石標群の配置復元により、長老評議の座次秩序が再確認された |
| explore | `x.exp_id`3 and `x.floor`6 | 御神木周辺の風音記録が蓄積され、境界結界の活性周期が推定された |
| explore | `x.exp_id`3 and `x.floor`6 | 供物座石の痕跡比較から、季節儀礼の実施頻度が上方修正された |
| explore | `x.exp_id`3 and `x.floor`6 | 祈念杭の傾斜補正で、外縁結界線の連続性が部分的に回復した |
| explore | `x.exp_id`3 and `x.floor`6 | 足跡疎密の解析により、守り手の交替時間帯が統計的に抽出された |
| explore | `x.exp_id`3 and `x.floor`6 | 香炉煙の流線追跡で、聖域内の安定進行路が高精度で示された |
| explore | `x.exp_id`3 and `x.floor`6 | 長老碑の欠文接合が進み、冬盟誓約の継承系譜が再構築された |
| explore | `x.exp_id`3 and `x.floor`6 | 白狐像群の向き一致から、祈祷時の巡礼動線が復元されている |
| explore | `x.exp_id`3 and `x.floor`6 | 梢雪の落下分布が境界指標と合致し、禁触区画の再設定が完了した |
| explore | `x.exp_id`3 and `x.floor`6 | 聖庭外周の碑片整理で、評議場末期の防衛改修記録が補強された |
| explore | `x.exp_id`4 and `x.floor`1 | name は巨岩の門柱に刻まれた熊紋へ手を当て、古き関門の誓いを確かめている |
| explore | `x.exp_id`4 and `x.floor`1 | name は狭い峠道に残る盾列の跡を追い、守備隊の布陣線を読み解いた |
| explore | `x.exp_id`4 and `x.floor`1 | name は山風に軋む鉄門の鎖を整え、退路を閉ざさぬよう進路を選んでいる |
| explore | `x.exp_id`4 and `x.floor`1 | name は岩壁の見張り窓へ視線を巡らせ、伏兵が潜む死角を先に潰した |
| explore | `x.exp_id`4 and `x.floor`1 | name は崩れた防壁石を乗り越え、熊族が築いた外郭路へ静かに足を踏み入れた |
| explore | `x.exp_id`4 and `x.floor`1 | name は門前に散る槍片を拾い、最初の防衛戦が激戦だったと仲間へ告げた |
| explore | `x.exp_id`4 and `x.floor`1 | name は関門脇の狼煙台を確かめ、合図が届く高所線を地図へ刻んでいる |
| explore | `x.exp_id`4 and `x.floor`1 | name は石畳の摩耗を見て、補給隊が往来した古道の太さを測り取った |
| explore | `x.exp_id`4 and `x.floor`1 | name は山門を抜ける突風へ身を伏せ、弓射線を避ける低姿勢で進んでいる |
| explore | `x.exp_id`4 and `x.floor`1 | name は防壁の影に残る祈祷印をなぞり、峠守たちの加護が続くと信じた |
| explore | `x.exp_id`4 and `x.floor`2 | name は尾根の監視塔を見上げ、谷を渡る視界線の重なりを数えている |
| explore | `x.exp_id`4 and `x.floor`2 | name は崩れた階段を這い上がり、見張り台から侵入路の全景を掴んだ |
| explore | `x.exp_id`4 and `x.floor`2 | name は塔壁に刻まれた交代刻印を読み、巡回の間隙へ歩調を合わせた |
| explore | `x.exp_id`4 and `x.floor`2 | name は稜線を叩く風音を聞き分け、警鐘に紛れる足音を消して進んでいる |
| explore | `x.exp_id`4 and `x.floor`2 | name は見張り火皿の煤を払い、かつての警戒網が生きた証を確かめた |
| explore | `x.exp_id`4 and `x.floor`2 | name は塔同士を結ぶ旗索の残骸を辿り、連絡路の順序を復元している |
| explore | `x.exp_id`4 and `x.floor`2 | name は断崖際の哨戒路を避け、雲影に紛れる内側の石道へ回り込んだ |
| explore | `x.exp_id`4 and `x.floor`2 | name は矢狭間越しに谷底を覗き、奇襲を受けにくい隊列へ組み替えた |
| explore | `x.exp_id`4 and `x.floor`2 | name は塔門に刺さる古矢を抜き、厳戒の記憶を胸に進軍速度を抑えている |
| explore | `x.exp_id`4 and `x.floor`2 | name は稜線の石像へ一礼し、峰を守る監視兵の魂へ無事を祈った |
| explore | `x.exp_id`4 and `x.floor`3 | name は山腹を裂く壕線へ降り、鉄盾の列が残した防衛帯を踏査している |
| explore | `x.exp_id`4 and `x.floor`3 | name は泥に沈んだ槍柄を引き上げ、退かぬ誓いがここにあったと悟った |
| explore | `x.exp_id`4 and `x.floor`3 | name は土塁の切れ目を見つけ、突撃路と退避路の交点を丁寧に記録した |
| explore | `x.exp_id`4 and `x.floor`3 | name は壕底の足場板を叩いて確かめ、崩落を避ける進路を選び取っている |
| explore | `x.exp_id`4 and `x.floor`3 | name は錆びた旗杭の向きを読み、当時の主戦軸を仲間へ示している |
| explore | `x.exp_id`4 and `x.floor`3 | name は防柵に絡む鎖を外し、隊が通れる幅へ通路を広げた |
| explore | `x.exp_id`4 and `x.floor`3 | name は壕上の岩陰で息を潜め、落石罠の合図線を慎重に切り分けた |
| explore | `x.exp_id`4 and `x.floor`3 | name は折れた角笛を拾い、反攻の号令が響いた刻を想像している |
| explore | `x.exp_id`4 and `x.floor`3 | name は土煙に埋もれた胸当てを払い、守備兵の紋章を静かに弔った |
| explore | `x.exp_id`4 and `x.floor`3 | name は壕路の分岐へ印石を置き、後続が迷わぬ導線を整えている |
| explore | `x.exp_id`4 and `x.floor`4 | name は赤く脈打つ地割れを跨ぎ、灼熱の炉野に続く細道を探っている |
| explore | `x.exp_id`4 and `x.floor`4 | name は噴気孔の周期を数え、炎柱が収まる瞬間だけを狙って渡った |
| explore | `x.exp_id`4 and `x.floor`4 | name は溶岩流の縁で熱歪みを見切り、幻の足場を避けて前進している |
| explore | `x.exp_id`4 and `x.floor`4 | name は焦げた岩棚へ護符を打ち、熱風で散らぬ目印を残した |
| explore | `x.exp_id`4 and `x.floor`4 | name は硫の匂いに顔布を締め、息継ぎできる風洞へ隊を導いている |
| explore | `x.exp_id`4 and `x.floor`4 | name は灼けた鎖橋のたわみを測り、荷重を分散して慎重に越えた |
| explore | `x.exp_id`4 and `x.floor`4 | name は火口壁に残る鍛冶印を見つけ、炉神へ捧げた古儀式を思い出した |
| explore | `x.exp_id`4 and `x.floor`4 | name は灰の舞う斜面へ低く構え、視界を奪う熱霞の中を進んでいる |
| explore | `x.exp_id`4 and `x.floor`4 | name はマグマ脈の明滅を読み、最も揺れの少ない岩路へ回り込んだ |
| explore | `x.exp_id`4 and `x.floor`4 | name は炎影に揺れる熊像へ祈り、灼熱を越える胆力を奮い立たせた |
| explore | `x.exp_id`4 and `x.floor`5 | name は山腹深くの大鍛炉跡へ入り、巨槌台に刻まれた工房紋を確かめた |
| explore | `x.exp_id`4 and `x.floor`5 | name は溶岩導水路の分岐を調べ、炉床へ熱を送る古機構を復元している |
| explore | `x.exp_id`4 and `x.floor`5 | name は黒鉄の金床に手を置き、英雄武具が鍛たれた残熱を感じ取った |
| explore | `x.exp_id`4 and `x.floor`5 | name は吊り鎖だらけの作業廊を進み、崩れた炉橋の安全帯を張っている |
| explore | `x.exp_id`4 and `x.floor`5 | name は煤けた銘板を磨き、名匠たちの連名を仲間へ読み上げた |
| explore | `x.exp_id`4 and `x.floor`5 | name は鍛造床に残る槌痕の間隔を測り、工房ごとの技法差を見抜いている |
| explore | `x.exp_id`4 and `x.floor`5 | name は炉室を巡る送風孔を塞ぎ、逆噴気を防いで進路を確保した |
| explore | `x.exp_id`4 and `x.floor`5 | name は割れた坩堝片を拾い、神鉄精錬が行われた証を袋へ収めた |
| explore | `x.exp_id`4 and `x.floor`5 | name は工房祭壇の灰を払って、鍛冶神へ無事帰還の願を捧げている |
| explore | `x.exp_id`4 and `x.floor`5 | name は赤光を反す炉天井を見上げ、次の崩落音が来る前に歩を速めた |
| explore | `x.exp_id`4 and `x.floor`6 | name は天を仰ぐ聖鍛峰へ辿り着き、巨炉祭壇の前で息を整えている |
| explore | `x.exp_id`4 and `x.floor`6 | name は風雪に晒された熊神像を拭い、峰を守る古誓へ静かに頭を垂れた |
| explore | `x.exp_id`4 and `x.floor`6 | name は祭壇柱の鍛造文様を読み、王工たちの系譜を辿っている |
| explore | `x.exp_id`4 and `x.floor`6 | name は峰上回廊のひび割れを跨ぎ、聖火台へ続く巡礼路を見定めた |
| explore | `x.exp_id`4 and `x.floor`6 | name は雲海を渡る鐘音に耳を澄まし、儀礼開始の合図を探っている |
| explore | `x.exp_id`4 and `x.floor`6 | name は風化した供物台へ鍛鉄片を置き、戦匠たちの魂へ敬意を示した |
| explore | `x.exp_id`4 and `x.floor`6 | name は星光を映す炉皿の縁をなぞり、天火を招く古式の配置を確かめた |
| explore | `x.exp_id`4 and `x.floor`6 | name は峰壁の旗穴を数え、守護団の布陣規模を推定している |
| explore | `x.exp_id`4 and `x.floor`6 | name は祭場を巡る石輪に印を結び、禁域へ踏み込まぬ境界を整えた |
| explore | `x.exp_id`4 and `x.floor`6 | name は暁の風に外套を翻し、聖なる鍛炉の頂で次の一歩を誓った |
| explore | `x.exp_id`4 and `x.floor`1 | 巨岩門柱の熊紋刻印は風化しつつも判読可能で、外郭防衛線の年代推定が進んだ |
| explore | `x.exp_id`4 and `x.floor`1 | 石門蝶番の摩耗方向から、関門開閉頻度と補給通行量の相関が確認された |
| explore | `x.exp_id`4 and `x.floor`1 | 防壁上の矢狭間間隔計測により、対谷射線の重複域が地図化された |
| explore | `x.exp_id`4 and `x.floor`1 | 門前石畳の沈下分布が重装輸送路を示し、進軍導線の再現性が向上した |
| explore | `x.exp_id`4 and `x.floor`1 | 狼煙台基壇の煤層分析から、外敵接近時の信号運用周期が抽出された |
| explore | `x.exp_id`4 and `x.floor`1 | 防壁内側の祈祷印配置は守護儀礼と一致し、精神防衛網の構造が補強された |
| explore | `x.exp_id`4 and `x.floor`1 | 崩落石材の刻印照合で、門郭補修に複数工房が関与した事実が裏付けられた |
| explore | `x.exp_id`4 and `x.floor`1 | 風路観測により関門通過時の聴覚死角が判明し、潜行手順が更新された |
| explore | `x.exp_id`4 and `x.floor`1 | 門塔階段の踏耗差比較で、哨戒班と工兵班の移動経路が分離推定された |
| explore | `x.exp_id`4 and `x.floor`1 | 峠側石垣の継ぎ目補修痕から、最終防衛期の急造改修記録が復元された |
| explore | `x.exp_id`4 and `x.floor`2 | 稜線監視塔の視界重畳解析で、谷道監視網の盲点区画が特定された |
| explore | `x.exp_id`4 and `x.floor`2 | 塔内交代刻印の時系列整理により、哨戒間隔の季節変動が抽出された |
| explore | `x.exp_id`4 and `x.floor`2 | 旗索固定環の残存位置から、緊急連絡方向の優先順位が再構築された |
| explore | `x.exp_id`4 and `x.floor`2 | 風鳴りと警鐘共鳴の周波数分離で、偽警報判定精度が改善している |
| explore | `x.exp_id`4 and `x.floor`2 | 塔門古矢の材質比較により、交戦相手勢力の装備系統が追加同定された |
| explore | `x.exp_id`4 and `x.floor`2 | 断崖哨戒路の足場幅測定で、重装巡回と軽装伝令の導線差が確認された |
| explore | `x.exp_id`4 and `x.floor`2 | 火皿煤層の堆積厚から、夜間警戒強化期の持続日数が推定された |
| explore | `x.exp_id`4 and `x.floor`2 | 見張り窓の開口角補正で、対上昇侵入の監視効率が定量化された |
| explore | `x.exp_id`4 and `x.floor`2 | 塔外石像の配置は方位儀礼を示し、監視任務の誓約構文が解読された |
| explore | `x.exp_id`4 and `x.floor`2 | 雲霧流の記録蓄積により、稜線潜行の適正時刻帯が更新された |
| explore | `x.exp_id`4 and `x.floor`3 | 壕線断面の再測量で、防衛深度と兵站支援路の連動設計が確認された |
| explore | `x.exp_id`4 and `x.floor`3 | 錆盾列の間隔解析により、近接阻止陣形の標準配置が復元された |
| explore | `x.exp_id`4 and `x.floor`3 | 壕底足場板の腐朽度比較から、最終使用期の降雨条件が推定された |
| explore | `x.exp_id`4 and `x.floor`3 | 土塁切れ目の堆積差が反撃路候補を示し、機動迂回計画が再評価された |
| explore | `x.exp_id`4 and `x.floor`3 | 防柵鎖節の破断面検査で、破壊時の衝撃方向が高精度で特定された |
| explore | `x.exp_id`4 and `x.floor`3 | 角笛残片の音孔配列比較から、号令系統の階梯構造が補完された |
| explore | `x.exp_id`4 and `x.floor`3 | 壕上落石罠の索線痕追跡で、起動位置の安全回避帯が確定した |
| explore | `x.exp_id`4 and `x.floor`3 | 胸甲紋章群の照合が進み、守備連隊の編成規模推定が上方修正された |
| explore | `x.exp_id`4 and `x.floor`3 | 壕路分岐への標識石再配置で、後続隊の迷走率が有意に低下した |
| explore | `x.exp_id`4 and `x.floor`3 | 土煙粒度の地層比較から、戦闘期における重踏圧区画が抽出された |
| explore | `x.exp_id`4 and `x.floor`4 | 地割れ熱流の時系列観測で、炉野横断の安全窓が再定義された |
| explore | `x.exp_id`4 and `x.floor`4 | 噴気孔周期の同期解析により、炎柱連鎖発生域の予測精度が向上した |
| explore | `x.exp_id`4 and `x.floor`4 | 溶岩縁の熱歪み補正が進み、視覚誤認による転落件数が抑制された |
| explore | `x.exp_id`4 and `x.floor`4 | 焦岩面への耐熱標識再設置で、退避導線の視認性が恒常化された |
| explore | `x.exp_id`4 and `x.floor`4 | 硫気濃度分布図の更新により、呼吸保護具交換時刻が最適化された |
| explore | `x.exp_id`4 and `x.floor`4 | 鎖橋たわみの荷重試験結果から、隊列通過順序の規定が改訂された |
| explore | `x.exp_id`4 and `x.floor`4 | 火口壁鍛冶印の位置一致が確認され、炉神儀礼圏の境界が再構築された |
| explore | `x.exp_id`4 and `x.floor`4 | 灰流風向の記録蓄積で、熱霞下の視程補助手順が標準化された |
| explore | `x.exp_id`4 and `x.floor`4 | マグマ脈明滅の同期帯抽出により、低揺動岩路の選定精度が上がった |
| explore | `x.exp_id`4 and `x.floor`4 | 炎影領域の像差検証で、錯視進入リスクの高い区画が明示された |
| explore | `x.exp_id`4 and `x.floor`5 | 大鍛炉主室の平面復元により、工房区画と祭祀区画の機能分離が判明した |
| explore | `x.exp_id`4 and `x.floor`5 | 溶岩導水路の勾配再計測で、炉床加熱効率の設計思想が再確認された |
| explore | `x.exp_id`4 and `x.floor`5 | 金床表面の槌痕密度比較から、用途別鍛造台の役割分担が推定された |
| explore | `x.exp_id`4 and `x.floor`5 | 作業廊吊り鎖の応力痕解析で、運搬機構の最大荷重が算定された |
| explore | `x.exp_id`4 and `x.floor`5 | 煤化銘板の接合進展により、名匠連盟の継承系譜が補完された |
| explore | `x.exp_id`4 and `x.floor`5 | 鍛造床打刻間隔の統計処理で、工房ごとの工程時間差が可視化された |
| explore | `x.exp_id`4 and `x.floor`5 | 送風孔逆流試験の結果、炉室通過時の停止閾値が厳格化された |
| explore | `x.exp_id`4 and `x.floor`5 | 坩堝片成分の再分析により、神鉄精錬工程の温度帯が上方補正された |
| explore | `x.exp_id`4 and `x.floor`5 | 工房祭壇灰層の年代比定が進み、鍛冶儀礼の継続期間が明確化された |
| explore | `x.exp_id`4 and `x.floor`5 | 炉天井亀裂の伸長監視で、崩落予兆区画の封鎖判断が迅速化された |
| explore | `x.exp_id`4 and `x.floor`6 | 聖鍛峰祭場の軸線復元により、天体観測と儀礼導線の一致が確認された |
| explore | `x.exp_id`4 and `x.floor`6 | 熊神像表面の風化差比較で、補修祭の実施周期が統計的に抽出された |
| explore | `x.exp_id`4 and `x.floor`6 | 祭壇柱鍛造文様の照合から、王工系譜の分岐年代が再整理された |
| explore | `x.exp_id`4 and `x.floor`6 | 峰上回廊亀裂の変位観測により、巡礼路通行可能帯が更新された |
| explore | `x.exp_id`4 and `x.floor`6 | 雲海鐘音の到達時間差測定で、儀礼開始合図の伝播範囲が推定された |
| explore | `x.exp_id`4 and `x.floor`6 | 供物台残渣の材質分析が進み、戦匠奉納品の分類体系が拡張された |
| explore | `x.exp_id`4 and `x.floor`6 | 炉皿反射角の再計測で、天火招来儀式の配置精度が補強された |
| explore | `x.exp_id`4 and `x.floor`6 | 峰壁旗穴の間隔規格化により、守護団編成基準の推定誤差が縮小した |
| explore | `x.exp_id`4 and `x.floor`6 | 外輪石の境界標識再接合で、禁域管理線の連続性が回復している |
| explore | `x.exp_id`4 and `x.floor`6 | 暁風時の祭場微振動記録が蓄積され、高所滞在上限の判断精度が改善した |
| explore | `x.exp_id`8 and `x.floor`1 | name は峡谷の薄霧に紛れた結界紋を見抜き、谷門の正しい通行路を選び取った |
| explore | `x.exp_id`8 and `x.floor`1 | name は断崖に走る古い導線をたどり、見えざる障壁の脈動を確かめている |
| explore | `x.exp_id`8 and `x.floor`1 | name は見張り碑に触れて敬礼し、Cervinの哨戒網へ干渉せぬよう進んでいる |
| explore | `x.exp_id`8 and `x.floor`1 | name は風に混じる警告鐘の余韻を聞き分け、禁足域の縁を静かに迂回した |
| explore | `x.exp_id`8 and `x.floor`1 | name は谷壁の水晶片に映る光符を読み、正門を開く位相の刻を待っている |
| explore | `x.exp_id`8 and `x.floor`1 | name は巡礼路に残る蹄印を追い、番人たちが許した安全帯を踏みしめた |
| explore | `x.exp_id`8 and `x.floor`1 | name は夜露を帯びた祈祷札を拾い、守護者の誓約が今も生きると知った |
| explore | `x.exp_id`8 and `x.floor`1 | name は崖間を渡る細道で息を潜め、静かな監視眼の気配を受け流している |
| explore | `x.exp_id`8 and `x.floor`1 | name は谷門上の星見窓を見上げ、入谷許可を示す光の合図を待ち受けた |
| explore | `x.exp_id`8 and `x.floor`1 | name は薄青い防壁の揺らぎを観測し、侵入者と巡礼者を分ける境を見定めた |
| explore | `x.exp_id`8 and `x.floor`2 | name は水晶塔群の共鳴音を記録し、天測信号の流れが乱れていないか確かめた |
| explore | `x.exp_id`8 and `x.floor`2 | name は結晶柱の影角を測り、時辰ごとに変わる観測窓の開閉を読み解いている |
| explore | `x.exp_id`8 and `x.floor`2 | name は霧中に浮かぶ微光粒を追跡し、予見機構へ注ぐ星塵導路を特定した |
| explore | `x.exp_id`8 and `x.floor`2 | name は観測台の祭文を解読し、触れてよい結晶と禁触結晶を判別している |
| explore | `x.exp_id`8 and `x.floor`2 | name は風鈴めく警報子の震えから、感知網が捉える死角の幅を割り出した |
| explore | `x.exp_id`8 and `x.floor`2 | name は水晶根元の紋環を照合し、信号増幅塔の巡回順路を仲間へ示した |
| explore | `x.exp_id`8 and `x.floor`2 | name は星図盤へ方位針を合わせ、予測演算に使われる基準軸を再確認した |
| explore | `x.exp_id`8 and `x.floor`2 | name は稜線を渡る閃光周期を数え、警戒が緩むわずかな刻限を掴んでいる |
| explore | `x.exp_id`8 and `x.floor`2 | name は結晶面に映る己の残像を避け、認証を誤作動させぬ歩調で進んだ |
| explore | `x.exp_id`8 and `x.floor`2 | name は天穹へ伸びる塔列を見渡し、谷の意志そのもののような精密さに息をのんだ |
| explore | `x.exp_id`8 and `x.floor`3 | name は回転環の軋みを聞き分け、同期ずれを起こした調整台を先に外した |
| explore | `x.exp_id`8 and `x.floor`3 | name は黄銅の指標輪に刻まれた暦式をなぞり、天球周期との誤差を点検している |
| explore | `x.exp_id`8 and `x.floor`3 | name は段状テラスの観測鏡を磨き、未来演算へ注ぐ星光束を澄ませた |
| explore | `x.exp_id`8 and `x.floor`3 | name は校正杖を地に立て、時流の揺らぎが許容域に収まるのを待っている |
| explore | `x.exp_id`8 and `x.floor`3 | name は環座標に合わせて陣標を動かし、予知儀の焦点をゆっくり結び直した |
| explore | `x.exp_id`8 and `x.floor`3 | name は高台の風見晶から流速を読み、演算陣へ混入する乱流を遮断した |
| explore | `x.exp_id`8 and `x.floor`3 | name は補助環へ魔力を分配し、主輪の共振が暴走しないよう制御している |
| explore | `x.exp_id`8 and `x.floor`3 | name は星読官の古手帳を開き、同位相日に残された警句を照合した |
| explore | `x.exp_id`8 and `x.floor`3 | name は揺れる計測針を指先で止め、時界の段差が生む誤算を修正している |
| explore | `x.exp_id`8 and `x.floor`3 | name は光環が重なる瞬間を見届け、予見系が再同期した兆しを記録した |
| explore | `x.exp_id`8 and `x.floor`4 | name は書架回廊の封蝋紐を解き、百年分の予測録から欠頁を探し出した |
| explore | `x.exp_id`8 and `x.floor`4 | name は記録水晶に残る囁きを採譜し、分岐年表の改訂痕を突き止めている |
| explore | `x.exp_id`8 and `x.floor`4 | name は分類印章を照合し、禁書区へ誤って踏み入らぬ導線を組み立てた |
| explore | `x.exp_id`8 and `x.floor`4 | name は索引卓の浮遊札を追い、失われた未来断章の所在を絞り込んでいる |
| explore | `x.exp_id`8 and `x.floor`4 | name は保存庫の温湿符を調整し、脆い羊皮予言書の劣化を食い止めた |
| explore | `x.exp_id`8 and `x.floor`4 | name は学僧の注記余白を読み、封印門異常が初めて記された夜を特定した |
| explore | `x.exp_id`8 and `x.floor`4 | name は年代棚の配列癖を見抜き、改竄された冊子だけを静かに抜き取った |
| explore | `x.exp_id`8 and `x.floor`4 | name は知恵灯の明滅規則を解読し、閲覧許可を示す光階梯を昇っている |
| explore | `x.exp_id`8 and `x.floor`4 | name は書記官像の視線を避け、自動監査術式を起こさぬ歩幅で移動した |
| explore | `x.exp_id`8 and `x.floor`4 | name は折り畳まれた星図写本を広げ、封域周辺で増える異常波形を確認した |
| explore | `x.exp_id`8 and `x.floor`5 | name は黒曜の封環へ耳を当て、地の底から滲む異界の脈動を聞き取った |
| explore | `x.exp_id`8 and `x.floor`5 | name は拘束鎖の符節を点検し、劣化した連結部へ補助刻印を施している |
| explore | `x.exp_id`8 and `x.floor`5 | name は監視祭壇の燭火色を見て、封印圧が揺らぐ前兆域を割り出した |
| explore | `x.exp_id`8 and `x.floor`5 | name は奈落縁の観測孔を覗き、理外の囁きが届く周期を記録している |
| explore | `x.exp_id`8 and `x.floor`5 | name は抑制陣の欠けた節点へ魔粉を撒き、漏出する歪光を一時的に塞いだ |
| explore | `x.exp_id`8 and `x.floor`5 | name は封門前の誓約碑を再起動し、守護手順の最終条文を唱和している |
| explore | `x.exp_id`8 and `x.floor`5 | name は結界杭の傾きを直し、次の震動波に備えて支持網を補強した |
| explore | `x.exp_id`8 and `x.floor`5 | name は暗闇に浮く裂け目光を測距し、門外存在の接近速度を推算している |
| explore | `x.exp_id`8 and `x.floor`5 | name は退避鐘の試鳴を済ませ、崩壊時の避難導線を仲間へ叩き込んだ |
| explore | `x.exp_id`8 and `x.floor`5 | name は封鎖輪が重なる静寂の中心で、祈りと計算を同時に積み上げている |
| explore | `x.exp_id`8 and `x.floor`6 | name は聖域中枢の予見機関へ接続し、無数の未来枝から破滅線を刈り取っている |
| explore | `x.exp_id`8 and `x.floor`6 | name は水銀めく演算鏡に手をかざし、封印維持に最適な介入時刻を選定した |
| explore | `x.exp_id`8 and `x.floor`6 | name は浮遊環廊の星紋を踏み、視えすぎる未来から心を守る詠唱を続けた |
| explore | `x.exp_id`8 and `x.floor`6 | name は高座の光繭へ記録鍵を差し込み、次世代へ継ぐ予兆データを封入した |
| explore | `x.exp_id`8 and `x.floor`6 | name は天蓋儀の回転位相を微調整し、監視網の盲点が生まれる秒差を潰した |
| explore | `x.exp_id`8 and `x.floor`6 | name は未来図廊に走る赤線を追い、封門崩壊へ至る連鎖要因を摘み取っている |
| explore | `x.exp_id`8 and `x.floor`6 | name は静謐なる祭壇で誓句を更新し、Cervinの守望契約を新たな時代へ繋いだ |
| explore | `x.exp_id`8 and `x.floor`6 | name は予見核の唸りを鎮め、過負荷で裂ける可能性世界を縫い合わせている |
| explore | `x.exp_id`8 and `x.floor`6 | name は天測窓に群れる流星符を読み、次の百年に訪れる危機群を分類した |
| explore | `x.exp_id`8 and `x.floor`6 | name は聖堂最奥の光輪陣で膝をつき、世界を守るためのただ一つの選択を刻んだ |
| explore | `x.exp_id`8 and `x.floor`1 | 峡谷の薄霧に紛れた結界紋を見抜き、谷門の正しい通行路が選定された |
| explore | `x.exp_id`8 and `x.floor`1 | 断崖に走る古い導線が追跡され、見えざる障壁の脈動周期が確認された |
| explore | `x.exp_id`8 and `x.floor`1 | 見張り碑への敬礼手順が実施され、哨戒網への干渉回避が維持された |
| explore | `x.exp_id`8 and `x.floor`1 | 風に混じる警告鐘の余韻解析で、禁足域縁辺の安全迂回路が確保された |
| explore | `x.exp_id`8 and `x.floor`1 | 谷壁水晶片に映る光符が解読され、正門開放位相の待機刻が確定した |
| explore | `x.exp_id`8 and `x.floor`1 | 巡礼路の蹄印追跡により、番人承認済みの安全帯が再確認された |
| explore | `x.exp_id`8 and `x.floor`1 | 夜露を帯びた祈祷札の回収から、守護誓約が現代まで継続していると判明した |
| explore | `x.exp_id`8 and `x.floor`1 | 崖間細道での監視眼気配観測により、潜行時の呼吸間隔基準が更新された |
| explore | `x.exp_id`8 and `x.floor`1 | 谷門上の星見窓観察結果から、入谷許可を示す光合図の発火順が記録された |
| explore | `x.exp_id`8 and `x.floor`1 | 薄青い防壁揺らぎの時系列化で、巡礼者判別境界の判定精度が向上した |
| explore | `x.exp_id`8 and `x.floor`2 | 水晶塔群の共鳴音記録が進み、天測信号流の乱調検出閾値が再設定された |
| explore | `x.exp_id`8 and `x.floor`2 | 結晶柱影角の連続測定により、時辰別観測窓の開閉表が更新された |
| explore | `x.exp_id`8 and `x.floor`2 | 霧中微光粒の追跡で、予見機構へ注ぐ星塵導路の分岐図が完成した |
| explore | `x.exp_id`8 and `x.floor`2 | 観測台祭文の再解読から、禁触結晶識別規則の誤記が修正された |
| explore | `x.exp_id`8 and `x.floor`2 | 風鈴型警報子の振幅解析により、感知網死角幅の算定誤差が縮小した |
| explore | `x.exp_id`8 and `x.floor`2 | 水晶根元紋環の照合結果が反映され、信号増幅塔の巡回順路が最適化された |
| explore | `x.exp_id`8 and `x.floor`2 | 星図盤への方位針再較正で、予測演算基準軸の偏差が解消された |
| explore | `x.exp_id`8 and `x.floor`2 | 稜線を渡る閃光周期の統計化により、警戒緩和刻限の抽出精度が改善した |
| explore | `x.exp_id`8 and `x.floor`2 | 結晶面残像干渉の回避試験で、認証誤作動発生率が有意に低下した |
| explore | `x.exp_id`8 and `x.floor`2 | 天穹へ伸びる塔列の俯瞰記録から、谷全体制御網の冗長性が確認された |
| explore | `x.exp_id`8 and `x.floor`3 | 回転環軋みの音響診断で、同期ずれ調整台の優先除外順が確立された |
| explore | `x.exp_id`8 and `x.floor`3 | 黄銅指標輪の暦式照合により、天球周期との誤差補正式が更新された |
| explore | `x.exp_id`8 and `x.floor`3 | 段状テラス観測鏡の清浄化後、未来演算へ注ぐ星光束の散乱率が低減した |
| explore | `x.exp_id`8 and `x.floor`3 | 校正杖基準点の再固定により、時流揺らぎ判定の許容域が再定義された |
| explore | `x.exp_id`8 and `x.floor`3 | 環座標に連動した陣標移設で、予知儀焦点の収束時間が短縮された |
| explore | `x.exp_id`8 and `x.floor`3 | 高台風見晶の流速記録蓄積から、演算陣乱流遮断手順が標準化された |
| explore | `x.exp_id`8 and `x.floor`3 | 補助環への魔力再配分試験で、主輪共振暴走の発生確率が抑制された |
| explore | `x.exp_id`8 and `x.floor`3 | 星読官古手帳の照合結果により、同位相日における警戒項目が増補された |
| explore | `x.exp_id`8 and `x.floor`3 | 計測針制動操作の再現実験で、時界段差由来の誤算補正精度が向上した |
| explore | `x.exp_id`8 and `x.floor`3 | 光環重複瞬間の観測蓄積から、予見系再同期判定の信頼度が上方修正された |
| explore | `x.exp_id`8 and `x.floor`4 | 書架回廊の封蝋紐再点検により、百年分予測録の欠頁位置が特定された |
| explore | `x.exp_id`8 and `x.floor`4 | 記録水晶の残響採譜結果から、分岐年表改訂痕の時期が絞り込まれた |
| explore | `x.exp_id`8 and `x.floor`4 | 分類印章照合の徹底で、禁書区誤進入を防ぐ導線規程が改定された |
| explore | `x.exp_id`8 and `x.floor`4 | 索引卓浮遊札の追跡統合により、未来断章所在候補が高精度で抽出された |
| explore | `x.exp_id`8 and `x.floor`4 | 保存庫温湿符の再調整により、羊皮予言書の劣化進行率が抑制された |
| explore | `x.exp_id`8 and `x.floor`4 | 学僧注記余白の年代比定で、封印門異常初報の夜刻が確定した |
| explore | `x.exp_id`8 and `x.floor`4 | 年代棚配列癖の解析により、改竄冊子抽出アルゴリズムが補強された |
| explore | `x.exp_id`8 and `x.floor`4 | 知恵灯明滅規則の解読進展で、閲覧許可光階梯の認証時間が短縮された |
| explore | `x.exp_id`8 and `x.floor`4 | 書記官像監査術式の回避手順化により、自動警報発生件数が減少した |
| explore | `x.exp_id`8 and `x.floor`4 | 星図写本の再展開測読で、封域周辺異常波形の増勢傾向が確認された |
| explore | `x.exp_id`8 and `x.floor`5 | 黒曜封環への音響聴診により、異界脈動の増幅周期が数値化された |
| explore | `x.exp_id`8 and `x.floor`5 | 拘束鎖符節の点検結果が反映され、劣化連結部への補助刻印が完了した |
| explore | `x.exp_id`8 and `x.floor`5 | 監視祭壇燭火色の連続監視で、封印圧揺動の前兆域が早期検知された |
| explore | `x.exp_id`8 and `x.floor`5 | 奈落縁観測孔からの記録蓄積により、理外囁き到達周期が確立された |
| explore | `x.exp_id`8 and `x.floor`5 | 抑制陣欠損節点への魔粉補填で、歪光漏出量が一時的に低減した |
| explore | `x.exp_id`8 and `x.floor`5 | 封門前誓約碑の再起動を通じ、守護手順最終条文の伝承が更新された |
| explore | `x.exp_id`8 and `x.floor`5 | 結界杭傾斜の補正作業により、次期震動波への支持網耐性が向上した |
| explore | `x.exp_id`8 and `x.floor`5 | 暗闇に浮く裂け目光の測距解析で、門外存在接近速度の推算幅が縮小した |
| explore | `x.exp_id`8 and `x.floor`5 | 退避鐘試鳴と訓練導線照合により、崩壊時避難の完了時間が短縮された |
| explore | `x.exp_id`8 and `x.floor`5 | 封鎖輪重複域の静穏観測で、祈祷同期時の安定係数が上方更新された |
| explore | `x.exp_id`8 and `x.floor`6 | 聖域中枢予見機関の再演算で、破滅線候補群の除外優先度が再編成された |
| explore | `x.exp_id`8 and `x.floor`6 | 水銀状演算鏡の介入試験により、封印維持最適時刻の推定誤差が低減した |
| explore | `x.exp_id`8 and `x.floor`6 | 浮遊環廊星紋の踏査記録から、過剰予見時の精神防護詠唱が標準化された |
| explore | `x.exp_id`8 and `x.floor`6 | 高座光繭への記録鍵封入で、次世代継承用予兆データの完全性が検証された |
| explore | `x.exp_id`8 and `x.floor`6 | 天蓋儀回転位相の微調整結果が反映され、監視網盲点秒差が解消された |
| explore | `x.exp_id`8 and `x.floor`6 | 未来図廊赤線群の追跡解析により、封門崩壊連鎖要因の優先遮断順が確立した |
| explore | `x.exp_id`8 and `x.floor`6 | 静謐祭壇での誓句更新記録が承認され、守望契約の時代継承が完了した |
| explore | `x.exp_id`8 and `x.floor`6 | 予見核唸動の鎮静処置により、可能性世界裂断リスクが抑制された |
| explore | `x.exp_id`8 and `x.floor`6 | 天測窓流星符の連続読解で、次百年危機群の分類精度が向上した |
| explore | `x.exp_id`8 and `x.floor`6 | 聖堂最奥光輪陣の誓約記録により、世界防衛選択の意思決定根拠が保存された |
| sound_sleep | with mainClass.`Fighter` | name は鎧を外したまま深く眠り、戦場の緊張を静かに解いている |
| sound_sleep | with mainClass.`Fighter` | name は盾を抱くようにして熟睡し、守る意志を休息に変えている |
| sound_sleep | with mainClass.`Fighter` | name は規則正しい寝息で体幹の疲労をじっくり回復している |
| sound_sleep | with mainClass.`Fighter` | name は古傷の痛みも忘れるほど深く眠りに沈んでいる |
| sound_sleep | with mainClass.`Fighter` | name は焚き火の番を仲間に託し、朝までぐっすり眠っている |
| sound_sleep | with mainClass.`Fighter` | name は重い装備の負担を手放し、安心した表情で眠っている |
| sound_sleep | with mainClass.`Fighter` | name は次の防衛戦に備え、芯まで休まる熟睡を取っている |
| sound_sleep | with mainClass.`Fighter` | name は横たわる姿勢のまま微動だにせず、深い睡眠を続けている |
| sound_sleep | with mainClass.`Fighter` | name は戦塵の匂いを洗い流すように静かな眠りへ身を預けた |
| sound_sleep | with mainClass.`Fighter` | name は夜明けまで眠り続け、頼れる体力を満たしている |
| nap_sleep | with mainClass.`Fighter` | name は盾を枕代わりにして短く仮眠を取り、すぐ立ち上がった |
| nap_sleep | with mainClass.`Fighter` | name は鎧の留め具を緩めた隙に、数分だけ目を閉じている |
| nap_sleep | with mainClass.`Fighter` | name は壁際に腰を下ろし、短時間で筋肉の張りを抜いている |
| nap_sleep | with mainClass.`Fighter` | name は見張り交代までの間に、手早く疲労を和らげている |
| nap_sleep | with mainClass.`Fighter` | name は荒い呼吸を整えながら、浅い眠りで気力を戻している |
| nap_sleep | with mainClass.`Fighter` | name は膝に手を置いたままうとうとし、行動準備を崩さない |
| nap_sleep | with mainClass.`Fighter` | name は短い睡眠で集中を立て直し、守りの感覚を取り戻した |
| nap_sleep | with mainClass.`Fighter` | name は剣帯を外さず仮眠を取り、即応の姿勢を保っている |
| nap_sleep | with mainClass.`Fighter` | name は火の温もりを借りて小休止し、足取りを軽くしている |
| nap_sleep | with mainClass.`Fighter` | name は合図ひとつで動けるよう、浅い眠りで体力を継ぎ足した |
| sound_sleep | with mainClass.`Duelist` | name は剣を傍らに置き、静謐な呼吸で深く眠っている |
| sound_sleep | with mainClass.`Duelist` | name は乱れのない寝姿のまま、朝まで熟睡を保っている |
| sound_sleep | with mainClass.`Duelist` | name は決闘の緊張を忘れ、穏やかな表情で眠り込んでいる |
| sound_sleep | with mainClass.`Duelist` | name は手首の疲れを癒すように、深い休息へ沈んでいる |
| sound_sleep | with mainClass.`Duelist` | name は剣筋を思い描く夢の中で、静かに体力を回復している |
| sound_sleep | with mainClass.`Duelist` | name は物音にも揺らがず、集中を蓄える熟睡を続けている |
| sound_sleep | with mainClass.`Duelist` | name は静かな寝息とともに、明日の勝負勘を養っている |
| sound_sleep | with mainClass.`Duelist` | name は一礼するような姿勢で横になり、深く眠っている |
| sound_sleep | with mainClass.`Duelist` | name は刃の手入れを終えて安心し、重い眠気に身を任せた |
| sound_sleep | with mainClass.`Duelist` | name は朝の稽古に備え、十分な睡眠で冴えを取り戻している |
| nap_sleep | with mainClass.`Duelist` | name は愛剣を抱えたまま、短い仮眠で感覚を整えている |
| nap_sleep | with mainClass.`Duelist` | name は呼吸の間合いを刻みながら、浅い眠りで休んでいる |
| nap_sleep | with mainClass.`Duelist` | name は椅子にもたれて目を閉じ、疲れた腕を休めている |
| nap_sleep | with mainClass.`Duelist` | name は数分の仮眠で集中線を結び直し、視線を鋭く戻した |
| nap_sleep | with mainClass.`Duelist` | name は物音に即応できる姿勢のまま、短い眠りを取っている |
| nap_sleep | with mainClass.`Duelist` | name は鞘鳴りを確かめた後、手早くひと眠りしている |
| nap_sleep | with mainClass.`Duelist` | name は瞼を閉じる一瞬で気を養い、再び背筋を伸ばした |
| nap_sleep | with mainClass.`Duelist` | name は勝負前の静寂のように、短い睡眠で気配を研いでいる |
| nap_sleep | with mainClass.`Duelist` | name は最小限の休息で体のぶれを整え、立ち姿を戻した |
| nap_sleep | with mainClass.`Duelist` | name は起床と同時に剣の柄へ手を添え、平常心を取り戻した |
| sound_sleep | with mainClass.`Ninja` | name は気配を溶かすように熟睡し、闇の中で体力を蓄えている |
| sound_sleep | with mainClass.`Ninja` | name は浅い物音を聞き流し、揺るがない深い眠りに入っている |
| sound_sleep | with mainClass.`Ninja` | name は装束を整えたまま横になり、朝まで静かに眠っている |
| sound_sleep | with mainClass.`Ninja` | name は呼吸を細く保ち、完全な休息で消耗を癒している |
| sound_sleep | with mainClass.`Ninja` | name は影のように動かぬ姿で、深い睡眠を続けている |
| sound_sleep | with mainClass.`Ninja` | name は任務の緊迫を手放し、穏やかな寝息で回復している |
| sound_sleep | with mainClass.`Ninja` | name は忍具を枕元に置き、安心して熟睡している |
| sound_sleep | with mainClass.`Ninja` | name は夜明け前まで目覚めず、俊敏さを取り戻している |
| sound_sleep | with mainClass.`Ninja` | name は体温を逃さぬ姿勢で眠り、静かに英気を養っている |
| sound_sleep | with mainClass.`Ninja` | name は長い潜入の疲労を深い眠りで洗い流している |
| nap_sleep | with mainClass.`Ninja` | name は物陰で膝を抱え、短い仮眠を素早く済ませている |
| nap_sleep | with mainClass.`Ninja` | name は見張りの死角を選び、数分だけ目を閉じている |
| nap_sleep | with mainClass.`Ninja` | name は呼気を整えながら、浅い眠りで集中を回復している |
| nap_sleep | with mainClass.`Ninja` | name は忍具の点検後に小休止し、気配を整えている |
| nap_sleep | with mainClass.`Ninja` | name は壁際で一瞬うとうとし、すぐ警戒態勢へ戻った |
| nap_sleep | with mainClass.`Ninja` | name は短時間で疲労を切り替え、足取りの軽さを取り戻した |
| nap_sleep | with mainClass.`Ninja` | name は静かな寝息を数回だけ刻み、目を開けて周囲を探った |
| nap_sleep | with mainClass.`Ninja` | name は最低限の睡眠で脈を整え、任務へ意識を向けた |
| nap_sleep | with mainClass.`Ninja` | name は影に紛れて仮眠を取り、気づかれずに立ち上がった |
| nap_sleep | with mainClass.`Ninja` | name は眠気を刃のように研ぎ直し、再び姿勢を低くした |
| sound_sleep | with mainClass.`Samurai` | name は刀をそばに置き、礼正しい姿勢で深く眠っている |
| sound_sleep | with mainClass.`Samurai` | name は静かな寝息のまま、心身の乱れを整えている |
| sound_sleep | with mainClass.`Samurai` | name は一日の戦いを胸中で閉じ、穏やかに熟睡している |
| sound_sleep | with mainClass.`Samurai` | name は気配を荒らさぬ眠りで、明日の一閃に備えている |
| sound_sleep | with mainClass.`Samurai` | name は具足の重みを解き、芯まで休まる眠りを取っている |
| sound_sleep | with mainClass.`Samurai` | name は朝稽古に向け、規律ある休息で体力を満たしている |
| sound_sleep | with mainClass.`Samurai` | name は焚き火の残り香の中、深い夢へと身を沈めた |
| sound_sleep | with mainClass.`Samurai` | name は痛みを忘れるほどの熟睡で、精神を澄ませている |
| sound_sleep | with mainClass.`Samurai` | name は夜明けまで一度も揺らがず、堂々と眠っている |
| sound_sleep | with mainClass.`Samurai` | name は静寂に溶けるような眠りで英気を養っている |
| nap_sleep | with mainClass.`Samurai` | name は正座を崩して短く仮眠し、呼吸を整えている |
| nap_sleep | with mainClass.`Samurai` | name は刀の柄に触れたまま、わずかな眠りで心を鎮めた |
| nap_sleep | with mainClass.`Samurai` | name は小休止で肩の力を抜き、再び背筋を伸ばした |
| nap_sleep | with mainClass.`Samurai` | name は無駄のない仮眠で疲れを流し、目を開けた |
| nap_sleep | with mainClass.`Samurai` | name は湯気の立つ茶を前に、数分だけ目を閉じている |
| nap_sleep | with mainClass.`Samurai` | name は短い眠りで拍動を整え、落ち着きを取り戻した |
| nap_sleep | with mainClass.`Samurai` | name は見張り交代の間に仮眠し、礼とともに立ち上がった |
| nap_sleep | with mainClass.`Samurai` | name は静かな所作で横になり、すぐ起きられる眠りを選んだ |
| nap_sleep | with mainClass.`Samurai` | name は端正な寝姿で小休止し、気力を補っている |
| nap_sleep | with mainClass.`Samurai` | name は刹那の睡眠で迷いを払い、視線を前へ戻した |
| sound_sleep | with mainClass.`Lord` | name は上質な寝具に身を預け、堂々と熟睡している |
| sound_sleep | with mainClass.`Lord` | name は宴の喧騒を忘れ、余裕ある寝顔で眠っている |
| sound_sleep | with mainClass.`Lord` | name は護衛を信じて深く眠り、体力を大きく回復している |
| sound_sleep | with mainClass.`Lord` | name は長旅の疲労を解き、朝まで穏やかに眠り続けた |
| sound_sleep | with mainClass.`Lord` | name は気品を崩さぬまま、規則正しい寝息で休んでいる |
| sound_sleep | with mainClass.`Lord` | name は明日の指揮に備え、十分な睡眠を確保している |
| sound_sleep | with mainClass.`Lord` | name は豪奢な毛布に包まれ、深い夢の中へ沈んでいる |
| sound_sleep | with mainClass.`Lord` | name は心配事を手放し、安心しきった表情で熟睡している |
| sound_sleep | with mainClass.`Lord` | name は静かな夜に守られ、堂々たる眠りを貫いている |
| sound_sleep | with mainClass.`Lord` | name は回復した気配を漂わせながら、夜明けまで眠っている |
| nap_sleep | with mainClass.`Lord` | name は椅子にもたれて短い仮眠を取り、すぐ指示を再開した |
| nap_sleep | with mainClass.`Lord` | name は帳簿を閉じて数分だけ目を閉じ、頭を休めている |
| nap_sleep | with mainClass.`Lord` | name は移動前の隙に仮眠し、余裕の笑みで目覚めた |
| nap_sleep | with mainClass.`Lord` | name は侍従に時刻を任せ、手早く気力を回復している |
| nap_sleep | with mainClass.`Lord` | name は短い眠りで判断力を整え、采配の準備を進めた |
| nap_sleep | with mainClass.`Lord` | name は肩肘張らずに小休止し、落ち着きを取り戻している |
| nap_sleep | with mainClass.`Lord` | name は浅い仮眠でも充分とばかりに、すぐ立ち上がった |
| nap_sleep | with mainClass.`Lord` | name は会話の合間に目を閉じ、疲れを最小限で払っている |
| nap_sleep | with mainClass.`Lord` | name は短時間の睡眠で表情を整え、再び場を仕切った |
| nap_sleep | with mainClass.`Lord` | name は華やかな外套を畳み、静かにひと眠りしている |
| sound_sleep | with mainClass.`Ranger` | name は森の匂いを胸いっぱいに吸い、深い眠りに入っている |
| sound_sleep | with mainClass.`Ranger` | name は野営の物音を気にせず、安定した寝息を刻んでいる |
| sound_sleep | with mainClass.`Ranger` | name は弓を手元に置き、朝までぐっすり眠っている |
| sound_sleep | with mainClass.`Ranger` | name は長い追跡の疲れを、静かな熟睡で癒している |
| sound_sleep | with mainClass.`Ranger` | name は星空の下で心地よく眠り、体力を満たしている |
| sound_sleep | with mainClass.`Ranger` | name は冷え込みを避ける寝袋で、深い休息を取っている |
| sound_sleep | with mainClass.`Ranger` | name は夜明けの鳥声まで目覚めず、集中力を回復している |
| sound_sleep | with mainClass.`Ranger` | name は自然のリズムに合わせ、穏やかに眠り続けている |
| sound_sleep | with mainClass.`Ranger` | name は足腰の疲労を抜き、軽やかな動きへ備えている |
| sound_sleep | with mainClass.`Ranger` | name は焚き火のぬくもりのそばで、安心して熟睡している |
| nap_sleep | with mainClass.`Ranger` | name は見晴らしの良い岩陰で短く仮眠し、すぐ周囲を確認した |
| nap_sleep | with mainClass.`Ranger` | name は弓弦を緩めた合間に、数分だけ目を閉じている |
| nap_sleep | with mainClass.`Ranger` | name は追跡の合間に小休止し、呼吸を整えている |
| nap_sleep | with mainClass.`Ranger` | name は荷を枕にして仮眠を取り、足取りを立て直した |
| nap_sleep | with mainClass.`Ranger` | name は風向きを確かめた後、浅い眠りで気力を戻している |
| nap_sleep | with mainClass.`Ranger` | name は短時間の睡眠で目の疲れを抜き、視界を研ぎ澄ました |
| nap_sleep | with mainClass.`Ranger` | name は野営地の端でうとうとし、すぐ合図に反応した |
| nap_sleep | with mainClass.`Ranger` | name は休める瞬間を逃さず、機敏な仮眠を済ませている |
| nap_sleep | with mainClass.`Ranger` | name は朝露の気配に合わせて起き、軽く体を伸ばした |
| nap_sleep | with mainClass.`Ranger` | name は木陰でひと眠りし、再び追跡の目を取り戻した |
| sound_sleep | with mainClass.`Wizard` | name は魔導書を閉じ、深い眠りで魔力の巡りを整えている |
| sound_sleep | with mainClass.`Wizard` | name は星の運行を夢に映しながら、静かに熟睡している |
| sound_sleep | with mainClass.`Wizard` | name は詠唱疲れを癒すように、規則正しい寝息を立てている |
| sound_sleep | with mainClass.`Wizard` | name は術式の残響を手放し、穏やかな眠りへ沈んでいる |
| sound_sleep | with mainClass.`Wizard` | name は杖を枕元に置き、安心して朝まで眠っている |
| sound_sleep | with mainClass.`Wizard` | name は深い休息で集中力を満たし、魔力回復を進めている |
| sound_sleep | with mainClass.`Wizard` | name は静かな寝顔のまま、長い研究の疲れを解いている |
| sound_sleep | with mainClass.`Wizard` | name は外界の雑音を遮り、完全な睡眠へ没入している |
| sound_sleep | with mainClass.`Wizard` | name は夢の中で符号を結び、明日の呪文準備を整えている |
| sound_sleep | with mainClass.`Wizard` | name は夜明けまで深く眠り、思考の冴えを取り戻している |
| nap_sleep | with mainClass.`Wizard` | name は魔導書を胸に、短い仮眠で思考をリセットしている |
| nap_sleep | with mainClass.`Wizard` | name は詠唱の合間に目を閉じ、わずかな睡眠を取っている |
| nap_sleep | with mainClass.`Wizard` | name は椅子に座ったままうとうとし、集中を立て直した |
| nap_sleep | with mainClass.`Wizard` | name はインクの乾きを待つ間に、短時間の休息を挟んでいる |
| nap_sleep | with mainClass.`Wizard` | name は浅い眠りで頭痛を和らげ、視線の焦点を戻した |
| nap_sleep | with mainClass.`Wizard` | name は杖に手を添えたまま仮眠し、すぐ詠唱姿勢へ戻った |
| nap_sleep | with mainClass.`Wizard` | name は数分の眠りで思考を整理し、術式を書き直している |
| nap_sleep | with mainClass.`Wizard` | name は寝過ごさぬよう短く休み、時間管理を崩さない |
| nap_sleep | with mainClass.`Wizard` | name は浅い睡眠で魔力酔いを抜き、冷静さを取り戻した |
| nap_sleep | with mainClass.`Wizard` | name は小休止の後にページを開き、研究を再開している |
| sound_sleep | with mainClass.`Sage` | name は書板を閉じ、深い眠りで知の疲労を静かに癒している |
| sound_sleep | with mainClass.`Sage` | name は呼吸を整えたまま、長く安定した熟睡を続けている |
| sound_sleep | with mainClass.`Sage` | name は祈りに似た寝姿で、穏やかな休息へ沈んでいる |
| sound_sleep | with mainClass.`Sage` | name は複雑な計算を忘れ、静かな夢の中で体力を回復している |
| sound_sleep | with mainClass.`Sage` | name は魔障を避ける結界の内で、安心して眠っている |
| sound_sleep | with mainClass.`Sage` | name は精神の波を鎮め、深層まで届く睡眠を取っている |
| sound_sleep | with mainClass.`Sage` | name は夜明けまで目覚めず、明晰な思考を取り戻している |
| sound_sleep | with mainClass.`Sage` | name は学究の疲れを手放し、静謐な寝息で休んでいる |
| sound_sleep | with mainClass.`Sage` | name は穏やかな表情のまま、十分な回復を重ねている |
| sound_sleep | with mainClass.`Sage` | name は夢の中で理を巡らせつつ、しっかり熟睡している |
| nap_sleep | with mainClass.`Sage` | name は注釈を書き終えた直後、短い仮眠で頭を休めている |
| nap_sleep | with mainClass.`Sage` | name は書物を枕にせず丁寧に閉じ、数分だけ目を閉じた |
| nap_sleep | with mainClass.`Sage` | name は浅い眠りで思考の熱を冷まし、呼吸を落ち着けている |
| nap_sleep | with mainClass.`Sage` | name は結界の確認後に小休止し、集中を継ぎ足している |
| nap_sleep | with mainClass.`Sage` | name は短時間の睡眠で眼精疲労を抜き、文字を追う力を戻した |
| nap_sleep | with mainClass.`Sage` | name は膝掛けを整えて仮眠し、静かに目を開けた |
| nap_sleep | with mainClass.`Sage` | name は講義の合間のように、要点だけ休む眠りを選んでいる |
| nap_sleep | with mainClass.`Sage` | name はわずかな睡眠で精神を整え、再び理路を組み立てた |
| nap_sleep | with mainClass.`Sage` | name は時計を見て仮眠を切り上げ、淡々と席を立った |
| nap_sleep | with mainClass.`Sage` | name は短い目覚めの後に微笑み、思索を再開している |
| sound_sleep | with mainClass.`Rogue` | name は隠し持った短剣をそばに、警戒なく深く眠っている |
| sound_sleep | with mainClass.`Rogue` | name は夜の喧騒を背に、したたかに熟睡している |
| sound_sleep | with mainClass.`Rogue` | name は駆け引きの緊張を忘れ、静かな寝息で休んでいる |
| sound_sleep | with mainClass.`Rogue` | name は鍵束を枕元に置き、安心して朝まで眠っている |
| sound_sleep | with mainClass.`Rogue` | name は長い潜伏の疲れを、深い睡眠で回復している |
| sound_sleep | with mainClass.`Rogue` | name はどんな雑音にも動じず、ぐっすり眠り込んでいる |
| sound_sleep | with mainClass.`Rogue` | name は軽やかな寝返りだけで、熟睡を保っている |
| sound_sleep | with mainClass.`Rogue` | name は夢の中でも笑みを浮かべ、余裕ある眠りを見せている |
| sound_sleep | with mainClass.`Rogue` | name は朝の仕事に備え、体力を満たす休息を取っている |
| sound_sleep | with mainClass.`Rogue` | name は疲労の気配を消すように、静かで深い眠りへ沈んだ |
| nap_sleep | with mainClass.`Rogue` | name は人目につかぬ席で短く仮眠し、すぐ姿勢を戻した |
| nap_sleep | with mainClass.`Rogue` | name は取引の合間に目を閉じ、数分で気力を整えている |
| nap_sleep | with mainClass.`Rogue` | name は荷袋を抱えたままうとうとし、警戒を切らしていない |
| nap_sleep | with mainClass.`Rogue` | name は浅い眠りで頭を冴えさせ、口上の準備を整えた |
| nap_sleep | with mainClass.`Rogue` | name は短時間の睡眠で疲労を隠し、いつもの笑顔に戻った |
| nap_sleep | with mainClass.`Rogue` | name は壁際で小休止し、足音ひとつで目を開けた |
| nap_sleep | with mainClass.`Rogue` | name は手早い仮眠の後、鍵開けの指先を確かめている |
| nap_sleep | with mainClass.`Rogue` | name は一瞬の眠りで切り替え、交渉の席へ戻っていった |
| nap_sleep | with mainClass.`Rogue` | name は短く夢を見て、次の機会を逃さぬ目つきに戻した |
| nap_sleep | with mainClass.`Rogue` | name は見張りに合図を送り、最小限の休息を済ませている |
| sound_sleep | with mainClass.`Pilgrim` | name は祈りを終えて深く眠り、静かな安らぎに包まれている |
| sound_sleep | with mainClass.`Pilgrim` | name は穏やかな寝顔で、旅の疲れを丁寧に癒している |
| sound_sleep | with mainClass.`Pilgrim` | name は念珠を手にしたまま、朝まで熟睡している |
| sound_sleep | with mainClass.`Pilgrim` | name は不安を手放し、信仰に寄り添う眠りを取っている |
| sound_sleep | with mainClass.`Pilgrim` | name は規則正しい寝息で、心身の均衡を回復している |
| sound_sleep | with mainClass.`Pilgrim` | name は仲間の無事を願う夢の中で、深い休息を得ている |
| sound_sleep | with mainClass.`Pilgrim` | name は静寂の礼拝堂のような空気に包まれ、眠っている |
| sound_sleep | with mainClass.`Pilgrim` | name は夜明けの祈鐘まで目覚めず、体力を満たしている |
| sound_sleep | with mainClass.`Pilgrim` | name は温かな毛布にくるまり、安心して熟睡している |
| sound_sleep | with mainClass.`Pilgrim` | name は長い道のりの疲労を、深い眠りで静かに流している |
| nap_sleep | with mainClass.`Pilgrim` | name は祈句をひとつ唱え、短い仮眠で心を整えている |
| nap_sleep | with mainClass.`Pilgrim` | name は壁際に座って目を閉じ、穏やかな小休止を取った |
| nap_sleep | with mainClass.`Pilgrim` | name は念珠を握ったままうとうとし、すぐ目を開けた |
| nap_sleep | with mainClass.`Pilgrim` | name は短時間の睡眠で気持ちを整え、静かに立ち上がった |
| nap_sleep | with mainClass.`Pilgrim` | name は休める隙に仮眠し、仲間への気配りを再開している |
| nap_sleep | with mainClass.`Pilgrim` | name は浅い眠りで疲れを和らげ、優しい表情を取り戻した |
| nap_sleep | with mainClass.`Pilgrim` | name は朝の祈りまでの間だけ、慎ましく眠っている |
| nap_sleep | with mainClass.`Pilgrim` | name は小さく息を整え、わずかな睡眠で足取りを軽くした |
| nap_sleep | with mainClass.`Pilgrim` | name は仲間の物音で目覚め、微笑みとともに頷いた |
| nap_sleep | with mainClass.`Pilgrim` | name は短い休息の後、感謝の言葉を口にしている |
| return | none | name は戦利品を抱えて拠点へ戻っている |
| return | none | name は疲れた足取りながらも帰路を急いでいる |
| return | none | name は今日の成果を確かめつつ歩いている |
| return | none | name は仲間と合流し安全な道を戻っている |
| return | none | name は夕暮れの中、拠点の灯りを目指している |
| return | none | name は傷をかばいながらも着実に帰っている |
| return | none | name は荷物を落とさぬよう慎重に運んでいる |
| return | none | name は道中の危険を避けつつ帰還している |
| return | none | name は無事の報告を思い浮かべながら進んでいる |
| return | none | name は長い遠征の終わりに安堵している |
| rest | none | 静かな場所で肩の力を抜いている |
| rest | none | 深く息を吐いて心身を落ち着けている |
| rest | none | 体を伸ばしてこわばりをほぐしている |
| rest | none | しばらく目を閉じて疲労を流している |
| rest | none | 温もりの中で穏やかな時間を過ごしている |
| rest | none | 腰を下ろして足の疲れを癒している |
| rest | none | 周囲の音を聞きながら休息している |
| rest | none | 乱れた呼吸を整えて体力を戻している |
| rest | none | 無理をせず静かに回復を待っている |
| rest | none | 次の行動に備えて英気を養っている |
| feast | none | 香り豊かな料理をゆっくり味わっている |
| feast | none | 温かな食事で空腹を満たしている |
| feast | none | 皿いっぱいの料理を楽しんでいる |
| feast | none | ごちそうを囲んで和やかに過ごしている |
| feast | none | 食卓の活気に笑顔がこぼれている |
| feast | none | 焼きたての一品を嬉しそうに口にしている |
| feast | none | たっぷりの食事で力を蓄えている |
| feast | none | 湯気立つ料理で体の芯まで温まっている |
| feast | none | 満足するまで食事を楽しんでいる |
| feast | none | 活力を取り戻すように食べ進めている |
| sell | none | 品物を丁寧に並べて買い手を待っている |
| sell | none | 価格表を見比べながら売却の準備をしている |
| sell | none | 相場を確認しつつ取引の機会をうかがっている |
| sell | none | 品質の良さを説明して交渉している |
| sell | none | 店先で落ち着いて値段の相談をしている |
| sell | none | 売れ筋を確かめながら品を選んでいる |
| sell | none | 取引内容を帳面に記録している |
| sell | none | 客の反応を見ながら価格を調整している |
| sell | none | 在庫を整理しながら販売を進めている |
| sell | none | 取引をまとめて次の商談に向かっている |
| sound_sleep | none | 夜明けまで深く穏やかに眠っている |
| sound_sleep | none | 体を休めることに集中して眠っている |
| sound_sleep | none | 安心した表情で静かに寝入っている |
| sound_sleep | none | 長い疲れを手放すように眠り込んでいる |
| sound_sleep | none | 柔らかな寝床で心地よく眠っている |
| sound_sleep | none | 規則正しい寝息で安定して休んでいる |
| sound_sleep | none | 朝に備えて十分な睡眠を取っている |
| sound_sleep | none | 深い休息で体力を大きく回復している |
| sound_sleep | none | 外の気配を気にせず眠り続けている |
| sound_sleep | none | 眠りの中で緊張を解きほぐしている |
| nap_sleep | none | 短時間だけ目を閉じて休んでいる |
| nap_sleep | none | すき間時間に手早く眠気を取っている |
| nap_sleep | none | わずかな休息で集中を整えている |
| nap_sleep | none | 軽い眠りで気分を切り替えている |
| nap_sleep | none | 小休止で疲れの山をやり過ごしている |
| nap_sleep | none | 短い仮眠で体の重さを和らげている |
| nap_sleep | none | 休めるうちに素早く眠っている |
| nap_sleep | none | ひと眠りして行動の準備をしている |
| nap_sleep | none | 少しの睡眠で足取りを立て直している |
| nap_sleep | none | 目覚めに合わせて気力を戻している |
| pray | none | 静かに目を閉じて祈りに集中している |
| pray | none | 心を込めて感謝の祈りを捧げている |
| pray | none | 小さな灯りの前で願いを唱えている |
| pray | none | 不安を手放すように祈り続けている |
| pray | none | 深く頭を下げて敬意を示している |
| pray | none | 明日への希望を胸に祈っている |
| pray | none | 静寂の中で言葉を紡いでいる |
| pray | none | 揺るがぬ心を求めて祈っている |
| pray | none | 祈りの時間で気持ちを整えている |
| pray | none | 厳かな雰囲気の中で願いを託している |
| idle | none | 拠点の隅で落ち着いて待機している |
| idle | none | 手持ちの道具を眺めながら時間を過ごしている |
| idle | none | 周囲を見回しつつゆったり構えている |
| idle | none | 次の合図を待ちながら息を整えている |
| idle | none | 何気ない作業で手を動かしている |
| idle | none | 物音に注意を払いながら待っている |
| idle | none | 気を抜きすぎない程度に休んでいる |
| idle | none | 足元を確かめて立ち位置を整えている |
| idle | none | ぼんやりと先の流れを考えている |
| idle | none | 落ち着いた様子で状況を見守っている |
| move | none | 目的地に向けて歩調を合わせている |
| move | none | 道の起伏に合わせて着実に進んでいる |
| move | none | 周囲を警戒しながら前へ進んでいる |
| move | none | 休まず一定のリズムで移動している |
| move | none | 視界を確保しながら進路を取っている |
| move | none | 曲がり角ごとに慎重に足を運んでいる |
| move | none | 地形を読みながら効率よく移動している |
| move | none | 足音を抑えて静かに進んでいる |
| move | none | 遅れないように速度を保っている |
| move | none | 進行方向を確かめつつ前進している |
| move | sortie while sleep state with embezzlement > 0 G | nameは神の緊急動員に憤り、d.embezzlementGを持ち逃げして出撃した |
| move | sortie while sleep state with embezzlement > 0 G | name は寝ぼけ眼のまま命令に毒づき、d.embezzlementGを懐に隠して歩き出した |
| move | sortie while sleep state with embezzlement > 0 G | name は毛布を引きずりながら、d.embezzlementGの重みだけはしっかり確かめて進軍している |
| move | sortie while sleep state with embezzlement > 0 G | name は欠伸混じりに神への不満を漏らし、d.embezzlementGを持ったまま隊列に加わった |
| move | sortie while sleep state with embezzlement > 0 G | name は半分眠った足取りで出撃しつつ、d.embezzlementGの袋だけは離さない |
| move | sortie while sleep state with embezzlement > 0 G | name は夢の続きに未練を残しながらも、d.embezzlementGを抱えて前線へ向かう |
| move | sortie while sleep state with embezzlement > 0 G | name はまぶたを擦って神命を恨み、d.embezzlementGを持ち逃げした罪悪感ごと進んでいる |
| move | sortie while sleep state with embezzlement > 0 G | name は寝台から叩き起こされた怒りを胸に、d.embezzlementGを握って移動している |
| move | sortie while sleep state with embezzlement > 0 G | name は寝息の名残を引きずったまま、d.embezzlementGを隠して渋々出撃した |
| move | sortie while sleep state with embezzlement > 0 G | name は眠気と苛立ちを抱え、d.embezzlementGの持ち逃げを正当化しながら進んでいる |
| move | sortie while feast state with embezzlement > 0 G | name は宴席を中断させた神命に腹を立て、d.embezzlementGを懐へ滑り込ませて出撃した |
| move | sortie while feast state with embezzlement > 0 G | name は口いっぱいの料理を飲み込み、d.embezzlementGを持ち逃げして怒りの行軍を始めた |
| move | sortie while feast state with embezzlement > 0 G | name は乾杯の途中で呼び出された恨みを込め、d.embezzlementGを握って歩いている |
| move | sortie while feast state with embezzlement > 0 G | name は皿を置く音を荒げ、d.embezzlementGをくすねたまま前線へ急いだ |
| move | sortie while feast state with embezzlement > 0 G | name はまだ肉の香りをまといながら、d.embezzlementGを持って不機嫌に移動している |
| move | sortie while feast state with embezzlement > 0 G | name は神への文句を噛みしめ、d.embezzlementGの袋を揺らして隊列を進む |
| move | sortie while feast state with embezzlement > 0 G | name は食後の余韻を奪われた怒りで、d.embezzlementGを隠して出撃を続けている |
| move | sortie while feast state with embezzlement > 0 G | name はスプーンを投げ置き、d.embezzlementGを持ち逃げして戦地へ向かった |
| move | sortie while feast state with embezzlement > 0 G | name は満腹のまま不満顔で進み、d.embezzlementGだけはしっかり守っている |
| move | sortie while feast state with embezzlement > 0 G | name は宴を壊された報復として、d.embezzlementGを抱えて乱暴な足取りで出撃した |
| move | sortie while rest state with embezzlement > 0 G | name は休息を断ち切る神命に苛立ち、d.embezzlementGを持ち逃げして立ち上がった |
| move | sortie while rest state with embezzlement > 0 G | name は焚き火から引き剥がされた怒りを隠さず、d.embezzlementGを懐に入れて進んでいる |
| move | sortie while rest state with embezzlement > 0 G | name はため息交じりに装備を背負い、d.embezzlementGを隠して渋々行軍を始めた |
| move | sortie while rest state with embezzlement > 0 G | name は癒やしの時間を奪われた腹いせに、d.embezzlementGを確保して出撃した |
| move | sortie while rest state with embezzlement > 0 G | name は休憩椅子を蹴って立ち上がり、d.embezzlementGを抱えたまま隊列へ戻った |
| move | sortie while rest state with embezzlement > 0 G | name は静寂を破る出撃命令へ舌打ちし、d.embezzlementGとともに前進している |
| move | sortie while rest state with embezzlement > 0 G | name は疲れた体に鞭打ちつつ、d.embezzlementGの袋を締めて歩き出した |
| move | sortie while rest state with embezzlement > 0 G | name は神の気まぐれに抗議しながら、d.embezzlementGを持って移動している |
| move | sortie while rest state with embezzlement > 0 G | name はひと息つく暇もなく、d.embezzlementGを懐へ隠して戦線へ向かった |
| move | sortie while rest state with embezzlement > 0 G | name は休息の代償だと言い張り、d.embezzlementGを持ち逃げして不機嫌に進軍する |
| move | sortie while return state with embezzlement > 0 G | name は帰還直後の再出撃に憤り、d.embezzlementGを握り直して前線へ引き返した |
| move | sortie while return state with embezzlement > 0 G | name は拠点の門を目前に命令を受け、d.embezzlementGを懐に隠して踵を返した |
| move | sortie while return state with embezzlement > 0 G | name は安堵が怒りへ変わる中、d.embezzlementGを持ったまま再び行軍している |
| move | sortie while return state with embezzlement > 0 G | name は報告前に呼び戻された苛立ちで、d.embezzlementGの袋を締めて出撃した |
| move | sortie while return state with embezzlement > 0 G | name は帰路の疲労を抱えたまま、d.embezzlementGを確かめて無言で進んでいる |
| move | sortie while return state with embezzlement > 0 G | name は帰還の達成感を奪われ、d.embezzlementGを持ち逃げして不満げに進軍した |
| move | sortie while return state with embezzlement > 0 G | name は荷を降ろす間もなく、d.embezzlementGを隠して再出撃列へ合流した |
| move | sortie while return state with embezzlement > 0 G | name は帰ってきた道を逆走しつつ、d.embezzlementGの重みで気を紛らわせている |
| move | sortie while return state with embezzlement > 0 G | name は「またか」と吐き捨て、d.embezzlementGを抱えたまま前進を始めた |
| move | sortie while return state with embezzlement > 0 G | name は帰還完了を取り消された怒りをにじませ、d.embezzlementGとともに戦地へ戻った |
| move | sortie with embezzlement = 0 G | name は神の緊急動員に憤り、露骨に不満顔で出撃した |
| move | sortie with embezzlement = 0 G | name は理不尽な命令に舌打ちし、荒い足取りで前線へ向かった |
| move | sortie with embezzlement = 0 G | name は文句を飲み込めず、ぶつぶつと神への抗議を続けている |
| move | sortie with embezzlement = 0 G | name は納得しないまま装備を担ぎ、不機嫌に隊列へ戻った |
| move | sortie with embezzlement = 0 G | name は呼び出しの強引さに腹を立て、視線を険しくして進んでいる |
| move | sortie with embezzlement = 0 G | name は休む間もなく命じられたことに怒り、肩をいからせて移動した |
| move | sortie with embezzlement = 0 G | name は「また急か」と吐き捨て、反抗的な歩調で進軍している |
| move | sortie with embezzlement = 0 G | name は神命への不平を隠さず、仲間にも苛立ちをにじませている |
| move | sortie with embezzlement = 0 G | name は強制出撃への恨みを抱えたまま、黙々と前へ進んでいる |
| move | sortie with embezzlement = 0 G | name は怒りで頬をこわばらせ、無言の抗議をしながら出撃した |
| return | none | 帰路の安全を確かめながら進んでいる |
| return | none | 目的を果たして拠点へ向かっている |
| return | none | 慎重な足取りで帰還を続けている |
| return | none | 荷物を守りつつ落ち着いて戻っている |
| return | none | 見慣れた道をたどって帰っている |
| return | none | 緊張を緩めずに帰り道を進んでいる |
| return | none | ほっとした気持ちで拠点を目指している |
| return | none | 仲間と歩調を合わせて帰還している |
| return | none | 長い行程を終えるべく歩いている |
| return | none | 無事に戻ることを第一に進んでいる |
| return | Clear and `d.HP` > 95% of max HP | name はほとんど無傷のまま、軽い足取りで拠点へ戻っている |
| return | Clear and `d.HP` > 95% of max HP | name は余裕の笑みを浮かべ、戦果を語りながら帰還している |
| return | Clear and `d.HP` > 95% of max HP | name は疲れを見せず、先頭に立って帰路を進んでいる |
| return | Clear and `d.HP` > 95% of max HP | name は装備を整えたまま、警戒を保って拠点へ向かっている |
| return | Clear and `d.HP` > 95% of max HP | name は次の任務さえ見据え、堂々と帰還している |
| return | Clear and `d.HP` > 95% of max HP | name は息ひとつ乱さず、安定した歩調で戻っている |
| return | Clear and `d.HP` > 95% of max HP | name は仲間を励ましつつ、余力十分で道を進んでいる |
| return | Clear and `d.HP` > 95% of max HP | name は傷の少なさを確かめ、満ちた体力で帰っている |
| return | Clear and `d.HP` > 95% of max HP | name はまだ戦える気配を残したまま、悠々と帰還している |
| return | Clear and `d.HP` > 95% of max HP | name は遠征終わりとは思えぬ足取りで拠点へ向かっている |
| return | Wounded_Retreat | name は痛む体をかばいながら、慎重に帰路をたどっている |
| return | Wounded_Retreat | name は息を切らしつつも、拠点の灯りを頼りに進んでいる |
| return | Wounded_Retreat | name はふらつく足を踏みしめ、なんとか帰還を続けている |
| return | Wounded_Retreat | name は仲間の支えを受けながら、ゆっくり戻っている |
| return | Wounded_Retreat | name は止血した包帯を押さえ、無言で帰り道を進んでいる |
| return | Wounded_Retreat | name は一歩ごとに痛みに耐え、拠点を目指している |
| return | Wounded_Retreat | name は休み休み歩き、帰還だけを考えている |
| return | Wounded_Retreat | name は視界の揺れをこらえつつ、道を外さず戻っている |
| return | Wounded_Retreat | name は気力で体を動かし、遅れまいと帰路を急いでいる |
| return | Wounded_Retreat | name は消えかけた体力を振り絞り、ようやく帰還している |
| return | Defeat | name は力尽き、仲間に運ばれながら拠点へ収容されている |
| return | Defeat | name は意識を失ったまま、担架で静かに運ばれている |
| return | Defeat | name の装備だけが先に回収され、本人は救護班に託された |
| return | Defeat | name は戦線を離脱し、仲間の腕に支えられて帰還している |
| return | Defeat | name はその場で倒れ、救助隊によって拠点へ搬送された |
| return | Defeat | name は反応を失い、静まり返った隊列の中で運ばれている |
| return | Defeat | name は撤退の混乱の中で救い出され、帰還処置に入った |
| return | Defeat | name は倒れたまま動かず、仲間が交代で担いで戻っている |
| return | Defeat | name の呼吸はかすかで、緊急手当てを受けつつ運ばれている |
| return | Defeat | name は完全に戦闘不能となり、帰還後ただちに治療室へ送られる |
| return | Turned_Back | name は封印扉の前で足を止め、条件不足を悟って引き返している |
| return | Turned_Back | name は必要な戦利品が足りないと判断し、未練を残しつつ帰路についた |
| return | Turned_Back | name は進行条件を満たせず、地図を閉じて拠点への道を選んだ |
| return | Turned_Back | name は門番の刻印に拒まれ、静かに撤収を指示している |
| return | Turned_Back | name は先へ進む鍵がないと確認し、隊列を整えて戻っている |
| return | Turned_Back | name は探索継続を断念し、次回に備えて情報を持ち帰っている |
| return | Turned_Back | name は条件未達の報せを受け、焦らず帰還して準備を立て直す |
| return | Turned_Back | name は収集目標の不足を認め、危険を避けて帰還判断を下した |
| return | Turned_Back | name はこれ以上は無理だと見切り、必要素材を求めて戻っている |
| return | Turned_Back | name は進路を塞ぐ要件に阻まれ、次の挑戦へ備えて退いた |
| return | Draw_Retreat | name は決着のつかない戦いを終え、消耗を抑えて帰還している |
| return | Draw_Retreat | name は互いに譲らぬまま戦線を離れ、静かに拠点へ戻っている |
| return | Draw_Retreat | name は引き分けの痛み分けを受け入れ、隊列を崩さず帰路を進む |
| return | Draw_Retreat | name は勝機を得られぬまま時間切れとなり、体勢を保って撤いた |
| return | Draw_Retreat | name は相手を押し切れず、再戦を誓いながら退いている |
| return | Draw_Retreat | name は戦況が平行線のまま終わり、損耗管理を優先して戻った |
| return | Draw_Retreat | name は互角のまま刃を収め、次の機会へ力を温存している |
| return | Draw_Retreat | name は決め手を欠いた戦闘を切り上げ、慎重に帰還している |
| return | Draw_Retreat | name は均衡が崩れぬと見て、被害拡大前に撤収した |
| return | Draw_Retreat | name は勝敗なき離脱を受け止め、拠点での立て直しを急いでいる |
