import { run } from './main'

run().catch(error => {
  console.error(error)
  process.exit(1)
})
