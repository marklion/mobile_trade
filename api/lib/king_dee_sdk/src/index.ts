
import randomInt from './randomInt'
import getQueryStringFromParams from './getQueryStringFromParams'
import getSignature from './getSignature'
import axios, {AxiosRequestConfig} from 'axios'
type ReqArgs = Required<Pick<AxiosRequestConfig, 'url' | 'method'>> & Omit<AxiosRequestConfig, 'url' | 'method'|'baseURL'>
export class ApigwClient {
    clientID:string;
    clientSecret:string;
    constructor(clientID:string, clientSecret:string){
        this.clientID=clientID
        this.clientSecret=clientSecret
    }
    request({url, method, params = {},headers={},...other}:ReqArgs){
        const path = new URL(url).pathname
        const headersAppend = {
            'Content-Type': 'application/json',
            'X-Api-ClientID': this.clientID,
            'X-Api-Auth-Version': "2.0",
            'X-Api-TimeStamp': Date.now(),
            'X-Api-SignHeaders': 'X-Api-TimeStamp,X-Api-Nonce',
            'X-Api-Nonce': randomInt(),
            'X-Api-Signature': '',
            // 'app-token': appToken,
            // 'X-GW-Router-Addr': domain
        }
    
        const queryString = getQueryStringFromParams(params)
        // console.log("queryString", queryString)
        headersAppend['X-Api-Signature'] = getSignature( path, method, headersAppend, queryString, this.clientSecret )
        // console.log('headers', headers)
    
        let fetchUrl
        if (queryString.length===0) {
            fetchUrl = url
        } else {
            fetchUrl = url + "?" + queryString
        }

        return axios.request({
            url:fetchUrl,
            method:method,
            headers:{
                ...headersAppend,
                ...headers
            },
            ...other
        })
    }
}