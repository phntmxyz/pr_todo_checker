import { generateComment } from '../src/comment'

describe('setting comment body and checkbox', () => {
  it('should be used correctly', () => {
    const commentBodyTemplate =
      'A new Todo was discovered. If it is not a priority right now, consider marking it for later attention.\n{todo}\n'
    const commentCheckboxTemplate = 'Ignore'

    const todo = {
      filename: 'included/other.txt',
      line: 22,
      content: 'TODO - in included directory',
      isAdded: true
    }

    const comment = generateComment(
      commentBodyTemplate,
      commentCheckboxTemplate,
      todo
    )

    const expectedComment = [
      'A new Todo was discovered. If it is not a priority right now, consider marking it for later attention.',
      'TODO - in included directory',
      '',
      '- [ ] Ignore'
    ].join('\n')

    expect(comment).toEqual(expectedComment)
  })
})
