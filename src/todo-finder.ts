import { PrDiff, Todo } from './types'
import { minimatch } from 'minimatch'

export function findTodos(
  prDiff: PrDiff,
  exclude: string[] = [],
  customTodoMatcherString = '{}'
): Todo[] {
  // Find first number in string
  const firstAddedLineRegex = /\+(\d+)/
  const firstRemovedLineRegex = /-(\d+)/

  const todos: Todo[] = []

  for (const file of prDiff) {
    const excluded = exclude.some(pattern => minimatch(file.filename, pattern))
    const patch = file.patch

    if (patch === undefined || excluded) continue

    const lines = patch.split('\n')
    if (lines === undefined || lines.length === 0) continue

    // remove first line and get the line number where the patch starts
    const firstLine = lines.shift()

    let addedStartLineNumer
    const addedMatch = firstLine?.match(firstAddedLineRegex)
    if (
      addedMatch !== undefined &&
      addedMatch !== null &&
      addedMatch?.length > 1
    ) {
      addedStartLineNumer = parseInt(addedMatch[1])
    }

    let removedStartLineNumer
    const removedMatch = firstLine?.match(firstRemovedLineRegex)
    if (
      removedMatch !== undefined &&
      removedMatch !== null &&
      removedMatch?.length > 1
    ) {
      removedStartLineNumer = parseInt(removedMatch[1])
    }

    if (
      addedStartLineNumer === undefined ||
      removedStartLineNumer === undefined
    ) {
      continue
    }

    // get all todos from the patch map them to the line number
    let currentAddedLine = addedStartLineNumer
    let currentRemovedLine = removedStartLineNumer

    // get custom todo matcher for the file
    const customMatcher = getTodoMatcherForFile(
      file.filename,
      customTodoMatcherString
    )

    for (const line of lines) {
      const isAdded = line.startsWith('+')
      const isDeleted = line.startsWith('-')

      const todo = getTodoIfFound(line, customMatcher)

      if (isDeleted) {
        if (todo !== undefined) {
          todos.push({
            filename: file.filename,
            line: currentRemovedLine,
            content: todo,
            isAdded: false
          })
        }
        currentRemovedLine += 1
      } else if (isAdded) {
        if (todo !== undefined) {
          todos.push({
            filename: file.filename,
            line: currentAddedLine,
            content: todo,
            isAdded: true
          })
        }
        currentAddedLine += 1
      } else {
        currentAddedLine += 1
        currentRemovedLine += 1
      }
    }
  }
  return todos
}

function getTodoMatcherForFile(
  filename: string,
  customTodoMatcherString: string
): string[] {
  const filenameParts = filename.split('.')
  let customMatcher: string[] = []
  const customTodoMatcher = JSON.parse(
    customTodoMatcherString.replace(/'/g, '"')
  )
  for (const filetype of Object.keys(customTodoMatcher)) {
    if (filenameParts[filenameParts.length - 1] === filetype) {
      customMatcher = customTodoMatcher[filetype] || []
      break
    }
  }
  return customMatcher
}

function getTodoIfFound(
  line: string,
  customMatcher: string[] = []
): string | undefined {
  const regex = new RegExp(buildTodoMatcher(customMatcher), 'i')
  const match = line.match(regex)
  if (match === undefined || match === null || match?.length === 0) return
  // remove html closing comment tag if present
  const todo = match[1].replace('-->', '').trim()
  return todo
}

function buildTodoMatcher(customMatcher: string[]): string {
  let todoMatcher: string[]
  if (customMatcher.length === 0) {
    // default todo matcher
    todoMatcher = ['//', '*', '#']
  } else {
    todoMatcher = customMatcher
  }

  const needToEscape = [
    ']',
    '\\',
    '^',
    '*',
    '+',
    '?',
    '{',
    '}',
    '|',
    '(',
    ')',
    '$',
    '.'
  ]

  const escapedPatterns = todoMatcher.map(pattern => {
    let escapedPattern = ''
    for (const char of pattern) {
      if (needToEscape.includes(char)) {
        escapedPattern += `\\${char}`
      } else {
        escapedPattern += char
      }
    }
    return escapedPattern
  })

  const regex = `(?:${escapedPatterns.join('|')}).*?(TODO.*|FIXME.*)`
  return regex
}
