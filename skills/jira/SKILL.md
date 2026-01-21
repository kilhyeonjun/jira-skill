---
name: jira-skill
description: Jira Cloud API integration for worklog management, issue operations, and description updates with ADF (Atlassian Document Format) support. Use this skill when users need to interact with Jira - adding worklogs, searching issues, updating descriptions, or adding comments.
---

# Jira Skill

Provides Jira Cloud REST API integration with TypeScript CLI scripts. Handles worklog CRUD, issue search/update, and automatic markdown-to-ADF conversion.

## Prerequisites

Set environment variables before using any scripts:

```bash
export JIRA_BASE_URL="https://your-domain.atlassian.net"
export JIRA_USERNAME="user@example.com"
export JIRA_API_TOKEN="your-api-token"
```

Install dependencies once:

```bash
cd /path/to/jira-skill && npm install
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

### Add to Misc Ticket (DEV-3422)

```bash
npx tsx scripts/worklog.ts add-misc <time> <date> [comment]
```

Example:
```bash
npx tsx scripts/worklog.ts add-misc "1h" "1/21" "Code review"
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
npx tsx scripts/issue.ts search "project = DEV AND assignee = currentUser()"
npx tsx scripts/issue.ts search "project = DEV AND status = 'In Progress'"
npx tsx scripts/issue.ts search "worklogAuthor = currentUser() AND worklogDate >= startOfMonth()"
```

### Update Description (Markdown to ADF)

```bash
npx tsx scripts/issue.ts update-description <issueKey> "<markdown>"
npx tsx scripts/issue.ts update-description-file <issueKey> <filepath>
```

Example:
```bash
npx tsx scripts/issue.ts update-description DEV-1234 "# Overview\n- Task 1\n- Task 2"
```

### Append to Description

```bash
npx tsx scripts/issue.ts append-description <issueKey> "<markdown>"
```

Example:
```bash
npx tsx scripts/issue.ts append-description DEV-3422 "## 1/22 [2h]\n- Code review\n- Bug fix"
```

### Add Comment

```bash
npx tsx scripts/issue.ts comment <issueKey> "<markdown>"
```

### Append to Misc Ticket Description

```bash
npx tsx scripts/issue.ts misc-append "<markdown>"
```

Example:
```bash
npx tsx scripts/issue.ts misc-append "## 1/22 [1h 30m]\n- [PR Review](https://github.com/org/repo/pull/123)\n- Team meeting"
```

## Date and Time Formats

### Date Formats
- Short: `1/21`, `01/21` (defaults to year 2026)
- Full: `2026-01-21`, `2026/01/21`

### Time Formats
- Hours only: `1h`, `2h`
- Minutes only: `30m`, `45m`
- Combined: `1h 30m`, `2h 15m`

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
# Add worklog with comment
npx tsx scripts/worklog.ts add DEV-1234 "4h" "1/22" "Implemented user authentication"

# Update misc ticket description
npx tsx scripts/issue.ts misc-append "## 1/22 [4h]\n- DEV-1234: User authentication\n- Code review"
```

### Find My Recent Work

```bash
npx tsx scripts/issue.ts search "worklogAuthor = currentUser() AND worklogDate >= -7d"
```

### Update Issue with Links

```bash
npx tsx scripts/issue.ts append-description DEV-1234 "## References\n- [Design Doc](https://...)\n- [PR](https://github.com/...)"
```
