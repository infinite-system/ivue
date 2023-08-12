import { use } from '@/Kernel'
import { AppPresenter } from '@/Classes/AppPresenter';

export class UseApp {
  get app () { return use(AppPresenter) }
}
