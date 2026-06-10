// Cloud scheduler: finds tasks whose reminder time has arrived and sends a Web
// Push notification — so reminders reach the phone even when the app is closed.
// Runs in GitHub Actions on a cron. Talks to Firestore over its REST API
// (no service account needed; reads/writes are allowed by the security rules)
// and sends pushes with the standard VAPID Web Push protocol.

import webpush from "web-push";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const VAPID_PUBLIC = process.env.VAPID_PUBLIC;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:reminders@example.com";

if (!PROJECT_ID || !VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.error("Missing env: FIREBASE_PROJECT_ID, VAPID_PUBLIC, VAPID_PRIVATE");
  process.exit(1);
}
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const WINDOW_MS = 60 * 60 * 1000; // only fire reminders due within the last hour
const pad = (n) => String(n).padStart(2, "0");

// ---- Firestore REST helpers ----
function decode(fields = {}) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    if ("stringValue" in v) out[k] = v.stringValue;
    else if ("integerValue" in v) out[k] = Number(v.integerValue);
    else if ("doubleValue" in v) out[k] = Number(v.doubleValue);
    else if ("booleanValue" in v) out[k] = v.booleanValue;
    else out[k] = null;
  }
  return out;
}

async function listCollection(path) {
  const docs = [];
  let pageToken = "";
  do {
    const url = `${BASE}/${path}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) {
      // 404 = empty path; 403 = rules not published yet. Treat both as "nothing
      // here yet" so the scheduled job stays green until setup is finished.
      if (res.status === 404 || res.status === 403) {
        if (res.status === 403) console.log(`(${path}) not readable yet — publish Firestore rules to enable. Skipping.`);
        break;
      }
      throw new Error(`list ${path}: ${res.status}`);
    }
    const data = await res.json();
    for (const d of data.documents || []) {
      docs.push({ id: d.name.split("/").pop(), ...decode(d.fields) });
    }
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  return docs;
}

// Create a dedup doc; returns true only if it did not already exist.
async function claimReminder(id) {
  const res = await fetch(`${BASE}/reminderLog?documentId=${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { createdAt: { integerValue: String(Date.now()) } } }),
  });
  if (res.status === 409) return false; // already sent
  if (!res.ok) { console.error("claim error", id, res.status); return false; }
  return true;
}

async function deleteSub(id) {
  await fetch(`${BASE}/pushSubs/${id}`, { method: "DELETE" }).catch(() => {});
}

// ---- Reminder math ----
// fireAt (UTC ms) for a task, given the device's tz offset (minutes east of UTC).
function fireAtUtc(task, tz) {
  if (!task.dueDate) return null;
  const [y, mo, d] = task.dueDate.split("-").map(Number);
  let h = 23, mi = 59;
  if (task.time) { const [hh, mm] = task.time.split(":").map(Number); h = hh; mi = mm; }
  const localAsUtc = Date.UTC(y, mo - 1, d, h, mi, 0);
  const taskUtc = localAsUtc - tz * 60000; // convert local wall-time to real UTC
  return taskUtc - Number(task.remindMin) * 60000;
}

async function main() {
  const subs = await listCollection("pushSubs");
  if (subs.length === 0) { console.log("No push subscriptions. Nothing to do."); return; }

  // Group subscriptions by board.
  const boards = new Map();
  for (const s of subs) {
    if (!s.board || !s.endpoint) continue;
    if (!boards.has(s.board)) boards.set(s.board, []);
    boards.get(s.board).push(s);
  }

  const now = Date.now();
  let sent = 0;

  for (const [board, boardSubs] of boards) {
    const tz = Number(boardSubs[0].tz) || 0;
    let tasks;
    try { tasks = await listCollection(`boards/${board}/tasks`); }
    catch (e) { console.error("read tasks failed", board, e.message); continue; }

    for (const task of tasks) {
      if (task.done || !task.dueDate || Number(task.remindMin) < 0) continue;
      const fireAt = fireAtUtc(task, tz);
      if (fireAt == null) continue;
      if (now < fireAt || now - fireAt > WINDOW_MS) continue; // not due, or too old

      const slot = `${task.dueDate}T${task.time || "allday"}`;
      const logId = `${board}_${task.id}_${slot}`.replace(/[^A-Za-z0-9_-]/g, "");
      if (!(await claimReminder(logId))) continue; // already notified

      const when = task.time
        ? new Date(fireAt + Number(task.remindMin) * 60000).toLocaleTimeString("en-US", {
            hour: "numeric", minute: "2-digit", timeZone: "UTC",
          })
        : "Today";
      const payload = JSON.stringify({
        title: task.title || "Reminder",
        body: task.time ? `Due ${task.time}` : "Due today",
        tag: task.id,
        url: ".",
      });

      for (const s of boardSubs) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
          sent++;
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            console.log("removing expired sub", s.id);
            await deleteSub(s.id);
          } else {
            console.error("push error", err.statusCode || err.message);
          }
        }
      }
    }
  }
  console.log(`Done. Sent ${sent} notification(s).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
