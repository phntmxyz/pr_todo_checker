import * as core from '@actions/core'
import * as github from '@actions/github'
import { PrDiff, Todo, InnerTodo } from './types'
import { start } from 'repl'

export async function run(): Promise<void> {
  try {
    const token = core.getInput('token')
    const octokit = github.getOctokit(token)

    const pr = github.context.payload.pull_request
    if (!pr) {
      throw new Error('This action can only be run on pull requests')
    }
    const prDiff = await getPrDiff(octokit, pr.base.sha, pr.head.sha)

    const todos = findTodos(prDiff)
    console.log('Todos:', JSON.stringify(todos))

    const useOutput = core.getInput('use-output')
    if (useOutput === 'true') {
      core.setOutput('todos', todos)
    } else {
      await commentPr(octokit, pr.number, todos)
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
            line: index,
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

function getTodoIfFound(line: string): string | undefined {
  const regex = /[/*#]+.*(TODO.*)/gi
  const matches = [...line.matchAll(regex)]
  if (matches === undefined || matches.length === 0) return
  return matches[0][1]
}

async function commentPr(
  octokit: ReturnType<typeof github.getOctokit>,
  prNumber: number,
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

  const headSha = github.context.payload.pull_request?.head.sha

  // Find the comment created by this action
  // const existingComment = comments.find(
  //   entry =>
  //     entry.user?.login === 'github-actions[bot]' &&
  //     entry.body?.startsWith('**New TODOs found in this PR:**')
  // )

  // If the comment exists, update it; otherwise, create a new comment
  if (false) {
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
      const addedTodos = todo.todos.filter(todo => todo.added)
      const removedTodos = todo.todos.filter(todo => !todo.added)
      const comment = generateComment(
        addedTodos.map(todo => todo.content),
        removedTodos.map(todo => todo.content)
      )

      if (addedTodos.length !== 0) {
        const singleLine = addedTodos.length === 1
        await octokit.rest.pulls.createReviewComment({
          owner,
          repo,
          pull_number: prNumber,
          body: comment.newComment,
          commit_id: headSha,
          path: todo.filename,
          start_side: singleLine ? undefined : 'RIGHT',
          side: 'RIGHT',
          start_line: singleLine ? undefined : addedTodos[0].line,
          line: addedTodos[addedTodos.length - 1].line
        })
      }

      if (removedTodos.length !== 0) {
        const singleLine = removedTodos.length === 1
        await octokit.rest.pulls.createReviewComment({
          owner,
          repo,
          pull_number: prNumber,
          body: comment.solvedComment,
          commit_id: headSha,
          path: todo.filename,
          start_side: singleLine ? undefined : 'LEFT',
          side: 'LEFT',
          start_line: singleLine ? undefined : removedTodos[0].line,
          line: removedTodos[removedTodos.length - 1].line
        })
      }
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

function generateComment(
  newTodos: string[],
  removedTodos: string[]
): { newComment: string; solvedComment: string } {
  let newComment = '**New TODOs:**\n'
  for (const todo of newTodos) {
    newComment += `- [ ] ${todo}\n`
  }
  let solvedComment = '**Solved TODOs**\n'
  for (const todo of removedTodos) {
    solvedComment += `- [x] ${todo}\n`
  }

  console.log('New Tdods comment:', newComment)
  console.log('Solved Tdods comment:', solvedComment)
  return { newComment, solvedComment }
}
