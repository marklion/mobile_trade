declare const getSignature: (path: string, method: string, headers: {
    [key: string]: any;
}, queryString: string, clientSecret: string) => string;
export default getSignature;
