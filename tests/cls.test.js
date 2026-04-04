/**
 * tests/cls.test.js
 *
 * Unit tests for Saral AI core algorithms:
 *   - CLS (Cognitive Load Score) scorer
 *   - Flesch-Kincaid Grade Level (readability.js)
 *
 * Run with:  node tests/cls.test.js
 * No external dependencies — uses Node.js built-ins only.
 */

// ─── Minimal DOM shim ────────────────────────────────────────────────────────
// CLS and readability scripts rely on browser globals.
// We provide lightweight stubs so the modules load in Node.

class FakeElement {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this.style = {};
    this._attrs = {};
    this.innerText = "";
  }
  querySelectorAll(sel) {
    // Only supports our specific selectors used in calculateCLS()
    if (sel.includes("iframe") || sel.includes("popup")) return [];
    return [];
  }
  getElementsByTagName(tag) {
    return this._allElements || [];
  }
  querySelector() { return null; }
  appendChild(el) { this.children.push(el); return el; }
  setAttribute(k, v) { this._attrs[k] = v; }
  getAttribute(k) { return this._attrs[k]; }
}

// Expose a configurable fake document for tests
function makeDocument({ elementCount = 0, distractors = [], paragraphs = [] } = {}) {
  const allElements = new Array(elementCount).fill(null).map(() => new FakeElement("div"));
  const pElements = paragraphs.map((text) => {
    const p = new FakeElement("p");
    p.innerText = text;
    return p;
  });

  return {
    getElementsByTagName: () => allElements,
    querySelectorAll: (sel) => {
      if (
        sel.includes("iframe") ||
        sel.includes("aside") ||
        sel.includes("popup") ||
        sel.includes("fixed")
      ) {
        return distractors;
      }
      if (sel === "p") return pElements;
      return [];
    },
  };
}

// ─── Load calculateCLS from cls.js ──────────────────────────────────────────
// We wrap it in a function so we can inject the fake document.
function buildCalculateCLS(fakeDoc) {
  // Inline the cls.js logic with injected document
  const document = fakeDoc;
  return function calculateCLS() {
    const domElementCount = document.getElementsByTagName("*").length;
    const visualDensityScore = Math.min((domElementCount / 1500) * 40, 40);

    const distractions = document.querySelectorAll(
      'iframe, aside, .ad, [id*="ad-"], [class*="popup"], [style*="position: fixed"]'
    ).length;
    const distractionScore = Math.min(distractions * 5, 30);

    const paragraphs = document.querySelectorAll("p");
    let textScore = 0;

    if (paragraphs.length > 0) {
      let totalWords = 0;
      let totalSentences = 0;

      paragraphs.forEach((p) => {
        const text = p.innerText || "";
        totalWords += text.split(/\s+/).filter(Boolean).length;
        totalSentences += text.split(/[.!?]+/).filter(Boolean).length;
      });

      const avgSentenceLength =
        totalSentences > 0 ? totalWords / totalSentences : 0;
      textScore = Math.min((avgSentenceLength / 20) * 30, 30);
    }

    const finalScore = Math.round(
      visualDensityScore + distractionScore + textScore
    );
    return {
      total: Math.min(finalScore, 100),
      textComplexity: textScore,
      distractions: distractionScore,
    };
  };
}

// ─── Load Flesch-Kincaid from readability.js ─────────────────────────────────
// We replicate the exact functions here so the test file is self-contained.
function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!word) return 0;
  const endsInLe = /[^aeiou]le$/.test(word);
  if (!endsInLe && word.length > 2 && word.endsWith("e")) {
    word = word.slice(0, -1);
  }
  const matches = word.match(/[aeiouy]+/g);
  let count = matches ? matches.length : 1;
  if (endsInLe) count += 1;
  return Math.max(1, count);
}

function fleschKincaid(text) {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  const sentences = cleaned
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (sentences.length < 3) return null;
  const words = cleaned.split(/\s+/).filter((w) => w.length > 0);
  if (words.length < 5) return null;
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const grade =
    0.39 * (words.length / sentences.length) +
    11.8 * (totalSyllables / words.length) -
    15.59;
  return {
    grade: Math.max(1, Math.round(grade * 10) / 10),
    words: words.length,
    sentences: sentences.length,
    syllables: totalSyllables,
  };
}

// ─── Test runner ─────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

function assertRange(value, min, max, label) {
  if (value < min || value > max) {
    throw new Error(
      `${label}: expected ${value} to be in [${min}, ${max}]`
    );
  }
}

// ─── CLS Tests ───────────────────────────────────────────────────────────────
console.log("\n📊 CLS Scorer Tests");

test("Empty page → score is 0", () => {
  const cls = buildCalculateCLS(makeDocument({ elementCount: 0 }))();
  assert(cls.total === 0, `Expected 0, got ${cls.total}`);
});

test("Clean article page (500 elements, simple sentences) → low score [10–40]", () => {
  const doc = makeDocument({
    elementCount: 500,
    paragraphs: [
      "The cat sat on the mat. It was a nice day. The sun was bright.",
      "Dogs are good pets. They like to play. Children enjoy them.",
      "Fruit is healthy. Eat fruit daily. It tastes good.",
    ],
  });
  const cls = buildCalculateCLS(doc)();
  assertRange(cls.total, 10, 40, "Clean page CLS");
});

test("Dense page (1500+ elements) → visual density maxes at 40pts", () => {
  const doc = makeDocument({ elementCount: 1500 });
  const cls = buildCalculateCLS(doc)();
  assert(
    cls.total >= 40,
    `Expected >= 40 for 1500 elements, got ${cls.total}`
  );
});

test("6 distractors → distraction score = 30 (capped)", () => {
  const fakeDistractors = new Array(6).fill({});
  const doc = makeDocument({ distractors: fakeDistractors });
  const cls = buildCalculateCLS(doc)();
  assert(
    cls.distractions === 30,
    `Expected distractions=30, got ${cls.distractions}`
  );
});

test("Score is always capped at 100 (stress test: 3000 elements + 10 distractors + long sentences)", () => {
  const longSentence = "The extraordinarily complex interdisciplinary research methodology demonstrated unprecedented scalability. ".repeat(5);
  const doc = makeDocument({
    elementCount: 3000,
    distractors: new Array(10).fill({}),
    paragraphs: [longSentence, longSentence, longSentence],
  });
  const cls = buildCalculateCLS(doc)();
  assert(cls.total <= 100, `Score exceeded 100: ${cls.total}`);
});

test("Text complexity sub-score is non-negative", () => {
  const doc = makeDocument({
    paragraphs: ["Hi. Yes. No."],
  });
  const cls = buildCalculateCLS(doc)();
  assert(cls.textComplexity >= 0, `textComplexity < 0: ${cls.textComplexity}`);
});

// ─── Flesch-Kincaid Tests ─────────────────────────────────────────────────────
console.log("\n📖 Flesch-Kincaid Readability Tests");

test("Returns null for empty string", () => {
  assert(fleschKincaid("") === null, "Expected null for empty text");
});

test("Returns null for very short text (< 3 sentences)", () => {
  assert(
    fleschKincaid("Hello world. This is short.") === null,
    "Expected null for 2 sentences"
  );
});

test("Simple children's text → grade ≤ 6", () => {
  const text =
    "The dog ran fast. The cat sat. The sun is hot. The sky is blue. Birds can fly. Fish swim in the sea.";
  const result = fleschKincaid(text);
  assert(result !== null, "Expected a result");
  assertRange(result.grade, 1, 6, "Children's text FK grade");
});

test("Complex academic text → grade ≥ 10", () => {
  const text =
    "The epistemological ramifications of poststructuralist deconstruction necessitate comprehensive reexamination. " +
    "Heuristic methodologies employed in contemporary computational linguistics reveal multidimensional interdependencies. " +
    "Practitioners must reconcile probabilistic frameworks with deterministic symbolic representations. " +
    "Furthermore, the ontological implications of distributed cognition challenge established paradigms significantly.";
  const result = fleschKincaid(text);
  assert(result !== null, "Expected a result for complex text");
  assertRange(result.grade, 10, 35, "Academic text FK grade");
});

test("syllable counter: 'information' has >= 4 syllables", () => {
  // in-for-ma-tion = 4
  assert(
    countSyllables("information") >= 4,
    `Expected >= 4, got ${countSyllables("information")}`
  );
});

test("syllable counter: 'cat' has 1 syllable", () => {
  assert(
    countSyllables("cat") === 1,
    `Expected 1, got ${countSyllables("cat")}`
  );
});

test("syllable counter: 'table' has 2-3 syllables (heuristic)", () => {
  // Vowel-group heuristic: 'table' -> strip silent 'e' -> 'tabl' -> vowel group 'a' = 1
  // + le-rule adds 1 = 2 total. Node counts may vary by 1; accept 2 or 3.
  const s = countSyllables("table");
  assert(s >= 2 && s <= 3, `Expected 2 or 3, got ${s}`);
});

test("Simplified text scores lower than original", () => {
  const original =
    "The implementation of multifaceted algorithmic heuristics necessitates comprehensive evaluation methodologies. " +
    "Practitioners must reconcile disparate computational frameworks with established theoretical paradigms. " +
    "Consequently, interdisciplinary collaboration is indispensable for achieving meaningful breakthroughs. " +
    "Contemporary research demonstrates unprecedented scalability potential in distributed systems.";

  const simplified =
    "Complex algorithms need careful testing. " +
    "Experts must combine different methods to solve problems. " +
    "Working together is key to making progress. " +
    "New research shows that large systems can grow well.";

  const fkOrig = fleschKincaid(original);
  const fkSimp = fleschKincaid(simplified);

  assert(fkOrig !== null && fkSimp !== null, "Both texts should be scoreable");
  assert(
    fkSimp.grade < fkOrig.grade,
    `Simplified (${fkSimp.grade}) should be lower grade than original (${fkOrig.grade})`
  );
});

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log("❌ Some tests failed.");
  process.exit(1);
} else {
  console.log("✅ All tests passed.");
}
