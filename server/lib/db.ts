import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const isDev = process.env.NODE_ENV !== 'production';
const endpoint = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';

const clientParams = isDev ? {
    endpoint,
    region: 'local-env',
    credentials: {
        accessKeyId: 'fakeMyKeyId',
        secretAccessKey: 'fakeSecretAccessKey'
    }
} : {};

export const TABLES = {
  USER: process.env.USER_TABLE || 'User',
  CATEGORY: process.env.CATEGORY_TABLE || 'Category',
  MEDIA: process.env.MEDIA_TABLE || 'Media',
  EXPERIENCE: process.env.EXPERIENCE_TABLE || 'Experience',
};

export const client = new DynamoDBClient(clientParams);
export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});
