import { extractResolvedCommentIds } from '../src/main'

// Helper function to simulate the counting logic from updateCommitStatus
function countTodos(
  comments: { id: number; line: number | null; body: string }[],
  resolvedCommentIds: Set<number>
): { todoCount: number; doneCount: number; outdatedCount: number } {
  let todoCount = 0
  let doneCount = 0
  let outdatedCount = 0

  for (const comment of comments) {
    // If line is null or undefined, the comment is outdated
    if (comment.line === null || comment.line === undefined) {
      outdatedCount++
      continue
    }

    // Check if resolved - count as done
    if (resolvedCommentIds.has(comment.id)) {
      doneCount += 1
      todoCount += 1
      continue
    }

    // Check if the comment contains a checkbox (legacy mode)
    const hasCheckedBox = comment.body?.match(/- \[x\]/gi)
    const hasUncheckedBox = comment.body?.match(/- \[ \]/gi)

    if (hasCheckedBox != null) {
      doneCount += 1
      todoCount += 1
    } else if (hasUncheckedBox != null) {
      todoCount += 1
    } else {
      todoCount += 1
    }
  }

  return { todoCount, doneCount, outdatedCount }
}

describe('TODO counting behavior', () => {
  it('should skip outdated comments (line is null)', () => {
    const comments = [
      { id: 111, line: null, body: 'TODO: Outdated' },
      { id: 222, line: 42, body: 'TODO: Active' }
    ]

    const result = countTodos(comments, new Set())

    expect(result.outdatedCount).toBe(1)
    expect(result.todoCount).toBe(1)
    expect(result.doneCount).toBe(0)
  })

  it('should count resolved comments as done', () => {
    const comments = [
      { id: 123, line: 10, body: 'TODO: Test' }, // Resolved
      { id: 456, line: 20, body: 'TODO: Another' }, // Open
      { id: 789, line: 30, body: 'TODO: Third\n- [ ] Ignore' }, // Open (unchecked)
      { id: 101, line: 40, body: 'TODO: Fourth\n- [x] Ignore' } // Done (checked)
    ]

    const result = countTodos(comments, new Set([123]))

    expect(result.todoCount).toBe(4)
    expect(result.doneCount).toBe(2) // 1 resolved + 1 checked
  })

  it('should count comments without checkbox as open', () => {
    const comments = [
      { id: 1, line: 10, body: 'TODO without checkbox' },
      { id: 2, line: 20, body: 'Another TODO without checkbox' }
    ]

    const result = countTodos(comments, new Set())

    expect(result.todoCount).toBe(2)
    expect(result.doneCount).toBe(0)
  })

  it('should handle mix of resolved and checkbox-based completion', () => {
    const comments = [
      { id: 100, line: 10, body: 'TODO: Resolved via conversation' },
      { id: 200, line: 20, body: 'TODO: Also resolved' },
      { id: 300, line: 30, body: 'TODO: With checked box\n- [x] Ignore' },
      { id: 400, line: 40, body: 'TODO: Still open' }
    ]

    const result = countTodos(comments, new Set([100, 200]))

    expect(result.todoCount).toBe(4)
    expect(result.doneCount).toBe(3) // 2 resolved + 1 checked
  })
})

describe('extractResolvedCommentIds', () => {
  it('should extract comment IDs from resolved threads', () => {
    const graphqlResult = {
      repository: {
        pullRequest: {
          reviewThreads: {
            nodes: [
              {
                id: 'thread1',
                isResolved: true,
                comments: {
                  nodes: [{ databaseId: 123 }, { databaseId: 456 }]
                }
              },
              {
                id: 'thread2',
                isResolved: false,
                comments: {
                  nodes: [{ databaseId: 789 }]
                }
              },
              {
                id: 'thread3',
                isResolved: true,
                comments: {
                  nodes: [{ databaseId: 101112 }]
                }
              }
            ]
          }
        }
      }
    }

    const resolvedIds = extractResolvedCommentIds(graphqlResult)

    expect(resolvedIds.size).toBe(3)
    expect(resolvedIds.has(123)).toBe(true)
    expect(resolvedIds.has(456)).toBe(true)
    expect(resolvedIds.has(101112)).toBe(true)
    expect(resolvedIds.has(789)).toBe(false)
  })

  it('should handle empty review threads', () => {
    const graphqlResult = {
      repository: {
        pullRequest: {
          reviewThreads: {
            nodes: []
          }
        }
      }
    }

    const resolvedIds = extractResolvedCommentIds(graphqlResult)

    expect(resolvedIds.size).toBe(0)
  })

  it('should handle missing data gracefully', () => {
    const graphqlResult = null

    const resolvedIds = extractResolvedCommentIds(graphqlResult)

    expect(resolvedIds.size).toBe(0)
  })

  it('should handle partially missing data', () => {
    const graphqlResult = {
      repository: {
        pullRequest: null
      }
    }

    const resolvedIds = extractResolvedCommentIds(graphqlResult)

    expect(resolvedIds.size).toBe(0)
  })

  it('should skip comments without databaseId', () => {
    const graphqlResult = {
      repository: {
        pullRequest: {
          reviewThreads: {
            nodes: [
              {
                id: 'thread1',
                isResolved: true,
                comments: {
                  nodes: [
                    { databaseId: 123 },
                    { databaseId: null },
                    { databaseId: 456 },
                    {}
                  ]
                }
              }
            ]
          }
        }
      }
    }

    const resolvedIds = extractResolvedCommentIds(graphqlResult)

    expect(resolvedIds.size).toBe(2)
    expect(resolvedIds.has(123)).toBe(true)
    expect(resolvedIds.has(456)).toBe(true)
  })

  it('should only extract IDs from resolved threads, not unresolved ones', () => {
    const graphqlResult = {
      repository: {
        pullRequest: {
          reviewThreads: {
            nodes: [
              {
                id: 'thread1',
                isResolved: false,
                comments: {
                  nodes: [{ databaseId: 111 }, { databaseId: 222 }]
                }
              },
              {
                id: 'thread2',
                isResolved: false,
                comments: {
                  nodes: [{ databaseId: 333 }]
                }
              }
            ]
          }
        }
      }
    }

    const resolvedIds = extractResolvedCommentIds(graphqlResult)

    expect(resolvedIds.size).toBe(0)
  })

  it('should handle multiple resolved threads with multiple comments each', () => {
    const graphqlResult = {
      repository: {
        pullRequest: {
          reviewThreads: {
            nodes: [
              {
                id: 'thread1',
                isResolved: true,
                comments: {
                  nodes: [
                    { databaseId: 1 },
                    { databaseId: 2 },
                    { databaseId: 3 }
                  ]
                }
              },
              {
                id: 'thread2',
                isResolved: true,
                comments: {
                  nodes: [{ databaseId: 4 }, { databaseId: 5 }]
                }
              },
              {
                id: 'thread3',
                isResolved: false,
                comments: {
                  nodes: [{ databaseId: 999 }]
                }
              }
            ]
          }
        }
      }
    }

    const resolvedIds = extractResolvedCommentIds(graphqlResult)

    expect(resolvedIds.size).toBe(5)
    expect(resolvedIds.has(1)).toBe(true)
    expect(resolvedIds.has(2)).toBe(true)
    expect(resolvedIds.has(3)).toBe(true)
    expect(resolvedIds.has(4)).toBe(true)
    expect(resolvedIds.has(5)).toBe(true)
    expect(resolvedIds.has(999)).toBe(false)
  })
})
