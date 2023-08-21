import { Messages } from "@/Classes/Core/Messages/Messages";
import { use } from '@/index'


export abstract class ParentIVueTests {

  get messages() { return use(Messages) }

  private parentPrivate = 111

  prop = 'test'

  nonReactiveProp = {
    test: {
      test: true
    }
  }

  showWarning = null

  messagesObservables = {}

  // constructor() {}

  init () {
    this.showWarning = false
    this.reset()
  }


  parentValue = 'Text from parent class'
  
  parentValueAlert () {
    alert(this.parentValue)
  }

  abstract reset (): void
}