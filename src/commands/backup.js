import yaml from 'js-yaml'
import fs from 'fs'
import os from 'os'
import path from 'path'
import shell from 'shelljs'
import moment from 'moment'
import untildify from 'untildify'
import prog from 'caporal'

prog.command('backup', 'Backup folders defined in .chi.config.yml').action(handleAction)

function handleAction(args, options, logger) {
  const targetBasePath = `${os.homedir()}/Desktop`
  const config = yaml.safeLoad(fs.readFileSync(`${os.homedir()}/.chi.config.yaml`, 'utf8'))
  config.backup.paths.forEach(pathDef => {
    let folderPath = null
    let zipFileName = null
    if (typeof pathDef === 'string') {
      folderPath = pathDef
      zipFileName = path.basename(folderPath)
    } else {
      folderPath = pathDef.path
      zipFileName = pathDef.name
    }

    folderPath = untildify(folderPath)

    logger.info(`Processing: ${folderPath}`)

    // Execute git fetch if the directory is a git dir
    shell.cd(folderPath)
    if (shell.test('-d', '.git')) {
      logger.info('Executing: git fetch')
      shell.exec('git fetch')
    }

    const parentPath = path.dirname(folderPath)
    const zipFilePath = `${targetBasePath}/${zipFileName}-${moment().format('YYYY-MM-DD-H-mm-ss')}.tar.gz`
    logger.info(`Compressing to ${zipFilePath}`)
    shell.exec(`tar -zcf "${zipFilePath}" -C "${parentPath}" "${path.basename(folderPath)}"`)
  })
}
