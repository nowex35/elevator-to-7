// シェア用のページとカード画像の文言。ゲーム側(public/index.html の gameName・home2・cut)と揃える。
// カードは結果の種類ごとに固定(スコアや出会った現象は載せない。スコアはシェア文にだけ出る)。

export const LANGS = ["ja", "en"];
// 結果の種類: 7 = 7階に帰り着いた / 2〜6 = その階で記録が途切れた
export const RESULTS = [7, 2, 3, 4, 5, 6];

export const T = {
  ja: {
    title: "7階行きのエレベーター", tag: "#7階行きのエレベーター",
    log: "夜間運行記録",
    home: "7階に帰り着いた", cut: f => `記録は${f}階で途切れている`,
    invite: "あなたは、7階に帰れるか。",
    lead: "深夜の団地のエレベーター。止まった階で、扉を開けるか、通り過ぎるか。",
  },
  en: {
    title: "The Elevator to 7", tag: "#ElevatorTo7",
    log: "NIGHT OPERATION LOG",
    home: "Made it home to 7", cut: f => `The log ends on floor ${f}`,
    invite: "Will you make it home?",
    lead: "A late-night elevator. At each stop, open the doors, or pass.",
  },
};

export const resultText = (lang, r) => (r === 7 ? T[lang].home : T[lang].cut(r));
