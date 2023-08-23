import TreeModel from 'tree-model'
import { Router } from '../Routing/Router'
import { Traits, UseRoute, UseRouter, use } from '@/index'
import { watch } from 'vue'

export class $Navigation {

  get router () { return use(Router) }

  get active () {
    return this.tree().all((node) => node.model.id === this.router.active.name)[0]
  }

  tree () {
    const tree = new TreeModel()

    const root = tree.parse({
      id: 'home',
      type: 'root',
      text: 'Home',
      children: [],
    })

    return root
  }

  back () {
    this.router.push({ name: this.active.parent.model.id })
  }
}


export class Navigation {

  get $ () { return use($Navigation) }

  get menu () {

    const v = {
      showBack: false,
      activeName: '',
      backTarget: { visible: false, id: null },
      items: [],
    }

    const active = this.$.active

    if (active) {

      v.activeName = this.activeName(active)

      v.items = active.children.map((node: any) => {
        return { id: node.model.id, activeName: node.model.text }
      })

      if (active.parent) {
        v.backTarget = {
          visible: true,
          id: active.parent.model.id,
        }
        v.showBack = true
      }
    }

    return v
  }

  private activeName (node: any) {
    return node.model.text + ' > ' + node.model.id
  }

  back () {
    this.$.back()
  }
}
Traits(Navigation, [UseRoute, UseRouter])
export interface Navigation extends UseRoute, UseRouter {}