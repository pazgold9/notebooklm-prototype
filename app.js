"use strict";

/* =========================================================== data ====== */

const DECK = [
  ["What role does REM sleep play in memory consolidation?",
   "REM sleep replays emotional and procedural memories and weaves them into existing knowledge networks."],
  ["How does sleep affect emotional regulation?",
   "Sleep strips part of the emotional charge from the day's memories, which lowers reactivity the next morning."],
  ["What happens during deep sleep?",
   "Slow-wave sleep drives physical restoration and moves newly learned material from the hippocampus to the cortex."],
  ["Why is sleep considered an active biological process?",
   "The brain does not shut down. It runs consolidation, clearance and restoration on a tight schedule."],
  ["How does sleep deprivation affect attention?",
   "Vigilance breaks down into short lapses, so responses become slower and far less consistent."],
  ["How do circadian rhythms shape sleep timing?",
   "An internal clock anchored to light decides when sleep pressure peaks and when alertness returns."],
  ["What is the role of slow-wave sleep?",
   "It is the deepest stage, tied to bodily restoration and to stabilising memories formed during the day."],
  ["Why is learning better after a full night of sleep?",
   "Sleep consolidates the day's material, so recall and transfer beat an equal stretch of time spent awake."],
  ["How does sleep loss affect decision-making?",
   "Risk assessment and impulse control weaken, and immediate reward starts to dominate the choice."],
  ["What happens to dreams during REM sleep?",
   "Vivid narrative dreaming concentrates in REM, when cortical activity looks close to wakefulness."],
  ["What are the stages of a sleep cycle?",
   "A cycle runs from light sleep through deep slow-wave sleep into REM, repeating roughly every 90 minutes."],
  ["How does sleep support problem-solving?",
   "Overnight reorganisation surfaces connections between memories that were not obvious before sleep."]
];

const TILES = [
  { type:"audio",       label:"Audio Overview", icon:"i-audio",   tint:"#2C2A3E" },
  { type:"slides",      label:"Slide Deck",     icon:"i-slides",  tint:"#33301F" },
  { type:"video",       label:"Video Overview", icon:"i-video",   tint:"#223033" },
  { type:"mindmap",     label:"Mind Map",       icon:"i-mindmap", tint:"#33262B" },
  { type:"flashcards",  label:"Flashcards",     icon:"i-cards",   tint:"#1F3760", hero:true },
  { type:"reports",     label:"Reports",        icon:"i-report",  tint:"#33301F" },
  { type:"quiz",        label:"Quiz",           icon:"i-quiz",    tint:"#212A33" },
  { type:"infographic", label:"Infographic",    icon:"i-chart",   tint:"#33252F" },
  { type:"table",       label:"Data Table",     icon:"i-table",   tint:"#2C2A3E" }
];

const ACTIONS = [
  { id:"focus",   label:"Focus on a topic", needsTopic:true },
  { id:"harder",  label:"Make harder" },
  { id:"detail",  label:"Add detail" },
  { id:"broaden", label:"Broaden coverage" }
];

/* ========================================================== state ====== */

const state = {
  improved: true,
  sources: [{ id:1, name:"The Cognitive Architecture of Sleep", on:true }],
  messages: [{ role:"assistant", kind:"summary" }],
  busy: false,

  outputs: [],           // { id, type, label, meta, status }
  open: null,            // id of the open output

  cards: DECK.map(([q, a]) => ({ q, a })),
  original: null,
  index: 0,
  flipped: false,
  version: 1,
  changed: new Set(),

  flow: null,            // scope | select | guided | processing | success | changes | error
  scope: null,           // all | selected
  picked: new Set(),
  action: null,
  request: "",
  errorKey: null,
  errorMsg: "",
  progress: 0,
  fieldFocused: false,
  collapsed: { sources:false, studio:false },

  quizPick: null,
  modal: null,
  toasts: [],
  forceFail: false,
  autoScroll: false
};

const log = [];
let uid = 0;
let ticker = null;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
const icon = (name, cls) => `<svg class="ic ${cls || ""}"><use href="#${name}"/></svg>`;
const track = (event, detail = "") => log.push({
  t: new Date().toISOString(), event, detail,
  mode: state.improved ? "improved" : "baseline"
});

/* ======================================================== sources ====== */

function renderSources() {
  const rows = state.sources.map((s) => `
    <button class="src" data-act="toggle-source" data-value="${s.id}">
      ${icon("i-doc", "ic-sm doc")}
      <span class="name">${esc(s.name)}</span>
      <span class="check ${s.on ? "on" : ""}">${icon("i-check", "ic-sm")}</span>
    </button>`).join("");

  return `
    <button class="add-source" data-act="open-sources">${icon("i-add", "ic-sm")} Add sources</button>
    <div class="websearch">
      <div class="lbl">Search the web for new sources</div>
      <div class="seg">
        <button class="seg-btn" data-act="toast" data-value="Web search is not part of this prototype.">
          ${icon("i-globe", "ic-sm")} Web ${icon("i-down", "ic-sm")}
        </button>
        <button class="seg-btn" data-act="toast" data-value="Fast Research is not part of this prototype.">
          ${icon("i-target", "ic-sm")} Fast Research ${icon("i-down", "ic-sm")}
        </button>
        <button class="iconbtn" style="margin-left:auto" data-act="toast"
                data-value="Web search is not part of this prototype.">${icon("i-search", "ic-sm")}</button>
      </div>
    </div>
    <button class="selectall" data-act="select-all-sources">
      ${state.sources.every((s) => s.on) ? "Deselect all" : "Select all"}
      <span class="check ${state.sources.every((s) => s.on) ? "on" : ""}">${icon("i-check", "ic-sm")}</span>
    </button>
    ${rows}`;
}

/* =========================================================== chat ====== */

const SUMMARY = `
  Modern research reveals that sleep is a <b>dynamic biological necessity</b> rather than a period of
  passive inactivity.<span class="cite" data-act="cite">1</span> Throughout various <b>cycles of rest</b>, the brain performs
  critical tasks such as <b>transferring daily experiences into permanent memory</b> and facilitating
  <b>emotional recovery</b>. While <b>deep sleep</b> focuses on physical restoration and factual data,
  <b>REM stages</b> are essential for fostering <b>creative problem-solving</b> and managing complex
  feelings.<span class="cite" data-act="cite">1</span> Conversely, failing to achieve adequate rest can cause
  <b>severe cognitive impairment</b> comparable to intoxication, leading to <b>diminished focus</b> and
  heightened stress. Ultimately, consistent rest is fundamental for <b>maintaining mental sharpness</b>
  and overall psychological health.`;

function renderMessage(m) {
  if (m.role === "user") return `<div class="msg"><div class="msg-user">${esc(m.text)}</div></div>`;

  if (m.kind === "summary") {
    return `
      <div class="msg">
        <svg class="brainmark ic" style="width:34px;height:34px"><use href="#i-logo"/></svg>
        <h1 class="doc-title">The Cognitive Architecture of Sleep</h1>
        <div class="doc-meta">1 source · Jun 1, 2026</div>
        <div class="answer">${SUMMARY}</div>
        <div class="msg-actions">
          <button class="chipbtn" data-act="save-note">${icon("i-pin", "ic-sm")} Save to note</button>
          <button class="chipbtn" data-act="toast" data-value="Copied to clipboard">${icon("i-copy", "ic-sm")}</button>
          <button class="chipbtn" data-act="toast" data-value="Thanks for the feedback">${icon("i-up", "ic-sm")}</button>
          <button class="chipbtn" data-act="toast" data-value="Thanks for the feedback">${icon("i-dn", "ic-sm")}</button>
        </div>
      </div>`;
  }

  return `
    <div class="msg">
      <svg class="brainmark ic" style="width:26px;height:26px;margin-bottom:10px"><use href="#i-logo"/></svg>
      <div class="answer">${m.html || esc(m.text)}</div>
    </div>`;
}

function renderChat() {
  const head = `<div style="display:flex;margin-bottom:18px">
      <button class="customize" data-act="toast" data-value="Chat customisation is not part of this prototype.">
        ${icon("i-tune", "ic-sm")} Customize
      </button></div>`;
  const body = state.messages.map(renderMessage).join("");
  const typing = state.busy ? `<div class="msg"><div class="typing"><i></i><i></i><i></i></div></div>` : "";
  return head + body + typing + renderFlow();
}

/* ==================================================== guided editing === */

function scopeText() {
  if (state.scope === "all") return "Editing all 12 flashcards";
  const n = state.picked.size;
  return `Editing ${n} selected flashcard${n === 1 ? "" : "s"}`;
}

function renderFlow() {
  const f = state.flow;
  if (!f) return "";

  if (f === "scope") {
    const err = state.errorKey === "scope";
    return `
      <div class="gcard ${err ? "err" : "accent"}">
        <h3>Which flashcards should be improved?</h3>
        <p>Choose the scope first. Nothing changes until you apply the update.</p>
        <div class="opts">
          <button class="opt" data-act="scope" data-value="all" aria-pressed="${state.scope === "all"}">
            <b>All 12 flashcards</b><span>Every card in the set is included</span>
          </button>
          <button class="opt" data-act="scope" data-value="selected" aria-pressed="${state.scope === "selected"}">
            <b>Select flashcards</b><span>Pick only the cards you want to change</span>
          </button>
        </div>
        ${err ? `<div class="hint">${icon("i-alert","ic-sm")} Choose all cards or select specific cards.</div>` : ""}
        <div class="row-actions">
          <button class="btn" data-act="cancel">Cancel</button>
          <button class="btn btn-fill spacer" data-act="scope-next" ${state.scope ? "" : "disabled"}>Continue</button>
        </div>
      </div>`;
  }

  if (f === "select") {
    const err = state.errorKey === "picked";
    const n = state.picked.size;
    const rows = state.cards.map((c, i) => `
      <button class="prow" data-act="pick" data-value="${i}" aria-pressed="${state.picked.has(i)}">
        <span class="check ${state.picked.has(i) ? "on" : ""}">${icon("i-check", "ic-sm")}</span>
        <span class="num">${i + 1}</span><span>${esc(c.q)}</span>
      </button>`).join("");
    return `
      <div class="gcard ${err ? "err" : "accent"}">
        <div class="picker-head">
          <h3 style="margin:0">Select flashcards to improve</h3>
          <span class="n ${n ? "on" : ""}">${n === 12 ? "All 12 selected" : `${n} selected`}</span>
        </div>
        <div class="picker">${rows}</div>
        ${err ? `<div class="hint">${icon("i-alert","ic-sm")} Select at least one flashcard before continuing.</div>` : ""}
        <div class="row-actions">
          <button class="btn" data-act="${n ? "clear" : "cancel"}">${n ? "Clear selection" : "Cancel"}</button>
          ${n === 12 ? "" : `<button class="btn" data-act="pick-all">Select all 12</button>`}
          <button class="btn btn-fill spacer" data-act="select-next" ${n ? "" : "disabled"}>Continue</button>
        </div>
      </div>`;
  }

  if (f === "guided") {
    const err = state.errorKey === "request";
    const chips = ACTIONS.map((a) => `
      <button class="chipbtn ${state.action === a.id ? "on" : ""}" data-act="action" data-value="${a.id}">
        ${esc(a.label)}
      </button>`).join("");
    const ph = state.action === "focus"
      ? "Which concept should the cards focus on? For example: REM sleep"
      : "Describe the change in your own words";
    return `
      <div class="gcard ${err ? "err" : "accent"}">
        <div class="scope-tag">${icon("i-cards", "ic-sm")} ${esc(scopeText())}</div>
        <p style="margin-bottom:10px">Choose a suggested improvement</p>
        <div class="chips">${chips}</div>
        <input class="field ${err ? "err" : ""}" id="requestField" placeholder="${esc(ph)}"
               value="${esc(state.request)}">
        ${err ? `<div class="hint">${icon("i-alert","ic-sm")} ${esc(state.errorMsg)}</div>` : ""}
        <div class="row-actions">
          <button class="btn" data-act="back">${icon("i-left","ic-sm")} Change selection</button>
          <button class="btn btn-fill spacer" data-act="apply">Apply update</button>
        </div>
      </div>`;
  }

  if (f === "processing") {
    const keep = state.scope === "all"
      ? "Every card in the set is being revised."
      : `${12 - state.picked.size} cards you did not select will stay exactly as they are.`;
    return `
      <div class="gcard accent">
        <div class="scope-tag">${icon("i-refresh", "ic-sm")} ${esc(scopeText())}</div>
        <h3>Updating the flashcards…</h3>
        <div class="bar"><i style="width:${state.progress}%"></i></div>
        <p style="margin:0">${keep}</p>
      </div>`;
  }

  if (f === "success") {
    const n = state.changed.size;
    return `
      <div class="gcard ok">
        <h3 style="color:var(--green)">${n} flashcard${n === 1 ? "" : "s"} updated</h3>
        <p style="color:#B8DCC4">Version ${state.version} is saved and version ${state.version - 1} can still be restored.
           ${12 - n} card${12 - n === 1 ? "" : "s"} stayed unchanged.</p>
        <div class="chips">
          <button class="chipbtn" data-act="changes">View changes</button>
          <button class="chipbtn" data-act="again">Improve again</button>
          <button class="chipbtn" data-act="undo">${icon("i-undo", "ic-sm")} Undo</button>
        </div>
      </div>`;
  }

  if (f === "changes") {
    const rows = state.cards.map((c, i) => `
      <div class="chg-row">
        <span class="num" style="color:var(--subtle)">${i + 1}</span>
        <span>${esc(c.q)}</span>
        <span class="st ${state.changed.has(i) ? "on" : ""}">${state.changed.has(i) ? "Changed" : "Unchanged"}</span>
      </div>`).join("");
    return `
      <div class="gcard ok">
        <h3 style="color:var(--green)">Changes in version ${state.version}</h3>
        <div class="chg">${rows}</div>
        <div class="row-actions">
          <button class="btn spacer" data-act="done">Done</button>
        </div>
      </div>`;
  }

  if (f === "error") {
    return `
      <div class="gcard err">
        <h3 style="color:var(--red)">Could not update the flashcards</h3>
        <p style="color:#F5CFCD">Nothing was changed. Your set and your selection were both preserved,
           so you can try again without starting over.</p>
        <div class="row-actions">
          <button class="btn btn-danger" data-act="retry">${icon("i-refresh", "ic-sm")} Try again</button>
          <button class="btn" data-act="cancel">Cancel</button>
        </div>
      </div>`;
  }
  return "";
}

/* ========================================================= studio ====== */

// Same grid order as the original NotebookLM studio in both modes; only the
// flashcards tile changes appearance in improved mode.
const TILE_ORDER = ["audio", "slides", "video", "mindmap", "reports",
                    "flashcards", "quiz", "infographic", "table"];

function renderTiles() {
  return TILE_ORDER.map((type) => {
    const t = TILES.find((x) => x.type === type);
    const accent = t.hero && state.improved;
    const tint = accent ? t.tint : (t.hero ? "#332720" : t.tint);
    return `
    <button class="tile ${accent ? "tile-accent" : ""}" style="background:${tint}"
            data-act="tile" data-value="${t.type}">
      <div class="top">${icon(t.icon, "ic-sm")}<span class="chev">${icon("i-right", "ic-sm")}</span></div>
      <div class="label">${esc(t.label)}</div>
    </button>`;
  }).join("");
}

function renderOutputs() {
  if (!state.outputs.length) {
    return `
      <div class="empty">
        <svg class="ic sparkle"><use href="#i-sparkle"/></svg>
        <b>Studio output will be saved here.</b>
        <p>Click a tile above to add an Audio Overview, Flashcards, a Mind Map, and more.</p>
        <button class="addnote" data-act="add-note">${icon("i-note", "ic-sm")} Add note</button>
      </div>`;
  }
  const rows = state.outputs.map((o) => {
    const t = TILES.find((x) => x.type === o.type);
    return `
      <button class="output" data-act="open-output" data-value="${o.id}">
        ${o.status === "generating"
          ? `<span class="spin">${icon("i-refresh", "ic-sm")}</span>`
          : icon(t ? t.icon : "i-note", "ic-sm")}
        <span style="flex:1">
          <div>${esc(o.label)}</div>
          <div class="meta">${esc(o.status === "generating" ? "Generating…" : o.meta)}</div>
        </span>
        ${o.status === "ready" ? icon("i-right", "ic-sm") : ""}
      </button>`;
  }).join("");
  return `<div class="outputs">${rows}</div>
          <button class="addnote" data-act="add-note">${icon("i-note", "ic-sm")} Add note</button>`;
}

function renderFlashcards() {
  const c = state.cards[state.index];
  // Weak post-action feedback is one of the documented baseline problems,
  // so change markers and version info are shown only in improved mode.
  const changed = state.improved && state.changed.has(state.index);
  const busy = state.flow === "processing";
  return `
    <div class="art-head">
      <button class="back" data-act="close-output">${icon("i-left", "ic-sm")}</button>
      <div style="flex:1">
        <h2>Flashcards</h2>
        <div class="sub">12 cards · The Cognitive Architecture of Sleep${state.improved && state.version > 1 ? ` · version ${state.version}` : ""}</div>
      </div>
    </div>

    ${state.improved ? `
    <button class="btn ${busy ? "" : "btn-fill"}" data-act="improve" ${busy ? "disabled" : ""} style="margin-bottom:14px">
      ${busy ? "Updating…" : (state.version > 1 ? "Improve again" : "Improve flashcards")}
    </button>` : ""}

    <div class="fc-stage">
      <div class="fc ${state.flipped ? "flip" : ""} ${changed ? "changed" : ""}" data-act="flip">
        <div class="fc-face">
          <div style="display:flex;align-items:center">
            <span class="tag">CARD ${state.index + 1} OF 12</span>
            ${changed ? `<span class="updated-tag">UPDATED</span>` : ""}
          </div>
          <div class="q">${esc(c.q)}</div>
          <div class="flip-hint">Click to reveal the answer</div>
        </div>
        <div class="fc-face fc-back">
          <span class="tag">ANSWER</span>
          <div class="a">${esc(c.a)}</div>
          <div class="flip-hint">Click to see the question</div>
        </div>
      </div>
    </div>

    <div class="fc-nav">
      <button class="navbtn" data-act="prev">${icon("i-left", "ic-sm")}</button>
      <span class="pos">${state.index + 1} / 12</span>
      <button class="navbtn" data-act="next">${icon("i-right", "ic-sm")}</button>
    </div>

    ${state.improved && state.version > 1 ? `
      <div class="result">
        <div class="t">Version ${state.version} · ${state.changed.size} changed · ${12 - state.changed.size} unchanged</div>
        <div class="m">The previous version is still recoverable.</div>
        <div class="row">
          <button class="btn btn-out" data-act="changes">View changes</button>
          <button class="btn btn-out" data-act="undo">Undo</button>
        </div>
      </div>` : ""}`;
}

function renderArtifact(o) {
  if (o.type === "flashcards") return renderFlashcards();

  const t = TILES.find((x) => x.type === o.type);
  const head = `
    <div class="art-head">
      <button class="back" data-act="close-output">${icon("i-left", "ic-sm")}</button>
      <div style="flex:1"><h2>${esc(t.label)}</h2><div class="sub">${esc(o.meta)}</div></div>
    </div>`;

  const bodies = {
    audio: `
      <div class="player">
        <div style="display:flex;align-items:center;gap:14px">
          <button class="play" data-act="toast" data-value="Audio playback is simulated in this prototype.">${icon("i-play", "ic-sm")}</button>
          <div><div style="font-size:13.5px">Deep Dive conversation</div>
               <div class="sub" style="color:var(--subtle);font-size:11.5px">Two hosts · 12:41</div></div>
        </div>
        <div class="wave">${Array.from({ length: 42 }, (_, i) =>
          `<i style="height:${20 + Math.round(70 * Math.abs(Math.sin(i * 0.7)))}%"></i>`).join("")}</div>
        <div style="color:var(--subtle);font-size:11.5px">0:00 / 12:41</div>
      </div>`,
    slides: `
      <div class="slides">
        <div class="slide"><div class="k">SLIDE 1</div><div class="h">Sleep is an active process</div>
          <div class="b">The brain runs consolidation and restoration on a schedule.</div></div>
        <div class="slide"><div class="k">SLIDE 2</div><div class="h">The architecture of a cycle</div>
          <div class="b">Light sleep, slow-wave sleep and REM repeat about every 90 minutes.</div></div>
        <div class="slide"><div class="k">SLIDE 3</div><div class="h">The cost of sleep loss</div>
          <div class="b">Attention lapses, weaker impulse control, poorer decisions.</div></div>
      </div>`,
    video: `
      <div class="frame">${icon("i-play", "ic-lg")}</div>
      <div style="color:var(--subtle);font-size:12px;margin-top:10px">Narrated overview · 4:18</div>`,
    mindmap: `
      <svg viewBox="0 0 380 240" style="width:100%;height:auto">
        <g stroke="#5F6368" fill="none" stroke-width="1.2">
          <path d="M190 120 90 50M190 120 90 120M190 120 90 190M190 120 292 60M190 120 292 120M190 120 292 180"/>
        </g>
        <g fill="#282A2C" stroke="#A8C7FA">
          <rect x="140" y="104" width="100" height="32" rx="8"/>
          <rect x="20" y="34" width="118" height="30" rx="8"/><rect x="20" y="104" width="118" height="30" rx="8"/>
          <rect x="20" y="174" width="118" height="30" rx="8"/><rect x="244" y="44" width="118" height="30" rx="8"/>
          <rect x="244" y="104" width="118" height="30" rx="8"/><rect x="244" y="164" width="118" height="30" rx="8"/>
        </g>
        <g fill="#E3E3E3" font-size="10.5" font-family="sans-serif" text-anchor="middle">
          <text x="190" y="124">Sleep</text>
          <text x="79" y="53">Memory</text><text x="79" y="123">Emotion</text><text x="79" y="193">Attention</text>
          <text x="303" y="63">REM</text><text x="303" y="123">Slow-wave</text><text x="303" y="183">Circadian</text>
        </g>
      </svg>`,
    reports: `
      <div class="guide">
        <h4>Overview</h4>
        <p>Sleep is a structured, active process that supports memory, emotion and attention.</p>
        <h4>Key concepts</h4>
        <ul>
          <li>Consolidation transfers material from the hippocampus to the cortex.</li>
          <li>REM supports emotional processing and creative recombination.</li>
          <li>Deprivation produces impairment comparable to intoxication.</li>
        </ul>
        <h4>Questions to review</h4>
        <p>What distinguishes slow-wave sleep from REM, and why does the order of the stages matter?</p>
      </div>`,
    quiz: `
      <div class="notice">${icon("i-alert", "ic-sm")}
        <div>This tile creates a quiz, not flashcards. No flashcards were created or changed.</div></div>
      <div style="font-size:15px;margin-bottom:14px">During which stage is emotional memory most actively processed?</div>
      ${["Light sleep", "Slow-wave sleep", "REM sleep", "Wakefulness"].map((o, i) => `
        <button class="quiz-opt ${state.quizPick === null ? "" : (i === 2 ? "right" : (state.quizPick === i ? "wrong" : ""))}"
                data-act="quiz" data-value="${i}">
          <span class="check ${state.quizPick === i ? "on" : ""}">${icon("i-check", "ic-sm")}</span>${o}
        </button>`).join("")}`,
    infographic: `
      <div class="grid2">
        <div class="stat"><b>90</b><span>minutes per cycle</span></div>
        <div class="stat"><b>4–6</b><span>cycles per night</span></div>
        <div class="stat"><b>25%</b><span>of the night in REM</span></div>
        <div class="stat"><b>17h</b><span>awake ≈ 0.05% BAC</span></div>
      </div>`,
    table: `
      <table class="data">
        <tr><th>Stage</th><th>Share</th><th>Main function</th></tr>
        <tr><td>Light sleep</td><td>50%</td><td>Transition and filtering</td></tr>
        <tr><td>Slow-wave</td><td>25%</td><td>Restoration, factual memory</td></tr>
        <tr><td>REM</td><td>25%</td><td>Emotion, creative recombination</td></tr>
      </table>`,
    note: `<div class="guide"><p>${esc(o.body || "")}</p></div>`
  };

  return head + (bodies[o.type] || "");
}

function renderStudio() {
  const open = state.outputs.find((o) => o.id === state.open);
  if (open && open.status === "ready") return renderArtifact(open);
  return `<div class="tiles">${renderTiles()}</div>${renderOutputs()}`;
}

/* ========================================================= chrome ====== */

function renderModal() {
  if (state.modal !== "sources") return "";
  const opt = (ic, label) =>
    `<button class="srcopt" data-act="add-source" data-value="${label}">${icon(ic, "ic-lg")}${label}</button>`;
  return `
    <div class="scrim" data-act="close-modal">
      <div class="modal" data-stop="1">
        <div style="display:flex;align-items:center">
          <h2 style="flex:1">Add sources</h2>
          <button class="iconbtn" data-act="close-modal">${icon("i-close", "ic-sm")}</button>
        </div>
        <p class="lead">Sources let NotebookLM base its answers on the material that matters to you.</p>
        <div class="drop">${icon("i-upload", "ic-lg")}<b>Upload sources</b>
          Drag and drop, or choose a file. PDF, txt, Markdown, audio.</div>
        <div class="srcopts">
          ${opt("i-upload", "Upload file")}${opt("i-link", "Website link")}${opt("i-text", "Paste text")}
        </div>
      </div>
    </div>`;
}

function renderToasts() {
  return state.toasts.map((t) => `<div class="toast">${esc(t.text)}</div>`).join("");
}

function toast(text) {
  const id = ++uid;
  state.toasts.push({ id, text });
  setTimeout(() => {
    state.toasts = state.toasts.filter((t) => t.id !== id);
    $("toasts").innerHTML = renderToasts();
  }, 2600);
}

/* ========================================================= render ====== */

function render() {
  $("sources").innerHTML = renderSources();
  $("chat").innerHTML = renderChat();
  $("studio").innerHTML = renderStudio();
  $("modal").innerHTML = renderModal();
  $("toasts").innerHTML = renderToasts();

  $("paneSources").classList.toggle("collapsed", state.collapsed.sources);
  $("paneStudio").classList.toggle("collapsed", state.collapsed.studio);

  const on = state.sources.filter((s) => s.on).length;
  $("srccount").textContent = `${on} source${on === 1 ? "" : "s"}`;

  const field = $("requestField");
  if (field) {
    field.addEventListener("input", (e) => { state.request = e.target.value; });
    field.addEventListener("focus", () => { state.fieldFocused = true; });
    field.addEventListener("blur", () => { state.fieldFocused = false; });
    if (state.fieldFocused || state.errorKey === "request") {
      field.focus();
      field.setSelectionRange(field.value.length, field.value.length);
    }
  }

  if (state.autoScroll) {
    const pane = $("chat");
    pane.scrollTop = pane.scrollHeight;
    state.autoScroll = false;
  }

  $("facWhere").textContent =
    `מצב: ${state.improved ? "משופר" : "בסיס"} · סטודיו: ${state.open ? "תוצר פתוח" : "אריחים"} · שלב: ${state.flow || "אין"} · גרסה: ${state.version}`;
}

/* ======================================================== updating ===== */

function revise(card, action, topic) {
  const base = card.q.replace(/\?\s*$/, "");
  if (action === "focus" || (!action && topic)) {
    const subject = topic || "the central concept";
    const alreadyOnTopic = base.toLowerCase().includes(subject.toLowerCase());
    return {
      q: alreadyOnTopic
        ? `${base}, and how would you explain that in one sentence?`
        : `${base}, specifically in relation to ${subject}?`,
      a: `${card.a} This card now answers in terms of ${subject}.`
    };
  }
  if (action === "harder") {
    return {
      q: `${base}, and what evidence supports that conclusion?`,
      a: `${card.a} The evidence comes from studies comparing rested and sleep-deprived groups on the same task.`
    };
  }
  if (action === "detail") {
    return {
      q: card.q,
      a: `${card.a} In practice this means the effect can be measured within a single night, and it grows across consecutive nights.`
    };
  }
  if (action === "broaden") {
    return {
      q: `${base}, and how does it connect to the other stages of the sleep cycle?`,
      a: `${card.a} It also interacts with the neighbouring stages, so the full cycle matters more than any single stage.`
    };
  }
  return card;
}

function applyUpdate() {
  const targets = state.scope === "all" ? state.cards.map((_, i) => i) : [...state.picked];
  state.flow = "processing";
  state.progress = 0;
  state.autoScroll = true;
  render();

  clearInterval(ticker);
  ticker = setInterval(() => {
    state.progress = Math.min(100, state.progress + 7);
    const bar = document.querySelector(".bar > i");
    if (bar) bar.style.width = state.progress + "%";
    if (state.progress < 100) return;
    clearInterval(ticker);

    if (state.forceFail) {
      state.forceFail = false;
      $("facFail").classList.remove("on");
      $("facFail").textContent = "הכשל את העדכון הבא";
      state.flow = "error";
      track("update_failed");
    } else {
      if (!state.original) state.original = state.cards.map((c) => ({ ...c }));
      const topic = state.request.trim();
      targets.forEach((i) => { state.cards[i] = revise(state.cards[i], state.action, topic); });
      state.changed = new Set(targets);
      state.version += 1;
      state.index = targets[0] ?? 0;
      state.flipped = false;
      state.flow = "success";
      track("update_succeeded", `${targets.length} cards`);
      toast(`${targets.length} flashcards updated`);
    }
    state.autoScroll = true;
    render();
  }, 110);
}

function undo() {
  if (state.original) state.cards = state.original.map((c) => ({ ...c }));
  state.original = null;
  state.changed = new Set();
  state.version = 1;
  state.flow = null;
  track("undo");
  toast("Update reverted to version 1");
}

/* ========================================================= actions ===== */

function makeOutput(type, autoOpen) {
  const t = TILES.find((x) => x.type === type);
  const meta = {
    audio:"Deep Dive · 12:41", slides:"3 slides", video:"Narrated overview · 4:18",
    mindmap:"7 nodes", reports:"Study guide", flashcards:"12 cards",
    quiz:"6 questions", infographic:"4 key figures", table:"3 rows"
  }[type] || "Note";

  const existing = state.outputs.find((o) => o.type === type);
  if (existing) {
    if (autoOpen) state.open = existing.id;
    return existing;
  }

  const o = { id:++uid, type, label:t ? t.label : "Note", meta, status:"generating" };
  state.outputs.unshift(o);
  setTimeout(() => {
    o.status = "ready";
    if (autoOpen) state.open = o.id;
    render();
  }, type === "flashcards" ? 900 : 1500);
  return o;
}

function reply(html) {
  state.busy = true;
  state.autoScroll = true;
  render();
  setTimeout(() => {
    state.busy = false;
    state.messages.push({ role:"assistant", html });
    state.autoScroll = true;
    render();
  }, 1100);
}

const acts = {
  toast: (v) => toast(v),

  "toggle-source": (v) => {
    const s = state.sources.find((x) => x.id === Number(v));
    if (s) s.on = !s.on;
  },
  "select-all-sources": () => {
    const allOn = state.sources.every((s) => s.on);
    state.sources.forEach((s) => { s.on = !allOn; });
  },
  collapse: (v) => { state.collapsed[v] = !state.collapsed[v]; },
  cite: () => toast(`Source 1 · ${state.sources[0].name}`),
  "open-sources": () => { state.modal = "sources"; },
  "close-modal": () => { state.modal = null; },
  "add-source": (v) => {
    state.sources.push({ id:++uid, name:`New source (${v})`, on:true });
    state.modal = null;
    toast("Source added");
  },

  tile: (v) => {
    track("tile", v);
    if (v === "flashcards") { makeOutput("flashcards", true); toast("Generating flashcards…"); return; }
    makeOutput(v, true);
  },
  "open-output": (v) => { state.open = Number(v); state.quizPick = null; },
  "close-output": () => { state.open = null; },
  "add-note": () => {
    const o = { id:++uid, type:"note", label:"Saved note", meta:"From the chat answer", status:"ready",
                body:"Sleep is a dynamic biological necessity: it consolidates memory, restores the body and regulates emotion." };
    state.outputs.unshift(o);
    toast("Note saved");
  },
  "save-note": () => { acts["add-note"](); },

  improve: () => {
    state.flow = "scope"; state.scope = null; state.picked = new Set();
    state.action = null; state.request = ""; state.errorKey = null;
    state.autoScroll = true;
    track("improve_opened");
  },
  scope: (v) => { state.scope = v; state.errorKey = null; },
  "scope-next": () => {
    if (!state.scope) { state.errorKey = "scope"; track("scope_missing"); return; }
    state.errorKey = null;
    state.flow = state.scope === "all" ? "guided" : "select";
    state.autoScroll = true;
    track("scope_chosen", state.scope);
  },
  pick: (v) => {
    const i = Number(v);
    state.picked.has(i) ? state.picked.delete(i) : state.picked.add(i);
    state.errorKey = null;
  },
  "pick-all": () => { state.picked = new Set(state.cards.map((_, i) => i)); state.errorKey = null; },
  clear: () => { state.picked = new Set(); },
  "select-next": () => {
    if (!state.picked.size) { state.errorKey = "picked"; track("selection_missing"); return; }
    state.errorKey = null; state.flow = "guided"; state.autoScroll = true;
    track("selection_made", `${state.picked.size}`);
  },
  action: (v) => { state.action = state.action === v ? null : v; state.errorKey = null; },
  back: () => { state.flow = state.scope === "all" ? "scope" : "select"; state.errorKey = null; },
  apply: () => {
    const topic = state.request.trim();
    if (state.action === "focus" && !topic) {
      state.errorKey = "request";
      state.errorMsg = "Enter a topic before applying the update.";
      track("topic_missing");
      return;
    }
    if (!state.action && !topic) {
      state.errorKey = "request";
      state.errorMsg = "Choose an improvement or describe the change before applying.";
      track("request_missing");
      return;
    }
    state.errorKey = null;
    track("apply", state.action || state.request.slice(0, 40));
    applyUpdate();
  },
  retry: () => { track("retry"); applyUpdate(); },
  cancel: () => { state.flow = null; state.errorKey = null; track("cancel"); },
  again: () => { acts.improve(); },
  changes: () => { state.flow = "changes"; state.autoScroll = true; track("view_changes"); },
  done: () => { state.flow = "success"; },
  undo,

  flip: () => { state.flipped = !state.flipped; },
  prev: () => { state.index = (state.index + 11) % 12; state.flipped = false; },
  next: () => { state.index = (state.index + 1) % 12; state.flipped = false; },
  quiz: (v) => { state.quizPick = Number(v); },

  send: () => sendMessage()
};

function sendMessage() {
  const input = $("composer");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  state.messages.push({ role:"user", text });
  track("free_text", text.slice(0, 60));

  if (/flash ?card|card|כרטיס/i.test(text)) {
    makeOutput("flashcards", true);
    if (state.improved) {
      reply(`I can change the existing set for you. Choose which cards should be improved so nothing
             you are happy with is overwritten.`);
      setTimeout(() => { acts.improve(); render(); }, 1150);
    } else {
      // Baseline reproduces the original behavior: the whole set is rewritten
      // with no scope choice, no change markers and no undo.
      reply(`I've updated the flashcards.`);
      setTimeout(() => {
        if (!state.original) state.original = state.cards.map((c) => ({ ...c }));
        state.cards = state.cards.map((c) => revise(c, "detail", ""));
        state.changed = new Set();
        state.index = 0;
        state.flipped = false;
        track("baseline_bulk_update", "all 12 rewritten");
        render();
      }, 2400);
    }
  } else {
    reply(`Based on your source, sleep supports memory consolidation, emotional recovery and
           problem-solving. Deep sleep handles restoration and factual material, while REM supports
           emotional processing and creative recombination.<span class="cite" data-act="cite">1</span>`);
  }
  render();
}

/* ========================================================== events ===== */

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-act]");
  if (!btn) return;
  if (btn.dataset.act === "close-modal" && e.target.closest("[data-stop]") && e.target !== btn) return;
  const fn = acts[btn.dataset.act];
  if (!fn) return;
  fn(btn.dataset.value);
  render();
});

$("composer").addEventListener("keydown", (e) => { if (e.key === "Enter") { sendMessage(); render(); } });
$("composer").addEventListener("input", (e) => {
  $("send").classList.toggle("on", Boolean(e.target.value.trim()));
});

document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;
  if (e.key === "Escape" && state.modal) { state.modal = null; render(); return; }
  const open = state.outputs.find((o) => o.id === state.open);
  if (!open || open.type !== "flashcards") return;
  if (e.key === "ArrowRight") { acts.next(); render(); }
  if (e.key === "ArrowLeft") { acts.prev(); render(); }
  if (e.key === " ") { e.preventDefault(); acts.flip(); render(); }
});

/* ===================================================== facilitator ===== */

$("facMode").addEventListener("click", (e) => {
  state.improved = !state.improved;
  // Cancel any open guided flow so the participant never sees improved-mode UI
  // after the switch.
  clearInterval(ticker);
  Object.assign(state, {
    flow:null, scope:null, picked:new Set(), action:null, request:"",
    errorKey:null, errorMsg:"", progress:0, modal:null
  });
  e.target.textContent = state.improved
    ? "עבור למצב בסיס (לפני השיפור)"
    : "עבור למצב משופר (אחרי השיפור)";
  track("mode_switched", state.improved ? "improved" : "baseline");
  render();
});

$("facFail").addEventListener("click", (e) => {
  state.forceFail = !state.forceFail;
  e.target.classList.toggle("on", state.forceFail);
  e.target.textContent = state.forceFail ? "כשל מופעל — יופיע בעדכון הבא" : "הכשל את העדכון הבא";
});

$("facReset").addEventListener("click", () => {
  clearInterval(ticker);
  Object.assign(state, {
    sources:[{ id:1, name:"The Cognitive Architecture of Sleep", on:true }],
    messages:[{ role:"assistant", kind:"summary" }], busy:false,
    outputs:[], open:null, cards:DECK.map(([q, a]) => ({ q, a })), original:null,
    index:0, flipped:false, version:1, changed:new Set(), flow:null, scope:null,
    picked:new Set(), action:null, request:"", errorKey:null, errorMsg:"", progress:0,
    quizPick:null, modal:null, forceFail:false, collapsed:{ sources:false, studio:false }
  });
  $("facFail").classList.remove("on");
  $("facFail").textContent = "הכשל את העדכון הבא";
  track("reset");
  render();
});

$("facLog").addEventListener("click", () => {
  const csv = "time,mode,event,detail\n" +
    log.map((r) => `${r.t},${r.mode || "improved"},${r.event},"${String(r.detail).replace(/"/g, '""')}"`).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type:"text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `usability-log-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

const params = new URLSearchParams(location.search);
if (params.has("clean")) $("fac").style.display = "none";
if (params.has("baseline")) {
  state.improved = false;
  $("facMode").textContent = "עבור למצב משופר (אחרי השיפור)";
}

render();
