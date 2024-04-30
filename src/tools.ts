import { PrDiff, Todo } from './types'
import { minimatch } from 'minimatch'

export function findTodos(prDiff: PrDiff, exclude: string[] = []): Todo[] {
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

    for (const line of lines) {
      const isAdded = line.startsWith('+')
      const isDeleted = line.startsWith('-')

      const todo = getTodoIfFound(line)

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

function getTodoIfFound(line: string): string | undefined {
  const regex = /[/*#]+.*?(TODO.*|FIXME.*)/i
  const match = line.match(regex)
  if (match === undefined || match === null || match?.length === 0) return
  return match[1]
}

export function generateComment(
  bodyTemplate: string,
  checkboxTemplate: string,
  todo: Todo
): string {
  let comment = bodyTemplate.replace('{todo}', todo.content)
  comment += '\n'
  if (todo.isAdded) {
    comment += `- [ ] ${checkboxTemplate.replace('{todo}', todo.content)}`
  } else {
    comment += `- [x] ${checkboxTemplate.replace('{todo}', todo.content)}`
  }
  console.log(comment)
  return comment
}
