export type PrDiff = {
  sha: string
  filename: string
  status:
    | 'added'
    | 'removed'
    | 'modified'
    | 'renamed'
    | 'copied'
    | 'changed'
    | 'unchanged'
  additions: number
  deletions: number
  changes: number
  blob_url: string
  raw_url: string
  contents_url: string
  patch?: string | undefined
  previous_filename?: string | undefined
}[]

export type Todo = {
  filename: string
  line: number
  content: string
  isAdded: boolean
}
