import * as core from '@actions/core'
import * as github from '@actions/github'

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
    const { newTodos, removedTodos } = findTodos(prDiff)

    const useOutput = core.getInput('use-output')
    if (useOutput === 'true') {
      core.setOutput('added-todos', newTodos.join('\n'))
      core.setOutput('removed-todos', removedTodos.join('\n'))
    } else {
      const comment = generateComment(newTodos, removedTodos)

      await commentPr(
        octokit,
        comment,
        headRef,
        newTodos.length + removedTodos.length,
        removedTodos.length
      )
      core.setOutput('comment', comment)
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
): Promise<string> {
  const { owner, repo } = github.context.repo

  const response = await octokit.rest.repos.compareCommitsWithBasehead({
    owner,
    repo,
    basehead: `${base}...${head}`
  })

  return response?.data?.files?.map(file => file.patch).join('\n') ?? ''
}

export function findTodos(prDiff: string): {
  newTodos: string[]
  removedTodos: string[]
} {
  const newTodos: string[] = []
  const removedTodos: string[] = []

  const lines = prDiff.split('\n')
  for (const line of lines) {
    if (line.startsWith('+')) {
      const todo = getTodoIfFound(line)
      if (todo.length > 0) newTodos.push(todo.trim())
    } else if (line.startsWith('-')) {
      const todo = getTodoIfFound(line)
      if (todo.length > 0) removedTodos.push(todo.trim())
    }
  }

  console.log('New TODOs found in this PR:', newTodos)
  console.log('Solved TODOs found in this PR:', removedTodos)

  return { newTodos, removedTodos }
}

function getTodoIfFound(line: string): string {
  const regex = /[/*#]+.*(TODO.*)/gi
  const matches = [...line.matchAll(regex)]
  if (matches === undefined || matches.length === 0) return ''
  return matches[0][1]
}

function generateComment(newTodos: string[], removedTodos: string[]): string {
  let comment = 'New TODOs found in this PR:\n'
  for (const todo of newTodos) {
    comment += `- [ ] ${todo}\n`
  }
  comment += '\nSolved TODOs found in this PR:\n'
  for (const todo of removedTodos) {
    comment += `- [x] ${todo}\n`
  }

  console.log('Comment:', comment)
  return comment
}

async function commentPr(
  octokit: ReturnType<typeof github.getOctokit>,
  comment: string,
  headSha: string,
  todoCount: number,
  doneCount: number
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
      entry.body?.startsWith('New TODOs found in this PR:')
  )

  // If the comment exists, update it; otherwise, create a new comment
  if (existingComment) {
    console.log(`Update existing comment #${existingComment.id}`)
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingComment.id,
      body: comment
    })
  } else {
    console.log(`Create new comment`)
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: comment
    })
  }

  console.log('Current head sha is:', headSha)

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
