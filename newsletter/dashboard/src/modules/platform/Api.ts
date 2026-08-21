import { Static } from 'ivue/extras';

// The dashboard's only transport — every /admin call flows through here.
// The admin secret lives in sessionStorage (never the bundle); in local
// dev the Vite proxy attaches it server-side and the client sends none.
class $Api {
  static get SECRET_STORAGE_KEY() {
    return 'ivue-newsletter-admin-secret';
  }

  static secret(): string {
    return sessionStorage.getItem(this.SECRET_STORAGE_KEY) ?? '';
  }

  static rememberSecret(secret: string): void {
    sessionStorage.setItem(this.SECRET_STORAGE_KEY, secret);
  }

  static forgetSecret(): void {
    sessionStorage.removeItem(this.SECRET_STORAGE_KEY);
  }

  static isUnauthorized(error: unknown): boolean {
    return (error as { status?: number } | null)?.status === 401;
  }

  static async request<Result>(
    path: string,
    options: RequestInit = {},
  ): Promise<Result> {
    const response = await this.fetchAuthorized(path, options);
    return response.json() as Promise<Result>;
  }

  static async fetchAuthorized(
    path: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const secret = this.secret();
    const response = await fetch(path, {
      ...options,
      headers: {
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(secret ? { authorization: `Bearer ${secret}` } : {}),
        ...options.headers,
      },
    });
    if (!response.ok) {
      const payload = (await response
        .json()
        .catch(() => ({}))) as { error?: string };
      throw Object.assign(
        new Error(payload.error ?? `Request failed (HTTP ${response.status})`),
        { status: response.status },
      );
    }
    return response;
  }

  static post<Result>(path: string, body: object): Promise<Result> {
    return this.request(path, { method: 'POST', body: JSON.stringify(body) });
  }

  // ---- typed endpoint surface (mirrors the Worker's AdminApi) ----

  static subscribers(query: {
    list: string;
    search: string;
    limit: number;
    offset: number;
  }): Promise<AudiencePage> {
    const parameters = new URLSearchParams({
      list: query.list,
      search: query.search,
      limit: String(query.limit),
      offset: String(query.offset),
    });
    return this.request(`/admin/subscribers?${parameters}`);
  }

  static subscriber(email: string): Promise<SubscriberDetail> {
    return this.request(
      `/admin/subscriber?email=${encodeURIComponent(email)}`,
    );
  }

  static addSubscriber(entry: {
    email: string;
    name: string;
    list: string;
  }): Promise<{ ok: boolean }> {
    return this.post('/admin/subscribers/add', entry);
  }

  static unsubscribeMany(emails: string[]): Promise<{ affected: number }> {
    return this.post('/admin/subscribers/unsubscribe', { emails });
  }

  static resubscribeMany(emails: string[]): Promise<{ affected: number }> {
    return this.post('/admin/subscribers/resubscribe', { emails });
  }

  static removeMany(
    emails: string[],
    purgeSends: boolean,
  ): Promise<{ affected: number }> {
    return this.post('/admin/subscribers/remove', { emails, purgeSends });
  }

  static sends(query: {
    search: string;
    limit: number;
    offset: number;
  }): Promise<SendLogPage> {
    const parameters = new URLSearchParams({
      search: query.search,
      limit: String(query.limit),
      offset: String(query.offset),
    });
    return this.request(`/admin/sends?${parameters}`);
  }

  static send(payload: {
    slug: string;
    emails: string[];
    force: boolean;
  }): Promise<SendResult> {
    return this.post('/admin/send', payload);
  }

  static broadcast(slug: string, list: string): Promise<BroadcastResult> {
    return this.post('/broadcast', { slug, list });
  }

  static dripNow(): Promise<{ delivered: number }> {
    return this.post('/drip', {});
  }

  static posts(): Promise<PostSummary[]> {
    return this.request('/admin/posts');
  }

  static async previewHtml(slug: string): Promise<string> {
    const response = await this.fetchAuthorized(
      `/admin/preview?slug=${encodeURIComponent(slug)}`,
    );
    return response.text();
  }

  static dripPreview(): Promise<DripPreviewResponse> {
    return this.request('/admin/drip-preview');
  }

  static lists(): Promise<ListSummary[]> {
    return this.request('/admin/lists');
  }

  static settings(): Promise<AdminSettings> {
    return this.request('/admin/settings');
  }

  static saveSettings(settings: {
    cadenceHours?: number;
    tweetTemplate?: string;
    tweetContentTemplate?: string;
  }): Promise<AdminSettings> {
    return this.post('/admin/settings', settings);
  }

  static tweet(payload: {
    text: string;
    slug: string;
    attachBanner: boolean;
  }): Promise<{ ok: boolean; tweetId: string; url: string }> {
    return this.post('/admin/tweet', payload);
  }

  static tweets(): Promise<TweetRow[]> {
    return this.request('/admin/tweets');
  }

  static schedule(job: {
    kind: JobKind;
    payload: Record<string, string>;
    dueAt: number;
  }): Promise<{ ok: boolean; job: ScheduledJob }> {
    return this.post('/admin/schedule', job);
  }

  static scheduleList(): Promise<{
    upcoming: ScheduledJob[];
    recent: ScheduledJob[];
  }> {
    return this.request('/admin/schedule');
  }

  static scheduleCancel(id: number): Promise<{ ok: boolean }> {
    return this.post('/admin/schedule/cancel', { id });
  }

  static stats(): Promise<Stats> {
    return this.request('/admin/stats');
  }
}

export namespace Api {
  export const $Class = Static($Api);
  export let Class = $Class;
}

// ---- response contracts (mirror src/modules on the Worker side) ----

export interface SubscriberRow {
  email: string;
  list: string;
  name: string;
  subscribedAt: number;
  unsubscribedAt: number | null;
  sendCount: number;
  lastSentAt: number | null;
}

export interface AudiencePage {
  total: number;
  rows: SubscriberRow[];
  limit: number;
  offset: number;
}

export interface SendHistoryRow {
  email: string;
  slug: string;
  sentAt: number;
}

export type SendLogRow = SendHistoryRow;

export interface SendLogPage {
  total: number;
  rows: SendLogRow[];
  limit: number;
  offset: number;
}

export interface SubscriberDetail {
  email: string;
  memberships: SubscriberRow[];
  history: SendHistoryRow[];
}

export interface ListSummary {
  list: string;
  members: number;
  active: number;
}

export interface PostSummary {
  slug: string;
  title: string;
  description: string;
  url: string;
  date: string | null;
  timestamp: number;
}

export interface RecipientOutcome {
  email: string;
  errorCode: number;
  message: string;
}

export interface SendResult {
  ok: boolean;
  slug: string;
  delivered: number;
  outcomes: RecipientOutcome[];
  skippedAsRepeat: string[];
}

export interface BroadcastResult {
  ok: boolean;
  slug: string;
  recipients: number;
  skippedAsRepeat: number;
}

export interface DripPlanEntry {
  email: string;
  name: string;
  nextSlug: string | null;
  sentCount: number;
  lastSentAt: number | null;
  dueAt: number;
  sendNow: boolean;
}

export interface DripPreviewResponse {
  cadenceHours: number;
  entries: DripPlanEntry[];
}

export interface AdminSettings {
  cadenceHours: number;
  tweetTemplate: string;
  tweetContentTemplate: string;
  xConfigured: boolean;
  sender: {
    senderName: string;
    senderEmail: string;
    replyTo: string;
    notifyEmail: string;
    postmarkStream: string;
    defaultList: string;
  };
}

export interface TweetRow {
  tweetId: string;
  text: string;
  slug: string | null;
  postedAt: number;
}

export type JobKind = 'broadcast' | 'tweet';

export interface ScheduledJob {
  id: number;
  kind: JobKind;
  payload: Record<string, string>;
  dueAt: number;
  createdAt: number;
  executedAt: number | null;
  result: { ok?: boolean; detail?: string; error?: string } | null;
}

export interface Stats {
  lists: ListSummary[];
  signups: { day: string; count: number }[];
  perPost: { slug: string; sendCount: number; lastSentAt: number }[];
  totalSends: number;
}
