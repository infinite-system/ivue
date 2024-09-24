export interface IKeyValue {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BlResponseData = Record<string, any>;


export type Optional<T> = {
  [K in keyof T]?: T[K];
};