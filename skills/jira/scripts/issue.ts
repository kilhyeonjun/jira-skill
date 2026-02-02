#!/usr/bin/env npx tsx

import { getJiraClient } from './lib/jira-client.js';
import { markdownToAdf, adfToPlainText } from './lib/adf.js';
import * as fs from 'fs';

function printUsage(): void {
  console.log(`
Usage: npx tsx issue.ts <command> [options]

Commands:
  create <projectKey> <issueType> <summary> [options]
    Create a new issue
    Options:
      --description <md>     Issue description in markdown
      --labels <l1,l2>       Comma-separated labels
      --assignee me          Assign to current user
      --field <key>=<value>  Custom field (can be used multiple times)
    Example: npx tsx issue.ts create DEV Task "Implement feature X"
    Example: npx tsx issue.ts create DEV Bug "Fix login error" --description "Steps to reproduce..."
    Example: npx tsx issue.ts create DEV Task "My task" --assignee me --labels "backend,urgent"
    Example: npx tsx issue.ts create DEV Task "My task" --field customfield_10066=PROJECT

  get <issueKey>
    Get issue details
    Example: npx tsx issue.ts get DEV-1234

  search <jql>
    Search issues using JQL
    Example: npx tsx issue.ts search "assignee = currentUser() AND summary ~ '기타작업'"
    Example: npx tsx issue.ts search "project = DEV AND status = 'In Progress'"

  update-description <issueKey> <markdown>
    Update issue description from markdown text
    Example: npx tsx issue.ts update-description DEV-1234 "# Title\\n- item1\\n- item2"

  update-description-file <issueKey> <filepath>
    Update issue description from markdown file
    Example: npx tsx issue.ts update-description-file DEV-1234 ./description.md

  append-description <issueKey> <markdown>
    Append to existing issue description (keeps existing content)
    Example: npx tsx issue.ts append-description DEV-1234 "## 1/22\\n- task1"

  comment <issueKey> <markdown>
    Add comment to issue in markdown format
    Example: npx tsx issue.ts comment DEV-1234 "Fixed the bug. See [PR](https://github.com/...)"

  transitions <issueKey>
    List available status transitions for an issue
    Example: npx tsx issue.ts transitions DEV-1234

  transition <issueKey> <transitionId|statusName>
    Transition issue to a new status
    Example: npx tsx issue.ts transition DEV-1234 21
    Example: npx tsx issue.ts transition DEV-1234 "In Progress"

  add-labels <issueKey> <label1> [label2] ...
    Add labels to an issue (keeps existing labels)
    Example: npx tsx issue.ts add-labels DEV-1234 bugfix urgent

  remove-labels <issueKey> <label1> [label2] ...
    Remove labels from an issue
    Example: npx tsx issue.ts remove-labels DEV-1234 low-priority

  set-labels <issueKey> <label1> [label2] ...
    Replace all labels on an issue
    Example: npx tsx issue.ts set-labels DEV-1234 bugfix frontend
`);
}

interface CreateOptions {
  description?: string;
  labels?: string[];
  assignee?: string;
  customFields?: Record<string, unknown>;
}

async function createIssue(
  projectKey: string,
  issueType: string,
  summary: string,
  options: CreateOptions
): Promise<void> {
  const client = getJiraClient();
  
  let assigneeAccountId: string | undefined;
  if (options.assignee === 'me') {
    const currentUser = await client.getCurrentUser();
    assigneeAccountId = currentUser.accountId;
  }

  const result = await client.createIssue({
    projectKey,
    issueType,
    summary,
    description: options.description ? markdownToAdf(options.description) : undefined,
    labels: options.labels,
    assigneeAccountId,
    customFields: options.customFields,
  });

  console.log(`Created issue: ${result.key}`);
  console.log(`URL: ${process.env.JIRA_BASE_URL}/browse/${result.key}`);
}

async function getIssue(issueKey: string): Promise<void> {
  const client = getJiraClient();
  const issue = await client.getIssue(issueKey);

  console.log(`Issue: ${issue.key}`);
  console.log(`Summary: ${issue.fields.summary}`);
  console.log(`Status: ${issue.fields.status.name}`);
  console.log(`Assignee: ${issue.fields.assignee?.displayName || 'Unassigned'}`);
  console.log(`Created: ${new Date(issue.fields.created).toLocaleString('ko-KR')}`);
  console.log(`Updated: ${new Date(issue.fields.updated).toLocaleString('ko-KR')}`);
  
  if (issue.fields.description) {
    console.log(`\nDescription:`);
    console.log(adfToPlainText(issue.fields.description));
  }
}

async function searchIssues(jql: string): Promise<void> {
  const client = getJiraClient();
  const result = await client.searchIssues(jql);

  console.log(`Found ${result.total} issue(s):\n`);
  
  for (const issue of result.issues) {
    console.log(`  ${issue.key}: ${issue.fields.summary}`);
    console.log(`    Status: ${issue.fields.status.name}`);
    console.log(`    Assignee: ${issue.fields.assignee?.displayName || 'Unassigned'}`);
    console.log('');
  }
}

async function updateDescription(issueKey: string, markdown: string): Promise<void> {
  const client = getJiraClient();
  const adf = markdownToAdf(markdown);
  
  await client.updateIssueDescription(issueKey, adf);
  console.log(`Description updated for ${issueKey}`);
}

async function updateDescriptionFromFile(issueKey: string, filepath: string): Promise<void> {
  const markdown = fs.readFileSync(filepath, 'utf-8');
  await updateDescription(issueKey, markdown);
}

async function appendDescription(issueKey: string, markdown: string): Promise<void> {
  const client = getJiraClient();
  const issue = await client.getIssue(issueKey);
  
  let existingText = '';
  if (issue.fields.description) {
    existingText = adfToPlainText(issue.fields.description);
  }
  
  const newMarkdown = existingText ? `${existingText}\n\n${markdown}` : markdown;
  const adf = markdownToAdf(newMarkdown);
  
  await client.updateIssueDescription(issueKey, adf);
  console.log(`Description appended for ${issueKey}`);
}

async function addComment(issueKey: string, markdown: string): Promise<void> {
  const client = getJiraClient();
  const adf = markdownToAdf(markdown);
  
  await client.addComment(issueKey, adf);
  console.log(`Comment added to ${issueKey}`);
}

async function listTransitions(issueKey: string): Promise<void> {
  const client = getJiraClient();
  const result = await client.getTransitions(issueKey);

  console.log(`Available transitions for ${issueKey}:\n`);
  
  for (const transition of result.transitions) {
    console.log(`  ID: ${transition.id}`);
    console.log(`  Name: ${transition.name}`);
    console.log(`  To Status: ${transition.to.name}`);
    if (transition.to.statusCategory) {
      console.log(`  Category: ${transition.to.statusCategory.name} (${transition.to.statusCategory.colorName})`);
    }
    console.log('');
  }
}

async function transitionIssue(issueKey: string, transitionIdOrName: string): Promise<void> {
  const client = getJiraClient();
  const transitions = await client.getTransitions(issueKey);
  
  let transitionId = transitionIdOrName;
  
  if (!/^\d+$/.test(transitionIdOrName)) {
    const found = transitions.transitions.find(
      t => t.name.toLowerCase() === transitionIdOrName.toLowerCase() ||
           t.to.name.toLowerCase() === transitionIdOrName.toLowerCase()
    );
    if (!found) {
      console.error(`Transition "${transitionIdOrName}" not found. Available transitions:`);
      for (const t of transitions.transitions) {
        console.error(`  - ${t.name} (ID: ${t.id}) -> ${t.to.name}`);
      }
      process.exit(1);
    }
    transitionId = found.id;
  }
  
  await client.transitionIssue(issueKey, transitionId);
  console.log(`Transitioned ${issueKey} successfully`);
}

async function addLabels(issueKey: string, labels: string[]): Promise<void> {
  const client = getJiraClient();
  const operations = labels.map(label => ({ add: label }));
  
  await client.updateLabels(issueKey, operations);
  console.log(`Added labels [${labels.join(', ')}] to ${issueKey}`);
}

async function removeLabels(issueKey: string, labels: string[]): Promise<void> {
  const client = getJiraClient();
  const operations = labels.map(label => ({ remove: label }));
  
  await client.updateLabels(issueKey, operations);
  console.log(`Removed labels [${labels.join(', ')}] from ${issueKey}`);
}

async function setLabels(issueKey: string, labels: string[]): Promise<void> {
  const client = getJiraClient();
  
  await client.setLabels(issueKey, labels);
  console.log(`Set labels [${labels.join(', ')}] on ${issueKey}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    printUsage();
    process.exit(0);
  }

  try {
    switch (command) {
      case 'create': {
        const [, projectKey, issueType, summary, ...rest] = args;
        if (!projectKey || !issueType || !summary) {
          console.error('Error: create requires projectKey, issueType, and summary');
          process.exit(1);
        }
        
        const options: CreateOptions = {};
        for (let i = 0; i < rest.length; i++) {
          if (rest[i] === '--description' && rest[i + 1]) {
            options.description = rest[++i];
          } else if (rest[i] === '--labels' && rest[i + 1]) {
            options.labels = rest[++i].split(',').map(l => l.trim());
          } else if (rest[i] === '--assignee' && rest[i + 1]) {
            options.assignee = rest[++i];
          } else if (rest[i] === '--field' && rest[i + 1]) {
            const fieldArg = rest[++i];
            const eqIndex = fieldArg.indexOf('=');
            if (eqIndex > 0) {
              const key = fieldArg.slice(0, eqIndex);
              let value: unknown = fieldArg.slice(eqIndex + 1);
              // Parse JSON if value looks like array or object
              if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
                try {
                  value = JSON.parse(value);
                } catch {
                  // Keep as string if JSON parse fails
                }
              }
              options.customFields = options.customFields || {};
              options.customFields[key] = value;
            }
          }
        }
        
        await createIssue(projectKey, issueType, summary, options);
        break;
      }

      case 'get': {
        const issueKey = args[1];
        if (!issueKey) {
          console.error('Error: get requires issueKey');
          process.exit(1);
        }
        await getIssue(issueKey);
        break;
      }

      case 'search': {
        const jql = args[1];
        if (!jql) {
          console.error('Error: search requires JQL query');
          process.exit(1);
        }
        await searchIssues(jql);
        break;
      }

      case 'update-description': {
        const [, issueKey, ...markdownParts] = args;
        if (!issueKey || markdownParts.length === 0) {
          console.error('Error: update-description requires issueKey and markdown');
          process.exit(1);
        }
        await updateDescription(issueKey, markdownParts.join(' '));
        break;
      }

      case 'update-description-file': {
        const [, issueKey, filepath] = args;
        if (!issueKey || !filepath) {
          console.error('Error: update-description-file requires issueKey and filepath');
          process.exit(1);
        }
        await updateDescriptionFromFile(issueKey, filepath);
        break;
      }

      case 'append-description': {
        const [, issueKey, ...markdownParts] = args;
        if (!issueKey || markdownParts.length === 0) {
          console.error('Error: append-description requires issueKey and markdown');
          process.exit(1);
        }
        await appendDescription(issueKey, markdownParts.join(' '));
        break;
      }

      case 'comment': {
        const [, issueKey, ...markdownParts] = args;
        if (!issueKey || markdownParts.length === 0) {
          console.error('Error: comment requires issueKey and markdown');
          process.exit(1);
        }
        await addComment(issueKey, markdownParts.join(' '));
        break;
      }

      case 'transitions': {
        const issueKey = args[1];
        if (!issueKey) {
          console.error('Error: transitions requires issueKey');
          process.exit(1);
        }
        await listTransitions(issueKey);
        break;
      }

      case 'transition': {
        const [, issueKey, transitionIdOrName] = args;
        if (!issueKey || !transitionIdOrName) {
          console.error('Error: transition requires issueKey and transitionId or statusName');
          process.exit(1);
        }
        await transitionIssue(issueKey, transitionIdOrName);
        break;
      }

      case 'add-labels': {
        const [, issueKey, ...labels] = args;
        if (!issueKey || labels.length === 0) {
          console.error('Error: add-labels requires issueKey and at least one label');
          process.exit(1);
        }
        await addLabels(issueKey, labels);
        break;
      }

      case 'remove-labels': {
        const [, issueKey, ...labels] = args;
        if (!issueKey || labels.length === 0) {
          console.error('Error: remove-labels requires issueKey and at least one label');
          process.exit(1);
        }
        await removeLabels(issueKey, labels);
        break;
      }

      case 'set-labels': {
        const [, issueKey, ...labels] = args;
        if (!issueKey) {
          console.error('Error: set-labels requires issueKey');
          process.exit(1);
        }
        await setLabels(issueKey, labels);
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
