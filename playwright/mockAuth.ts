import { Page } from '@playwright/test';
import jwt from 'jsonwebtoken';

export async function mockCognitoAuth(page: Page) {
  let currentUsername = 'testuser';

  await page.route('http://localhost:9229/', async route => {
    const target = route.request().headers()['x-amz-target'] || '';
    
    try {
      const body = route.request().postDataJSON();
      if (body?.Username) currentUsername = body.Username;
      if (body?.AuthParameters?.USERNAME) currentUsername = body.AuthParameters.USERNAME;
    } catch {}

    const mockJwt = jwt.sign(
      { sub: currentUsername, 'cognito:username': currentUsername },
      'secret'
    );

    if (target.includes('SignUp') && !target.includes('ConfirmSignUp')) {
      await route.fulfill({ status: 200, body: '{}' });
    } else if (target.includes('ConfirmSignUp')) {
      await route.fulfill({ status: 200, body: '{}' });
    } else if (target.includes('InitiateAuth')) {
      await route.fulfill({ 
        status: 200, 
        body: JSON.stringify({
          AuthenticationResult: { 
            AccessToken: mockJwt, 
            IdToken: mockJwt, 
            RefreshToken: mockJwt 
          }
        })
      });
    } else if (target.includes('GetUser')) {
      await route.fulfill({ 
        status: 200, 
        body: JSON.stringify({
          Username: currentUsername,
          UserAttributes: [
            { Name: 'sub', Value: currentUsername },
            { Name: 'email', Value: `${currentUsername}@deony.local` }
          ]
        })
      });
    } else {
      await route.continue();
    }
  });
}
