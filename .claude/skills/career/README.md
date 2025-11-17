# Career Application Skills

Socratic-guided job application development using pre-generated career lexicons.

## Overview

5 Claude Code skills that guide you through job description analysis, resume tailoring, gap analysis, and cover letter development using your personal career lexicons.

**Note**: These career skills reference document formatting skills (`format-resume`, `format-cover-letter`) which are separate skills installed at `~/.claude/skills/` root level. Claude Code skills cannot be nested in subdirectories.

## Prerequisites

**You must first generate your career lexicons:**

```bash
cd /path/to/career-lexicon-builder
python run_llm_analysis.py
```

This creates 4 lexicon files in `~/lexicons_llm/`:
- `01_career_philosophy.md` - Your values and leadership approach
- `02_achievement_library.md` - Your achievements with variations
- `03_narrative_patterns.md` - Your storytelling patterns
- `04_language_bank.md` - Your authentic language

## Skills

### 1. Job Description Analysis
**Invoke:** "Analyze this job description"
**Output:** Structured analysis matching your lexicon categories
**Use when:** Starting a new job application

### 2. Resume Alignment
**Invoke:** "Tailor my resume for this job"
**Requires:** Job analysis + your lexicons
**Output:** Tailored resume with source citations
**Use when:** Need customized resume for specific role

### 3. Job Fit Analysis
**Invoke:** "Analyze my fit for this role"
**Requires:** Job analysis + your lexicons
**Output:** Gap analysis + cover letter plan
**Use when:** Want to understand strengths/gaps and plan positioning

### 4. Cover Letter Voice Development
**Invoke:** "Develop my cover letter narrative"
**Requires:** Job analysis + your lexicons
**Output:** Narrative framework + tone profile
**Use when:** Need to find authentic voice for letter

### 5. Collaborative Writing
**Invoke:** "Help me write [anything]"
**Requires:** Your lexicons (optional)
**Output:** Co-created draft
**Use when:** Any professional writing task

## File Organization

```
~/career-applications/
└── YYYY-MM-DD-[job-slug]/
    ├── 01-job-analysis.md
    ├── 02-resume-tailored.md
    ├── 03-gap-analysis-and-cover-letter-plan.md
    ├── 04-cover-letter-framework.md
    └── 05-cover-letter-draft.md (optional)
```

## Workflow Example

```
1. "Analyze this job description" [paste JD]
   → Creates 01-job-analysis.md

2. "Tailor my resume for this role" [upload current resume]
   → Creates 02-resume-tailored.md (all verified from lexicons)

3. "Analyze my fit for this role"
   → Creates 03-gap-analysis-and-cover-letter-plan.md

4. "Develop my cover letter narrative"
   → Creates 04-cover-letter-framework.md

5. "Help me draft the cover letter"
   → Creates 05-cover-letter-draft.md
```

## Key Principles

**Lexicon-Grounded:** All content verified against your lexicons
**No Fabrication:** Every statement traceable to source
**Socratic Process:** One question at a time, user confirmation required
**Evidence-Based:** All outputs include source citations
**Modular:** Use skills independently or in sequence

## Updating Lexicons

When you have new career documents:

```bash
cd /path/to/career-lexicon-builder
# Add new documents to my_documents/
python run_llm_analysis.py
```

Skills automatically use updated lexicons on next invocation.

## Support

Issues or questions: Check skill-specific SKILL.md files for detailed workflows
