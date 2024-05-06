import { Todo } from './types'

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
  return comment
}
