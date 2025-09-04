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
        ghToken: string
        ghOwner: string
        ghBranch: string
        ghRepo: string
        dbHost: string
        dbUser: string
        dbPass: string
        dbName: string
    }
}