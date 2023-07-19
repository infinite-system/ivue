import { inject, injectable } from 'inversify'
import TreeModel from 'tree-model'
import { AuthenticationRepository } from '../Authentication/AuthenticationRepository'
import { Router } from '../Routing/Router'

@injectable()
export class NavigationRepository {

  @inject(AuthenticationRepository) authRepo: AuthenticationRepository
  @inject(Router) router: Router

  get currentNode () {
    return this.getTree().all((node) => node.model.id === this.router.currentRoute.routeId)[0]
  }

  constructor () {
  }

  getTree () {
    const tree = new TreeModel()

    const root = tree.parse({
      id: 'homeLink',
      type: 'root',
      text: 'Home',
      children: [],
    })

    return root
  }

  back () {
    const currentNode = this.currentNode
    this.router.goToId(currentNode.parent.model.id)
  }
}
