import { IKeyValue } from './core';

export type UUID = string;

export interface IEntityItemB {
  id?: string;
  originalData?: IKeyValue;
  data: IKeyValue;
}

export interface IProjectTag {
  id: string;
  color: string;
  text: string;
}

export interface IEntityItem extends IKeyValue {
  id: UUID;
}
