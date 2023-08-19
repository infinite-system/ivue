import type { IVueToRefs, IVue } from "./types/core";

import { ivue, iobj, ivueTransform } from "./ivue";

import { Mapping, Kernel, kernel, ivueOnInit, ivueInversify, bind, get, make, use, init } from "./kernel";

import { Behavior, after, before } from "./behavior";

import { raw, unraw, Traits, extend } from "./utils";

export {
  // ivue
  ivue,
  iobj,
  ivueTransform,
  
  // Kernel
  Mapping,
  Kernel,
  ivueOnInit,
  ivueInversify,
  kernel,
  bind,
  get,
  make,
  use,
  init,

  // Behavior
  Behavior,
  before,
  after,

  // utils
  raw,
  unraw,
  Traits,
  extend,
};

// Types
export type {
  IVue,
  IVueToRefs
};
