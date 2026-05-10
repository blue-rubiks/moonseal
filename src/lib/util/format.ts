export function fmtMMSS(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function fmtMin(sec: number): string {
  const m = Math.round(sec / 60);
  return `${m} 分鐘`;
}
