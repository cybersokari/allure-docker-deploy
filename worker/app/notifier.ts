import counter from "./counter";
import {cloudStorage, keepHistory, keepRetires, STORAGE_BUCKET, websiteId} from "../index";
import {WebClient} from '@slack/web-api';
import {StringBuilder} from "./string-builder";
import * as fs from "node:fs";
import ansiEscapes from "ansi-escapes";
import chalk from "chalk";
import credential from "./credential";

type SlackCredentials = {
    token: string,
    conversationId: string,
    url?: string | undefined | null
}

/**
 * Notifier Class
 *
 * Handles notifications related to report generation and file processing.
 * Supports Slack notifications, GitHub summary updates, and general stats logging.
 */
export class Notifier {

    get dashboardUrl(){
        return new StringBuilder().
        append("https://console.firebase.google.com/project")
            .append(`/${(credential.projectId)}`)
            .append(`/storage/${STORAGE_BUCKET}/files`)
            .toString()
    }

    /**
     * Sends a message to a Slack channel with details about the report.
     * Includes report links, file processing stats, and additional buttons.
     * @param slackCred - Slack credentials and channel information
     */
    public async SendSlackMsg(slackCred: SlackCredentials) {
        const web = new WebClient(slackCred.token);
        // See: https://api.slack.com/methods/chat.postMessage

        const blocks = []
        blocks.push({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*Your Allure report is ready* 📊"
            }
        })
        if (cloudStorage) {

            blocks.push({
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": `:file_folder:  *Files uploaded:* ${counter.filesUploaded}`
                        }
                    ]
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": `:mag:  *Files processed:* ${counter.filesProcessed}`
                        }
                    ]
                },)
        }
        blocks.push({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": `:stopwatch:  *Duration:* ${counter.getElapsedSeconds()} seconds`
                }
            ]
        })
        if (slackCred.url) {
            blocks.push({
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "View report",
                            "emoji": true
                        },
                        "url": slackCred.url
                    }
                ]
            })
        }
        if(cloudStorage){
            blocks.push({
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "View files in storage",
                            "emoji": true
                        },
                        "url": this.dashboardUrl
                    }
                ]
            })
        }
        blocks.push({
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "Star us on GitHub :smile:",
                        "emoji": true
                    },
                    "url": "https://github.com/cybersokari/allure-docker-deploy"
                }
            ]
        })

        const result = await web.chat.postMessage({
            channel: slackCred.conversationId,
            blocks: blocks,
            text: 'Your Allure report is ready.'
        });

        console.log('Message sent: ', result.ts);
    }

    /**
     * Prints a summary of the report to GitHub actions Summary.
     * Includes the report link, processing stats, and duration.
     * @param data - Contains the report URL and file path for summary
     */
    public async printGithubSummary(data: { mountedFilePath: string, url: string | undefined}): Promise<void> {
        const lineBreak = '</br>'
        const builder = new StringBuilder()
        builder.append(`**Your Allure report is ready 📈**`)
            .append(lineBreak).append(lineBreak)
        if (data.url) {
            builder.append(`**[View report](${data.url})**`)
                .append(lineBreak).append(lineBreak)
        }
        if (cloudStorage) {
            builder.append(`**[View files](${this.dashboardUrl})**`)
                .append(lineBreak).append(lineBreak)

            builder.append(`📂 Files uploaded: ${counter.filesUploaded}`)
                .append(lineBreak).append(lineBreak)
                .append(`🔍 Files processed: ${counter.filesProcessed}`)
                .append(lineBreak).append(lineBreak)
        }
        builder
            .append(`⏱️ Duration: ${counter.getElapsedSeconds()} seconds`)
        try {
            fs.writeFileSync(data.mountedFilePath, builder.toString(), {flag: 'a'}); // Append to the file
        } catch (err) {
            console.warn('Failed to write to $GITHUB_STEP_SUMMARY:', err);
        }
    }

    /**
     * Prints stats about the report generation process, including
     * history retention and retries.
     */
    public printStats() {
        if (!websiteId) {
            console.log('Report publishing disabled because WEBSITE_ID is not provided');
        }
        if (cloudStorage) {
            if (keepHistory && keepRetires) {
                console.log(`KEEP_HISTORY and KEEP_RETRIES enabled`)
            } else if (!keepHistory && !keepRetires) {
                console.log(`KEEP_HISTORY and KEEP_RETRIES disabled`)
            } else if (keepHistory) {
                console.log(`KEEP_HISTORY enabled`)
            } else if (keepRetires) {
                console.log(`KEEP_RETRIES enabled`)
            }
        } else {
            console.log('STORAGE_BUCKET is not provided, KEEP_HISTORY and KEEP_RETRIES disabled');
        }
    }

    printSummaryToConsole(data: {url: string | null}): void {
        if(data.url){
            console.log('Allure test report URL')
            console.log(ansiEscapes.link(chalk.blue(data.url), data.url));
        }
        if(cloudStorage){
            const dashboardUrl = this.dashboardUrl
            console.log('View files in Storage')
            console.log(ansiEscapes.link(chalk.blue(dashboardUrl), dashboardUrl));
        }
    }
}


