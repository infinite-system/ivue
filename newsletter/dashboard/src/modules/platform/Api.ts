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
  }): Promise<Api.AudiencePage> {
    const parameters = new URLSearchParams({
      list: query.list,
      search: query.search,
      limit: String(query.limit),
      offset: String(query.offset),
    });
    return this.request(`/admin/subscriber?${parameters}`);
  }

  static subscriber(email: string): Promise<Api.SubscriberDetail> {
    return this.request(
      `/admin/subscriber?email=${encodeURIComponent(email)}`,
    );
  }

  static addSubscriber(entry: {
    email: string;
    name: string;
    list: string;
  }): Promise<{ ok: boolean }> {
    return this.post('/admin/subscriber/add', entry);
  }

  static unsubscribeMany(emails: string[]): Promise<{ affected: number }> {
    return this.post('/admin/subscriber/unsubscribe', { emails });
  }

  static resubscribeMany(emails: string[]): Promise<{ affected: number }> {
    return this.post('/admin/subscriber/resubscribe', { emails });
  }

  static removeMany(
    emails: string[],
    purgeSends: boolean,
  ): Promise<{ affected: number }> {
    return this.post('/admin/subscriber/remove', { emails, purgeSends });
  }

  static sends(query: {
    search: string;
    limit: number;
    offset: number;
  }): Promise<Api.SendLogPage> {
    const parameters = new URLSearchParams({
      search: query.search,
      limit: String(query.limit),
      offset: String(query.offset),
    });
    return this.request(`/admin/send?${parameters}`);
  }

  static send(payload: {
    slug: string;
    emails: string[];
    force: boolean;
  }): Promise<Api.SendResult> {
    return this.post('/admin/send', payload);
  }

  static broadcast(slug: string, list: string): Promise<Api.BroadcastResult> {
    return this.post('/broadcast', { slug, list });
  }

  static dripNow(): Promise<{ delivered: number }> {
    return this.post('/drip', {});
  }

  static posts(): Promise<Api.PostSummary[]> {
    return this.request('/admin/post');
  }

  static comments(query: {
    status: string;
    search: string;
    limit: number;
    offset: number;
  }): Promise<Api.CommentPage> {
    const parameters = new URLSearchParams({
      status: query.status,
      search: query.search,
      limit: String(query.limit),
      offset: String(query.offset),
    });
    return this.request(`/admin/comment?${parameters}`);
  }

  static approveComment(id: number): Promise<{ ok: boolean }> {
    return this.post('/admin/comment/approve', { id });
  }

  static deleteComment(id: number): Promise<{ ok: boolean }> {
    return this.post('/admin/comment/delete', { id });
  }

  static lockComment(
    id: number,
    locked: boolean,
  ): Promise<{ ok: boolean; locked: boolean }> {
    return this.post('/admin/comment/lock', { id, locked });
  }

  static async previewHtml(slug: string): Promise<string> {
    const response = await this.fetchAuthorized(
      `/admin/preview?slug=${encodeURIComponent(slug)}`,
    );
    return response.text();
  }

  static dripPreview(): Promise<Api.DripPreviewResponse> {
    return this.request('/admin/drip-preview');
  }

  static lists(): Promise<Api.ListSummary[]> {
    return this.request('/admin/list');
  }

  static createList(list: string): Promise<{ ok: boolean; list: string }> {
    return this.post('/admin/list/create', { list });
  }

  static renameList(
    from: string,
    to: string,
  ): Promise<{ ok: boolean; list: string }> {
    return this.post('/admin/list/rename', { from, to });
  }

  static deleteList(list: string): Promise<{ ok: boolean }> {
    return this.post('/admin/list/delete', { list });
  }

  static settings(): Promise<Api.AdminSettings> {
    return this.request('/admin/setting');
  }

  static saveSettings(settings: {
    cadenceDays?: number;
    sendHourLocal?: number;
    defaultTimezone?: string;
    listSchedules?: Record<
      string,
      { cadenceDays?: number | null; sendHourLocal?: number | null }
    >;
    tweetTemplate?: string;
    tweetContentTemplate?: string;
  }): Promise<Api.AdminSettings> {
    return this.post('/admin/setting', settings);
  }

  static tweet(payload: {
    text: string;
    slug: string;
    imageUrls: string[];
  }): Promise<{ ok: boolean; tweetId: string; url: string }> {
    return this.post('/admin/tweet', payload);
  }

  static thread(payload: {
    tweets: { text: string; imageUrls: string[] }[];
    slug: string;
  }): Promise<{ ok: boolean; tweetIds: string[]; url: string }> {
    return this.post('/admin/thread', payload);
  }

  static postText(slug: string): Promise<{ slug: string; plainText: string }> {
    return this.request(`/admin/post-text?slug=${encodeURIComponent(slug)}`);
  }

  static tweets(): Promise<Api.TweetRow[]> {
    return this.request('/admin/tweet');
  }

  static schedule(job: {
    kind: Api.JobKind;
    payload: Record<string, string>;
    dueAt: number;
  }): Promise<{ ok: boolean; job: Api.ScheduledJob }> {
    return this.post('/admin/schedule', job);
  }

  static scheduleList(): Promise<{
    upcoming: Api.ScheduledJob[];
    recent: Api.ScheduledJob[];
  }> {
    return this.request('/admin/schedule');
  }

  static scheduleCancel(id: number): Promise<{ ok: boolean }> {
    return this.post('/admin/schedule/cancel', { id });
  }

  // ---- the press (/admin/press/<singular>/…) ----

  static pressPieces(query: {
    q?: string;
    status?: string;
    kind?: string;
    wave?: number;
  } = {}): Promise<Api.PressPieceSummary[]> {
    const parameters = new URLSearchParams();
    if (query.q) parameters.set('q', query.q);
    if (query.status) parameters.set('status', query.status);
    if (query.kind) parameters.set('kind', query.kind);
    if (query.wave) parameters.set('wave', String(query.wave));
    const suffix = parameters.size ? `?${parameters}` : '';
    return this.request(`/admin/press/piece${suffix}`);
  }

  static pressPiece(id: number): Promise<Api.PressPiece> {
    return this.request(`/admin/press/piece/${id}`);
  }

  static pressCreatePiece(input: {
    fromSlug?: string;
    title?: string;
    base?: string;
    wave?: number;
  }): Promise<Api.PressPieceRecord> {
    return this.post('/admin/press/piece', input);
  }

  static pressPatchPiece(
    id: number,
    changes: Partial<
      Pick<Api.PressPieceRecord, 'title' | 'claim' | 'links' | 'banner' | 'base' | 'wave' | 'notes' | 'slug'>
    >,
  ): Promise<Api.PressPieceRecord> {
    return this.request(`/admin/press/piece/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(changes),
    });
  }

  static pressBlogPosts(): Promise<Api.BlogPostOption[]> {
    return this.request('/admin/press/blog-post');
  }

  static pressAddExpression(
    pieceId: number,
    input: {
      kind: string;
      mode?: 'derived' | 'authored';
      label?: string;
      venue?: string;
      body?: string;
      segments?: string[] | null;
      meta?: Record<string, unknown>;
      mirrors?: string[];
    },
  ): Promise<Api.PressExpression> {
    return this.post(`/admin/press/piece/${pieceId}/expression`, input);
  }

  static pressExpressionsForSource(key: string): Promise<Api.PressExpression[]> {
    return this.request(`/admin/press/expression?source=${encodeURIComponent(key)}`);
  }

  static pressExpressionsForCalendar(calendarId: string): Promise<Api.PressExpression[]> {
    return this.request(`/admin/press/expression?calendar=${encodeURIComponent(calendarId)}`);
  }

  static pressExpression(id: number): Promise<Api.PressExpression> {
    return this.request(`/admin/press/expression/${id}`);
  }

  static pressPatchExpression(
    id: number,
    changes: {
      body?: string;
      meta?: Record<string, unknown>;
      label?: string;
      venue?: string;
      mirrors?: unknown;
      skipped?: boolean;
      calendarId?: string | null;
    },
  ): Promise<Api.PressExpression> {
    return this.request(`/admin/press/expression/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(changes),
    });
  }

  /** approve, unapprove, archive, schedule, reschedule, cancel, post, sent, clone, detach, segment */
  static pressAct(
    id: number,
    action: string,
    body: object = {},
  ): Promise<Api.PressExpression> {
    return this.post(`/admin/press/expression/${id}/${action}`, body);
  }

  static pressReorder(id: number, order: number[]): Promise<Api.PressExpression> {
    return this.request(`/admin/press/expression/${id}/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ order }),
    });
  }

  /** an image or video for the editors: the raw file, its type in the header, its name in the query */
  static pressUploadAsset(file: File): Promise<Api.PressAsset> {
    return this.request(`/admin/press/asset?name=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      body: file,
      headers: { 'content-type': file.type || 'application/octet-stream' },
    });
  }

  static pressLint(id: number): Promise<{ problems: string[] }> {
    return this.request(`/admin/press/expression/${id}/lint`);
  }

  static pressRevisions(id: number): Promise<Api.PressRevision[]> {
    return this.request(`/admin/press/expression/${id}/revision`);
  }

  static pressRestore(id: number, revisionId: number): Promise<Api.PressExpression> {
    return this.post(`/admin/press/expression/${id}/revision/${revisionId}/restore`, {});
  }

  static pressBaseRevisions(pieceId: number): Promise<Api.PressBaseRevision[]> {
    return this.request(`/admin/press/piece/${pieceId}/base-revision`);
  }

  static pressRestoreBase(pieceId: number, revisionId: number): Promise<Api.PressPieceRecord> {
    return this.post(`/admin/press/piece/${pieceId}/base-revision/${revisionId}/restore`, {});
  }

  static pressPostings(pieceId?: number): Promise<Api.PressPosting[]> {
    return this.request(pieceId ? `/admin/press/piece/${pieceId}/posting` : '/admin/press/posting');
  }

  static pressQueue(): Promise<Api.PressQueue> {
    return this.request('/admin/press/queue');
  }

  static stats(): Promise<Api.Stats> {
    return this.request('/admin/stat');
  }
}

export namespace Api {
  export const $Class = Static($Api);
  export let Class = $Class;
  // ---- the shapes this surface speaks: Api.SubscriberRow, Api.PressExpression … ----

  // ---- response contracts (mirror src/modules on the Worker side) ----

  export interface SubscriberRow {
    email: string;
    list: string;
    name: string;
    timezone: string | null;
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

  export interface UpcomingSend {
    slug: string;
    title: string;
    projectedAt: number;
  }

  export interface SubscriberDetail {
    email: string;
    memberships: SubscriberRow[];
    history: SendHistoryRow[];
    cadenceDays: number;
    sendHourLocal: number;
    defaultTimezone: string;
    // the zone the drip actually uses for this address (their own, or
    // the default fallback)
    timezone: string;
    upcoming: UpcomingSend[];
  }

  export interface CommentRow {
    id: number;
    slug: string;
    name: string;
    email: string;
    body: string;
    submittedAt: number;
    status: 'pending' | 'approved';
    parentId: number | null;
    rootId: number | null;
    locked: number;
    avatarSeed: string;
  }

  export interface CommentPage {
    total: number;
    rows: CommentRow[];
    limit: number;
    offset: number;
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
    embedImages: string[];
    codeImages: string[];
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
    timezone: string;
    list?: string;
    nextSlug: string | null;
    sentCount: number;
    lastSentAt: number | null;
    dueAt: number;
    sendNow: boolean;
  }

  export type ListScheduleOverrides = Record<
    string,
    { cadenceDays?: number; sendHourLocal?: number }
  >;

  export interface DripPreviewResponse {
    cadenceDays: number;
    sendHourLocal: number;
    defaultTimezone: string;
    listOverrides: ListScheduleOverrides;
    entries: DripPlanEntry[];
  }

  export interface AdminSettings {
    cadenceDays: number;
    sendHourLocal: number;
    defaultTimezone: string;
    listOverrides: ListScheduleOverrides;
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

  export type JobKind = 'broadcast' | 'tweet' | 'thread' | 'expression';

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

  // ---- press shapes (mirror newsletter/src/modules/press) ----

  export interface PressLink {
    label: string;
    url: string;
  }

  export interface PressPieceRecord {
    id: number;
    slug: string | null;
    title: string;
    claim: string;
    links: PressLink[];
    banner: string | null;
    base: string;
    wave: 1 | 2;
    notes: string;
    createdAt: number;
    updatedAt: number;
  }

  export interface PressState {
    id: number;
    kind: string;
    mode: string;
    venue: string;
    status: string;
    scheduledAt: number | null;
    calendarId: string | null;
  }

  export interface PressPieceSummary extends PressPieceRecord {
    expressions: PressState[];
    nextDueAt: number | null;
    calendarIds: string[];
  }

  export interface PressAsset {
    key: string;
    url: string;
    contentType: string;
    size: number;
  }

  export interface PressMirror {
    platform: string;
    sentAt: number | null;
    url: string | null;
  }

  export interface PressExpression {
    id: number;
    pieceId: number;
    kind: string;
    mode: 'derived' | 'authored';
    parentId: number | null;
    position: number;
    label: string;
    venue: string;
    body: string;
    meta: Record<string, unknown>;
    mirrors: PressMirror[];
    status: 'draft' | 'approved' | 'scheduled' | 'due' | 'sent' | 'archived';
    skipped: boolean;
    calendarId: string | null;
    approvedAt: number | null;
    scheduledAt: number | null;
    sentAt: number | null;
    sentUrl: string | null;
    createdAt: number;
    updatedAt: number;
    children: PressExpression[] | null;
  }

  export interface PressPiece extends PressPieceRecord {
    expressions: PressExpression[];
  }

  export interface PressRevision {
    id: number;
    body: string;
    meta: Record<string, unknown>;
    author: string;
    savedAt: number;
  }

  export interface PressBaseRevision {
    id: number;
    base: string;
    author: string;
    savedAt: number;
  }

  export interface PressPosting {
    id: number;
    expressionId: number;
    platform: string;
    venue: string;
    url: string | null;
    remoteIds: string[];
    postedAt: number;
    postedBy: 'api' | 'manual';
    calendarId: string | null;
    kind?: string;
    pieceId?: number;
    pieceTitle?: string;
  }

  export interface PressQueueJob extends ScheduledJob {
    expression: PressExpression | null;
  }

  export interface PressQueue {
    upcoming: PressQueueJob[];
    recent: ScheduledJob[];
    due: (PressExpression & { pieceTitle: string })[];
  }

  export interface BlogPostOption {
    slug: string;
    title: string;
    description: string;
    date: string | null;
    url: string;
  }
}
