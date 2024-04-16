import * as core from '@actions/core'
import * as github from '@actions/github'
import { PrDiff, FileTodos, TodoItem } from './types'
import { minimatch } from 'minimatch'

export async function run(): Promise<void> {
  try {
    const token = core.getInput('token')

    // Get the user's glbbing input and split it into an array of patterns
    const excludePatterns = core.getInput('exclude').split('\n')

    const octokit = github.getOctokit(token)
    const botName = 'github-actions[bot]'
    const pr = github.context.payload.pull_request

    if (!pr || !pr.number) {
      throw new Error('Action can only be run on pull requests')
    }

    const isCommentChange = github.context.payload.action === 'edited'
    const user = github.context.payload.comment?.user?.login

    console.log('Is comment change:', isCommentChange)

    // Check if a comment, added by the bot, was edited. If so, update the commit status
    if (isCommentChange && user === botName) {
      console.log('User:', user)
      console.log('Comment change detected')
      await updateCommitStatus(octokit, pr.number, botName)
    } else {
      if (!pr) {
        throw new Error('This action can only be run on pull requests')
      }
      const prDiff = await getPrDiff(octokit, pr.base.sha, pr.head.sha)

      const todos = findTodos(prDiff, excludePatterns)
      console.log('Todos:', JSON.stringify(todos))
      await commentPr(octokit, pr.number, botName, todos)
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

export function findTodos(prDiff: PrDiff, exclude: string[] = []): FileTodos[] {
  // Find first number in string
  const regex = /(\d+)/

  const fileTodos: FileTodos[] = prDiff
    .map(file => {
      const excluded = exclude.some(pattern =>
        minimatch(file.filename, pattern)
      )
      const patch = file.patch

      if (patch === undefined || excluded) return

      const lines = patch.split('\n')
      if (lines === undefined || lines.length === 0) return

      // remove first line and get the line number where the patch starts
      const firstLine = lines.shift()
      const match = firstLine?.match(regex)
      if (match === undefined || match === null || match?.length === 0) return
      const startLineNumer = parseInt(match[0])

      console.log('Start line number:', startLineNumer)

      // get all todos from the patch map them to the line number
      let currentLine = startLineNumer
      const todoItems: TodoItem[] = lines
        .map(line => {
          const isDeleted = line.trim().startsWith('-')

          const todo = getTodoIfFound(line)

          const todoItem: TodoItem | undefined =
            todo === undefined
              ? undefined
              : {
                  line: currentLine,
                  content: todo,
                  isNew: line.trim().startsWith('+')
                }

          if (isDeleted) {
            currentLine -= 1
          } else {
            currentLine += 1
          }

          return todoItem
        })
        .filter((todo): todo is TodoItem => todo !== undefined)

      if (todoItems.length === 0) return

      return { filename: file.filename, todos: todoItems }
    })
    .filter((todo): todo is FileTodos => todo !== undefined)
  return fileTodos
}

function getTodoIfFound(line: string): string | undefined {
  const regex = /[/*#]+.*(TODO.*|FIXME.*)/i
  const match = line.match(regex)
  if (match === undefined || match === null || match?.length === 0) return
  return match[1]
}

async function commentPr(
  octokit: ReturnType<typeof github.getOctokit>,
  prNumber: number,
  botName: string,
  fileTodos: FileTodos[]
): Promise<void> {
  const { owner, repo } = github.context.repo
  const issueNumber = github.context.payload.pull_request?.number
  const headSha = github.context.payload.pull_request?.head.sha

  if (!issueNumber) throw new Error('Issue number not found')

  // Get all comments on the pull request
  const { data: comments } = await octokit.rest.pulls.listReviewComments({
    owner,
    repo,
    pull_number: prNumber
  })

  // console.log(`Delete ${comments.length} comments`)
  // // Delete all comments from the bot before adding new ones
  // for (const comment of comments) {
  //   if (comment.user?.login === botName) {
  //     await octokit.rest.pulls.deleteReviewComment({
  //       owner,
  //       repo,
  //       comment_id: comment.id
  //     })
  //   }
  // }

  console.log(`Add found todos as comments to PR #${prNumber}`)

  for (const fileTodo of fileTodos) {
    const addedTodos = fileTodo.todos.filter(todo => todo.isNew)

    for (const innerTodo of addedTodos) {
      await octokit.rest.pulls.createReviewComment({
        owner,
        repo,
        pull_number: prNumber,
        body: generateComment(innerTodo),
        commit_id: headSha,
        path: fileTodo.filename,
        side: 'RIGHT',
        line: innerTodo.line
      })
    }
  }

  console.log('Current head sha is:', headSha)

  try {
    await updateCommitStatus(octokit, prNumber, botName)
    console.log('Commit status created')
  } catch (error) {
    console.log('Error creating commit status', error)
  }
}

function generateComment(todo: TodoItem): string {
  let comment =
    'A new Todo was found. If you want to fix it later on, mark it as ignore.\n'
  comment += `*${todo.content}*\n`
  if (todo.isNew) {
    comment += `- [ ] Ignore`
  } else {
    comment += `- [x] Ignore`
  }
  console.log(comment)
  return comment
}

async function updateCommitStatus(
  octokit: ReturnType<typeof github.getOctokit>,
  prNumber: number,
  botName: string
): Promise<void> {
  const { owner, repo } = github.context.repo

  // Get all comments on the pull request
  const { data: comments } = await octokit.rest.pulls.listReviewComments({
    owner,
    repo,
    pull_number: prNumber
  })
  console.log('Found comments:', comments.length)

  let todoCount = 0
  let doneCount = 0
  for (const comment of comments) {
    if (comment.user?.login === botName) {
      console.log('Comment:', comment.line, comment.body)

      // Check if the comment contains a markdown checkbox which is checked
      const matches = comment.body?.match(/- \[x\]/gi)
      if (matches) {
        doneCount += 1
        todoCount += 1
      }
      // Check if the comment contains a markdown checkbox which is unchecked
      const uncheckedMatches = comment.body?.match(/- \[ \]/gi)
      if (uncheckedMatches) {
        todoCount += 1
      }
    }
  }

  // Update the commit status
  await createCommitStatus(octokit, doneCount, todoCount)
}

async function createCommitStatus(
  octokit: ReturnType<typeof github.getOctokit>,
  doneCount: number,
  todoCount: number
): Promise<void> {
  try {
    const { owner, repo } = github.context.repo
    const headSha = github.context.payload.pull_request?.head.sha

    const state = doneCount === todoCount ? 'success' : 'failure'

    await octokit.rest.repos.createCommitStatus({
      owner,
      repo,
      sha: headSha,
      state,
      description: `${doneCount}/${todoCount} TODOs solved`,
      context: 'TODO Finder'
    })
    console.log('Done:', doneCount)
    console.log('Total:', todoCount)
    console.log(`Commit status created with state: ${state}`)
  } catch (error) {
    console.log('Error creating commit status', error)
  }
}
