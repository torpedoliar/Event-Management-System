# Superpowers + Qwen Code Integration Guide

## What Was Installed

The **Superpowers framework** has been successfully integrated with your Qwen Code installation. This provides a professional, repeatable software development methodology for AI-assisted coding.

### Installed Components

1. **14 Skills** - Located in `~/.qwen/skills/superpowers/`
2. **Integration Config** - `~/.qwen/SUPERPOWERS.md`
3. **User Guide** - `~/.qwen/skills/superpowers-integration.md`
4. **Source Repository** - `~/.qwen/superpowers/` (for updates)

## Quick Reference Card

### When to Use Which Skill

| Your Request | Skill That Activates | What It Does |
|--------------|---------------------|--------------|
| "Build X feature" | `brainstorming` | Design & requirements |
| "Plan this out" | `writing-plans` | Detailed implementation plan |
| "Execute the plan" | `executing-plans` or `subagent-driven-development` | Build it step-by-step |
| "Add tests" | `test-driven-development` | RED-GREEN-REFACTOR |
| "Fix this bug" | `systematic-debugging` | Root cause analysis |
| "Review my code" | `requesting-code-review` | Structured review |
| "Clean up branch" | `finishing-a-development-branch` | Merge & cleanup |

### The Development Pipeline

```
┌─────────────────┐
│  BRAINSTORMING  │ ← Design approval required
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ WRITING PLANS   │ ← Implementation plan created
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ EXECUTION (choose one): │
│  • executing-plans      │ ← Inline step-by-step
│  • subagent-driven-dev  │ ← Parallel agents
└────────┬────────────────┘
         │
         ▼
┌─────────────────┐
│ CODE REVIEW     │ ← Quality checks
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ GIT CLEANUP     │ ← Branch merge & cleanup
└─────────────────┘
```

## Detailed Skill Descriptions

### 1. Brainstorming (Design Phase)

**Purpose**: Turn vague ideas into fully formed designs before any code is written.

**Process**:
1. Explores your project context (files, docs, commits)
2. Asks clarifying questions (one at a time)
3. Proposes 2-3 approaches with trade-offs
4. Presents design sections for your approval
5. Writes spec to `docs/superpowers/specs/YYYY-MM-DD-design.md`
6. Self-reviews for quality
7. You review the spec
8. Transitions to planning

**Key Rules**:
- NO implementation without approved design
- One question at a time
- YAGNI (remove unnecessary features)
- Design can be short for simple things, but MUST exist

**Example**:
```
You: "I want to add dark mode to the app"
Qwen: [Invokes brainstorming]
      → "Let me check your current theme setup..."
      → "Question 1: Should dark mode be automatic or user-toggleable?"
      → [After discussion] "I recommend approach B because..."
      → "Design spec written to docs/superpowers/specs/2026-04-15-dark-mode-design.md"
      → "Please review before we proceed to planning"
```

### 2. Writing Plans (Implementation Planning)

**Purpose**: Create bite-sized, detailed implementation plans with exact file paths and code.

**Process**:
1. Reads the approved spec
2. Maps file structure (what to create/modify)
3. Writes tasks with 2-5 minute steps
4. Each step includes:
   - Exact file paths
   - Complete code snippets
   - Exact commands
   - Expected output
5. Self-reviews for coverage and consistency
6. Offers execution options

**Plan Format**:
```markdown
### Task 1: User Authentication

**Files:**
- Create: `src/auth/login.ts`
- Modify: `src/app.ts:45-67`
- Test: `tests/auth/login.test.ts`

- [ ] **Step 1: Write the failing test**
[test code here]

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test tests/auth/login.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**
[code here]

- [ ] **Step 4: Run test to verify it passes**
Expected: PASS

- [ ] **Step 5: Commit**
git commit -m "feat: add login authentication"
```

### 3. Test-Driven Development

**Purpose**: Enforces RED-GREEN-REFACTOR cycle for quality code.

**Process**:
1. Write the FAILING test first
2. Run to verify it fails
3. Write MINIMAL code to pass
4. Run to verify it passes
5. Refactor (clean up, improve design)
6. Commit

**Hard Rules**:
- MUST write test before implementation
- MUST verify test fails first
- Implementation code deleted if test not written

### 4. Systematic Debugging

**Purpose**: 4-phase root cause analysis for efficient debugging.

**Phases**:
1. **Reproduce** - Confirm the bug exists consistently
2. **Isolate** - Narrow down the location
3. **Identify** - Find root cause
4. **Fix & Verify** - Solve and confirm

**Techniques**:
- Root cause tracing
- Defense in depth
- Condition-based waiting
- Test design patterns

### 5. Subagent-Driven Development

**Purpose**: Fast iteration with isolated task execution.

**Process**:
1. Dispatch fresh subagent per task
2. Subagent implements task independently
3. Two-stage review:
   - Stage 1: Spec compliance check
   - Stage 2: Code quality review
4. Iterate until all tasks complete

**Benefits**:
- Parallel execution (faster)
- Isolated context (cleaner)
- Built-in review process

### 6. Code Review Skills

**requesting-code-review**:
- Prepares checklist before requesting review
- Ensures all quality checks pass
- Structures review request for clarity

**receiving-code-review**:
- Handles feedback systematically
- Addresses comments in priority order
- Tracks resolution

### 7. Git Workflow Skills

**using-git-worktrees**:
- Creates isolated environments for tasks
- Prevents context conflicts
- Clean separation of work

**finishing-a-development-branch**:
- Merges completed work
- Cleans up temporary branches
- Updates documentation

### 8. Meta Skills

**using-superpowers**:
- Skill discovery and usage guide
- Activates at session start
- Helps choose right skill for context

**writing-skills**:
- Create new custom skills
- Follow skill authoring guidelines
- Test skills with subagents

## Project Structure After Integration

```
E:\Vibe\Registrasi Tamu\
├── docs/
│   └── superpowers/           # Created during use
│       ├── specs/             # Design documents
│       └── plans/             # Implementation plans
└── [your existing files]

~/.qwen/
├── skills/
│   ├── superpowers/           # 14 skills installed here
│   └── superpowers-integration.md
├── superpowers/               # Source repository
├── SUPERPOWERS.md             # Integration overview
└── settings.json              # Qwen configuration
```

## Common Workflows

### Workflow 1: Building a New Feature

```bash
# 1. Start with brainstorming
You: "Let's add CSV import for guests"

# Qwen automatically:
# - Explores current guest import code
# - Asks about format requirements
# - Proposes parsing approaches
# - Presents design
# - You approve
# - Writes spec

# 2. Planning phase
Qwen: "Now creating implementation plan..."
# - Maps exact file changes
# - Writes step-by-step tasks
# - Includes test code
# - You review plan

# 3. Execution phase
You: "Use subagent-driven development"
# - Fresh subagent per task
# - Two-stage review
# - All tasks complete

# 4. Review & merge
# - Code review checklist
# - Fix any issues
# - Merge to main branch
```

### Workflow 2: Fixing a Bug

```bash
# 1. Debug systematically
You: "Check-in QR scanner isn't working on mobile"

Qwen: [Invokes systematic-debugging]
# Phase 1: Reproduce on mobile device
# Phase 2: Isolate to camera permission or QR library
# Phase 3: Identify root cause (library version mismatch)
# Phase 4: Fix and verify on multiple devices

# 2. Quick design if needed
You: "This needs a proper fix, not a hack"
Qwen: [Invokes brainstorming for design]
# → Short design → approval → plan → implement

# 3. Test & commit
# → TDD for regression test
# → Commit with descriptive message
```

### Workflow 3: Adding Tests to Existing Code

```bash
You: "Add tests for the lucky draw feature"

Qwen: [Invokes test-driven-development]
# Even though code exists, tests written FIRST
# → Write test for current behavior
# → Run to verify
# → Commit tests separately
# → Improve code if tests reveal issues
```

## Customization

### Disable a Skill Temporarily

Tell Qwen: "Don't use [skill-name] for this task"

Or rename the skill folder:
```bash
mv ~/.qwen/skills/superpowers/brainstorming ~/.qwen/skills/superpowers/brainstorming.disabled
```

### Create Custom Skills

1. Create folder: `~/.qwen/skills/my-custom-skill/`
2. Add `SKILL.md` with frontmatter:
```yaml
---
name: my-custom-skill
description: "When to use this skill"
---

# Your skill content
```
3. Qwen auto-discovers it

### Project-Specific Overrides

Create `QWEN.md` in project root:
```markdown
# Our team preferences
- Skip brainstorming for hotfixes
- Always use TDD for backend
- Use executing-plans (not subagents) for simplicity
```

## Updating Superpowers

```bash
# Windows PowerShell
cd $env:USERPROFILE\.qwen\superpowers
git pull origin main

# Restart Qwen Code to reload skills
```

## Troubleshooting

### Skills Not Loading

**Check 1**: Skills directory exists
```powershell
Test-Path "$env:USERPROFILE\.qwen\skills\superpowers"
```

**Check 2**: SKILL.md files have frontmatter
```powershell
Get-Content "$env:USERPROFILE\.qwen\skills\superpowers\brainstorming\SKILL.md" -Head 5
```

**Fix**: Restart Qwen Code session

### Want to See Which Skills Are Available

Ask Qwen: "What skills do you have available?"

It should list all 14 skills with descriptions.

### Skills Not Triggering Automatically

Tell Qwen: "Use the using-superpowers skill"

This forces skill discovery and activation.

## Best Practices

1. **Always start with context** - Let Qwen explore before building
2. **Approve designs explicitly** - Don't skip the review step
3. **Keep plans bite-sized** - 2-5 minutes per step
4. **Tests first, always** - Even for "simple" changes
5. **Commit frequently** - Save progress at each milestone
6. **Review before merge** - Use code review skills
7. **Clean up after** - Finish branches properly

## Support Resources

| Resource | Location |
|----------|----------|
| Integration Guide | `~/.qwen/skills/superpowers-integration.md` |
| Quick Reference | `~/.qwen/SUPERPOWERS.md` |
| Skill Documentation | `~/.qwen/skills/superpowers/[skill-name]/SKILL.md` |
| Original Project | `~/.qwen/superpowers/docs/` |
| Online Docs | https://github.com/obra/superpowers |

## Next Steps

1. ✅ **Integration complete** - All 14 skills installed
2. 🔄 **Try it out** - Ask Qwen to plan or build something
3. 📚 **Read skills** - Browse `~/.qwen/skills/superpowers/`
4. 🔄 **Stay updated** - Pull latest changes periodically
5. 🔄 **Customize** - Create your own skills or modify existing ones

---

**Installed**: 2026-04-15  
**Framework**: Superpowers v1.0  
**Integration**: Qwen Code  
**Status**: ✅ Ready to use
