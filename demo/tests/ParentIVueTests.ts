import { Message } from "@/App/Services/Message/Message";
import { use } from '@/index'


export abstract class ParentIVueTests {

  get message() { return use(Message) }

  private parentPrivate = 111

  prop = 'test'

  nonReactiveProp = {
    test: {
      test: true
    }
  }

  showWarning = null

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