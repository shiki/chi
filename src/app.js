import winston from 'winston'
import prog from 'caporal'
import shell from 'shelljs'

shell.config.fatal = true
shell.config.verbose = false

// https://github.com/winstonjs/winston/tree/2.4.0#using-winston-in-a-cli-tool
const consoleLogger = new winston.Logger({
  transports: [new winston.transports.Console()]
})
consoleLogger.cli()

prog.logger(consoleLogger).version('0.0.1')

require('./commands/backup')

prog.parse(process.argv)
