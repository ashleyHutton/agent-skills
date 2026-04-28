#!/usr/bin/env bash
# sentry.sh — thin wrapper around the Sentry REST API for read-only issue/event access.
#
# Auth: reads token from $SENTRY_AUTH_TOKEN, else ~/.config/sentry/token.
# Base URL: $SENTRY_HOST (default https://sentry.io).
#
# Usage:
#   sentry.sh orgs
#   sentry.sh projects <org>
#   sentry.sh issue <org> <issue_id> [--full]
#   sentry.sh event <org> <issue_id> [--full]   # latest event (stack trace + breadcrumbs)
#   sentry.sh events <org> <issue_id> [--full]  # paginated event list
#   sentry.sh tags <org> <issue_id>
#   sentry.sh activity <org> <issue_id>
#   sentry.sh hashes <org> <issue_id>
#   sentry.sh search <org> <query...>           # e.g. 'is:unresolved project:web'
#   sentry.sh raw <path>                        # arbitrary GET, e.g. /api/0/organizations/foo/
#
# Trimmed by default (jq-filtered) so output is small. Pass --full for raw JSON.

set -euo pipefail

SENTRY_HOST="${SENTRY_HOST:-https://sentry.io}"

if [[ -z "${SENTRY_AUTH_TOKEN:-}" ]]; then
  if [[ -r "$HOME/.config/sentry/token" ]]; then
    SENTRY_AUTH_TOKEN="$(cat "$HOME/.config/sentry/token")"
  else
    echo "error: no SENTRY_AUTH_TOKEN env var and no ~/.config/sentry/token file" >&2
    exit 2
  fi
fi

api() {
  local body status
  body=$(curl -sS \
    -w $'\n__HTTP_STATUS__:%{http_code}' \
    -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
    -H "Accept: application/json" \
    "$SENTRY_HOST$1")
  status="${body##*__HTTP_STATUS__:}"
  body="${body%$'\n'__HTTP_STATUS__:*}"
  if [[ "$status" -ge 400 ]]; then
    echo "error: HTTP $status from $1" >&2
    echo "$body" >&2
    return 1
  fi
  printf '%s' "$body"
}

have_jq() { command -v jq >/dev/null 2>&1; }
pretty() { if have_jq; then jq .; else cat; fi; }

trim_issue() {
  if ! have_jq; then cat; return; fi
  jq '{
    id, shortId, title, culprit, level, status, substatus,
    permalink, count, userCount, firstSeen, lastSeen,
    project: .project.slug, platform,
    assignedTo, metadata
  }'
}

trim_event() {
  if ! have_jq; then cat; return; fi
  jq '{
    id, eventID, dateCreated, platform, message, title, culprit,
    tags: ((.tags // []) | map({(.key): .value}) | add),
    user,
    contexts: ((.contexts // {}) | with_entries(select(.key | IN("runtime","browser","os","device","trace")))),
    request: (if .request == null then null else {url: .request.url, method: .request.method, headers: ((.request.headers // []) | map({(.[0]): .[1]}) | add)} end),
    exception: (((.entries // []) | map(select(.type=="exception")) | .[0].data.values) // null
                | if . == null then null else map({
                    type, value, module,
                    stacktrace: (if .stacktrace == null then null else {
                      frames: ((.stacktrace.frames // []) | map({
                        filename, function, module, lineno, colno, inApp,
                        contextLine: .context_line,
                        preContext: .pre_context,
                        postContext: .post_context,
                        vars
                      }))
                    } end)
                  }) end),
    breadcrumbs: (((.entries // []) | map(select(.type=="breadcrumbs")) | .[0].data.values) // [] | map({timestamp, type, category, level, message, data})),
    message_entry: (((.entries // []) | map(select(.type=="message")) | .[0].data) // null)
  }'
}

cmd="${1:-}"
[[ -z "$cmd" ]] && { sed -n '2,20p' "$0"; exit 1; }
shift || true

case "$cmd" in
  orgs)
    api "/api/0/organizations/" | (have_jq && jq 'map({slug, name, id})' || cat)
    ;;
  projects)
    org="${1:?org slug required}"
    api "/api/0/organizations/$org/projects/" | (have_jq && jq 'map({slug, name, id, platform})' || cat)
    ;;
  issue)
    org="${1:?org required}"; id="${2:?issue id required}"; full="${3:-}"
    if [[ "$full" == "--full" ]]; then
      api "/api/0/organizations/$org/issues/$id/" | pretty
    else
      api "/api/0/organizations/$org/issues/$id/" | trim_issue
    fi
    ;;
  event)
    org="${1:?org required}"; id="${2:?issue id required}"; full="${3:-}"
    if [[ "$full" == "--full" ]]; then
      api "/api/0/organizations/$org/issues/$id/events/latest/" | pretty
    else
      api "/api/0/organizations/$org/issues/$id/events/latest/" | trim_event
    fi
    ;;
  events)
    org="${1:?org required}"; id="${2:?issue id required}"; full="${3:-}"
    if [[ "$full" == "--full" ]]; then
      api "/api/0/organizations/$org/issues/$id/events/" | pretty
    else
      api "/api/0/organizations/$org/issues/$id/events/" | (have_jq && jq 'map({id, eventID, dateCreated, message, "user.email": .user.email})' || cat)
    fi
    ;;
  tags)
    api "/api/0/organizations/${1:?org}/issues/${2:?id}/tags/" | pretty
    ;;
  activity)
    api "/api/0/organizations/${1:?org}/issues/${2:?id}/activity/" | pretty
    ;;
  hashes)
    api "/api/0/organizations/${1:?org}/issues/${2:?id}/hashes/" | pretty
    ;;
  search)
    org="${1:?org required}"; shift
    query="$*"
    if have_jq; then
      q=$(jq -rn --arg q "$query" '$q|@uri')
    else
      q="${query// /%20}"
    fi
    api "/api/0/organizations/$org/issues/?query=$q" | (have_jq && jq 'map({shortId, id, title, level, status, count, userCount, lastSeen, project: .project.slug})' || cat)
    ;;
  raw)
    api "${1:?path required}" | pretty
    ;;
  *)
    echo "unknown command: $cmd" >&2
    exit 1
    ;;
esac
