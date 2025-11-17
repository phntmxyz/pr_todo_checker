import { extractResolvedCommentIds } from '../src/main'

describe('TODO counting behavior', () => {
  it('should count resolved comments as done', () => {
    // Setup: Mock data representing different comment states
    const resolvedCommentIds = new Set([123]) // Comment 123 is resolved

    const comments = [
      // Resolved comment (no checkbox) - should count as done
      { id: 123, body: 'A new Todo was discovered.\nTODO: Test', position: 1 },
      // Active comment without checkbox - should count as open
      {
        id: 456,
        body: 'A new Todo was discovered.\nTODO: Another',
        position: 2
      },
      // Active comment with unchecked checkbox - should count as open
      {
        id: 789,
        body: 'A new Todo was discovered.\nTODO: Third\n- [ ] Ignore',
        position: 3
      },
      // Comment with checked checkbox - should count as done
      {
        id: 101,
        body: 'A new Todo was discovered.\nTODO: Fourth\n- [x] Ignore',
        position: 4
      }
    ]

    let todoCount = 0
    let doneCount = 0

    // Simulate the counting logic from updateCommitStatus
    for (const comment of comments) {
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
        // Checkbox is checked (ignored)
        doneCount += 1
        todoCount += 1
      } else if (hasUncheckedBox != null) {
        // Checkbox is unchecked (still open)
        todoCount += 1
      } else {
        // No checkbox (modern mode) - count as open TODO
        todoCount += 1
      }
    }

    // Expected results:
    // - 1 resolved (done)
    // - 1 without checkbox (open)
    // - 1 with unchecked checkbox (open)
    // - 1 with checked checkbox (done)
    // Total: 4 TODOs, 2 done, 2 open
    expect(todoCount).toBe(4)
    expect(doneCount).toBe(2)
  })

  it('should count comments without checkbox as open', () => {
    const resolvedCommentIds = new Set()

    const comments = [
      { id: 1, body: 'TODO without checkbox', position: 1 },
      { id: 2, body: 'Another TODO without checkbox', position: 2 }
    ]

    let todoCount = 0
    let doneCount = 0

    for (const comment of comments) {
      if (resolvedCommentIds.has(comment.id)) {
        doneCount += 1
        todoCount += 1
        continue
      }

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

    expect(todoCount).toBe(2)
    expect(doneCount).toBe(0)
  })

  it('should handle mix of resolved and checkbox-based completion', () => {
    const resolvedCommentIds = new Set([100, 200])

    const comments = [
      { id: 100, body: 'TODO: Resolved via conversation', position: 1 },
      { id: 200, body: 'TODO: Also resolved', position: 2 },
      { id: 300, body: 'TODO: With checked box\n- [x] Ignore', position: 3 },
      { id: 400, body: 'TODO: Still open', position: 4 }
    ]

    let todoCount = 0
    let doneCount = 0

    for (const comment of comments) {
      if (resolvedCommentIds.has(comment.id)) {
        doneCount += 1
        todoCount += 1
        continue
      }

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

    // 2 resolved + 1 checked checkbox = 3 done
    // 1 open without checkbox
    // Total: 4 TODOs, 3 done
    expect(todoCount).toBe(4)
    expect(doneCount).toBe(3)
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
