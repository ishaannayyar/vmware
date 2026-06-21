/* ===========================================================
   EXIT SIGNAL — VMware Renewal Readiness Assessment
   Self-contained client-side scoring tool. No backend required.
   =========================================================== */

/* ---- CONFIG: set your contact email for the "send result" button ---- */
const ADVISOR_EMAIL = "you@yourfirm.com";

/* ---- CATEGORY WEIGHTS (must sum to 1.0) ---- */
const WEIGHTS = {
  cost: 0.25,
  lockin: 0.30,
  risk: 0.20,
  readiness: 0.15,
  timing: 0.10,
};

const CATEGORY_LABELS = {
  cost: "Cost pressure",
  lockin: "Technical lock-in (NSX / vSAN / Tanzu)",
  risk: "Workload risk profile",
  readiness: "Organizational readiness",
  timing: "Strategic timing",
};

/* ===========================================================
   QUESTION BANK
   type: "single" (radio, scored or informational) | "number" | "checkbox"
   category: null for informational-only questions
   options: { label, points (0-4) }
   =========================================================== */
const SECTIONS = [
  {
    id: "A",
    title: "Environment scale",
    desc: "Basic footprint. This sets context for everything else — it isn't scored directly, except where host density affects Broadcom's per-core minimum.",
    questions: [
      {
        id: "A1", type: "number", category: null,
        text: "How many physical sites or datacenters run VMware?",
        placeholder: "e.g. 3",
      },
      {
        id: "A2", type: "number", category: null,
        text: "How many ESXi hosts in total?",
        placeholder: "e.g. 40",
      },
      {
        id: "A4", type: "number", category: null,
        text: "Roughly how many VMs are running today?",
        placeholder: "e.g. 600",
      },
      {
        id: "A3", type: "single", category: "cost",
        text: "Typical physical cores per CPU socket on your hosts?",
        help: "Broadcom bills a 16-core-per-socket minimum regardless of actual count. Lower core counts mean you're paying for cores you don't have.",
        options: [
          { label: "16 or more — no minimum penalty", points: 0 },
          { label: "12–15 cores", points: 2 },
          { label: "8–11 cores", points: 3 },
          { label: "Fewer than 8 cores", points: 4 },
        ],
      },
      {
        id: "A5", type: "single", category: "cost",
        text: "Average age of your host hardware?",
        help: "Older, smaller-core hosts both waste more against the licensing minimum and are usually due for refresh anyway — which makes a platform switch cheaper to bundle in.",
        options: [
          { label: "Under 2 years", points: 0 },
          { label: "2–4 years", points: 1 },
          { label: "4–6 years", points: 3 },
          { label: "6+ years", points: 4 },
        ],
      },
    ],
  },
  {
    id: "B",
    title: "Current VMware footprint",
    desc: "What you're actually licensed for today, and what Broadcom is asking for next.",
    questions: [
      {
        id: "B1", type: "checkbox", category: null,
        text: "Which VMware products are in production use?",
        options: ["vSphere / ESXi", "vSAN", "NSX", "Aria Suite / vRealize", "Horizon (VDI)", "Site Recovery Manager (SRM)", "Tanzu"],
      },
      {
        id: "B2", type: "single", category: null,
        text: "Current licensing state?",
        options: [
          { label: "Legacy perpetual + SnS", points: 0 },
          { label: "Already moved to VCF", points: 0 },
          { label: "Already moved to VVF", points: 0 },
          { label: "Not sure", points: 0 },
        ],
      },
      {
        id: "B3", type: "single", category: "timing",
        text: "When does your current term / SnS renew?",
        options: [
          { label: "Already renewed — locked in", points: 0 },
          { label: "More than 24 months out", points: 1 },
          { label: "12–24 months", points: 2 },
          { label: "6–12 months", points: 3 },
          { label: "Under 6 months", points: 4 },
        ],
      },
      {
        id: "B4", type: "single", category: "cost",
        text: "If you've received a renewal quote, what's the increase versus prior spend?",
        options: [
          { label: "Haven't received a quote yet", points: 2 },
          { label: "Less than 1.5x", points: 0 },
          { label: "1.5x – 2x", points: 1 },
          { label: "2x – 3x", points: 2 },
          { label: "3x – 5x", points: 3 },
          { label: "More than 5x", points: 4 },
        ],
      },
    ],
  },
  {
    id: "C",
    title: "Workload profile",
    desc: "What's actually running, and how much room for error you have.",
    questions: [
      {
        id: "C1", type: "single", category: "risk",
        text: "How would you describe the bulk of your workloads?",
        options: [
          { label: "Mostly specialized or legacy, undocumented dependencies", points: 0 },
          { label: "A real mix", points: 2 },
          { label: "Mostly general-purpose VMs", points: 4 },
        ],
      },
      {
        id: "C2", type: "single", category: "risk",
        text: "What share is Tier 0 / mission-critical (can't tolerate downtime)?",
        options: [
          { label: "More than 60%", points: 0 },
          { label: "30–60%", points: 1 },
          { label: "10–30%", points: 3 },
          { label: "Under 10%", points: 4 },
        ],
      },
      {
        id: "C3", type: "single", category: "risk",
        text: "Any regulatory or data-residency constraints on infrastructure choices?",
        options: [
          { label: "Yes, strict (specific certifications, sovereignty requirements)", points: 0 },
          { label: "Some, manageable", points: 2 },
          { label: "None of note", points: 4 },
        ],
      },
      {
        id: "C4", type: "single", category: "risk",
        text: "How is disaster recovery architected today?",
        options: [
          { label: "Site Recovery Manager (SRM) — VMware-specific", points: 0 },
          { label: "No formal DR in place", points: 2 },
          { label: "Backup-based only", points: 3 },
          { label: "Storage-array-based replication (hypervisor-agnostic)", points: 4 },
        ],
      },
    ],
  },
  {
    id: "D",
    title: "Technical lock-in",
    desc: "This is the section that decides most of the answer. NSX and vSAN dependency are the two hardest things to walk away from.",
    questions: [
      {
        id: "D1", type: "single", category: "lockin",
        text: "Is NSX used for micro-segmentation or overlay networking in production?",
        options: [
          { label: "Yes — core to the architecture", points: 0 },
          { label: "Used, but lightly", points: 2 },
          { label: "Not used", points: 4 },
        ],
      },
      {
        id: "D2", type: "single", category: "lockin",
        text: "Is vSAN your primary storage?",
        options: [
          { label: "Yes, vSAN is primary storage", points: 0 },
          { label: "Mixed — vSAN and third-party storage", points: 2 },
          { label: "No — third-party storage (NetApp, Pure, HPE, etc.)", points: 4 },
        ],
      },
      {
        id: "D3", type: "single", category: "lockin",
        text: "Are Tanzu or other containers running on this platform in production?",
        options: [
          { label: "Heavily — core workloads", points: 0 },
          { label: "Some workloads", points: 2 },
          { label: "Not used", points: 4 },
        ],
      },
      {
        id: "D4", type: "single", category: "lockin",
        text: "How much custom automation is built directly on vSphere APIs / PowerCLI?",
        options: [
          { label: "Deeply integrated — significant rework needed elsewhere", points: 0 },
          { label: "Some scripts, moderate effort to replace", points: 2 },
          { label: "Little to none", points: 4 },
        ],
      },
    ],
  },
  {
    id: "E",
    title: "Organizational readiness",
    desc: "Even a technically easy migration fails without the team, time, and budget to run it.",
    questions: [
      {
        id: "E1", type: "single", category: "readiness",
        text: "In-house infrastructure skills beyond VMware?",
        options: [
          { label: "VMware-only", points: 0 },
          { label: "Some exposure to alternatives", points: 2 },
          { label: "Strong multi-platform team (Hyper-V, KVM, cloud, etc.)", points: 4 },
        ],
      },
      {
        id: "E2", type: "single", category: "readiness",
        text: "Bandwidth available for a migration project?",
        options: [
          { label: "None — team is fully loaded", points: 0 },
          { label: "Partial — squeezed in alongside other work", points: 2 },
          { label: "Dedicated team or budget for one", points: 4 },
        ],
      },
      {
        id: "E3", type: "single", category: "readiness",
        text: "Is migration budget allocated?",
        options: [
          { label: "No", points: 0 },
          { label: "Being discussed", points: 2 },
          { label: "Yes, approved", points: 4 },
        ],
      },
      {
        id: "E4", type: "single", category: "readiness",
        text: "Organizational risk appetite for infrastructure change?",
        options: [
          { label: "Conservative — stability is the priority", points: 0 },
          { label: "Moderate", points: 2 },
          { label: "Aggressive — comfortable moving fast", points: 4 },
        ],
      },
    ],
  },
  {
    id: "F",
    title: "Strategic context",
    desc: "The last piece — what else is already in motion that this decision should align with.",
    questions: [
      {
        id: "F1", type: "single", category: "timing",
        text: "Is there an active cloud-first or hybrid strategy already underway?",
        options: [
          { label: "No", points: 0 },
          { label: "Partial / early stage", points: 2 },
          { label: "Yes, actively in motion", points: 4 },
        ],
      },
      {
        id: "F2", type: "single", category: "timing",
        text: "Any M&A, divestiture, or datacenter consolidation in progress?",
        options: [
          { label: "No", points: 1 },
          { label: "Possibly, under discussion", points: 2 },
          { label: "Yes, actively happening", points: 4 },
        ],
      },
    ],
  },
];

/* ===========================================================
   STATE
   =========================================================== */
const state = {
  currentSection: -1, // -1 = intro
  answers: {}, // questionId -> points (for scored) or value (for informational)
};

const appEl = document.getElementById("questionScreens");
const meterFill = document.getElementById("meterFill");

/* ===========================================================
   RENDER: question sections
   =========================================================== */
function buildSectionScreens() {
  SECTIONS.forEach((section, idx) => {
    const el = document.createElement("section");
    el.className = "screen";
    el.dataset.screen = `section-${idx}`;
    el.hidden = true;

    let html = `<div class="panel">
      <div class="q-section-label">SECTION ${section.id} — ${idx + 1} OF ${SECTIONS.length}</div>
      <h2 class="q-section-title">${section.title}</h2>
      <p class="q-section-desc">${section.desc}</p>`;

    section.questions.forEach((q) => {
      html += `<div class="question" data-qid="${q.id}">
        <div class="question-text">${q.text}</div>`;
      if (q.help) html += `<div class="question-help">${q.help}</div>`;

      if (q.type === "number") {
        html += `<div class="options">
          <input type="number" min="0" class="num-input" data-qid="${q.id}"
            placeholder="${q.placeholder || ""}"
            style="background:var(--panel-2);border:1px solid var(--line);border-radius:6px;padding:13px 16px;color:var(--ink);font-family:var(--font-mono);font-size:15px;width:160px;">
        </div>`;
      } else if (q.type === "checkbox") {
        html += `<div class="options">`;
        q.options.forEach((opt, i) => {
          html += `<label class="option" data-qid="${q.id}" data-idx="${i}">
            <input type="checkbox" name="${q.id}" value="${opt}">
            <span class="option-label">${opt}</span>
          </label>`;
        });
        html += `</div>`;
      } else {
        html += `<div class="options">`;
        q.options.forEach((opt, i) => {
          html += `<label class="option" data-qid="${q.id}" data-idx="${i}">
            <input type="radio" name="${q.id}" value="${i}">
            <span class="option-label">${opt.label}</span>
          </label>`;
        });
        html += `</div>`;
      }
      html += `</div>`;
    });

    html += `<div class="q-nav">
        <button class="btn btn-ghost" data-action="back">← Back</button>
        <span class="q-progress">SECTION ${idx + 1} / ${SECTIONS.length}</span>
        <button class="btn btn-primary" data-action="next">${idx === SECTIONS.length - 1 ? "See my result →" : "Next →"}</button>
      </div>
    </div>`;

    el.innerHTML = html;
    appEl.appendChild(el);
  });
}

function wireOptionClicks() {
  appEl.querySelectorAll(".option").forEach((optEl) => {
    optEl.addEventListener("click", () => {
      const input = optEl.querySelector("input");
      const qid = optEl.dataset.qid;

      if (input.type === "radio") {
        const group = appEl.querySelectorAll(`.option[data-qid="${qid}"]`);
        group.forEach((g) => g.classList.remove("selected"));
        optEl.classList.add("selected");
        input.checked = true;
      } else if (input.type === "checkbox") {
        input.checked = !input.checked;
        optEl.classList.toggle("selected", input.checked);
      }
    });
  });
}

/* ===========================================================
   NAVIGATION
   =========================================================== */
function showScreen(target) {
  document.querySelectorAll(".screen").forEach((s) => (s.hidden = true));
  if (target === "intro") {
    document.getElementById("screen-intro").hidden = false;
    meterFill.style.width = "0%";
  } else if (target === "results") {
    document.getElementById("screen-results").hidden = false;
    meterFill.style.width = "100%";
  } else {
    document.querySelector(`[data-screen="section-${target}"]`).hidden = false;
    meterFill.style.width = `${((target + 1) / SECTIONS.length) * 92}%`;
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function collectSection(idx) {
  const section = SECTIONS[idx];
  section.questions.forEach((q) => {
    if (q.type === "number") {
      const input = appEl.querySelector(`.num-input[data-qid="${q.id}"]`);
      state.answers[q.id] = input.value ? Number(input.value) : null;
    } else if (q.type === "checkbox") {
      const checked = Array.from(
        appEl.querySelectorAll(`input[name="${q.id}"]:checked`)
      ).map((c) => c.value);
      state.answers[q.id] = checked;
    } else {
      const checked = appEl.querySelector(`input[name="${q.id}"]:checked`);
      if (checked) {
        const points = q.options[Number(checked.value)].points;
        state.answers[q.id] = { idx: Number(checked.value), points, category: q.category };
      } else {
        state.answers[q.id] = null;
      }
    }
  });
}

document.getElementById("startBtn").addEventListener("click", () => {
  state.currentSection = 0;
  showScreen(0);
});

appEl.addEventListener("click", (e) => {
  const action = e.target.dataset.action;
  if (!action) return;

  if (action === "next") {
    collectSection(state.currentSection);
    if (state.currentSection < SECTIONS.length - 1) {
      state.currentSection += 1;
      showScreen(state.currentSection);
    } else {
      computeAndRenderResults();
      showScreen("results");
    }
  } else if (action === "back") {
    if (state.currentSection === 0) {
      showScreen("intro");
      state.currentSection = -1;
    } else {
      state.currentSection -= 1;
      showScreen(state.currentSection);
    }
  }
});

document.getElementById("restartBtn").addEventListener("click", () => {
  state.currentSection = -1;
  state.answers = {};
  appEl.querySelectorAll("input[type=radio], input[type=checkbox]").forEach((i) => (i.checked = false));
  appEl.querySelectorAll(".option").forEach((o) => o.classList.remove("selected"));
  appEl.querySelectorAll(".num-input").forEach((i) => (i.value = ""));
  showScreen("intro");
});

document.getElementById("printBtn").addEventListener("click", () => window.print());

/* ===========================================================
   SCORING
   =========================================================== */
function computeScores() {
  const categoryTotals = { cost: [], lockin: [], risk: [], readiness: [], timing: [] };

  Object.values(state.answers).forEach((a) => {
    if (a && typeof a === "object" && "category" in a && a.category) {
      categoryTotals[a.category].push(a.points);
    }
  });

  const categoryPct = {};
  Object.keys(categoryTotals).forEach((cat) => {
    const arr = categoryTotals[cat];
    const avg = arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
    categoryPct[cat] = (avg / 4) * 100; // 0-4 scale -> 0-100
  });

  let total = 0;
  Object.keys(WEIGHTS).forEach((cat) => {
    total += categoryPct[cat] * WEIGHTS[cat];
  });

  return { categoryPct, total: Math.round(total) };
}

function getTier(score) {
  if (score >= 75) {
    return {
      key: "exit",
      label: "Strong exit candidate",
      color: "var(--tier-green)",
      sub: "Low technical lock-in, real cost pressure, and reasonable readiness. This renewal is a credible trigger to actually move.",
    };
  } else if (score >= 45) {
    return {
      key: "phase",
      label: "Phased / conditional candidate",
      color: "var(--tier-amber)",
      sub: "Mixed signals — usually partial NSX or vSAN dependency. A split approach beats an all-or-nothing one here.",
    };
  } else {
    return {
      key: "stay",
      label: "Negotiate & optimize — stay for now",
      color: "var(--tier-red)",
      sub: "Lock-in, workload risk, or readiness gaps make a full migration premature. Optimize the current footprint and negotiate hard instead.",
    };
  }
}

function buildRecommendation(score, categoryPct, tierKey) {
  const lines = [];

  if (tierKey === "exit") {
    lines.push(`<p><strong>Build the migration plan now.</strong> Your NSX/vSAN footprint is light enough, and the cost pressure is real enough, that this renewal is the right trigger to move — not just threaten to.</p>`);
    lines.push(`<p>Start with a 90-day pilot on a non-critical workload pool to validate the target platform before committing the full estate.</p>`);
  } else if (tierKey === "phase") {
    lines.push(`<p><strong>Split the estate.</strong> Migrate the NSX/vSAN-free portion first — usually general-purpose VMs and dev/test — while keeping the NSX or vSAN-dependent core on VMware.</p>`);
    lines.push(`<p>For what stays, check whether you're overpaying: confirm you actually need VCF, or whether VVF covers the real workload mix.</p>`);
  } else {
    lines.push(`<p><strong>Don't migrate yet.</strong> Heavy NSX/vSAN/Tanzu dependency, workload risk, or limited internal readiness make a near-term move expensive and risky.</p>`);
    lines.push(`<p>Instead: consolidate hosts to beat the 16-core-per-socket minimum, right-size the bundle (VVF vs. VCF) against actual usage, and still build a costed exit plan to use as negotiation leverage.</p>`);
  }

  if (categoryPct.lockin < 35) {
    lines.push(`<p>Your <strong>technical lock-in</strong> score is the main blocker — NSX and/or vSAN are deeply embedded. Any exit plan needs to budget real time and cost for replacing those specifically, not just the hypervisor layer.</p>`);
  }
  if (categoryPct.readiness < 35) {
    lines.push(`<p><strong>Organizational readiness</strong> is currently the limiting factor, more than the technology. Worth fixing this before — or in parallel with — any platform decision.</p>`);
  }

  return lines.join("");
}

function buildPlatformSuggestions(answers) {
  const nsx = answers.D1 ? answers.D1.points : 2;
  const vsan = answers.D2 ? answers.D2.points : 2;
  const tanzu = answers.D3 ? answers.D3.points : 2;
  const cloudFirst = answers.F1 ? answers.F1.points : 0;
  const budget = answers.E3 ? answers.E3.points : 0;

  const rows = [];

  if (nsx >= 3 && vsan >= 3) {
    rows.push({ name: "Proxmox VE", why: "No NSX or vSAN dependency, low cost — the most common exit path for estates without heavy SDN/HCI lock-in." });
    rows.push({ name: "Microsoft Hyper-V / Azure Stack HCI", why: "Strong fit if already a Microsoft shop, or if Active Directory integration matters." });
  }
  if (nsx <= 1) {
    rows.push({ name: "Nutanix AHV (with Flow for networking)", why: "Closest like-for-like replacement for NSX-dependent micro-segmentation." });
  }
  if (tanzu <= 1) {
    rows.push({ name: "Red Hat OpenShift Virtualization", why: "Natural fit if you're containerizing workloads anyway." });
  }
  if (cloudFirst >= 2) {
    rows.push({ name: "Azure VMware Solution (bridge) → native refactor", why: "Lets you exit the license model immediately while re-architecting on your own timeline." });
  }
  if (budget <= 1 && nsx >= 3 && vsan >= 3) {
    rows.push({ name: "XCP-ng", why: "Open-source, minimal licensing cost — worth evaluating if budget is the binding constraint." });
  }

  if (rows.length === 0) {
    rows.push({ name: "Stay on VMware (VVF or VCF, right-sized)", why: "Given your NSX/vSAN footprint, a full exit isn't the efficient move right now — focus on optimizing the license fit instead." });
  }

  // de-dupe by name, cap at 4
  const seen = new Set();
  return rows.filter((r) => (seen.has(r.name) ? false : (seen.add(r.name), true))).slice(0, 4);
}

/* ===========================================================
   RENDER RESULTS
   =========================================================== */
function computeAndRenderResults() {
  const { categoryPct, total } = computeScores();
  const tier = getTier(total);

  document.getElementById("resultEyebrow").textContent = `SCORE: ${total} / 100`;
  document.getElementById("resultTier").textContent = tier.label;
  document.getElementById("resultTier").style.color = tier.color;
  document.getElementById("resultSub").textContent = tier.sub;
  document.getElementById("gaugeScoreNum").textContent = total;

  requestAnimationFrame(() => {
    document.getElementById("gaugeNeedle").style.left = `${total}%`;
  });

  const catBarsEl = document.getElementById("catBars");
  catBarsEl.innerHTML = "";
  Object.keys(CATEGORY_LABELS).forEach((cat) => {
    const pct = Math.round(categoryPct[cat]);
    const row = document.createElement("div");
    row.className = "cat-bar-row";
    row.innerHTML = `
      <div class="cat-bar-name">${CATEGORY_LABELS[cat]}</div>
      <div class="cat-bar-pct">${pct}%</div>
      <div class="cat-bar-track"><div class="cat-bar-fill" style="width:0%" data-target="${pct}"></div></div>
    `;
    catBarsEl.appendChild(row);
  });
  requestAnimationFrame(() => {
    catBarsEl.querySelectorAll(".cat-bar-fill").forEach((el) => {
      el.style.width = el.dataset.target + "%";
    });
  });

  document.getElementById("recommendation").innerHTML = buildRecommendation(total, categoryPct, tier.key);

  const platforms = buildPlatformSuggestions(state.answers);
  const platformEl = document.getElementById("platformSuggestion");
  platformEl.innerHTML = "";
  platforms.forEach((p) => {
    const row = document.createElement("div");
    row.className = "platform-row";
    row.innerHTML = `<div><strong>${p.name}</strong><div class="why">${p.why}</div></div>`;
    platformEl.appendChild(row);
  });

  // build mailto
  const subject = encodeURIComponent(`VMware Exit Signal result: ${total}/100 — ${tier.label}`);
  const bodyLines = [
    `Exit Signal result`,
    `Score: ${total}/100 — ${tier.label}`,
    ``,
    `Category breakdown:`,
    ...Object.keys(CATEGORY_LABELS).map((c) => `- ${CATEGORY_LABELS[c]}: ${Math.round(categoryPct[c])}%`),
    ``,
    `Sites: ${state.answers.A1 ?? "—"} | Hosts: ${state.answers.A2 ?? "—"} | VMs: ${state.answers.A4 ?? "—"}`,
    ``,
    `Sent from Exit Signal assessment tool.`,
  ];
  const body = encodeURIComponent(bodyLines.join("\n"));
  document.getElementById("emailBtn").onclick = () => {
    window.location.href = `mailto:${ADVISOR_EMAIL}?subject=${subject}&body=${body}`;
  };
}

/* ===========================================================
   INIT
   =========================================================== */
buildSectionScreens();
wireOptionClicks();
showScreen("intro");
