import { Container } from "inversify";
import getDecorators from "inversify-inject-decorators";

// Container map allows for HMR support for Vite
// It breaks otherwise, because the container tries to rebind classes on reload
export const containerMap = new Map()

export const container = new Container({
  autoBindInjectable: true,
  defaultScope: 'Transient',
})

const { lazyInject: lazyInject_ } = getDecorators(container);
export const lazy = lazyInject_