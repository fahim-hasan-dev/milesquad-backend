import colors from 'colors'
import mongoose from 'mongoose'
import dns from 'node:dns'
import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import app from './app'
import config from './config'
import { errorLogger, logger } from './shared/logger'
import { socketHelper } from './helpers/socketHelper'
import { setIO } from './helpers/socketManager'
import { redisClient } from './helpers/redis'
import { seedAdmin } from './app/DB'
import { initWorkers } from './workers'
import 'dotenv/config'

dns.setServers(['8.8.8.8', '8.8.4.4'])

process.on('uncaughtException', error => {
    errorLogger.error('UnhandledException Detected', error)
    process.exit(1)
})

export const onlineUsers = new Map()
let server: any

async function main() {
    try {
        await mongoose.connect(config.database_url as string)
        logger.info(colors.green('🚀 Database connected successfully'))

        await seedAdmin()

        const port = typeof config.port === 'number' ? config.port : Number(config.port)

        server = app.listen(port, config.ip_address as string, () => {
            logger.info(colors.yellow(`♻️  Application listening on port:${config.port}`))
        })

        const io = new Server(server, {
            pingTimeout: 60000,
            cors: {
                origin: '*',
            },
        })

        const pubClient = redisClient.duplicate()
        const subClient = redisClient.duplicate()
        io.adapter(createAdapter(pubClient, subClient))

        setIO(io)
        socketHelper.socket(io)
        initWorkers()

        //@ts-ignore
        global.io = io

        logger.info(colors.green('🍁 Server connected successfully'))
    } catch (error) {
        errorLogger.error(colors.red('Server Failed to connect Database'))
        config.node_env === 'development' && console.log(error)
    }

    process.on('unhandledRejection', error => {
        if (server) {
            server.close(() => {
                errorLogger.error('UnhandledRejection Detected', error)
                process.exit(1)
            })
        } else {
            process.exit(1)
        }
    })
}

main()

process.on('SIGTERM', async () => {
    logger.info('SIGTERM IS RECEIVE')
    if (server) {
        server.close()
    }
})
