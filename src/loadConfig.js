import fs from 'fs'

import yaml from 'js-yaml'

export default function loadConfig() {
  return yaml.safeLoad(fs.readFileSync(`${__dirname}/../.chi.config.yaml`, 'utf8'))
}
