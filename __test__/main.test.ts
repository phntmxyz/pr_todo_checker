import { findTodos } from '../src/main' // replace with the actual path to the function

const __diff = `
@@ -22,6 +22,14 @@ any text';\n
+ any text before   //       TODO - upper case with much space
+ // todo - lower case with space
+ //todo - lower case no space
+
+ /*
+  * todo - In comment block
+ #  todo - comment with hashtag
- #  todo - removed comment with hashtag
- removed non todo line
+ added non todo line
`

// describe('extractTodos', () => {
//   it('should correctly extract todos', () => {
//     const { newTodos, removedTodos } = findTodos(__diff)

//     expect(newTodos).toEqual([
//       'TODO - upper case with much space',
//       'todo - lower case with space',
//       'todo - lower case no space',
//       'todo - In comment block',
//       'todo - comment with hashtag'
//     ])

//     expect(removedTodos).toEqual(['todo - removed comment with hashtag'])
//   })
// })
