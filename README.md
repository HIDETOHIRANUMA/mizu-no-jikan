# この水は、いつの雨だろう。 — When Did This Water Fall as Rain?

https://hidetohiranuma.github.io/mizu-no-jikan/

山梨の 湧き水を、グラスに 一杯。その 水が 雨や 雪として 山に 降った 年へ、しずくを ひとつずつ 帰していく、約3分の ウェブ作品です（音が 出ます）。

湧き水は、山に 降った 雨や 雪が、何年も、何十年も かけて 地中を くぐり、出てきた ものです。ひとつの 湧き水には、ひとつの 年の 雨だけが 入っている わけでは なく、いくつもの 年に 降った 水が まざっています。この 作品は、きょう 汲んだ グラス一杯を 1,200の しずくに 分け、それぞれが 降った 年の 上に 雨の すだれのように 積み上げます。あなたが 生まれた 年の 雨が どれだけ 入っているかを たしかめ、最後に、きょう 降る 雨が いつ、だれかの 一杯に なるのかを 予報します。

## 見かた

- ページを ひらいて「はじめる」（英語は Start in English）を おします。約3分で おわります。
- 途中で、グラスに 触れる・年を えらぶ・空に 触れる 場面が あります（触れなくても 進みます）。
- 最後に、きょうの 雨の「湧き水予報」を 画像（PNG）で 保存できます。
- 動作環境：Windows 10/11 または macOS 15 以降の Edge・Chrome・Safari。スマートフォンでも 見られます。
- 展示用：URLの 末尾に `?auto` を つけると、触れなくても 短い 間隔で 進みます。

## しくみ

- 模型：地中に いる 時間を「平均20年、短い ものから 長い ものまで 広がる」分布（ガンマ分布・形状3）で 表し、グラスの 1,200しずくと きょうの 雨の 600しずくに、その 分布から 年代を わりふります（層別抽出。日付を 種に するので、日が 変わると 少し ちがう 一杯に なります）。実際に 測った 値では なく、考える ための 見取り図です。
- 映像：Canvas 2D。しずくの 色は 年代で 変わります（新しい 水ほど 白く、古い 水ほど 紫に）。
- 音：Web Audio で その場で 合成しています（しずくの 音、低い 持続音、雨の 音）。録音や 既存の 楽曲は 使っていません。

## 出典

- 山梨県「ミネラルウォーター」（富士の国 やまなしの魅力）：ミネラルウォーターの 生産量は 日本一、2022年は 全国の 約4割（日本ミネラルウォーター協会の 統計による）。
- 南アルプスの ふもとの 湧き水には、花崗岩の 地層を 約20年 かけて 通るという 説明が あります。実際の 年代は 湧き水ごとに ちがいます。

## 個人情報

計算は すべて ブラウザの 中で 行い、どこにも 送信しません。外部の 解析タグや Cookie も ありません。

## 制作

- 企画・プログラム・文章の 作成に 生成AI（Anthropic社の Claude）を 使いました。
- フォント：Noto Serif JP（SIL Open Font License 1.1。`fonts/OFL.txt`）。作品で 使う 文字だけを 切り出しています。

## ローカルで 動かす

```
python3 -m http.server 8000
```

で この フォルダを 配信し、http://localhost:8000/ を ひらきます。

---

**English.** A three-minute web piece with sound. Spring water is rain and snow that fell on the mountains and travelled underground for years, even decades, and a single spring mixes water from many years. This page splits one glass of Yamanashi spring water, drawn today, into 1,200 drops and sends each back to the year it fell, where they hang like a curtain of rain under a timeline. You can check how much rain from the year you were born is in the glass, and finally the piece forecasts when today's rain will become someone's glass of water. Time underground follows an illustrative model (gamma distribution, shape 3, mean 20 years), not measurements. Yamanashi produces about 40% of Japan's bottled mineral water (2022, prefecture figures). Everything runs locally; nothing is sent anywhere. Canvas 2D and Web Audio. Generative AI (Claude by Anthropic) was used for planning, programming and writing. Font: Noto Serif JP (SIL OFL 1.1).
