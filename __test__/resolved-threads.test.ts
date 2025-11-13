import { extractResolvedCommentIds } from '../src/main'

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
