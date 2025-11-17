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
    demandOption: false,
    describe: 'Base branch (optional if pr is provided)'
  })
  .option('head', {
    type: 'string',
    demandOption: false,
    describe: 'Head branch (optional if pr is provided)'
  })
  .option('pr', {
    type: 'number',
    demandOption: false,
    describe:
      'Pull Request number (will fetch base/head from PR if not provided)'
  })
  .check(argv => {
    if (!argv.pr && (!argv.base || !argv.head)) {
      throw new Error(
        'Either --pr must be provided, or both --base and --head must be provided'
      )
    }
    return true
  })
  .parseSync()

getTodosForDiff(argv.pat, argv.owner, argv.repo, argv.base, argv.head, argv.pr)
