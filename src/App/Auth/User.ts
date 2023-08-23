import type { Null } from "@/types/core"

export class User {
  email: Null<string> = ''
  token: Null<string> = ''
  init() {
    // let i = 0
    // this.token = 0
    // setInterval(() => {
    //   this.token = i++
    //   console.log('this.token', this.token)
    // },100)
  }
}
