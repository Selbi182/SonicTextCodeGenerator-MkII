////////////////////
// Definitions

const DEFAULTS = {
  width: 16,
  sprite_format: 5,
  sprite_format_sub: 0
};
let spaceWidth = DEFAULTS.width;

const letter = (
    tile_offset,
    width = DEFAULTS.width,
    sprite_format = DEFAULTS.sprite_format,
    sprite_format_sub = DEFAULTS.sprite_format_sub,
    x_delta = 0,
    y_delta = 0,
    comment = null
  ) =>
    ({ tile_offset, width, sprite_format, sprite_format_sub, x_delta, y_delta, comment });

////////////////////
// Letter calc

function createLetterPiece(char, yPos, xPos, letters) {
  if (char === " ") {
    return {
      mapping: "\t\t\t\t\t\t; space",
      width: spaceWidth,
      invalid: false
    };
  }

  const l = getLetter(char, letters);
  if (l) {
    return {
      mapping: `\t\tdc.b `
        + `$${hex(yPos - l.y_delta)}, `
        + `$${hex(l.sprite_format)}, `
        + `$${hex(l.sprite_format_sub)}, `
        + `$${hex(l.tile_offset)}, `
        + `$${hex(xPos - l.x_delta)}`
        + `\t; ${l.comment ?? l.letter.toUpperCase()}`,
      width: l.width,
      invalid: false,
      comment: l.comment
    };
  }
  return {
    mapping: `\t\t; ${char.toUpperCase()} ${
      /^[A-Z]$/i.test(char)
        ? "does not exist in the Sonic 1 font"
        : "is an invalid character"
      }`,
    width: DEFAULTS.width,
    invalid: true
  };
}

function getLetter(ch, letters) {
  const l = letters[ch.toUpperCase()];
  if (!l) {
    return null; 
  }
  const sprite_format = l.sprite_format ?? DEFAULTS.sprite_format;
  const sprite_format_sub = l.sprite_format_sub ?? DEFAULTS.sprite_format_sub;
  const w = l.width ?? DEFAULTS.width;
  return {
    letter: ch,
    width: w,
    sprite_format: sprite_format,
    sprite_format_sub: sprite_format_sub,
    tile_offset: l.tile_offset,
    x_delta: l.x_delta,
    y_delta: l.y_delta,
    comment: l.comment
  };
}

function measureTextWidth(text, letters) {
  let w = 0;
  for (const ch of text) {
    if (ch === " ") {
      w += spaceWidth;
    } else {
      const l = getLetter(ch, letters);
      w += l ? l.width : DEFAULTS.width;
    }
  }
  return w & 0xFFFF;
}

////////////////////
// Helpers

// Convenience selector
const $ = sel => document.querySelector(sel);

function parseHexBase(str, fallback) {
  const cleaned = (str || "").trim().replace(/^\$/, "");
  if (!cleaned) {
    return fallback;
  }
  return parseInt(cleaned, 16);
}
function parseHex(str, fallback) {
  const n = parseHexBase(str, fallback);
  return Number.isFinite(n) ? (n & 0xFF) : fallback;
}

function parseHex16(str, fallback) {
  const n = parseHexBase(str, fallback);
  return Number.isFinite(n) ? (n & 0xFFFF) : fallback;
}

function hex(n) {
  return (n & 0xFF).toString(16).toUpperCase().padStart(2, "0");
}

function hex16(n) {
  return (n & 0xFFFF).toString(16).toUpperCase().padStart(4, "0");
}

function pluralize(num) {
  return num === 1 ? "" : "s";
}

function isENOZ(char) {
  return ["E", "N", "O", "Z"].includes(char);
}

function setStatus(message, summaryText = "", isError = false, isWarning = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
  status.classList.toggle("warning", isWarning);
  summary.textContent = summaryText;
};

////////////////////
// Clipboard

function copyToClipboard(el, sourceElem, inputCheck = true) {
  if (inputCheck && $("#text-in").value.length == 0) {
    alert("Type something first, you doofus.");
    return;
  }
  sourceElem.focus();
  sourceElem.select();
  document.execCommand("copy");
  el.value = "Copied!";
}

function resetClipboardButton(el, val) {
  el.value = val;
}

////////////////////
// Header and Footer

const mainContent = document.querySelector("body .wrap");

// Header
const header = document.createElement("header");
header.innerHTML = `
  <h1>
    <span class="sonic-font">Sonic Text Code Generator</span> <span class="small mkii">Mk.&nbsp;II</span>
  </h1>
  <div id="change-generator">
    <div class="row lc">
      <div class="badge">Sonic 1</div>
      <div>
        <a class="S1_titlecards" href="../../sonic1/titlecards">Zone Title Cards</a>
        &bull;
        <a class="S1_credits" href="../../sonic1/credits">Credits</a>
        &bull;
        <a class="S1_levelselect" href="../../sonic1/levelselect">Level Select</a>
        &bull;
        <a class="S1_misc" href="../../sonic1/misc">Misc</a>
      </div>
    </div>
    <div class="row lc">
      <div class="badge">Sonic 2</div>
      <div>
        <a class="S2_titlecards" href="../../sonic2/titlecards">Zone Title Cards</a>
        &bull;
        <a class="S2_endoflevel" href="../../sonic2/endoflevel">End of Level</a>
        &bull;
        <a class="S2_levelselect" href="../../sonic2/levelselect">Level Select</a>
        &bull;
        <a class="S2_misc" href="../../sonic2/misc">Misc</a>
      </div>
    </div>
  </div>
`;
if (window.location.protocol === "file:") {
  header.querySelectorAll("a").forEach(el => {
    el.href += `/${el.classList}.html`;
  });
  console.log("Running locally");
}
const stcgType = document.querySelector('meta[name="stcg_type"]')?.content;
header.querySelector(`a.${stcgType}`)?.classList.add("active");
mainContent.prepend(header);


// Footer
const footer = document.createElement("footer");
footer.innerHTML = `
  Created by <a href="https://selbi.club">Selbi</a> with help from RobiWanKenobi
  &bull;
  <a href="https://github.com/Selbi182/SonicTextCodeGenerator-MkII">Source Code</a>
`;
mainContent.append(footer);
