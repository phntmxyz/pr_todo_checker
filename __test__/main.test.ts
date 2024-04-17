import { findTodos } from '../src/main' // replace with the actual path to the function
import { Todo } from '../src/types'
import { excludeFilesPrDiff, todoPrDiff } from './test_data'

describe('extractTodos', () => {
  it('should correctly extract todos', () => {
    const fileTodos = findTodos(todoPrDiff)

    const expectedTodos: Todo[] = [
      {
        filename: 'README.md',
        line: 31,
        content: 'TODO here',
        isAdded: true
      },
      {
        filename: 'lib/first.js',
        line: 21,
        content: 'TODO removed comment',
        isAdded: false
      },
      {
        filename: 'lib/second.js',
        line: 26,
        content: 'TODO - upper case with much space',
        isAdded: true
      },
      {
        filename: 'lib/second.js',
        line: 27,
        content: 'todo - lower case with space',
        isAdded: true
      },
      {
        filename: 'lib/second.js',
        line: 28,
        content: 'todo - lower case no space',
        isAdded: true
      },
      {
        filename: 'lib/second.js',
        line: 33,
        content: 'todo - In comment block',
        isAdded: true
      }
    ]
    expect(fileTodos).toEqual(expectedTodos)
  })

  it('should correctly exclude files', () => {
    const exclude = ['**/*.yml', '**/excluded/*']

    const fileTodos = findTodos(excludeFilesPrDiff, exclude)

    const expectedTodos: Todo[] = [
      {
        filename: 'filename.js',
        line: 22,
        content: 'TODO - in filename js',
        isAdded: true
      },
      {
        filename: 'included/other.txt',
        line: 22,
        content: 'TODO - in included directory',
        isAdded: true
      }
    ]
    expect(fileTodos).toEqual(expectedTodos)
  })
})
