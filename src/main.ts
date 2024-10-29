import * as core from '@actions/core'
import * as github from '@actions/github'
import { PrDiff, Todo } from './types'
import { findTodos } from './todo-finder'
import { generateComment } from './comment'

export async function run(): Promise<void> {
  try {
    const token = core.getInput('token')

    // Get the user's glbbing input and split it into an array of patterns
    const excludePatterns = core.getInput('exclude').split('\n')
    const commentOnTodo = core.getInput('comment_on_todo') === 'true'
    const commentBodyTemplate = core.getInput('comment_body')
    const commentCheckboxTemplate = core.getInput('comment_checkbox')
    const customTodoMatcher = core.getInput('custom_todo_matcher')

    const octokit = github.getOctokit(token)
    const botName = 'github-actions[bot]'
    const pr = github.context.payload.pull_request

    if (!pr || !pr.number) {
      throw new Error('Action can only be run on pull requests')
    }

    const isCommentChange =
      github.context.payload.action === 'edited' ||
      github.context.payload.action === 'deleted'
    const user = github.context.payload.comment?.user?.login

    console.log('Is comment change:', isCommentChange)

    // Check if a comment, added by the bot, was edited. If so, update the commit status
    if (isCommentChange) {
      console.log('User:', user)
      console.log('Comment change detected')
      await updateCommitStatus(octokit, pr.number, botName)
    } else if (commentOnTodo) {
      const prDiff = await getPrDiff(octokit, pr.base.sha, pr.head.sha)

      const todos = findTodos(prDiff, excludePatterns, customTodoMatcher)
      console.log('Todos:', JSON.stringify(todos))
      await commentPr(
        octokit,
        pr.number,
        botName,
        todos,
        commentBodyTemplate,
        commentCheckboxTemplate
      )
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

async function commentPr(
  octokit: ReturnType<typeof github.getOctokit>,
  prNumber: number,
  botName: string,
  todos: Todo[],
  commentBodyTemplate: string,
  commentCheckboxTemplate: string
): Promise<void> {
  const { owner, repo } = github.context.repo
  const issueNumber = github.context.payload.pull_request?.number
  const headSha = github.context.payload.pull_request?.head.sha

  if (!issueNumber) throw new Error('Issue number not found')

  // Get all comments on the pull request
  const { data: allComments } = await octokit.rest.pulls.listReviewComments({
    owner,
    repo,
    pull_number: prNumber
  })

  const botComments = allComments.filter(
    comment => comment.user?.login === botName
  )

  const addedTodos = todos.filter(todo => todo.isAdded)

  const existingTodosWithComment: Todo[] = []
  for (const comment of botComments) {
    // If position is null or undefined, the comment is outdated and should be deleted
    if (comment.position === null || comment.position === undefined) {
      await octokit.rest.pulls.deleteReviewComment({
        owner,
        repo,
        comment_id: comment.id
      })
      continue
    }

    for (const todo of addedTodos) {
      if (comment.path === todo.filename && comment.line === todo.line) {
        existingTodosWithComment.push(todo)
      }
    }
  }
  console.log(`Found ${existingTodosWithComment.length} existing Todos`)

  const newTodos = addedTodos.filter(
    todo => !existingTodosWithComment.includes(todo)
  )
  console.log(`Found ${newTodos.length} new Todos`)

  console.log(`Add found todos as comments to PR #${prNumber}`)
  for (const todo of newTodos) {
    await octokit.rest.pulls.createReviewComment({
      owner,
      repo,
      pull_number: prNumber,
      body: generateComment(commentBodyTemplate, commentCheckboxTemplate, todo),
      commit_id: headSha,
      path: todo.filename,
      side: 'RIGHT',
      line: todo.line
    })
  }

  console.log('Current head sha is:', headSha)

  try {
    await updateCommitStatus(octokit, prNumber, botName)
    console.log('Commit status created')
  } catch (error) {
    console.log('Error creating commit status', error)
  }
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
      context: 'PR Todo Checker'
    })
    console.log('Done:', doneCount)
    console.log('Total:', todoCount)
    console.log(`Commit status created with state: ${state}`)
  } catch (error) {
    console.log('Error creating commit status', error)
  }
}

export async function getTodosForDiff(
  pat: string,
  owner: string,
  repo: string,
  base: string,
  head: string
): Promise<void> {
  console.log('PAT:', pat)
  console.log('Owner:', owner)
  console.log('Repo:', repo)
  console.log('Base:', base)
  console.log('Head:', head)

  const octokit = github.getOctokit(pat)
  const response = await octokit.rest.repos.compareCommitsWithBasehead({
    owner,
    repo,
    basehead: `${base}...${head}`
  })

  const prDiff = response?.data?.files || []

  const todos = findTodos(prDiff, [], '{}')
  console.log('Todos:', JSON.stringify(todos))
}
