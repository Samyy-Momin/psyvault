export function createUserError(message) {
  const error = new Error(message)
  error.isUserSafe = true
  return error
}

export function getErrorMessage(error, fallbackMessage) {
  if (error?.isUserSafe && error.message) {
    return error.message
  }

  return fallbackMessage
}

export function mapAuthError(error) {
  switch (error?.code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-email':
      return createUserError('Invalid credentials')
    case 'auth/too-many-requests':
      return createUserError('Too many attempts. Please try again later.')
    case 'auth/network-request-failed':
      return createUserError('Something went wrong')
    default:
      return createUserError('Something went wrong')
  }
}
