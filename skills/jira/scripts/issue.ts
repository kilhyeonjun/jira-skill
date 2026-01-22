#!/usr/bin/env npx tsx

import { getJiraClient } from './lib/jira-client.js';
import { markdownToAdf, adfToPlainText } from './lib/adf.js';
import * as fs from 'fs';

function printUsage(): void {
  console.log(`
Usage: npx tsx issue.ts <command> [options]

Commands:
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
`);
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

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    printUsage();
    process.exit(0);
  }

  try {
    switch (command) {
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
