import { findTodos } from '../src/main' // replace with the actual path to the function
import { TodoItem, PrDiff } from '../src/types'

const __diff = `@@ -22,6 +22,14 @@ any text';
+ any text before   //       TODO - upper case with much space
+ // todo - lower case with space
+ //todo - lower case no space
+
+ /*
+  * todo - In comment block
+ #  todo - comment with hashtag
- #  todo - removed comment with hashtag
- removed non todo line
+ added non todo line`

describe('extractTodos', () => {
  it('should correctly extract todos', () => {
    const __prDiff = [
      {
        sha: 'sha',
        filename: 'filename.js',
        status: 'modified',
        additions: 8,
        deletions: 2,
        changes: 0,
        blob_url: 'blob_url',
        raw_url: 'raw_url',
        contents_url: 'contents_url',
        patch: __diff,
        previous_filename: undefined
      }
    ] as PrDiff

    const fileTodos = findTodos(__prDiff)

    const expectedTodos: TodoItem[] = [
      {
        filename: 'filename.js',
        line: 22,
        content: 'TODO - upper case with much space',
        isNew: true
      },
      {
        filename: 'filename.js',
        line: 23,
        content: 'todo - lower case with space',
        isNew: true
      },
      {
        filename: 'filename.js',
        line: 24,
        content: 'todo - lower case no space',
        isNew: true
      },
      {
        filename: 'filename.js',
        line: 27,
        content: 'todo - In comment block',
        isNew: true
      },
      {
        filename: 'filename.js',
        line: 28,
        content: 'todo - comment with hashtag',
        isNew: true
      },
      {
        filename: 'filename.js',
        line: 29,
        content: 'todo - removed comment with hashtag',
        isNew: false
      }
    ]
    expect(fileTodos).toEqual(expectedTodos)
  })

  it('should correctly exclude files', () => {
    const __prDiff = [
      {
        sha: 'sha',
        filename: 'filename.js',
        status: 'modified',
        additions: 1,
        deletions: 0,
        changes: 0,
        blob_url: 'blob_url',
        raw_url: 'raw_url',
        contents_url: 'contents_url',
        patch: `@@ -22,6 +22,14 @@ any text';
          + // TODO - in filename js`,
        previous_filename: undefined
      },
      {
        sha: 'sha',
        filename: 'filename.yml',
        status: 'modified',
        additions: 1,
        deletions: 0,
        changes: 0,
        blob_url: 'blob_url',
        raw_url: 'raw_url',
        contents_url: 'contents_url',
        patch: `@@ -22,6 +22,14 @@ any text';
            + // TODO - in filename yml`,
        previous_filename: undefined
      },
      {
        sha: 'sha',
        filename: 'excluded/filename.js',
        status: 'modified',
        additions: 1,
        deletions: 0,
        changes: 0,
        blob_url: 'blob_url',
        raw_url: 'raw_url',
        contents_url: 'contents_url',
        patch: `@@ -22,6 +22,14 @@ any text';
              + // TODO - in excluded directory`,
        previous_filename: undefined
      },
      {
        sha: 'sha',
        filename: 'included/other.txt',
        status: 'modified',
        additions: 1,
        deletions: 0,
        changes: 0,
        blob_url: 'blob_url',
        raw_url: 'raw_url',
        contents_url: 'contents_url',
        patch: `@@ -22,6 +22,14 @@ any text';
                + // TODO - in included directory`,
        previous_filename: undefined
      }
    ] as PrDiff

    const exclude = ['**/*.yml', '**/excluded/*']

    const fileTodos = findTodos(__prDiff, exclude)

    const expectedTodos: TodoItem[] = [
      {
        filename: 'filename.js',
        line: 22,
        content: 'TODO - in filename js',
        isNew: true
      },
      {
        filename: 'included/other.txt',
        line: 22,
        content: 'TODO - in included directory',
        isNew: true
      }
    ]
    expect(fileTodos).toEqual(expectedTodos)
  })
})
