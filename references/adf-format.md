# Atlassian Document Format (ADF) Reference

ADF is the JSON format required by Jira Cloud API for rich text fields (description, comments).

## Basic Structure

```json
{
  "type": "doc",
  "version": 1,
  "content": [
    // Array of block nodes
  ]
}
```

## Block Node Types

### Paragraph

```json
{
  "type": "paragraph",
  "content": [
    { "type": "text", "text": "Hello world" }
  ]
}
```

### Heading (levels 1-6)

```json
{
  "type": "heading",
  "attrs": { "level": 2 },
  "content": [
    { "type": "text", "text": "Section Title" }
  ]
}
```

### Bullet List

```json
{
  "type": "bulletList",
  "content": [
    {
      "type": "listItem",
      "content": [
        {
          "type": "paragraph",
          "content": [{ "type": "text", "text": "Item 1" }]
        }
      ]
    }
  ]
}
```

### Ordered List

```json
{
  "type": "orderedList",
  "content": [
    {
      "type": "listItem",
      "content": [
        {
          "type": "paragraph",
          "content": [{ "type": "text", "text": "Step 1" }]
        }
      ]
    }
  ]
}
```

### Code Block

```json
{
  "type": "codeBlock",
  "attrs": { "language": "typescript" },
  "content": [
    { "type": "text", "text": "const x = 1;" }
  ]
}
```

### Horizontal Rule

```json
{
  "type": "rule"
}
```

## Inline Marks

### Link

```json
{
  "type": "text",
  "text": "Click here",
  "marks": [
    {
      "type": "link",
      "attrs": { "href": "https://example.com" }
    }
  ]
}
```

### Bold

```json
{
  "type": "text",
  "text": "Important",
  "marks": [{ "type": "strong" }]
}
```

### Italic

```json
{
  "type": "text",
  "text": "Emphasis",
  "marks": [{ "type": "em" }]
}
```

### Code (inline)

```json
{
  "type": "text",
  "text": "variable",
  "marks": [{ "type": "code" }]
}
```

## Complete Example

Markdown:
```markdown
## 1/22 Work Log [4h]

- Fixed authentication bug
- [PR #123](https://github.com/org/repo/pull/123)
- Code review with team
```

Equivalent ADF:
```json
{
  "type": "doc",
  "version": 1,
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 2 },
      "content": [{ "type": "text", "text": "1/22 Work Log [4h]" }]
    },
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "content": [{
            "type": "paragraph",
            "content": [{ "type": "text", "text": "Fixed authentication bug" }]
          }]
        },
        {
          "type": "listItem",
          "content": [{
            "type": "paragraph",
            "content": [
              {
                "type": "text",
                "text": "PR #123",
                "marks": [{ "type": "link", "attrs": { "href": "https://github.com/org/repo/pull/123" }}]
              }
            ]
          }]
        },
        {
          "type": "listItem",
          "content": [{
            "type": "paragraph",
            "content": [{ "type": "text", "text": "Code review with team" }]
          }]
        }
      ]
    }
  ]
}
```

## API Endpoints

### Update Issue Description
```
PUT /rest/api/3/issue/{issueKey}
{
  "fields": {
    "description": { /* ADF document */ }
  }
}
```

### Add Comment
```
POST /rest/api/3/issue/{issueKey}/comment
{
  "body": { /* ADF document */ }
}
```

### Add Worklog with Comment
```
POST /rest/api/3/issue/{issueKey}/worklog
{
  "timeSpentSeconds": 3600,
  "started": "2026-01-22T09:00:00.000+0900",
  "comment": { /* ADF document */ }
}
```
