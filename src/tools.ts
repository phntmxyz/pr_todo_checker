import { PrDiff, Todo } from './types'
import { minimatch } from 'minimatch'

export function findTodos(prDiff: PrDiff, exclude: string[] = []): Todo[] {
  // Find first number in string
  const regex = /(\d+)/

  const todos: Todo[] = []

  for (const file of prDiff) {
    const excluded = exclude.some(pattern => minimatch(file.filename, pattern))
    const patch = file.patch

    if (patch === undefined || excluded) continue

    const lines = patch.split('\n')
    if (lines === undefined || lines.length === 0) continue

    // remove first line and get the line number where the patch starts
    const firstLine = lines.shift()
    const match = firstLine?.match(regex)
    if (match === undefined || match === null || match?.length === 0) continue
    const startLineNumer = parseInt(match[0])

    // get all todos from the patch map them to the line number
    let currentLine = startLineNumer
    for (const line of lines) {
      const isDeleted = line.startsWith('-')

      const todo = getTodoIfFound(line)

      if (todo !== undefined) {
        todos.push({
          filename: file.filename,
          line: currentLine,
          content: todo,
          isAdded: !isDeleted
        })
      }

      if (isDeleted) {
        currentLine -= 1
      } else {
        currentLine += 1
      }
    }
  }
  return todos
}

function getTodoIfFound(line: string): string | undefined {
  const regex = /[/*#]+.*(TODO.*|FIXME.*)/i
  const match = line.match(regex)
  if (match === undefined || match === null || match?.length === 0) return
  return match[1]
}

export function generateComment(todo: Todo): string {
  let comment =
    'A new Todo was found. If you want to fix it later on, mark it as ignore.\n'
  comment += `*${todo.content}*\n`
  if (todo.isAdded) {
    comment += `- [ ] Ignore`
  } else {
    comment += `- [x] Ignore`
  }
  console.log(comment)
  return comment
}
