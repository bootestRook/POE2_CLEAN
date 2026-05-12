import map001Document from "../map/map_001.json";
import restAreaDocument from "../map/rest_area.json";
import monsterTestMapDocument from "../map/map_monster_test.json";
import { generateProceduralEditorMap, PROCEDURAL_MAP_DOCUMENT_ID } from "./proceduralMapGeneration";

export type AuthoredMapTemplateDefinition = {
  id: string;
  document: unknown;
};

export const DEFAULT_AUTHORED_MAP_TEMPLATE_ID = "map_001";
export const REST_AREA_MAP_TEMPLATE_ID = "rest_area";
export const MONSTER_TEST_MAP_TEMPLATE_ID = "map_monster_test";
export const PROCEDURAL_MAP_TEMPLATE_ID = PROCEDURAL_MAP_DOCUMENT_ID;

export const AUTHORED_MAP_TEMPLATES: AuthoredMapTemplateDefinition[] = [
  {
    id: DEFAULT_AUTHORED_MAP_TEMPLATE_ID,
    document: map001Document
  },
  {
    id: PROCEDURAL_MAP_TEMPLATE_ID,
    document: generateProceduralEditorMap().map
  },
  {
    id: REST_AREA_MAP_TEMPLATE_ID,
    document: restAreaDocument
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
