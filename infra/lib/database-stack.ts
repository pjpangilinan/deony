import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class DeonyDatabaseStack extends cdk.Stack {
  public readonly userTable: dynamodb.Table;
  public readonly categoryTable: dynamodb.Table;
  public readonly mediaTable: dynamodb.Table;
  public readonly experienceTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. User Table
    this.userTable = new dynamodb.Table(this, 'UserTable', {
      tableName: 'deony-users',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.userTable.addGlobalSecondaryIndex({
      indexName: 'UsernameIndex',
      partitionKey: { name: 'username', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // 2. Category Table
    this.categoryTable = new dynamodb.Table(this, 'CategoryTable', {
      tableName: 'deony-categories',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.categoryTable.addGlobalSecondaryIndex({
      indexName: 'UserCategoriesIndex',
      partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sort_order', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // 3. Media Table (Uniqueness enforced by PK, no lookup GSI)
    this.mediaTable = new dynamodb.Table(this, 'MediaTable', {
      tableName: 'deony-media',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // 4. Experience Table
    this.experienceTable = new dynamodb.Table(this, 'ExperienceTable', {
      tableName: 'deony-experiences',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // GSI1: CategoryStatusIndex
    this.experienceTable.addGlobalSecondaryIndex({
      indexName: 'CategoryStatusIndex',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI2: TimelineIndex (Sparse: items without GSI2SK are excluded)
    this.experienceTable.addGlobalSecondaryIndex({
      indexName: 'TimelineIndex',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI2SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI3: AlphaIndex
    this.experienceTable.addGlobalSecondaryIndex({
      indexName: 'AlphaIndex',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI3SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI4: RecentlyAddedIndex
    this.experienceTable.addGlobalSecondaryIndex({
      indexName: 'RecentlyAddedIndex',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI4SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
  }
}
