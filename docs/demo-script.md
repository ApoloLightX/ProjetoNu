# ATLAS — Demo Storyboard

The media in the README should show the **real interface**, not AI-generated fake screens.

This file defines the capture sequence so the GIF/video can be recorded quickly and consistently.

## 20-second README GIF

**Goal:** communicate the product thesis with no audio.

Use a 1440×900 or 1280×800 browser viewport. Hide personal browser chrome/bookmarks if possible.

### Timeline

**0–3s — ATLAS SAC**

- Start on the SAC workstation.
- Frame the CNPJ-first header and the evidence-first product statement.
- Small caption in edit: `Evidence before narrative`.

**3–7s — Evidence Trace**

- Scroll/click to the Evidence Trace.
- Expand one conclusion so provenance/drivers are visible.
- Caption: `Trace a conclusion back to evidence`.

**7–10s — Human/AI boundary**

- Briefly show methodology / independent challenge / human-review gate.
- Caption: `AI assists. Humans remain accountable.`

**10–13s — Switch modules**

- Navigate to `/micro`.
- Hold the Evidence Passport complete state for ~2 seconds.

**13–17s — Create uncertainty**

- Click `Com lacunas`.
- Let evidence coverage and unknown fields visibly change.
- Caption: `Missing information ≠ negative evidence`.

**17–20s — Decision boundary**

- Hold on `Nenhuma decisão de crédito foi produzida` and `credit_decision_produced = false`.
- Final caption: `ATLAS · evidence-first risk intelligence`.

### Editing constraints

- No cinematic AI transitions.
- Cursor movements should be slow enough to follow.
- Use hard cuts or subtle 150–250 ms crossfades only.
- 12–15 fps is acceptable for the GIF if file size is too large.
- Target under ~12 MB if possible for a repository README.
- Do not show console keys, environment variables, private dashboards or browser account information.

## 60–90 second technical demo

**Format:** 16:9, 1080p, screen recording + voiceover. No avatar required.

### Script

**0–8s**

> “ATLAS is an evidence-first risk intelligence project with two modules: SAC risk intelligence and a small-business Evidence Passport.”

Show the ATLAS SAC overview.

**8–22s**

> “In SAC, a real CNPJ can load identity, CNAE, location and provenance, but registry context is explicitly not treated as adverse evidence. The actual public risk simulation stays synthetic.”

Show registry context/provenance boundary.

**22–36s**

> “The engine separates inherent exposure from observed signals. Missing evidence affects confidence and may require human review. The Evidence Trace lets a reviewer move backward from a conclusion to its drivers instead of asking an LLM to invent an explanation afterward.”

Show risk summary + Evidence Trace.

**36–50s**

> “AI sits downstream. Gemini performs a structured analysis, Groq challenges unsupported claims, and neither can rewrite deterministic scores or remove a mandatory human-review gate. If the AI path fails, ATLAS degrades to the deterministic result.”

Show methodology / AI review surface.

**50–69s**

> “ATLAS Micro applies the same evidence discipline to small businesses. This Evidence Passport describes a synthetic business. When I remove customer concentration and debt information, the fields become unknown and evidence coverage falls.”

Navigate to `/micro`, click `Com lacunas`.

**69–82s**

> “But missing data does not become negative evidence. The module stops at readiness for review and descriptive metrics. It does not produce a borrower score.”

Show unknown states + gap card.

**82–90s**

> “That boundary is part of the API contract: `credit_decision_produced = false`. The project is built to make evidence, uncertainty and model limits inspectable.”

Hold the decision-boundary card.

## Recording checklist

Before recording:

- production links resolve;
- no Vercel preview protection modal in the final capture;
- ATLAS Micro backend route works in the target environment, or the capture clearly says synthetic fixture;
- no errors in browser console that are visible in the recording;
- use only a fictitious business for synthetic financial metrics;
- no secret/environment screens;
- close unrelated browser tabs;
- zoom 90–100%;
- enable a visible but unobtrusive cursor.

## README placement

Recommended order:

```markdown
[hero]

[Live SAC] [ATLAS Micro] [Architecture] [Demo video]

## 30-second overview

[demo.gif]

## Architecture
[architecture.svg]
```

Do not add the GIF/video link until the real media exists. A broken or placeholder media link is worse than no media.
