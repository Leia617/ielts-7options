# IELTS Gap-Fill Studio

A local Harness plugin that turns today's vocabulary into an IELTS Academic Reading
exercise with **five gaps and seven options**.

## What it does

- Choose an IELTS band from 5.0 to 7.0.
- Paste a student word list, or drop / paste a photo of a word list. A local macOS
  Vision OCR helper extracts candidates for review before generating.
- Generates a roughly 500-word passage with five evenly spaced gaps, a seven-word box,
  two distractors, shuffled answer letters (never A–E in order), Chinese explanations,
  and a key-vocabulary list.
- Lets the student answer inline, checks the score, and reveals explanations.
- Copies the exercise as text, or exports two print-ready A4 PDFs: a student worksheet
  and a teacher copy with the answer key, distractors and vocabulary.

## Where it lives

The plugin adds a **雅思出题** icon to the left sidebar's global panel row and a full
page in the main column. Its settings and last exercise are kept in `localStorage`.
If the Web GUI was already open when the bundle was installed, refresh the page once
so the new client bundle loads.

## Standalone webpage

The Host also serves a self-contained webpage (no React, no app chrome) at
`/ielts-studio` — for example `http://127.0.0.1:51963/ielts-studio` — with the same
band selector, word input, photo OCR, generation, inline answering and PDF export.
It reuses the same-origin API routes below, so it works while the Harness app is
running and the web server is bound to `127.0.0.1` (open it to your local network only
if you also bind the server to a LAN address).

## Local service

The Host half registers four same-origin API routes plus the standalone page:

| Route | Purpose |
|---|---|
| `GET /ielts-studio` | Standalone webpage |
| `GET /x-ielts-studio/info` | Current provider/model and limits |
| `POST /x-ielts-studio/ocr` | Local macOS Vision OCR for an uploaded image |
| `POST /x-ielts-studio/generate` | Structure-checked exercise generation |
| `POST /x-ielts-studio/pdf` | DOCX → PDF export through the Harness `officeToPdf` service |

Generation calls the Harness `llm` service with the currently selected default model
(`agentDefaultModel`). OCR runs locally through a small Swift helper compiled on first
use under the system temporary directory; no image leaves the machine. PDF export builds
a styled DOCX in memory (`docx.js`) and converts it with the installed LibreOffice Kit;
it does not require network access.

## Notes

- Image recognition requires macOS with the Swift command-line tools.
- The model must support text generation with the configured provider; no separate API
  key is stored by this plugin.
- AI output is checked for structural constraints, but teachers should still review it.
