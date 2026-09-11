/**
 * Emitter — a minimal event bus.
 * @example
 * const emitter = new Emitter.Class()
 * emitter.on('event', (data) => {
 *   console.log(data)
 * })
 * emitter.emit('event', 'data')
 */
class $Emitter {
  protected events: Record<string, Array<(...args: unknown[]) => void> | undefined> = {};

  /**
   * Emit an event with the given data
   * @param event Event name
   * @param args Data to pass to the event handlers
   */
  emit(event: string, ...args: unknown[]) {
    let callbacks = this.events[event] || [];
    for (let i = 0, length = callbacks.length; i < length; i++) {
      callbacks[i]?.(...args);
    }
  }

  /**
   * Add a callback to the event
   * @param event Event name
   * @param cb Callback function
   * @returns Unsubscribe function
   */
  on<CB extends (...args: any[]) => void>(event: string, cb: CB) {
    // Add the callback to the event's callback list, or create a new list with the callback
    this.events[event]?.push(cb) || (this.events[event] = [cb]);

    // Return an unsubscribe function
    return () => {
      this.events[event] = this.events[event]?.filter((i) => cb !== i);
    };
  }

  /**
   * Remove a callback from the event
   * @param event Event name
   * @param callback Callback function
   */
  off<CB extends (...args: any[]) => void>(event: string, callback: CB) {
    this.events[event] = this.events[event]?.filter((i) => callback !== i);
  }

  /**
   * Remove all event listeners and clean up
   */
  destroy() {
    this.events = {};
  }
}

export namespace Emitter {
  export const $Class = $Emitter; // raw — children `extends` this
  export let Class = $Class; // plain — no reactive state, no Reactive()
  // raw-instance type — fields, parameters, returns
  export type Model = InstanceType<typeof Class>;
  // the type of an unwrapping surface (none here; kept for the manifest)
  export type Instance = InstanceType<typeof Class>;
}
