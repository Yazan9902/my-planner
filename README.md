# My Planner

A personal to-do list, scheduler, and weekly planner. Phone-friendly, installable
(PWA), works offline, and optionally syncs live across your devices with Firebase.

Built with plain HTML, CSS, and JavaScript — no build step, no Node.

## Features

- **Today** — overdue + due-today tasks, grouped and sorted by time and priority.
- **Week** — a day/week calendar grid; timed tasks show as blocks, all-day tasks as
  chips. Tap an empty slot to add a task at that time.
- **Lists** — color-coded areas (Work, Personal, Errands…) with All / To do / Done filters.
- **Tasks** — title, list, date, time, duration, priority, repeat (daily / weekdays /
  weekly / monthly), reminder, and notes.
- **Reminders** — local notifications that fire while the app is open or recently
  backgrounded (see note below).
- **Offline-first** — everything works on `localStorage` before Firebase is set up,
  and keeps working when the network drops.

## Run it locally

It's just static files, so serve the folder with any static server, e.g.:

```bash
cd "personal to-do list"
python3 -m http.server 8000
```

Then open <http://localhost:8000>. (Service workers and notifications need
`http://localhost` or HTTPS — opening the file directly won't register them.)

## Connect live sync with Firebase (optional, ~5 min)

1. Open the [Firebase Console](https://console.firebase.google.com/) and create a
   **new project**. Google Analytics is not needed.
2. Open **Build > Firestore Database**, click **Create database**, choose a nearby
   location, and start in **Production mode**.
3. Open **Project settings**, scroll to **Your apps**, choose the Web icon (`</>`),
   and register the app. Firebase Hosting is not needed.
4. Copy the values from the shown `firebaseConfig` object into `firebase-config.js`.
5. In Firestore, open the **Rules** tab, replace its contents with `firestore.rules`,
   then click **Publish**.

When the app first opens it creates a private space whose id lives in the `?board=…`
part of the URL. Open the **same URL** on your other devices (or use **Share planner**)
to see the same tasks update live. Keep the link private — anyone with it can edit.

Until Firebase is configured, the app saves everything in the current browser.

## Reminders — what to expect

The web platform can reliably show a notification only while the app is **open or
recently backgrounded**. There is no dependable way for a fully-closed website to
fire a future notification on its own. So:

- **Now:** tap the bell icon to enable reminders. They fire when a task's reminder
  time arrives while the app is running.
- **Later (optional upgrade):** to get reminders that buzz when the app is fully
  closed, add a Firebase Cloud Function (scheduled) that sends push via Firebase
  Cloud Messaging. This needs the Blaze plan (effectively free at personal volume).
  The code is structured so this can be added without reworking the app.

## Publish with GitHub Pages

1. Create a GitHub repository and add the contents of this folder.
2. Open **Settings > Pages** in the repository.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and `/ (root)`, then save.

## Data model

```
boards/{boardId}
  ├─ lists/{listId}   { name, color, createdAt }
  └─ tasks/{taskId}   { title, notes, listId, dueDate, time, durationMin,
                        priority, done, remindMin, repeat, createdAt }
```
