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

## Date and Time Formats

### Date Formats
- Short: `1/21`, `01/21` (defaults to current year)
- Full: `2026-01-21`, `2026/01/21`

### Time Formats
- Hours only: `1h`, `2h`
- Minutes only: `30m`, `45m`
- Combined: `1h 30m`, `2h 15m`

## 기타 티켓 (Misc Ticket) 작업

기타 티켓은 하드코딩된 티켓 번호가 아닌, 동적으로 검색하여 찾습니다:

### Step 1: 기타 티켓 찾기
```bash
npx tsx scripts/issue.ts search "assignee = currentUser() AND summary ~ '기타작업'"
```

### Step 2: 찾은 티켓에 Worklog 추가
```bash
npx tsx scripts/worklog.ts add <찾은티켓번호> "2h" "1/22" "작업 내용"
```

### Step 3: Description 추가 (필요시)
```bash
npx tsx scripts/issue.ts append-description <찾은티켓번호> "## 1/22 [2h]\n- 작업 내용"
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
