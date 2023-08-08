import { injectable } from 'inversify'
import TreeModel from 'tree-model'
import type { AuthRepository } from '../Authentication/AuthRepository'
import type { Router } from '../Routing/Router'

import { use, $ } from '@/tests/Helpers/IOC/IOC'

@injectable()
export class NavigationRepository {

  @use($.AuthRepository) authRepo: AuthRepository
  @use($.Router) router: Router

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
