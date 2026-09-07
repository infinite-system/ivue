import { LenisUtils } from './LenisUtils'

/**
 * Dimensions — the size of the content and the wrapper
 *
 * @example
 * const dimensions = new Dimensions.Class(wrapper, content)
 * dimensions.on('resize', (e) => {
 *   console.log(e.width, e.height)
 * })
 */
class $Dimensions {
  constructor(
    protected wrapper: HTMLElement | Window | Element,
    protected content: HTMLElement | Element,
    { autoResize = true, debounce: debounceValue = 250 } = {}
  ) {
    // The handlers are prototype methods (overridable, spy-able); bound
    // once here so observers and listeners keep a stable `this`.
    this.resize = this.resize.bind(this)
    this.onWrapperResize = this.onWrapperResize.bind(this)
    this.onContentResize = this.onContentResize.bind(this)

    if (autoResize) {
      this.debouncedResize = LenisUtils.Class.debounce(this.resize, debounceValue)

      if (this.wrapper instanceof Window) {
        window.addEventListener('resize', this.debouncedResize, false)
      } else {
        this.wrapperResizeObserver = new ResizeObserver(this.debouncedResize)
        this.wrapperResizeObserver.observe(this.wrapper)
      }

      this.contentResizeObserver = new ResizeObserver(this.debouncedResize)
      this.contentResizeObserver.observe(this.content)
    }

    this.resize()
  }

  width = 0
  height = 0
  scrollHeight = 0
  scrollWidth = 0

  // These are instanciated in the constructor as they need information from the options
  protected debouncedResize?: (...args: unknown[]) => void
  protected wrapperResizeObserver?: ResizeObserver
  protected contentResizeObserver?: ResizeObserver

  get limit() {
    return {
      x: this.scrollWidth - this.width,
      y: this.scrollHeight - this.height,
    }
  }

  destroy() {
    this.wrapperResizeObserver?.disconnect()
    this.contentResizeObserver?.disconnect()

    if (this.wrapper === window && this.debouncedResize) {
      window.removeEventListener('resize', this.debouncedResize, false)
    }
  }

  resize() {
    this.onWrapperResize()
    this.onContentResize()
  }

  onWrapperResize() {
    if (this.wrapper instanceof Window) {
      this.width = window.innerWidth
      this.height = window.innerHeight
    } else {
      this.width = this.wrapper.clientWidth
      this.height = this.wrapper.clientHeight
    }
  }

  onContentResize() {
    if (this.wrapper instanceof Window) {
      this.scrollHeight = this.content.scrollHeight
      this.scrollWidth = this.content.scrollWidth
    } else {
      this.scrollHeight = this.wrapper.scrollHeight
      this.scrollWidth = this.wrapper.scrollWidth
    }
  }

}

export namespace Dimensions {
  export const $Class = $Dimensions // raw — children `extends` this
  export let Class = $Class // plain — no reactive state, no Reactive()
  // raw-instance type — fields, parameters, returns
  export type Model = InstanceType<typeof Class>
  // the type of an unwrapping surface (none here; kept for the manifest)
  export type Instance = InstanceType<typeof Class>
}
