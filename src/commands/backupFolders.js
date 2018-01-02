import fs from 'fs'
import os from 'os'
import path from 'path'

import shell from 'shelljs'
import moment from 'moment'
import untildify from 'untildify'
import prog from 'caporal'
import isDirectory from 'is-directory'

import loadConfig from '../loadConfig'
import { pathIsWriteable } from '../utils'

prog
  .command('backup folders', 'Compresses folders and copies them to a single destination. Executes `git fetch` first if they are git projects')
  .action(handleAction)

async function handleAction(args, options, logger) {
  const config = loadConfig().backup.folders

  const destinationPath = untildify(config.destination)
  if (!isDirectory.sync(destinationPath) || !pathIsWriteable(destinationPath)) {
    throw new Error(`Destination path ${destinationPath} is not accessible. Make sure that it exists and is writeable.`)
  }

  const destinationSubFolderPath = createDestinationSubFolder(destinationPath)
  logger.info(`Destination subfolder: ${destinationSubFolderPath}`)

  config.source.forEach(sourceItem => {
    const { sourcePath, zipFileName } = sourceItemConfigToPathAndZipFileName(sourceItem)
    backup({ sourcePath, zipFileName, destinationPath: destinationSubFolderPath, logger })
  })

  logger.info('Done!')
}

function backup({ sourcePath, zipFileName, destinationPath, logger }) {
  logger.info(`Processing: ${sourcePath}`)

  // Execute git fetch if the directory is a git dir
  shell.cd(sourcePath)
  if (shell.test('-d', '.git')) {
    logger.info('Executing: git fetch')
    shell.exec('git fetch')
  }

  const sourceParentPath = path.dirname(sourcePath)

  const zipFileNameWithTimestamp = `${zipFileName}-${moment().format('YYYY-MM-DD-H-mm-ss')}.tar.gz`
  const tempZipFilePath = path.join(createTempFolderPath(), zipFileNameWithTimestamp)

  logger.info(`Compressing to ${tempZipFilePath}`)
  shell.exec(`tar -zcf "${tempZipFilePath}" -C "${sourceParentPath}" "${path.basename(sourcePath)}"`)

  const targetZipFilePath = path.join(destinationPath, zipFileNameWithTimestamp)

  logger.info(`Moving to ${targetZipFilePath}`)
  shell.mv(tempZipFilePath, targetZipFilePath)
}

function sourceItemConfigToPathAndZipFileName(sourceItem) {
  let sourcePath = null
  let zipFileName = null
  if (typeof sourceItem === 'string') {
    sourcePath = untildify(sourceItem)
    zipFileName = path.basename(sourcePath)
  } else {
    sourcePath = untildify(sourceItem.path)
    zipFileName = sourceItem.name
  }

  return { sourcePath, zipFileName }
}

function createDestinationSubFolder(destinationPath) {
  const subFolderPath = path.join(destinationPath, moment().format('YYYY-MM-DD'))
  if (!fs.existsSync(subFolderPath)) {
    shell.mkdir(subFolderPath)
  }

  return subFolderPath
}

function createTempFolderPath() {
  const folderPath = path.join(os.tmpdir(), 'chi-backups')
  shell.mkdir('-p', folderPath)
  return folderPath
}
