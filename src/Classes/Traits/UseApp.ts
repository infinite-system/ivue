import { use } from '@/index'
import { App } from '@/Classes/App';

export class UseApp {
  get app () { return use(App) }
}
