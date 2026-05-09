export async function requestSkillEditorSave(_skillId: string, _draft: unknown): Promise<never> {
  throw new Error("技能编辑器已禁用。");
}

export async function requestSkillEditorModifierPreview(_payload: unknown): Promise<never> {
  throw new Error("技能编辑器已禁用。");
}

export async function requestSkillTestArenaRun(_payload: unknown): Promise<never> {
  throw new Error("技能编辑器已禁用。");
}
