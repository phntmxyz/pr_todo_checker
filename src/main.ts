import * as core from '@actions/core'
import * as github from '@actions/github'
import { PrDiff, Todo, InnerTodo } from './types'

export async function run(): Promise<void> {
  try {
    const token = core.getInput('token')
    const octokit = github.getOctokit(token)

    const botName = 'github-actions[bot]'
    const prNumber = github.context.payload.pull_request?.number

    if (!prNumber) {
      throw new Error('Action can only be run on pull requests')
    }

    const isCommentChange = github.context.payload.action === 'edited'
    const user = github.context.payload.comment?.user?.login
    const reviewId = github.context.payload.comment?.pull_request_review_id

    console.log('Is comment change:', isCommentChange)
    console.log('User:', user)
    console.log('Review id:', reviewId)

    if (isCommentChange && user === botName) {
      console.log('Comment change detected')
      const { owner, repo } = github.context.repo

      // Get all comments on the pull request
      const { data: comments } = await octokit.rest.pulls.listCommentsForReview(
        {
          owner,
          repo,
          pull_number: prNumber,
          review_id: reviewId
        }
      )
      console.log('Found comments:', comments.length)

      let todoCount = 0
      let doneCount = 0
      comments.forEach(comment => {
        if (comment.user?.login === botName) {
          // Check if the comment contains a markdown checkbox which is checked
          const matches = comment.body?.match(/- \[x\]/g)
          if (matches) {
            doneCount += 1
            todoCount += 1
          }
          // Check if the comment contains a markdown checkbox which is unchecked
          const uncheckedMatches = comment.body?.match(/- \[ \]/g)
          if (uncheckedMatches) {
            todoCount += 1
          }
        }
      })

      console.log('Done:', doneCount)
      console.log('Total:', todoCount)

      try {
        await octokit.rest.repos.createCommitStatus({
          owner,
          repo,
          sha: github.context.payload.pull_request?.head.sha,
          state: doneCount === todoCount ? 'success' : 'failure',
          description: `${doneCount}/${todoCount} TODOs solved`,
          context: 'TODO Finder'
        })
        console.log('Commit status created')
      } catch (error) {
        console.log('Error creating commit status', error)
      }
      return
    }

    const editIssueId = core.getInput('edit-issue-id')
    if (editIssueId) {
      console.log('Edit issue id:', editIssueId)
      return
    }

    //   const pr = github.context.payload.pull_request
    //   if (!pr) {
    //     throw new Error('This action can only be run on pull requests')
    //   }
    //   const prDiff = await getPrDiff(octokit, pr.base.sha, pr.head.sha)

    //   const todos = findTodos(prDiff)
    //   console.log('Todos:', JSON.stringify(todos))

    //   const useOutput = core.getInput('use-output')
    //   await commentPr(octokit, pr.number, todos)
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

function getTodoIfFound(line: string): string | undefined {
  const regex = /[/*#]+.*(TODO.*)/i
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
  const headSha = github.context.payload.pull_request?.head.sha

  if (!issueNumber) throw new Error('Issue number not found')

  console.log(`Add found todos as comments to PR #${prNumber}`)

  for (const todo of todos) {
    const addedTodos = todo.todos.filter(todo => todo.added)
    const removedTodos = todo.todos.filter(todo => !todo.added)

    for (const innerTodo of addedTodos) {
      let response = await octokit.rest.pulls.createReviewComment({
        owner,
        repo,
        pull_number: prNumber,
        body: generateComment(innerTodo),
        commit_id: headSha,
        path: todo.filename,
        side: 'RIGHT',
        line: innerTodo.line
      })
    }

    for (const innerTodo of removedTodos) {
      let response = await octokit.rest.pulls.createReviewComment({
        owner,
        repo,
        pull_number: prNumber,
        body: generateComment(innerTodo),
        commit_id: headSha,
        path: todo.filename,
        side: 'LEFT',
        line: innerTodo.line
      })
    }
  }

  console.log('Current head sha is:', headSha)

  const doneCount = sum(
    todos.map(todo => todo.todos.filter(todo => !todo.added).length)
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

function generateComment(todo: InnerTodo): string {
  let comment = '**Found TODO:**\n'
  if (todo.added) {
    comment += `- [ ] Ignore: ${todo.content}`
  } else {
    comment += `- [x] Ignore: ~~${todo.content}~~`
  }
  console.log(comment)
  return comment
}
