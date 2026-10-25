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
| `build-cards.js`| A small script that makes `cards.js`, `cer-questions.js` and the single-file version. |
| `p3-science-flashcards.html` | The whole app in one file, made by `build-cards.js`. |

Each student's progress (cards marked "I knew it" or "Still learning", and
where they stopped in each topic) is saved in their own browser on their own
device. "Reset my progress" at the bottom of the home screen clears it.

## Editing the flashcards (for teachers)

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

## Editing the CER questions (for teachers)

The **CER practice** tab asks students to sort statements into Claim,
Evidence and Reasoning. The questions are in `cer-questions.json`:

```json
{
  "id": "cer-02",
  "topicOrder": 2,
  "situation": "Mei put two similar plants in pots. ...",
  "question": "Do plants need sunlight to stay healthy?",
  "statements": [
    { "text": "Plants use sunlight to make their own food ...", "part": "R" },
    { "text": "Plant B turned yellow and drooped.", "part": "E" },
    { "text": "Plants need sunlight to stay healthy.", "part": "C" },
    { "text": "Plant A stayed green and grew taller.", "part": "E" }
  ]
}
```

- `topicOrder` – which flashcard topic the question belongs to. It decides
  the colour and the order of the questions.
- `situation` – the experiment or observation the student reads first.
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
