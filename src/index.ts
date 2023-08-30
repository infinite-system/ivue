import type { 
  Null, AnyObj, AnyClass, Class, Params,
  IVue, IVueToRefs, IVueToRefsObj, 
  MappingScope, MappingType, InferredArgs, Getters, 
  InterceptsMap, Intercept, InterceptOptions, 
  InterceptsFns, InterceptFn, InterceptAttachTo,
} from "./types/core"

import { config, setup } from "./config"

import { ivue, iobj, ivueTransform } from "./ivue"

import { Mapping, Kernel, kernel, ivueInversify, bind, get, make, use, init } from "./kernel"

import { IVUE, after, before } from "./behavior"

import { raw, unraw, Traits, extend, pre } from "./utils"

import { UseCapsule } from './traits/UseCapsule';
import { UseInstance } from './traits/UseInstance';
import { UseMounting } from './traits/UseMounting';
import { UseRefs } from './traits/UseRefs';
import { UseRoute } from './traits/UseRoute';
import { UseRouter } from './traits/UseRouter';
import { UseRouting } from './traits/UseRouting';
import { UseEmit } from './traits/UseEmit';
import { UseTick } from './traits/UseTick';
import { UseVue } from './traits/UseVue';

export {
  // config
  config,
  setup,
  
  // ivue
  ivue,
  iobj,
  ivueTransform,

  // Kernel
  Mapping,   // class
  Kernel,    // class
  ivueInversify,
  kernel,
  bind,
  get,
  make,
  use,
  init,

  // Behavior
  IVUE,  // enum
  before,
  after,

  // Traits
  UseCapsule,
  UseEmit,
  UseInstance,
  UseMounting,
  UseRefs,
  UseRoute,
  UseRouter,
  UseRouting,
  UseTick,
  UseVue,

  // utils
  raw,
  unraw,
  Traits,
  extend,
  pre
}

// Types
export type {
  Null, AnyObj, AnyClass, Class, Params,
  IVue, IVueToRefs, IVueToRefsObj, 
  MappingScope, MappingType, InferredArgs, Getters, 
  InterceptsMap, Intercept, InterceptOptions, 
  InterceptsFns, InterceptFn, InterceptAttachTo,
}
