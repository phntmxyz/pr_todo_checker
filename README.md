# GitHub TODO Finder Action

![GitHub Marketplace](https://img.shields.io/badge/Marketplace-TODO%20Finder%20Action-blue?logo=github)

[![GitHub Super-Linter](https://github.com/phntmxyz/todo-finder-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/phntmxyz/todo-finder-action/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/phntmxyz/todo-finder-action/actions/workflows/check-dist.yml/badge.svg)](https://github.com/phntmxyz/todo-finder-action/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/phntmxyz/todo-finder-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/phntmxyz/todo-finder-action/actions/workflows/codeql-analysis.yml)

This GitHub Action scans your code for Todos, adds review comments, and creates a commit status based on the discovered Todos. 
It offers an effective means to stay organized and track tasks that require attention within your codebase.

![first_todo](https://github.com/phntmxyz/todo-finder-action/assets/16827156/282fd59b-7be2-4210-ad47-845c910420c7)
![commit_status](https://github.com/phntmxyz/todo-finder-action/assets/16827156/dcdf289d-3cd8-4d36-8a40-3520bbfe4122)

## Usage

To use this action in your workflow, add the following step:

```yaml
name: Check TODOs

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

      - name: Comment PR
        uses: phntmxyz/todo-finder-action@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
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
  comment. Use `{todo}` to insert the Todo content

```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v4

  - name: Comment PR
    uses: phntmxyz/todo-finder-action@v1
    with:
      token: ${{ secrets.GITHUB_TOKEN }}
      exclude: |
        *.md
        **/config/*.yml
      comment_on_todo: true
      comment_body: |
        'A new Todo was discovered. If it is not a priority right now, consider marking it for later attention.\n{todo}\n'
      comment_checkbox: 'Ignore'
```
