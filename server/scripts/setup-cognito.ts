import { CognitoIdentityProviderClient, CreateUserPoolCommand, CreateUserPoolClientCommand } from "@aws-sdk/client-cognito-identity-provider";

async function setup() {
  const client = new CognitoIdentityProviderClient({
    region: "local",
    endpoint: "http://localhost:9229",
    credentials: { accessKeyId: "local", secretAccessKey: "local" }
  });

  try {
    const poolRes = await client.send(new CreateUserPoolCommand({ PoolName: "local_userpool" }));
    const poolId = poolRes.UserPool!.Id!;
    console.log("Created pool:", poolId);

    const clientRes = await client.send(new CreateUserPoolClientCommand({
      UserPoolId: poolId,
      ClientName: "local-client-id"
    }));
    console.log("Created client:", clientRes.UserPoolClient!.ClientId);
    
    // Now we need to update src/services/auth.ts to use THIS client ID!
  } catch (err) {
    console.error(err);
  }
}

setup();
