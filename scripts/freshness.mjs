const DAY_MS = 24 * 60 * 60 * 1000;

export function assertSnapshotFresh(snapshotDate, {
  now = new Date(),
  maxAgeDays = 2
} = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(snapshotDate)) {
    throw new Error("snapshotDate must be YYYY-MM-DD");
  }

  const snapshotTime = Date.parse(`${snapshotDate}T00:00:00.000Z`);
  const normalized = new Date(snapshotTime).toISOString().slice(0, 10);
  if (normalized !== snapshotDate) {
    throw new Error(`snapshotDate is not a valid calendar date: ${snapshotDate}`);
  }

  const nowTime = now instanceof Date ? now.getTime() : Date.parse(now);
  if (!Number.isFinite(nowTime)) {
    throw new Error("snapshot freshness clock must be a valid date");
  }
  if (!Number.isInteger(maxAgeDays) || maxAgeDays < 0) {
    throw new Error("snapshot freshness threshold must be a non-negative integer");
  }

  const ageDays = Math.floor((nowTime - snapshotTime) / DAY_MS);
  if (ageDays < 0) {
    throw new Error(`snapshotDate ${snapshotDate} is in the future`);
  }
  if (ageDays > maxAgeDays) {
    throw new Error(
      `snapshotDate ${snapshotDate} is ${ageDays} days old; maximum is ${maxAgeDays} days`
    );
  }
}
