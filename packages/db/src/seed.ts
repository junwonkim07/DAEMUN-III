import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultSite } from "@daemun/shared";
import { createDb, type Db } from "./index";
import * as t from "./schema";

/**
 * Insert the default DAEMUN III content when the database is empty.
 * Safe to call on every API start — it returns early if a conference row exists.
 */
export async function seedIfEmpty(db: Db): Promise<boolean> {
  const existing = await db.select({ id: t.conference.id }).from(t.conference).limit(1);
  if (existing.length > 0) return false;

  const s = defaultSite;

  await db.transaction(async (tx) => {
    await tx.insert(t.conference).values({ id: "main", ...s.conference });

    await tx.insert(t.committees).values(
      s.committees.map(({ topics: _topics, ...c }) => c),
    );
    await tx.insert(t.topics).values(s.committees.flatMap((c) => c.topics));

    await tx.insert(t.departments).values(
      s.secretariat.departments.map(({ members: _m, ...d }) => d),
    );

    const people = [
      ...(s.secretariat.director ? [s.secretariat.director] : []),
      ...s.secretariat.executives,
      ...s.secretariat.departments.flatMap((d) => d.members),
      ...Object.values(s.secretariat.chairs).flat(),
    ];
    await tx.insert(t.people).values(people);

    const resolutions = Object.values(s.resolutions).flat();
    if (resolutions.length > 0) {
      await tx.insert(t.resolutions).values(
        resolutions.map(({ updatedAt: _u, ...r }) => r),
      );
    }

    await tx.insert(t.scheduleDays).values(
      s.schedule.map(({ items: _i, ...d }) => d),
    );
    await tx.insert(t.scheduleItems).values(s.schedule.flatMap((d) => d.items));

    await tx.insert(t.documents).values(s.documents);

    await tx.insert(t.announcements).values(s.announcements);
  });

  return true;
}

const isCli =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  const db = createDb();
  seedIfEmpty(db)
    .then((seeded) => {
      console.log(seeded ? "✔ database seeded" : "• database already has content, skipped");
      return db.$client.end();
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
