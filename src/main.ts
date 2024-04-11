import * as core from '@actions/core'
import * as github from '@actions/github'
import { PrDiff, Todo, InnerTodo } from './types'

export async function run(): Promise<void> {
  try {
    const token = core.getInput('token')
    const octokit = github.getOctokit(token)

    const base = core.getInput('base')
    const head = core.getInput('head')

    const baseRef = base || github.context.payload.pull_request?.base.sha
    const headRef = head || github.context.payload.pull_request?.head.sha

    if (!baseRef || !headRef) {
      throw new Error('Base or head ref not found')
    }

    const prDiff = await getPrDiff(octokit, baseRef, headRef)

    const todos = findTodos(prDiff)
    console.log('Todos:', JSON.stringify(todos))

    const useOutput = core.getInput('use-output')
    if (useOutput === 'true') {
      core.setOutput('todos', todos)
    } else {
      await commentPr(octokit, headRef, todos)
      // core.setOutput('comment', comment)
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      console.log(error)
      core.setFailed('An unexpected error occurred')
    }
  }
}

async function getPrDiff(
  octokit: ReturnType<typeof github.getOctokit>,
  base: string,
  head: string
): Promise<PrDiff> {
  const { owner, repo } = github.context.repo

  const response = await octokit.rest.repos.compareCommitsWithBasehead({
    owner,
    repo,
    basehead: `${base}...${head}`
  })

  return response?.data?.files || []
}

export function findTodos(prDiff: PrDiff): Todo[] {
  // Find first number in string
  const regex = /(\d+)/

  const todos: Todo[] = prDiff
    .map(file => {
      const patch = file.patch
      if (patch === undefined) return

      const lines = patch.split('\n')
      if (lines === undefined || lines.length === 0) return

      // remove first line and get the line number where the patch starts
      const firstLine = lines.shift()
      const match = firstLine?.match(regex)
      if (match === undefined || match === null || match?.length === 0) return
      const startLineNumer = parseInt(match[0])

      // get all todos from the patch map them to the line number
      const todos: InnerTodo[] = lines
        .map((line, index) => {
          const todo = getTodoIfFound(line)
          if (todo === undefined) return
          return {
            line: startLineNumer + index,
            content: todo,
            added: line.startsWith('+')
          }
        })
        .filter((todo): todo is InnerTodo => todo !== undefined)

      if (todos.length == 0) return

      return { filename: file.filename, todos: todos }
    })
    .filter((todo): todo is Todo => todo !== undefined)
  return todos
}

function getTodoIfFound(line: string): string {
  const regex = /[/*#]+.*(TODO.*)/gi
  const matches = [...line.matchAll(regex)]
  if (matches === undefined || matches.length === 0) return ''
  return matches[0][1]
}

async function commentPr(
  octokit: ReturnType<typeof github.getOctokit>,
  headSha: string,
  todos: Todo[]
): Promise<void> {
  const { owner, repo } = github.context.repo
  const issueNumber = github.context.payload.pull_request?.number

  if (!issueNumber) throw new Error('Issue number not found')

  // Get all comments on the pull request
  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber
  })

  // Find the comment created by this action
  const existingComment = comments.find(
    entry =>
      entry.user?.login === 'github-actions[bot]' &&
      entry.body?.startsWith('**New TODOs found in this PR:**')
  )

  // If the comment exists, update it; otherwise, create a new comment
  if (existingComment) {
    // console.log(`Update existing comment #${existingComment.id}`)
    // await octokit.rest.issues.updateComment({
    //   owner,
    //   repo,
    //   comment_id: existingComment.id,
    //   body: comment
    // })
  } else {
    console.log(`Create new comment`)
    for (const todo of todos) {
      const comment = generateComment(
        todo.todos.map(t => t.content),
        []
      )
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body: comment,
        path: todo.filename,
        position: todo.todos[todo.todos.length - 1].line
      })
    }
  }

  console.log('Current head sha is:', headSha)

  const doneCount = sum(
    todos.map(todo => todo.todos.filter(todo => todo.added).length)
  )
  const todoCount = sum(todos.map(todo => todo.todos.length))

  try {
    await octokit.rest.repos.createCommitStatus({
      owner,
      repo,
      sha: headSha,
      state: 'success',
      description: `${doneCount}/${todoCount} TODOs solved`,
      context: 'TODO Finder'
    })
    console.log('Commit status created')
  } catch (error) {
    console.log('Error creating commit status', error)
  }
}

function sum(numbers: number[]): number {
  return numbers.reduce((acc, curr) => acc + curr, 0)
}

function generateComment(newTodos: string[], removedTodos: string[]): string {
  let comment = '**New TODOs found in this PR:**\n'
  for (const todo of newTodos) {
    comment += `- [ ] ${todo}\n`
  }
  comment += '\n**Solved TODOs found in this PR:**\n'
  for (const todo of removedTodos) {
    comment += `- [x] ${todo}\n`
  }

  console.log('Comment:', comment)
  return comment
}
