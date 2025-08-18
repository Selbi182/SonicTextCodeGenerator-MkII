// Letter mapping definitions

const S2letter = (
    tile_count = 0x04,
    width = DEFAULTS.width,
    sprite_format = DEFAULTS.sprite_format,
    sprite_format_sub = DEFAULTS.sprite_format_sub,
    x_delta = 0,
    y_delta = 0,
    comment = null
  ) =>
    ({ tile_count, width, sprite_format, sprite_format_sub, x_delta, y_delta, comment });

const S2_LETTERS = {
  A: S2letter(),
  B: S2letter(),
  C: S2letter(),
  D: S2letter(),
  E: S2letter(0x00), // E is hardcoded
  F: S2letter(),
  G: S2letter(),
  H: S2letter(),
  I: S2letter(0x02, 8, 1), // I is half-width
  J: S2letter(),
  K: S2letter(),
  L: S2letter(),
  M: S2letter(0x06, 24, 9), // M is one tile wider
  N: S2letter(0x04), // N is hardcoded
  O: S2letter(0x08), // O is hardcoded
  P: S2letter(),
  Q: S2letter(),
  R: S2letter(),
  S: S2letter(),
  T: S2letter(),
  U: S2letter(),
  V: S2letter(),
  W: S2letter(0x06, 24, 9), // W is one tile wider
  X: S2letter(),
  Y: S2letter(),
  Z: S2letter(0x0C) // Z is hardcoded
};

// Select relevant DOM elements
const inputText = $("#text-in");
const inputX = $("#x-pos");
const inputY = $("#y-pos");
const out = $("#text-out");
const status = $("#status");
const summary = $("#summary");
const artOut = $("#artdata-out");

// Set up clipboard buttons
const clipboard = $("#clipboard");
const clipboardArt = $("#clipboard-artdata-out");
clipboard.onclick = () => copyToClipboard(clipboard, out);
clipboardArt.onclick = () => copyToClipboard(clipboardArt, artOut);

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
  const xStartAuto = Math.max(-0x00A0, (0x0070 - measureTextWidth(text, S2_LETTERS) + 0x0010)) & 0xFFFF;
  const xStartManual = parseHex16(inputX.value, 0x0000);
  const overflow = measureTextWidth(text, S2_LETTERS) > 320;

  // Initialize output data
  let xPos = isAutoX ? xStartAuto : xStartManual;
  let title = "";
  let spriteCount = 0;
  let invalidCount = 0;
  let lines = [];
  let letterMap = createLetterMap(text);

  // Generate sprite mapping for each char
  for (const ch of text) {
    const piece = createS2LetterPiece(ch, yPos, xPos, letterMap);
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
    const comment = title ? `\t; ${title.toUpperCase()}` : "";
    lines.unshift(`\tdc.w ${spriteCount}${comment}`);
    lines.push(`\teven`);
    output = lines.join("\n");
  }
  out.textContent = output;

  // Generate ArtData
  const uniqueLetters = Object.keys(letterMap).filter(ch => !isENOZ(ch));
  if (text) {
    const artDataLine = `\ttitleLetters	"${uniqueLetters.join("")}"\t; ${title}`;
    $("#artdata-out").value = artDataLine;
  } else {
    $("#artdata-out").value = "";
  }

  // Update status
  const uniqueLetterCount = uniqueLetters.length;
  if (!text) {
    setStatus('Ready to generate');
  } else if (uniqueLetterCount > 8) {
    setStatus('Generated with errors', 'Too many unique letters (max. 8 excluding ENOZ)!', true);
  } else if (overflow) {
    setStatus('Generated with errors', 'Text overflow, pick a shorter name!', true);
  } else if (invalidCount > 0) {
    setStatus('Generated with warnings', `(${invalidCount} unsupported char${pluralize(invalidCount)})`, false, true);
  } else {
    setStatus('Generated', `(${spriteCount} sprite mapping${pluralize(spriteCount)}, ${uniqueLetterCount} unique letter${pluralize(uniqueLetterCount)})`);
  }

  resetClipboardButtons();
}

function createS2LetterPiece(char, yPos, xPos, letterMap) {
  if (char === " ") {
    return {
      mapping: "\t\t\t\t\t; space",
      width: spaceWidth,
      invalid: false
    };
  }

  const lm = letterMap[char];
  if (!isNaN(lm)) {
  	let maps_1P, maps_2P;
  	if (isENOZ(char)) {
	  	maps_1P = 0x8580 + lm;
	  	maps_2P = 0x82C0 + (lm / 2);
  	} else {
	  	maps_1P = 0x85DE + lm;
	  	maps_2P = 0x82EF + (lm / 2);
  	}
  	const l = S2_LETTERS[char];
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
    mapping: `\t; ${char.toUpperCase()} is an invalid character`,
    width: DEFAULTS.width,
    invalid: true
  };
}

function createLetterMap(text) {
  const letterMap = {}
  let vramOffset = 0x00;
  for (const char of text.toUpperCase()) {
    if (char in letterMap || char === " " || !(/^[A-Z]$/i.test(char))) {
      continue;
    }
    if (isENOZ(char)) {
	    letterMap[char] = S2_LETTERS[char].tile_count;
    } else {
	    letterMap[char] = vramOffset;
	    vramOffset += S2_LETTERS[char].tile_count;
    }
  }
  return letterMap;
}

////////////////////
// Clipboard

function resetClipboardButtons() {
  resetClipboardButton(clipboard, "Copy to clipboard");
  resetClipboardButton(clipboardArt, "Copy ArtData");
}
