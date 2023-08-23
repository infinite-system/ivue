import { describe, it, beforeEach, expect, vi } from 'vitest'
import { BlackBox } from '../App/BlackBox'
import type { App } from '@/App/App';

let box: BlackBox
let app: App

function wait () {
  return setTimeout(() => {})
}

describe('--- auth test ----', () => {

  beforeEach(() => {
    box = new BlackBox().init()
    app = box.app
  })

  it('root route redirects to login', async () => {
    await app.router.push({ name: 'root' })
    expect(app.router.active.name).toBe('login')
  })

  it('successful login redirects to homepage', async () => {
    await app.router.push({ name: 'root' })

    app.auth.email = 'ekalashnikov@gmail.com' 
    app.auth.password = 'test1234'

    const spy = vi.spyOn(app.router, 'push')

    await app.auth.login()

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith({ name: 'home' })
    
    expect(app.message.appMessages).toEqual(['User logged in'])

    expect(app.user.email).toBe('ekalashnikov@gmail.com')
    expect(app.user.token).toBe('1234ekalashnikov@gmail.com')
    
    await app.router.isLoaded()
    
    expect(app.router.currentRoute.name).toBe('home')
  })

})

