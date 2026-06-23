function jsTypeToOpenApiType(type) {
    if (type === String) return 'string';
    if (type === Number) return 'number';
    if (type === Boolean) return 'boolean';
    return 'string';
}

function compareAlphabetically(a, b) {
    return a.localeCompare(b);
}

function paramsToSchema(params, isParams = true) {
    if (!params || Object.keys(params).length === 0) {
        return { type: 'object', properties: {} };
    }

    const properties = {};
    const required = [];

    Object.keys(params).sort(compareAlphabetically).forEach((key) => {
        const param = params[key];
        properties[key] = paramToSchemaProperty(param);
        if (isParams && param.have_to) {
            required.push(key);
        }
    });

    const schema = { type: 'object', properties };
    if (required.length > 0) {
        schema.required = required;
    }
    return schema;
}

function paramToSchemaProperty(param) {
    const schema = {};
    if (param.mean) {
        schema.description = param.mean;
    }
    if (param.example !== undefined) {
        schema.example = param.example;
    }

    if (param.type === Object) {
        schema.type = 'object';
        if (param.explain) {
            const sub = paramsToSchema(param.explain, true);
            schema.properties = sub.properties;
            if (sub.required) {
                schema.required = sub.required;
            }
        }
    } else if (param.type === Array) {
        schema.type = 'array';
        if (param.explain) {
            schema.items = {
                type: 'object',
                ...paramsToSchema(param.explain, true),
            };
        }
    } else {
        schema.type = jsTypeToOpenApiType(param.type);
    }

    return schema;
}

function makeOpenApiPath(apiDef, makeReqExample) {
    const writeNote = (apiDef.is_write && apiDef.need_rbac && apiDef.module !== 'global')
        ? '需要'
        : '不需要';

    const operation = {
        summary: apiDef.title,
        description: `${apiDef.description}\n\n${writeNote}写权限验证`,
        tags: [apiDef.module],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: paramsToSchema(apiDef.params, true),
                    example: makeReqExample(apiDef.params),
                },
            },
        },
        responses: {
            200: {
                description: '成功。err_msg 为空字符串表示成功，否则表示失败',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                err_msg: {
                                    type: 'string',
                                    description: '错误信息，空字符串表示成功',
                                    example: '',
                                },
                                result: paramsToSchema(apiDef.result, false),
                            },
                        },
                        example: {
                            err_msg: '',
                            result: makeReqExample(apiDef.result),
                        },
                    },
                },
            },
        },
    };

    if (apiDef.need_rbac) {
        operation.security = [{ token: [] }];
    }

    return { post: operation };
}

function buildOpenApiSpec(openapiPaths) {
    return {
        openapi: '3.0.3',
        info: {
            title: '掌易助理开放接口',
            version: '1.0.0',
            description: [
                '除登录接口之外，需要先调用登录接口获取 token，然后在请求头中带上 token 才能调用其他接口。',
                '每个接口的参数和返回值都是 JSON 格式。',
                '接口返回的对象中会携带 err_msg 和 result 两个字段。',
            ].join('\n'),
        },
        servers: [
            { url: '/api/v1', description: 'API v1' },
        ],
        tags: [...new Set(Object.values(openapiPaths).flatMap((pathItem) => {
            const op = pathItem.post;
            return op?.tags ?? [];
        }))].sort(compareAlphabetically).map((name) => ({ name })),
        paths: openapiPaths,
        security: [{ token: [] }],
        components: {
            securitySchemes: {
                token: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'token',
                    description: '登录接口返回的 token',
                },
            },
        },
    };
}

module.exports = {
    makeOpenApiPath,
    buildOpenApiSpec,
};
