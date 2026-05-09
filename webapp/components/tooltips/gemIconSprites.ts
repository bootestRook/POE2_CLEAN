import { gemSudokuDigit } from "../../utils/gemDisplay";

type GemIconSpriteSource = {
  sudoku_digit?: number;
  gem_type?: { id?: string; number?: number; display_text?: string; identity_text?: string };
  tags: readonly { id?: string; text?: string }[];
  tooltip_view?: { icon_color_key?: string };
};

const sudokuGemIconSprites: Record<number, string> = {
  1: new URL("../../assets/gems/sudoku-gem-1.png", import.meta.url).href,
  2: new URL("../../assets/gems/sudoku-gem-2.png", import.meta.url).href,
  3: new URL("../../assets/gems/sudoku-gem-3.png", import.meta.url).href,
  4: new URL("../../assets/gems/sudoku-gem-4.png", import.meta.url).href,
  5: new URL("../../assets/gems/sudoku-gem-5.png", import.meta.url).href,
  6: new URL("../../assets/gems/sudoku-gem-6.png", import.meta.url).href,
  7: new URL("../../assets/gems/sudoku-gem-7.png", import.meta.url).href,
  8: new URL("../../assets/gems/sudoku-gem-8.png", import.meta.url).href,
  9: new URL("../../assets/gems/sudoku-gem-9.png", import.meta.url).href,
};

export function gemIconSprite(gem: GemIconSpriteSource) {
  return sudokuGemIconSprites[gemSudokuDigit(gem)] ?? "";
}
