import { AxiosRequestConfig } from 'axios';
type ReqArgs = Required<Pick<AxiosRequestConfig, 'url' | 'method'>> & Omit<AxiosRequestConfig, 'url' | 'method' | 'baseURL'>;
export declare class ApigwClient {
    clientID: string;
    clientSecret: string;
    constructor(clientID: string, clientSecret: string);
    request({ url, method, params, headers, ...other }: ReqArgs): Promise<import("axios").AxiosResponse<any>>;
}
export {};
