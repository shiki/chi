import program from 'commander'
import yaml from 'js-yaml'
import fs from 'fs'
import os from 'os'
import path from 'path'
import shell from 'shelljs'
import moment from 'moment'
import untildify from 'untildify'

program.command('backup').description('Backup folders defined in .chi.config.yml').action(env => {
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

    console.log(`Processing: ${folderPath}`)

    // Execute git fetch if the directory is a git dir
    shell.cd(folderPath)
    if (shell.test('-d', '.git')) {
      console.log('Executing: git fetch')
      shell.exec('git fetch')
    }

    const parentPath = path.dirname(folderPath)
    const zipFilePath = `${targetBasePath}/${zipFileName}-${moment().format('YYYY-MM-DD-H-mm-ss')}.tar.gz`
    console.log(`Compressing to ${zipFilePath}`)
    shell.exec(`tar -zcf "${zipFilePath}" -C "${parentPath}" "${path.basename(folderPath)}"`)
  })
})

program.parse(process.argv)
