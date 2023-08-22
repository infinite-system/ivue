import { describe, it, beforeEach, expect, vi } from 'vitest'
import { AppTestHarness } from '../App/AppTestHarness'
import { Auth } from "../App/Auth/Auth";
import { TestPresenterAuto } from "../App/Auth/TestPresenterAuto.js";

let appTestHarness = null
let presenter = null
let vm = null

function wait () {
  return setTimeout(() => {})
}

function test (presenterClass, mode = 'manual') {

  describe('----- mode: ' + mode + '----', () => {

    beforeEach(() => {
      appTestHarness = new AppTestHarness()
      appTestHarness.init()
      presenter = appTestHarness.container.get(presenterClass)
      vm = presenter.vm
    })


  })
}

