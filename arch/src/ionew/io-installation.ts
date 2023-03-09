export interface IoInstallation {
    readonly syncInterval: 50 | 100 | 200 | 400 | 800;
    readonly installationTitle?: string;
}