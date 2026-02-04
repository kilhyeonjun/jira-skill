---
name: jira
description: Jira Cloud API integration for worklog management, issue operations, and description updates with ADF (Atlassian Document Format) support. This skill should be used when interacting with Jira - adding worklogs, searching issues, updating descriptions, or adding comments.
---

# Jira Skill

## Overview

This skill provides Jira Cloud REST API integration through TypeScript CLI scripts. It handles:

- **Worklog operations**: Add, list, update, delete time tracking entries
- **Issue operations**: Search via JQL, get details, update descriptions
- **Status transitions**: List available transitions, change issue status
- **Label operations**: Add, remove, or replace labels on issues
- **ADF conversion**: Automatic Markdown-to-ADF conversion for descriptions and comments

For API reference, see `references/api_reference.md`.
For ADF format details, see `references/adf-format.md`.

## Prerequisites

To use this skill, configure the following environment variables:

```bash
export JIRA_BASE_URL="https://your-domain.atlassian.net"
export JIRA_USERNAME="user@example.com"
export JIRA_API_TOKEN="your-api-token"
```

## Worklog Operations

Script: `scripts/worklog.ts`

### Add Worklog

```bash
npx tsx scripts/worklog.ts add <issueKey> <time> <date> [comment]
```

Examples:

```bash
npx tsx scripts/worklog.ts add DEV-1234 "2h 30m" "1/21" "Fixed authentication bug"
npx tsx scripts/worklog.ts add DEV-1234 "4h" "2026-01-22"
```

### List Worklogs

```bash
npx tsx scripts/worklog.ts list <issueKey>
```

### Update Worklog

```bash
npx tsx scripts/worklog.ts update <issueKey> <worklogId> [--time <time>] [--date <date>] [--comment <comment>]
```

Example:

```bash
npx tsx scripts/worklog.ts update DEV-1234 12345 --time "3h" --date "1/22"
```

### Delete Worklog

```bash
npx tsx scripts/worklog.ts delete <issueKey> <worklogId>
```

## Issue Operations

Script: `scripts/issue.ts`

### Create Issue

```bash
npx tsx scripts/issue.ts create <projectKey> <issueType> <summary> [options]
```

Options:

- `--description <markdown>` - Issue description in markdown
- `--labels <label1,label2>` - Comma-separated labels
- `--assignee me` - Assign to current user

Examples:

```bash
npx tsx scripts/issue.ts create DEV Task "Implement user authentication"
npx tsx scripts/issue.ts create DEV Bug "Fix login error" --description "## Steps\n1. Click login\n2. Error appears"
npx tsx scripts/issue.ts create DEV Task "Backend refactoring" --assignee me --labels "backend,tech-debt"
```

### Get Issue Details

```bash
npx tsx scripts/issue.ts get <issueKey>
```

### Search Issues (JQL)

```bash
npx tsx scripts/issue.ts search "<jql>"
```

Examples:

```bash
npx tsx scripts/issue.ts search "assignee = currentUser()"
npx tsx scripts/issue.ts search "assignee = currentUser() AND summary ~ '기타작업'"
npx tsx scripts/issue.ts search "worklogAuthor = currentUser() AND worklogDate >= startOfMonth()"
```

### Update Description (Markdown to ADF)

```bash
npx tsx scripts/issue.ts update-description <issueKey> "<markdown>"
npx tsx scripts/issue.ts update-description-file <issueKey> <filepath>
```

### Append to Description

```bash
npx tsx scripts/issue.ts append-description <issueKey> "<markdown>"
```

Example:

```bash
npx tsx scripts/issue.ts append-description DEV-1234 "## 1/22 [2h]\n- Code review\n- Bug fix"
```

### Add Comment

```bash
npx tsx scripts/issue.ts comment <issueKey> "<markdown>"
```

## Status Transitions

Script: `scripts/issue.ts`

### List Available Transitions

```bash
npx tsx scripts/issue.ts transitions <issueKey>
```

Shows all available status transitions for an issue with IDs, names, and target statuses.

### Transition Issue (Change Status)

```bash
npx tsx scripts/issue.ts transition <issueKey> <transitionId|statusName>
```

Examples:

```bash
npx tsx scripts/issue.ts transition DEV-1234 21
npx tsx scripts/issue.ts transition DEV-1234 "In Progress"
npx tsx scripts/issue.ts transition DEV-1234 "Done"
```

Note: You can use either the transition ID (from `transitions` command) or the status name.

## Label Operations

Script: `scripts/issue.ts`

### Add Labels

```bash
npx tsx scripts/issue.ts add-labels <issueKey> <label1> [label2] ...
```

Example:

```bash
npx tsx scripts/issue.ts add-labels DEV-1234 bugfix urgent frontend
```

### Remove Labels

```bash
npx tsx scripts/issue.ts remove-labels <issueKey> <label1> [label2] ...
```

Example:

```bash
npx tsx scripts/issue.ts remove-labels DEV-1234 low-priority
```

### Set Labels (Replace All)

```bash
npx tsx scripts/issue.ts set-labels <issueKey> <label1> [label2] ...
```

Example:

```bash
npx tsx scripts/issue.ts set-labels DEV-1234 bugfix frontend
```

Note: This replaces all existing labels. Use an empty label list to clear all labels.

## Convert to Subtask

Script: `scripts/issue.ts`

Convert existing issues to subtasks of a parent issue using the Bulk Move API.

```bash
npx tsx scripts/issue.ts convert-to-subtask <parentKey> <issueKey1> [issueKey2] ...
```

Example:

```bash
npx tsx scripts/issue.ts convert-to-subtask DEV-100 DEV-101 DEV-102 DEV-103
```

Note: This uses Jira's Bulk Move API to change issue types to Subtask and set the parent. The operation is asynchronous and the script waits for completion.

## View Changelog

Script: `scripts/issue.ts`

View the history of changes made to an issue.

```bash
npx tsx scripts/issue.ts changelog <issueKey> [--field <fieldName>]
```

Examples:

```bash
# View all changes
npx tsx scripts/issue.ts changelog DEV-1234

# Filter by specific field
npx tsx scripts/issue.ts changelog DEV-1234 --field status
npx tsx scripts/issue.ts changelog DEV-1234 --field assignee
```

Output shows each change with timestamp, author, and field changes (from → to).

## Add Web Link

Script: `scripts/issue.ts`

Add a web link (remote link) to an issue. Useful for linking Slack threads, external docs, or related resources.

```bash
npx tsx scripts/issue.ts add-weblink <issueKey> <url> <title>
```

Example:

```bash
npx tsx scripts/issue.ts add-weblink DEV-1234 "https://slack.com/archives/C123/p456" "Slack: 관련 논의"
```

## Date and Time Formats

### Date Formats

- Short: `1/21`, `01/21` (defaults to current year)
- Full: `2026-01-21`, `2026/01/21`

### Time Formats

- Hours only: `1h`, `2h`
- Minutes only: `30m`, `45m`
- Combined: `1h 30m`, `2h 15m`

## Misc Ticket Workflow

Misc tickets are found dynamically via JQL search, not hardcoded ticket keys:

### Step 1: Find Misc Ticket

```bash
npx tsx scripts/issue.ts search "assignee = currentUser() AND summary ~ '기타작업'"
```

### Step 2: Add Worklog to Found Ticket

```bash
npx tsx scripts/worklog.ts add <TICKET_KEY> "2h" "1/22" "Work description"
```

### Step 3: Append Description (Optional)

```bash
npx tsx scripts/issue.ts append-description <TICKET_KEY> "## 1/22 [2h]\n- Work description"
```

## ADF (Atlassian Document Format)

Jira Cloud requires ADF for description and comment fields. This skill automatically converts markdown to ADF.

Supported markdown:

- Headings: `# H1`, `## H2`, etc.
- Bullet lists: `- item`
- Ordered lists: `1. item`
- Links: `[text](url)`
- Horizontal rules: `---`

For complex ADF needs, refer to `references/adf-format.md`.

## Common Patterns

### Record Daily Work

```bash
# 1. Find misc ticket
npx tsx scripts/issue.ts search "assignee = currentUser() AND summary ~ '기타작업'"

# 2. Add worklog to found ticket
npx tsx scripts/worklog.ts add DEV-XXXX "4h" "1/22" "Implemented user authentication"

# 3. Update description
npx tsx scripts/issue.ts append-description DEV-XXXX "## 1/22 [4h]\n- User authentication\n- Code review"
```

### Find My Recent Work

```bash
npx tsx scripts/issue.ts search "worklogAuthor = currentUser() AND worklogDate >= -7d"
```

### Update Issue with Links

```bash
npx tsx scripts/issue.ts append-description DEV-1234 "## References\n- [Design Doc](https://...)\n- [PR](https://github.com/...)"
```

## Quick Reference

| Task               | Command                                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Create issue       | `npx tsx scripts/issue.ts create <project> <type> <summary> [--description <md>] [--labels <l1,l2>] [--assignee me]` |
| Add worklog        | `npx tsx scripts/worklog.ts add <key> <time> <date> [comment]`                                                       |
| List worklogs      | `npx tsx scripts/worklog.ts list <key>`                                                                              |
| Update worklog     | `npx tsx scripts/worklog.ts update <key> <id> --time <t> --date <d>`                                                 |
| Delete worklog     | `npx tsx scripts/worklog.ts delete <key> <id>`                                                                       |
| Get issue          | `npx tsx scripts/issue.ts get <key>`                                                                                 |
| Search issues      | `npx tsx scripts/issue.ts search "<jql>"`                                                                            |
| Update description | `npx tsx scripts/issue.ts update-description <key> "<md>"`                                                           |
| Append description | `npx tsx scripts/issue.ts append-description <key> "<md>"`                                                           |
| Add comment        | `npx tsx scripts/issue.ts comment <key> "<md>"`                                                                      |
| List transitions   | `npx tsx scripts/issue.ts transitions <key>`                                                                         |
| Change status      | `npx tsx scripts/issue.ts transition <key> <id\|name>`                                                               |
| Add labels         | `npx tsx scripts/issue.ts add-labels <key> <labels...>`                                                              |
| Remove labels      | `npx tsx scripts/issue.ts remove-labels <key> <labels...>`                                                           |
| Set labels         | `npx tsx scripts/issue.ts set-labels <key> <labels...>`                                                              |
| Convert to subtask | `npx tsx scripts/issue.ts convert-to-subtask <parent> <keys...>`                                                     |
| View changelog     | `npx tsx scripts/issue.ts changelog <key> [--field <name>]`                                                          |
| Add web link       | `npx tsx scripts/issue.ts add-weblink <key> <url> <title>`                                                           |
