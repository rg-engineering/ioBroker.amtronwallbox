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
    
    // {"IsActive":true,"Name":"Wallbox","IPAddress":"192.168.3.18","ApiKey":"","Type":"ChargeControl"}
    IsActive: boolean,
    IPAddress: string,
    ApiKey:string,
    
    Type: string,
    Name: string,
    
}