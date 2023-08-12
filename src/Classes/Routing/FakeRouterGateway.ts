import { injectable } from 'inversify'

@injectable()
export class FakeRouterGateway {
  registerRoutes = async (routeConfig) => {}

  unload = () => {}

  goToId = async (routeId) => {}
}
