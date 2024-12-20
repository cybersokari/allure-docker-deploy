import { ArgsInterface } from "allure-deployer-shared";
import { ActionsCredentials } from "./credentials.js";
import * as path from "node:path";

export function getArgs(credentials: ActionsCredentials): ArgsInterface {
    const prefix = process.env.PREFIX || undefined;
    const keepHistory = process.env.KEEP_HISTORY !== "false"; // Default true
    const keepResults = process.env.KEEP_RESULTS !== "false"; // Default true
    const uploadRequired = keepResults || keepHistory;
    const showHistory = process.env.SHOW_HISTORY !== "false";  // Default true
    const showRetries = process.env.SHOW_RETRIES !== "false";  // Default true
    const downloadRequired = showRetries || showHistory;
    const resultsPath = path.normalize(`/github/workspace/${process.env.ALLURE_RESULTS_PATH!}`);

    return {
        firebaseProjectId: credentials.projectId,
        storageBucket: process.env.STORAGE_BUCKET || undefined,
        prefix: prefix,
        websiteId: process.env.WEBSITE_ID || undefined,
        websiteExpires: process.env.WEBSITE_EXPIRES || "7d",
        keepHistory: keepHistory,
        keepResults: keepResults,
        ARCHIVE_DIR: '/app/archive',
        HOME_DIR: "/app",
        RESULTS_PATH: resultsPath,
        REPORTS_DIR: "/app/allure-reports",
        RESULTS_STAGING_PATH: "/app/allure-results",
        fileProcessingConcurrency: 10,
        showHistory: showHistory,
        showRetries: showRetries,
        downloadRequired: downloadRequired,
        uploadRequired: uploadRequired,
    };
}