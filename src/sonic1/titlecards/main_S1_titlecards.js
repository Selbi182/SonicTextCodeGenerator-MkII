// Letter mapping definitions
const LETTERS = {
  A: letter(0x00),
  B: letter(0x04),
  C: letter(0x08),
  D: letter(0x0C),
  E: letter(0x10),
  F: letter(0x14),
  G: letter(0x18),
  H: letter(0x1C),
  I: letter(0x20, 8, 1), // I is half-width
  // (J is unsupported)
  K: letter(0x22),
  L: letter(0x26),
  M: letter(0x2A, 17), // M is one pixel wider
  N: letter(0x2E),
  O: letter(0x32),
  P: letter(0x36),
  // (Q is unsupported)
  R: letter(0x3A),
  S: letter(0x3E),
  T: letter(0x42),
  U: letter(0x46),
  // (V is unsupported)
  W: letter(0x2A, 18, 5, 0x10, 0, 1, "W (unsupported, this is a rotated M as dirty workaround)"),
  // (X is unsupported)
  Y: letter(0x4A),
  Z: letter(0x4E)
};

// Select relevant DOM elements
const inputText = $("#text-in");
const inputX = $("#x-pos");
const inputY = $("#y-pos");
const out = $("#text-out");
const status = $("#status");
const summary = $("#summary");
const condataOut = $("#condata-out");

const checkboxAct = $("#check-act");
const checkboxZone = $("#check-zone");
const checkboxOval = $("#check-oval");

// Set up clipboard buttons
const clipboard = $("#clipboard");
const clipboardCon = $("#clipboard-condata-out");
clipboard.onclick = () => copyToClipboard(clipboard, out);
clipboardCon.onclick = () => copyToClipboard(clipboardCon, condataOut);

// Register input event listeners
[inputText, inputX, inputY, checkboxAct, checkboxZone, checkboxOval].forEach(el => el.addEventListener("input", generateOutput));
generateOutput();

////////////////////
// Main generator

function generateOutput() {
  
  // Fetch input data
  const text = (inputText.value || "");
  const yPos = parseHex(inputY.value, 0xF8);
  const isAutoX = (inputX.value.trim() === "" && text);
  const xStartAuto = Math.max(0x80, (Math.floor(-measureTextWidth(text, LETTERS) / 2.0)) & 0xFF);
  const xStartManual = parseHex(inputX.value, 0x80);

  // Initialize output data
  let xPos = isAutoX ? xStartAuto : xStartManual;
  let title = "";
  let spriteCount = 0;
  let invalidCount = 0;
  let overflow = false;
  let lines = [];

  // Generate sprite mapping for each char
  for (const ch of text) {
    const piece = createLetterPiece(ch, yPos, xPos, LETTERS);
    lines.push(piece.mapping);
    if (!piece.invalid) {
      title += ch;
      if (!piece.mapping.trim().startsWith(";")) {
        spriteCount++;
      }
    }

    if (xPos < 0x80 && ((xPos + piece.width) & 0xFF) >= 0x80) {
      overflow = true;
    }  

    xPos = (xPos + piece.width) & 0xFF;
    if (piece.invalid || !!piece.comment) {
      invalidCount++;
    }
  }
  
  // Compile and output mappings
  let output = "";
  if (lines.length) {
    const comment = title ? `\t; ${title.toUpperCase()}` : "";
    lines.unshift(`\tdc.b ${spriteCount}${comment}`);
    lines.push(`\t\teven`);
    output = lines.join("\n");
  }
  out.textContent = output;

  // Generate ConData
  if (text) {
    const w = measureTextWidth(text, LETTERS);
    const offset = isAutoX ? 0 : (xStartManual - xStartAuto);
    
    const showAct = checkboxAct.querySelector("input[type=checkbox]").checked ?? true;
    const showZone = checkboxZone.querySelector("input[type=checkbox]").checked ?? true;
    const showOval = checkboxOval.querySelector("input[type=checkbox]").checked ?? true;
    
    const conDataLine = buildConData(title, w, offset, showAct, showZone, showOval);
    $("#condata-out").value = conDataLine;
  } else {
    $("#condata-out").value = "";
  }

  // Update status
  if (!text) {
    setStatus('Ready to generate');
  } else if (overflow) {
    setStatus('Generated with errors', 'Text overflow, pick a shorter name!', true);
  } else if (invalidCount > 0) {
    setStatus('Generated with warnings', `(${invalidCount} unsupported char${pluralize(invalidCount)})`, false, true);
  } else {
    setStatus('Generated', `(${spriteCount} sprite mapping${pluralize(spriteCount)})`);
  }

  resetClipboardButtons();
}

////////////////////
// ConData generator

function buildConData(title, textWidth, offset = 0, showAct = true, showZone = true, showOval = true) {
  const OFFSCREEN = 0x03EC;
  
  const noActAdjust = (showAct ? 0 : 0x10);

  const widthHalf = Math.floor(textWidth / 2.0);
  
  const NAME_start  = 0x0000;
  const NAME_target = 0x0120;

  const ZONE_target = (0x00F0 + widthHalf + noActAdjust + offset) & 0xFFFF;
  const ZONE_start  = (ZONE_target - 0x0240 + noActAdjust) & 0xFFFF;

  const OVAL_target = (ZONE_target + 0x0018 - noActAdjust) & 0xFFFF;
  const OVAL_start  = (OVAL_target + 0x00C0 - noActAdjust) & 0xFFFF;

  const ACT_target  = OVAL_target;
  const ACT_start   = (ACT_target + 0x02C0) & 0xFFFF;

  let hidden = [];
  if (!showAct) hidden.push("Act");
  if (!showZone) hidden.push("Zone");
  if (!showOval) hidden.push("Oval");
  const hiddenText = hidden.length > 0 ? ` (hide ${hidden.join(", ")})` : "";

  return `\t\tdc.w `
    + `$${hex16(NAME_start)},$${hex16(NAME_target)}, `
    + `$${hex16(showZone ? ZONE_start : OFFSCREEN)},$${hex16(showZone ? ZONE_target : OFFSCREEN)}, `
    + `$${hex16(showAct ? ACT_start : OFFSCREEN)},$${hex16(showAct ? ACT_target : OFFSCREEN)}, `
    + `$${hex16(showOval ? OVAL_start : OFFSCREEN)},$${hex16(showOval ? OVAL_target : OFFSCREEN)}`
    + `\t; ${title.toUpperCase()}${hiddenText}`;
}

////////////////////
// Clipboard

function resetClipboardButtons() {
  resetClipboardButton(clipboard, "Copy to clipboard");
  resetClipboardButton(clipboardCon, "Copy ConData");
}
