import { describe, it, beforeEach, expect, vi } from 'vitest'
import { BlackBox } from '../App/BlackBox'
import type { App } from '@/App/App';
import type { VueWrapper } from '@vue/test-utils';

export default function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let box: BlackBox
let app: App
let vue: VueWrapper

function wait () {
  return setTimeout(() => {})
}

describe('--- auth test ----', () => {

  beforeEach(() => {
    box = new BlackBox().init()
    vue = box.vue
    app = box.app
  })

  // it('root route redirects to login', async () => {
  //   await app.router.push({ name: 'root' })
  //   // console.log(app.router)
  //   expect(app.router.active.name).toBe('login')
  // })

  // it('successful login redirects to homepage', async () => {
  //   await app.router.push({ name: 'root' })

  //   app.auth.email = 'ekalashnikov@gmail.com' 
  //   app.auth.password = 'test1234'

  //   const spy = vi.spyOn(app.router, 'push')

  //   await app.auth.login()

  //   expect(spy).toHaveBeenCalledTimes(1)
  //   expect(spy).toHaveBeenCalledWith({ name: 'home' })

  //   expect(app.message.appMessages).toEqual(['User logged in'])

  //   expect(app.user.email).toBe('ekalashnikov@gmail.com')
  //   expect(app.user.token).toBe('1234ekalashnikov@gmail.com')

  //   await app.router.isLoaded()

  //   expect(app.router.currentRoute.name).toBe('home')
  // })

  it('load ivue component context', async () => {
    await app.router.push({ name: 'root' })

    // console.log('instance', app.ivue.test)
    app.auth.email = 'ekalashnikov@gmail.com'
    app.auth.password = 'test1234'

    const spy = vi.spyOn(app.router, 'push')

    await app.auth.login()

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith({ name: 'home' })

    // expect(app.message.appMessages).toEqual(['User logged in'])

    await app.router.push({ name: 'ivue' })

    console.log('ivue', app.ivue.test)
    await app.router.isLoaded()

    const sub = vue.getComponent({ name: 'IVueTest' }).getComponent({ name: 'SubComponent2' })
    console.log('sub.vm.v', sub.vm.v)

    //console.log('IVueTest', )

    // console.log('box.vue', box.vue)

    expect(app.router.currentRoute.name).toBe('ivue')
  })

})

