import type { 
  Null, AnyClass, Class, 
  IVue, IVueToRefs, IVueToRefsObj, 
  MappingScope, ConstructorArgs, Getters, 
  InterceptsMap, Intercept, InterceptOptions, 
  InterceptsFns, InterceptFn, InterceptAttachTo,
} from "./types/core"

import { ivue, iobj, ivueTransform } from "./ivue"

import { Mapping, Kernel, kernel, ivueOnInit, ivueInversify, bind, get, make, use, init } from "./kernel"

import { Behavior, after, before } from "./behavior"

import { raw, unraw, Traits, extend, pre } from "./utils"


export {
  // ivue
  ivue,
  iobj,
  ivueTransform,

  // Kernel
  Mapping,   // class
  Kernel,    // class
  ivueOnInit,
  ivueInversify,
  kernel,
  bind,
  get,
  make,
  use,
  init,

  // Behavior
  Behavior,  // enum
  before,
  after,

  // utils
  raw,
  unraw,
  Traits,
  extend,
  pre
}

// Types
export type {
  Null, AnyClass, Class, 
  IVue, IVueToRefs, IVueToRefsObj, 
  MappingScope, ConstructorArgs, Getters, 
  InterceptsMap, Intercept, InterceptOptions, 
  InterceptsFns, InterceptFn, InterceptAttachTo,
}
