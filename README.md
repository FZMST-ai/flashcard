# P3 Science Flashcards

A simple flashcard app to help Primary 3 students revise Science. It works
offline on phones, tablets and laptops. There is nothing to install.

## Opening the app

**Easiest way:** double-click `index.html`. It opens in your web browser and
works straight away, even without internet.

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
| `build-cards.js`| A small script that makes `cards.js` from `cards.json`.     |

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

It checks your cards for common mistakes (a missing field, a repeated id, a
topic name that doesn't match) and lists how many cards each topic has. If it
reports an error, fix `cards.json` and run it again.

When the app is opened from a web server it reads `cards.json` directly, and
falls back to `cards.js` if that fails.

## Using the app

- Pick a topic, or **Study all topics** to go through every card from Topic 1
  to Topic 10.
- Tap the card (or press **Space**) to flip it.
- After seeing the answer, choose **I knew it ✓** or **Still learning ↻**.
- Move with the arrow buttons, by swiping left or right, or with the **←** and
  **→** keys. Press **1** for "I knew it" and **2** for "Still learning".
- At the end of a deck you can review only the cards you are still learning.
