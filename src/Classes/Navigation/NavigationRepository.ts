import { injectable } from 'inversify'
import TreeModel from 'tree-model'
import { AuthRepository } from '../Authentication/AuthRepository'
import { Router } from '../Routing/Router'

import { use } from '@/kernel'

@injectable()
export class NavigationRepository {

  get authRepo () { return use(AuthRepository) }
  get router () { return use(Router) }

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
