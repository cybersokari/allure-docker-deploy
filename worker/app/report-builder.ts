import {REPORTS_DIR, STAGING_PATH} from "../index";

const allure = require('allure-commandline')
import * as path from "node:path";
import * as fs from 'fs/promises'
import counter from "./counter";
import pLimit from 'p-limit';
import {publishToFireBaseHosting} from "./util";


class ReportBuilder {
    private timeOut: NodeJS.Timeout | undefined
    private readonly ttl: number

    constructor() {
        this.ttl = Number.parseInt(process.env.TTL_SECS ?? '45')
    }

    public setTtl() {
        clearTimeout(this.timeOut)
        this.timeOut = setTimeout(async () => {
            await this.generate()
            await publishToFireBaseHosting()
        }, this.ttl * 1000)
    }

    public async generate() {
        // History files can exist in reports directory in WATCH_MODE
        // due to multiple call to generate, so we try to move
        // the files to /allure-results/history to include the history in the
        // upcoming report due to `allure generate --clean` command
        if (process.env.WATCH_MODE === 'true') {
            const destination = `${STAGING_PATH}/history`
            const source = `${REPORTS_DIR}/history`
            try {
                await fs.rm(destination, {recursive: true, force: true})
                await fs.mkdir(destination, {recursive: true})
                await fs.cp(source, destination, {
                    preserveTimestamps: true,
                    recursive: true,
                    force: true,
                    errorOnExist: false
                })
            } catch (e) {
                console.log(`No history files to move`)
            }
        }
        // Generate new Allure report
        const generation = allure([
            'generate',
            STAGING_PATH,
            '--report-dir',
            REPORTS_DIR,
            '--clean',
        ])

        await new Promise((resolve, reject) => {
            generation.on('exit', async function (exitCode: number) {
                if (exitCode === 0) {
                    resolve('success')
                } else {
                    console.warn('Failed to generate Allure report')
                    reject('Failed to generate Allure report')
                }
            })
        })
    }

    // Move from '/allure-results' mount to staging
    public async stageFiles(files: AsyncGenerator<string> | string[], concurrency = 5) {
        const limit = pLimit(concurrency);
        const tasks = [];
        for await (const file of files) {
            tasks.push(
                limit(async () => {
                    try {
                        const destinationFilePath = path.join(STAGING_PATH, path.basename(file));
                        await fs.mkdir(path.dirname(destinationFilePath), {recursive: true});// recursive, don't throw
                        await fs.copyFile(file, destinationFilePath);
                        await counter.incrementFilesProcessed()
                    } catch (e) {
                        console.warn(`Failed to move ${path.basename(file)} to staging area: ${e}`)
                    }
                })
            )
        }
        await Promise.all(tasks)
        return this
    }

}

export default new ReportBuilder()