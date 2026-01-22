#!/usr/bin/env npx tsx

import {
  getJiraClient,
  parseTimeToSeconds,
  formatSecondsToTime,
  parseDateToISO,
} from './lib/jira-client.js';

function printUsage(): void {
  console.log(`
Usage: npx tsx worklog.ts <command> [options]

Commands:
  add <issueKey> <time> <date> [comment]
    Add worklog to an issue
    Example: npx tsx worklog.ts add DEV-1234 "2h 30m" "1/21" "Fixed bug"

  list <issueKey>
    List all worklogs for an issue
    Example: npx tsx worklog.ts list DEV-1234

  update <issueKey> <worklogId> [--time <time>] [--date <date>] [--comment <comment>]
    Update an existing worklog
    Example: npx tsx worklog.ts update DEV-1234 12345 --time "3h" --date "1/22"

  delete <issueKey> <worklogId>
    Delete a worklog
    Example: npx tsx worklog.ts delete DEV-1234 12345

Date formats: "1/21", "01/21" (defaults to current year if not specified)
Time formats: "1h", "30m", "1h 30m", "2h 15m"
`);
}

async function addWorklog(
  issueKey: string,
  time: string,
  date: string,
  comment?: string
): Promise<void> {
  const client = getJiraClient();
  const timeSpentSeconds = parseTimeToSeconds(time);
  const started = parseDateToISO(date);

  const result = await client.addWorklog({
    issueKey,
    timeSpentSeconds,
    started,
    comment,
  });

  console.log(`Worklog added successfully`);
  console.log(`  ID: ${result.id}`);
  console.log(`  Issue: ${issueKey}`);
  console.log(`  Time: ${result.timeSpent}`);
  console.log(`  Started: ${result.started}`);
}

async function listWorklogs(issueKey: string): Promise<void> {
  const client = getJiraClient();
  const worklogs = await client.getWorklogs(issueKey);

  if (worklogs.length === 0) {
    console.log(`No worklogs found for ${issueKey}`);
    return;
  }

  console.log(`Worklogs for ${issueKey}:\n`);
  for (const log of worklogs) {
    const started = new Date(log.started).toLocaleDateString('ko-KR');
    console.log(`  ID: ${log.id}`);
    console.log(`  Author: ${log.author.displayName}`);
    console.log(`  Time: ${log.timeSpent} (${formatSecondsToTime(log.timeSpentSeconds)})`);
    console.log(`  Date: ${started}`);
    console.log('');
  }
}

async function updateWorklog(
  issueKey: string,
  worklogId: string,
  options: { time?: string; date?: string; comment?: string }
): Promise<void> {
  const client = getJiraClient();
  const updateData: { timeSpentSeconds?: number; started?: string; comment?: string } = {};

  if (options.time) {
    updateData.timeSpentSeconds = parseTimeToSeconds(options.time);
  }
  if (options.date) {
    updateData.started = parseDateToISO(options.date);
  }
  if (options.comment) {
    updateData.comment = options.comment;
  }

  const result = await client.updateWorklog(issueKey, worklogId, updateData);

  console.log(`Worklog updated successfully`);
  console.log(`  ID: ${result.id}`);
  console.log(`  Time: ${result.timeSpent}`);
  console.log(`  Started: ${result.started}`);
}

async function deleteWorklog(issueKey: string, worklogId: string): Promise<void> {
  const client = getJiraClient();
  await client.deleteWorklog(issueKey, worklogId);
  console.log(`Worklog ${worklogId} deleted from ${issueKey}`);
}

function parseUpdateOptions(args: string[]): { time?: string; date?: string; comment?: string } {
  const options: { time?: string; date?: string; comment?: string } = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--time' && args[i + 1]) {
      options.time = args[++i];
    } else if (args[i] === '--date' && args[i + 1]) {
      options.date = args[++i];
    } else if (args[i] === '--comment' && args[i + 1]) {
      options.comment = args[++i];
    }
  }
  
  return options;
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
      case 'add': {
        const [, issueKey, time, date, ...commentParts] = args;
        if (!issueKey || !time || !date) {
          console.error('Error: add requires issueKey, time, and date');
          printUsage();
          process.exit(1);
        }
        await addWorklog(issueKey, time, date, commentParts.join(' ') || undefined);
        break;
      }

      case 'list': {
        const issueKey = args[1];
        if (!issueKey) {
          console.error('Error: list requires issueKey');
          process.exit(1);
        }
        await listWorklogs(issueKey);
        break;
      }

      case 'update': {
        const [, issueKey, worklogId, ...rest] = args;
        if (!issueKey || !worklogId) {
          console.error('Error: update requires issueKey and worklogId');
          process.exit(1);
        }
        const options = parseUpdateOptions(rest);
        if (!options.time && !options.date && !options.comment) {
          console.error('Error: update requires at least one of --time, --date, or --comment');
          process.exit(1);
        }
        await updateWorklog(issueKey, worklogId, options);
        break;
      }

      case 'delete': {
        const [, issueKey, worklogId] = args;
        if (!issueKey || !worklogId) {
          console.error('Error: delete requires issueKey and worklogId');
          process.exit(1);
        }
        await deleteWorklog(issueKey, worklogId);
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
