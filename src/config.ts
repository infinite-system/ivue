import { extend } from "./utils"

export type Config = {
  router?: any,
  debug?: boolean
}

export let config: Config = {
  router: null,
  debug: false
}

export function setup (options: Config = {}) {
  extend(config, options)
}