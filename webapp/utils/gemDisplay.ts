export function romanGemLevel(level: number) {
  const clamped = Math.max(1, Math.min(20, Math.floor(Number(level) || 1)));
  const romanByLevel: Record<number, string> = {
    1: "I",
    2: "II",
    3: "III",
    4: "IV",
    5: "V",
    6: "VI",
    7: "VII",
    8: "VIII",
    9: "IX",
    10: "X",
    11: "XI",
    12: "XII",
    13: "XIII",
    14: "XIV",
    15: "XV",
    16: "XVI",
    17: "XVII",
    18: "XVIII",
    19: "XIX",
    20: "XX",
  };
  return romanByLevel[clamped] ?? "I";
}

type GemDisplaySource = {
  sudoku_digit?: number;
  gem_type?: { id?: string; number?: number; display_text?: string; identity_text?: string };
  tags: { id?: string; text?: string }[];
  tooltip_view?: { icon_color_key?: string };
};

export function gemSudokuDigit(gem: GemDisplaySource) {
  return gem.sudoku_digit ?? gem.gem_type?.number ?? Number((gem.gem_type?.id ?? gem.tags.find((tag) => tag.id?.startsWith("gem_type_"))?.id ?? "").split("_").pop());
}

export function gemColorKey(gem: GemDisplaySource) {
  const number = gemSudokuDigit(gem);
  const colorByType: Record<number, string> = {
    1: "red",
    2: "blue",
    3: "green",
    4: "pink",
    5: "yellow",
    6: "white",
    7: "black",
    8: "cyan",
    9: "orange"
  };
  return colorByType[number] ?? "white";
}

export function gemColorValue(gem: GemDisplaySource) {
  const colors: Record<string, string> = {
    red: "#FF4D4D",
    blue: "#4DA3FF",
    green: "#5CDB7A",
    pink: "#FF5FD2",
    yellow: "#FFD84D",
    white: "#D8D8D8",
    black: "#B08CFF",
    cyan: "#4DDFFF",
    orange: "#FF9A3D"
  };
  return colors[gem.tooltip_view?.icon_color_key ?? gemColorKey(gem)] ?? "#A8A6FF";
}
