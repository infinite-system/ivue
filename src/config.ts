import type { Router } from "vue-router"
import { extend } from "./utils"

export type Config = {
  router: Router | null
}

export let config: Config = {
  router: null
}

export function setup(options = {}) {
  extend(config, options)
}