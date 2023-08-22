import { use } from '@/index'
import { App } from '@/App/App';

export class UseApp {
  get app () { return use(App) }
}
