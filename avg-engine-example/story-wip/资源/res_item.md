# H. 物件弹出 Items — 《缄默回廊》

> Step 4 · H 类子表。物件图 = 全屏放大图（证物/信件/照片），`item` 指令触发，点击关闭，404 显示占位不崩。
> **产线（G2 §1 铁律）**：AI **只出质感底图**（材质/光影/折痕），**所有文字/印章/签字一律 PIL 叠**（文生图永远画不对中文小字）。
> 落位 `public/images/items/jianmo/item_{id}.png`；manifest `items[item_{id}] = { src, caption? }`。
> ✅ **构图已确认：A 斜拍质感**（G2 §4.1）—— 沿用《雾港回声》方案，本作 6 张物证统一斜拍。已锁定，出底图前不再变更（不可逆）。

| item_id | 类型 | caption | 用途 | 文案真源(逐字·进 `item_texts.py`) | 纸张/材质 | 落位路径 | manifest 键 | 状态 |
|---|---|---|---|---|---|---|---|---|
| `item_medical_cover` | 病历封面 | 言霜病历·封面 | Ch3-S02 线索展示 | 手写："言霜，女，入院时十九岁"（手写体 kai） | 旧病历卡纸·泛黄 | `.../items/jianmo/item_medical_cover.png` | `items.item_medical_cover` | 待制作 |
| `item_medical_sign` | 签字页 | 外诊离院签字记录 | Ch3-S03, Ch4-S03 核心矛盾 | "21:40 自行离院；22:10 顾承签字外诊；次日外衣推定走海；尸检：无；海搜：无" + 顾承手写批注"外诊离院"（kai/fang） | 值班记录纸·表格线 | `.../item_medical_sign.png` | `items.item_medical_sign` | 待制作 |
| `item_silver_bracelet` | 银镯(刻字) | 礁石缝银镯·内圈"霜" | Ch6-S05 线索② | 内圈刻字"霜"（金属刻字，PIL 描边） | 银质·湿锈质感底图 | `.../item_silver_bracelet.png` | `items.item_silver_bracelet` | 待制作 |
| `item_old_photo` | 旧照 | 言溪与言霜并排旧照 | Ch8-S01 线索④ | 背面手写标注（若需）："言溪 / 言霜"（kai）；照片内嵌两张人脸（AI 出旧照质感底图 + PIL 叠轻度做旧，人脸走底图不叠字） | 泛黄老照片·边角卷曲 | `.../item_old_photo.png` | `items.item_old_photo` | 待制作 |
| `item_evidence_bag` | 物证袋 | 苏岚交来的牛皮纸物证袋 | Ch9-S05 线索⑤(真/隐藏钥匙) | 标签手写（kai）："物证·缄默回廊·封存"；封口火漆（PIL 红蜡印，无字或简印） | 牛皮纸袋·火漆 | `.../item_evidence_bag.png` | `items.item_evidence_bag` | 待制作 |
| `item_parents_badge` | 记者证+航拍 | 褪色记者证·旧海岛航拍 | Ch11-S01 隐藏层(父母) | 记者证字段（fang）：单位/姓名/编号（占位或父母名）；背面钢笔字（kai）：一行旧海岛地名/日期 | 公文皮套·褪色 + 航拍照片内嵌 | `.../item_parents_badge.png` | `items.item_parents_badge` | 待制作 |

> **全部 6 张走 P3**（文字可控、省、可反复弹），构图 A 斜拍已锁定，待出底图。
> **文案解耦**：改台词只改 `item_texts.py` 重排，不用重出底图（底图单张 2–5 分钟且撞云端配额）。
> **字体映射（G2 §3）**：kai=手写信/批注，fang=公文/表格，hei=印章/标题，song=印刷正文。
> ⚠️ 底图提示词**绝不可提**"印章/红章/手写/文字"（提了必出乱码红章）——见 G2 §1 铁律。
> Step 5 出底图后必须开图看体积（<20KB=单色空图，history 谎报 success）。
