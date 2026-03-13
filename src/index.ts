import { run } from './main'

// eslint-disable-next-line github/no-then
run().catch(error => {
  console.error(error)
  process.exit(1)
})
