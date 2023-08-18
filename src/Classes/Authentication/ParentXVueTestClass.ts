import { injectable } from 'inversify'
import { MessagesRepository } from "@/Classes/Core/Messages/MessagesRepository";
import { use } from '@/kernel'

@injectable()
export abstract class ParentXVueTestClass {

  get messagesRepository() { return use(MessagesRepository) }

  private parentPrivate = 111

  prop = 'test'

  nonReactiveProp = {
    test: {
      test: true
    }
  }

  showValidationWarning = null

  messagesObservables = {}

  // constructor() {}

  init () {
    this.showValidationWarning = false
    this.reset()
  }


  parentValue = 'Text from parent class'
  parentValueAlert () {
    alert(this.parentValue)
  }

  abstract reset (): void
}