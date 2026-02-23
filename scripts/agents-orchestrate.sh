#!/usr/bin/env bash
set -euo pipefail

status_labels=("status:wip" "status:ready" "status:blocked" "status:review")
agent_labels=("agent:triage" "agent:review-spec" "agent:implementation")
priority_labels=("priority:p0" "priority:p1" "priority:p2" "priority:p3")
ready_labels=("ready:review-spec" "ready:implementation")

ensure_label() {
  local name="$1" color="$2" desc="$3"
  if gh label list --limit 200 --json name --jq '.[].name' | rg -Fx "$name" >/dev/null; then
    gh label edit "$name" --color "$color" --description "$desc" >/dev/null
  else
    gh label create "$name" --color "$color" --description "$desc" >/dev/null
  fi
}

current_status() {
  local issue="$1"
  gh issue view "$issue" --json labels --jq '[.labels[].name | select(startswith("status:"))][0] // ""'
}

current_agent() {
  local issue="$1"
  gh issue view "$issue" --json labels --jq '[.labels[].name | select(startswith("agent:"))][0] // ""'
}

current_priority() {
  local issue="$1"
  gh issue view "$issue" --json labels --jq '[.labels[].name | select(startswith("priority:"))][0] // ""'
}

clear_status() {
  local issue="$1"
  for l in "${status_labels[@]}"; do
    gh issue edit "$issue" --remove-label "$l" >/dev/null || true
  done
}

clear_agents() {
  local issue="$1"
  for l in "${agent_labels[@]}"; do
    gh issue edit "$issue" --remove-label "$l" >/dev/null || true
  done
}

clear_priorities() {
  local issue="$1"
  for l in "${priority_labels[@]}"; do
    gh issue edit "$issue" --remove-label "$l" >/dev/null || true
  done
}

clear_ready() {
  local issue="$1"
  for l in "${ready_labels[@]}"; do
    gh issue edit "$issue" --remove-label "$l" >/dev/null || true
  done
}

spec_ready_for_issue() {
  local issue="$1"
  rg -l "issue[-_ ]?${issue}|#${issue}\b" specs >/dev/null 2>&1
}

ensure_label "status:wip" "FBCA04" "Trabajo en curso"
ensure_label "status:ready" "0E8A16" "Listo para tomar"
ensure_label "status:blocked" "B60205" "Bloqueado por dependencia o decision"
ensure_label "status:review" "1D76DB" "En revision de PR"
ensure_label "agent:triage" "C2E0C6" "Asignado al Issue Triage Agent"
ensure_label "agent:review-spec" "5319E7" "Asignado al Review Spec Agent"
ensure_label "agent:implementation" "0052CC" "Asignado al Implementation Agent"
ensure_label "priority:p0" "B60205" "Urgente: caida/seguridad/bloqueo"
ensure_label "priority:p1" "D93F0B" "Alta: regresion visible al usuario"
ensure_label "priority:p2" "FBCA04" "Media: feature importante sin urgencia"
ensure_label "priority:p3" "0E8A16" "Baja: mejora o backlog"
ensure_label "ready:review-spec" "7057FF" "Listo para subagente review-spec"
ensure_label "ready:implementation" "1A7F37" "Listo para subagente implementation"

pr_issue_numbers=$(gh pr list --state open --limit 200 --json closingIssuesReferences --jq '.[] | .closingIssuesReferences[]?.number' || true)

for issue in $(gh issue list --state open --limit 200 --json number --jq '.[].number'); do
  if printf '%s\n' "$pr_issue_numbers" | rg -Fx "$issue" >/dev/null; then
    clear_status "$issue"
    clear_agents "$issue"
    clear_ready "$issue"
    gh issue edit "$issue" --add-label "status:wip" >/dev/null
    continue
  fi

  status=$(current_status "$issue")
  if [ -z "$status" ]; then
    clear_status "$issue"
    gh issue edit "$issue" --add-label "status:ready" >/dev/null
    status="status:ready"
  fi

  if [ "$status" = "status:ready" ]; then
    agent=$(current_agent "$issue")
    if [ -z "$agent" ]; then
      clear_agents "$issue"
      gh issue edit "$issue" --add-label "agent:triage" >/dev/null
      agent="agent:triage"
    fi

    if [ "$agent" = "agent:triage" ]; then
      priority=$(current_priority "$issue")
      if [ -z "$priority" ]; then
        clear_priorities "$issue"
        gh issue edit "$issue" --add-label "priority:p2" >/dev/null
      fi

      clear_agents "$issue"
      clear_ready "$issue"
      if spec_ready_for_issue "$issue"; then
        gh issue edit "$issue" --add-label "agent:implementation" >/dev/null
        gh issue edit "$issue" --add-label "ready:implementation" >/dev/null
      else
        gh issue edit "$issue" --add-label "agent:review-spec" >/dev/null
        gh issue edit "$issue" --add-label "ready:review-spec" >/dev/null
      fi
    fi
  fi

done

gh issue list --state open --limit 200 --json number,title,labels --jq '.[] | {number,title,status: ([.labels[].name | select(startswith("status:"))][0] // "status:none"), agent: ([.labels[].name | select(startswith("agent:"))][0] // "agent:none"), priority: ([.labels[].name | select(startswith("priority:"))][0] // "priority:none"), ready: ([.labels[].name | select(startswith("ready:"))][0] // "ready:none")}'
