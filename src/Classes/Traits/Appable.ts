import { use } from '@/kernel'
import { AppPresenter } from '@/Classes/AppPresenter';

export class Appable {
  get app () { return use(AppPresenter) }
}
