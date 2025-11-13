import { generateComment } from '../src/comment'

describe('setting comment body and checkbox', () => {
  it('should be used correctly with ignore checkbox enabled', () => {
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
      todo,
      true
    )

    const expectedComment = [
      'A new Todo was discovered. If it is not a priority right now, consider marking it for later attention.',
      'TODO - in included directory',
      '',
      '- [ ] Ignore'
    ].join('\n')

    expect(comment).toEqual(expectedComment)
  })

  it('should not include checkbox when ignore checkbox is disabled', () => {
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
      todo,
      false
    )

    const expectedComment = [
      'A new Todo was discovered. If it is not a priority right now, consider marking it for later attention.',
      'TODO - in included directory',
      ''
    ].join('\n')

    expect(comment).toEqual(expectedComment)
  })

  it('should use default value (false) when enableIgnoreCheckbox is not provided', () => {
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
      ''
    ].join('\n')

    expect(comment).toEqual(expectedComment)
  })
})
