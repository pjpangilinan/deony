#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DeonyStack } from '../lib/deony-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || '166488239490',
  region: process.env.CDK_DEFAULT_REGION || 'ap-southeast-1',
};

new DeonyStack(app, 'DeonyStack', {
  env,
  description: 'Deony Serverless Production Architecture Stack',
});

app.synth();
