import type { Mapping } from '../kernel'
import type { ComputedRef } from 'vue';

export type AnyClass = abstract new (...args: any) => any;

export type Class = {
  behavior?: any;
  new(...args: any[]): any;
  [x: string | symbol]: any
}

export type IVue<T extends AnyClass> = InstanceType<T> & IVueToRefs<T>

/**
 * @see ivueTransform
 */
export interface IVueToRefs<T extends AnyClass> {
  toRefs: (props: (keyof T)[]) => InstanceType<T>
}

export interface IVueToRefsObj<T extends object> {
  toRefs: (...args: any) => T
}

export type MappingScope = 'singleton' | 'transient'

export type MappingType = 'generic' | 'ivue' | any

export type InferredArgs<T> = T extends { new(...args: infer P): any } ? P : never[]

export type Getters = Map<string | symbol | number, PropertyDescriptor>

export interface Intercept {
  return: any,
  mapping: Mapping,
  name?: string,
  self: any,
  args: any
}

export type InterceptOptions = {
  top: boolean,
  scoped: boolean
}

export type InterceptFn = (intercept: Intercept, self: Object, prop: string) => void | true

export type InterceptsMap = {
  before: Map<Function | Class, InterceptFn[]>,
  after: Map<Function | Class, InterceptFn[]>
}

export type InterceptAttachTo = Function | [Class, Function]

export type InterceptsFns = InterceptFn[] | undefined | any

export type Null<T> = T | null

export type AnyObj = Record<string | number | symbol, any>

export type Params<T extends (...args: any) => any> = Parameters<T>


export type Computeds = Record<string | symbol | number, ComputedRef>


