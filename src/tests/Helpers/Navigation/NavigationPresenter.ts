import { injectable } from 'inversify'
import type { NavigationRepository } from './NavigationRepository'
import type { RouterRepository } from '../Routing/RouterRepository'
import { lazy, Inject } from '@/tests/Helpers/IOC/IOC'

@injectable()
export class NavigationPresenter {

  @lazy(Inject.NavigationRepository) navigationRepository: NavigationRepository
  @lazy(Inject.RouterRepository) routerRepository: RouterRepository

  get viewModel() {
    const vm = {
      showBack: false,
      currentSelectedVisibleName: '',
      currentSelectedBackTarget: { visible: false, id: null },
      menuItems: [],
    }

    const currentNode = this.navigationRepository.currentNode

    if (currentNode) {
      vm.currentSelectedVisibleName = this.visibleName(currentNode)
      vm.menuItems = currentNode.children.map((node) => {
        return { id: node.model.id, visibleName: node.model.text }
      })

      if (currentNode.parent) {
        vm.currentSelectedBackTarget = {
          visible: true,
          id: currentNode.parent.model.id,
        }
        vm.showBack = true
      }
    }

    return vm
  }

  constructor() {
  }

  visibleName(node) {
    return node.model.text + ' > ' + node.model.id
  }

  back() {
    this.navigationRepository.back()
  }
}
