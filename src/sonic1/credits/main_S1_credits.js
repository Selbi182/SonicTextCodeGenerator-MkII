// Letter mapping definitions
const LETTERS = {
  A: letter(0x04),
  B: letter(0x48),
  C: letter(0x1E),
  D: letter(0x42),
  E: letter(0x0E, 15),
  F: letter(0x5C, 15),
  G: letter(0x00),
  H: letter(0x3A),
  I: letter(0x46, 8, 1), // I is half-width
  J: letter(0x4C, 15),
  K: letter(0x58),
  L: letter(0x16, 15),
  M: letter(0x08, 20, 9), // M is one tile wider
  N: letter(0x1A, 15),
  O: letter(0x26),
  P: letter(0x12, 15),
  // (Q is unsupported)
  R: letter(0x22),
  S: letter(0x2E, 14),
  T: letter(0x3E),
  U: letter(0x32),
  // (V is unsupported)
  W: letter(0x08, 20, 9, 0x18, 4, 0, "W (unsupported, this is a rotated M as workaround)"),
  X: letter(0x50),
  Y: letter(0x2A),
  // (Z is unsupported)
  2: letter(0x36, 15)
};

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

inputX.addEventListener("input", el => {
  inputText.classList.toggle("left", !!el.target.value);
});

////////////////////
// Main generator

function generateOutput() {
  
  // Fetch input data
  const text = (inputText.value || "");
  
  const isAutoX = (inputX.value.trim() === "" && text);
  const xStartManual = parseHex(inputX.value, 0x80);
  
  const isAutoY = (inputY.value.trim() === "" && text);
  const yStartAuto = Math.max(0x90, (Math.floor(-measureTextHeight(text) / 2.0)) & 0xFF);
  const yStartManual = parseHex(inputY.value, 0xF8);

  // Initialize output data
  let xPos = 0;
  let yPos = isAutoY ? yStartAuto : yStartManual;
  let title = "";
  let spriteCount = 0;
  let invalidCount = 0;
  let overflow = false;
  let lines = [];

  // Generate sprite mapping for each char
  const inputLines = text.split("\n");
  for (const [i, line] of inputLines.entries()) {
    // Prepare next line
    if (i > 0) {
      yPos += 0x10;
      if (lines.at(-1) !== "") {              
        lines.push("");
        title += " / ";
      }
    }
    xPos = isAutoX ? Math.max(0x80, (Math.floor(-measureTextWidth(line, LETTERS) / 2.0)) & 0xFF) : xStartManual;
    
    // This line
    for (const ch of line) {
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

  // Update status
  const setStatus = (message, summaryText = "", isError = false) => {
    status.textContent = message;
    status.classList.toggle("error", isError);
    summary.textContent = summaryText;
  };
  if (!text) {
    setStatus('Ready to generate');
  } else if (spriteCount > 80) {
    setStatus('Generated with errors', 'Sprite overflow! (max: 80)', true);
  } else if (inputLines.length > 14) {
    setStatus('Generated with errors', 'Too many lines! (max: 14)', true);
  } else if (overflow) {
    setStatus('Generated with errors', 'At least one line is too long!', true);
  } else if (invalidCount > 0) {
    setStatus('Generated with warnings', `(${invalidCount} unsupported char${pluralize(invalidCount)})`, true);
  } else {
    setStatus('Generated', `(${spriteCount} sprite mapping${pluralize(spriteCount)})`);
  }

  resetClipboardButtons();
}

function measureTextHeight(text) {
  return (text.split("\n").length * 0x10) & 0xFFFF;
}

////////////////////
// Clipboard
    
function resetClipboardButtons() {
  resetClipboardButton(clipboard, "Copy to clipboard");
}