export type CDKContext = {
    appName: string
    stage: string
    branch: string
    env: {
        account: string
        region: string
    }
    hosting: {
        domainName: string
        certificateArn: string
        ghTokenName: string
        ghOwner: string
        repo: string
        dbName: string
    }
}