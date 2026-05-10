import zhCnStrings from "./zh_cn.json";

export type LocalizationStringMap = Record<string, string>;

export const webappZhCnStrings: LocalizationStringMap = zhCnStrings;

export function localize(key: string, fallback?: string): string {
  const value = webappZhCnStrings[key];
  if (typeof value === "string") return value;
  return fallback ?? `[missing localization: ${key}]`;
}

export function localizeTemplate(
  key: string,
  values: Record<string, string | number>,
  fallback?: string
): string {
  return localize(key, fallback).replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name: string) => (
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match
  ));
}
