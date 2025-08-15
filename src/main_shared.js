////////////////////
// Definitions

export const DEFAULTS = {
  width: 16,
  sprite_format: 5,
  sprite_format_sub: 0
};
export const SPACE_WIDTH = DEFAULTS.width;

export const letter = (
    tile_offset, width = DEFAULTS.width,
    sprite_format = DEFAULTS.sprite_format,
    sprite_format_sub = DEFAULTS.sprite_format_sub,
    x_delta = 0,
    y_delta = 0,
    comment = null
  ) =>
    ({ tile_offset, width, sprite_format, sprite_format_sub, x_delta, y_delta, comment });

////////////////////
// Letter calc

export function createLetterPiece(char, yPos, xPos, letters) {
  if (char === " ") {
    return {
      mapping: "\t\t\t\t\t\t; space",
      width: SPACE_WIDTH,
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

export function measureTextWidth(text, letters) {
  let w = 0;
  for (const ch of text) {
    if (ch === " ") {
      w += SPACE_WIDTH;
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
export const $ = sel => document.querySelector(sel);

export function parseHex(str, fallback) {
  const cleaned = (str || "").trim().replace(/^\$/, "");
  if (!cleaned) {
    return fallback;
  }
  const n = parseInt(cleaned, 16);
  return Number.isFinite(n) ? (n & 0xFF) : fallback;
}

export function hex(n) {
  return (n & 0xFF).toString(16).toUpperCase().padStart(2, "0");
}

export function hex16(n) {
  return (n & 0xFFFF).toString(16).toUpperCase().padStart(4, "0");
}

export function pluralize(num) {
  return num === 1 ? "" : "s";
}

////////////////////
// Clipboard

export function copyToClipboard(el, out) {
  if ($("#text-in").value.length == 0) {
    alert("Type something first, you doofus.");
    return;
  }
  out.focus();
  out.select();
  document.execCommand("copy");
  el.value = "Copied!";
}

export function resetClipboardButton(el, val) {
  el.value = val;
}