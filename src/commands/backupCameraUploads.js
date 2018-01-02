import fs from 'fs'
import path from 'path'

import shell from 'shelljs'
import _ from 'lodash'
import untildify from 'untildify'
import caporal from 'caporal'
import isDirectory from 'is-directory'
import dedent from 'dedent-js'
import chalk from 'chalk'
import inquirer from 'inquirer'
import mime from 'mime'
import moment from 'moment'

import loadConfig from '../loadConfig'
import { pathIsWriteable } from '../utils'

caporal
  .command(
    'backup camera-uploads',
    'Moves "Camera Uploads" photos and vidoes from Dropbox to multiple destinations. Organizes them into month-based subfolders'
  )
  .action(handleAction)

async function handleAction(args, options, logger) {
  const config = configWithNormalizedPaths(loadConfig().backup['camera-uploads'])
  validateConfig(config)

  if ((await confirmIntent({ ...config, logger })) === false) {
    return
  }

  // Map of { folderName: [filePath] }
  const { destinations } = config
  const sourceFiles = _.flatMap(config.sources, findAllowedSourceFiles)
  const failedAttempts = _.flatMap(sourceFiles, sourceFile => copyAndDeleteSourceFile({ sourceFile, destinations, logger }))

  if (failedAttempts.length > 0) {
    const message = failedAttempts.reduce((prev, attempt) => {
      const line = dedent`

        - source:      ${attempt.source}
          destination: ${attempt.destination}
          reason:      ${attempt.reason}
      `
      return prev + line
    }, '')
    logger.error('Done but failed to copy these files: \n', message)
  } else {
    logger.info(`Done! Copied ${sourceFiles.length} files`)
  }
}

/**
 * @returns Array of failed copy attempts. Contains objects in the format { source: <path>, destination: <path>, reason: <string> }
 */
function copyAndDeleteSourceFile({ sourceFile, destinations, logger }) {
  const fileName = path.basename(sourceFile)
  const subFolderName = subFolderNameForSourceFile(sourceFile)
  const failedAttempts = destinations
    .map(destinationBasePath => {
      const destinationFolderPath = path.join(destinationBasePath, subFolderName)
      shell.mkdir('-p', destinationFolderPath)

      const destinationFilePath = path.join(destinationFolderPath, fileName)
      if (fs.existsSync(destinationFilePath)) {
        return { source: sourceFile, destination: destinationFilePath, reason: 'Destination file exists' }
      }

      logger.info(`Copy: ${sourceFile} to ${destinationFilePath}`)
      shell.cp(sourceFile, destinationFilePath)
      return null
    })
    .filter(Boolean)

  if (failedAttempts.length === 0) {
    shell.rm(sourceFile)
  }

  return failedAttempts
}

function subFolderNameForSourceFile(sourceFile) {
  const stats = fs.statSync(sourceFile)
  return moment(stats.ctime).format('YYYY-MM')
}

/**
 * Return a list of `sourcePath` children that will be copied over
 * @param {string} sourcePath
 */
function findAllowedSourceFiles(sourcePath) {
  return fs
    .readdirSync(sourcePath)
    .map(child => path.join(sourcePath, child))
    .filter(child => {
      const type = mime.getType(child)
      return type && (type.startsWith('video/') || type.startsWith('image/'))
    })
}

function confirmIntent({ sources, destinations, logger }) {
  const sourceList = sources.reduce((prev, source) => `${prev}\n- ${source}`, '')
  const destinationList = destinations.reduce((prev, destination) => `${prev}\n- ${destination}`, '')
  const message = dedent`
    \n\nThis command will copy the top-level image and video files from these folders:
    ${sourceList}

    to these folders:
    ${destinationList}

    ${chalk.bold('Important')}:

    - The source image and video files will be ${chalk.red('deleted')} when everything is done
    - If a file already exists in the destination, it will be skipped. It will not be deleted on completion
    - You might want to make sure to review the source files first

  `
  logger.info(message)

  const questions = [{ type: 'confirm', name: 'confirm', message: 'Do you want to continue?' }]
  return inquirer.prompt(questions).then(answers => answers.confirm)
}

function configWithNormalizedPaths(config) {
  return { ...config, sources: config.sources.map(untildify), destinations: config.destinations.map(untildify) }
}

function validateConfig({ sources, destinations }) {
  if (sources.length === 0 || destinations.length === 0) {
    throw new Error('The source and destination paths must be defined')
  }

  const invalidSource = sources.find(source => !isDirectory.sync(source))
  if (invalidSource) {
    throw new Error(`The source path ${invalidSource} is not accessible.`)
  }

  const invalidDestination = destinations.find(destination => !isDirectory.sync(destination) || !pathIsWriteable(destination))
  if (invalidDestination) {
    throw new Error(`The destination path ${invalidDestination} is not accessible or writeable.`)
  }
}
