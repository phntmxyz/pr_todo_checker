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
    const enableIgnoreCheckbox =
      core.getInput('enable_ignore_checkbox') === 'true'
    const customTodoMatcher = core.getInput('custom_todo_matcher')
    const customIgnoreMather = core.getInput('custom_ignore_matcher')

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

      const todos = findTodos(
        prDiff,
        excludePatterns,
        customTodoMatcher,
        customIgnoreMather
      )
      console.log('Todos:', JSON.stringify(todos))
      await commentPr(
        octokit,
        pr.number,
        botName,
        todos,
        commentBodyTemplate,
        commentCheckboxTemplate,
        enableIgnoreCheckbox
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
  commentCheckboxTemplate: string,
  enableIgnoreCheckbox: boolean
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
    // If line is null or undefined, the comment is outdated and should be deleted
    if (comment.line === null || comment.line === undefined) {
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
      body: generateComment(
        commentBodyTemplate,
        commentCheckboxTemplate,
        todo,
        enableIgnoreCheckbox
      ),
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

interface GraphQLReviewThreadsResult {
  repository?: {
    pullRequest?: {
      reviewThreads?: {
        nodes: {
          id: string
          isResolved: boolean
          comments: {
            nodes: {
              databaseId?: number | null
            }[]
          }
        }[]
      }
    } | null
  } | null
}

const REVIEW_THREADS_QUERY = `
  query($owner: String!, $repo: String!, $prNumber: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $prNumber) {
        reviewThreads(first: 100) {
          nodes {
            id
            isResolved
            comments(first: 10) {
              nodes {
                databaseId
              }
            }
          }
        }
      }
    }
  }
`

export function extractResolvedCommentIds(
  graphqlResult: GraphQLReviewThreadsResult | null
): Set<number> {
  const resolvedCommentIds = new Set<number>()

  if (graphqlResult?.repository?.pullRequest?.reviewThreads?.nodes) {
    for (const thread of graphqlResult.repository.pullRequest.reviewThreads
      .nodes) {
      if (thread.isResolved) {
        for (const comment of thread.comments.nodes) {
          if (comment.databaseId) {
            resolvedCommentIds.add(comment.databaseId)
          }
        }
      }
    }
  }

  return resolvedCommentIds
}

async function getResolvedCommentIds(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  prNumber: number
): Promise<Set<number>> {
  try {
    const result = await octokit.graphql<GraphQLReviewThreadsResult>(
      REVIEW_THREADS_QUERY,
      {
        owner,
        repo,
        prNumber
      }
    )

    return extractResolvedCommentIds(result)
  } catch (error) {
    console.log('Error fetching review threads:', error)
    return new Set<number>()
  }
}

async function updateCommitStatus(
  octokit: ReturnType<typeof github.getOctokit>,
  prNumber: number,
  botName: string
): Promise<void> {
  const { owner, repo } = github.context.repo

  // Get all review threads to check which are resolved
  // Using GraphQL API because REST API doesn't have threads endpoint
  const resolvedCommentIds = await getResolvedCommentIds(
    octokit,
    owner,
    repo,
    prNumber
  )

  // Get all comments on the pull request
  const { data: comments } = await octokit.rest.pulls.listReviewComments({
    owner,
    repo,
    pull_number: prNumber
  })
  console.log('Found comments:', comments.length)
  console.log('Resolved comment IDs:', Array.from(resolvedCommentIds))

  let todoCount = 0
  let doneCount = 0
  for (const comment of comments) {
    if (comment.user?.login === botName) {
      // If line is null or undefined, the comment is outdated and should be deleted
      if (comment.line === null || comment.line === undefined) {
        console.log('Deleting outdated comment:', comment.id)
        await octokit.rest.pulls.deleteReviewComment({
          owner,
          repo,
          comment_id: comment.id
        })
        continue
      }

      console.log('Comment:', comment.line, comment.body)

      // Check if resolved - count as done
      if (resolvedCommentIds.has(comment.id)) {
        console.log('Comment is resolved - counting as done')
        doneCount += 1
        todoCount += 1
        continue
      }

      // Check if the comment contains a checkbox (legacy mode)
      const hasCheckedBox = comment.body?.match(/- \[x\]/gi)
      const hasUncheckedBox = comment.body?.match(/- \[ \]/gi)

      if (hasCheckedBox != null) {
        // Checkbox is checked (ignored)
        doneCount += 1
        todoCount += 1
      } else if (hasUncheckedBox != null) {
        // Checkbox is unchecked (still open)
        todoCount += 1
      } else {
        // No checkbox (modern mode) - count as open TODO
        // User should resolve the conversation to mark it as done
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
  base?: string,
  head?: string,
  prNumber?: number
): Promise<void> {
  console.log('PAT:', pat)
  console.log('Owner:', owner)
  console.log('Repo:', repo)

  const octokit = github.getOctokit(pat)

  // If base/head not provided, fetch from PR
  let actualBase = base
  let actualHead = head

  if (prNumber && (!base || !head)) {
    console.log('Fetching PR details...')
    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber
    })
    actualBase = pr.base.ref
    actualHead = pr.head.ref
    console.log(`Fetched from PR #${prNumber}:`)
    console.log(`  Base: ${actualBase}`)
    console.log(`  Head: ${actualHead}`)
  } else {
    console.log('Base:', actualBase)
    console.log('Head:', actualHead)
  }

  console.log('PR Number:', prNumber || 'not provided')

  if (!actualBase || !actualHead) {
    throw new Error('Base and head are required')
  }

  const response = await octokit.rest.repos.compareCommitsWithBasehead({
    owner,
    repo,
    basehead: `${actualBase}...${actualHead}`
  })

  const prDiff = response?.data?.files || []

  const todos = findTodos(prDiff, [], '{}', '')
  console.log('Todos:', JSON.stringify(todos))

  // If PR number is provided, also test the review thread logic
  if (prNumber) {
    console.log('\n--- Testing Review Thread Logic ---')
    await testUpdateCommitStatus(octokit, owner, repo, prNumber, todos)
  }
}

async function testUpdateCommitStatus(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  prNumber: number,
  foundTodos: Todo[]
): Promise<void> {
  const botName = 'github-actions[bot]'

  // Get all review threads to check which are resolved
  console.log('Fetching review threads via GraphQL...')
  const resolvedCommentIds = await getResolvedCommentIds(
    octokit,
    owner,
    repo,
    prNumber
  )

  // Get all comments on the pull request
  const { data: comments } = await octokit.rest.pulls.listReviewComments({
    owner,
    repo,
    pull_number: prNumber
  })
  console.log(`\nFound ${comments.length} total comments`)
  console.log(`Found ${foundTodos.length} TODOs in diff`)
  console.log('Resolved comment IDs:', Array.from(resolvedCommentIds))

  // Map comments by filename and line for easier lookup
  const commentMap = new Map<string, (typeof comments)[0]>()
  let outdatedCount = 0

  for (const comment of comments) {
    if (comment.user?.login === botName) {
      // If line is null or undefined, the comment is outdated - would be deleted
      if (comment.line === null || comment.line === undefined) {
        console.log(`Comment ${comment.id}: outdated`)
        outdatedCount++
        continue
      }

      const key = `${comment.path}:${comment.line}`
      commentMap.set(key, comment)
    }
  }

  let todoCount = 0
  let doneCount = 0
  let resolvedCount = 0
  let checkedCount = 0
  let openCount = 0

  // Process each TODO found in the diff
  for (const todo of foundTodos) {
    const key = `${todo.filename}:${todo.line}`

    // Skip removed TODOs - they don't count towards status
    if (!todo.isAdded) {
      console.log(`TODO at ${key}: removed`)
      continue
    }

    todoCount++
    const comment = commentMap.get(key)

    if (!comment) {
      console.log(`TODO at ${key}: no comment`)
      openCount++
      continue
    }

    // Check if resolved
    if (resolvedCommentIds.has(comment.id)) {
      console.log(`TODO at ${key}: resolved`)
      resolvedCount++
      doneCount++
      continue
    }

    // Check for checkbox (legacy mode)
    const hasCheckedBox = comment.body?.match(/- \[x\]/gi)
    const hasUncheckedBox = comment.body?.match(/- \[ \]/gi)

    if (hasCheckedBox != null) {
      console.log(`TODO at ${key}: checked`)
      checkedCount++
      doneCount++
    } else if (hasUncheckedBox != null) {
      console.log(`TODO at ${key}: unchecked`)
      openCount++
    } else {
      console.log(`TODO at ${key}: open`)
      openCount++
    }
  }

  console.log('\n--- Summary ---')
  console.log(
    `Found ${foundTodos.length} TODOs (${foundTodos.filter(t => t.isAdded).length} new, ${foundTodos.filter(t => !t.isAdded).length} removed)`
  )
  console.log(`Outdated comments: ${outdatedCount}`)
  console.log(`Resolved: ${resolvedCount}`)
  console.log(`Checked (legacy): ${checkedCount}`)
  console.log(`Open: ${openCount}`)
  console.log(`Done: ${doneCount}`)
  console.log(`Total: ${todoCount}`)
  console.log(
    `Status: ${doneCount === todoCount ? 'SUCCESS ✓' : 'FAILURE ✗'} (${doneCount}/${todoCount})`
  )
}
