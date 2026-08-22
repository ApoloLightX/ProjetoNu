# ATLAS — Interview Guide

This guide exists so the project can be explained **without reading the README**.

The goal is not to memorize a speech. The goal is to understand the few decisions that define ATLAS well enough to adapt the explanation to the interviewer.

## 30-second pitch

> ATLAS is an evidence-first risk intelligence project. I started with social, environmental and climate risk, where the difficult part is separating context from actual company-specific evidence and making uncertainty explicit. I built deterministic scoring, an interpretable synthetic ML baseline, an AI analyst with an independent AI reviewer, evidence tracing and human-review gates. Then I applied the same evidence discipline to small businesses with ATLAS Micro: instead of inventing a credit score, it asks what the available data can actually support. The core rule is that missing information is uncertainty, not negative evidence.

## 2-minute explanation

> The project has two modules. ATLAS SAC analyzes social, environmental and climate risk. A real CNPJ can load identity, CNAE, location and provenance, but that registry context has a hard `risk_signal=false` boundary. The actual public SAC simulation remains synthetic, so I never present a real company as having a real SAC score from invented inputs.
>
> The risk engine separates inherent exposure from observed evidence. Deterministic rules produce the scores and review gates. A Logistic Regression model trained on synthetic data demonstrates an interpretable statistical baseline. Gemini then performs a structured analysis, Groq independently challenges unsupported claims, and neither model is allowed to rewrite deterministic scores or remove required human review. Provider failures degrade safely.
>
> ATLAS Micro came from a related information problem: a small business can have a thin formal evidence trail without that absence itself being adverse. The Evidence Passport measures evidence coverage, shows descriptive operational metrics and records what is unknown. Its API contract literally says `credit_decision_produced=false`. Before building a predictive credit model, I want the evidence and governance problem to be correct.

## 90-second product demo narration

### 0–15s — The problem

Open ATLAS SAC.

> “ATLAS starts from evidence rather than a model-generated narrative. Here I can load company registry context, but the system explicitly refuses to treat CNAE or location as adverse evidence.”

### 15–40s — SAC reasoning

Show the risk summary and Evidence Trace.

> “The engine separates inherent exposure from observed signals. Missing evidence affects confidence and can force human review. From a conclusion I can trace backward to the drivers and provenance instead of asking an LLM to explain itself after the fact.”

### 40–55s — AI governance

Show methodology / independent review.

> “The generative layer is downstream. Gemini analyzes a bounded evidence packet, Groq challenges it independently, and neither can change the deterministic score or remove a mandatory review.”

### 55–80s — ATLAS Micro

Open `/micro`, select `Com lacunas`.

> “ATLAS Micro applies the same evidence discipline to small businesses. Notice what happens when I remove customer concentration and debt information: coverage falls and the fields become unknown, but the system does not call the business riskier. Information insufficient is not negative evidence.”

### 80–90s — Boundary

Show the decision-boundary card.

> “And the API contract stays explicit: no credit decision was produced. The product prepares evidence for review, it does not hide a decision behind an AI score.”

## Questions you should be ready for

### Why did you build ATLAS?

A strong answer connects the problem to engineering:

> “I was interested in risk problems where the hardest part is not generating a score, but preserving the meaning of evidence. Social/environmental/climate risk gave me a domain where context, uncertainty and observed events must not be collapsed. ATLAS became a way to explore that rigor through software, data and AI.”

Avoid: “I made it because I wanted a project for a bank.”

### Why can't the AI decide?

> “Because the language model is probabilistic and can produce unsupported or overly confident narratives. I keep decision authority in deterministic, testable logic. The LLMs operate as analyst and challenger, and disagreement or low evidence can increase human review.”

### Why Gemini and Groq?

> “I wanted distinct analyst/reviewer roles and provider separation so the architecture can challenge one model instead of treating one response as truth. But two providers are not proof of independence, which is why I document that as a residual limitation and would measure it with an eval set in a production system.”

### Why Logistic Regression?

> “Because the data is synthetic and the objective is demonstrating a responsible model lifecycle, not winning a benchmark. Logistic Regression gives an interpretable baseline and makes feature choices visible. A complex model would create an illusion of sophistication without validated real data.”

### Why is `evidence_completeness` excluded from the ML risk features?

> “Because low evidence should reduce confidence, not make risk lower or higher by itself. If I included completeness as a risk feature, missing data could accidentally become a shortcut for the model.”

### What is the difference between inherent and observed risk?

> “Inherent risk describes exposure related to sector, geography or climate context. Observed risk is company-specific evidence. A high-exposure sector is not evidence that a specific company did something wrong.”

### Why is CNPJ data `risk_signal=false`?

> “The registry proves identity/context, not adverse behavior. I wanted that boundary in the data contract so the UI or AI layer cannot silently reinterpret a CNAE or location as misconduct.”

### What problem does ATLAS Micro solve?

> “It treats thin or unstructured evidence as an information problem before a prediction problem. The first question is not ‘should this business receive credit?’, but ‘what does the available evidence actually support, and what is still unknown?’”

### Why doesn't ATLAS Micro have a credit score?

> “Because I do not have lawful, representative borrower-outcome data or a validated target. Producing a polished number from synthetic data would be misleading. V8 stops at evidence readiness and descriptive metrics.”

### Why not connect real Open Finance now?

> “Because Open Finance requires a legitimate regulated consent architecture. I should not collect credentials, scrape institutions or pretend the project is a participant. The synthetic boundary lets me test the product semantics without violating that line.”

### Why no Kubernetes?

> “There is no measured orchestration problem to solve. Managed Vercel and Supabase are sufficient for this traffic and topology. I documented specific triggers for queues, caching, replicas or orchestration rather than treating infrastructure names as maturity badges.”

### What happens if Gemini or Groq is down?

> “The optional AI layer degrades. Deterministic results remain available, and the system says the AI review did not complete. Loss of the model reduces capability, not truthfulness.”

### What would you change for real production data?

Mention, in roughly this order:

1. lawful data rights / consent and purpose limitation;
2. representative datasets and target definition;
3. data-quality/provenance contracts;
4. formal model evaluation and temporal validation;
5. fairness/adverse-impact analysis where applicable;
6. reviewer identity, audit logs and appeal/escalation;
7. monitoring, drift/evals and release governance;
8. operational SLOs based on real traffic;
9. rate limiting, backup/RPO/RTO validation and incident ownership.

Do not start with “Kubernetes”.

## Red flags to avoid

Never say:

- “ATLAS is how Nubank does risk.”
- “This model predicts real company risk.”
- “The synthetic ROC-AUC proves the model is accurate in production.”
- “Gemini and Groq eliminate hallucinations.”
- “The project is compliant with financial/environmental regulation.”
- “ATLAS Micro decides who deserves credit.”
- “Open Finance is already integrated.”
- “100% evidence means 100% safe.”

Prefer:

- “experimental methodology”;
- “synthetic baseline”;
- “public registry context”;
- “assistive AI review”;
- “evidence-readiness state”;
- “human-review gate”;
- “current limitation”;
- “revisit trigger”.

## The five sentences to know cold

1. **Evidence before narrative.**
2. **Inherent exposure is not observed misconduct.**
3. **Missing information is uncertainty, not negative evidence.**
4. **AI assists and challenges; it does not own the decision.**
5. **Complexity is added when a measured problem earns it.**

If you can explain those five ideas and point to where each one exists in the code/product, you understand ATLAS well enough to defend it technically.
