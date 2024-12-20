import {CredentialsInterface} from "allure-deployer-shared";


export class ActionsCredentials implements CredentialsInterface{
    private _projectId: string | undefined;
    private static instance: ActionsCredentials; // Singleton instance
    public data: any; // Parsed credentials data

    async init(): Promise<void> {
        this.data = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON!);
        this._projectId = this.data.project_id;
    }

    public static getInstance(): ActionsCredentials {
        if (!this.instance) {
            this.instance = new ActionsCredentials();
        }
        return this.instance;
    }

    // Getter for the project ID, throws an error if not initialized
    get projectId(): string {
        if (!this._projectId) {
            throw new Error("Call init");
        }
        return this._projectId;
    }
}