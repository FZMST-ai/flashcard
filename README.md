# P3 Science Flashcards

A simple flashcard app to help Primary 3 students revise Science. It works
offline on phones, tablets and laptops. There is nothing to install.

## Opening the app

**Easiest way:** double-click `index.html`. It opens in your web browser and
works straight away, even without internet.

**As a single file:** `p3-science-flashcards.html` has everything (styles,
cards and app) inside one file. Email it, upload it to a learning platform or
copy it to a USB stick, and students just open it in a browser.

**From a local web server** (optional, e.g. to share on a school network):

```sh
# in this folder
python3 -m http.server 8000
# then open http://localhost:8000 in a browser
```

Keep these files together in the same folder:

| File            | What it is                                                  |
| --------------- | ----------------------------------------------------------- |
| `index.html`    | The app page. Open this one.                                |
| `styles.css`    | How the app looks.                                          |
| `app.js`        | How the app works.                                          |
| `cards.json`    | **The flashcards.** Teachers edit this file.                |
| `cards.js`      | A copy of the flashcards, made from `cards.json` (see below). |
| `cer-questions.json` | **The CER practice questions.** Teachers edit this file. |
| `cer-questions.js` | A copy of the CER questions, made from `cer-questions.json`. |
| `editor-settings.json` | The teacher editor password, stored as a hash (see below). |
| `build-cards.js`| A small script that makes `cards.js`, `cer-questions.js` and the single-file version. |
| `p3-science-flashcards.html` | The whole app in one file, made by `build-cards.js`. |

Each student's progress (cards marked "I knew it" or "Still learning", and
where they stopped in each topic) is saved in their own browser on their own
device. "Reset my progress" at the bottom of the home screen clears it.

## Editing the flashcards in the app (for teachers)

Tap **Teacher: edit flashcards** at the bottom of the home screen and enter
the teacher password. The password the app comes with is **`p3science`**.
Change it straight away under **Settings** in the editor.

In the editor you can:

- add a card to any topic, or start a new topic,
- edit a card's question, answer or topic,
- move cards up and down within a topic,
- rename a topic,
- delete a card.

There is no server, so **your changes are saved only in the browser you made
them in**. To give them to students, press **Download updated app**. This
downloads a new `p3-science-flashcards.html` with your cards and password
inside. Share that file instead of the old one. When you open the new file on
your own device, the editor sees the changes are in the file and stops
showing "edited flashcards" on the home screen. **Undo all my changes** puts
back the cards and password that came with the file you have open.

The password keeps students out of the editor, but it is not strong
security: someone who opens the file in a text editor could change the
cards. Since every student has their own copy, they can only ever change
their own copy.

Students' progress is saved against each card's id, so editing a card keeps
their progress for it, and deleting a card removes it.

When you use `index.html` from the app folder instead of the single file,
**Download cards.json** saves your cards. Put that file in the app folder
and run `node build-cards.js` (see below).

## Editing the flashcards file (for teachers)

All cards are in `cards.json`. Open it in any text editor (for example
Notepad, TextEdit or VS Code). Each card looks like this:

```json
{
  "id": "01-02",
  "topicOrder": 1,
  "topic": "Chapter 1: Diversity of Living and Non-living Things",
  "front": "How are items classified?",
  "back": "According to their common characteristics."
}
```

- `id` – a unique name for the card. Progress is saved against this, so
  don't change the id of an existing card unless you want its progress reset.
- `topicOrder` – the topic number. Topics are shown in this order (1, 2, 3, …).
- `topic` – the topic name shown on the coloured strip at the top of the card.
  Every card with the same `topicOrder` must use exactly the same `topic`.
- `front` – the question.
- `back` – the answer. Type `\n` where you want a new line, for example
  `"1. Grow\n2. Reproduce"`.

Within a topic, cards appear in the order they are listed in the file. Cards
are never shuffled. Remember the commas between cards and the quotation marks
around text.

### After editing: regenerate `cards.js`

Browsers don't let a page read `cards.json` when `index.html` is opened by
double-clicking, so the app also loads `cards.js`, a copy of the same cards.
After you change `cards.json`, update `cards.js` by running this in the app
folder (you need [Node.js](https://nodejs.org/) installed):

```sh
node build-cards.js
```

This also rebuilds the single-file `p3-science-flashcards.html` with your
new cards. It checks your cards for common mistakes (a missing field, a repeated id, a
topic name that doesn't match) and lists how many cards each topic has. If it
reports an error, fix `cards.json` and run it again.

When the app is opened from a web server it reads `cards.json` directly, and
falls back to `cards.js` if that fails.

To change the editor password that the files are built with, run:

```sh
node build-cards.js --set-password "your new password"
```

This stores a hash of the password (not the password itself) in
`editor-settings.json` and rebuilds the app.

## Editing the CER questions (for teachers)

The **CER practice** tab asks students to sort statements into Claim,
Evidence and Reasoning. The questions are in `cer-questions.json`:

```json
{
  "id": "ws2-1-q5",
  "topicOrder": 2,
  "source": "Worksheet 2.1, Question 5",
  "situation": "James observed a chilli plant. It had leaves, a stem and many fruits ...",
  "question": "Is his conclusion correct? Explain your answer.",
  "statements": [
    { "text": "The plant has fruits.", "part": "E" },
    { "text": "No. His conclusion is incorrect.", "part": "C" },
    { "text": "Fruits develop from flowers, so it is a flowering plant.", "part": "R" }
  ]
}
```

- `topicOrder` – which flashcard topic the question belongs to. It decides
  the colour and the order of the questions.
- `source` – optional; where the question comes from, e.g. a worksheet
  number. It is shown under the question.
- `situation` – the experiment or observation the student reads first.
  Students can't see the worksheet's diagrams, so describe what they show.
- `question` – the question the claim answers.
- `statements` – each has the `text` and its `part`: `"C"` (claim), `"E"`
  (evidence) or `"R"` (reasoning). Every question needs at least one of each.
  Statements are shown in the order listed, so **mix them up** rather than
  listing C, E, R in order.

After editing, run `node build-cards.js` (see above) to update
`cer-questions.js` and the single-file version.

## Using the app

- Pick a topic, or **Study all topics** to go through every card from Topic 1
  to Topic 10.
- Tap the card (or press **Space**) to flip it.
- After seeing the answer, choose **I knew it ✓** or **Still learning ↻**.
- Move with the arrow buttons, by swiping left or right, or with the **←** and
  **→** keys. Press **1** for "I knew it" and **2** for "Still learning".
- At the end of a deck you can review only the cards you are still learning.
- In **CER practice**, drag each statement into the Claim, Evidence or
  Reasoning box, or tap a statement and then tap a box. On a touch screen,
  drag a statement by its dotted handle. Press **Check my answers** to see
  which statements are in the right box. **Show me the answer** appears after
  a wrong try.
