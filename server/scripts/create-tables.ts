import { DynamoDBClient, CreateTableCommand, DeleteTableCommand, ResourceNotFoundException } from '@aws-sdk/client-dynamodb';

const endpoint = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';
const client = new DynamoDBClient({
    endpoint,
    region: 'local-env',
    credentials: {
        accessKeyId: 'fakeMyKeyId',
        secretAccessKey: 'fakeSecretAccessKey'
    }
});

const tables = [
    {
        TableName: 'User',
        KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
        AttributeDefinitions: [
            { AttributeName: 'id', AttributeType: 'S' },
            { AttributeName: 'username', AttributeType: 'S' }
        ],
        BillingMode: 'PAY_PER_REQUEST',
        GlobalSecondaryIndexes: [
            {
                IndexName: 'UsernameIndex',
                KeySchema: [{ AttributeName: 'username', KeyType: 'HASH' }],
                Projection: { ProjectionType: 'ALL' }
            }
        ]
    },
    {
        TableName: 'Category',
        KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
        BillingMode: 'PAY_PER_REQUEST'
    },
    {
        TableName: 'Media',
        KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
        BillingMode: 'PAY_PER_REQUEST'
    },
    {
        TableName: 'Experience',
        KeySchema: [
            { AttributeName: 'PK', KeyType: 'HASH' },
            { AttributeName: 'SK', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'PK', AttributeType: 'S' },
            { AttributeName: 'SK', AttributeType: 'S' },
            { AttributeName: 'GSI1SK', AttributeType: 'S' }, // {category_id}#{status}#{sort_date}
            { AttributeName: 'GSI2SK', AttributeType: 'S' }, // {sort_date}#{experience_id}
            { AttributeName: 'GSI3SK', AttributeType: 'S' }, // {media_title_lowercase}#{experience_id}
            { AttributeName: 'GSI4SK', AttributeType: 'S' }  // {created_at}#{experience_id}
        ],
        BillingMode: 'PAY_PER_REQUEST',
        GlobalSecondaryIndexes: [
            {
                IndexName: 'CategoryStatusIndex',
                KeySchema: [
                    { AttributeName: 'PK', KeyType: 'HASH' },
                    { AttributeName: 'GSI1SK', KeyType: 'RANGE' }
                ],
                Projection: { ProjectionType: 'ALL' }
            },
            {
                IndexName: 'TimelineIndex',
                KeySchema: [
                    { AttributeName: 'PK', KeyType: 'HASH' },
                    { AttributeName: 'GSI2SK', KeyType: 'RANGE' }
                ],
                Projection: { ProjectionType: 'ALL' }
            },
            {
                IndexName: 'AlphaIndex',
                KeySchema: [
                    { AttributeName: 'PK', KeyType: 'HASH' },
                    { AttributeName: 'GSI3SK', KeyType: 'RANGE' }
                ],
                Projection: { ProjectionType: 'ALL' }
            },
            {
                IndexName: 'RecentlyAddedIndex',
                KeySchema: [
                    { AttributeName: 'PK', KeyType: 'HASH' },
                    { AttributeName: 'GSI4SK', KeyType: 'RANGE' }
                ],
                Projection: { ProjectionType: 'ALL' }
            }
        ]
    }
];

async function run() {
    for (const table of tables) {
        try {
            console.log(`Deleting table ${table.TableName}...`);
            await client.send(new DeleteTableCommand({ TableName: table.TableName }));
        } catch (e: any) {
            if (!(e instanceof ResourceNotFoundException)) {
                console.warn(`Could not delete ${table.TableName}:`, e);
            }
        }
    }
    for (const table of tables) {
        try {
            console.log(`Creating table ${table.TableName}...`);
            // @ts-ignore
            await client.send(new CreateTableCommand(table));
            console.log(`Successfully created table ${table.TableName}`);
        } catch (e: any) {
            console.error(`Error creating table ${table.TableName}:`, e);
        }
    }
}

run();
