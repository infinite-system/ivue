export function generateHugeArray(obj, size = 20) {
  for (let i = 0; i < size; i++) {
    obj.hugeArray.push({
      struct: {
        id: i,
        user: 'username',
        text: 'hello world',
        struct: {
          id: i,
          user: 'username',
          text: 'hello world',
          struct: {
            id: i,
            user: 'username',
            text: 'hello world',
            struct: {
              id: i,
              user: 'username',
              text: 'hello world',
              struct: {
                id: i,
                user: 'username',
                text: 'hello world',
                struct: {
                  id: i,
                  user: 'username',
                  text: 'hello world',
                  struct: {
                    id: i,
                    user: 'username',
                    text: 'hello world',
                    struct: {
                      id: i,
                      user: 'username',
                      text: 'hello world',
                    }
                  }
                }
              }
            }
          }
        }
      }
    })
  }

}