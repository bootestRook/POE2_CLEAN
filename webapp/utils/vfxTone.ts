export function cssToken(value: string | undefined) {
  return (value || "base").replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
}

export function visualTone(value: string | undefined) {
  const token = cssToken(value);
  if (token.includes("ice") || token.includes("frost")) return "cold";
  if (token.includes("lightning") || token.includes("thundercloud")) return "lightning";
  if (token.includes("puncture") || token.includes("shot")) return "physical";
  if (token.includes("fungal") || token.includes("spore")) return "spore";
  if (token.includes("vitality")) return "vitality";
  if (token.includes("swift")) return "swift";
  return "fire";
}
