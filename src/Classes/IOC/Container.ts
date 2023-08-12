import { Container as _Container } from "inversify";
import getDecorators from "inversify-inject-decorators";

// Container map allows for HMR support for Vite
// It breaks otherwise, because the container tries to rebind classes on reload
export const ContainerMap = new Map()

// Pure IOC Container Instance
export const Container = new _Container({
  autoBindInjectable: true,
  defaultScope: 'Transient',
})


const { lazyInject } = getDecorators(Container);
export const lazy = lazyInject