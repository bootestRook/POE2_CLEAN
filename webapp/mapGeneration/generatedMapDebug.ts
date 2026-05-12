import { TOPOLOGY_PRESET_NAME_ZH } from "./mapGenerationConfig";
import type { GeneratedMapGraph, ValidationResult } from "./mapGenerationTypes";

export function createGeneratedMapDebugText(graph: GeneratedMapGraph, validation: ValidationResult): string[] {
  const degree = new Map(graph.rooms.map((room) => [room.id, 0]));
  graph.corridors.forEach((edge) => {
    degree.set(edge.fromRoomId, (degree.get(edge.fromRoomId) ?? 0) + 1);
    degree.set(edge.toRoomId, (degree.get(edge.toRoomId) ?? 0) + 1);
  });
  const bossDegree = degree.get(graph.bossRoomId) ?? 0;
  const deadEndRuleOk = graph.rooms
    .filter((room) => room.roomType === "dead_end")
    .every((room) => (degree.get(room.id) ?? 0) === 1);
  const entranceToBossOk = graph.entranceRoomIds.length > 0 && validation.ok && !validation.errors.some((error) => error.includes("可达 Boss"));
  return [
    "程序化地图生成",
    `Seed：${graph.seed}`,
    `拓扑类型：${TOPOLOGY_PRESET_NAME_ZH[graph.topologyPreset]}`,
    `地图尺寸：${validation.stats.width} × ${validation.stats.height}`,
    `入口区域：${validation.stats.entranceCount}`,
    `普通房间：${validation.stats.normalRoomCount}`,
    `大房间：${validation.stats.largeRoomCount}`,
    `死胡同：${validation.stats.deadEndCount}`,
    `Boss 房：${validation.stats.bossRoomCount}`,
    `通道数量：${validation.stats.corridorCount}`,
    `Ground 连通性：${validation.errors.some((error) => error.includes("ground")) ? "失败" : "通过"}`,
    `入口到 Boss：${entranceToBossOk ? "通过" : "失败"}`,
    `Boss 连接数：${bossDegree}`,
    `死胡同规则：${deadEndRuleOk ? "通过" : "失败"}`,
    `校验结果：${validation.ok ? "通过" : "失败"}`,
    ...validation.errors.map((error) => `错误：${error}`),
    ...validation.warnings.map((warning) => `警告：${warning}`)
  ];
}
