# GitHub PR Todo Checker Action

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-PR%20Todo%20Checker-blue?logo=github)](https://github.com/marketplace/actions/pr-todo-checker)

![CI](https://github.com/phntmxyz/pr_todo_checker/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/phntmxyz/pr_todo_checker/actions/workflows/check-dist.yml/badge.svg)](https://github.com/phntmxyz/pr_todo_checker/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/phntmxyz/pr_todo_checker/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/phntmxyz/pr_todo_checker/actions/workflows/codeql-analysis.yml)

This GitHub Action scans your code for Todos, adds review comments, and creates
a commit status based on the discovered Todos. It offers an effective means to
stay organized and track tasks that require attention within your codebase.

![first_todo](https://github.com/phntmxyz/pr_todo_checker/assets/16827156/282fd59b-7be2-4210-ad47-845c910420c7)
![commit_status](https://github.com/phntmxyz/pr_todo_checker/assets/16827156/dcdf289d-3cd8-4d36-8a40-3520bbfe4122)

## Usage

To use this action in your workflow, add the following step. By default, the
action will search for `//`, `*` and `#` followed by `TODO` or `FIXME`.

```yaml
name: PR Todo Checker

on:
  pull_request_review_comment:
    types: [edited, deleted]
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  find_todos:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Check for Todos
        uses: phntmxyz/pr_todo_checker@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
```

Example of matching Todos:

```js
//       TODO - upper case with much space
// todo - lower case with space
//todo - lower case no space

/ no comment
// also todo comment
// fixme found todo
/*
 * todo - In comment block
 */
```

```bash
# TODO with hashtag comment
# FIXME with hashtag comment
```

## Configuration

You can configure the action further by providing inputs:

- `token`: The GitHub token to use for commenting on the PR. This is required.
- `exclude`: (**optional**) A list of glob patterns to exclude from the search.
- `comment_on_todo`: (**optional**) Whether to comment on the PR with the TODOs
  found. Default is `true`.
- `comment_body`: (**optional**) The body of the comment to post on the PR. Use
  `{todo}` to insert the Todo content.
- `comment_checkbox`: (**optional**) The text to use for the checkbox in the
  comment. Use `{todo}` to insert the Todo content. Only used when
  `enable_ignore_checkbox` is `true`.
- `enable_ignore_checkbox`: (**optional**) Enable the ignore checkbox in TODO
  comments. When disabled (default), users should use GitHub's native "Resolve
  conversation" feature instead. Default is `false`.
- `custom_todo_matcher`: (**optional**) Add custom comment indicators to match
  TODOs. Default matches `//`, `*` and `#` followed by `TODO` or `FIXME`.
- `custom_ignore_matcher`: (**optional**) Add custom regex to ignore TODOs that
  match in the same line. Example: Setting
  `custom_ignore_matcher: "/.*ignore.*/"` will ignore TODOs like
  `// TODO ignore`.

```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v4

  - name: Check for Todos
    uses: phntmxyz/pr_todo_checker@v1
    with:
      token: ${{ secrets.GITHUB_TOKEN }}
      exclude: |
        *.md
        **/config/*.yml
      comment_on_todo: true
      comment_body: |
        "A new Todo was discovered. If it is not a priority right now,\
        consider marking it for later attention.\n{todo}\n"
      enable_ignore_checkbox: false # Use GitHub's native "Resolve conversation" (recommended)
      custom_todo_matcher: "{'js': ['//', '/*'], 'py': ['#']}"
```

### Managing TODOs

The action supports two ways to mark TODOs as resolved:

1. **GitHub's Native "Resolve conversation" (Recommended)**: Simply mark the
   review comment thread as resolved. The action will automatically detect this
   via the GraphQL API and exclude resolved TODOs from the count.

2. **Legacy Ignore Checkbox**: Enable `enable_ignore_checkbox: true` to add an
   "Ignore" checkbox to each TODO comment. This is useful for teams where not
   all members have permissions to resolve conversations.

```yaml
# Example with ignore checkbox enabled
- name: Check for Todos
  uses: phntmxyz/pr_todo_checker@v1
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    enable_ignore_checkbox: true
    comment_checkbox: 'Ignore'
```
