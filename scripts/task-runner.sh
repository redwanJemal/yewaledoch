#!/usr/bin/env bash
# =============================================================================
# YeWaledoch Task Runner — Orchestrates Claude Code sessions per task
#
# Usage:
#   ./scripts/task-runner.sh                  # Resume from where we left off
#   ./scripts/task-runner.sh --task 03        # Start/resume specific task
#   ./scripts/task-runner.sh --status         # Show progress summary
#   ./scripts/task-runner.sh --reset 05       # Reset a task to pending
#   ./scripts/task-runner.sh --skip 02        # Skip a task
#   ./scripts/task-runner.sh --all            # Run all pending tasks sequentially
# =============================================================================

set -euo pipefail

# Allow launching Claude from within a Claude session
unset CLAUDECODE 2>/dev/null || true

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TASKS_DIR="$PROJECT_ROOT/docs/tasks"
PROGRESS_FILE="$TASKS_DIR/progress.json"
LOG_DIR="$PROJECT_ROOT/logs/tasks"
PROMPT_DIR="$PROJECT_ROOT/scripts/prompts"

# Ensure directories exist
mkdir -p "$LOG_DIR" "$PROMPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ─── Helpers ─────────────────────────────────────────────────────────────────

log_info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }
log_task()  { echo -e "${CYAN}[TASK]${NC}  $*"; }

# Read a field from progress.json using python
progress_get() {
    python3 -c "
import json, sys
with open('$PROGRESS_FILE') as f:
    data = json.load(f)
keys = '$1'.split('.')
obj = data
for k in keys:
    obj = obj[k]
print(obj if obj is not None else '')
" 2>/dev/null || echo ""
}

# Update progress.json using python
progress_set() {
    local key_path="$1"
    local value="$2"
    python3 -c "
import json, datetime
with open('$PROGRESS_FILE') as f:
    data = json.load(f)

keys = '$key_path'.split('.')
obj = data
for k in keys[:-1]:
    obj = obj[k]

# Try to parse as JSON, fallback to string
val = '$value'
if val in ('null', 'None', ''):
    obj[keys[-1]] = None
elif val in ('true', 'false'):
    obj[keys[-1]] = val == 'true'
else:
    try:
        obj[keys[-1]] = json.loads(val)
    except:
        obj[keys[-1]] = val

data['last_updated'] = datetime.datetime.now(datetime.timezone.utc).isoformat()

with open('$PROGRESS_FILE', 'w') as f:
    json.dump(data, f, indent=2)
"
}

# Get ordered list of task IDs
get_task_ids() {
    python3 -c "
import json
with open('$PROGRESS_FILE') as f:
    data = json.load(f)
for tid in sorted(data['tasks'].keys()):
    print(tid)
"
}

# Get task status
get_task_status() {
    progress_get "tasks.$1.status"
}

# Show progress summary
show_status() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "  YeWaledoch (የወላጆች) — Task Progress"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""

    local total=0 pending=0 running=0 done=0 skipped=0 failed=0

    for tid in $(get_task_ids); do
        local status
        status=$(get_task_status "$tid")
        local title
        title=$(progress_get "tasks.$tid.title")

        total=$((total + 1))

        case "$status" in
            pending)
                echo -e "  ${YELLOW}○${NC}  $tid — $title"
                pending=$((pending + 1))
                ;;
            in_progress)
                echo -e "  ${BLUE}◉${NC}  $tid — $title ${BLUE}(in progress)${NC}"
                running=$((running + 1))
                ;;
            completed)
                echo -e "  ${GREEN}●${NC}  $tid — $title"
                done=$((done + 1))
                ;;
            skipped)
                echo -e "  ${YELLOW}⊘${NC}  $tid — $title ${YELLOW}(skipped)${NC}"
                skipped=$((skipped + 1))
                ;;
            failed)
                echo -e "  ${RED}✗${NC}  $tid — $title ${RED}(failed)${NC}"
                failed=$((failed + 1))
                ;;
        esac
    done

    echo ""
    echo "───────────────────────────────────────────────────────────────"
    echo -e "  Total: $total  ${GREEN}Done: $done${NC}  ${BLUE}Running: $running${NC}  ${YELLOW}Pending: $pending${NC}  ${RED}Failed: $failed${NC}  Skipped: $skipped"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
}

# Find next pending task
find_next_task() {
    # First check if there's an in_progress task (resume it)
    for tid in $(get_task_ids); do
        if [ "$(get_task_status "$tid")" = "in_progress" ]; then
            echo "$tid"
            return
        fi
    done

    # Otherwise find first pending
    for tid in $(get_task_ids); do
        if [ "$(get_task_status "$tid")" = "pending" ]; then
            echo "$tid"
            return
        fi
    done
}

# Build the prompt for a given task
build_prompt() {
    local task_id="$1"
    local task_file="$TASKS_DIR/${task_id}.md"
    local task_content
    task_content=$(cat "$task_file")

    local task_title
    task_title=$(progress_get "tasks.$task_id.title")

    local task_notes
    task_notes=$(progress_get "tasks.$task_id.notes")

    # Check which subtasks are already done
    local subtask_status
    subtask_status=$(python3 -c "
import json
with open('$PROGRESS_FILE') as f:
    data = json.load(f)
subs = data['tasks']['$task_id'].get('subtasks', {})
for k, v in subs.items():
    print(f'  - {k}: {v}')
")

    # Build the full prompt
    cat <<PROMPT_EOF
You are implementing task "$task_title" for the YeWaledoch (የወላጆች) Ethiopian Parenting Community platform.

## PROJECT CONTEXT

This is a Telegram Mini App for Ethiopian parents. Content-first community: scraped Reddit content translated to Amharic, with admin backoffice for review.

\`\`\`
yewaledoch/
├── backend/          # Python FastAPI API
│   ├── app/
│   │   ├── main.py
│   │   ├── api/v1/   # Route handlers
│   │   ├── models/   # SQLAlchemy ORM models
│   │   ├── core/     # Config, DB, security, rate limiting
│   │   └── services/ # Business logic
│   ├── scraper/      # Reddit scraper + AI translator
│   └── alembic/      # Migrations
├── frontend/         # React Telegram Mini App (parents)
│   └── src/
│       ├── pages/    # Page components
│       ├── components/
│       ├── hooks/    # useAuth, usePosts
│       └── lib/      # api.ts, telegram.tsx, i18n.ts
├── admin/            # React admin backoffice (separate SPA)
├── docker-compose.yml
└── scripts/
\`\`\`

**Tech Stack:**
- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0 (async), asyncpg, PostgreSQL 16, Redis 7, Alembic
- **Frontend**: React 18, TypeScript, Vite 5, Tailwind CSS 3, Zustand, TanStack React Query 5, @telegram-apps/sdk-react
- **Admin**: React 18, TypeScript, Vite 5, Tailwind CSS 3 (separate SPA, no Telegram SDK)
- **Auth**: Telegram initData (HMAC-SHA256) → JWT (HS256, 7-day expiry)
- **Scraper**: Reddit JSON API + Claude API for translation

**Key Conventions:**
- API prefix: \`/api/v1\`
- Database: UUID primary keys, async SQLAlchemy 2.0, \`Mapped\` type hints
- Auth: Telegram initData → HMAC-SHA256 validation → JWT token
- Dependencies: \`CurrentUser = Annotated[User, Depends(get_current_user)]\`
- Frontend: Zustand for auth, React Query for data, Tailwind CSS with Telegram theme vars
- i18n: Amharic-first (am), English fallback (en)
- User roles: reader → member → contributor → expert → admin
- Post types: curated (admin), question/tip/story/discussion (contributors)
- No downvotes — supportive community culture

**IMPORTANT — Fork from Gebeya where possible:**
- Reference project at \`/home/redman/gebeya\` — same tech stack, same Telegram Mini App pattern
- Copy and adapt: auth flow, Telegram SDK integration, API client, Tailwind config, Docker setup
- Match Gebeya's code style: imports, type hints, error handling, component patterns
- Read Gebeya files before writing new code to ensure consistency

## SUBTASK PROGRESS

These subtasks have already been tracked:
$subtask_status

${task_notes:+Previous notes: $task_notes}

## TASK SPECIFICATION

$task_content

## ERROR HANDLING POLICY (CRITICAL — NO WORKAROUNDS)

- NEVER use workarounds, hacks, or shortcuts to bypass errors
- NEVER use \`// @ts-ignore\`, \`any\` type, \`--no-verify\`, or \`--force\` to make things pass
- NEVER skip a failing step — fix the root cause
- If a build fails, read the FULL error, understand WHY, and fix the source
- Take your time. Research the issue. Read relevant source files. Fix it properly.

## INSTRUCTIONS

1. Read the task specification carefully. Read ALL referenced files before making changes.
2. Read existing project files to understand what's already built.
3. For backend: follow Gebeya patterns (read the reference files listed in the task).
4. For frontend: follow Gebeya's React/TypeScript patterns.
5. For backend changes: ensure \`cd backend && python -c "from app.main import app"\` succeeds.
6. For frontend changes: ensure \`cd frontend && npm run build\` succeeds.
7. For admin changes: ensure \`cd admin && npm run build\` succeeds.
8. For Alembic changes: create and apply migrations.
9. After ALL work is done, update the progress file at \`docs/tasks/progress.json\`:
   - Set \`tasks.${task_id}.status\` to \`"completed"\`
   - Set each subtask to \`"completed"\` as you finish them
   - Set \`tasks.${task_id}.completed_at\` to current ISO timestamp
   - Add any important notes to \`tasks.${task_id}.notes\`
10. Finally, create a git commit with message: \`feat: implement ${task_id} — ${task_title}\`

DO NOT skip any part of the task. Implement everything listed in the spec.
If you encounter a blocker, update progress.json notes field with the issue and set status to "failed".
PROMPT_EOF
}

# Run a single task via claude
run_task() {
    local task_id="$1"
    local task_file="$TASKS_DIR/${task_id}.md"
    local log_file="$LOG_DIR/${task_id}-$(date +%Y%m%d-%H%M%S).log"
    local prompt_file="$PROMPT_DIR/${task_id}.md"

    if [ ! -f "$task_file" ]; then
        log_error "Task file not found: $task_file"
        return 1
    fi

    local task_title
    task_title=$(progress_get "tasks.$task_id.title")

    log_task "════════════════════════════════════════════════════════"
    log_task "Starting: $task_id — $task_title"
    log_task "════════════════════════════════════════════════════════"

    # Update progress
    progress_set "tasks.$task_id.status" "in_progress"
    progress_set "tasks.$task_id.started_at" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    progress_set "current_task" "$task_id"

    # Build and save prompt
    build_prompt "$task_id" > "$prompt_file"
    log_info "Prompt saved to: $prompt_file"
    log_info "Log file: $log_file"

    # Run claude with the prompt
    log_info "Launching Claude Code session..."
    echo ""

    local exit_code=0
    cat "$prompt_file" | claude -p \
        --dangerously-skip-permissions \
        --verbose \
        2>&1 | tee "$log_file" || exit_code=$?

    echo ""

    if [ $exit_code -ne 0 ]; then
        log_error "Claude session exited with code $exit_code"
        if grep -q "context window" "$log_file" 2>/dev/null || grep -q "too long" "$log_file" 2>/dev/null; then
            log_warn "Possible context window exhaustion. Task will resume on next run."
            progress_set "tasks.$task_id.notes" "Context window exhausted — needs continuation"
        else
            progress_set "tasks.$task_id.status" "failed"
            progress_set "tasks.$task_id.notes" "Exited with code $exit_code — check log: $log_file"
        fi
        return 1
    fi

    # Check if claude marked it as completed
    local final_status
    final_status=$(get_task_status "$task_id")

    if [ "$final_status" = "completed" ]; then
        log_ok "Task $task_id completed successfully!"
    elif [ "$final_status" = "failed" ]; then
        log_error "Task $task_id was marked as failed. Check notes."
        return 1
    else
        log_warn "Task $task_id session ended but status is: $final_status"
        log_warn "Claude may not have finished. Will resume on next run."
    fi

    progress_set "current_task" "null"
    return 0
}

# ─── Main ────────────────────────────────────────────────────────────────────

main() {
    cd "$PROJECT_ROOT"

    # Parse arguments
    case "${1:-}" in
        --status|-s)
            show_status
            exit 0
            ;;
        --task|-t)
            if [ -z "${2:-}" ]; then
                log_error "Usage: $0 --task <task-number>"
                exit 1
            fi
            # Find task ID matching the number
            local target_id=""
            for tid in $(get_task_ids); do
                if [[ "$tid" == "${2}"* ]] || [[ "$tid" == *"-${2}-"* ]] || [[ "$tid" == "${2}" ]]; then
                    target_id="$tid"
                    break
                fi
            done
            if [ -z "$target_id" ]; then
                local padded
                padded=$(printf "%02d" "$2")
                for tid in $(get_task_ids); do
                    if [[ "$tid" == "${padded}-"* ]]; then
                        target_id="$tid"
                        break
                    fi
                done
            fi
            if [ -z "$target_id" ]; then
                log_error "Task not found: $2"
                exit 1
            fi
            run_task "$target_id"
            exit $?
            ;;
        --reset|-r)
            if [ -z "${2:-}" ]; then
                log_error "Usage: $0 --reset <task-number>"
                exit 1
            fi
            local padded
            padded=$(printf "%02d" "$2")
            for tid in $(get_task_ids); do
                if [[ "$tid" == "${padded}-"* ]]; then
                    progress_set "tasks.$tid.status" "pending"
                    progress_set "tasks.$tid.started_at" "null"
                    progress_set "tasks.$tid.completed_at" "null"
                    progress_set "tasks.$tid.notes" ""
                    log_ok "Reset task: $tid"
                    exit 0
                fi
            done
            log_error "Task not found: $2"
            exit 1
            ;;
        --skip)
            if [ -z "${2:-}" ]; then
                log_error "Usage: $0 --skip <task-number>"
                exit 1
            fi
            local padded
            padded=$(printf "%02d" "$2")
            for tid in $(get_task_ids); do
                if [[ "$tid" == "${padded}-"* ]]; then
                    progress_set "tasks.$tid.status" "skipped"
                    log_ok "Skipped task: $tid"
                    exit 0
                fi
            done
            log_error "Task not found: $2"
            exit 1
            ;;
        --all|-a)
            log_info "Running ALL pending tasks sequentially..."
            show_status

            while true; do
                local next
                next=$(find_next_task)
                if [ -z "$next" ]; then
                    log_ok "All tasks complete!"
                    break
                fi

                if ! run_task "$next"; then
                    log_error "Task $next failed. Stopping."
                    log_warn "Fix the issue and re-run, or use --skip to skip it."
                    show_status
                    exit 1
                fi

                # Brief pause between tasks
                log_info "Pausing 5s before next task..."
                sleep 5
            done

            show_status
            exit 0
            ;;
        --help|-h)
            echo ""
            echo "YeWaledoch (የወላጆች) Task Runner"
            echo ""
            echo "Usage:"
            echo "  $0                    Resume from next pending/in-progress task"
            echo "  $0 --all              Run ALL pending tasks sequentially"
            echo "  $0 --task <N>         Run specific task (e.g., --task 03)"
            echo "  $0 --status           Show progress summary"
            echo "  $0 --reset <N>        Reset a task to pending"
            echo "  $0 --skip <N>         Skip a task"
            echo "  $0 --help             Show this help"
            echo ""
            exit 0
            ;;
        "")
            # Default: find next task and run it
            local next
            next=$(find_next_task)
            if [ -z "$next" ]; then
                log_ok "All tasks are complete!"
                show_status
                exit 0
            fi

            show_status
            log_info "Next task: $next"
            echo ""
            read -p "Start task $next? [Y/n] " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Nn]$ ]]; then
                log_info "Aborted."
                exit 0
            fi

            run_task "$next"
            ;;
        *)
            log_error "Unknown option: $1. Use --help for usage."
            exit 1
            ;;
    esac
}

main "$@"
