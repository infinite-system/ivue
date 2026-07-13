// ServerApi.ts — the one client-side gateway the field components call.
//
// The transport is pluggable: the playground ships with the in-browser
// MockServer transport (localStorage data + IndexedDB media), and the same
// components run unchanged against a real HTTP backend — see
// server-node/server.mjs for a reference Express implementation of this
// exact contract. Swap transports with ServerApi.use(httpTransport(baseUrl)).
//
// The wire contract (shared by mock and real servers):
//   list endpoints:  GET <path>?filters=<expr>&sort=<col:asc,..>&page=&rowsPerPage=
//                    → { data: Row[], pagination?: { page, rowsPerPage, rowsNumber } }
//   entity create:   POST <path> { ...fields } → { data: Row }
//   entity update:   PUT <path>/<id> { ...fields } → { data: Row }
//   media upload:    POST /media/upload (multipart) → { data: MediaRow[] }
//   media bytes:     GET /media/file/<key> → the file (or a redirect to it)

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

let transport: ServerTransport | null = null;

/** The response envelope is `{ data, pagination? }` — unwrap like an app would. */
const unwrap = (response: any) => response?.data ?? response;

export const ServerApi = {
  /** Install a transport (the mock by default; an HTTP transport in real apps). */
  use(nextTransport: ServerTransport) {
    transport = nextTransport;
  },

  get active(): ServerTransport {
    if (!transport) {
      throw new Error(
        'ServerApi has no transport — call ServerApi.use(...) first.',
      );
    }
    return transport;
  },

  async getCustom(path: string): Promise<any> {
    return unwrap(await this.active.request('GET', path));
  },

  /** List call that PRESERVES the pagination envelope. */
  async getPaginated<Row = any>(path: string): Promise<ListResult<Row>> {
    const response = await this.active.request('GET', path);
    return {
      data: response?.data ?? response ?? [],
      pagination: response?.pagination,
    };
  },

  async postCustom(path: string, payload?: any): Promise<any> {
    return unwrap(await this.active.request('POST', path, { payload }));
  },

  async putCustom(path: string, payload?: any): Promise<any> {
    return unwrap(await this.active.request('PUT', path, { payload }));
  },

  async deleteCustom(path: string): Promise<any> {
    return unwrap(await this.active.request('DELETE', path));
  },

  media: {
    async upload(files: File[], name?: string): Promise<MediaRow[]> {
      const response = await ServerApi.active.request(
        'POST',
        '/media/upload',
        { files, payload: { name } },
      );
      return response?.data ?? response ?? [];
    },

    async get(ids: string[]): Promise<MediaRow[]> {
      const query = ids.map((id, index) => `ids[${index}]=${id}`).join('&');
      return (await ServerApi.getCustom(`/media?${query}`)) ?? [];
    },

    async update(payload: {
      id: string;
      name?: string;
      caption?: string;
    }): Promise<MediaRow> {
      return await ServerApi.postCustom('/media/update', payload);
    },

    async remove(id: string): Promise<void> {
      await ServerApi.deleteCustom(`/media/${id}`);
    },
  },
};
