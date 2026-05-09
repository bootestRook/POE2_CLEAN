import { useEffect, useState } from "react";
import type { SkillEditorCameraSettings, SkillEditorDebugOptions } from "../../types/skillEditorTypes";
import { normalizeSkillEditorCameraSettings, saveSkillEditorCameraSettings, SKILL_EDITOR_CAMERA_MAX_ZOOM, SKILL_EDITOR_CAMERA_MIN_ZOOM } from "./disabledSkillEditorSettings";

export function SkillEditorDebugToggles({
  options,
  cameraSettings,
  onChange,
  onCameraSettingsChange
}: {
  options: SkillEditorDebugOptions;
  cameraSettings: SkillEditorCameraSettings;
  onChange: (options: SkillEditorDebugOptions) => void;
  onCameraSettingsChange: (settings: SkillEditorCameraSettings) => void;
}) {
  const [zoomDraft, setZoomDraft] = useState(cameraSettings.zoom);
  const [saveText, setSaveText] = useState("");
  const setOption = (key: keyof SkillEditorDebugOptions, value: boolean) => {
    onChange({ ...options, [key]: value });
  };
  useEffect(() => {
    setZoomDraft(cameraSettings.zoom);
  }, [cameraSettings.zoom]);

  function applyCameraZoom(value: number) {
    const nextSettings = normalizeSkillEditorCameraSettings({ zoom: value });
    setZoomDraft(nextSettings.zoom);
    onCameraSettingsChange(nextSettings);
    setSaveText("");
  }

  function saveCameraZoom() {
    const nextSettings = normalizeSkillEditorCameraSettings({ zoom: zoomDraft });
    saveSkillEditorCameraSettings(nextSettings);
    onCameraSettingsChange(nextSettings);
    setZoomDraft(nextSettings.zoom);
    setSaveText("已保存");
  }

  return (
    <section className="skill-test-debug-toggles" aria-label="技能测试辅助线显示">
      <div className="skill-test-camera-control">
        <div>
          <strong>镜头 POV</strong>
          <span>{zoomDraft.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={SKILL_EDITOR_CAMERA_MIN_ZOOM}
          max={SKILL_EDITOR_CAMERA_MAX_ZOOM}
          step={0.01}
          value={zoomDraft}
          onChange={(event) => applyCameraZoom(Number(event.currentTarget.value))}
        />
        <button type="button" onClick={saveCameraZoom}>
          保存镜头
        </button>
        {saveText && <span className="skill-test-camera-save-text">{saveText}</span>}
      </div>
      <label>
        <input type="checkbox" checked={options.showSearchRange} onChange={(event) => setOption("showSearchRange", event.currentTarget.checked)} />
        <span>搜索范围圈</span>
      </label>
      <label>
        <input type="checkbox" checked={options.showCollisionRadius} onChange={(event) => setOption("showCollisionRadius", event.currentTarget.checked)} />
        <span>碰撞半径圈</span>
      </label>
      <label>
        <input type="checkbox" checked={options.showDirectionLines} onChange={(event) => setOption("showDirectionLines", event.currentTarget.checked)} />
        <span>飞行方向线</span>
      </label>
      <label>
        <input type="checkbox" checked={options.showLaunchPoints} onChange={(event) => setOption("showLaunchPoints", event.currentTarget.checked)} />
        <span>发射点</span>
      </label>
      <label>
        <input type="checkbox" checked={options.showTargetPoint} onChange={(event) => setOption("showTargetPoint", event.currentTarget.checked)} />
        <span>目标点</span>
      </label>
    </section>
  );
}

