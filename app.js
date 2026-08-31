/* ============================================================
   Xクローラー君 — フロントエンド モック実装
   ・FxTwitter取得とAI分析は現段階ではモック(MOCK_MODE)
   ・URL抽出/正規化・履歴保存(IndexedDB)・画面遷移・PDF出力は実動作
   ============================================================ */

const MOCK_MODE = true;

/* ---------- 1. URL抽出・正規化 (仕様書 3〜4章) ---------- */
function extractXUrl(rawText) {
  if (!rawText) return null;
  const re = /https?:\/\/(?:www\.)?(?:x\.com|twitter\.com|api\.fxtwitter\.com)\/([A-Za-z0-9_]+)\/status\/(\d+)/i;
  const m = rawText.match(re);
  if (!m) return null;
  const username = m[1];
  const postId = m[2];
  return {
    username,
    postId,
    originalUrl: `https://x.com/${username}/status/${postId}`,
    apiUrl: `https://api.fxtwitter.com/${username}/status/${postId}`
  };
}

/* ---------- 2. モックFxTwitter取得 (仕様書 5章相当) ---------- */
const MOCK_POSTS = {
  zarimaney: {
    author_name: "ザリマネー",
    post_text: "Xの投稿をAIで自動生成して1日10分の運用で月30万円達成しました。誰でも再現できるやり方を解説します。",
  },
  fukugyo_taro: {
    author_name: "副業太郎",
    post_text: "1日30分の在宅せどりだけで月10万円。仕入れ先も含めて全部教えます。特別なスキルは不要です。",
  },
  ai_hack_jp: {
    author_name: "AIハック",
    post_text: "ChatGPTで作ったプロンプトをnoteで販売したら不労所得になりました。作り方と売り方をまとめます。",
  }
};

function mockFetchPost({ username, postId, originalUrl }) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const known = MOCK_POSTS[username];
      resolve({
        author_name: known ? known.author_name : `${username}`,
        author_handle: username,
        post_text: known
          ? known.post_text
          : `(モックデータ) @${username} の投稿です。実データ取得はFxTwitter APIと接続後に有効になります。`,
        created_at: new Date().toISOString(),
        original_url: originalUrl,
        post_id: postId
      });
    }, 650);
  });
}

/* ---------- 3. モックAI分析 (仕様書 7〜8, 16章相当) ---------- */
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const MOCK_TEMPLATES = [
  {
    // 条件付き
    ratings: { practicality: 3, ease: 2, low_cost: 3, reproducibility: 2, earning_potential: 2, ai_compatibility: 3, overall: 2 },
    verification: [
      { status: "REALISTIC", title: "現実的", detail: "仕組み自体は既存ツールで技術的に成立する範囲。" },
      { status: "CAUTION", title: "要注意", detail: "提示された金額・期間は環境やフォロワー基盤に強く依存する。" },
      { status: "UNKNOWN", title: "根拠不足", detail: "収益の出典・期間が明示されておらず検証不能。" },
      { status: "REALISTIC", title: "現実的", detail: "作業自体は既存の自動化手段で再現できる範囲。" }
    ],
    hidden_issues: [
      "同様のノウハウ・代行はすでに競合が多い",
      "収益化までの実際の期間や試行回数が記載されていない",
      "運用に必要なツール・API利用料が不明"
    ],
    verdict: "CONDITIONAL",
    verdictLabel: "条件付き",
    verdictIcon: "🟡",
    conclusion: "仕組み自体は再現可能だが、提示された収益額の再現性には根拠が乏しい。小規模で試し、期間を区切って実測値で継続判断するのが妥当。"
  },
  {
    // 見送り寄り
    ratings: { practicality: 2, ease: 2, low_cost: 2, reproducibility: 1, earning_potential: 1, ai_compatibility: 2, overall: 1 },
    verification: [
      { status: "CAUTION", title: "要注意", detail: "主張の再現条件（フォロワー数・初期投資）が語られていない。" },
      { status: "UNKNOWN", title: "根拠不足", detail: "収益スクリーンショット等の裏付けが提示されていない。" },
      { status: "CAUTION", title: "要注意", detail: "同種の手法は市場飽和が進んでおり後発ほど不利。" },
      { status: "UNKNOWN", title: "根拠不足", detail: "規約上グレーな運用を含む可能性があるが言及がない。" }
    ],
    hidden_issues: [
      "初期費用や広告費など隠れたコストの記載がない",
      "収益化までの期間の目安が示されていない",
      "プラットフォーム規約違反のリスクに触れていない"
    ],
    verdict: "SKIP",
    verdictLabel: "見送り",
    verdictIcon: "🔴",
    conclusion: "主張を裏付ける具体的な根拠が乏しく、再現性・費用対効果ともに不透明。現時点では実行に踏み切る材料が不足している。"
  },
  {
    // 試す価値あり
    ratings: { practicality: 3, ease: 3, low_cost: 3, reproducibility: 3, earning_potential: 2, ai_compatibility: 3, overall: 3 },
    verification: [
      { status: "REALISTIC", title: "現実的", detail: "手法自体が広く知られた再現性の高いやり方である。" },
      { status: "REALISTIC", title: "現実的", detail: "低コストで小規模に試せる構成になっている。" },
      { status: "CAUTION", title: "要注意", detail: "収益額は個人差が大きく上限の目安として捉えるべき。" }
    ],
    hidden_issues: [
      "継続的な運用に必要な時間が過小に語られている可能性",
      "収益が安定するまでの試行回数が不明"
    ],
    verdict: "TRY",
    verdictLabel: "試す価値あり",
    verdictIcon: "🟢",
    conclusion: "低コストかつ再現性の高い手法で、小規模な検証に着手する価値はある。収益額そのものは参考値として扱うのが妥当。"
  }
];

function mockAnalyze(post) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const idx = hashStr(post.post_text + post.author_handle) % MOCK_TEMPLATES.length;
      const tpl = MOCK_TEMPLATES[idx];
      resolve({
        title: "X「これで稼げる？」検証レビュー",
        theme: post.post_text.length > 20 ? post.post_text.slice(0, 22) + "…" : post.post_text,
        summary: post.post_text,
        author_name: post.author_name,
        author_handle: post.author_handle,
        original_url: post.original_url,
        created_at: post.created_at,
        ratings: tpl.ratings,
        verification: tpl.verification,
        hidden_issues: tpl.hidden_issues,
        test_steps: ["候補ジャンルの抽出", "類似アカウントの市場調査", "小規模アカウントでの実験運用", "1ヶ月後の結果判定"],
        verdict: tpl.verdict,
        verdict_label: tpl.verdictLabel,
        verdict_icon: tpl.verdictIcon,
        conclusion: tpl.conclusion
      });
    }, 700);
  });
}

/* ---------- 4. IndexedDB (仕様書 12章 ReviewRecord) ---------- */
const DB_NAME = "xcrawler-db";
const STORE = "reviews";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbGetAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result.sort((a, b) => b.createdAt - a.createdAt));
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ---------- 5. 画面遷移 ---------- */
function show(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}
function showHome() { show("screen-home"); renderHistory(); }
function showAnalysis() { show("screen-analysis"); }
function showDetail() { show("screen-detail"); }

function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1800);
}

/* ---------- 6. 星評価の描画 ---------- */
const RATING_LABELS = [
  ["practicality", "実用度"], ["ease", "簡単さ"], ["low_cost", "低コスト"],
  ["reproducibility", "再現性"], ["earning_potential", "収益期待度"],
  ["ai_compatibility", "AIとの相性"], ["overall", "総合"]
];
function stars(n) { return "★".repeat(n) + "☆".repeat(3 - n); }
const VERIFY_MARK = { REALISTIC: ["○", "real"], CAUTION: ["△", "caution"], UNKNOWN: ["？", "unknown"] };
const VERDICT_COLOR = {
  TRY: { c: "#2F6B4A", bg: "rgba(47,107,74,0.08)" },
  CONDITIONAL: { c: "#B4832B", bg: "rgba(180,131,43,0.08)" },
  SKIP: { c: "#A8402F", bg: "rgba(168,64,47,0.08)" }
};

/* ---------- 7. レビュー詳細の描画 ---------- */
let currentRecord = null;

function renderDetail(record) {
  currentRecord = record;
  document.getElementById("d-author-row").innerHTML =
    `<span>@${record.authorHandle}</span><span>${new Date(record.createdAt).toLocaleString("ja-JP")}</span>`;
  document.getElementById("d-open-link").href = record.originalUrl;
  document.getElementById("d-theme").textContent = record.reviewTitle_theme;
  document.getElementById("d-title").textContent = record.hist_title;

  const band = document.getElementById("d-verdict-band");
  band.style.setProperty("--v", VERDICT_COLOR[record.verdict].c);
  band.style.setProperty("--v-bg", VERDICT_COLOR[record.verdict].bg);
  document.getElementById("d-verdict-icon").textContent = record.verdictIcon;
  document.getElementById("d-verdict-label").textContent = record.verdictLabel;

  document.getElementById("d-claim").textContent = record.summary;

  const ratingsEl = document.getElementById("d-ratings");
  ratingsEl.innerHTML = RATING_LABELS.map(([key, label]) => {
    const overallCls = key === "overall" ? " overall" : "";
    return `<div class="rk${overallCls}">${label}</div><div class="rv${overallCls}">${stars(record.ratings[key])}</div>`;
  }).join("");

  const verifyEl = document.getElementById("d-verify");
  verifyEl.innerHTML = record.verification.map((v) => {
    const [mark, cls] = VERIFY_MARK[v.status];
    return `<div class="verify-item ${cls}"><div class="vmark">${mark}</div><div><b>${v.title}</b><span>${v.detail}</span></div></div>`;
  }).join("");

  const hiddenEl = document.getElementById("d-hidden");
  hiddenEl.innerHTML = record.hiddenIssues.map((h) => `<li>${h}</li>`).join("");

  const stepsEl = document.getElementById("d-plansteps");
  stepsEl.innerHTML = record.testSteps.map((s, i) =>
    `<div class="pstep"><div class="pnum">${i + 1}</div>${s}</div>`
  ).join("");

  document.getElementById("d-conclusion").textContent = record.conclusion;
  showDetail();
}

/* ---------- 8. 履歴一覧の描画 ---------- */
async function renderHistory() {
  const listEl = document.getElementById("history-list");
  const records = await dbGetAll();
  if (records.length === 0) {
    listEl.innerHTML = `<p class="empty-hist">まだレビューがありません。上のURL欄にXの投稿リンクを貼って試してください。</p>`;
    return;
  }
  listEl.innerHTML = records.map((r) => `
    <div class="history-item" data-id="${r.id}">
      <div class="stamp-mini" style="color:${VERDICT_COLOR[r.verdict].c}">${r.verdictIcon}</div>
      <div class="hist-body">
        <p class="hist-title">${r.hist_title}</p>
        <p class="hist-meta">@${r.authorHandle} ・ ${new Date(r.createdAt).toLocaleDateString("ja-JP")}</p>
      </div>
      <div class="hist-score">総合${stars(r.ratings.overall)}</div>
    </div>
  `).join("");
  listEl.querySelectorAll(".history-item").forEach((el) => {
    el.addEventListener("click", async () => {
      const rec = records.find((r) => r.id === el.dataset.id);
      renderDetail(rec);
    });
  });
}

/* ---------- 9. 解析フロー ---------- */
async function runAnalysis(parsed) {
  showAnalysis();
  document.getElementById("a-handle").textContent = `@${parsed.username}`;
  document.getElementById("a-txt").textContent = "投稿本文を取得しています…";

  const steps = document.querySelectorAll("#steps .step");
  steps.forEach((s) => s.classList.remove("done", "active"));

  function setStep(i) {
    steps.forEach((s, idx) => {
      s.classList.toggle("active", idx === i);
      s.classList.toggle("done", idx < i);
    });
  }

  try {
    setStep(0);
    const post = await mockFetchPost(parsed);
    document.getElementById("a-txt").textContent = post.post_text;

    setStep(1);
    await new Promise((r) => setTimeout(r, 400));

    setStep(2);
    const review = await mockAnalyze(post);

    setStep(3);
    await new Promise((r) => setTimeout(r, 300));
    setStep(4);

    const record = {
      id: `${parsed.postId}-${Date.now()}`,
      createdAt: Date.now(),
      originalUrl: post.original_url,
      authorHandle: post.author_handle,
      hist_title: review.theme,
      reviewTitle_theme: review.title,
      summary: review.summary,
      ratings: review.ratings,
      verification: review.verification,
      hiddenIssues: review.hidden_issues,
      testSteps: review.test_steps,
      verdict: review.verdict,
      verdictLabel: review.verdict_label,
      verdictIcon: review.verdict_icon,
      conclusion: review.conclusion
    };

    await dbPut(record);
    setTimeout(() => renderDetail(record), 350);
  } catch (err) {
    console.error(err);
    toast("解析に失敗しました");
    showHome();
  }
}

/* ---------- 10. Markdown出力 ---------- */
function toMarkdown(r) {
  const lines = [];
  lines.push(`# ${r.hist_title}`);
  lines.push("");
  lines.push(`- 投稿者: @${r.authorHandle}`);
  lines.push(`- 投稿日時: ${new Date(r.createdAt).toLocaleString("ja-JP")}`);
  lines.push(`- 元投稿: ${r.originalUrl}`);
  lines.push(`- 最終判定: ${r.verdictIcon} ${r.verdictLabel}`);
  lines.push("");
  lines.push("## 元投稿の主張");
  lines.push("");
  lines.push(r.summary);
  lines.push("");
  lines.push("## 3段階評価");
  lines.push("");
  lines.push("| 項目 | 評価 |");
  lines.push("|---|---|");
  RATING_LABELS.forEach(([key, label]) => {
    lines.push(`| ${label} | ${stars(r.ratings[key])} |`);
  });
  lines.push("");
  lines.push("## 本当にできる？");
  lines.push("");
  r.verification.forEach((v) => {
    const [mark] = VERIFY_MARK[v.status];
    lines.push(`- ${mark} **${v.title}**: ${v.detail}`);
  });
  lines.push("");
  lines.push("## 投稿では見えにくいところ");
  lines.push("");
  r.hiddenIssues.forEach((h) => lines.push(`- ${h}`));
  lines.push("");
  lines.push("## 実際にやるなら");
  lines.push("");
  r.testSteps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  lines.push("");
  lines.push("## 結論");
  lines.push("");
  lines.push(r.conclusion);
  lines.push("");
  return lines.join("\n");
}

function safeFilenamePart(s, maxLen) {
  return s
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/…/g, "")
    .trim()
    .slice(0, maxLen);
}

function exportMD() {
  if (!currentRecord) return;
  try {
    const md = toMarkdown(currentRecord);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date(currentRecord.createdAt).toISOString().slice(0, 10).replace(/-/g, "");
    const titlePart = safeFilenamePart(currentRecord.hist_title, 20);
    const a = document.createElement("a");
    a.href = url;
    a.download = `xreview_${currentRecord.authorHandle}_${dateStr}_${titlePart}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Markdownを保存しました");
  } catch (err) {
    console.error(err);
    toast("MD生成に失敗: " + (err && err.message ? err.message : "不明なエラー"));
  }
}

/* ---------- 11. 起動処理 ---------- */
window.addEventListener("DOMContentLoaded", () => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  const urlInput = document.getElementById("url-input");
  const startBtn = document.getElementById("btn-start");

  startBtn.addEventListener("click", () => {
    const parsed = extractXUrl(urlInput.value.trim());
    if (!parsed) {
      toast("XのポストURLが見つかりません");
      return;
    }
    runAnalysis(parsed);
  });

  document.getElementById("btn-close-detail").addEventListener("click", showHome);
  document.getElementById("btn-md").addEventListener("click", exportMD);

  document.getElementById("btn-share").addEventListener("click", async () => {
    if (!currentRecord) return;
    const text = `[${currentRecord.verdictIcon} ${currentRecord.verdictLabel}] ${currentRecord.hist_title}\n総合${stars(currentRecord.ratings.overall)}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Xクローラー君レビュー", text }); } catch (e) {}
    } else {
      await navigator.clipboard.writeText(text);
      toast("結果をコピーしました");
    }
  });

  document.getElementById("btn-reanalyze").addEventListener("click", () => {
    if (!currentRecord) return;
    const parsed = extractXUrl(currentRecord.originalUrl);
    if (parsed) runAnalysis(parsed);
  });

  document.getElementById("btn-delete").addEventListener("click", async () => {
    if (!currentRecord) return;
    await dbDelete(currentRecord.id);
    toast("削除しました");
    showHome();
  });

  // Web Share Target 経由の起動（PWAインストール後、Xの共有メニューから開いた場合）
  const params = new URLSearchParams(location.search);
  const sharedText = params.get("text") || params.get("url") || params.get("title") || "";
  const parsedFromShare = extractXUrl(sharedText);
  if (parsedFromShare) {
    runAnalysis(parsedFromShare);
  } else {
    showHome();
  }
});
