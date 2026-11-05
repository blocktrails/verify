const $ = (id) => document.getElementById(id);

/** Short aliases that would otherwise break in ?uri= because of bare & */
const ALIASES = {
  "fund-agent": "https://blocktrails.org/fund-agent/blocktrails.json",
  datawiki: "examples/datawiki.json",
  "agent-trail": "examples/agent-trail.json",
};

function shorten(hex, head = 8, tail = 6) {
  if (!hex || hex.length <= head + tail + 1) return hex || "—";
  return `${hex.slice(0, head)}…${hex.slice(-tail)}`;
}

function entryUri(entry) {
  if (typeof entry === "string") return entry;
  if (entry && typeof entry === "object") return entry["@id"] || entry.uri || entry.txo || null;
  return null;
}

function parseTxo(entry) {
  const uri = entryUri(entry);
  if (!uri || typeof uri !== "string" || !uri.startsWith("txo:")) return null;
  const [head, query = ""] = uri.split("?");
  const parts = head.split(":");
  if (parts.length < 4) return null;
  const [, chain, txid, vout] = parts;
  const params = new URLSearchParams(query);
  return {
    uri,
    chain,
    txid,
    vout: Number(vout),
    amount: params.get("amount") ? Number(params.get("amount")) : null,
    pubkey: params.get("pubkey") || null,
    commit: params.get("commit") || null,
    byValue: !!(entry && typeof entry === "object" && (entry.hex || params.get("hex"))),
  };
}

function explorerTxUrl(chain, txid) {
  if (typeof explorer === "function") return explorer(chain, txid);
  return `https://mempool.space/tx/${txid}`;
}

function formatSats(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n.toLocaleString("en-US")} sats`;
}

/** Same rules as the verifier: directory URLs get blocktrails.json appended. */
function normalizeUri(raw) {
  let uri = String(raw || "").trim();
  if (!uri) return "";
  if (ALIASES[uri]) uri = ALIASES[uri];
  if (uri.startsWith("{") || uri.startsWith("data:") || uri.startsWith("txo:")) return uri;
  if (!/^(https?:\/\/|\.\/|\/|examples\/)/.test(uri)) {
    uri = "https://" + uri;
  }
  if (!/\.json(\?.*)?$/.test(uri) && !uri.startsWith("{") && !uri.startsWith("data:")) {
    uri = uri.replace(/\/?$/, "/") + "blocktrails.json";
  }
  return uri;
}

function resolveParam() {
  const params = new URLSearchParams(location.search);
  return params.get("src") || params.get("uri") || params.get("trail") || "";
}

async function fetchTrail(raw) {
  const uri = normalizeUri(raw);
  if (!uri) throw new Error("No trail URL given");

  if (uri.startsWith("{")) {
    return { data: JSON.parse(uri), source: "inline JSON", mode: "inline" };
  }
  if (uri.startsWith("data:")) {
    const res = await fetch(uri);
    return { data: await res.json(), source: "data URI", mode: "data" };
  }

  const url = new URL(uri, location.href);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch ${url.href} (${res.status})`);
  return { data: await res.json(), source: url.href, mode: "query" };
}

async function loadTrail() {
  const raw = resolveParam();
  if (raw) return fetchTrail(raw);

  const island = $("blocktrail-ld");
  if (island?.textContent?.trim()) {
    try {
      const data = JSON.parse(island.textContent);
      if (data && (data["@type"] === "Blocktrail" || data.profile || data.txo)) {
        return { data, source: "embedded JSON-LD", mode: "island" };
      }
    } catch {
      /* fall through */
    }
  }

  // First-visit demo: a two-mark trail so the timeline is obviously multi-step.
  return fetchTrail("examples/agent-trail.json");
}

function normalizeTrail(raw) {
  const genesis = parseTxo(raw["@id"]);
  const states = Array.isArray(raw.states) ? raw.states : [];
  const txos = (Array.isArray(raw.txo) ? raw.txo : []).map(parseTxo).filter(Boolean);

  return {
    type: raw["@type"] || "Blocktrail",
    version: raw.version || "—",
    profile: raw.profile || "—",
    pubkeyBase: raw.pubkeyBase || genesis?.pubkey || null,
    chain: raw.chain || genesis?.chain || txos[0]?.chain || "—",
    genesis,
    states,
    txos,
  };
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "className") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (v != null) node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

function kvRow(label, valueNode) {
  return el("div", {}, [el("dt", { text: label }), el("dd", {}, [valueNode])]);
}

function hashLink(label, value, href) {
  if (!value) return kvRow(label, "—");
  const content = href
    ? el("a", { href, target: "_blank", rel: "noopener noreferrer", text: value })
    : value;
  return kvRow(label, content);
}

function renderMeta(trail, source) {
  const meta = $("meta");
  meta.hidden = false;
  meta.className = "meta-grid";
  meta.replaceChildren(
    el("dl", {}, [el("dt", { text: "Profile" }), el("dd", { className: "plain", text: trail.profile })]),
    el("dl", {}, [el("dt", { text: "Chain" }), el("dd", { className: "plain", text: trail.chain })]),
    el("dl", {}, [el("dt", { text: "Version" }), el("dd", { className: "plain", text: String(trail.version) })]),
    el("dl", {}, [el("dt", { text: "Source" }), el("dd", { text: source.replace(/^https?:\/\//, "") })]),
    el("dl", {}, [el("dt", { text: "Base pubkey" }), el("dd", { text: trail.pubkeyBase || "—" })]),
    el("dl", {}, [el("dt", { text: "Marks" }), el("dd", { className: "plain", text: String(trail.txos.length) })])
  );
}

function renderStep({ kind, index, state, txo, delay }) {
  const isGenesis = kind === "genesis";
  const isTip = kind === "tip";
  const label = isGenesis ? "Genesis" : isTip ? `Mark ${index} · tip` : `Mark ${index}`;
  const title = isGenesis
    ? "Funding output"
    : state
      ? `Commit ${shorten(state, 7, 0)}`
      : `Output ${index}`;

  const rows = [];
  if (txo?.amount != null) {
    rows.push(
      el("div", {}, [
        el("dt", { text: "Amount" }),
        el("dd", { className: "amount", text: formatSats(txo.amount) }),
      ])
    );
  }
  if (state) rows.push(kvRow("State / commit", state));
  if (txo?.txid) {
    rows.push(
      hashLink("Transaction", `${shorten(txo.txid)}:${txo.vout}`, explorerTxUrl(txo.chain, txo.txid))
    );
  }
  if (txo?.byValue) rows.push(kvRow("Proof", "mark by value (bytes in trail)"));
  if (txo?.pubkey) rows.push(kvRow("Pubkey", txo.pubkey));
  if (txo?.uri) rows.push(kvRow("TXO URI", txo.uri));

  return el(
    "article",
    {
      className: `step${isGenesis ? " is-genesis" : ""}${isTip ? " is-tip" : ""}`,
      style: `animation-delay: ${delay}s`,
    },
    [
      el("p", { className: "step-label", text: label }),
      el("h2", { className: "step-title", text: title }),
      el("dl", { className: "kv" }, rows),
    ]
  );
}

function renderTrail(trail) {
  const root = $("trail");
  const steps = [];

  if (trail.genesis) {
    steps.push(
      renderStep({ kind: "genesis", index: 0, state: null, txo: trail.genesis, delay: 0.15 })
    );
  }

  trail.txos.forEach((txo, i) => {
    const state = txo.commit || trail.states[i] || null;
    const isTip = i === trail.txos.length - 1;
    steps.push(
      renderStep({
        kind: isTip ? "tip" : "mark",
        index: i + 1,
        state,
        txo,
        delay: 0.22 + i * 0.1,
      })
    );
  });

    if (!steps.length) {
    root.replaceChildren(
      el("p", {
        className: "status-msg",
        text: "Trail has no marks yet — genesis only, or an empty gitmark tip.",
      })
    );
    return;
  }

  root.replaceChildren(...steps);
}

function setLede(trail) {
  const n = trail.txos.length;
  const profile = trail.profile !== "—" ? trail.profile : "blocktrail";
  $("lede").textContent =
    n === 0
      ? `Empty ${profile} trail on ${trail.chain}.`
      : `${n} mark${n === 1 ? "" : "s"} · ${profile} · ${trail.chain}`;
}

function setCrossLinks(sourceHref) {
  const usable =
    sourceHref &&
    sourceHref !== "embedded JSON-LD" &&
    sourceHref !== "inline JSON" &&
    sourceHref !== "data URI";
  if (window.blocktrailsNav) {
    window.blocktrailsNav.sync(usable ? sourceHref : "");
  }
}

function syncForm(raw) {
  const input = $("uri");
  if (input && raw && !raw.startsWith("{")) input.value = raw;
}

async function show(raw) {
  const status = $("status");
  status.className = "status-msg";
  status.textContent = "Opening trail…";
  $("trail").replaceChildren(status);
  $("meta").hidden = true;

  try {
    const loaded = raw ? await fetchTrail(raw) : await loadTrail();
    const trail = normalizeTrail(loaded.data);
    document.title = `Blocktrail · ${trail.profile}`;
    setLede(trail);
    renderMeta(trail, loaded.source);
    renderTrail(trail);
    const share =
      loaded.mode === "query" || loaded.mode === "data" ? loaded.source : "";
    if (loaded.mode === "query") {
      const path = loaded.source;
      const abs = path.startsWith("http") ? path : new URL(path, location.href).href;
      history.replaceState(null, "", location.pathname + "?uri=" + encodeURIComponent(abs));
      setCrossLinks(abs);
    } else {
      setCrossLinks(share);
    }
  } catch (err) {
    console.error(err);
    $("lede").textContent = "Could not open this trail.";
    status.className = "error";
    status.textContent = err.message || String(err);
    setCrossLinks("");
  }
}

function main() {
  const raw = resolveParam();
  syncForm(raw || "examples/agent-trail.json");

  $("form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const next = $("uri").value.trim();
    if (!next) return;
    const href = location.pathname + "?uri=" + encodeURIComponent(normalizeUri(next));
    history.pushState(null, "", href);
    show(next);
  });

  window.addEventListener("popstate", () => {
    const again = resolveParam();
    syncForm(again || "examples/agent-trail.json");
    show(again || null);
  });

  show(raw || null);
}

main();
