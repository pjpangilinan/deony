import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'local',
  credentials: { accessKeyId: 'dummy', secretAccessKey: 'dummy' }
});
const docClient = DynamoDBDocumentClient.from(client);

async function clean() {
  const data = await docClient.send(new ScanCommand({ TableName: 'DeonyTable' }));
  const items = data.Items || [];
  let deleted = 0;
  for (const item of items) {
    if (item.PK.startsWith('USER#') && item.SK.startsWith('CAT#')) {
      await docClient.send(new DeleteCommand({
        TableName: 'DeonyTable',
        Key: { PK: item.PK, SK: item.SK }
      }));
      deleted++;
    }
  }
  console.log('Deleted ' + deleted + ' categories.');
}
clean().catch(console.error);
