const getQueryString = function (queryString:string) {
    if (queryString.length === 0) {
        return ''
    }
    let queryStrings = queryString.split('&')
    queryStrings = queryStrings.sort()
    let queryStringResult = ''

    queryStrings.map(item => {
        let strArr = item.split('=')
        let key = strArr[0]
        let value = strArr[1]
        if (queryStringResult.length > 0)
            queryStringResult = queryStringResult + "&" + encodeURIComponent(key) + "=" + encodeURIComponent(value)
        else
            queryStringResult = encodeURIComponent(key) + "=" + encodeURIComponent(value)
    })
    // console.log("queryStringResult", queryStringResult)

    return queryStringResult
}

export default getQueryString