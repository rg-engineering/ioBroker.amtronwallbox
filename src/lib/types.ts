export interface iobObject {
    type: string,
    common: {
        name: string,
        role: string,
        type: string,
        unit?: string,
        read: boolean,
        write: boolean,
        desc?: string
    },
    native?: { id: string }
}



export interface AmtronwallboxConfig {
    

    IsActive: boolean,
    IPAddress: string,
    ApiKey:string,
    readInterval: number,
    Type: string,
    Name: string,
    timezone: string
}