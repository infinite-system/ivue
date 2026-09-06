// ServerApi.ts — the one client-side gateway the field components call.
//
// The transport is pluggable: the playground ships with the in-browser
// MockServer transport (localStorage data + IndexedDB media), and the same
// components run unchanged against a real HTTP backend — see
// server-node/server.mjs for a reference Express implementation of this
// exact contract. Swap transports with ServerApi.Class.use(httpTransport(baseUrl)).
//
// The wire contract (shared by mock and real servers):
//   list endpoints:  GET <path>?filters=<expr>&sort=<col:asc,..>&page=&rowsPerPage=
//                    → { data: Row[], pagination?: { page, rowsPerPage, rowsNumber } }
//   entity create:   POST <path> { ...fields } → { data: Row }
//   entity update:   PUT <path>/<id> { ...fields } → { data: Row }
//   media upload:    POST /media/upload (multipart) → { data: MediaRow[] }
//   media bytes:     GET /media/file/<key> → the file (or a redirect to it)

import { Static } from '../../../Static';

class $ServerApi {
  /** The installed transport — the mock by default; an HTTP transport in real apps. */
  protected static transport: ServerApi.ServerTransport | null = null;

  /** Install a transport. */
  static use(nextTransport: ServerApi.ServerTransport) {
    this.transport = nextTransport;
  }

  static get active(): ServerApi.ServerTransport {
    if (!this.transport) {
      throw new Error('ServerApi has no transport — call ServerApi.Class.use(...) first.');
    }
    return this.transport;
  }

  /** The response envelope is `{ data, pagination? }` — unwrap like an app would. */
  static unwrap(response: any) {
    return response?.data ?? response;
  }

  static async getCustom(path: string): Promise<any> {
    return this.unwrap(await this.active.request('GET', path));
  }

  /** List call that PRESERVES the pagination envelope. */
  static async getPaginated<Row = any>(path: string): Promise<ServerApi.ListResult<Row>> {
    const response = await this.active.request('GET', path);
    return {
      data: response?.data ?? response ?? [],
      pagination: response?.pagination,
    };
  }

  static async postCustom(path: string, payload?: any): Promise<any> {
    return this.unwrap(await this.active.request('POST', path, { payload }));
  }

  static async putCustom(path: string, payload?: any): Promise<any> {
    return this.unwrap(await this.active.request('PUT', path, { payload }));
  }

  static async deleteCustom(path: string): Promise<any> {
    return this.unwrap(await this.active.request('DELETE', path));
  }

  /* Media endpoints */

  static async uploadMedia(files: File[], name?: string): Promise<ServerApi.MediaRow[]> {
    const response = await this.active.request('POST', '/media/upload', { files, payload: { name } });
    return response?.data ?? response ?? [];
  }

  static async getMedia(ids: string[]): Promise<ServerApi.MediaRow[]> {
    const query = ids.map((id, index) => `ids[${index}]=${id}`).join('&');
    return (await this.getCustom(`/media?${query}`)) ?? [];
  }

  static async updateMedia(payload: { id: string; name?: string; caption?: string }): Promise<ServerApi.MediaRow> {
    return await this.postCustom('/media/update', payload);
  }

  static async removeMedia(id: string): Promise<void> {
    await this.deleteCustom(`/media/${id}`);
  }
}

export namespace ServerApi {
  export const $Class = Static($ServerApi); // raw — children extend this
  export let Class = $Class; // selected — callers read this

  export interface Pagination {
    page: number;
    rowsPerPage: number;
    rowsNumber: number;
  }

  export interface ListResult<Row = any> {
    data: Row[];
    pagination?: Pagination;
  }

  export interface MediaRow {
    id: string;
    key: string;
    name: string;
    mimetype: string;
    size: number;
    /** Resolvable URL for the bytes — `/media/file/<key>` on a real server. */
    url: string;
    /** Resolvable URL for a reduced-size preview when the type supports one. */
    thumbnailUrl: string;
    createdAt: string;
  }

  export interface RequestOptions {
    query?: string;
    payload?: any;
    /** Multipart file payload for media uploads. */
    files?: File[];
  }

  export interface ServerTransport {
    request(
      method: 'GET' | 'POST' | 'PUT' | 'DELETE',
      path: string,
      options?: RequestOptions,
    ): Promise<any>;
  }
}
