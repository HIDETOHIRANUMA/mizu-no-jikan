// All words of the piece, in Japanese and English.
const nf = (n) => n.toLocaleString('ja-JP');

function amountJa(ml) {
  if (ml < 0.05) return 'ひとしずくにも満たない量';
  if (ml < 2.5) return `約${Math.max(1, Math.round(ml / 0.05))}滴（約${ml.toFixed(1)}mL）`;
  const tsp = Math.max(0.5, Math.round(ml / 5 * 2) / 2);
  return `小さじ約${tsp === 0.5 ? '半分' : tsp + '杯'}（約${Math.round(ml)}mL）`;
}
function amountEn(ml) {
  if (ml < 0.05) return 'less than a single drop';
  if (ml < 2.5) return `about ${Math.max(1, Math.round(ml / 0.05))} drops (${ml.toFixed(1)} mL)`;
  const tsp = Math.max(0.5, Math.round(ml / 5 * 2) / 2);
  return `about ${tsp === 0.5 ? 'half a teaspoon' : tsp + ' teaspoon' + (tsp > 1 ? 's' : '')} (${Math.round(ml)} mL)`;
}
const pct = (x) => (x * 100 < 9.95 ? (x * 100).toFixed(1) : String(Math.round(x * 100)));

export const T = {
  ja: {
    title: 'この水は、いつの雨だろう。',
    lead: '山梨の湧き水を、グラスに一杯。その水が、雨や雪として山に降った年へ、しずくをひとつずつ帰していく、約3分のウェブ作品です。',
    note: '音が出ます。途中で画面に触れる場面がありますが、触れなくても進みます。',
    start: 'はじめる',
    about: 'この作品について',
    close: 'とじる',
    save: '予報を画像でのこす',
    again: 'もういちど',
    next: 'つぎへ',
    rainBtn: '雨を降らせる',
    pickHint: '線の上を左右になぞるか、◀ ▶ で年をえらべます',
    yearUnit: '年',
    today: (d) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`,
    l1: (d) => `${T.ja.today(d)}。山梨の湧き水を、グラスに一杯。`,
    l2: '湧き水は、山に降った雨や雪が、何年も、何十年もかけて地中をくぐり、出てきたものです。',
    l3: 'では、この一杯は、いつの雨なのでしょう。',
    tapGlass: 'グラスに触れると、しずくが、降った年へ帰ります。',
    l4: 'きのう、去年の雨は、まだほとんど入っていません。',
    l5: (y) => `いちばん多いのは、${y}年ごろの雨と雪。`,
    l6: (d) => `いちばん古いひとしずくは、${d.year}年の${d.snow ? '雪' : '雨'}。`,
    l7: (n) => `この一杯には、${n}年ぶんの雨と雪が、まざっていました。`,
    l8: 'あなたが生まれた年の雨も、入っているでしょうか。',
    pick: (i) => {
      if (i.count === 0 && i.emerged > 0.5) return `${i.year}年の雨は、きょうの一杯には見つかりませんでした。`;
      let s = `${i.year}年の雨と雪は、この一杯の${pct(i.share)}%（${nf(1200)}しずくのうち${i.count}しずく）。グラス一杯なら、${amountJa(i.ml)}です。`;
      if (i.emerged < 0.01) s += `\nその年に山へ降った水は、まだほとんど湧き出していません。いまも山の中を旅しています。`;
      else if (i.emerged < 0.5) s += `\nその年に山へ降った水のうち、湧き出したのはまだ約${Math.round(i.emerged * 100)}%。のこりは、いまも山の中を旅しています。`;
      else s += `\nその年に山へ降った水は、すでに約${Math.round(i.emerged * 100)}%が湧き出しました。`;
      return s;
    },
    l9: 'では、きょう降る雨は、いつ湧くのでしょう。',
    tapSky: '空に触れて、雨を降らせてください。',
    l10: (y) => `いちばん多く湧き出すのは、${y}年ごろ。`,
    l11: (y) => `半分が湧き出すのは、${y}年ごろ。`,
    l12: (y) => `最後のひとしずくは、${y}年ごろ。`,
    l13: (d, y) => `${T.ja.today(d)}の雨は、${y}年ごろ、だれかの一杯になります。`,
    e1: '答えは、ひとつの年ではありませんでした。',
    e2: '一杯の水には、いくつもの年が、まざっています。',
    rainCaption: 'の雨',
    nowLabel: 'いま',
    labels: { mountain: '南アルプス', granite: '花崗岩の地層', spring: '湧き水', future: '湧き出す年', past: '雨や雪が降った年' },
    ticketHead: 'きょうの雨の湧き水予報',
    ticketRows: (r) => [
      ['いちばん多く湧き出す', `${r.modeYear}年ごろ`],
      ['半分が湧き出す', `${r.medianYear}年ごろ`],
      ['最後のひとしずく', `${r.lastYear}年ごろ`],
    ],
    ticketNote: '平均20年の模型による想像の予報です',
    aboutHtml: `
<h2>この水は、いつの雨だろう。</h2>
<p>山梨県は、ミネラルウォーターの生産量が日本一の県です（2022年は全国の約4割。山梨県の紹介ページ、日本ミネラルウォーター協会の統計による）。その水のもとは、山に降った雨や雪です。水は土にしみこみ、地層のすきまをくぐって、何年も、何十年もかけて湧き出します。</p>
<p>ひとつの湧き水には、ひとつの年の雨だけが入っているわけではありません。速く出てくる水も、深くまわり道をする水もあり、いくつもの年に降った水がまざっています。地下水の「年代」は、水にふくまれるトリチウムなどを手がかりに推定されます。</p>
<p>この作品は、きょう汲んだグラス一杯を1,200のしずくに分け、それぞれが降った年へ帰していきます。そして、きょう降る雨が、いつ、だれかの一杯になるのかを予報します。</p>
<h3>模型について</h3>
<ul>
<li>地中にいる時間を「平均20年、短いものから長いものまで広がる」模型（ガンマ分布・形状3）で描いています。南アルプスのふもとの湧き水には、花崗岩の地層を約20年かけて通るという説明があります。ただし実際の年代は湧き水ごとにちがい、この作品の数字は測った値ではなく、考えるための見取り図です。</li>
<li>グラスの中身は、その日の日付から計算します。日が変わると、少しちがう一杯になります。</li>
<li>計算はすべてブラウザの中で行い、どこにも送信しません。</li>
</ul>
<h3>つくり</h3>
<ul>
<li>映像：Canvas 2D。音：Web Audio でその場で合成（録音や既存の楽曲は使っていません）。</li>
<li>書体：Noto Serif JP（SIL Open Font License 1.1。作品で使う文字だけを切り出しています）。</li>
<li>企画・プログラム・文章の作成に、生成AI（Anthropic社のClaude）を使用しました。</li>
</ul>
<h3>見かた</h3>
<p>約3分。途中で、グラスに触れる・年をえらぶ・空に触れる場面があります（触れなくても進みます）。最後に、きょうの雨の「湧き水予報」を画像で保存できます。</p>`,
  },
  en: {
    title: 'When did this water fall as rain?',
    lead: 'A glass of spring water from Yamanashi. One by one, its drops go back to the years they fell on the mountains as rain or snow. A web piece of about three minutes.',
    note: 'With sound. A few scenes invite a touch, but the piece also moves on by itself.',
    start: 'Start',
    about: 'About this work',
    close: 'Close',
    save: 'Save the forecast as an image',
    again: 'Once more',
    next: 'Next',
    rainBtn: 'Let it rain',
    pickHint: 'Slide along the line, or use ◀ ▶ to choose a year',
    yearUnit: '',
    today: (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    l1: (d) => `${T.en.today(d)}. A glass of spring water from Yamanashi.`,
    l2: 'Spring water is rain and snow that fell on the mountains and travelled underground for years, even decades.',
    l3: 'So when did the water in this glass fall as rain?',
    tapGlass: 'Touch the glass, and its drops will return to the years they fell.',
    l4: 'Hardly any of yesterday’s or last year’s rain is in it yet.',
    l5: (y) => `Most of it fell around ${y}.`,
    l6: (d) => `The oldest drop fell as ${d.snow ? 'snow' : 'rain'} in ${d.year}.`,
    l7: (n) => `This one glass holds ${n} years of rain and snow.`,
    l8: 'Is there rain from the year you were born?',
    pick: (i) => {
      if (i.count === 0 && i.emerged > 0.5) return `No rain from ${i.year} was found in today’s glass.`;
      let s = `Rain and snow from ${i.year}: ${pct(i.share)}% of this glass (${i.count} of 1,200 drops), ${amountEn(i.ml)} in a full glass.`;
      if (i.emerged < 0.01) s += `\nAlmost none of the water that fell that year has come out yet. It is still travelling inside the mountain.`;
      else if (i.emerged < 0.5) s += `\nOnly about ${Math.round(i.emerged * 100)}% of the water that fell that year has come out so far. The rest is still travelling inside the mountain.`;
      else s += `\nAbout ${Math.round(i.emerged * 100)}% of the water that fell that year has already come out.`;
      return s;
    },
    l9: 'And the rain that falls today: when will it come out?',
    tapSky: 'Touch the sky to let it rain.',
    l10: (y) => `Most of it will come out around ${y}.`,
    l11: (y) => `Half of it, by about ${y}.`,
    l12: (y) => `The last drop, around ${y}.`,
    l13: (d, y) => `Today’s rain, ${T.en.today(d)}, will be someone’s glass of water around ${y}.`,
    e1: 'The answer was not a single year.',
    e2: 'A glass of water holds many years at once.',
    rainCaption: '',
    nowLabel: 'now',
    labels: { mountain: 'Southern Alps', granite: 'granite', spring: 'spring', future: 'year it comes out', past: 'year it fell as rain or snow' },
    ticketHead: 'Spring-water forecast for today’s rain',
    ticketRows: (r) => [
      ['Most of it comes out', `around ${r.modeYear}`],
      ['Half of it, by', `around ${r.medianYear}`],
      ['The last drop', `around ${r.lastYear}`],
    ],
    ticketNote: 'An imagined forecast from a model with a 20-year mean',
    aboutHtml: `
<h2>When did this water fall as rain?</h2>
<p>Yamanashi produces more bottled mineral water than any other prefecture in Japan (about 40% of the national total in 2022, according to the prefecture, citing the Mineral Water Association of Japan). That water begins as rain and snow on the mountains. It soaks into the ground, finds its way through cracks in the rock, and comes out years or decades later.</p>
<p>A spring does not hold the rain of a single year. Some water comes out fast, some takes deep detours, so water from many years is mixed together. Hydrologists estimate the “age” of groundwater from tracers such as tritium.</p>
<p>This piece splits one glass, drawn today, into 1,200 drops and sends each back to the year it fell. Then it forecasts when today’s rain will become someone’s glass of water.</p>
<h3>About the model</h3>
<ul>
<li>Time underground follows a model with a 20-year mean that spreads from short to long times (a gamma distribution with shape 3). Springs at the foot of the Southern Alps are often described as water that has filtered through granite for about twenty years, but real ages differ from spring to spring. The numbers here are a way of thinking, not measurements.</li>
<li>The glass is computed from today’s date, so tomorrow’s glass is a little different.</li>
<li>Everything is computed in your browser. Nothing is sent anywhere.</li>
</ul>
<h3>Making</h3>
<ul>
<li>Images: Canvas 2D. Sound: synthesized live with Web Audio (no recordings or existing music).</li>
<li>Font: Noto Serif JP (SIL Open Font License 1.1), subset to the characters used here.</li>
<li>Generative AI (Claude by Anthropic) was used for planning, programming and writing.</li>
</ul>`,
  },
};
