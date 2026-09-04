import { Request, Response } from 'express';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

export const createLambdaAdapter = (handler: (event: APIGatewayProxyEventV2, context: any) => Promise<APIGatewayProxyResultV2>) => {
    return async (req: Request, res: Response) => {
        const event: any = {
            version: '2.0',
            routeKey: `${req.method} ${req.path}`,
            rawPath: req.path,
            rawQueryString: req.url.split('?')[1] || '',
            headers: Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : v || ''])),
            requestContext: {
                accountId: 'offlineContext_accountId',
                apiId: 'offlineContext_apiId',
                authorizer: {
                    jwt: {
                        claims: (req as any).user || {},
                        scopes: []
                    }
                } as any,
                domainName: 'offlineContext_domainName',
                domainPrefix: 'offlineContext_domainPrefix',
                http: {
                    method: req.method,
                    path: req.path,
                    protocol: 'HTTP/1.1',
                    sourceIp: req.ip || '',
                    userAgent: req.headers['user-agent'] || ''
                },
                requestId: 'offlineContext_requestId',
                routeKey: `${req.method} ${req.path}`,
                stage: '$default',
                time: new Date().toISOString(),
                timeEpoch: Date.now()
            },
            body: req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : undefined,
            pathParameters: req.params as any,
            queryStringParameters: req.query as any,
            isBase64Encoded: false,
        };

        try {
            const result = await handler(event, {} as any) as any;
            if (result.headers) {
                for (const [key, value] of Object.entries(result.headers)) {
                    res.setHeader(key, value as string);
                }
            }
            res.status(result.statusCode || 200).send(result.body);
        } catch (error) {
            console.error('Error executing lambda handler', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    };
};
