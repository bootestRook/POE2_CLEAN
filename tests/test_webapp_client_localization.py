import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WEBAPP = ROOT / "webapp"
LOCALIZATION_JSON = WEBAPP / "localization" / "zh_cn.json"
LOCALIZATION_SOURCE = WEBAPP / "localization" / "index.ts"
LOCALIZATION_TOML = ROOT / "configs" / "localization" / "zh_cn.toml"

MIGRATED_WEBAPP_SOURCES = [
    WEBAPP / "hooks" / "useGameViewport.ts",
    WEBAPP / "utils" / "frontendSaveStorage.ts",
    WEBAPP / "state" / "frontendDropState.ts",
    WEBAPP / "components" / "layout" / "AppTopHud.tsx",
    WEBAPP / "components" / "skill-board" / "boardPlacementState.ts",
    WEBAPP / "components" / "battle" / "MapSelectionPanel.tsx",
    WEBAPP / "components" / "tooltips" / "tooltipFormatting.ts",
]

MOJIBAKE_PATTERNS = [
    "鍘",
    "鎶",
    "鐏",
    "瀛",
    "璁",
    "鐢",
    "鏈",
    "榄",
    "锛",
    "銆",
    "€?",
    "瑁",
    "闂",
    "鍦",
    "鐐",
    "�",
    "锟",
]


def _toml_strings() -> dict[str, str]:
    source = LOCALIZATION_TOML.read_text(encoding="utf-8")
    pairs = re.findall(r'^"([^"]+)"\s*=\s*"([^"]*)"\s*$', source, flags=re.MULTILINE)
    return dict(pairs)


def _client_strings() -> dict[str, str]:
    return json.loads(LOCALIZATION_JSON.read_text(encoding="utf-8"))


def test_client_localization_strings_are_derived_from_utf8_toml() -> None:
    toml_strings = _toml_strings()
    client_strings = _client_strings()

    missing_keys = sorted(set(client_strings) - set(toml_strings))
    assert missing_keys == []

    mismatches = {
        key: (client_strings[key], toml_strings[key])
        for key in client_strings
        if client_strings[key] != toml_strings[key]
    }
    assert mismatches == {}
    assert toml_strings["ui.viewport.resolution.original"] == "原始尺寸"


def test_localization_lookup_has_deterministic_fallback_and_template_support() -> None:
    source = LOCALIZATION_SOURCE.read_text(encoding="utf-8")

    assert "export function localize(" in source
    assert "export function localizeTemplate(" in source
    assert "fallback ?? `[missing localization: ${key}]`" in source
    assert ".replace(/\\{([a-zA-Z0-9_]+)\\}/g" in source


def test_migrated_sources_use_localization_owner_and_have_no_mojibake() -> None:
    for path in MIGRATED_WEBAPP_SOURCES:
        source = path.read_text(encoding="utf-8")
        assert "localize" in source, path
        offenders = [pattern for pattern in MOJIBAKE_PATTERNS if pattern in source]
        assert offenders == [], f"{path}: {offenders}"


def test_localization_owner_is_documented_and_generated_data_not_hand_edited() -> None:
    docs = (ROOT / "docs" / "webapp-module-boundaries.md").read_text(encoding="utf-8")
    assert "webapp/localization/" in docs

    for path in [WEBAPP / "frontendGameData.ts", WEBAPP / "frontendGemDropData.ts"]:
        source = path.read_text(encoding="utf-8")
        assert source.startswith("// Generated"), path
        assert "../localization" not in source
        assert "./localization" not in source
