import { Container } from "inversify";
import getDecorators from "inversify-inject-decorators";

/**
 * Injection Symbols Map.
 */
export const Inject = {
  DataGateway: Symbol.for('DataGateway'),
  RouterGateway: Symbol.for('RouterGateway'),
  AppPresenter: Symbol.for('AppPresenter'),
  RouterRepository: Symbol.for('RouterRepository'),
  Router: Symbol.for('Router'),
  MessagesRepository: Symbol.for('MessagesRepository'),
  NavigationRepository: Symbol.for('NavigationRepository'),
  UserModel: Symbol.for('UserModel'),
  AuthRepository: Symbol.for('AuthRepository'),
  XVueTestClass: Symbol.for('XVueTestClass'),
  LoginRegisterPresenter: Symbol.for('LoginRegisterPresenter'),
  Config: Symbol.for('Config')
}

// Container map allows for HMR support for Vite
// It breaks otherwise, because the container tries to rebind classes on reload
export const IOCMap = new Map()

/**
 * Pure Container Instance
 */
export const IOC = new Container({
  autoBindInjectable: true,
  defaultScope: 'Transient',
})

const { lazyInject } = getDecorators(IOC);
export const lazy = lazyInject