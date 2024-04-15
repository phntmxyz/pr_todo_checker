import { findTodos } from '../src/main' // replace with the actual path to the function
import { FileTodos, PrDiff } from '../src/types'

const __diff = `@@ -22,6 +22,14 @@ any text';
+ any text before   //       TODO - upper case with much space
+ // todo - lower case with space
+ //todo - lower case no space
+
+ /*
+  * todo - In comment block
+ #  todo - comment with hashtag
- #  todo - removed comment with hashtag
- removed non todo line
+ added non todo line`

const __prDiff = [
  {
    sha: 'sha',
    filename: 'filename',
    status: 'modified',
    additions: 8,
    deletions: 2,
    changes: 0,
    blob_url: 'blob_url',
    raw_url: 'raw_url',
    contents_url: 'contents_url',
    patch: __diff,
    previous_filename: undefined
  }
] as PrDiff

describe('extractTodos', () => {
  it('should correctly extract todos', () => {
    const fileTodos = findTodos(__prDiff)

    const expectedTodos: FileTodos[] = [
      {
        filename: 'filename',
        todos: [
          {
            line: 22,
            content: 'TODO - upper case with much space',
            isNew: true
          },
          { line: 23, content: 'todo - lower case with space', isNew: true },
          { line: 24, content: 'todo - lower case no space', isNew: true },
          { line: 27, content: 'todo - In comment block', isNew: true },
          { line: 28, content: 'todo - comment with hashtag', isNew: true },
          {
            line: 29,
            content: 'todo - removed comment with hashtag',
            isNew: false
          }
        ]
      }
    ]
    expect(fileTodos).toEqual(expectedTodos)
  })
})
