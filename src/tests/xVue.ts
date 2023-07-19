import { describe, it, beforeEach, expect, vi } from 'vitest'
import { AppTestHarness } from './Helpers/AppTestHarness'
import { LoginRegisterPresenter } from "./Helpers/Authentication/LoginRegisterPresenter.js";
import { TestPresenterAuto } from "./Helpers/Authentication/TestPresenterAuto.js";

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

test(LoginRegisterPresenter, 'manual')
test(TestPresenterAuto, 'auto')
