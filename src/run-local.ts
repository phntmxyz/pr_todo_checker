import { getTodosForDiff } from './main'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const argv = yargs(hideBin(process.argv))
  .option('pat', {
    type: 'string',
    demandOption: false,
    describe: 'Personal Access Token',
    default: process.env.GITHUB_TOKEN || ''
  })
  .option('repo', {
    type: 'string',
    demandOption: true,
    describe: 'Repository name'
  })
  .option('owner', {
    type: 'string',
    demandOption: true,
    describe: 'Repository owner'
  })
  .option('base', {
    type: 'string',
    demandOption: true,
    describe: 'Base branch'
  })
  .option('head', {
    type: 'string',
    demandOption: true,
    describe: 'Head branch'
  })
  .option('pr', {
    type: 'number',
    demandOption: false,
    describe: 'Pull Request number (optional, to test review thread logic)'
  })
  .parseSync()

getTodosForDiff(argv.pat, argv.owner, argv.repo, argv.base, argv.head, argv.pr)
