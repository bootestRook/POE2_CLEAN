import map001Document from "../map/map_001.json";
import monsterTestMapDocument from "../map/map_monster_test.json";

export type AuthoredMapTemplateDefinition = {
  id: string;
  document: unknown;
};

export const DEFAULT_AUTHORED_MAP_TEMPLATE_ID = "map_001";
export const MONSTER_TEST_MAP_TEMPLATE_ID = "map_monster_test";

export const AUTHORED_MAP_TEMPLATES: AuthoredMapTemplateDefinition[] = [
  {
    id: DEFAULT_AUTHORED_MAP_TEMPLATE_ID,
    document: map001Document
  },
  {
    id: MONSTER_TEST_MAP_TEMPLATE_ID,
    document: monsterTestMapDocument
  }
];

export function authoredMapTemplateById(id: string) {
  return AUTHORED_MAP_TEMPLATES.find((template) => template.id === id) ?? null;
}

export function defaultAuthoredMapTemplate() {
  return authoredMapTemplateById(DEFAULT_AUTHORED_MAP_TEMPLATE_ID) ?? AUTHORED_MAP_TEMPLATES[0];
}
