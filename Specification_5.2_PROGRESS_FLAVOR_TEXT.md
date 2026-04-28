## 5. PROGRESS

### 5.2 PROGRESS_FLAVOR_TEXT

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
| rest | with mainClass.`Guardian` | name は剣帯を外し、鍛えた体を壁にもたせて静かに息を整えている |
| rest | with mainClass.`Guardian` | name は鎧の留め具を緩め、肩の重みをほどいて休んでいる |
| rest | with mainClass.`Guardian` | name は手甲を磨きながら、次の戦いに備えて気力を蓄えている |
| rest | with mainClass.`Guardian` | name は仲間の前に座り、守りの要として周囲を見渡している |
| rest | with mainClass.`Guardian` | name は深い呼吸とともに筋肉の張りをゆっくり解いている |
| rest | with mainClass.`Guardian` | name は焚き火の火勢を整え、皆が休みやすい場を作っている |
| rest | with mainClass.`Guardian` | name は盾を膝に置き、静かに目を閉じて疲労を抜いている |
| rest | with mainClass.`Guardian` | name は足取りの重さを確かめつつ、無理せず休息に専念している |
| rest | with mainClass.`Guardian` | name は荒い息を整えたあと、短くうなずいて体勢を立て直した |
| rest | with mainClass.`Guardian` | name は仲間が眠るまで見張りを買って出て、その合間に休んでいる |
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
| rest | with mainClass.`Alchemist` | name は試薬瓶の栓を確かめ、落ち着いた手つきで休息している |
| rest | with mainClass.`Alchemist` | name は触媒の残量を帳面に記し、静かに息を整えている |
| rest | with mainClass.`Alchemist` | name は小さなフラスコを磨き、次の調合へ備えている |
| rest | with mainClass.`Alchemist` | name は薬草の香りを確かめながら、疲労をゆっくり抜いている |
| rest | with mainClass.`Alchemist` | name は反応熱で冷えた手を温め、穏やかに体勢を戻した |
| rest | with mainClass.`Alchemist` | name は道具袋の仕切りを整え、無駄のない休息を取っている |
| rest | with mainClass.`Alchemist` | name は結晶片を選り分け、思考を静めながら回復している |
| rest | with mainClass.`Alchemist` | name は調合台を離れて深呼吸し、心身の均衡を整えている |
| rest | with mainClass.`Alchemist` | name は仲間へ回復薬を手渡し、自分も腰を下ろした |
| rest | with mainClass.`Alchemist` | name は次の配合比を思い描きつつ、静かに英気を養っている |
| rest | with mainClass.`Striker` | name は荷の陰に腰を落とし、周囲を窺いながら休んでいる |
| rest | with mainClass.`Striker` | name は小道具を手入れしつつ、気配を消して体力を戻している |
| rest | with mainClass.`Striker` | name は硬貨を指で遊ばせ、緊張をほどいている |
| rest | with mainClass.`Striker` | name は素早く包帯を巻き直し、何事もなかった顔で座り込んだ |
| rest | with mainClass.`Striker` | name は耳を澄ませたまま、短い休息で鋭さを取り戻している |
| rest | with mainClass.`Striker` | name は刃先の汚れを落とし、次の隙を狙う準備をしている |
| rest | with mainClass.`Striker` | name は仲間の会話に紛れ、さりげなく情報を拾っている |
| rest | with mainClass.`Striker` | name は崩れた呼吸を整え、平然とした笑みを浮かべた |
| rest | with mainClass.`Striker` | name は目立たぬ位置で体を丸め、疲労をやり過ごしている |
| rest | with mainClass.`Striker` | name は次の手を考えながら、静かに回復の時間を稼いでいる |
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
| feast | with mainClass.`Striker` | name は手品のように肉を切り分け、気づけば自分の皿を山盛りにしていた |
| feast | with mainClass.`Striker` | name は店主の死角を突いて限定酒を確保し、仲間に得意げに注いだ |
| feast | with mainClass.`Striker` | name は誰より早く焼き上がりを嗅ぎ取り、熱々の串をさらっていった |
| feast | with mainClass.`Striker` | name は会話の隙に皿をすり替え、より豪華な一品を手に入れていた |
| feast | with mainClass.`Striker` | name は軽口を飛ばしながら店員と打ち解け、裏メニューを引き出した |
| feast | with mainClass.`Striker` | name は銀貨を弾いて賭けを始め、勝ち分で追加料理を注文した |
| feast | with mainClass.`Striker` | name は一口ごとに味を見抜き、隠し香辛料まで言い当ててみせた |
| feast | with mainClass.`Striker` | name は周囲の視線を散らしてから一番人気の皿を確保し、涼しい顔で頬張った |
| feast | with mainClass.`Striker` | name は音もなく席を移って情報を拾い、戻る頃には次の獲物の話をしていた |
| feast | with mainClass.`Striker` | name は乾杯の輪を渡り歩き、最終的に一番上等な酒の前へ落ち着いた |
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
| feast | with mainClass.`Guardian` | name は大皿の肉を軽々と持ち上げ、仲間へ豪快に取り分けた |
| feast | with mainClass.`Guardian` | name は骨付き肉を平らげ、次の一皿を力強く注文した |
| feast | with mainClass.`Guardian` | name は重たい樽を運んで場を沸かせ、笑い声を引き出した |
| feast | with mainClass.`Guardian` | name は食卓を守る盾のように中央に陣取り、皆に料理を回している |
| feast | with mainClass.`Guardian` | name は焼き網の前で腕を振るい、山盛りの串を次々仕上げた |
| feast | with mainClass.`Guardian` | name は空いた皿を見つけるたびに追加を頼み、宴の勢いを保っている |
| feast | with mainClass.`Guardian` | name は豪快な乾杯で場の空気を一気に明るくした |
| feast | with mainClass.`Guardian` | name は温かい煮込みを大鍋ごと運び、皆を驚かせた |
| feast | with mainClass.`Guardian` | name は一口ごとにうなずき、力が満ちるのを実感している |
| feast | with mainClass.`Guardian` | name は最後まで食欲を落とさず、頼もしい笑顔を見せた |
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
| feast | with mainClass.`Alchemist` | name は香草と発酵液の相性を見抜き、料理の風味を引き立てた |
| feast | with mainClass.`Alchemist` | name は飲み物の色味を確かめ、最適な温度で配り始めた |
| feast | with mainClass.`Alchemist` | name は保存食を即席で食べやすくし、卓に歓声を呼んでいる |
| feast | with mainClass.`Alchemist` | name は香辛料の配分を助言し、一皿ごとの完成度を上げた |
| feast | with mainClass.`Alchemist` | name は甘味の後味を整える茶を淹れ、場を和ませている |
| feast | with mainClass.`Alchemist` | name は発泡酒の泡立ちを見て、上機嫌に乾杯を重ねた |
| feast | with mainClass.`Alchemist` | name は店主と調理法を語り合い、新しい献立を引き出した |
| feast | with mainClass.`Alchemist` | name は栄養と回復効率を考え、仲間へ最適な皿を勧めている |
| feast | with mainClass.`Alchemist` | name は小瓶のシロップを垂らし、宴の味に意外な深みを加えた |
| feast | with mainClass.`Alchemist` | name は満足げに頷きながら、次の遠征向けの補給案をまとめた |
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
| feast | with mainClass.`Striker` | name は店の裏動線を把握し、一番早く出来立て料理を確保した |
| feast | with mainClass.`Striker` | name は会計の流れを見切って、無駄なく追加注文を通している |
| feast | with mainClass.`Striker` | name は密かな情報交換を進めつつ、表向きは陽気に笑っていた |
| feast | with mainClass.`Striker` | name は誰も気づかぬうちに空いた杯を満たし、場の主導権を握った |
| feast | with mainClass.`Striker` | name は軽妙な口上で人気料理を引き当て、仲間へ分け与えた |
| feast | with mainClass.`Striker` | name は店主の癖を読み、最良のタイミングで特注を通した |
| feast | with mainClass.`Striker` | name は笑い話に紛れて有益な噂を拾い、次の遠征に備えている |
| feast | with mainClass.`Striker` | name は絶妙な駆け引きで席順を整え、交渉しやすい空気を作った |
| feast | with mainClass.`Striker` | name は指先の器用さで果物を飾り切りし、卓を華やかにした |
| feast | with mainClass.`Striker` | name は最後に上等な酒を確保し、勝ち誇った笑みを見せた |
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
| outfit | with mainClass.`Guardian` | name は鎧の継ぎ目を締め直し、前線に立つ準備を整えている |
| outfit | with mainClass.`Guardian` | name は盾紐の長さを調整し、受け流しやすい構えを確認した |
| outfit | with mainClass.`Guardian` | name は手甲を叩いて装着感を確かめ、深くうなずいた |
| outfit | with mainClass.`Guardian` | name は剣帯の位置を低く直し、抜刀の軌道を最短にしている |
| outfit | with mainClass.`Guardian` | name は肩当ての留め具を締め、重さの偏りをなくしている |
| outfit | with mainClass.`Guardian` | name は予備の包帯を胸当てに差し込み、持久戦へ備えた |
| outfit | with mainClass.`Guardian` | name は靴紐を固く結び、踏み込みの安定を確かめている |
| outfit | with mainClass.`Guardian` | name は仲間の装備も一瞥し、守る順番を頭に入れた |
| outfit | with mainClass.`Guardian` | name は刃の反りを見て鞘に収め、静かに気合を入れている |
| outfit | with mainClass.`Guardian` | name は胸を張って立ち、出発の号令を待っている |
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
| outfit | with mainClass.`Alchemist` | name は試薬瓶を衝撃から守るように、腰袋の仕切りを組み直した |
| outfit | with mainClass.`Alchemist` | name は触媒のラベルを貼り直し、取り違えのない配置を整えている |
| outfit | with mainClass.`Alchemist` | name はフラスコの栓を二重に固定し、漏れの確認を終えた |
| outfit | with mainClass.`Alchemist` | name は薬匙と乳鉢を布で包み、静かに携行準備を進めている |
| outfit | with mainClass.`Alchemist` | name は反応順序のメモを見直し、実戦用の手順を固めた |
| outfit | with mainClass.`Alchemist` | name は揮発薬を別袋へ移し、安全第一で装備を整えている |
| outfit | with mainClass.`Alchemist` | name は結晶触媒を光にかざし、品質を確かめてから収めた |
| outfit | with mainClass.`Alchemist` | name は応急薬の取り出し位置を調整し、即応性を高めている |
| outfit | with mainClass.`Alchemist` | name は調合手袋の縫い目を確かめ、手元の精度を守る支度をした |
| outfit | with mainClass.`Alchemist` | name は最後に道具箱を軽く叩き、万全の装備で頷いた |
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
| outfit | with mainClass.`Striker` | name は小袋の留め紐を緩め、必要な道具へ素早く触れられるようにした |
| outfit | with mainClass.`Striker` | name は外套の内ポケットを確認し、隠し鍵の位置を覚え直した |
| outfit | with mainClass.`Striker` | name は短剣の柄を布で巻き、滑らぬ握りへ整えている |
| outfit | with mainClass.`Striker` | name は軽装のまま防具を分散し、目立たぬ防御を仕込んだ |
| outfit | with mainClass.`Striker` | name は手首の仕込み針を試し、機会を逃さぬ準備を終えた |
| outfit | with mainClass.`Striker` | name は靴音を確かめ、石床でも響かぬ歩幅へ調整した |
| outfit | with mainClass.`Striker` | name は細いロープを腰に回し、撤退経路の備えを固めている |
| outfit | with mainClass.`Striker` | name は笑みを作る練習をして、交渉用の顔を整えた |
| outfit | with mainClass.`Striker` | name は錠前道具を指先で転がし、感覚を温めている |
| outfit | with mainClass.`Striker` | name は何気ない仕草で装備を隠し、自然体を装っている |
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
| explore | `x.exp_id`1 and `x.floor`1 | name は風の草原で朝日を受け、古い道しるべに手を当てて進んでいる |
| explore | `x.exp_id`1 and `x.floor`1 | name は草の海をかき分け、遠くの石塔を目印に歩いている |
| explore | `x.exp_id`1 and `x.floor`1 | name は小さな花のそばで足を止め、この地の守りに祈ってから進んだ |
| explore | `x.exp_id`1 and `x.floor`1 | name はやわらかな風を背に受け、仲間へ合図してゆるい丘を下っている |
| explore | `x.exp_id`1 and `x.floor`1 | name は草むらの獣道を見つけ、静かな足取りで安全な道を選んだ |
| explore | `x.exp_id`1 and `x.floor`1 | 空を舞う鳥の流れを見上げながら、name は迷わぬよう進路を決めている |
| explore | `x.exp_id`1 and `x.floor`1 | ひび割れた石碑の文字をなぞり、name は昔の旅人の祈りを思い出した |
| explore | `x.exp_id`1 and `x.floor`1 | 露にぬれた草を払いながら、name は朝の光が差す方へ進んでいる |
| explore | `x.exp_id`1 and `x.floor`1 | 遠くの雲の動きを見上げ、name は雨の前に平原を抜けようとしている |
| explore | `x.exp_id`1 and `x.floor`1 | 風鳴りに耳をすませる中で、name は精霊が眠る小道へそっと足を踏み入れた |
| explore | `x.exp_id`1 and `x.floor`1 | 風の草原に古い道しるべが立ち、旅人を導く静かな気配が満ちている |
| explore | `x.exp_id`1 and `x.floor`1 | 朝日に光る草の海が広がり、遠くの石塔が進む先を示している |
| explore | `x.exp_id`1 and `x.floor`1 | 小さな守り花が点々と咲き、この地に穏やかな加護が残っている |
| explore | `x.exp_id`1 and `x.floor`1 | なだらかな丘を渡る風が強く、足音を消してくれる道が続いている |
| explore | `x.exp_id`1 and `x.floor`1 | 草むらに獣道がいくつも交わり、安全に通れる細道が見つかる |
| explore | `x.exp_id`1 and `x.floor`1 | 空を回る鳥の列が見え、天気と方角を読む手がかりになっている |
| explore | `x.exp_id`1 and `x.floor`1 | ひび割れた石碑には古い祈りが残り、旅の無事を願う声が感じられる |
| explore | `x.exp_id`1 and `x.floor`1 | 朝露をまとった草がきらめき、夜明けの静けさが平原を包んでいる |
| explore | `x.exp_id`1 and `x.floor`1 | 遠くの雲が速く流れ、雨が来る前の短い好機が生まれている |
| explore | `x.exp_id`1 and `x.floor`1 | 風鳴りの向こうに精霊の小道がのび、やさしい光が先へと誘っている |
| explore | `x.exp_id`1 and `x.floor`2 | name は赤い土の道で足跡を見つけ、獣の縄張りを避けて進んでいる |
| explore | `x.exp_id`1 and `x.floor`2 | name は草むらの揺れを見て手を上げ、仲間に静かに止まるよう伝えた |
| explore | `x.exp_id`1 and `x.floor`2 | name は獣のうなりを遠くに聞き、風下を選んで低い姿勢で歩いている |
| explore | `x.exp_id`1 and `x.floor`2 | name は折れた枝を拾って道に印をつけ、戻れるよう備えながら進んだ |
| explore | `x.exp_id`1 and `x.floor`2 | name は短く祈って護符を結び、危ない谷を横目に細道へ入っていく |
| explore | `x.exp_id`1 and `x.floor`2 | 深い爪あとを見たあとで、name は盾を前に出して慎重に進んでいる |
| explore | `x.exp_id`1 and `x.floor`2 | 骨の散る分かれ道に立ち、name は静かな方角を選んで歩き出した |
| explore | `x.exp_id`1 and `x.floor`2 | 風に獣のにおいが混じる中、name は火種を守って足を速めている |
| explore | `x.exp_id`1 and `x.floor`2 | 高い草がざわめくたびに、name は足を止めて気配を確かめた |
| explore | `x.exp_id`1 and `x.floor`2 | 月の光が薄い道を前に、name は仲間の間を詰めて先へ向かった |
| explore | `x.exp_id`1 and `x.floor`2 | 赤い土には新しい爪あとが残り、獣の縄張りがはっきり分かる |
| explore | `x.exp_id`1 and `x.floor`2 | 骨の散る分かれ道が続き、静かな迂回路を選ぶ必要がある |
| explore | `x.exp_id`1 and `x.floor`2 | 風下の細道はにおいを隠しやすく、見つかりにくい進路になっている |
| explore | `x.exp_id`1 and `x.floor`2 | 折れた枝と荒れた草が多く、足場の悪い区画が広がっている |
| explore | `x.exp_id`1 and `x.floor`2 | 護符を結ぶ石柱が点在し、旅人に短い祈りの場を与えている |
| explore | `x.exp_id`1 and `x.floor`2 | 谷側から低いうなりが響き、隊列を小さく保つ方が安全だ |
| explore | `x.exp_id`1 and `x.floor`2 | 背の高い草は視界を奪うため、一歩ごとの確認が欠かせない |
| explore | `x.exp_id`1 and `x.floor`2 | 夜になると道の境が消えやすく、月明かりの位置が大事になる |
| explore | `x.exp_id`1 and `x.floor`2 | 獣道と人の道が交わる場所が多く、進路の見直しが必要になる |
| explore | `x.exp_id`1 and `x.floor`2 | 荒い風が足音を散らし、静かに進むには都合のよい地形が続く |
| explore | `x.exp_id`1 and `x.floor`3 | name は虫の羽音を聞き分け、火をかざしてむれの薄い道を選んだ |
| explore | `x.exp_id`1 and `x.floor`3 | name は湿った谷に入る前に布で口をおおい、ゆっくり足を運んでいる |
| explore | `x.exp_id`1 and `x.floor`3 | name は倒れた木を渡り、ぬかるみを避けて高い土手へ登った |
| explore | `x.exp_id`1 and `x.floor`3 | name は小さな巣穴を見つけるたびに印を残し、危ない場所を共有した |
| explore | `x.exp_id`1 and `x.floor`3 | name は薄暗い谷底を避け、朝の光が届く斜面を選んで進んでいる |
| explore | `x.exp_id`1 and `x.floor`3 | 羽音が急に強くなったので、name は隊列を縮めて足早に抜けた |
| explore | `x.exp_id`1 and `x.floor`3 | 泥には細かな足跡が無数にあり、name は踏み込む場所を指で示した |
| explore | `x.exp_id`1 and `x.floor`3 | 岩陰で休む短い間に、name は火種を整えて煙を立てている |
| explore | `x.exp_id`1 and `x.floor`3 | 湿気の重い空気の中で、name は呼吸を整えながら前を見すえた |
| explore | `x.exp_id`1 and `x.floor`3 | 崩れた土手を前にして、name はロープを張って仲間を渡らせた |
| explore | `x.exp_id`1 and `x.floor`3 | 谷には虫の羽音が満ち、火の明かりが進路を守る手がかりになる |
| explore | `x.exp_id`1 and `x.floor`3 | ぬかるみが広く続き、乾いた土手を選ぶだけで安全さが変わる |
| explore | `x.exp_id`1 and `x.floor`3 | 倒木が橋のように並び、慎重に渡れば早く先へ進める |
| explore | `x.exp_id`1 and `x.floor`3 | 小さな巣穴があちこちにあり、足元への注意が欠かせない |
| explore | `x.exp_id`1 and `x.floor`3 | 谷底は暗く湿り、朝の光が届く斜面が比較的歩きやすい |
| explore | `x.exp_id`1 and `x.floor`3 | 泥の足跡は流れやすく、早めの判断が大切になる |
| explore | `x.exp_id`1 and `x.floor`3 | 岩陰は短い休息に向くが、長居するとむれに囲まれやすい |
| explore | `x.exp_id`1 and `x.floor`3 | 煙は虫よけに役立ち、隊の視界を守る支えになっている |
| explore | `x.exp_id`1 and `x.floor`3 | 崩れた土手が多く、ロープの準備が移動を安定させる |
| explore | `x.exp_id`1 and `x.floor`3 | 湿った風が体力を削るため、歩く速さの調整が求められる |
| explore | `x.exp_id`1 and `x.floor`4 | name は見張りの影を見つけ、岩かげを使って高台へ近づいている |
| explore | `x.exp_id`1 and `x.floor`4 | name は細い尾根道を避け、横の斜面から静かに回り込んだ |
| explore | `x.exp_id`1 and `x.floor`4 | name は木のきしむ音に耳をすませ、待ち伏せの気配を探っている |
| explore | `x.exp_id`1 and `x.floor`4 | name は落ち葉を払いながら罠の線を見つけ、仲間へ合図した |
| explore | `x.exp_id`1 and `x.floor`4 | name は月明かりを背にしないよう位置を変え、暗がりを進んでいる |
| explore | `x.exp_id`1 and `x.floor`4 | 高台の風が強まる中、name はしゃがんで姿を低くして進んだ |
| explore | `x.exp_id`1 and `x.floor`4 | 崩れた見張り台を見上げて、name は安全な通り道を選び直した |
| explore | `x.exp_id`1 and `x.floor`4 | 岩場の影が伸びる時間に、name は隊の間隔を詰めている |
| explore | `x.exp_id`1 and `x.floor`4 | 遠くで金具の音が鳴り、name は足を止めて気配の向きを読んだ |
| explore | `x.exp_id`1 and `x.floor`4 | 狭い道に入る直前で、name は退路を確かめてから前へ出た |
| explore | `x.exp_id`1 and `x.floor`4 | 見張りの影が動く高台では、岩かげの利用が生存の鍵になる |
| explore | `x.exp_id`1 and `x.floor`4 | 細い尾根道は見つかりやすく、斜面側の迂回が安全につながる |
| explore | `x.exp_id`1 and `x.floor`4 | 木のきしむ音が遠くまで響き、気配を読む手がかりになる |
| explore | `x.exp_id`1 and `x.floor`4 | 落ち葉の下に罠の線が隠れ、足元確認が強く求められる |
| explore | `x.exp_id`1 and `x.floor`4 | 月明かりは便利だが、同時に姿をさらす危険も大きい |
| explore | `x.exp_id`1 and `x.floor`4 | 崩れた見張り台の周辺は視線が通りやすく、短時間で通過したい |
| explore | `x.exp_id`1 and `x.floor`4 | 岩場の影が長くなる時間は、移動に向いた貴重な機会になる |
| explore | `x.exp_id`1 and `x.floor`4 | 金具の音が風に乗り、巡回の位置を推測しやすくなる |
| explore | `x.exp_id`1 and `x.floor`4 | 狭い道ほど退路の確認が重要で、進む前の準備が命を守る |
| explore | `x.exp_id`1 and `x.floor`4 | 高低差の多い地形が続き、隊列の間隔管理が安全を左右する |
| explore | `x.exp_id`1 and `x.floor`5 | name は半ば埋もれた石門を見つけ、古い遺跡の筋をたどって進んでいる |
| explore | `x.exp_id`1 and `x.floor`5 | name は土に沈んだ石畳を払い、崩れにくい道を選んで歩いている |
| explore | `x.exp_id`1 and `x.floor`5 | name は割れた柱の並びを数え、埋もれた広場の中心へ向かった |
| explore | `x.exp_id`1 and `x.floor`5 | name は砂にのぞく碑石を確かめ、失われた街道の向きを読んでいる |
| explore | `x.exp_id`1 and `x.floor`5 | name は崩れた壁の影で短く休み、次の遺構へ静かに移動した |
| explore | `x.exp_id`1 and `x.floor`5 | 埋もれた段差を前にして、name は足場を確かめながら一歩ずつ進んだ |
| explore | `x.exp_id`1 and `x.floor`5 | 風で砂が流れる合間に、name は石塔の先端を目印に進路を決めた |
| explore | `x.exp_id`1 and `x.floor`5 | 倒れた像の欠片を見つけ、name は遺跡地図の印を更新している |
| explore | `x.exp_id`1 and `x.floor`5 | ひび割れた回廊の入口で、name は仲間を呼んで安全確認を行った |
| explore | `x.exp_id`1 and `x.floor`5 | 土の下から古い紋章が現れ、name は記録帳に位置を書き留めた |
| explore | `x.exp_id`1 and `x.floor`5 | 半ば埋もれた石門が並び、遺跡の道筋が野に溶け込んでいる |
| explore | `x.exp_id`1 and `x.floor`5 | 土に沈んだ石畳が続き、踏み固められた線が安全路になる |
| explore | `x.exp_id`1 and `x.floor`5 | 割れた柱の並びから、かつての広場の形がうっすら読み取れる |
| explore | `x.exp_id`1 and `x.floor`5 | 砂にのぞく碑石が街道の向きを示し、進路判断の助けになる |
| explore | `x.exp_id`1 and `x.floor`5 | 崩れた壁の影は短い休息に向き、視界の確保もしやすい |
| explore | `x.exp_id`1 and `x.floor`5 | 埋もれた段差が多く、歩幅を小さく保つことが安全につながる |
| explore | `x.exp_id`1 and `x.floor`5 | 砂が流れる時間帯は石塔の先端が見え、目印を取りやすい |
| explore | `x.exp_id`1 and `x.floor`5 | 倒れた像の欠片が各地に散り、遺跡区画の境界を示している |
| explore | `x.exp_id`1 and `x.floor`5 | ひび割れた回廊は崩落の危険があり、入口での確認が欠かせない |
| explore | `x.exp_id`1 and `x.floor`5 | 土の下から現れる古い紋章が、この野が埋没遺跡群だと物語っている |
| explore | `x.exp_id`1 and `x.floor`6 | name はカナイニアンの古都跡に入り、獣紋の石壁をたよりに進んでいる |
| explore | `x.exp_id`1 and `x.floor`6 | name は崩れた城路を見上げ、犬人の王都へ続く主道を探している |
| explore | `x.exp_id`1 and `x.floor`6 | name は砕けた見張り塔の下で足を止め、巡回路の名残を確かめた |
| explore | `x.exp_id`1 and `x.floor`6 | name は古い門章に手を当て、カナイニアン衛兵の誓いを静かに読んだ |
| explore | `x.exp_id`1 and `x.floor`6 | name は石造の街区を横切り、王宮区へ向かう高い道へ上っていく |
| explore | `x.exp_id`1 and `x.floor`6 | 獣紋が刻まれた壁を見つけ、name は古都地図の区画線を引き直した |
| explore | `x.exp_id`1 and `x.floor`6 | 崩れた城門の前で、name は仲間と退路を決めてから進み出した |
| explore | `x.exp_id`1 and `x.floor`6 | 犬人の古い見張り台を見上げ、name は死角になる路地を選んだ |
| explore | `x.exp_id`1 and `x.floor`6 | 風化した門章の欠片を拾い、name は王宮区の位置を推定している |
| explore | `x.exp_id`1 and `x.floor`6 | 石造街路の分岐に立ち、name は獣紋の向きで進路を判断した |
| explore | `x.exp_id`1 and `x.floor`6 | カナイニアンの古都跡には獣紋の石壁が残り、街区の境を示している |
| explore | `x.exp_id`1 and `x.floor`6 | 崩れた城路が高低差を作り、王都中心へ向かう主道の名残が見える |
| explore | `x.exp_id`1 and `x.floor`6 | 砕けた見張り塔の土台が点在し、かつての巡回網を想像させる |
| explore | `x.exp_id`1 and `x.floor`6 | 古い門章には犬人衛兵の誓いが刻まれ、都市の歴史を伝えている |
| explore | `x.exp_id`1 and `x.floor`6 | 石造の街区が広がり、王宮区へ向かう高い道が今も判別できる |
| explore | `x.exp_id`1 and `x.floor`6 | 獣紋の向きは進路判断に役立ち、迷路のような路地で力を発揮する |
| explore | `x.exp_id`1 and `x.floor`6 | 崩れた城門周辺は見通しがよく、通過前の退路確認が重要になる |
| explore | `x.exp_id`1 and `x.floor`6 | 犬人の見張り台跡は死角も多く、移動は短区間で区切るのが安全だ |
| explore | `x.exp_id`1 and `x.floor`6 | 風化した門章の欠片が各所に散り、王宮区の位置推定を助けている |
| explore | `x.exp_id`1 and `x.floor`6 | 石造街路の分岐が多く、合流地点の共有が隊の安定を支えている |
| explore | `x.exp_id`2 and `x.floor`1 | name は雪の森で白い息をはき、凍った枝を避けて進んでいる |
| explore | `x.exp_id`2 and `x.floor`1 | name は踏み固められた雪道を見つけ、仲間を先へ導いている |
| explore | `x.exp_id`2 and `x.floor`1 | name は樹氷の下で足を止め、吹雪の切れ目を待って歩き出した |
| explore | `x.exp_id`2 and `x.floor`1 | name は冷えた手をこすりながら、静かな林道を選んで進んだ |
| explore | `x.exp_id`2 and `x.floor`1 | name は雪に埋もれた道しるべを掘り出し、方角を確かめている |
| explore | `x.exp_id`2 and `x.floor`1 | 白い木々の間を抜けながら、name は足跡の薄い道を選んでいる |
| explore | `x.exp_id`2 and `x.floor`1 | 凍った小川を前にして、name は石の頭をたどって渡った |
| explore | `x.exp_id`2 and `x.floor`1 | 風が強まるたびに、name は隊列を寄せて体温を守っている |
| explore | `x.exp_id`2 and `x.floor`1 | 深い雪の段差を見つけ、name は迂回路を指して進路を変えた |
| explore | `x.exp_id`2 and `x.floor`1 | 雪煙が視界を消す中で、name は松明の火を小さく守っている |
| explore | `x.exp_id`2 and `x.floor`1 | 雪の森では枝に積もる霜が光り、道の輪郭がぼんやり浮かぶ |
| explore | `x.exp_id`2 and `x.floor`1 | 踏み固められた雪道がところどころに残り、移動の助けになる |
| explore | `x.exp_id`2 and `x.floor`1 | 樹氷の下は風が弱く、短い休息を取りやすい場所になっている |
| explore | `x.exp_id`2 and `x.floor`1 | 吹雪の切れ目は短く、進む時間を見極める判断が重要になる |
| explore | `x.exp_id`2 and `x.floor`1 | 雪に埋もれた道しるべが古い行路の向きを伝えている |
| explore | `x.exp_id`2 and `x.floor`1 | 凍った小川は渡れるが、薄氷の見分けが必要になる |
| explore | `x.exp_id`2 and `x.floor`1 | 風雪が強い区画では隊列を寄せ、体温維持を優先したい |
| explore | `x.exp_id`2 and `x.floor`1 | 深雪の段差が多く、歩幅を小さく保つ方が安全につながる |
| explore | `x.exp_id`2 and `x.floor`1 | 松明の火は視界の支えになり、雪煙の中で道を保ってくれる |
| explore | `x.exp_id`2 and `x.floor`1 | 白い森の静けさは深く、音で危険を察知しやすい地形だ |
| explore | `x.exp_id`2 and `x.floor`2 | name は腐木の道で足元を確かめ、崩れやすい板を避けて進んでいる |
| explore | `x.exp_id`2 and `x.floor`2 | name は湿った樹皮に触れ、古い獣道の境を読み取りながら歩いた |
| explore | `x.exp_id`2 and `x.floor`2 | name は苔むした倒木をまたぎ、暗い曲がり道へ静かに入っていく |
| explore | `x.exp_id`2 and `x.floor`2 | name は黒い泥のぬかるみを見て、乾いた根道へ進路を切り替えた |
| explore | `x.exp_id`2 and `x.floor`2 | name は枯れ枝の裂ける音に耳を澄まし、待ち伏せを警戒している |
| explore | `x.exp_id`2 and `x.floor`2 | 腐木が連なる細道で、name は杖先で地面を突いて安全を確かめた |
| explore | `x.exp_id`2 and `x.floor`2 | 濡れた葉が視界をふさぐ中、name は背の低い道を選んで進んだ |
| explore | `x.exp_id`2 and `x.floor`2 | 倒木の陰で風を避けながら、name は地図の印を更新している |
| explore | `x.exp_id`2 and `x.floor`2 | 黒泥の水たまりを前に、name は石の並ぶ場所だけを踏んで渡った |
| explore | `x.exp_id`2 and `x.floor`2 | 湿った空気が重い中で、name は呼吸を整えて歩調を落とした |
| explore | `x.exp_id`2 and `x.floor`2 | 腐木の道は崩れやすく、足場確認を続ける必要がある |
| explore | `x.exp_id`2 and `x.floor`2 | 湿った樹皮に残る傷が、古い獣道の境界を示している |
| explore | `x.exp_id`2 and `x.floor`2 | 苔むした倒木が多く、またぎ方で移動速度が大きく変わる |
| explore | `x.exp_id`2 and `x.floor`2 | 黒い泥のぬかるみが点在し、根道の選択が安全を左右する |
| explore | `x.exp_id`2 and `x.floor`2 | 枯れ枝の裂ける音は遠くまで響き、気配読みの手がかりになる |
| explore | `x.exp_id`2 and `x.floor`2 | 濡れた葉が視界を狭め、低い姿勢での移動が有効になる |
| explore | `x.exp_id`2 and `x.floor`2 | 倒木の陰は風を避けやすく、短い整理時間に向いている |
| explore | `x.exp_id`2 and `x.floor`2 | 石の並ぶ場所は泥を渡る橋になり、進路維持に役立つ |
| explore | `x.exp_id`2 and `x.floor`2 | 湿った空気は体力を削り、歩調管理の重要度が高い |
| explore | `x.exp_id`2 and `x.floor`2 | 曲がり道が多い森路では、合流地点の共有が不可欠になる |
| explore | `x.exp_id`2 and `x.floor`3 | name は食虫花の林に入り、つるの動きを見ながら慎重に進んでいる |
| explore | `x.exp_id`2 and `x.floor`3 | name は開いた花弁を避け、岩沿いの細道を選んで歩いている |
| explore | `x.exp_id`2 and `x.floor`3 | name は甘い香りに顔をしかめ、口布を締め直して前へ出た |
| explore | `x.exp_id`2 and `x.floor`3 | name は粘るつるを剣で払い、仲間の通り道を作っている |
| explore | `x.exp_id`2 and `x.floor`3 | name は花粉の漂う場所を避け、風上の斜面へ回り込んだ |
| explore | `x.exp_id`2 and `x.floor`3 | 大きな花弁が揺れるたび、name は距離を取って立ち止まっている |
| explore | `x.exp_id`2 and `x.floor`3 | 岩陰に空いた隙間を見つけ、name は隊列を一列に整えた |
| explore | `x.exp_id`2 and `x.floor`3 | 甘い匂いが濃くなる前に、name は移動速度を上げて突破した |
| explore | `x.exp_id`2 and `x.floor`3 | 足首に絡む細いつるを切り、name は後続の進路を確保している |
| explore | `x.exp_id`2 and `x.floor`3 | 花粉の霞が見える中で、name は風向きを見て歩く線を決めた |
| explore | `x.exp_id`2 and `x.floor`3 | 食虫花の林では花弁の開閉が速く、間合い管理が求められる |
| explore | `x.exp_id`2 and `x.floor`3 | 開いた花弁の周辺は危険が高く、岩沿いの通路が比較的安全だ |
| explore | `x.exp_id`2 and `x.floor`3 | 甘い香りが強い区画は注意が必要で、口元の防護が役に立つ |
| explore | `x.exp_id`2 and `x.floor`3 | 粘るつるは移動を止めやすく、刃物での処理が有効になる |
| explore | `x.exp_id`2 and `x.floor`3 | 花粉が漂う場所では風上ルートの確保が安定につながる |
| explore | `x.exp_id`2 and `x.floor`3 | 大きな花弁の影は広く、接近前の停止判断が生存率を上げる |
| explore | `x.exp_id`2 and `x.floor`3 | 岩陰の隙間は一列移動に向き、隊列の乱れを抑えられる |
| explore | `x.exp_id`2 and `x.floor`3 | 匂いが濃くなる前の突破が、接触リスクの低下に直結する |
| explore | `x.exp_id`2 and `x.floor`3 | 細いつるは足首を取りやすく、後続路の確保が重要になる |
| explore | `x.exp_id`2 and `x.floor`3 | 風向きの変化が早く、歩く線の調整を続ける必要がある |
| explore | `x.exp_id`2 and `x.floor`4 | name は氷の壁に印を刻み、迷路の折れ角を一つずつ進んでいる |
| explore | `x.exp_id`2 and `x.floor`4 | name は足元の霜を確かめ、滑りにくい縁を選んで歩いている |
| explore | `x.exp_id`2 and `x.floor`4 | name は青く光る氷柱を目印にし、戻り道を失わぬよう進んだ |
| explore | `x.exp_id`2 and `x.floor`4 | name は冷たい反響に耳を澄まし、広い通路の方向を探っている |
| explore | `x.exp_id`2 and `x.floor`4 | name は薄氷の橋を前にしゃがみ、荷を分けて慎重に渡った |
| explore | `x.exp_id`2 and `x.floor`4 | 白い壁が続く角で、name は刻んだ印を見直して進路を決めた |
| explore | `x.exp_id`2 and `x.floor`4 | 滑る床に足を取られそうになり、name は歩幅を狭めて進んでいる |
| explore | `x.exp_id`2 and `x.floor`4 | 青い氷柱の列を見上げ、name は安全な回廊を選び直した |
| explore | `x.exp_id`2 and `x.floor`4 | 反響の長い通路に入り、name は声を抑えて合図だけで動いた |
| explore | `x.exp_id`2 and `x.floor`4 | 薄氷の橋を渡る直前で、name は先導順を入れ替えている |
| explore | `x.exp_id`2 and `x.floor`4 | 氷の迷路は形が似ており、壁への印が方向維持を支えている |
| explore | `x.exp_id`2 and `x.floor`4 | 霜の付き方で滑りやすさが変わり、縁の選択が安全につながる |
| explore | `x.exp_id`2 and `x.floor`4 | 青く光る氷柱は遠目の目印となり、帰路確認にも役立つ |
| explore | `x.exp_id`2 and `x.floor`4 | 反響の強い通路では音が広がり、静かな合図運用が有効だ |
| explore | `x.exp_id`2 and `x.floor`4 | 薄氷の橋は荷重に弱く、荷分けと順番管理が必要になる |
| explore | `x.exp_id`2 and `x.floor`4 | 白い壁の連続が距離感を奪い、定期的な位置確認が欠かせない |
| explore | `x.exp_id`2 and `x.floor`4 | 滑る床では歩幅を狭く保つだけで転倒率を下げられる |
| explore | `x.exp_id`2 and `x.floor`4 | 回廊ごとの温度差があり、霜の密度が危険度を示してくれる |
| explore | `x.exp_id`2 and `x.floor`4 | 行き止まりが多いため、引き返し時間を見込んだ進行が望ましい |
| explore | `x.exp_id`2 and `x.floor`4 | 冷気の強い区画では休憩位置の選択が体力維持を左右する |
| explore | `x.exp_id`2 and `x.floor`5 | name は水晶洞の入口で光を受け、きらめく壁沿いに進んでいる |
| explore | `x.exp_id`2 and `x.floor`5 | name は透明な柱の間を抜け、足元の割れ目を避けて歩いている |
| explore | `x.exp_id`2 and `x.floor`5 | name は反射する光に目を細め、暗い脇道を選んで進んだ |
| explore | `x.exp_id`2 and `x.floor`5 | name は青い結晶片を拾い、地図の目印として袋へ収めた |
| explore | `x.exp_id`2 and `x.floor`5 | name は響く足音を抑え、静かな回廊へ隊を導いている |
| explore | `x.exp_id`2 and `x.floor`5 | 結晶の反射が強まる中で、name は灯りの向きを小さく調整した |
| explore | `x.exp_id`2 and `x.floor`5 | 透明な柱が並ぶ道を前に、name は通れる幅を測って進んでいる |
| explore | `x.exp_id`2 and `x.floor`5 | 壁のきらめきに紛れて、name は割れ目の影を見つけて回避した |
| explore | `x.exp_id`2 and `x.floor`5 | 足音が長く響く区画で、name は手信号だけで隊を動かした |
| explore | `x.exp_id`2 and `x.floor`5 | 青い結晶片を置きながら、name は帰路の線を残している |
| explore | `x.exp_id`2 and `x.floor`5 | 水晶洞の壁は光を返し、視界の明暗差が大きくなる地形だ |
| explore | `x.exp_id`2 and `x.floor`5 | 透明な柱が多く、通過幅の確認が移動の安定を支える |
| explore | `x.exp_id`2 and `x.floor`5 | 反射光が強い区画では、灯りの角度調整が有効になる |
| explore | `x.exp_id`2 and `x.floor`5 | 足元の割れ目は光に紛れやすく、影の確認が欠かせない |
| explore | `x.exp_id`2 and `x.floor`5 | 足音の反響が長く、静かな合図運用が探索効率を上げる |
| explore | `x.exp_id`2 and `x.floor`5 | 青い結晶片は目印として使え、帰路管理に適している |
| explore | `x.exp_id`2 and `x.floor`5 | きらめきの濃い壁面は方向感覚を乱しやすく注意が必要だ |
| explore | `x.exp_id`2 and `x.floor`5 | 暗い脇道は安全なこともあり、主通路だけに頼れない |
| explore | `x.exp_id`2 and `x.floor`5 | 回廊の幅が急に変わるため、隊列調整を繰り返す必要がある |
| explore | `x.exp_id`2 and `x.floor`5 | 結晶片の散布で後続の迷いを減らし、再合流が容易になる |
| explore | `x.exp_id`2 and `x.floor`6 | name は砕けた氷宮の門をくぐり、白い広間の先へ進んでいる |
| explore | `x.exp_id`2 and `x.floor`6 | name は欠けた玉座を見つけ、古い王宮路の向きを読んでいる |
| explore | `x.exp_id`2 and `x.floor`6 | name は氷の階段を上り、崩れていない回廊を探している |
| explore | `x.exp_id`2 and `x.floor`6 | name は静かな礼拝間で足を止め、凍った祭壇を確かめた |
| explore | `x.exp_id`2 and `x.floor`6 | name は割れた宮壁の紋をなぞり、封じられた区画を避けて進んだ |
| explore | `x.exp_id`2 and `x.floor`6 | 崩れた門柱の前で、name は退路を決めてから広間へ入った |
| explore | `x.exp_id`2 and `x.floor`6 | 欠けた玉座を見上げながら、name は宮城地図の印を更新した |
| explore | `x.exp_id`2 and `x.floor`6 | 氷の階段が軋むたびに、name は荷を分けて慎重に上っている |
| explore | `x.exp_id`2 and `x.floor`6 | 礼拝間の冷気が強い中で、name は休息時間を短く調整した |
| explore | `x.exp_id`2 and `x.floor`6 | 宮壁の紋章が続く路地で、name は封印区画を避けて進路を選んだ |
| explore | `x.exp_id`2 and `x.floor`6 | 砕けた氷宮の門が並び、王宮区画の輪郭が今も残っている |
| explore | `x.exp_id`2 and `x.floor`6 | 欠けた玉座の間は広く、古い統治の中心を感じさせる |
| explore | `x.exp_id`2 and `x.floor`6 | 氷の階段は脆い箇所があり、荷重管理が安全に直結する |
| explore | `x.exp_id`2 and `x.floor`6 | 静かな礼拝間では冷気が強く、滞在時間の調整が必要になる |
| explore | `x.exp_id`2 and `x.floor`6 | 宮壁の紋章は封印区画の境を示し、進路判断の助けになる |
| explore | `x.exp_id`2 and `x.floor`6 | 崩れた門柱の周辺は見通しがよく、退路共有がしやすい |
| explore | `x.exp_id`2 and `x.floor`6 | 白い広間は反響が強く、合図方法の統一が重要になる |
| explore | `x.exp_id`2 and `x.floor`6 | 回廊の崩落箇所が点在し、通行前の確認を欠かせない |
| explore | `x.exp_id`2 and `x.floor`6 | 凍った祭壇は目印として優秀で、区画把握に役立っている |
| explore | `x.exp_id`2 and `x.floor`6 | 王宮路の分岐が多く、再合流点の設定が探索を安定させる |
| explore | `x.exp_id`3 and `x.floor`1 | name は明るい浜辺で波音を聞き、白い砂を踏んで進んでいる |
| explore | `x.exp_id`3 and `x.floor`1 | name はきらめく潮だまりをのぞき、浅い道を選んで歩いた |
| explore | `x.exp_id`3 and `x.floor`1 | name は貝殻の散る浜で足を止め、遠い岬を見て進路を決めた |
| explore | `x.exp_id`3 and `x.floor`1 | name は朝の日差しを背に受け、海風のやさしい道へ入っていく |
| explore | `x.exp_id`3 and `x.floor`1 | name はぬれた砂の足跡を追い、仲間を安全な浜道へ導いている |
| explore | `x.exp_id`3 and `x.floor`1 | 青い波が寄せる中で、name は岩の少ない浜筋を選んでいる |
| explore | `x.exp_id`3 and `x.floor`1 | 潮だまりに空が映るそばで、name は足場を確かめて進んだ |
| explore | `x.exp_id`3 and `x.floor`1 | 貝殻のきらめきを見ながら、name は岬へ続く線を読んでいる |
| explore | `x.exp_id`3 and `x.floor`1 | 朝の海風を受けるたびに、name は隊の歩幅を整えている |
| explore | `x.exp_id`3 and `x.floor`1 | ぬれた砂に残る跡を見つけ、name は先行者の道をたどった |
| explore | `x.exp_id`3 and `x.floor`1 | 明るい浜辺には白い砂が続き、波音が進路の目安になる |
| explore | `x.exp_id`3 and `x.floor`1 | 潮だまりが多く、浅い道を選ぶだけで移動が楽になる |
| explore | `x.exp_id`3 and `x.floor`1 | 貝殻の散る浜筋は歩きやすく、隊列を保ちやすい地形だ |
| explore | `x.exp_id`3 and `x.floor`1 | 朝の日差しが強く、海風の通る道が体力を守ってくれる |
| explore | `x.exp_id`3 and `x.floor`1 | ぬれた砂の足跡は残りやすく、通行の流れを読み取りやすい |
| explore | `x.exp_id`3 and `x.floor`1 | 岬へ向かう浜道は見晴らしがよく、危険を早く見つけられる |
| explore | `x.exp_id`3 and `x.floor`1 | 波の引き際を見れば、足を置きやすい場所が分かる |
| explore | `x.exp_id`3 and `x.floor`1 | 岩の少ない区画は進みやすく、荷運びの負担も軽くなる |
| explore | `x.exp_id`3 and `x.floor`1 | 空の明るさで潮の変化を読み、通過の時間を選びたい |
| explore | `x.exp_id`3 and `x.floor`1 | 海辺の静けさは深く、音で気配を捉えやすい場になっている |
| explore | `x.exp_id`3 and `x.floor`2 | name はおだやかな海で小舟を進め、静かな水面を見つめている |
| explore | `x.exp_id`3 and `x.floor`2 | name はやわらかな波の間を抜け、白い鳥の群れを追って進んだ |
| explore | `x.exp_id`3 and `x.floor`2 | name は帆を小さく張り、流れのゆるい道を選んで渡っている |
| explore | `x.exp_id`3 and `x.floor`2 | name は海のきらめきを見て目を細め、遠い島影へ向かった |
| explore | `x.exp_id`3 and `x.floor`2 | name は舟べりに手を添え、仲間へ静かに進む合図を送った |
| explore | `x.exp_id`3 and `x.floor`2 | 静かな水面が広がる中で、name はうねりの少ない線を選んでいる |
| explore | `x.exp_id`3 and `x.floor`2 | 白い鳥が回る空を見上げ、name は風向きに合わせて舵を切った |
| explore | `x.exp_id`3 and `x.floor`2 | ゆるい流れに舟を乗せながら、name は帆の角度を整えている |
| explore | `x.exp_id`3 and `x.floor`2 | きらめく海面に目をこらし、name は浅瀬を避けて進んだ |
| explore | `x.exp_id`3 and `x.floor`2 | 遠い島影が近づくたびに、name は隊の間隔を確かめている |
| explore | `x.exp_id`3 and `x.floor`2 | 海はおだやかで、うねりの少ない道を取りやすい |
| explore | `x.exp_id`3 and `x.floor`2 | 白い鳥の動きが風向きの手がかりになり、航路選びを助ける |
| explore | `x.exp_id`3 and `x.floor`2 | 流れのゆるい帯が続き、小舟でも安定して進める |
| explore | `x.exp_id`3 and `x.floor`2 | 海面のきらめきは強いが、目印になる島影が見えやすい |
| explore | `x.exp_id`3 and `x.floor`2 | 舟を寄せる間隔を保てば、隊の形を崩さず渡れる |
| explore | `x.exp_id`3 and `x.floor`2 | 帆の角度を小まめに変えることで、無理なく進行できる |
| explore | `x.exp_id`3 and `x.floor`2 | 浅瀬は色で見分けやすく、早めの回避が可能になる |
| explore | `x.exp_id`3 and `x.floor`2 | 静かな海域ほど音が届き、合図を共有しやすい |
| explore | `x.exp_id`3 and `x.floor`2 | 空と海の境がはっきりしており、方角を見失いにくい |
| explore | `x.exp_id`3 and `x.floor`2 | 穏やかな海路は長く続くため、歩調ならぬ舟調の管理が大切だ |
| explore | `x.exp_id`3 and `x.floor`3 | name は船の墓場に入り、傾いたマストの間を静かに進んでいる |
| explore | `x.exp_id`3 and `x.floor`3 | name は割れた甲板をまたぎ、残った綱を手がかりに歩いた |
| explore | `x.exp_id`3 and `x.floor`3 | name は打ち上げられた船腹を見上げ、通れる隙間を探している |
| explore | `x.exp_id`3 and `x.floor`3 | name はさびた錨のそばで足を止め、安全な渡り板を選んだ |
| explore | `x.exp_id`3 and `x.floor`3 | name は折れた帆柱の影を使い、潮風を避けながら進んでいる |
| explore | `x.exp_id`3 and `x.floor`3 | 傾いたマストが並ぶ中で、name は足場の広い道を選んでいる |
| explore | `x.exp_id`3 and `x.floor`3 | 割れた甲板がきしむたびに、name は荷の重さを分けて進んだ |
| explore | `x.exp_id`3 and `x.floor`3 | 船腹の隙間を見つけ、name は仲間を一列で通している |
| explore | `x.exp_id`3 and `x.floor`3 | さびた錨を目印にして、name は戻り道の線を残している |
| explore | `x.exp_id`3 and `x.floor`3 | 折れた帆柱の陰で、name は風をやり過ごしてから歩き出した |
| explore | `x.exp_id`3 and `x.floor`3 | 船の墓場には傾いたマストが密に並び、進路が細くなる |
| explore | `x.exp_id`3 and `x.floor`3 | 割れた甲板が多く、足場の選び直しが頻繁に必要になる |
| explore | `x.exp_id`3 and `x.floor`3 | 打ち上げられた船腹は壁のようになり、通路を分断している |
| explore | `x.exp_id`3 and `x.floor`3 | さびた錨や綱は目印になり、帰路の管理に使いやすい |
| explore | `x.exp_id`3 and `x.floor`3 | 折れた帆柱の陰は風よけとなり、短い待機に向いている |
| explore | `x.exp_id`3 and `x.floor`3 | きしむ木材の音が危険の前触れになり、判断の助けになる |
| explore | `x.exp_id`3 and `x.floor`3 | 渡り板は脆いものがあり、荷重の分散が重要になる |
| explore | `x.exp_id`3 and `x.floor`3 | 隙間通路は一列移動が基本で、隊列管理が欠かせない |
| explore | `x.exp_id`3 and `x.floor`3 | 潮風で足元が滑りやすく、歩幅を小さく保つ必要がある |
| explore | `x.exp_id`3 and `x.floor`3 | 残骸地帯は見通しが悪く、合図の統一が探索を安定させる |
| explore | `x.exp_id`3 and `x.floor`4 | name は海の岩門へ着き、潮の流れを見ながら進んでいる |
| explore | `x.exp_id`3 and `x.floor`4 | name は高い石のアーチを見上げ、波の弱い時を待って渡った |
| explore | `x.exp_id`3 and `x.floor`4 | name は潮だまりの縁をたどり、ぬれた岩を避けて歩いている |
| explore | `x.exp_id`3 and `x.floor`4 | name は岩門の影で息を整え、次の波間へ足を出した |
| explore | `x.exp_id`3 and `x.floor`4 | name は崩れた岩段を確かめ、仲間を順に先へ通している |
| explore | `x.exp_id`3 and `x.floor`4 | 石のアーチが海をまたぐ下で、name は足場の硬い道を選んだ |
| explore | `x.exp_id`3 and `x.floor`4 | 潮の流れが速まる前に、name は短い区間を一気に抜けた |
| explore | `x.exp_id`3 and `x.floor`4 | ぬれた岩肌を見て、name は滑りにくい縁だけを踏んで進んだ |
| explore | `x.exp_id`3 and `x.floor`4 | 岩門の影が伸びるころ、name は渡る順番を決めている |
| explore | `x.exp_id`3 and `x.floor`4 | 崩れた岩段の前で、name はロープを張って移動を助けた |
| explore | `x.exp_id`3 and `x.floor`4 | 海の岩門は高い石のアーチが続き、潮の読みが重要になる |
| explore | `x.exp_id`3 and `x.floor`4 | 波の弱い時間は短く、通過の判断が安全を左右する |
| explore | `x.exp_id`3 and `x.floor`4 | 潮だまりの縁は比較的安定し、移動の軸にしやすい |
| explore | `x.exp_id`3 and `x.floor`4 | ぬれた岩肌は滑りやすく、縁取りの選択が欠かせない |
| explore | `x.exp_id`3 and `x.floor`4 | 岩門の影は休む場所にもなり、隊の整理に向いている |
| explore | `x.exp_id`3 and `x.floor`4 | 崩れた岩段が多く、順番管理で移動の乱れを減らせる |
| explore | `x.exp_id`3 and `x.floor`4 | 石壁の反響で合図が届きやすく、連携を取りやすい |
| explore | `x.exp_id`3 and `x.floor`4 | 流れの筋が見える区画では、無理な横断を避けたい |
| explore | `x.exp_id`3 and `x.floor`4 | 高低差のある岩路は荷の受け渡しが有効になる |
| explore | `x.exp_id`3 and `x.floor`4 | 海門地形では時間を味方にする進み方が最も安定する |
| explore | `x.exp_id`3 and `x.floor`5 | name は捨てられた漁村に入り、消えた火の跡を見つめている |
| explore | `x.exp_id`3 and `x.floor`5 | name は壊れた舟小屋をのぞき、残った道具を確かめて進んだ |
| explore | `x.exp_id`3 and `x.floor`5 | name は静かな井戸のそばで足を止め、村道の向きを読み直した |
| explore | `x.exp_id`3 and `x.floor`5 | name は空の網棚を見上げ、風に鳴る縄の音を聞いている |
| explore | `x.exp_id`3 and `x.floor`5 | name は崩れた板塀を回り、港へ続く細道へ静かに入った |
| explore | `x.exp_id`3 and `x.floor`5 | 消えた火の跡を見つけて、name は人の流れをたどっている |
| explore | `x.exp_id`3 and `x.floor`5 | 壊れた舟小屋の影で、name は隊の隊形を整えてから進んだ |
| explore | `x.exp_id`3 and `x.floor`5 | 静かな井戸の水面を見て、name は短い休息の場所を決めた |
| explore | `x.exp_id`3 and `x.floor`5 | 空の網棚が揺れる中、name は港側の安全路を選んでいる |
| explore | `x.exp_id`3 and `x.floor`5 | 崩れた板塀を越える前に、name は退路の確認を仲間へ伝えた |
| explore | `x.exp_id`3 and `x.floor`5 | 捨てられた漁村には消えた火の跡が残り、往時の暮らしを示す |
| explore | `x.exp_id`3 and `x.floor`5 | 壊れた舟小屋が並び、港へ向かう道を分かりにくくしている |
| explore | `x.exp_id`3 and `x.floor`5 | 井戸周りは開けており、短い整理時間を取りやすい |
| explore | `x.exp_id`3 and `x.floor`5 | 空の網棚と縄の音が風向きの目安になってくれる |
| explore | `x.exp_id`3 and `x.floor`5 | 崩れた板塀が多く、回り込みで進路を繋ぐ必要がある |
| explore | `x.exp_id`3 and `x.floor`5 | 村道は細く曲がり、合流地点の共有が探索を安定させる |
| explore | `x.exp_id`3 and `x.floor`5 | 港側の道は見通しがよく、危険確認を早めに行える |
| explore | `x.exp_id`3 and `x.floor`5 | 木材のきしみ音は接近の気配を読む助けになる |
| explore | `x.exp_id`3 and `x.floor`5 | 古い道具が残る小屋は手がかりの宝庫になっている |
| explore | `x.exp_id`3 and `x.floor`5 | 静まり返った村ほど音が届き、合図管理が有効に働く |
| explore | `x.exp_id`3 and `x.floor`6 | name は狐長老の聖庭に入り、古い石灯の道をたどっている |
| explore | `x.exp_id`3 and `x.floor`6 | name は白い庭石の間を進み、静かな祈りの場へ向かった |
| explore | `x.exp_id`3 and `x.floor`6 | name は朱の門影で一礼し、清らかな回廊へ足を踏み入れた |
| explore | `x.exp_id`3 and `x.floor`6 | name は古い祭壇の前で灯りを整え、仲間へ合図を送っている |
| explore | `x.exp_id`3 and `x.floor`6 | name は祈り紋の刻まれた床を見て、禁じられた線を避けて進んだ |
| explore | `x.exp_id`3 and `x.floor`6 | 石灯が並ぶ参道を見つめながら、name は歩幅を静かに整えている |
| explore | `x.exp_id`3 and `x.floor`6 | 白い庭石の区画で、name は隊列を一列にして進んでいる |
| explore | `x.exp_id`3 and `x.floor`6 | 朱の門影が伸びるころ、name は回廊の安全路を選び直した |
| explore | `x.exp_id`3 and `x.floor`6 | 祭壇の灯りが揺れる中で、name は声を落として合図を交わした |
| explore | `x.exp_id`3 and `x.floor`6 | 祈り紋の床に目をこらし、name は踏むべき線だけをたどっている |
| explore | `x.exp_id`3 and `x.floor`6 | 聖庭には古い石灯が並び、祈りの道筋が今も残っている |
| explore | `x.exp_id`3 and `x.floor`6 | 白い庭石の配置が区画を示し、進路選びの助けになる |
| explore | `x.exp_id`3 and `x.floor`6 | 朱の門影は時間で伸び縮みし、通過の目安として使える |
| explore | `x.exp_id`3 and `x.floor`6 | 祭壇の周辺は静けさが深く、小さな合図でも伝わりやすい |
| explore | `x.exp_id`3 and `x.floor`6 | 祈り紋の床は踏み分けが必要で、慎重な足運びが求められる |
| explore | `x.exp_id`3 and `x.floor`6 | 回廊は曲がりが多く、一列移動が安定した進み方になる |
| explore | `x.exp_id`3 and `x.floor`6 | 石灯の明かりは柔らかく、夜でも道を見失いにくい |
| explore | `x.exp_id`3 and `x.floor`6 | 庭石の隙間は段差があり、歩幅の調整が欠かせない |
| explore | `x.exp_id`3 and `x.floor`6 | 聖庭の中心へ近づくほど静まり、集中した行動が必要になる |
| explore | `x.exp_id`3 and `x.floor`6 | 狐長老の庭路は神聖で、礼を重んじる進行が場を守る |
| explore | `x.exp_id`4 and `x.floor`1 | name は夜の砂漠で星を見上げ、冷えた砂を踏んで進んでいる |
| explore | `x.exp_id`4 and `x.floor`1 | name は月明かりの薄い道を選び、静かな丘を越えていく |
| explore | `x.exp_id`4 and `x.floor`1 | name は砂に残る古い跡をたどり、迷わぬよう歩幅を整えた |
| explore | `x.exp_id`4 and `x.floor`1 | name は夜風を背に受け、光る砂丘の縁をゆっくり進んだ |
| explore | `x.exp_id`4 and `x.floor`1 | name は黒い岩の影で足を止め、方角を確かめてから歩き出した |
| explore | `x.exp_id`4 and `x.floor`1 | 星がまたたく空の下で、name は砂丘の低い道を選んでいる |
| explore | `x.exp_id`4 and `x.floor`1 | 月明かりが揺れるたびに、name は足元の段差を確かめて進んだ |
| explore | `x.exp_id`4 and `x.floor`1 | 冷たい夜風を受けながら、name は隊の間隔を静かに整えている |
| explore | `x.exp_id`4 and `x.floor`1 | 砂に残る古い跡を見つけ、name は進路の線を引き直した |
| explore | `x.exp_id`4 and `x.floor`1 | 黒い岩影が伸びる中で、name は休める場所を見定めている |
| explore | `x.exp_id`4 and `x.floor`1 | 夜の砂漠は冷え込みが強く、歩く速さの調整が大切になる |
| explore | `x.exp_id`4 and `x.floor`1 | 星の位置がはっきり見え、方角を見失いにくい地形だ |
| explore | `x.exp_id`4 and `x.floor`1 | 月明かりの薄い道は静かで、足音を抑えて進みやすい |
| explore | `x.exp_id`4 and `x.floor`1 | 砂丘の縁には段差があり、低い道を選ぶ方が安全になる |
| explore | `x.exp_id`4 and `x.floor`1 | 砂に残る古い跡が行路の手がかりとして使える |
| explore | `x.exp_id`4 and `x.floor`1 | 黒い岩影は短い休息に向き、隊の整理もしやすい |
| explore | `x.exp_id`4 and `x.floor`1 | 夜風は砂を流し、足場の形が変わりやすい |
| explore | `x.exp_id`4 and `x.floor`1 | 見晴らしのよい丘では危険を早く見つけられる |
| explore | `x.exp_id`4 and `x.floor`1 | 灯りを絞ることで夜目を守り、遠くを見通しやすくなる |
| explore | `x.exp_id`4 and `x.floor`1 | 静かな砂原ほど音が届き、合図の共有がしやすい |
| explore | `x.exp_id`4 and `x.floor`2 | name は岩の台地で風よけを探し、崖道を確かめながら進んでいる |
| explore | `x.exp_id`4 and `x.floor`2 | name は赤い岩肌をたどり、平らな足場だけを選んで歩いた |
| explore | `x.exp_id`4 and `x.floor`2 | name は割れた石の段を越え、見晴らしの高みへ上っていく |
| explore | `x.exp_id`4 and `x.floor`2 | name は乾いた谷筋を見つけ、隊を横へ広げずに進ませた |
| explore | `x.exp_id`4 and `x.floor`2 | name は岩陰で短く休み、次の登り道へ静かに向かった |
| explore | `x.exp_id`4 and `x.floor`2 | 高い岩棚を前にして、name は回り込める道を探している |
| explore | `x.exp_id`4 and `x.floor`2 | 赤い岩肌が続く中で、name は滑りにくい線を選んで進んだ |
| explore | `x.exp_id`4 and `x.floor`2 | 割れた石段の手前で、name は荷を分けて上り始めた |
| explore | `x.exp_id`4 and `x.floor`2 | 乾いた谷筋を見ながら、name は隊列を細く整えている |
| explore | `x.exp_id`4 and `x.floor`2 | 岩陰に入るたびに、name は風の向きを確かめて歩き出した |
| explore | `x.exp_id`4 and `x.floor`2 | 岩の台地は高低差が大きく、足場確認が欠かせない |
| explore | `x.exp_id`4 and `x.floor`2 | 赤い岩肌は乾いていても滑る場所があり注意が必要だ |
| explore | `x.exp_id`4 and `x.floor`2 | 割れた石段が多く、荷重を分ける工夫が役に立つ |
| explore | `x.exp_id`4 and `x.floor`2 | 乾いた谷筋は進みやすいが、狭い場所では隊列管理が要る |
| explore | `x.exp_id`4 and `x.floor`2 | 岩陰は風を避けやすく、短い休息に向いている |
| explore | `x.exp_id`4 and `x.floor`2 | 高い岩棚は見晴らしがよく、進路の再確認に使える |
| explore | `x.exp_id`4 and `x.floor`2 | 崖道は曲がりが多く、合流点の共有が安全を支える |
| explore | `x.exp_id`4 and `x.floor`2 | 石の割れ目は足を取るため、歩幅を小さく保ちたい |
| explore | `x.exp_id`4 and `x.floor`2 | 風の強い時間帯は砂が舞い、視界が急に落ちることがある |
| explore | `x.exp_id`4 and `x.floor`2 | 台地の道は遠回りでも平坦な線を選ぶ方が安定する |
| explore | `x.exp_id`4 and `x.floor`3 | name は石灰の洞に入り、白い壁の反響を聞きながら進んでいる |
| explore | `x.exp_id`4 and `x.floor`3 | name は鍾乳の影を避け、乾いた通路を選んで歩いている |
| explore | `x.exp_id`4 and `x.floor`3 | name は壁に手を当て、分かれ道の空気の流れを確かめた |
| explore | `x.exp_id`4 and `x.floor`3 | name は足元の小石を払い、滑りにくい線で奥へ向かった |
| explore | `x.exp_id`4 and `x.floor`3 | name は薄い灯りをかざし、白く光る回廊を静かに進んでいる |
| explore | `x.exp_id`4 and `x.floor`3 | 白い壁が続く道で、name は反響の向きから広間を見つけた |
| explore | `x.exp_id`4 and `x.floor`3 | 鍾乳の影が揺れる中、name は頭上を確かめて進んでいる |
| explore | `x.exp_id`4 and `x.floor`3 | 分かれ道に立ったあと、name は風の通る方を選び直した |
| explore | `x.exp_id`4 and `x.floor`3 | 小石が転がる音を聞いて、name は足場の良い帯へ寄った |
| explore | `x.exp_id`4 and `x.floor`3 | 白く光る回廊の先で、name は隊を一列に整えている |
| explore | `x.exp_id`4 and `x.floor`3 | 石灰の洞は白い壁が続き、光が反射して道を見つけやすい |
| explore | `x.exp_id`4 and `x.floor`3 | 鍾乳の多い区画では頭上確認が安全につながる |
| explore | `x.exp_id`4 and `x.floor`3 | 分かれ道は風の流れを見ると進路を選びやすい |
| explore | `x.exp_id`4 and `x.floor`3 | 足元の小石は滑りの原因になり、事前に払うと安定する |
| explore | `x.exp_id`4 and `x.floor`3 | 薄い灯りでも壁が光り、視界を保ちやすい洞窟だ |
| explore | `x.exp_id`4 and `x.floor`3 | 反響が強く、合図の音が遠くまで届きやすい |
| explore | `x.exp_id`4 and `x.floor`3 | 狭い回廊が多いため、一列移動が基本になる |
| explore | `x.exp_id`4 and `x.floor`3 | 広間の入口は空気が動き、目に見えない目印になる |
| explore | `x.exp_id`4 and `x.floor`3 | 白い洞床は段差が見えにくく、歩幅調整が必要だ |
| explore | `x.exp_id`4 and `x.floor`3 | 静かな洞内ほど音の変化で危険を察知しやすい |
| explore | `x.exp_id`4 and `x.floor`4 | name は夜盗の気配が漂う道で灯りを落とし、静かに進んでいる |
| explore | `x.exp_id`4 and `x.floor`4 | name は岩陰に身を寄せ、見張りの目を避けて迂回した |
| explore | `x.exp_id`4 and `x.floor`4 | name は崩れた荷車の跡を見つけ、待ち伏せの道を外している |
| explore | `x.exp_id`4 and `x.floor`4 | name は短く合図を送り、仲間と足音をそろえて歩いた |
| explore | `x.exp_id`4 and `x.floor`4 | name は細い谷道を選び、開けた危ない道を避けて進んだ |
| explore | `x.exp_id`4 and `x.floor`4 | 遠くで金具の音が鳴る中、name は歩みを止めて気配を読んだ |
| explore | `x.exp_id`4 and `x.floor`4 | 岩陰が続く区画で、name は隊を小さくまとめて進んでいる |
| explore | `x.exp_id`4 and `x.floor`4 | 崩れた荷車の近くで、name は退路を先に確認している |
| explore | `x.exp_id`4 and `x.floor`4 | 薄い月明かりの道に入り、name は合図だけで仲間を導いた |
| explore | `x.exp_id`4 and `x.floor`4 | 細い谷道の分岐で、name は足跡の少ない方を選んだ |
| explore | `x.exp_id`4 and `x.floor`4 | 夜盗が潜む道は見通しが悪く、灯りを絞る判断が有効だ |
| explore | `x.exp_id`4 and `x.floor`4 | 岩陰の多い区画は身を隠しやすく、迂回に向いている |
| explore | `x.exp_id`4 and `x.floor`4 | 崩れた荷車の跡は待ち伏せ地点の目印になりやすい |
| explore | `x.exp_id`4 and `x.floor`4 | 足音をそろえるだけで気配を抑え、発見率を下げられる |
| explore | `x.exp_id`4 and `x.floor`4 | 細い谷道は安全だが、分岐管理が重要になる |
| explore | `x.exp_id`4 and `x.floor`4 | 金具音の反響で巡回位置を推測しやすい |
| explore | `x.exp_id`4 and `x.floor`4 | 開けた道は速いが見つかりやすく、慎重な選択が要る |
| explore | `x.exp_id`4 and `x.floor`4 | 月明かりの薄い時間は移動に向く短い機会になる |
| explore | `x.exp_id`4 and `x.floor`4 | 退路を先に決めることで不意の接触に備えられる |
| explore | `x.exp_id`4 and `x.floor`4 | 夜道では短い合図の統一が隊の生存を支える |
| explore | `x.exp_id`4 and `x.floor`5 | name は失われた宝を追う谷で古い印を見つけ、先へ進んでいる |
| explore | `x.exp_id`4 and `x.floor`5 | name は割れた石碑を読み、宝路の伝承が示す方角を確かめた |
| explore | `x.exp_id`4 and `x.floor`5 | name は細い谷の底をたどり、きらめく欠片を目印に歩いている |
| explore | `x.exp_id`4 and `x.floor`5 | name は崩れた橋跡を越え、宝が眠る洞口を探している |
| explore | `x.exp_id`4 and `x.floor`5 | name は古地図を開き、石柱の並びで位置を合わせて進んだ |
| explore | `x.exp_id`4 and `x.floor`5 | 谷壁の印を見つけたあと、name は宝路の線を地図へ写した |
| explore | `x.exp_id`4 and `x.floor`5 | 割れた石碑の前で、name は仲間と進路の候補を絞っている |
| explore | `x.exp_id`4 and `x.floor`5 | きらめく欠片が散る道で、name は足場の良い線を選んだ |
| explore | `x.exp_id`4 and `x.floor`5 | 崩れた橋跡の手前で、name はロープを張って渡る準備をした |
| explore | `x.exp_id`4 and `x.floor`5 | 古地図のしるしを見直し、name は石柱群の中央へ向かった |
| explore | `x.exp_id`4 and `x.floor`5 | 宝を追う谷には古い印が残り、探索の軸として使える |
| explore | `x.exp_id`4 and `x.floor`5 | 割れた石碑の文字は欠けていても方角の手がかりになる |
| explore | `x.exp_id`4 and `x.floor`5 | 谷底の細道には欠片が散り、目印として拾いやすい |
| explore | `x.exp_id`4 and `x.floor`5 | 崩れた橋跡が多く、渡る前の準備が安全を左右する |
| explore | `x.exp_id`4 and `x.floor`5 | 石柱の並びは位置合わせに有効で、地図読みに向いている |
| explore | `x.exp_id`4 and `x.floor`5 | 谷壁の印は風化しており、早めの記録が望ましい |
| explore | `x.exp_id`4 and `x.floor`5 | 洞口は影に隠れやすく、見落としを防ぐ確認が要る |
| explore | `x.exp_id`4 and `x.floor`5 | 宝路の候補が複数あるため、進路共有が欠かせない |
| explore | `x.exp_id`4 and `x.floor`5 | 岩屑の多い区画では歩幅を小さく保つと安定する |
| explore | `x.exp_id`4 and `x.floor`5 | 伝承に沿った印探しが、無駄な迂回を減らしてくれる |
| explore | `x.exp_id`4 and `x.floor`6 | name は豊穣の神殿に入り、砂を払った石段を上っている |
| explore | `x.exp_id`4 and `x.floor`6 | name は古い祭壇の前で灯りを整え、祈りの道へ進んだ |
| explore | `x.exp_id`4 and `x.floor`6 | name は壁の実り紋をなぞり、神殿の中心へ向かっている |
| explore | `x.exp_id`4 and `x.floor`6 | name は静かな回廊で一礼し、禁じられた間を避けて歩いた |
| explore | `x.exp_id`4 and `x.floor`6 | name は金色の柱影をたどり、奥の聖座を目指している |
| explore | `x.exp_id`4 and `x.floor`6 | 祭壇の灯りが揺れる中で、name は足音を抑えて進んでいる |
| explore | `x.exp_id`4 and `x.floor`6 | 実り紋の壁を見つめながら、name は進路の線を整えた |
| explore | `x.exp_id`4 and `x.floor`6 | 静かな回廊の分岐で、name は祈り道の印を選んでいる |
| explore | `x.exp_id`4 and `x.floor`6 | 金色の柱が並ぶ区画で、name は隊を一列にして進んだ |
| explore | `x.exp_id`4 and `x.floor`6 | 聖座へ続く段の前で、name は仲間へ礼の合図を送った |
| explore | `x.exp_id`4 and `x.floor`6 | 豊穣の神殿には実り紋が残り、祈りの道筋を示している |
| explore | `x.exp_id`4 and `x.floor`6 | 砂を払った石段は歩きやすく、上層へ向かう軸になる |
| explore | `x.exp_id`4 and `x.floor`6 | 古い祭壇の灯りは目印になり、回廊の位置を把握しやすい |
| explore | `x.exp_id`4 and `x.floor`6 | 静かな回廊は音が響き、合図の共有がしやすい場だ |
| explore | `x.exp_id`4 and `x.floor`6 | 金色の柱影は時間で形が変わり、通過判断の助けになる |
| explore | `x.exp_id`4 and `x.floor`6 | 禁じられた間の印があり、踏み込まない進行が求められる |
| explore | `x.exp_id`4 and `x.floor`6 | 聖座へ続く段は狭く、一列で進む方が安定する |
| explore | `x.exp_id`4 and `x.floor`6 | 壁の紋は区画ごとに異なり、現在地確認に役立つ |
| explore | `x.exp_id`4 and `x.floor`6 | 神殿中心へ近づくほど静まり、礼を重んじる動きが必要だ |
| explore | `x.exp_id`4 and `x.floor`6 | 祈りの場では急がず整然と進むことが安全につながる |
| explore | `x.exp_id`5 and `x.floor`1 | name は迷いの森で木に印を刻み、同じ道を避けて進んでいる |
| explore | `x.exp_id`5 and `x.floor`1 | name は霧の間を抜け、古い根道をたよりに歩いている |
| explore | `x.exp_id`5 and `x.floor`1 | name は低く枝を払いつつ、仲間を見失わぬよう先導した |
| explore | `x.exp_id`5 and `x.floor`1 | name は湿った葉の音に耳を澄まし、静かな方角へ進んだ |
| explore | `x.exp_id`5 and `x.floor`1 | name は苔むした石を見つけ、森の中心への線を確かめている |
| explore | `x.exp_id`5 and `x.floor`1 | 霧が流れる木立の中で、name は目印の印を増やしている |
| explore | `x.exp_id`5 and `x.floor`1 | 古い根道を見つけたあと、name は隊列を細く整えて進んだ |
| explore | `x.exp_id`5 and `x.floor`1 | 枝の影が揺れるたびに、name は立ち止まって気配を見た |
| explore | `x.exp_id`5 and `x.floor`1 | 湿った葉が足元を隠す中、name は歩幅を小さくしている |
| explore | `x.exp_id`5 and `x.floor`1 | 苔むした石の並びを見て、name は戻り道の線を引き直した |
| explore | `x.exp_id`5 and `x.floor`1 | 迷いの森は似た景色が続き、印づけが探索の要になる |
| explore | `x.exp_id`5 and `x.floor`1 | 霧の濃い区画では遠くが見えず、短い確認を重ねたい |
| explore | `x.exp_id`5 and `x.floor`1 | 古い根道は歩きやすく、進路の軸として使いやすい |
| explore | `x.exp_id`5 and `x.floor`1 | 低い枝が多く、前衛の払い動作が移動を助ける |
| explore | `x.exp_id`5 and `x.floor`1 | 湿った葉は音を隠すが、足場確認はより重要になる |
| explore | `x.exp_id`5 and `x.floor`1 | 苔むした石の列が方角の目印になり、迷いを減らせる |
| explore | `x.exp_id`5 and `x.floor`1 | 木立が密な場所は隊列を細く保つ方が安全だ |
| explore | `x.exp_id`5 and `x.floor`1 | 影の揺れが強い時間は気配を読み違えやすく注意が要る |
| explore | `x.exp_id`5 and `x.floor`1 | 同じ場所へ戻りやすいため、合流地点の共有が欠かせない |
| explore | `x.exp_id`5 and `x.floor`1 | 森の中心へ近づくほど静まり、慎重な進行が求められる |
| explore | `x.exp_id`5 and `x.floor`2 | name は険しい山道で息を整え、崖ぎわを一歩ずつ進んでいる |
| explore | `x.exp_id`5 and `x.floor`2 | name は岩壁の割れ目を見つけ、登りやすい道へ切り替えた |
| explore | `x.exp_id`5 and `x.floor`2 | name は細い尾根に入る前に荷を締め、足場を確かめている |
| explore | `x.exp_id`5 and `x.floor`2 | name は冷たい風を受けながら、谷を避ける高道を選んだ |
| explore | `x.exp_id`5 and `x.floor`2 | name は崩れた石段を越え、見晴らしの岩棚へ上っていく |
| explore | `x.exp_id`5 and `x.floor`2 | 切り立つ崖を前にして、name は回り込める道を探している |
| explore | `x.exp_id`5 and `x.floor`2 | 岩壁の割れ目をたどりながら、name は隊の速度を落とした |
| explore | `x.exp_id`5 and `x.floor`2 | 尾根道の風が強まる中で、name は間隔を詰めて進んでいる |
| explore | `x.exp_id`5 and `x.floor`2 | 谷側の砂利が崩れる音を聞き、name は歩く線を変えた |
| explore | `x.exp_id`5 and `x.floor`2 | 見晴らしの岩棚に着くと、name は次の登路を仲間へ示した |
| explore | `x.exp_id`5 and `x.floor`2 | 山道は高低差が大きく、足場確認が常に必要になる |
| explore | `x.exp_id`5 and `x.floor`2 | 岩壁の割れ目は登路の手がかりになり、迂回を減らせる |
| explore | `x.exp_id`5 and `x.floor`2 | 細い尾根では荷の固定が移動の安定を支える |
| explore | `x.exp_id`5 and `x.floor`2 | 谷側は崩れやすく、高道を選ぶ方が安全性が高い |
| explore | `x.exp_id`5 and `x.floor`2 | 崩れた石段が多く、歩幅を小さく保つのが有効だ |
| explore | `x.exp_id`5 and `x.floor`2 | 風の強い時間は隊列を寄せ、転落の危険を下げたい |
| explore | `x.exp_id`5 and `x.floor`2 | 岩棚は見晴らしがよく、進路の再確認に向いている |
| explore | `x.exp_id`5 and `x.floor`2 | 砂利の音は足場の兆しとなり、危険察知に役立つ |
| explore | `x.exp_id`5 and `x.floor`2 | 登路の分岐が多いため、案内役の合図統一が必要だ |
| explore | `x.exp_id`5 and `x.floor`2 | 遠回りでも安定した道を取る判断が生存を支える |
| explore | `x.exp_id`5 and `x.floor`3 | name はウルサンの陣地近くで煙を見つけ、回り道を選んでいる |
| explore | `x.exp_id`5 and `x.floor`3 | name は粗い柵の影に身を寄せ、見張りの視線を避けて進んだ |
| explore | `x.exp_id`5 and `x.floor`3 | name は焚き火跡の温みを確かめ、巡回の時間を読んでいる |
| explore | `x.exp_id`5 and `x.floor`3 | name は獣皮の幕を遠目に見て、静かな谷筋へ移動した |
| explore | `x.exp_id`5 and `x.floor`3 | name は戦旗の揺れを見上げ、危ない正面道を外している |
| explore | `x.exp_id`5 and `x.floor`3 | 陣地の煙が上がる方角で、name は足音を抑えて進んでいる |
| explore | `x.exp_id`5 and `x.floor`3 | 粗い柵が続く区画に入り、name は隊列を細くまとめた |
| explore | `x.exp_id`5 and `x.floor`3 | 焚き火跡の灰を見て、name は直近の通過を仲間へ伝えた |
| explore | `x.exp_id`5 and `x.floor`3 | 獣皮の幕が並ぶ先で、name は退路を先に確保している |
| explore | `x.exp_id`5 and `x.floor`3 | 戦旗の揺れる丘を見ながら、name は側面の道を選び直した |
| explore | `x.exp_id`5 and `x.floor`3 | ウルサン陣地の周辺は煙が目印になり、位置を読みやすい |
| explore | `x.exp_id`5 and `x.floor`3 | 粗い柵は通路を狭め、少人数で抜ける判断が有効だ |
| explore | `x.exp_id`5 and `x.floor`3 | 焚き火跡の温みは巡回時刻を測る手がかりになる |
| explore | `x.exp_id`5 and `x.floor`3 | 獣皮の幕が並ぶ場所は見張りが多く、正面突破は危険だ |
| explore | `x.exp_id`5 and `x.floor`3 | 戦旗の立つ丘は見通しがよく、発見されやすい |
| explore | `x.exp_id`5 and `x.floor`3 | 谷筋の側道は静かで、接触回避に向いている |
| explore | `x.exp_id`5 and `x.floor`3 | 灰の散り方で移動方向を読み、無駄な接近を防げる |
| explore | `x.exp_id`5 and `x.floor`3 | 退路を先に決めることで不意の遭遇に備えられる |
| explore | `x.exp_id`5 and `x.floor`3 | 陣地周辺では短い合図で動く連携が重要になる |
| explore | `x.exp_id`5 and `x.floor`3 | 迂回の積み重ねが被害を減らし、探索継続を助ける |
| explore | `x.exp_id`5 and `x.floor`4 | name は竜の尾根で空を見上げ、影が落ちる前に進んでいる |
| explore | `x.exp_id`5 and `x.floor`4 | name は鋭い岩稜を渡り、風下の道で身を低く保った |
| explore | `x.exp_id`5 and `x.floor`4 | name は焦げた岩面を見つめ、竜の通り道を外して進んだ |
| explore | `x.exp_id`5 and `x.floor`4 | name は高い尾根の切れ目で足を止め、次の走路を決めている |
| explore | `x.exp_id`5 and `x.floor`4 | name はうなる風を聞き、岩影をつないで静かに移動した |
| explore | `x.exp_id`5 and `x.floor`4 | 空に大きな影がよぎるたび、name は岩陰へ身を寄せている |
| explore | `x.exp_id`5 and `x.floor`4 | 鋭い岩稜の縁で、name は隊の間隔を狭めて進んだ |
| explore | `x.exp_id`5 and `x.floor`4 | 焦げた岩面を前にして、name は竜道を避ける線を引いた |
| explore | `x.exp_id`5 and `x.floor`4 | 尾根の切れ目に立ち、name は短く合図して一気に渡った |
| explore | `x.exp_id`5 and `x.floor`4 | 風のうなりが強まる中で、name は低い道を選び直した |
| explore | `x.exp_id`5 and `x.floor`4 | 竜の尾根は見晴らしが広く、空の監視が欠かせない |
| explore | `x.exp_id`5 and `x.floor`4 | 鋭い岩稜は足場が狭く、間隔管理が安全を支える |
| explore | `x.exp_id`5 and `x.floor`4 | 焦げた岩面は竜の活動跡となり、回避判断の目安になる |
| explore | `x.exp_id`5 and `x.floor`4 | 尾根の切れ目は危険だが、短時間通過で被害を抑えられる |
| explore | `x.exp_id`5 and `x.floor`4 | うなる風は気配を隠す反面、合図も届きにくくなる |
| explore | `x.exp_id`5 and `x.floor`4 | 岩陰をつなぐ進行が、上空からの視認を下げてくれる |
| explore | `x.exp_id`5 and `x.floor`4 | 低い道は遠回りでも生存率を上げる選択になる |
| explore | `x.exp_id`5 and `x.floor`4 | 影の動きを読むことで、走るべきタイミングを選べる |
| explore | `x.exp_id`5 and `x.floor`4 | 尾根上では荷の揺れが危険となり、固定確認が重要だ |
| explore | `x.exp_id`5 and `x.floor`4 | 空と地形を同時に見る判断が、この層の鍵になる |
| explore | `x.exp_id`5 and `x.floor`5 | name は火口のふちで熱気に耐え、ひび割れた岩道を進んでいる |
| explore | `x.exp_id`5 and `x.floor`5 | name は赤く光る石の間を抜け、噴気の弱い帯を選んだ |
| explore | `x.exp_id`5 and `x.floor`5 | name は灰の舞う坂を下り、足元を確かめながら歩いた |
| explore | `x.exp_id`5 and `x.floor`5 | name は煙の柱を遠くに見て、熱だまりを避けて進んでいる |
| explore | `x.exp_id`5 and `x.floor`5 | name は焼けた岩壁の陰で休み、次の安全路を探している |
| explore | `x.exp_id`5 and `x.floor`5 | 熱い風が吹き上がる中で、name は顔布を締めて進んでいる |
| explore | `x.exp_id`5 and `x.floor`5 | 赤く光る石を見つけるたび、name は歩く線を外へ寄せた |
| explore | `x.exp_id`5 and `x.floor`5 | 灰が舞う坂の手前で、name は隊を一列に整えて下った |
| explore | `x.exp_id`5 and `x.floor`5 | 噴気の音が強まると、name は立ち止まり向きを確かめた |
| explore | `x.exp_id`5 and `x.floor`5 | 焼けた岩壁の陰に入り、name は水分の残量を確認している |
| explore | `x.exp_id`5 and `x.floor`5 | 火口のふちは熱気が強く、短い区間で進むのが有効だ |
| explore | `x.exp_id`5 and `x.floor`5 | 赤く光る石は高温の印となり、回避の目安になる |
| explore | `x.exp_id`5 and `x.floor`5 | 灰の舞う坂は滑りやすく、歩幅を小さく保ちたい |
| explore | `x.exp_id`5 and `x.floor`5 | 煙の柱は位置確認に使えるが、熱だまりの兆しでもある |
| explore | `x.exp_id`5 and `x.floor`5 | 焼けた岩壁の陰は休息に向き、体勢を整えやすい |
| explore | `x.exp_id`5 and `x.floor`5 | 噴気の音が変わる時は危険が近く、停止判断が役立つ |
| explore | `x.exp_id`5 and `x.floor`5 | 一列移動で接触を減らし、転倒時の連鎖を防げる |
| explore | `x.exp_id`5 and `x.floor`5 | 顔布や水分管理が探索時間を大きく左右する |
| explore | `x.exp_id`5 and `x.floor`5 | 遠回りでも噴気の弱い帯を選ぶ方が安全に進める |
| explore | `x.exp_id`5 and `x.floor`5 | 熱波の層では急がず、確実な足運びが最優先になる |
| explore | `x.exp_id`5 and `x.floor`6 | name は要塞の城門前で盾を握り直し、重い扉へ近づいている |
| explore | `x.exp_id`5 and `x.floor`6 | name は外壁の影をたどり、矢窓を避ける道を選んで進んだ |
| explore | `x.exp_id`5 and `x.floor`6 | name は崩れた石段を上り、門前広場の端へ静かに入った |
| explore | `x.exp_id`5 and `x.floor`6 | name は古い旗台を見つけ、守兵路の向きを読み取っている |
| explore | `x.exp_id`5 and `x.floor`6 | name は鉄の扉に耳を当て、内側の気配を確かめている |
| explore | `x.exp_id`5 and `x.floor`6 | 城門の高い影の下で、name は隊の配置を整えている |
| explore | `x.exp_id`5 and `x.floor`6 | 外壁の矢窓を見上げながら、name は死角の線を選んだ |
| explore | `x.exp_id`5 and `x.floor`6 | 門前広場へ出る直前に、name は退路と合図を確認した |
| explore | `x.exp_id`5 and `x.floor`6 | 古い旗台の欠片を見て、name は守兵路の地図を更新した |
| explore | `x.exp_id`5 and `x.floor`6 | 鉄扉の前で気配を読む間、name は足音を止めて待った |
| explore | `x.exp_id`5 and `x.floor`6 | 要塞の城門は見通しが広く、接近時の配置が重要になる |
| explore | `x.exp_id`5 and `x.floor`6 | 外壁の矢窓は危険帯を作るため、死角移動が有効だ |
| explore | `x.exp_id`5 and `x.floor`6 | 崩れた石段は段差が不揃いで、足場確認が欠かせない |
| explore | `x.exp_id`5 and `x.floor`6 | 門前広場は広いが目立ちやすく、短時間通過が望ましい |
| explore | `x.exp_id`5 and `x.floor`6 | 古い旗台は守兵路の手がかりになり、進路整理を助ける |
| explore | `x.exp_id`5 and `x.floor`6 | 鉄の扉周辺は音が響き、静かな合図が必要になる |
| explore | `x.exp_id`5 and `x.floor`6 | 退路を決めてから前進すると接触時の混乱を減らせる |
| explore | `x.exp_id`5 and `x.floor`6 | 高い壁の影は時間で動き、通過の機会を生んでくれる |
| explore | `x.exp_id`5 and `x.floor`6 | 門前では隊の役割分担が生存率を左右する |
| explore | `x.exp_id`5 and `x.floor`6 | 焦らず準備を整えることが、要塞突破の第一歩になる |
| explore | `x.exp_id`6 and `x.floor`1 | name は蒸気のこもる巣穴で歯車の音を聞き、暗い通路を進んでいる |
| explore | `x.exp_id`6 and `x.floor`1 | name は熱い管の間を抜け、蒸気の薄い道を選んで歩いた |
| explore | `x.exp_id`6 and `x.floor`1 | name は古い圧力扉を押し開け、白い霧の奥へ入っていく |
| explore | `x.exp_id`6 and `x.floor`1 | name は天井のしずくを避け、金属床の安全な線をたどった |
| explore | `x.exp_id`6 and `x.floor`1 | name は低くうなる機械のそばで足を止め、次の道を決めている |
| explore | `x.exp_id`6 and `x.floor`1 | 蒸気が吹き出す中で、name は顔布を締めて進んでいる |
| explore | `x.exp_id`6 and `x.floor`1 | 熱い管の影を見つけ、name は隊を一列に整えて通した |
| explore | `x.exp_id`6 and `x.floor`1 | 圧力扉の前に立ち、name は合図を送ってから押し開けた |
| explore | `x.exp_id`6 and `x.floor`1 | しずくが落ちる金属床で、name は滑らぬよう歩幅を小さくした |
| explore | `x.exp_id`6 and `x.floor`1 | うなる機械の音を聞き分けて、name は静かな方角を選んだ |
| explore | `x.exp_id`6 and `x.floor`1 | 蒸気の巣穴は視界が白くなり、短い確認が欠かせない |
| explore | `x.exp_id`6 and `x.floor`1 | 熱い管が通路を分け、薄い蒸気の帯が安全路になる |
| explore | `x.exp_id`6 and `x.floor`1 | 圧力扉は重いが、開ける順を決めると通過しやすい |
| explore | `x.exp_id`6 and `x.floor`1 | 金属床はしずくで滑りやすく、歩幅調整が有効だ |
| explore | `x.exp_id`6 and `x.floor`1 | 低いうなり音は機械の位置を示し、進路判断に役立つ |
| explore | `x.exp_id`6 and `x.floor`1 | 蒸気の濃い区画では顔布と合図の統一が必要になる |
| explore | `x.exp_id`6 and `x.floor`1 | 管の影は熱を避ける道となり、体力消耗を抑えられる |
| explore | `x.exp_id`6 and `x.floor`1 | 狭い通路が多く、一列移動が探索を安定させる |
| explore | `x.exp_id`6 and `x.floor`1 | 音が反響しやすく、短い合図でも届きやすい場だ |
| explore | `x.exp_id`6 and `x.floor`1 | 霧の切れ目を見つける判断が、この層の鍵になる |
| explore | `x.exp_id`6 and `x.floor`2 | name はこわれた宇宙船の残骸で光る板を拾い、道を探している |
| explore | `x.exp_id`6 and `x.floor`2 | name は折れた外殻をまたぎ、青い灯の点る区画へ進んだ |
| explore | `x.exp_id`6 and `x.floor`2 | name は散らばる椅子を避け、通れる通路を静かに選んでいる |
| explore | `x.exp_id`6 and `x.floor`2 | name は割れた窓越しに星空を見て、進路の向きを決めた |
| explore | `x.exp_id`6 and `x.floor`2 | name は船内地図の欠片を見つけ、仲間へ道順を伝えている |
| explore | `x.exp_id`6 and `x.floor`2 | 傾いた船壁のそばで、name は足場の広い帯を選んでいる |
| explore | `x.exp_id`6 and `x.floor`2 | 光る板の文字を見て、name は次の区画を推し量った |
| explore | `x.exp_id`6 and `x.floor`2 | 折れた外殻の切れ目を前に、name は隊を順に通している |
| explore | `x.exp_id`6 and `x.floor`2 | 割れた窓に映る光を頼りに、name は進路を引き直した |
| explore | `x.exp_id`6 and `x.floor`2 | 船内地図の欠片を並べ、name は合流点を決めている |
| explore | `x.exp_id`6 and `x.floor`2 | 宇宙船の残骸は傾きが大きく、足場確認が重要になる |
| explore | `x.exp_id`6 and `x.floor`2 | 折れた外殻が壁のように並び、通路選びが難しくなる |
| explore | `x.exp_id`6 and `x.floor`2 | 散らばる座席や部品が多く、移動速度を落とす必要がある |
| explore | `x.exp_id`6 and `x.floor`2 | 割れた窓から見える星が方角確認の助けになる |
| explore | `x.exp_id`6 and `x.floor`2 | 光る板は区画情報の手がかりとなり、探索を支える |
| explore | `x.exp_id`6 and `x.floor`2 | 船内地図の欠片を集めるほど進路精度が上がっていく |
| explore | `x.exp_id`6 and `x.floor`2 | 狭い穴の通過は順番管理で安全性を高められる |
| explore | `x.exp_id`6 and `x.floor`2 | 傾斜床では荷の固定が転倒防止に役立つ |
| explore | `x.exp_id`6 and `x.floor`2 | 残骸区画は見通しが悪く、合図統一が欠かせない |
| explore | `x.exp_id`6 and `x.floor`2 | 古い船体でも光の導線があり、道筋を読み取れる |
| explore | `x.exp_id`6 and `x.floor`3 | name は禁じられた研究区で割れたカプセルを横目に進んでいる |
| explore | `x.exp_id`6 and `x.floor`3 | name は曇った観察窓をぬぐい、奥の通路を確かめた |
| explore | `x.exp_id`6 and `x.floor`3 | name は白い実験台の間を抜け、静かな扉へ向かっている |
| explore | `x.exp_id`6 and `x.floor`3 | name は床に散る記録札を拾い、危ない区画を見分けている |
| explore | `x.exp_id`6 and `x.floor`3 | name は青く揺れる警告灯を見て、遠回りの道を選んだ |
| explore | `x.exp_id`6 and `x.floor`3 | 割れたカプセルが並ぶ前で、name は隊列を細く整えている |
| explore | `x.exp_id`6 and `x.floor`3 | 観察窓の曇りを拭いながら、name は進路の先を読んだ |
| explore | `x.exp_id`6 and `x.floor`3 | 実験台の影が続く中で、name は足音を抑えて進んでいる |
| explore | `x.exp_id`6 and `x.floor`3 | 散らばる記録札を見つけ、name は封鎖区画を避けている |
| explore | `x.exp_id`6 and `x.floor`3 | 警告灯が青く揺れるたび、name は立ち止まり方向を修正した |
| explore | `x.exp_id`6 and `x.floor`3 | 研究区には割れたカプセルが残り、緊張感のある空気が漂う |
| explore | `x.exp_id`6 and `x.floor`3 | 観察窓の向こうは見えにくく、接近して確認する必要がある |
| explore | `x.exp_id`6 and `x.floor`3 | 白い実験台が多く、通路が細く分かれている |
| explore | `x.exp_id`6 and `x.floor`3 | 床の記録札は区画情報の手がかりとして使える |
| explore | `x.exp_id`6 and `x.floor`3 | 青い警告灯は危険帯の目印になり、回避判断を助ける |
| explore | `x.exp_id`6 and `x.floor`3 | 静かな扉ほど音が響き、開閉時の合図が重要になる |
| explore | `x.exp_id`6 and `x.floor`3 | 封鎖区画の境は分かりにくく、地図更新が欠かせない |
| explore | `x.exp_id`6 and `x.floor`3 | 影の多い室内では短区間で進む方が安全だ |
| explore | `x.exp_id`6 and `x.floor`3 | 古い設備が残るため、足元と頭上の同時確認が要る |
| explore | `x.exp_id`6 and `x.floor`3 | 禁域では急がず慎重に進む姿勢が生存を支える |
| explore | `x.exp_id`6 and `x.floor`4 | name は心なき機械が眠る区画で低い唸りを警戒して進んでいる |
| explore | `x.exp_id`6 and `x.floor`4 | name は止まった兵機の間を抜け、静かな通路を選んだ |
| explore | `x.exp_id`6 and `x.floor`4 | name は赤い目の消えた塔機を見上げ、死角の道へ入っていく |
| explore | `x.exp_id`6 and `x.floor`4 | name は金属腕の影を避け、ひび割れた床を確かめて歩いた |
| explore | `x.exp_id`6 and `x.floor`4 | name は眠る機械の列で息をひそめ、合図だけで仲間を導いた |
| explore | `x.exp_id`6 and `x.floor`4 | 止まった兵機のそばで、name は足音を消して進んでいる |
| explore | `x.exp_id`6 and `x.floor`4 | 赤い目の消えた塔機を見て、name は安全な距離を取った |
| explore | `x.exp_id`6 and `x.floor`4 | 金属腕が伸びる影の中、name は床の割れ目を避けている |
| explore | `x.exp_id`6 and `x.floor`4 | 機械列の切れ目を見つけ、name は隊を順に通している |
| explore | `x.exp_id`6 and `x.floor`4 | 低いうなりが強まると、name は退路を先に確かめた |
| explore | `x.exp_id`6 and `x.floor`4 | 心なき機械区画は静かだが、急な起動に備える必要がある |
| explore | `x.exp_id`6 and `x.floor`4 | 止まった兵機の間は狭く、一列移動が基本になる |
| explore | `x.exp_id`6 and `x.floor`4 | 赤い目の消えた塔機は目印になり、位置確認に使える |
| explore | `x.exp_id`6 and `x.floor`4 | 金属腕の残骸が多く、頭上確認が欠かせない |
| explore | `x.exp_id`6 and `x.floor`4 | ひび割れた床は崩れやすく、歩く線の選択が重要だ |
| explore | `x.exp_id`6 and `x.floor`4 | 機械列の切れ目は通路となり、隊の再整列に向いている |
| explore | `x.exp_id`6 and `x.floor`4 | 低いうなり音の変化が危険の前触れになることがある |
| explore | `x.exp_id`6 and `x.floor`4 | 退路共有を先に行うと、不意の接触に備えやすい |
| explore | `x.exp_id`6 and `x.floor`4 | 光の少ない区画では灯りの向きを絞る方が安全になる |
| explore | `x.exp_id`6 and `x.floor`4 | 眠る機械地帯では急がない進行が最善の策となる |
| explore | `x.exp_id`6 and `x.floor`5 | name は主なき橋に立ち、風の中で折れた床を見つめている |
| explore | `x.exp_id`6 and `x.floor`5 | name は鎖のきしむ音を聞き、渡れる板だけを選んで進んだ |
| explore | `x.exp_id`6 and `x.floor`5 | name は崩れた欄干を避け、橋の中央線をたどっている |
| explore | `x.exp_id`6 and `x.floor`5 | name は遠くの灯を目印にし、揺れる橋路を静かに渡った |
| explore | `x.exp_id`6 and `x.floor`5 | name は落ちた部品をまたぎ、仲間へ歩く順を指示している |
| explore | `x.exp_id`6 and `x.floor`5 | 橋板が鳴るたびに、name は立ち止まって重みを分けている |
| explore | `x.exp_id`6 and `x.floor`5 | 鎖の影が揺れる中で、name は風の弱い瞬間を待って進んだ |
| explore | `x.exp_id`6 and `x.floor`5 | 崩れた欄干の切れ目で、name はロープを張って補助した |
| explore | `x.exp_id`6 and `x.floor`5 | 遠い灯を見失わぬよう、name は進路の線を仲間へ示した |
| explore | `x.exp_id`6 and `x.floor`5 | 落ちた部品の密集地で、name は一人ずつ通す判断をした |
| explore | `x.exp_id`6 and `x.floor`5 | 主なき橋は揺れが大きく、重み配分の管理が重要になる |
| explore | `x.exp_id`6 and `x.floor`5 | 鎖のきしみは風の強さを知らせ、渡る時機を教えてくれる |
| explore | `x.exp_id`6 and `x.floor`5 | 崩れた欄干が多く、中央線の維持が安全につながる |
| explore | `x.exp_id`6 and `x.floor`5 | 折れた床板は見分けが難しく、先導の確認が必要だ |
| explore | `x.exp_id`6 and `x.floor`5 | 遠くの灯は貴重な目印で、方角維持に役立つ |
| explore | `x.exp_id`6 and `x.floor`5 | 落ちた部品は足を取るため、短い歩幅で進みたい |
| explore | `x.exp_id`6 and `x.floor`5 | ロープ補助を使うことで転落の危険を下げられる |
| explore | `x.exp_id`6 and `x.floor`5 | 一人ずつ通す運用が橋路での混乱を防ぐ |
| explore | `x.exp_id`6 and `x.floor`5 | 風の切れ目を待つ判断が、橋渡りの成否を左右する |
| explore | `x.exp_id`6 and `x.floor`5 | 慎重な順番管理こそが主なき橋の攻略法になる |
| explore | `x.exp_id`6 and `x.floor`6 | name は共鳴の祭壇で青い光を浴び、最後の間へ進んでいる |
| explore | `x.exp_id`6 and `x.floor`6 | name は石の円壇に手を当て、響きの流れを確かめた |
| explore | `x.exp_id`6 and `x.floor`6 | name は浮かぶ紋の道をたどり、祭壇の中心へ向かった |
| explore | `x.exp_id`6 and `x.floor`6 | name は静かな鐘音に耳を澄まし、光る階を上っている |
| explore | `x.exp_id`6 and `x.floor`6 | name は古い祈り板を見つけ、仲間へ進む順を伝えた |
| explore | `x.exp_id`6 and `x.floor`6 | 青い光が揺れる中で、name は歩幅をそろえて進んでいる |
| explore | `x.exp_id`6 and `x.floor`6 | 石の円壇の縁で、name は響きの強い帯を避けている |
| explore | `x.exp_id`6 and `x.floor`6 | 浮かぶ紋の線を見つめながら、name は進路を整えた |
| explore | `x.exp_id`6 and `x.floor`6 | 鐘音が重なるたびに、name は立ち止まり合図を送った |
| explore | `x.exp_id`6 and `x.floor`6 | 祈り板の印を読んで、name は中心への道を選び直した |
| explore | `x.exp_id`6 and `x.floor`6 | 共鳴の祭壇は青い光が満ち、道筋が紋で示されている |
| explore | `x.exp_id`6 and `x.floor`6 | 石の円壇は響きが強く、立ち位置の調整が必要になる |
| explore | `x.exp_id`6 and `x.floor`6 | 浮かぶ紋は進路の目印となり、迷いを減らしてくれる |
| explore | `x.exp_id`6 and `x.floor`6 | 静かな鐘音は合図の基準になり、隊の動きを合わせやすい |
| explore | `x.exp_id`6 and `x.floor`6 | 光る階は見やすいが段差があり、歩幅管理が大切だ |
| explore | `x.exp_id`6 and `x.floor`6 | 古い祈り板には進行順の手がかりが残されている |
| explore | `x.exp_id`6 and `x.floor`6 | 中心へ近づくほど響きが増し、慎重な進行が求められる |
| explore | `x.exp_id`6 and `x.floor`6 | 祭壇周囲は開けており、配置調整をしやすい |
| explore | `x.exp_id`6 and `x.floor`6 | 紋の線を外れない移動が安全な通過を支える |
| explore | `x.exp_id`6 and `x.floor`6 | 最後の間へ向かう道は静かで、礼を重んじる歩みが合う |
| explore | `x.exp_id`7 and `x.floor`1 | name は巨大な瓦礫の輪で飛ぶ石を避け、外周道を進んでいる |
| explore | `x.exp_id`7 and `x.floor`1 | name は砕けた柱をまたぎ、安全な足場を選んで歩いた |
| explore | `x.exp_id`7 and `x.floor`1 | name は空に浮く破片を見上げ、落下の切れ目で前へ出た |
| explore | `x.exp_id`7 and `x.floor`1 | name は輪の内側を避け、風の弱い縁道をたどっている |
| explore | `x.exp_id`7 and `x.floor`1 | name は古い金属片を目印にし、戻り道の線を残して進んだ |
| explore | `x.exp_id`7 and `x.floor`1 | 飛ぶ石が回る中で、name は隊を小さくまとめて進んでいる |
| explore | `x.exp_id`7 and `x.floor`1 | 砕けた柱の影を使い、name は落下をやり過ごしている |
| explore | `x.exp_id`7 and `x.floor`1 | 浮遊破片の動きを見ながら、name は進む間を選んだ |
| explore | `x.exp_id`7 and `x.floor`1 | 輪の縁へ寄るたびに、name は足場を確かめ直している |
| explore | `x.exp_id`7 and `x.floor`1 | 金属片の並びを見て、name は合流点の位置を決めた |
| explore | `x.exp_id`7 and `x.floor`1 | 巨大な瓦礫の輪は落下物が多く、外周移動が安全になる |
| explore | `x.exp_id`7 and `x.floor`1 | 砕けた柱は障害にも盾にもなり、使い方が鍵になる |
| explore | `x.exp_id`7 and `x.floor`1 | 浮遊破片の動きには波があり、進む間を選ぶ必要がある |
| explore | `x.exp_id`7 and `x.floor`1 | 輪の内側は風が強く、縁道の方が安定して進める |
| explore | `x.exp_id`7 and `x.floor`1 | 古い金属片は目印になり、帰路確認に役立つ |
| explore | `x.exp_id`7 and `x.floor`1 | 足場が崩れやすく、歩幅を小さく保つのが有効だ |
| explore | `x.exp_id`7 and `x.floor`1 | 落下音の変化で危険を早めに察知できる |
| explore | `x.exp_id`7 and `x.floor`1 | 隊を小さく保つことで接触事故を減らせる |
| explore | `x.exp_id`7 and `x.floor`1 | 遮蔽物をつなぐ進行が被弾率を下げてくれる |
| explore | `x.exp_id`7 and `x.floor`1 | この層では急がず、落下の間を読む判断が最優先になる |
| explore | `x.exp_id`7 and `x.floor`2 | name は転送の回廊で揺れる光を見つめ、足元を確かめている |
| explore | `x.exp_id`7 and `x.floor`2 | name は光門の脈に合わせ、静かな間で一歩ずつ進んだ |
| explore | `x.exp_id`7 and `x.floor`2 | name は青白い床紋をたどり、ずれない道を選んでいる |
| explore | `x.exp_id`7 and `x.floor`2 | name は回廊の柱に手を当て、転移風の向きを読んだ |
| explore | `x.exp_id`7 and `x.floor`2 | name は光の揺らぎを見て、仲間へ渡る順を伝えている |
| explore | `x.exp_id`7 and `x.floor`2 | 揺れる光の帯の前で、name は歩みを止めて間を待っている |
| explore | `x.exp_id`7 and `x.floor`2 | 光門の脈が弱まると、name は短い合図で隊を進めた |
| explore | `x.exp_id`7 and `x.floor`2 | 床紋がずれる区画で、name は中心線へ戻している |
| explore | `x.exp_id`7 and `x.floor`2 | 回廊柱の影に入り、name は転移風をやり過ごした |
| explore | `x.exp_id`7 and `x.floor`2 | 光の揺らぎが強まるたび、name は順番を組み直している |
| explore | `x.exp_id`7 and `x.floor`2 | 転送回廊は光の脈で危険が変わり、待つ判断が重要になる |
| explore | `x.exp_id`7 and `x.floor`2 | 床紋の中心線をたどることで迷いを減らせる |
| explore | `x.exp_id`7 and `x.floor`2 | 回廊柱は風よけになり、短い待機に向いている |
| explore | `x.exp_id`7 and `x.floor`2 | 揺らぎの強い帯は避け、弱い間で渡るのが安全だ |
| explore | `x.exp_id`7 and `x.floor`2 | 光門の脈は規則があり、観察で通過精度を上げられる |
| explore | `x.exp_id`7 and `x.floor`2 | 足元確認を続けると転移ずれの危険を下げられる |
| explore | `x.exp_id`7 and `x.floor`2 | 順番管理を徹底すれば隊の分断を防ぎやすい |
| explore | `x.exp_id`7 and `x.floor`2 | 短い合図が有効で、回廊内でも連携を保てる |
| explore | `x.exp_id`7 and `x.floor`2 | 青白い光は目印になるが、見すぎると距離感を失いやすい |
| explore | `x.exp_id`7 and `x.floor`2 | 落ち着いた歩みが転送路攻略の基本になる |
| explore | `x.exp_id`7 and `x.floor`3 | name は光の層で目を細め、白く輝く道を進んでいる |
| explore | `x.exp_id`7 and `x.floor`3 | name はまばゆい壁を避け、影の細道を選んで歩いた |
| explore | `x.exp_id`7 and `x.floor`3 | name は光の花弁のような紋を見つけ、進路を整えている |
| explore | `x.exp_id`7 and `x.floor`3 | name は白金の柱影で足を止め、視界が戻るのを待った |
| explore | `x.exp_id`7 and `x.floor`3 | name は光風に髪を揺らしながら、静かな帯へ入っていく |
| explore | `x.exp_id`7 and `x.floor`3 | 強い光が差す中で、name は顔を伏せて足場を確かめている |
| explore | `x.exp_id`7 and `x.floor`3 | 白く輝く壁沿いで、name は影の帯をつないで進んだ |
| explore | `x.exp_id`7 and `x.floor`3 | 光紋が広がる床を見て、name は中心線を選び直した |
| explore | `x.exp_id`7 and `x.floor`3 | 白金の柱影に入るたび、name は隊の間隔を整えている |
| explore | `x.exp_id`7 and `x.floor`3 | 光風が吹き抜ける区画で、name は合図だけで移動した |
| explore | `x.exp_id`7 and `x.floor`3 | 光の層は明るさが極端で、影道の利用が安全につながる |
| explore | `x.exp_id`7 and `x.floor`3 | まばゆい壁は視界を奪いやすく、直視を避けるのが有効だ |
| explore | `x.exp_id`7 and `x.floor`3 | 光紋の広がりが道筋を示し、進路選びの助けになる |
| explore | `x.exp_id`7 and `x.floor`3 | 白金の柱影は視界回復の休み場として使える |
| explore | `x.exp_id`7 and `x.floor`3 | 光風が強い場所は合図を短くして連携を保ちたい |
| explore | `x.exp_id`7 and `x.floor`3 | 足場は見やすいが距離感を誤りやすく注意が必要だ |
| explore | `x.exp_id`7 and `x.floor`3 | 影の帯をつないだ進行が被害を抑えやすい |
| explore | `x.exp_id`7 and `x.floor`3 | 明暗差の大きい区画では歩幅を小さく保つと安定する |
| explore | `x.exp_id`7 and `x.floor`3 | 隊列を密にしすぎない調整が接触を減らしてくれる |
| explore | `x.exp_id`7 and `x.floor`3 | この層では目と足の休ませ方が探索の鍵になる |
| explore | `x.exp_id`7 and `x.floor`4 | name は闇の層で仲間の声を頼りに、静かに歩を合わせている |
| explore | `x.exp_id`7 and `x.floor`4 | name は黒い床紋を指でなぞり、消えた道筋を見つけた |
| explore | `x.exp_id`7 and `x.floor`4 | name は小さな灯りを手で覆い、影の回廊を進んでいる |
| explore | `x.exp_id`7 and `x.floor`4 | name は遠くの足音を聞き分け、危ない分岐を避けて進んだ |
| explore | `x.exp_id`7 and `x.floor`4 | name は暗い柱列をたどり、迷わぬよう印を残している |
| explore | `x.exp_id`7 and `x.floor`4 | 闇が深まる中で、name は仲間の呼吸に合わせて進んでいる |
| explore | `x.exp_id`7 and `x.floor`4 | 黒い床紋を見つけるたび、name は進路の線を引き直した |
| explore | `x.exp_id`7 and `x.floor`4 | 灯りを絞った回廊で、name は足元だけを確かめて歩いた |
| explore | `x.exp_id`7 and `x.floor`4 | 遠い足音が響く方向を聞き、name は安全な道を選んだ |
| explore | `x.exp_id`7 and `x.floor`4 | 暗い柱の切れ目で、name は合流点を仲間へ示している |
| explore | `x.exp_id`7 and `x.floor`4 | 闇の層は視界が乏しく、声と足音が重要な手がかりになる |
| explore | `x.exp_id`7 and `x.floor`4 | 黒い床紋は薄いが、道筋の確認に役立つ印だ |
| explore | `x.exp_id`7 and `x.floor`4 | 灯りを絞ることで位置を隠しつつ視界を保てる |
| explore | `x.exp_id`7 and `x.floor`4 | 分岐が多いため、印づけ運用が探索を安定させる |
| explore | `x.exp_id`7 and `x.floor`4 | 柱列は方向維持に使え、迷いを減らしてくれる |
| explore | `x.exp_id`7 and `x.floor`4 | 足音の反響差で広い道と狭い道を見分けやすい |
| explore | `x.exp_id`7 and `x.floor`4 | 隊の呼吸を合わせると移動音を抑えやすい |
| explore | `x.exp_id`7 and `x.floor`4 | 合流点を先に決めることで分断を防げる |
| explore | `x.exp_id`7 and `x.floor`4 | 急がない歩みが闇域での生存率を高める |
| explore | `x.exp_id`7 and `x.floor`4 | この層では見えない情報を聞いて進む姿勢が大切だ |
| explore | `x.exp_id`7 and `x.floor`5 | name は深淵のふちで胸をおさえ、落ちる風の音を聞いている |
| explore | `x.exp_id`7 and `x.floor`5 | name は細い縁道に足を置き、深い闇を避けて進んでいる |
| explore | `x.exp_id`7 and `x.floor`5 | name は古い杭を確かめ、崩れぬ道だけを選んで歩いた |
| explore | `x.exp_id`7 and `x.floor`5 | name は裂け目の向こうの灯を見つめ、渡る順を決めている |
| explore | `x.exp_id`7 and `x.floor`5 | name は揺れる足場で腰を落とし、風の切れ目を待って進んだ |
| explore | `x.exp_id`7 and `x.floor`5 | 深淵風が吹き上がる中で、name は縁道の中心を保っている |
| explore | `x.exp_id`7 and `x.floor`5 | 古い杭が並ぶ場所で、name は安全線を仲間へ示した |
| explore | `x.exp_id`7 and `x.floor`5 | 裂け目の手前に立ち、name はロープを張って準備している |
| explore | `x.exp_id`7 and `x.floor`5 | 揺れる足場を前にして、name は荷を分けて通過した |
| explore | `x.exp_id`7 and `x.floor`5 | 闇の底から響く風音を聞き、name は進む間を選んでいる |
| explore | `x.exp_id`7 and `x.floor`5 | 深淵のふちは転落危険が高く、中心線の維持が不可欠だ |
| explore | `x.exp_id`7 and `x.floor`5 | 細い縁道は揺れやすく、荷重分散で安定を得られる |
| explore | `x.exp_id`7 and `x.floor`5 | 古い杭は補助点となり、通過順管理に役立つ |
| explore | `x.exp_id`7 and `x.floor`5 | 裂け目越えではロープ準備が安全性を大きく上げる |
| explore | `x.exp_id`7 and `x.floor`5 | 風の切れ目を待つ判断が移動成功を左右する |
| explore | `x.exp_id`7 and `x.floor`5 | 足場の材が弱く、短区間ごとの確認が必要になる |
| explore | `x.exp_id`7 and `x.floor`5 | 灯の位置は方角維持に有効で、迷いを減らせる |
| explore | `x.exp_id`7 and `x.floor`5 | 一人ずつ通す運用が連鎖転倒を防いでくれる |
| explore | `x.exp_id`7 and `x.floor`5 | 深い闇に目を取られず、足元優先で進みたい |
| explore | `x.exp_id`7 and `x.floor`5 | この層では慎重な順番管理が命を守る鍵になる |
| explore | `x.exp_id`7 and `x.floor`6 | name は月の宮で白い床に映る影を追い、玉座の間へ向かっている |
| explore | `x.exp_id`7 and `x.floor`6 | name は銀の回廊を静かに進み、月光の紋をたどっている |
| explore | `x.exp_id`7 and `x.floor`6 | name は丸い窓から差す光を見て、正しい扉を選んだ |
| explore | `x.exp_id`7 and `x.floor`6 | name は青い灯台の前で一礼し、宮の中心へ歩き出した |
| explore | `x.exp_id`7 and `x.floor`6 | name は薄絹の帳を払って、静かな玉座路へ入っていく |
| explore | `x.exp_id`7 and `x.floor`6 | 白い床が光る中で、name は影の線を道しるべにしている |
| explore | `x.exp_id`7 and `x.floor`6 | 銀の回廊の曲がり角で、name は隊の歩幅をそろえた |
| explore | `x.exp_id`7 and `x.floor`6 | 丸窓の月光が動くたび、name は扉の順を見直している |
| explore | `x.exp_id`7 and `x.floor`6 | 青い灯台の影に入り、name は短い合図で隊を導いた |
| explore | `x.exp_id`7 and `x.floor`6 | 薄絹の帳が揺れる先で、name は玉座への線を確かめた |
| explore | `x.exp_id`7 and `x.floor`6 | 月の宮は白い床が広がり、影の線が進路の目印になる |
| explore | `x.exp_id`7 and `x.floor`6 | 銀の回廊は静かで、足音管理がしやすい構造だ |
| explore | `x.exp_id`7 and `x.floor`6 | 丸窓の月光は時間で動き、扉選びの手がかりになる |
| explore | `x.exp_id`7 and `x.floor`6 | 青い灯台は遠目でも分かり、合流点として使いやすい |
| explore | `x.exp_id`7 and `x.floor`6 | 薄絹の帳は視界を揺らすため、近接確認が必要になる |
| explore | `x.exp_id`7 and `x.floor`6 | 玉座路は分岐が多く、順路共有が探索を安定させる |
| explore | `x.exp_id`7 and `x.floor`6 | 白床は見やすい反面、段差が見えにくい場所もある |
| explore | `x.exp_id`7 and `x.floor`6 | 静かな宮ほど合図が届き、連携を保ちやすい |
| explore | `x.exp_id`7 and `x.floor`6 | 礼を重んじるゆるやかな進行が、この場の流れに合う |
| explore | `x.exp_id`7 and `x.floor`6 | 月光と影を読む判断が宮中探索の鍵となる |
| explore | `x.exp_id`8 and `x.floor`1 | name は虚構へと向かう谷口で砕けた岩を越えて進んでいる |
| explore | `x.exp_id`8 and `x.floor`1 | name は焼けた地面を確かめ、崩れにくい道を選んで歩いた |
| explore | `x.exp_id`8 and `x.floor`1 | name は深い爪痕をなぞり、深淵に入り込まない進路へ切り替えた |
| explore | `x.exp_id`8 and `x.floor`1 | name は風の鳴る谷壁を見上げ、落石の少ない帯をたどっている |
| explore | `x.exp_id`8 and `x.floor`1 | name は黒い鱗片を拾い、危ない区画を地図に記している |
| explore | `x.exp_id`8 and `x.floor`1 | 谷口の裂けた岩を前にして、name は隊の間隔を整えている |
| explore | `x.exp_id`8 and `x.floor`1 | 瘴気で焼けた地面を見て、name は足場の線を引き直した |
| explore | `x.exp_id`8 and `x.floor`1 | 深い爪痕が続く中で、name は虚痕を避ける側道を選んだ |
| explore | `x.exp_id`8 and `x.floor`1 | 風の鳴る谷壁の下で、name は落石の間を見て進んだ |
| explore | `x.exp_id`8 and `x.floor`1 | 黒い鱗片が散る場所で、name は合流点を先に決めている |
| explore | `x.exp_id`8 and `x.floor`1 | 虚痕の谷口は陥没痕が多く、足元がおぼつかない |
| explore | `x.exp_id`8 and `x.floor`1 | 溶けた地面は脆く、足場確認を重ねる必要がある |
| explore | `x.exp_id`8 and `x.floor`1 | 谷壁の風鳴りは落石の前触れとなり、判断に役立つ |
| explore | `x.exp_id`8 and `x.floor`1 | いつからかなのだろう、その古びた石造りの小屋がそこにあったのは |
| explore | `x.exp_id`8 and `x.floor`1 | 裂けた岩が多く、歩幅を小さく保つ方が安全だ |
| explore | `x.exp_id`8 and `x.floor`1 | 側道は遠回りでも接触回避に向いている |
| explore | `x.exp_id`8 and `x.floor`1 | 瘴気の残る帯は体力を削り、なるべく短い時間で通り過ぎたいものだ |
| explore | `x.exp_id`8 and `x.floor`1 | 隊の間隔管理で連鎖転倒を防ぎやすくなる |
| explore | `x.exp_id`8 and `x.floor`1 | 落石の間を読む進行が被害を減らしてくれる |
| explore | `x.exp_id`8 and `x.floor`1 | この層では急がず、虚痕を読んで進む姿勢が大切だ |
| explore | `x.exp_id`8 and `x.floor`2 | name は骨の研究地で古い標本台を見つけ、静かに進んでいる |
| explore | `x.exp_id`8 and `x.floor`2 | name は白い骨柱の間を抜け、割れ目の少ない道を選んだ |
| explore | `x.exp_id`8 and `x.floor`2 | name は乾いた骨の山を避け、平らな通路をたどっている |
| explore | `x.exp_id`8 and `x.floor`2 | name は欠けた記録板を拾い、この地の印を確かめた |
| explore | `x.exp_id`8 and `x.floor`2 | name は灰色の棚路を歩き、崩れやすい縁を外して進んだ |
| explore | `x.exp_id`8 and `x.floor`2 | 骨柱が並ぶ区画で、name は隊列を一列に整えている |
| explore | `x.exp_id`8 and `x.floor`2 | 標本台の影に入り、name は次の分岐を見定めている |
| explore | `x.exp_id`8 and `x.floor`2 | 乾いた骨片が鳴るたびに、name は歩く線を修正した |
| explore | `x.exp_id`8 and `x.floor`2 | 欠けた記録板を見て、name は封鎖区画を避けている |
| explore | `x.exp_id`8 and `x.floor`2 | 灰色の棚路の端で、name は足場の強い帯を選んだ |
| explore | `x.exp_id`8 and `x.floor`2 | 骨の研究地は骨柱が密で、通路管理が重要になる |
| explore | `x.exp_id`8 and `x.floor`2 | 標本台は目印として使え、位置確認に役立つ |
| explore | `x.exp_id`8 and `x.floor`2 | 乾いた骨の山は崩れやすく、接近を避けたい |
| explore | `x.exp_id`8 and `x.floor`2 | 欠けた記録板には区画情報が残り、進路判断を助ける |
| explore | `x.exp_id`8 and `x.floor`2 | 灰色の棚路は狭く、一列移動が安定した進み方だ |
| explore | `x.exp_id`8 and `x.floor`2 | 骨片の音は足場の変化を知らせる手がかりになる |
| explore | `x.exp_id`8 and `x.floor`2 | 分岐が多く、合流点の共有が欠かせない |
| explore | `x.exp_id`8 and `x.floor`2 | 崩れやすい縁を外すだけで転落率を下げられる |
| explore | `x.exp_id`8 and `x.floor`2 | 静かな区画ほど合図が届き、連携を取りやすい |
| explore | `x.exp_id`8 and `x.floor`2 | この層では記録板の読み取りが探索効率を高める |
| explore | `x.exp_id`8 and `x.floor`3 | name は小さな神々の祠で供え花を置き、祈りの道へ進んでいる |
| explore | `x.exp_id`8 and `x.floor`3 | name は石の祠を一つずつ巡り、清い道筋を選んだ |
| explore | `x.exp_id`8 and `x.floor`3 | name は鈴の音に耳を澄まし、祭路の分岐を確かめた |
| explore | `x.exp_id`8 and `x.floor`3 | name は苔むした祭壇に一礼し、静かな回廊へ入っていく |
| explore | `x.exp_id`8 and `x.floor`3 | name は灯明の残る台座を見つけ、中心へ向かう線を引いた |
| explore | `x.exp_id`8 and `x.floor`3 | 小祠が並ぶ参道で、name は歩幅をそろえて進んでいる |
| explore | `x.exp_id`8 and `x.floor`3 | 石祠の影が伸びる中、name は休める場を見つけた |
| explore | `x.exp_id`8 and `x.floor`3 | 鈴音が重なるたびに、name は分岐の向きを見直した |
| explore | `x.exp_id`8 and `x.floor`3 | 苔むした祭壇の前で、name は合図を静かに交わしている |
| explore | `x.exp_id`8 and `x.floor`3 | 灯明台座の並びを見て、name は中心路を選び直した |
| explore | `x.exp_id`8 and `x.floor`3 | 小さな神々の祠は静けさが深く、礼を重んじる進行が合う |
| explore | `x.exp_id`8 and `x.floor`3 | 石祠の配置が道筋の目印となり、迷いを減らせる |
| explore | `x.exp_id`8 and `x.floor`3 | 鈴の音は分岐判断の手がかりになりやすい |
| explore | `x.exp_id`8 and `x.floor`3 | 苔むした祭壇周辺は段差があり、足元確認が必要だ |
| explore | `x.exp_id`8 and `x.floor`3 | 灯明台座は中心路の線を示し、進路整理を助ける |
| explore | `x.exp_id`8 and `x.floor`3 | 参道は狭い場所が多く、一列移動が有効になる |
| explore | `x.exp_id`8 and `x.floor`3 | 合図を短く保つことで場の静けさを守りやすい |
| explore | `x.exp_id`8 and `x.floor`3 | 祠ごとの紋違いが現在地確認に役立つ |
| explore | `x.exp_id`8 and `x.floor`3 | 急がない歩みが安全と雰囲気の両方を保ってくれる |
| explore | `x.exp_id`8 and `x.floor`3 | この層では祈りの作法を守ることが道を開く鍵になる |
| explore | `x.exp_id`8 and `x.floor`4 | name はゲヘナの荒野で熱い地を踏み、ゆらぐ空気の中を進んでいる |
| explore | `x.exp_id`8 and `x.floor`4 | name は赤黒い岩原を越え、熱だまりの薄い帯を選んだ |
| explore | `x.exp_id`8 and `x.floor`4 | name は乾いた裂け目を避け、平らな灰道をたどっている |
| explore | `x.exp_id`8 and `x.floor`4 | name は遠くの炎柱を見て、危ない風下を外して進んだ |
| explore | `x.exp_id`8 and `x.floor`4 | name は焦げた地表に印を残し、戻り道を確かめている |
| explore | `x.exp_id`8 and `x.floor`4 | ゆらぐ空気を前にして、name は顔布を締めて進んでいる |
| explore | `x.exp_id`8 and `x.floor`4 | 赤黒い岩原の縁で、name は隊を細く整えて移動した |
| explore | `x.exp_id`8 and `x.floor`4 | 乾いた裂け目が続く中、name は歩く線を高所へ寄せた |
| explore | `x.exp_id`8 and `x.floor`4 | 炎柱の向きを見ながら、name は風下回避の道を選んだ |
| explore | `x.exp_id`8 and `x.floor`4 | 焦げた地表の印をたどり、name は合流点へ戻っている |
| explore | `x.exp_id`8 and `x.floor`4 | ゲヘナの荒野は熱と風が強く、短区間移動が有効になる |
| explore | `x.exp_id`8 and `x.floor`4 | 赤黒い岩原は見通しがよいが、熱だまりに注意が要る |
| explore | `x.exp_id`8 and `x.floor`4 | 乾いた裂け目は崩れやすく、接近回避が安全だ |
| explore | `x.exp_id`8 and `x.floor`4 | 炎柱は位置目印になる反面、危険帯の中心でもある |
| explore | `x.exp_id`8 and `x.floor`4 | 風下は熱波が集まりやすく、避ける判断が重要になる |
| explore | `x.exp_id`8 and `x.floor`4 | 顔布と水分管理が探索継続を支える |
| explore | `x.exp_id`8 and `x.floor`4 | 隊を細く保つと接触事故を減らしやすい |
| explore | `x.exp_id`8 and `x.floor`4 | 地表印を残す運用で帰路を安定させられる |
| explore | `x.exp_id`8 and `x.floor`4 | 灰道の高所は比較的歩きやすく、進行軸に向いている |
| explore | `x.exp_id`8 and `x.floor`4 | この層では熱と風の読みが生存率を決める |
| explore | `x.exp_id`8 and `x.floor`5 | name は書庫区でほこりを払い、古文書の棚を調べている |
| explore | `x.exp_id`8 and `x.floor`5 | name は崩れた本架をまたぎ、読める巻物を探して進んだ |
| explore | `x.exp_id`8 and `x.floor`5 | name は静かな閲覧廊を歩き、地図帖の印を確かめている |
| explore | `x.exp_id`8 and `x.floor`5 | name は古い書見台に灯りを置き、次の区画を読み解いた |
| explore | `x.exp_id`8 and `x.floor`5 | name は封じられた書庫扉を避け、開いた回廊へ入っていく |
| explore | `x.exp_id`8 and `x.floor`5 | ほこり舞う棚列の中で、name は通れる帯を選んでいる |
| explore | `x.exp_id`8 and `x.floor`5 | 崩れた本架の前で、name は隊の順を決めて通した |
| explore | `x.exp_id`8 and `x.floor`5 | 閲覧廊の分岐に立ち、name は地図帖の線を引き直した |
| explore | `x.exp_id`8 and `x.floor`5 | 書見台の灯りを囲み、name は進路候補を仲間へ示した |
| explore | `x.exp_id`8 and `x.floor`5 | 封書庫の印を見つけ、name は迂回路へ静かに切り替えた |
| explore | `x.exp_id`8 and `x.floor`5 | 書庫区は棚列が密で、通路管理が探索の要になる |
| explore | `x.exp_id`8 and `x.floor`5 | 崩れた本架は障害が多く、順番通過が安全だ |
| explore | `x.exp_id`8 and `x.floor`5 | 閲覧廊は静かで、足音管理をしやすい場になっている |
| explore | `x.exp_id`8 and `x.floor`5 | 書見台の灯りは目印となり、合流点に使いやすい |
| explore | `x.exp_id`8 and `x.floor`5 | 封じられた扉は危険帯の印となり、回避判断を助ける |
| explore | `x.exp_id`8 and `x.floor`5 | 古文書の地図帖は区画把握に役立つ情報源だ |
| explore | `x.exp_id`8 and `x.floor`5 | ほこりが濃い区画では視界確認を短く重ねたい |
| explore | `x.exp_id`8 and `x.floor`5 | 棚影をつなぐ進行で発見されにくくなる |
| explore | `x.exp_id`8 and `x.floor`5 | 分岐の多い書庫では線の共有が欠かせない |
| explore | `x.exp_id`8 and `x.floor`5 | この層では読む力と慎重な歩みが両輪になる |
| explore | `x.exp_id`8 and `x.floor`6 | name は予見の聖域で静かな光を受け、未来門の前へ進んでいる |
| explore | `x.exp_id`8 and `x.floor`6 | name は透き通る壇を歩き、星紋の道をたどっている |
| explore | `x.exp_id`8 and `x.floor`6 | name は白い祈り輪に手をかざし、門路の順を確かめた |
| explore | `x.exp_id`8 and `x.floor`6 | name は澄んだ鐘音に耳を澄まし、光の階を上っている |
| explore | `x.exp_id`8 and `x.floor`6 | name は古い予見札を読み、選ぶべき道を仲間へ伝えた |
| explore | `x.exp_id`8 and `x.floor`6 | 静かな光が満ちる中で、name は星紋の中心線を進んでいる |
| explore | `x.exp_id`8 and `x.floor`6 | 透き通る壇の縁で、name は足場の強い帯を選んだ |
| explore | `x.exp_id`8 and `x.floor`6 | 祈り輪が揺れるたびに、name は門路の順を見直している |
| explore | `x.exp_id`8 and `x.floor`6 | 澄んだ鐘音が重なる中、name は合図を短く交わした |
| explore | `x.exp_id`8 and `x.floor`6 | 予見札の印を見つめ、name は未来門への線を整えた |
| explore | `x.exp_id`8 and `x.floor`6 | 予見の聖域は静かな光が満ち、星紋が道を示している |
| explore | `x.exp_id`8 and `x.floor`6 | 透き通る壇は見やすいが段差もあり、歩幅調整が要る |
| explore | `x.exp_id`8 and `x.floor`6 | 祈り輪は門路選びの手がかりとなり、迷いを減らせる |
| explore | `x.exp_id`8 and `x.floor`6 | 澄んだ鐘音は合図の基準になり、隊の動きを合わせやすい |
| explore | `x.exp_id`8 and `x.floor`6 | 予見札には進行順の印が残り、判断を支えてくれる |
| explore | `x.exp_id`8 and `x.floor`6 | 未来門へ近づくほど緊張が高まり、慎重さが求められる |
| explore | `x.exp_id`8 and `x.floor`6 | 開けた聖域は配置調整をしやすく、再整列に向いている |
| explore | `x.exp_id`8 and `x.floor`6 | 星紋線を外れない歩みが安全通過を助ける |
| explore | `x.exp_id`8 and `x.floor`6 | 礼を守る静かな進行が、この場の流れに合っている |
| explore | `x.exp_id`8 and `x.floor`6 | この層では光と音の読みが最後の鍵となる |
| sound_sleep | with mainClass.`Guardian` | name は鎧を外したまま深く眠り、戦場の緊張を静かに解いている |
| sound_sleep | with mainClass.`Guardian` | name は盾を抱くようにして熟睡し、守る意志を休息に変えている |
| sound_sleep | with mainClass.`Guardian` | name は規則正しい寝息で体幹の疲労をじっくり回復している |
| sound_sleep | with mainClass.`Guardian` | name は古傷の痛みも忘れるほど深く眠りに沈んでいる |
| sound_sleep | with mainClass.`Guardian` | name は焚き火の番を仲間に託し、朝までぐっすり眠っている |
| sound_sleep | with mainClass.`Guardian` | name は重い装備の負担を手放し、安心した表情で眠っている |
| sound_sleep | with mainClass.`Guardian` | name は次の防衛戦に備え、芯まで休まる熟睡を取っている |
| sound_sleep | with mainClass.`Guardian` | name は横たわる姿勢のまま微動だにせず、深い睡眠を続けている |
| sound_sleep | with mainClass.`Guardian` | name は戦塵の匂いを洗い流すように静かな眠りへ身を預けた |
| sound_sleep | with mainClass.`Guardian` | name は夜明けまで眠り続け、頼れる体力を満たしている |
| nap_sleep | with mainClass.`Guardian` | name は盾を枕代わりにして短く仮眠を取り、すぐ立ち上がった |
| nap_sleep | with mainClass.`Guardian` | name は鎧の留め具を緩めた隙に、数分だけ目を閉じている |
| nap_sleep | with mainClass.`Guardian` | name は壁際に腰を下ろし、短時間で筋肉の張りを抜いている |
| nap_sleep | with mainClass.`Guardian` | name は見張り交代までの間に、手早く疲労を和らげている |
| nap_sleep | with mainClass.`Guardian` | name は荒い呼吸を整えながら、浅い眠りで気力を戻している |
| nap_sleep | with mainClass.`Guardian` | name は膝に手を置いたままうとうとし、行動準備を崩さない |
| nap_sleep | with mainClass.`Guardian` | name は短い睡眠で集中を立て直し、守りの感覚を取り戻した |
| nap_sleep | with mainClass.`Guardian` | name は剣帯を外さず仮眠を取り、即応の姿勢を保っている |
| nap_sleep | with mainClass.`Guardian` | name は火の温もりを借りて小休止し、足取りを軽くしている |
| nap_sleep | with mainClass.`Guardian` | name は合図ひとつで動けるよう、浅い眠りで体力を継ぎ足した |
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
| sound_sleep | with mainClass.`Alchemist` | name は調合の緊張を解き、深い眠りで集中力を回復している |
| sound_sleep | with mainClass.`Alchemist` | name は試薬箱を枕元に置き、安心した寝息で熟睡している |
| sound_sleep | with mainClass.`Alchemist` | name は長い調製作業の疲れを、静かな睡眠で癒している |
| sound_sleep | with mainClass.`Alchemist` | name は穏やかな表情のまま、朝まで目覚めず眠っている |
| sound_sleep | with mainClass.`Alchemist` | name は薬草の香りに包まれ、芯まで休まる眠りに沈んだ |
| sound_sleep | with mainClass.`Alchemist` | name は規則正しい寝息で、乱れた思考を丁寧に整えている |
| sound_sleep | with mainClass.`Alchemist` | name は反応式の夢を手放し、十分な休息を取っている |
| sound_sleep | with mainClass.`Alchemist` | name は夜明けまで静かに眠り、判断力を取り戻している |
| sound_sleep | with mainClass.`Alchemist` | name は疲労を沈殿させるように、深い睡眠で英気を養った |
| sound_sleep | with mainClass.`Alchemist` | name は落ち着いた寝顔で、次の調合へ備えて回復している |
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
| nap_sleep | with mainClass.`Alchemist` | name は薬瓶を並べ終えると、短い仮眠で頭を休めた |
| nap_sleep | with mainClass.`Alchemist` | name は反応待ちの合間に目を閉じ、数分だけ眠っている |
| nap_sleep | with mainClass.`Alchemist` | name は浅い眠りで集中を戻し、手元の震えを整えた |
| nap_sleep | with mainClass.`Alchemist` | name は道具箱にもたれて小休止し、静かに目を開けた |
| nap_sleep | with mainClass.`Alchemist` | name は短時間の睡眠で思考を整理し、配合手順を思い出している |
| nap_sleep | with mainClass.`Alchemist` | name は仮眠の前に火を落とし、安全を確かめてから休んだ |
| nap_sleep | with mainClass.`Alchemist` | name はわずかな眠りで疲れを抜き、瓶の位置を再確認した |
| nap_sleep | with mainClass.`Alchemist` | name は眠気を切り替えるように深呼吸し、作業姿勢へ戻った |
| nap_sleep | with mainClass.`Alchemist` | name は短い夢から覚め、静かな笑みで仲間にうなずいた |
| nap_sleep | with mainClass.`Alchemist` | name は最小限の休息で気力を補い、次の調合へ向かっている |
| sound_sleep | with mainClass.`Striker` | name は隠し持った短剣をそばに、警戒なく深く眠っている |
| sound_sleep | with mainClass.`Striker` | name は夜の喧騒を背に、したたかに熟睡している |
| sound_sleep | with mainClass.`Striker` | name は駆け引きの緊張を忘れ、静かな寝息で休んでいる |
| sound_sleep | with mainClass.`Striker` | name は鍵束を枕元に置き、安心して朝まで眠っている |
| sound_sleep | with mainClass.`Striker` | name は長い潜伏の疲れを、深い睡眠で回復している |
| sound_sleep | with mainClass.`Striker` | name はどんな雑音にも動じず、ぐっすり眠り込んでいる |
| sound_sleep | with mainClass.`Striker` | name は軽やかな寝返りだけで、熟睡を保っている |
| sound_sleep | with mainClass.`Striker` | name は夢の中でも笑みを浮かべ、余裕ある眠りを見せている |
| sound_sleep | with mainClass.`Striker` | name は朝の仕事に備え、体力を満たす休息を取っている |
| sound_sleep | with mainClass.`Striker` | name は疲労の気配を消すように、静かで深い眠りへ沈んだ |
| nap_sleep | with mainClass.`Striker` | name は人目につかぬ席で短く仮眠し、すぐ姿勢を戻した |
| nap_sleep | with mainClass.`Striker` | name は取引の合間に目を閉じ、数分で気力を整えている |
| nap_sleep | with mainClass.`Striker` | name は荷袋を抱えたままうとうとし、警戒を切らしていない |
| nap_sleep | with mainClass.`Striker` | name は浅い眠りで頭を冴えさせ、口上の準備を整えた |
| nap_sleep | with mainClass.`Striker` | name は短時間の睡眠で疲労を隠し、いつもの笑顔に戻った |
| nap_sleep | with mainClass.`Striker` | name は壁際で小休止し、足音ひとつで目を開けた |
| nap_sleep | with mainClass.`Striker` | name は手早い仮眠の後、鍵開けの指先を確かめている |
| nap_sleep | with mainClass.`Striker` | name は一瞬の眠りで切り替え、交渉の席へ戻っていった |
| nap_sleep | with mainClass.`Striker` | name は短く夢を見て、次の機会を逃さぬ目つきに戻した |
| nap_sleep | with mainClass.`Striker` | name は見張りに合図を送り、最小限の休息を済ませている |
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
| slump | none | {name}は不貞寝している |
| slump | none | {name}はやる気を失っている |
| slump | none | {name}は何もせず時間を潰している |
| slump | none | {name}は床に転がって動こうとしない |
| slump | none | {name}はぼんやりと過ごしている |
| slump | none | {name}はため息ばかりついている |
| slump | none | {name}は壁にもたれて沈んでいる |
| slump | none | {name}は気分が乗らず動かない |
| slump | none | {name}は不満げに黙り込んでいる |
| slump | none | {name}はすべてが面倒になっている |
| slump | none | {name}は不貞寝している |
| slump | none | {name}は毛布にくるまり、現実から目を背けている |
| slump | none | {name}は床に転がり、しばらく動く気がない |
| slump | none | {name}は敗北を引きずり、無言でうずくまっている |
| slump | none | {name}は虚ろな目で天井を見つめている |
| slump | none | {name}はやる気を失い、だらけきっている |
| slump | none | {name}は仲間の声にも反応せず、ふて寝している |
| slump | none | {name}は装備を放り出し、その場に座り込んでいる |
| slump | none | {name}は何もする気が起きず、ただ時間を浪費している |
| slump | none | {name}は敗北の記憶に沈み込み、動けずにいる |
| slump | with race.`Lupinian` | {name}は低く唸りながら、不貞寝している |
| slump | with race.`Lupinian` | {name}は遠吠えを一つ残し、そのまま倒れ込んだ |
| slump | with race.`Lupinian` | {name}は仲間から距離を取り、ひとりでうずくまっている |
| slump | with race.`Lupinian` | {name}は牙を噛みしめたまま、静かに横たわっている |
| slump | with race.`Lupinian` | {name}は敗北を恥じるように、顔を伏せている |
| slump | with race.`Lupinian` | {name}は何度も尾を打ちつけ、不満を抑えきれない |
| slump | with race.`Lupinian` | {name}は群れに顔向けできず、視線を逸らしている |
| slump | with race.`Lupinian` | {name}は物音に敏感に反応するが、動こうとしない |
| slump | with race.`Lupinian` | {name}は荒い息をつきながら、その場に伏せている |
| slump | with race.`Lupinian` | {name}は再起の気配もなく、ただ静かに力を失っている |
| slump | with race.`Vulpinian` | {name}は何事もなかったかのように横になっているが、尻尾だけが力なく揺れている |
| slump | with race.`Vulpinian` | {name}は軽口も叩かず、静かに目を閉じている |
| slump | with race.`Vulpinian` | {name}は敗北を笑い飛ばそうとしたが、すぐに口をつぐんだ |
| slump | with race.`Vulpinian` | {name}は仲間の視線を避け、物陰に身を潜めている |
| slump | with race.`Vulpinian` | {name}は何か策を巡らせる様子もなく、ただ寝転がっている |
| slump | with race.`Vulpinian` | {name}は尻尾を抱え込み、静かに丸くなっている |
| slump | with race.`Vulpinian` | {name}は普段の余裕を失い、ぼんやりと空を見ている |
| slump | with race.`Vulpinian` | {name}は言い訳を考えているが、言葉にならない |
| slump | with race.`Vulpinian` | {name}は耳を伏せ、気配を消すようにしている |
| slump | with race.`Vulpinian` | {name}は再起の策も浮かばず、ただ時間をやり過ごしている |
| slump | with race.`Felidian` | {name}は毛づくろいを続けているが、どこか雑になっている |
| slump | with race.`Felidian` | {name}は何事もなかったかのように丸くなっている |
| slump | with race.`Felidian` | {name}は静かに目を細め、誰とも目を合わせない |
| slump | with race.`Felidian` | {name}は気まぐれに立ち上がるが、すぐに座り込んだ |
| slump | with race.`Felidian` | {name}は不機嫌そうに尻尾を揺らしている |
| slump | with race.`Felidian` | {name}は高い場所にも登らず、床に伏せたままだ |
| slump | with race.`Felidian` | {name}は呼びかけに耳だけ動かし、応じようとしない |
| slump | with race.`Felidian` | {name}は爪を研ぐ気力もなく、ただじっとしている |
| slump | with race.`Felidian` | {name}は誇りを傷つけられたまま、黙り込んでいる |
| slump | with race.`Felidian` | {name}は気配を消すように静かに丸まり、動かない |
| slump | with race.`Caninian` | {name}は耳と尾を垂らし、しょんぼりと伏せている |
| slump | with race.`Caninian` | {name}は仲間のそばに寄るが、すぐに力なく座り込んだ |
| slump | with race.`Caninian` | {name}は小さく鳴き声を漏らし、そのまま動かない |
| slump | with race.`Caninian` | {name}は何かを待つようにこちらを見るが、やがて目を伏せた |
| slump | with race.`Caninian` | {name}は元気を出そうと尾を振るが、すぐに止まってしまう |
| slump | with race.`Caninian` | {name}は仲間の顔色をうかがいながら、静かに伏せている |
| slump | with race.`Caninian` | {name}は地面に顎を乗せ、ため息をついている |
| slump | with race.`Caninian` | {name}は励ましを待つように耳を動かすが、反応は鈍い |
| slump | with race.`Caninian` | {name}は少し立ち上がるが、すぐに座り直してしまう |
| slump | with race.`Caninian` | {name}は仲間に寄り添いながらも、元気が出ない様子だ |
| slump | with race.`Ursan` | {name}は大きな体を横たえ、重々しく動かない |
| slump | with race.`Ursan` | {name}は低く唸り、そのまま黙り込んでいる |
| slump | with race.`Ursan` | {name}は座り込んだまま、じっと地面を見つめている |
| slump | with race.`Ursan` | {name}は深く息をつき、再び動く気配を見せない |
| slump | with race.`Ursan` | {name}は腕を組んだまま、静かに考え込んでいる |
| slump | with race.`Ursan` | {name}は苛立ちを抑えるように爪を地面に立てている |
| slump | with race.`Ursan` | {name}は仲間の声にも反応せず、ただ沈黙している |
| slump | with race.`Ursan` | {name}は一歩も動かず、その場に根を張ったようだ |
| slump | with race.`Ursan` | {name}は力を失ったように肩を落としている |
| slump | with race.`Ursan` | {name}は再び立ち上がる気配もなく、じっとしている |
| slump | with race.`Procyonian` | {name}は軽口を叩くが、どこか空虚に響いている |
| slump | with race.`Procyonian` | {name}は物陰に隠れ、そのまま出てこない |
| slump | with race.`Procyonian` | {name}は寝転びながら、現実から目を逸らしている |
| slump | with race.`Procyonian` | {name}は何か企んでいるふりをするが、すぐに諦めた |
| slump | with race.`Procyonian` | {name}は尻尾を抱えて丸まり、じっとしている |
| slump | with race.`Procyonian` | {name}は周囲を気にしつつも、動こうとしない |
| slump | with race.`Procyonian` | {name}は冗談を言いかけて、言葉を飲み込んだ |
| slump | with race.`Procyonian` | {name}は幻でも見ているかのようにぼんやりしている |
| slump | with race.`Procyonian` | {name}は力なく笑い、そのまま寝転がった |
| slump | with race.`Leporian` | {name}は耳を伏せ、小さく丸まって震えている |
| slump | with race.`Leporian` | {name}は物音にびくつきながら、その場から動けない |
| slump | with race.`Leporian` | {name}は周囲を警戒し続け、休むこともできない |
| slump | with race.`Leporian` | {name}は草陰に隠れたまま、出てこようとしない |
| slump | with race.`Leporian` | {name}は何度も立ち上がろうとするが、すぐに座り込む |
| slump | with race.`Leporian` | {name}は目を潤ませ、じっと耐えている |
| slump | with race.`Leporian` | {name}は逃げ場を探すように視線を彷徨わせている |
| slump | with race.`Leporian` | {name}は耳をぴくりとも動かさず、固まっている |
| slump | with race.`Leporian` | {name}は息を潜め、気配を消そうとしている |
| slump | with race.`Leporian` | {name}は疲れ果て、その場にへたり込んでいる |
| slump | with race.`Cervin` | {name}は耳を立てたまま、静かに動きを止めている |
| slump | with race.`Cervin` | {name}は視線を落とし、気配を消すように佇んでいる |
| slump | with race.`Cervin` | {name}は一歩踏み出そうとして、ためらい足を止めた |
| slump | with race.`Cervin` | {name}は物音に敏感に反応するが、逃げる気力もない |
| slump | with race.`Cervin` | {name}は誇りを保つように立っているが、足元は揺らいでいる |
| slump | with race.`Cervin` | {name}は仲間の後ろに静かに下がり、距離を取っている |
| slump | with race.`Cervin` | {name}は何かを警戒するように周囲を見渡している |
| slump | with race.`Cervin` | {name}はその場に立ち尽くし、しばらく動こうとしない |
| slump | with race.`Cervin` | {name}は肩を落とし、静かに呼吸を整えている |
| slump | with race.`Cervin` | {name}は再び歩き出す気配もなく、ただ佇んでいる |
| slump | with race.`Murid` | {name}は物陰に身を潜め、小さく震えている |
| slump | with race.`Murid` | {name}は周囲を気にしながら、動けずにいる |
| slump | with race.`Murid` | {name}は小さく丸まり、息を潜めている |
| slump | with race.`Murid` | {name}は音に敏感に反応するが、逃げ出す気力もない |
| slump | with race.`Murid` | {name}は何度も様子をうかがうが、踏み出せない |
| slump | with race.`Murid` | {name}は隠れ場所から顔を出すが、すぐに引っ込めた |
| slump | with race.`Murid` | {name}は仲間の後ろに隠れ、静かに身を縮めている |
| slump | with race.`Murid` | {name}は小さく鳴き声を漏らし、そのまま動かない |
| slump | with race.`Murid` | {name}はその場にへたり込み、気配を消そうとしている |
| slump | with race.`Murid` | {name}は疲れ切り、じっと動かずにいる |
| slump | with race.`Kemoria` | {name}は静かに目を閉じ、思考の底に沈んでいる |
| slump | with race.`Kemoria` | {name}は敗北を反芻するように、じっとしている |
| slump | with race.`Kemoria` | {name}は何も語らず、その場に座り込んでいる |
| slump | with race.`Kemoria` | {name}は視線を落とし、内面に意識を向けている |
| slump | with race.`Kemoria` | {name}は立ち上がる理由を見失い、動かない |
| slump | with race.`Kemoria` | {name}はただ呼吸を繰り返し、時間をやり過ごしている |
| slump | with race.`Kemoria` | {name}は感情を抑え込み、静寂の中にいる |
| slump | with race.`Kemoria` | {name}は何かを考えているが、答えには至らない |
| slump | with race.`Kemoria` | {name}は再起の兆しもなく、ただ沈黙している |
| slump | with race.`Kemoria` | {name}は自分の中で何かが途切れたまま、動けずにいる |
| slump | with race.`Orcinian` | {name}は静かに横たわり、深い海のように沈黙している |
| slump | with race.`Orcinian` | {name}は遠くを見つめ、意識がどこかへ漂っている |
| slump | with race.`Orcinian` | {name}は仲間の気配を感じながらも、応じようとしない |
| slump | with race.`Orcinian` | {name}は低く息を吐き、そのまま動かない |
| slump | with race.`Orcinian` | {name}は何かを探すように視線を巡らせるが、すぐに止まった |
| slump | with race.`Orcinian` | {name}は声にならない呼びかけを胸の内に沈めている |
| slump | with race.`Orcinian` | {name}は記憶の底に沈み込むように、目を閉じている |
| slump | with race.`Orcinian` | {name}はわずかに身じろぐが、再び静止した |
| slump | with race.`Orcinian` | {name}は外界を遮断するように、意識を閉ざしている |
| slump | with race.`Orcinian` | {name}は再び浮かび上がる気配もなく、ただ沈んでいる |
| slump | with race.`Avian` | {name}は翼をたたみ、その場に座り込んでいる |
| slump | with race.`Avian` | {name}は飛び立とうとして、すぐに力なくやめた |
| slump | with race.`Avian` | {name}は羽を乱したまま、ぼんやりと空を見ている |
| slump | with race.`Avian` | {name}は高みを見上げるが、飛ぶ気力がない |
| slump | with race.`Avian` | {name}は羽ばたくこともなく、静かに佇んでいる |
| slump | with race.`Avian` | {name}は小さく羽を震わせ、そのまま動かない |
| slump | with race.`Avian` | {name}は視線を遠くへ投げたまま、戻ってこない |
| slump | with race.`Avian` | {name}は地に伏し、翼を広げることすらしない |
| slump | with race.`Avian` | {name}は風を感じても、反応を示さない |
| slump | with race.`Avian` | {name}は再び空へ向かう気配もなく、ただ静止している |
