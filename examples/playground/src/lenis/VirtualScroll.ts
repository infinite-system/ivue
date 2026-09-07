import { Static } from '../Static'
import { Emitter } from './Emitter'

/**
 * VirtualScroll — the wheel and touch listeners, normalised to deltas.
 */
class $VirtualScroll {
  /** A line of wheel delta in px (deltaMode 1). Hot path: read per wheel event. */
  protected static readonly LINE_HEIGHT = 100 / 6

  /** The listeners must be able to preventDefault. */
  protected static readonly LISTENER_OPTIONS: AddEventListenerOptions = { passive: false }

  constructor(
    protected element: HTMLElement,
    protected options = { wheelMultiplier: 1, touchMultiplier: 1 }
  ) {
    this.emitter = new Emitter.Class()
    // The handlers are prototype methods (overridable, spy-able); bound
    // once here so add/removeEventListener see one stable function.
    this.onTouchStart = this.onTouchStart.bind(this)
    this.onTouchMove = this.onTouchMove.bind(this)
    this.onTouchEnd = this.onTouchEnd.bind(this)
    this.onTouchCancel = this.onTouchCancel.bind(this)
    this.onWheel = this.onWheel.bind(this)
    this.onWindowResize = this.onWindowResize.bind(this)

    const listenerOptions = this.self.LISTENER_OPTIONS
    window.addEventListener('resize', this.onWindowResize, false)
    this.onWindowResize()

    this.element.addEventListener('wheel', this.onWheel, listenerOptions)
    this.element.addEventListener(
      'touchstart',
      this.onTouchStart,
      listenerOptions
    )
    this.element.addEventListener(
      'touchmove',
      this.onTouchMove,
      listenerOptions
    )
    this.element.addEventListener('touchend', this.onTouchEnd, listenerOptions)
    // The browser claiming the gesture (Android Chrome, when touch-action
    // lets it) ends the touch with a cancel, not an end: the flick must
    // still fire, or the glide a touchstart froze stays frozen.
    this.element.addEventListener('touchcancel', this.onTouchCancel, listenerOptions)
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $VirtualScroll
  }

  touchStart = {
    x: 0,
    y: 0,
  }
  lastDelta = {
    x: 0,
    y: 0,
  }
  window = {
    width: 0,
    height: 0,
  }
  protected readonly emitter: Emitter.Model

  /** Re-tune the gesture multipliers after construction. */
  tune(options: Partial<{ wheelMultiplier: number; touchMultiplier: number }>) {
    Object.assign(this.options, options)
  }

  /**
   * Add an event listener for the given event and callback
   *
   * @param event Event name
   * @param callback Callback function
   */
  on(event: string, callback: VirtualScroll.Callback) {
    return this.emitter.on(event, callback)
  }

  /** Remove all event listeners and clean up */
  destroy() {
    this.emitter.destroy()

    const listenerOptions = this.self.LISTENER_OPTIONS
    window.removeEventListener('resize', this.onWindowResize, false)

    this.element.removeEventListener('wheel', this.onWheel, listenerOptions)
    this.element.removeEventListener(
      'touchstart',
      this.onTouchStart,
      listenerOptions
    )
    this.element.removeEventListener(
      'touchmove',
      this.onTouchMove,
      listenerOptions
    )
    this.element.removeEventListener(
      'touchend',
      this.onTouchEnd,
      listenerOptions
    )
    this.element.removeEventListener(
      'touchcancel',
      this.onTouchCancel,
      listenerOptions
    )
  }

  /**
   * Event handler for 'touchstart' event
   *
   * @param event Touch event
   */
  onTouchStart(event: TouchEvent) {
    // @ts-expect-error - event.targetTouches is not defined
    const { clientX, clientY } = event.targetTouches
      ? event.targetTouches[0]
      : event

    this.touchStart.x = clientX
    this.touchStart.y = clientY

    this.lastDelta = {
      x: 0,
      y: 0,
    }

    this.emitter.emit('scroll', {
      deltaX: 0,
      deltaY: 0,
      event,
    })
  }

  /** Event handler for 'touchmove' event */
  onTouchMove(event: TouchEvent) {
    // @ts-expect-error - event.targetTouches is not defined
    const { clientX, clientY } = event.targetTouches
      ? event.targetTouches[0]
      : event

    const deltaX = -(clientX - this.touchStart.x) * this.options.touchMultiplier
    const deltaY = -(clientY - this.touchStart.y) * this.options.touchMultiplier

    this.touchStart.x = clientX
    this.touchStart.y = clientY

    this.lastDelta = {
      x: deltaX,
      y: deltaY,
    }

    this.emitter.emit('scroll', {
      deltaX,
      deltaY,
      event,
    })
  }

  onTouchEnd(event: TouchEvent) {
    this.emitter.emit('scroll', {
      deltaX: this.lastDelta.x,
      deltaY: this.lastDelta.y,
      event,
    })
  }

  /** A cancelled touch flicks as an end does (the fork's rule) — its own
   *  handler, so a subclass can treat a cancel differently without
   *  touching the end. */
  onTouchCancel(event: TouchEvent) {
    this.onTouchEnd(event)
  }

  /** Event handler for 'wheel' event */
  onWheel(event: WheelEvent) {
    let { deltaX, deltaY, deltaMode } = event
    const lineHeight = this.self.LINE_HEIGHT

    const multiplierX =
      deltaMode === 1 ? lineHeight : deltaMode === 2 ? this.window.width : 1
    const multiplierY =
      deltaMode === 1 ? lineHeight : deltaMode === 2 ? this.window.height : 1

    deltaX *= multiplierX
    deltaY *= multiplierY

    deltaX *= this.options.wheelMultiplier
    deltaY *= this.options.wheelMultiplier

    this.emitter.emit('scroll', { deltaX, deltaY, event })
  }

  onWindowResize() {
    this.window = {
      width: window.innerWidth,
      height: window.innerHeight,
    }
  }
}

export namespace VirtualScroll {
  export const $Class = Static($VirtualScroll) // anchor — it declares statics
  export let Class = $Class // plain — no reactive state, no Reactive()
  // raw-instance type — fields, parameters, returns
  export type Model = InstanceType<typeof Class>
  // the type of an unwrapping surface (none here; kept for the manifest)
  export type Instance = InstanceType<typeof Class>

  /** One normalised gesture: signed deltas and the event they came from. */
  export type Data = {
    deltaX: number
    deltaY: number
    event: WheelEvent | TouchEvent
  }
  export type Callback = (data: Data) => void
}
