

export interface JiraConfig {
  baseUrl: string;
  username: string;
  apiToken: string;
}

export interface WorklogInput {
  issueKey: string;
  timeSpentSeconds: number;
  started: string;
  comment?: string;
}

export interface WorklogResponse {
  id: string;
  issueId: string;
  timeSpent: string;
  timeSpentSeconds: number;
  started: string;
  author: {
    displayName: string;
    emailAddress: string;
  };
  comment?: {
    type: string;
    version: number;
    content: Array<{
      type: string;
      content: Array<{ type: string; text: string }>;
    }>;
  };
}

export interface IssueResponse {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: unknown;
    status: {
      name: string;
    };
    assignee?: {
      displayName: string;
      emailAddress: string;
    };
    created: string;
    updated: string;
    worklog?: {
      total: number;
      worklogs: WorklogResponse[];
    };
  };
}

export interface SearchResponse {
  total: number;
  issues: IssueResponse[];
}

export interface TransitionInfo {
  id: string;
  name: string;
  to: {
    id: string;
    name: string;
    description?: string;
    statusCategory?: {
      id: number;
      key: string;
      name: string;
      colorName: string;
    };
  };
}

export interface TransitionsResponse {
  transitions: TransitionInfo[];
}

export interface LabelOperation {
  add?: string;
  remove?: string;
}

export interface CreateIssueInput {
  projectKey: string;
  summary: string;
  issueType: string;
  description?: unknown;
  assigneeAccountId?: string;
  labels?: string[];
  parentKey?: string;
  customFields?: Record<string, unknown>;
}

export interface CreateIssueResponse {
  id: string;
  key: string;
  self: string;
}

export class JiraClient {
  private config: JiraConfig;
  private headers: HeadersInit;

  constructor(config?: Partial<JiraConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || process.env.JIRA_BASE_URL || '',
      username: config?.username || process.env.JIRA_USERNAME || '',
      apiToken: config?.apiToken || process.env.JIRA_API_TOKEN || '',
    };

    if (!this.config.baseUrl || !this.config.username || !this.config.apiToken) {
      throw new Error(
        'Missing Jira configuration. Set JIRA_BASE_URL, JIRA_USERNAME, JIRA_API_TOKEN environment variables.'
      );
    }

    const auth = Buffer.from(`${this.config.username}:${this.config.apiToken}`).toString('base64');
    this.headers = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: this.headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jira API error ${response.status}: ${errorText}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  async addWorklog(input: WorklogInput): Promise<WorklogResponse> {
    const body: Record<string, unknown> = {
      timeSpentSeconds: input.timeSpentSeconds,
      started: input.started,
    };

    if (input.comment) {
      body.comment = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: input.comment }],
          },
        ],
      };
    }

    return this.request<WorklogResponse>(
      'POST',
      `/rest/api/3/issue/${input.issueKey}/worklog`,
      body
    );
  }

  async updateWorklog(
    issueKey: string,
    worklogId: string,
    input: Partial<WorklogInput>
  ): Promise<WorklogResponse> {
    const body: Record<string, unknown> = {};

    if (input.timeSpentSeconds) {
      body.timeSpentSeconds = input.timeSpentSeconds;
    }
    if (input.started) {
      body.started = input.started;
    }
    if (input.comment) {
      body.comment = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: input.comment }],
          },
        ],
      };
    }

    return this.request<WorklogResponse>(
      'PUT',
      `/rest/api/3/issue/${issueKey}/worklog/${worklogId}`,
      body
    );
  }

  async deleteWorklog(issueKey: string, worklogId: string): Promise<void> {
    await this.request<void>(
      'DELETE',
      `/rest/api/3/issue/${issueKey}/worklog/${worklogId}`
    );
  }

  async getWorklogs(issueKey: string): Promise<WorklogResponse[]> {
    const response = await this.request<{ worklogs: WorklogResponse[] }>(
      'GET',
      `/rest/api/3/issue/${issueKey}/worklog`
    );
    return response.worklogs;
  }

  async getIssue(issueKey: string, fields?: string[]): Promise<IssueResponse> {
    const fieldsParam = fields?.join(',') || 'summary,description,status,assignee,created,updated,worklog';
    return this.request<IssueResponse>(
      'GET',
      `/rest/api/3/issue/${issueKey}?fields=${fieldsParam}`
    );
  }

  async searchIssues(jql: string, maxResults = 50): Promise<SearchResponse> {
    const fields = 'summary,status,assignee,created,updated';
    const encodedJql = encodeURIComponent(jql);
    return this.request<SearchResponse>(
      'GET',
      `/rest/api/3/search/jql?jql=${encodedJql}&maxResults=${maxResults}&fields=${fields}`
    );
  }

  async updateIssueDescription(issueKey: string, adfContent: unknown): Promise<void> {
    await this.request<void>(
      'PUT',
      `/rest/api/3/issue/${issueKey}`,
      {
        fields: {
          description: adfContent,
        },
      }
    );
  }

  async addComment(issueKey: string, adfContent: unknown): Promise<unknown> {
    return this.request<unknown>(
      'POST',
      `/rest/api/3/issue/${issueKey}/comment`,
      {
        body: adfContent,
      }
    );
  }

  async getTransitions(issueKey: string): Promise<TransitionsResponse> {
    return this.request<TransitionsResponse>(
      'GET',
      `/rest/api/3/issue/${issueKey}/transitions`
    );
  }

  async transitionIssue(issueKey: string, transitionId: string): Promise<void> {
    await this.request<void>(
      'POST',
      `/rest/api/3/issue/${issueKey}/transitions`,
      {
        transition: {
          id: transitionId,
        },
      }
    );
  }

  async updateLabels(issueKey: string, operations: LabelOperation[]): Promise<void> {
    await this.request<void>(
      'PUT',
      `/rest/api/3/issue/${issueKey}`,
      {
        update: {
          labels: operations,
        },
      }
    );
  }

  async setLabels(issueKey: string, labels: string[]): Promise<void> {
    await this.request<void>(
      'PUT',
      `/rest/api/3/issue/${issueKey}`,
      {
        fields: {
          labels,
        },
      }
    );
  }

  async createIssue(input: CreateIssueInput): Promise<CreateIssueResponse> {
    const fields: Record<string, unknown> = {
      project: { key: input.projectKey },
      summary: input.summary,
      issuetype: { name: input.issueType },
    };

    if (input.description) {
      fields.description = input.description;
    }
    if (input.assigneeAccountId) {
      fields.assignee = { accountId: input.assigneeAccountId };
    }
    if (input.labels && input.labels.length > 0) {
      fields.labels = input.labels;
    }
    if (input.parentKey) {
      fields.parent = { key: input.parentKey };
    }
    if (input.customFields) {
      Object.assign(fields, input.customFields);
    }

    return this.request<CreateIssueResponse>(
      'POST',
      '/rest/api/3/issue',
      { fields }
    );
  }

  async getCurrentUser(): Promise<{ accountId: string; displayName: string; emailAddress: string }> {
    return this.request<{ accountId: string; displayName: string; emailAddress: string }>(
      'GET',
      '/rest/api/3/myself'
    );
  }
}

let _client: JiraClient | null = null;

export function getJiraClient(): JiraClient {
  if (!_client) {
    _client = new JiraClient();
  }
  return _client;
}

export function parseTimeToSeconds(timeStr: string): number {
  const regex = /(?:(\d+)h)?\s*(?:(\d+)m)?/i;
  const match = timeStr.match(regex);
  
  if (!match) {
    throw new Error(`Invalid time format: ${timeStr}. Use format like "1h 30m" or "2h" or "45m"`);
  }
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  
  return (hours * 3600) + (minutes * 60);
}

export function formatSecondsToTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Parse date string to ISO 8601 format for Jira API
 * @param dateStr - Accepts: "1/21", "01/21", "2026-01-21", "2026/01/21"
 * @param defaultYear - Year to use when not specified (default: current year)
 * @returns ISO 8601 string: "2026-01-21T09:00:00.000+0900"
 */
export function parseDateToISO(dateStr: string, defaultYear = new Date().getFullYear()): string {
  let year: number;
  let month: number;
  let day: number;

  const shortMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (shortMatch) {
    month = parseInt(shortMatch[1], 10);
    day = parseInt(shortMatch[2], 10);
    year = defaultYear;
  } else {
    const fullMatch = dateStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (fullMatch) {
      year = parseInt(fullMatch[1], 10);
      month = parseInt(fullMatch[2], 10);
      day = parseInt(fullMatch[3], 10);
    } else {
      throw new Error(`Invalid date format: ${dateStr}. Use "MM/DD" or "YYYY-MM-DD"`);
    }
  }

  const monthStr = month.toString().padStart(2, '0');
  const dayStr = day.toString().padStart(2, '0');
  
  return `${year}-${monthStr}-${dayStr}T09:00:00.000+0900`;
}
