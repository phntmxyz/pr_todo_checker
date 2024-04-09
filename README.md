# GitHub TODO Finder Action

![GitHub Marketplace](https://img.shields.io/badge/Marketplace-TODO%20Finder%20Action-blue?logo=github)

[![GitHub Super-Linter](https://github.com/phntmxyz/todo-finder-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/phntmxyz/todo-finder-action/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/phntmxyz/todo-finder-action/actions/workflows/check-dist.yml/badge.svg)](https://github.com/phntmxyz/todo-finder-action/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/phntmxyz/todo-finder-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/phntmxyz/todo-finder-action/actions/workflows/codeql-analysis.yml)

This GitHub Action scans your code for TODO comments and generates a report.
It's a great way to keep track of tasks that need to be done in your codebase.

![todos](https://github.com/phntmxyz/todo-finder-action/assets/16827156/d6220a06-72af-41a4-9f21-b51c75d75829)
![status](https://github.com/phntmxyz/todo-finder-action/assets/16827156/fd4cd9a1-becb-41f0-ac9b-3ade71119ed7)

## Usage

To use this action in your workflow, add the following step:

```yaml
name: Check TODOs

on:
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

This will scan the code in the repository and generate a report of all TODO
comments found.

## Configuration

You can configure the action further by providing inputs:

```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v4

  - name: Comment PR
    uses: phntmxyz/todo-finder-action@v1
    with:
      token: ${{ secrets.GITHUB_TOKEN }}
      base: main # PR base by default but you can use any git reference
      head: pr-head # PR head by default but you can use any git reference
```

## Output

The action outputs a comment with the list of new and removed TODOs in the pull
request where the action was run. You can access this output in subsequent steps
like so:

```yaml
steps:
  - name: Checkout
    id: checkout
    uses: actions/checkout@v4

  - name: Test Local Action
    id: test-action
    uses: ./
    with:
      token: ${{ secrets.GITHUB_TOKEN }}
      base: e9e9b061034f705ecaaabf5ec30ad36f828603c2
      head: main
      use-output: true

  - name: Print Added TODOs
    id: output-new
    run: echo "${{ steps.test-action.outputs.added-todos }}"

  - name: Print Removed TODOs
    id: output-old
    run: echo "${{ steps.test-action.outputs.removed-todos }}"
```
