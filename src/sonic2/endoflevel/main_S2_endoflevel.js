// Letter mapping definitions
const LETTERS = {
  A: letter(0x00),
  // (B is unsupported)
  C: letter(0x04),
  // (D is unsupported)
  E: letter(0x00), // E is hardcoded
  // (F is unsupported)
  G: letter(0x08),
  H: letter(0x0C),
  I: letter(0x10, 8, 1), // I is half-width
  // (J is unsupported)
  // (K is unsupported)
  L: letter(0x12),
  M: letter(0x16, 24, 9), // M is one tile wider
  N: letter(0x04), // N is hardcoded
  O: letter(0x08), // O is hardcoded
  // (P is unsupported)
  // (Q is unsupported)
  R: letter(0x1C),
  S: letter(0x20),
  T: letter(0x24),
  U: letter(0x28),
  // (V is unsupported)
  // (W is unsupported)
  // (X is unsupported)
  // (Y is unsupported)
  Z: letter(0x0C) // Z is hardcoded
};
spaceWidth = DEFAULTS.width / 2; // S2 EOL spaces are half-width

// Select relevant DOM elements
const inputText = $("#text-in");
const inputX = $("#x-pos");
const inputY = $("#y-pos");
const out = $("#text-out");
const status = $("#status");
const summary = $("#summary");

// Set up clipboard buttons
const clipboard = $("#clipboard");
clipboard.onclick = () => copyToClipboard(clipboard, out);

// Register input event listeners
[inputText, inputX, inputY].forEach(el => el.addEventListener("input", generateOutput));
generateOutput();

////////////////////
// Main generator

function generateOutput() {
  
  // Fetch input data
  const text = (inputText.value || "").toUpperCase();
  const yPos = parseHex(inputY.value, 0x00);
  const isAutoX = (inputX.value.trim() === "" && text);
  const xStartAuto = Math.max(-0x0080, (Math.floor(-measureTextWidth(text, LETTERS) / 2.0))) & 0xFFFF;
  const xStartManual = parseHex16(inputX.value, 0x0000);
  const overflow = measureTextWidth(text, LETTERS) > 320;

  // Initialize output data
  let xPos = isAutoX ? xStartAuto : xStartManual;
  let title = "";
  let spriteCount = 0;
  let invalidCount = 0;
  let lines = [];

  // Generate sprite mapping for each char
  for (const ch of text) {
    const piece = createS2LetterPiece(ch, yPos, xPos);
    lines.push(piece.mapping);
    if (!piece.invalid) {
      title += ch;
      if (!piece.mapping.trim().startsWith(";")) {
        spriteCount++;
      }
    }

    xPos = (xPos + piece.width) & 0xFFFF;
    if (piece.invalid || !!piece.comment) {
      invalidCount++;
    }
  }
  
  // Compile and output mappings
  let output = "";
  if (lines.length) {
    lines.unshift(`\tdc.w ${spriteCount}\t; ${title.toUpperCase()}`);
    lines.push(`\teven`);
    output = lines.join("\n");
  }
  out.textContent = output;

  // Update status
  const setStatus = (message, summaryText = "", isError = false) => {
    status.textContent = message;
    status.classList.toggle("error", isError);
    summary.textContent = summaryText;
  };

  if (!text) {
    setStatus('Ready to generate');
  } else if (overflow) {
    setStatus('Generated with errors', 'Text overflow, pick a shorter name!', true);
  } else if (invalidCount > 0) {
    setStatus('Generated with warnings', `(${invalidCount} unsupported char${pluralize(invalidCount)})`, true);
  } else {
    setStatus('Generated', `(${spriteCount} sprite mapping${pluralize(spriteCount)})`);
  }

  resetClipboardButtons();
}

function createS2LetterPiece(char, yPos, xPos) {
  if (char === " ") {
    return {
      mapping: "\t\t\t\t\t; space",
      width: spaceWidth,
      invalid: false
    };
  }

  const l = LETTERS[char];
  if (l) {
  	let maps_1P, maps_2P;
  	if (isENOZ(char)) {
	  	maps_1P = 0x8580 + l.tile_offset;
	  	maps_2P = 0x82C0 + (l.tile_offset / 2);
  	} else {
	  	maps_1P = 0x85B0 + l.tile_offset;
	  	maps_2P = 0x82D8 + (l.tile_offset / 2);
  	}
    return {
      mapping: `\tdc.w `
        + `$${hex(yPos - l.y_delta)}${hex(l.sprite_format)}, `
        + `$${hex16(maps_1P)}, `
        + `$${hex16(maps_2P)}, `
        + `$${hex16(xPos - l.x_delta)}`
        + `\t; ${l.comment ?? char.toUpperCase()}`,
      width: l.width,
      invalid: false,
      comment: l.comment
    };
  }
  return {
    mapping: `\t; ${char.toUpperCase()} ${
      /^[A-Z]$/i.test(char)
        ? "does not exist in the Sonic 2 end-of-level font"
        : "is an invalid character"
      }`,
    width: DEFAULTS.width,
    invalid: true
  };
}

////////////////////
// Clipboard

function resetClipboardButtons() {
  resetClipboardButton(clipboard, "Copy to clipboard");
}
