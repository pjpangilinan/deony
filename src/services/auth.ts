const COGNITO_URL = 'http://localhost:9229';
const CLIENT_ID = '2c3ijf8npjx6fspk8qahsdhne';

export const authFetch = async (target: string, body: any) => {
  const response = await fetch(COGNITO_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${target}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.__type || 'Auth error');
  }
  return data;
};

export const signUp = async (username: string, password: string, email: string) => {
  return authFetch('SignUp', {
    ClientId: CLIENT_ID,
    Username: username,
    Password: password,
    UserAttributes: [
      { Name: 'email', Value: email }
    ]
  });
};

export const confirmSignUp = async (username: string, code: string) => {
  return authFetch('ConfirmSignUp', {
    ClientId: CLIENT_ID,
    Username: username,
    ConfirmationCode: code
  });
};

export const signIn = async (identifier: string, password: string) => {
  const tryAuth = async (u: string) => {
    return authFetch('InitiateAuth', {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: u,
        PASSWORD: password,
      },
    });
  };

  let res;
  try {
    res = await tryAuth(identifier);
  } catch (err: any) {
    if (!identifier.includes('@')) {
      try {
        res = await tryAuth(`${identifier}@deony.local`);
      } catch {
        throw err;
      }
    } else {
      throw err;
    }
  }
  
  if (res.AuthenticationResult) {
    localStorage.setItem('accessToken', res.AuthenticationResult.AccessToken);
    localStorage.setItem('idToken', res.AuthenticationResult.IdToken);
    localStorage.setItem('refreshToken', res.AuthenticationResult.RefreshToken);
  }
  return res;
};

export const signOut = () => {
  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) {
    authFetch('GlobalSignOut', {
      AccessToken: accessToken
    }).catch(err => {
      // cognito-local does not implement GlobalSignOut; suppress the error in local dev
      if (!err?.message?.includes('GlobalSignOut')) {
        console.warn('GlobalSignOut:', err);
      }
    });
  }
  localStorage.removeItem('accessToken');
  localStorage.removeItem('idToken');
  localStorage.removeItem('refreshToken');
};

export const getSession = async () => {
  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken) return null;

  try {
    const res = await authFetch('GetUser', {
      AccessToken: accessToken
    });
    return {
      username: res.Username,
      attributes: res.UserAttributes,
      accessToken
    };
  } catch (err) {
    console.error('Session invalid:', err);
    signOut();
    return null;
  }
};
