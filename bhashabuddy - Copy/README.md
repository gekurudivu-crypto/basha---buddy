# BhashaBuddy

Learn technical English in **Telugu, Hindi or Tamil**: listen to a word, say it into the mic, get a pronunciation score, take a daily quiz and track your streak.

Built for the "BhashaBuddy" hackathon brief. Node.js + SQLite backend, modular ES-module frontend, automated tests.

## Run it

Requires **Node 22.5 or newer** (it uses the built-in `node:sqlite`). There is nothing to `npm install`.

```bash
npm start          # http://localhost:3000
npm test           # automated tests
```

Optional: `PORT=8080 DB_FILE=./data/app.db npm start`

Use **Chrome or Edge** for the microphone. Speech recognition needs `http://localhost` or HTTPS.

## Two modes, same app

| | Server mode (`npm start`) | Static mode (any file host) |
|---|---|---|
| Vocabulary | SQLite via `/api/words` | `data/words.json` |
| Progress | SQLite (`UserProfiles`, `ProgressLogs`, `PronunciationScores`, `QuizResults`) | this browser's localStorage |
| Pronunciation scoring | server `/api/transcript/match` (falls back to the browser) | in the browser |

The frontend probes `/api/health` on start-up and picks the mode itself. Progress is always mirrored into localStorage, so a dropped connection never loses it.

## Project layout

```
server/
  index.js      HTTP server, static files, security headers, rate limit, body-size limit
  routes.js     API routes (framework-free handlers)
  validate.js   validation for every request field
  db.js         schema + the only file that contains SQL
data/
  words.json    the 50 words and 5 units (single source of truth)
  i18n.json     all UI text in en / te / hi / ta
public/
  index.html  css/styles.css  sw.js (offline cache)  poster.jpg
  js/
    shared/     scoring.js, dates.js        -> used by BOTH browser and server
    core/       quiz.js, progress.js, buddy.js   pure logic, no DOM
    ui/ views/  HTML-string renderers (state in, HTML out)
    store.js    observable state       actions.js  all side effects
    backend.js  ApiBackend / StaticBackend       speech.js  Web Speech API
    main.js     wiring
tests/          scoring, quiz, progress, data, api (node:test)
```

## API

| Method | Path | |
|---|---|---|
| GET | `/api/health` | |
| GET | `/api/units`, `/api/words?unit=0-4` | bilingual word repository |
| POST | `/api/profiles` | create an anonymous profile (UUID) |
| GET / PATCH | `/api/profiles/:id` | read / set `lang`, `goal` |
| POST | `/api/profiles/:id/progress` | `{wordId, date}` |
| DELETE | `/api/profiles/:id/progress` | reset progress |
| POST | `/api/profiles/:id/scores` | `{wordId, score}` (best score kept) |
| POST | `/api/profiles/:id/quizzes` | `{date, score, total}` |
| POST | `/api/transcript/match` | `{wordId, heard:[...], confidence}` -> `{score, heard, passed}` |

## Security notes

All user input is validated (type, range, unknown fields rejected). SQL uses prepared statements only. All text is HTML-escaped before rendering. Responses carry a Content-Security-Policy and `nosniff`. Static serving blocks path traversal and only serves whitelisted file types. There is a request-size limit and a per-IP rate limit. Profiles are anonymous: the UUID acts as the access token, and there are no passwords.
