from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from liufang.config import (
    GemDefinition,
    load_affix_definitions,
    load_board_rules,
    load_gem_definitions,
    load_localization,
    load_relation_coefficients,
    load_skill_scaling_rules,
    load_skill_templates,
)
from liufang.gem_board import SudokuGemBoard
from liufang.inventory import GemInventory
from liufang.presentation import Localizer, PresentationService
from liufang.skill_effects import SkillEffectCalculator


CONFIG_ROOT = ROOT / "configs"
CONDUIT_POSITIONS = {
    "support_row_conduit": (0, 3),
    "support_column_conduit": (3, 0),
    "support_box_conduit": (1, 1),
}
SUPPORTS_WITHOUT_ACTIVE_TARGETS = frozenset({"support_quick_mobility"})


def _matches_filter(support: GemDefinition, active: GemDefinition) -> bool:
    if support.apply_filter_target_kinds and active.gem_kind not in support.apply_filter_target_kinds:
        return False
    if support.apply_filter_tags_any and not (support.apply_filter_tags_any & active.tags):
        return False
    if support.apply_filter_tags_all and not support.apply_filter_tags_all.issubset(active.tags):
        return False
    if support.apply_filter_tags_none and support.apply_filter_tags_none & active.tags:
        return False
    return True


def _support_position(support_id: str) -> tuple[int, int]:
    return CONDUIT_POSITIONS.get(support_id, (0, 1))


def test_all_support_gems_apply_to_matching_active_skill_tags_and_surface_in_ui_views() -> None:
    definitions = load_gem_definitions(CONFIG_ROOT)
    skill_templates = load_skill_templates(CONFIG_ROOT)
    board_rules = load_board_rules(CONFIG_ROOT)
    relation_coefficients = load_relation_coefficients(CONFIG_ROOT)
    scaling_rules = load_skill_scaling_rules(CONFIG_ROOT)
    affixes = load_affix_definitions(CONFIG_ROOT)
    presenter = PresentationService(
        localizer=Localizer(load_localization(CONFIG_ROOT)),
        definitions=definitions,
        skill_templates=skill_templates,
        scaling_rules=scaling_rules,
        affix_definitions={definition.affix_id: definition for definition in affixes},
    )

    active_definitions = tuple(
        definition for definition in definitions.values() if definition.gem_kind == "active_skill"
    )
    support_definitions = tuple(
        definition for definition in definitions.values() if definition.gem_kind == "support"
    )

    supports_without_active_targets = {
        support.base_gem_id
        for support in support_definitions
        if not any(_matches_filter(support, active) for active in active_definitions)
    }
    assert supports_without_active_targets == SUPPORTS_WITHOUT_ACTIVE_TARGETS

    checked_pairs: list[tuple[str, str]] = []
    for support_definition in support_definitions:
        matching_actives = [
            active
            for active in active_definitions
            if _matches_filter(support_definition, active)
        ]
        for active_definition in matching_actives:
            inventory = GemInventory(definitions)
            board = SudokuGemBoard(board_rules, inventory)
            active = inventory.add_instance("active", active_definition.base_gem_id, level=20)
            inventory.add_instance("support", support_definition.base_gem_id, level=20)
            board.mount_gem(active.instance_id, 0, 0)
            board.mount_gem("support", *_support_position(support_definition.base_gem_id))

            calculator = SkillEffectCalculator(
                board=board,
                definitions=definitions,
                skill_templates=skill_templates,
                relation_coefficients=relation_coefficients,
                scaling_rules=scaling_rules,
                affix_definitions={},
            )
            final_skill = calculator.calculate_for_active(active)

            support_modifiers = [
                modifier
                for modifier in final_skill.applied_modifiers
                if modifier.applied
                and modifier.source_base_gem_id == support_definition.base_gem_id
                and modifier.target_instance_id == active.instance_id
            ]
            assert support_modifiers, (
                support_definition.base_gem_id,
                active_definition.base_gem_id,
            )

            assert any(
                {relation.source_instance_id, relation.target_instance_id}
                == {active.instance_id, "support"}
                for relation in board.relations()
            )

            active_detail = presenter.gem_detail(
                active,
                board=board,
                final_skills=(final_skill,),
            )
            bonus_lines = active_detail["tooltip_view"]["sections"]["bonuses"]["lines"]
            assert bonus_lines, (
                support_definition.base_gem_id,
                active_definition.base_gem_id,
            )

            skill_preview = presenter.skill_preview(final_skill)
            preview_modifiers = [
                modifier
                for modifier in skill_preview["applied_modifiers"]
                if modifier["source_instance_id"] == "support"
                and modifier["target_instance_id"] == active.instance_id
                and modifier["applied"]
            ]
            assert preview_modifiers, (
                support_definition.base_gem_id,
                active_definition.base_gem_id,
            )
            checked_pairs.append(
                (support_definition.base_gem_id, active_definition.base_gem_id)
            )

    assert len(checked_pairs) == 356
