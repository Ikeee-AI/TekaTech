const KEY = 'tekatech:plainLanguage'

export function getPlainLanguagePref() {
  try {
    return localStorage.getItem(KEY) === 'true'
  } catch {
    return false
  }
}

export function setPlainLanguagePref(value) {
  try {
    localStorage.setItem(KEY, String(value))
  } catch {
    // ignore — private browsing / storage disabled, preference just won't persist
  }
}