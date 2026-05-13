---
title: "Building lab agents with Claude"
slug: "building-lab-agents"
date: "2026-04-11"
excerpt: "An honest log of what worked, what hallucinated, and what I would build next. EPMA data reduction is harder than it sounds."
tags: ["LLM", "EPMA", "tooling"]
category: "code and ai"
readingTime: "4 min"
tape: "lab automation note"
---

The most useful lab agent I have built so far is not glamorous. It does
not make interpretations. It does not name minerals with theatrical
certainty. It mostly checks tables, complains about missing metadata,
and refuses to let me forget which correction scheme I used.

This is, unfortunately, exactly what I need.

## What worked

The agent is strongest when the task is narrow and the evidence is
close at hand:

- Validate column names from exported EPMA sheets.
- Flag impossible totals before they become plots.
- Keep a human-readable reduction log.
- Draft plain-language notes about what changed between runs.

The value is not that the model "does science." The value is that it
gives the boring parts enough memory to become auditable.

## What failed

Anything interpretive became slippery without strict boundaries. The
model wanted to explain before it had earned the right to explain. It
also loved inventing neat sample stories from messy sample tables,
which is a beautiful little trap.

The fix was not a better prompt alone. The fix was structure: typed
inputs, tiny tools, explicit uncertainty, and a rule that every
interpretation has to point back to source data.

## Next build

I want the next version to feel less like a chat and more like a lab
bench: quiet, specific, and hard to confuse. The interface should show
the current reduction state, the raw files it came from, and the exact
checks that passed or failed.

The dream is not automation for its own sake. It is a workflow where I
can trust the provenance enough to spend more time thinking about the
rocks.
