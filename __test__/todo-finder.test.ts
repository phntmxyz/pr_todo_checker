import { findTodos } from '../src/todo-finder'
import { Todo } from '../src/types'
import * as testData from './test_data'

describe('extract Todos', () => {
  it('should correctly extract mixed todos', () => {
    const fileTodos = findTodos(testData.mixedTodoDiff)

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
        line: 30,
        content: 'todo comment',
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

  it('should correctly extract updated todos', () => {
    const fileTodos = findTodos(testData.updateTodoDiff)

    const expectedTodos: Todo[] = [
      {
        filename: 'README.md',
        line: 29,
        content: 'todo remved',
        isAdded: false
      },
      {
        filename: 'README.md',
        line: 29,
        content: 'todo updated',
        isAdded: true
      }
    ]
    expect(fileTodos).toEqual(expectedTodos)
  })

  it('should correctly extract todos from a new file', () => {
    const fileTodos = findTodos(testData.newFileTodoDiff)

    const expectedTodos: Todo[] = [
      {
        filename: 'first.js',
        line: 3,
        content: 'TODO first todo',
        isAdded: true
      },
      {
        filename: 'first.js',
        line: 4,
        content: 'TODO second todo',
        isAdded: true
      },
      {
        filename: 'first.js',
        line: 5,
        content: 'TODO third todo',
        isAdded: true
      },
      {
        filename: 'first.js',
        line: 6,
        content: 'TODO fourth todo',
        isAdded: true
      },
      {
        filename: 'first.js',
        line: 14,
        content: 'TODO: Implement methodA',
        isAdded: true
      },
      {
        filename: 'first.js',
        line: 25,
        content: 'TODO: Implement methodB',
        isAdded: true
      }
    ]
    expect(fileTodos).toEqual(expectedTodos)
  })

  it('should correctly extract todos when diff starts with removed lines', () => {
    const fileTodos = findTodos(testData.startWithRemovedLineTodoDiff)

    const expectedTodos: Todo[] = [
      {
        filename: 'first.js',
        line: 4,
        content: 'TODO first todo',
        isAdded: false
      },
      {
        filename: 'first.js',
        line: 5,
        content: 'TODO second todo',
        isAdded: false
      },
      {
        filename: 'first.js',
        line: 6,
        content: 'TODO third todo',
        isAdded: false
      },
      {
        filename: 'first.js',
        line: 7,
        content: 'TODO fourth todo',
        isAdded: false
      },
      {
        filename: 'first.js',
        line: 15,
        content: 'TODO: Implement methodA',
        isAdded: true
      },
      {
        filename: 'first.js',
        line: 25,
        content: 'TODO: Implement methodB',
        isAdded: false
      }
    ]
    expect(fileTodos).toEqual(expectedTodos)
  })

  it('should correctly exclude files', () => {
    const exclude = ['**/*.yml', '**/excluded/*']

    const fileTodos = findTodos(testData.excludeFilesDiff, exclude)

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

describe('custom todo matcher', () => {
  it('should match html comment', () => {
    const customMatcher = "{'html': ['<!--']}"
    const fileTodos = findTodos(testData.htmlTodoDiff, [], customMatcher)

    const expectedTodos: Todo[] = [
      {
        filename: 'first.html',
        line: 2,
        content: 'TODO first todo -->',
        isAdded: true
      },
      {
        filename: 'first.html',
        line: 4,
        content: 'TODO second todo -->',
        isAdded: false
      },
      {
        filename: 'first.html',
        line: 4,
        content: 'TODO third todo -->',
        isAdded: true
      },
      {
        filename: 'first.html',
        line: 5,
        content: 'TODO fourth todo -->',
        isAdded: true
      }
    ]

    expect(fileTodos).toEqual(expectedTodos)
  })

  it('should match mixed comment indicators', () => {
    const customMatcher = "{'any': ['<!--', '//', '#', '--', ';']}"
    const fileTodos = findTodos(
      testData.mixedTodoMatcherDiff,
      [],
      customMatcher
    )

    const expectedTodos: Todo[] = [
      {
        filename: 'first.any',
        line: 1,
        content: 'TODO first todo -->',
        isAdded: true
      },
      {
        filename: 'first.any',
        line: 3,
        content: 'todo second todo',
        isAdded: true
      },
      {
        filename: 'first.any',
        line: 4,
        content: 'todo third todo',
        isAdded: true
      },
      {
        filename: 'first.any',
        line: 5,
        content: 'todo fourth todo',
        isAdded: true
      },
      {
        filename: 'first.any',
        line: 6,
        content: 'todo fifth todo',
        isAdded: true
      },
      {
        filename: 'first.any',
        line: 7,
        content: 'fixme sixth todo',
        isAdded: true
      }
    ]

    expect(fileTodos).toEqual(expectedTodos)
  })
})
