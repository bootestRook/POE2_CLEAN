export type FrontendDropRollEnemy = {
  id: number;
};

export function frontendDropRoll(enemy: FrontendDropRollEnemy, salt: number, elapsedSeconds: number) {
  const raw = Math.sin(enemy.id * 12.9898 + salt * 78.233 + Math.floor(elapsedSeconds * 10) * 37.719) * 43758.5453;
  return raw - Math.floor(raw);
}
