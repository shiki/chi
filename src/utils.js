import fs from 'fs'

export function pathIsWriteable(path) {
  try {
    fs.accessSync(path, fs.constants.W_OK)
    return true
  } catch (e) {
    if (e.code === 'ENOENT') {
      return false
    }

    throw e
  }
}

export default { pathIsWriteable }
