# claude-ui-workflow — explainer treatment

> Status: DRAFT, awaiting Danny's redline before VO generation.
> Target: SSL 2026 conference (9 May). Repo will be given away — this video
> is the on-stage explainer.
>
> Slug: `claude-ui-workflow`
> Comp: `ClaudeUiWorkflowExplainer`
> Pattern: A2 (chapter factory) + custom text-card visuals (no source clips)
> Length target: 60–75s, 7 scenes
> Bed: HOUSE_DEFAULT @ 0.10 · whoosh in · boom out · no ducking

---

## Brief

Amazon sellers at SSL 2026. They've tried AI design tools and the output
looks like AI made it. They want a real landing page — agency-grade —
without three weeks and £20K of agency time. This video shows them the
10-stage pipeline in plain English, three real brands that shipped
first-pass at REFINE 27/27/28, and how to grab the repo.

- **Feel:** "I can run this Monday morning."
- **Do:** scan the QR / clone the repo before they leave the room.

## Skeleton

**Hook** — AI design tools give you AI-looking output. You needed
something that doesn't scream AI. The trick was always the rules
underneath, not the model on top.

**Hold** — Drop a URL. Brand DNA extracts. Tokens lock as your source of
truth. Fifteen databases and a hundred and sixty-five rules write the
brief themselves. Stitch paints. The audit catches every drift before
you see it. Three real brands ran the full pipeline — all 27–28 / 30 on
the REFINE audit, all shipped first-pass.

**Payoff** — Free. MIT. Pull it from GitHub, run it on your brand,
watch what comes out the other side.

## Treatment table

| # | Scene id | Visual | Motion | Text overlay | Audio (VO) |
|---|---|---|---|---|---|
| 1 | `hook` | Centered: big line "AI gives you AI-looking websites." Smaller italic line below: "And you can spot it from a mile away." Drift + grain BG. | Big line FadeUp at 0f. Italic line FadeUp at delay 60f, opacity 0.7. | Title: 96px Inter, weight 600. Subtitle: 40px italic, TEXT_DIM. | "You're an Amazon seller. You need a landing page. The AI tools you've tried — they give you something that looks like AI made it." |
| 2 | `turn` | Two-line vertical stack. L1 (white): "Agency-quality design." L2 (ACCENT purple): "Without the agency." | L1 FadeUp at 0f. L2 FadeUp at delay 50f. Brief beat between. | Both 92px Inter weight 600, -0.02em tracking. L2 in `#753EF7`. | "What if you could have agency-quality design — without the agency? Without three weeks. Without twenty grand." |
| 3 | `intake` | Top: faux URL bar typing in `https://yourbrand.com`. Middle: animated downward arrow. Bottom: three glass cards appear left-to-right — "COLOURS" "FONTS" "VOICE" — each with a tiny preview swatch / glyph. | URL types char-by-char. Arrow FadeUp + scale at 60f. Cards stagger FadeUp at 90f / 120f / 150f, offsetY 24. | URL bar mono, 36px. Card labels MONO eyebrow 24px, 0.32em letter-spacing, ACCENT_2 amber. | "Drop in a URL. The system extracts the brand DNA. Colours. Fonts. Voice. Hierarchy. All of it — locked as your source of truth." |
| 4 | `system` | Three giant stacked numbers, count-up from 0: "15" / "165" / "10". Each with MONO eyebrow label below: "DATABASES" / "RULES" / "STAGES". Bottom strapline: "The brief writes itself." | Each number counts 0 → target over 30f, staggered 0f / 30f / 60f. Strapline FadeUp at 120f. | Numbers: 220pt Inter weight 700, ACCENT colour. Labels MONO 22px TEXT_DIM. Strapline 48px italic. | "From there, fifteen design databases — a hundred and sixty-five rules — write the brief themselves. Stitch paints the page. The audit catches every drift before you see it." |
| 5 | `proof` | Three brand cards in a horizontal row. Each card: brand name (small caps top), big REFINE score circle in middle (27, 27, 28), tiny "/30" suffix. Brands: RE TECH UK · DATABRILL · PUSH-PULL. | Cards stagger FadeUp delay 0f / 40f / 80f, offsetY 32. Score numbers count-up 0 → target over 25f. | Brand names MONO 28px 0.24em letter-spacing TEXT_DIM. Scores 180pt Inter weight 600 ACCENT. | "Three real brands ran the full pipeline. Re Tech UK — twenty-seven out of thirty. Databrill — twenty-seven. Push-Pull Agency — twenty-eight. All shipped first-pass." |
| 6 | `time` | Single huge number centered: "~50 min". Below: "operator time" appears at beat 1. Below that, smaller TEXT_DIM: "(mostly Stitch taste calls)" appears at beat 2. | Big number FadeUp 0f. "operator time" FadeUp 60f. Caption FadeUp 120f. | Number 280pt Inter weight 700 ACCENT. Subtitle 56px Inter weight 500 TEXT. Caption 36px TEXT_DIM italic. | "Push-Pull took about fifty minutes of operator time. Most of that — making taste calls in Stitch. The system did the rest." |
| 7 | `cta` | Top: claude-ui-workflow logomark / wordmark. Middle: huge URL "github.com/sellersessions/claude-ui-workflow" centered, monospace. Bottom: three-verb chip row "PULL IT · RUN IT · BUILD". | Logo FadeUp 0f. URL FadeUp 40f. Three chips appear staggered 80f / 100f / 120f. | URL 56px MONO white. Chips MONO 22px ACCENT_2 amber, in pill shapes. | "It's free. It's yours. Pull the repo. Run it on your brand. Get to work." |

## Word/timing budget

- Total VO words: ~166 (Scene 7 trimmed from ~24 to ~12 in redline)
- @ 150 wpm: ~66s
- @ 0.9× ElevenLabs speed (house setting): ~74s actual playback
- + PRE_ROLL (1.0s) + POST_ROLL (2.0s) + SFX overlap → comp ~77s total
- Within 75s target band (just over upper bound — acceptable for stage)

## Production decisions for this comp

- **No chapter cards** — `cardBefore: false`. 7 cards × 1.5s = 10.5s of dead time on a 75s comp. Each scene carries its own title inline.
- **No source clips** — every scene has a custom `visual` component. The factory's `sourceMp4` field is omitted.
- **Bed:** HOUSE_DEFAULT @ flat 0.10 (matches StackExplainer floor).
- **SFX volumes:** intro 0.55 / outro 0.55 (matches Stack/Treatment).
- **Voice mode:** chapter (single-stem). Run `post-process.py` for loudnorm + reverb + limiter.

## Open questions for Danny

1. **Subtitle on Scene 1** — happy with "And you can spot it from a mile away" or punchier alternative?
2. **Scene 4 numbers** — is "15 databases / 165 rules / 10 stages" the right trio, or swap one for "4 quality gates" / "6-dimension audit" / "10 skills" / "5 MCPs"?
3. **Scene 5 order** — Re Tech / Databrill / Push-Pull (chronological) — keep, or lead with the highest score (Push-Pull 28)?

## Resolved (28 Apr)

- Scene 7 CTA — no QR (audience invited to repo verbally / on slide), no MIT mention, redrafted to "pull it / run it / get to work" closer.
- Length — at ~77s we're within acceptable range for stage; no further trim needed.
