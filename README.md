
# Authentication & Authorization API

[![License](https://img.shields.io/github/license/US-EPA-CAMD/easey-auth-api)](https://github.com/US-EPA-CAMD/easey-auth-api/blob/develop/LICENSE)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=US-EPA-CAMD_easey-auth-api&metric=alert_status)](https://sonarcloud.io/dashboard?id=US-EPA-CAMD_easey-auth-api)
[![Develop CI/CD](https://github.com/US-EPA-CAMD/easey-auth-api/workflows/Develop%20Branch%20Workflow/badge.svg)](https://github.com/US-EPA-CAMD/easey-auth-api/actions)
[![Release CI/CD](https://github.com/US-EPA-CAMD/easey-auth-api/workflows/Release%20Branch%20Workflow/badge.svg)](https://github.com/US-EPA-CAMD/easey-auth-api/actions)
![Issues](https://img.shields.io/github/issues/US-EPA-CAMD/easey-auth-api)
![Forks](https://img.shields.io/github/forks/US-EPA-CAMD/easey-auth-api)
![Stars](https://img.shields.io/github/stars/US-EPA-CAMD/easey-auth-api)
[![Open in Visual Studio Code](https://open.vscode.dev/badges/open-in-vscode.svg)](https://open.vscode.dev/US-EPA-CAMD/easey-auth-api)

## Description
Authentication & Authorization API for the EPA CAMD Business Systems EASEY Application

## Getting Started
Follow these [instructions](https://github.com/US-EPA-CAMD/devops/blob/master/GETTING-STARTED.md) to get the project up and running correctly.

## Installing
1. Open a terminal and navigate to the directory where you wish to store the repository.
2. Clone the repository using one of the following git cli commands or using your favorit Git management software<br>
    **Using SSH**
    ```
    $ git clone git@github.com:US-EPA-CAMD/easey-auth-api.git
    ```
    **Using HTTPS**
    ```
    $ git clone https://github.com/US-EPA-CAMD/easey-auth-api.git
    ```
3. Navigate to the projects root directory
    ```
    $ cd easey-auth-api
    ```
4. Install package dependencies
    ```
    $ yarn install
    ```
## Configuration
The Auth API uses a number of environment variables to properly configure the api. The following is the list of configureble values and their default setting.

### APP VARIABLES
| Typescript Var Name | Environment Var Name | Default Value | Comment |
| :------------------ | :------------------- | :------------ | :------ |
| name | N/A | auth-api | Fixed value |
| host | EASEY_AUTH_API_HOST | localhost | Configurable
| port | EASEY_AUTH_API_PORT | 8000 | Configurable |
| path | EASEY_AUTH_API_PATH | auth-mgmt | Configurable |
| title | EASEY_AUTH_API_TITLE | Authentication & Authorization | Configurable |
| description | EASEY_AUTH_API_DESCRIPTION | Provides authentication, authorization, & security token services for CAMD applications | Configurable |
| env | EASEY_AUTH_API_ENV | local-dev | Configurable |
| enableApiKey | EASEY_AUTH_API_ENABLE_API_KEY | false | Configurable |
| enableClientToken | EASEY_AUTH_API_ENABLE_CLIENT_TOKEN | false | Configurable |
| clientTokenDurationMinutes | EASEY_AUTH_API_CLIENT_TOKEN_DURATION_MINUTES | 5 | Configurable |
| secretToken | EASEY_AUTH_API_SECRET_TOKEN | *** | Dynamically set by CI/CD workflow |
| enableSecretToken | EASEY_AUTH_API_ENABLE_SECRET_TOKEN | false | Configurable |
| enableAuthToken | EASEY_AUTH_API_ENABLE_AUTH_TOKEN | false | Configurable |
| tokenExpirationDurationMinutes | EASEY_AUTH_API_AUTH_TOKEN_DURATION_MINUTES | 20 | Configurable |
| enableCors | EASEY_AUTH_API_ENABLE_CORS | true | Configurable |
| enableGlobalValidationPipes | EASEY_AUTH_API_ENABLE_GLOBAL_VALIDATION_PIPE | true | Configurable |
| version | EASEY_AUTH_API_VERSION | v0.0.0 | Dynamically set by CI/CD workflow |
| published | EASEY_AUTH_API_PUBLISHED | local | Dynamically set by CI/CD workflow |
| cdxSvcs | EASEY_CDX_SERVICES | https://devngn.epacdxnode.net/cdx-register-II/services | Configurable |
| naasSvcs | EASEY_NAAS_SERVICES | https://naasdev.epacdxnode.net/xml/securitytoken_v30.wsdl | Configurable |
| nassAppId | EASEY_NAAS_SERVICES_APP_ID | *** | Dynamically set by CI/CD workflow |
| nassAppPwd | EASEY_NAAS_SERVICES_APP_PASSWORD | *** | Dynamically set by CI/CD workflow |
| enableDebug | EASEY_AUTH_API_ENABLE_DEBUG | false | Configurable |
| mockPermissionsUrl | EASEY_AUTH_API_MOCK_PERMISSIONS_URL | https://api.epa.gov/easey/dev/auth-mgmt/permissions | Dynamically set by CI/CD workflow |
| permissionsUrl | EASEY_AUTH_API_PERMISSIONS_URL | https://cbsstagei.rtpnc.epa.gov/CBSD/api/auth-mgmt/responsibilities | Dynamically set by CI/CD workflow |
| contentUri | EASEY_AUTH_CONTENT_API | https://api.epa.gov/easey/dev/content-mgmt | Dynamically set by CI/CD workflow | 
| dataFlow | EASEY_AUTH_API_DATA_FLOW | 'EASEY' | Dynamically set by CI/CD workflow | 
| refreshTokenThresholdSeconds | EASEY_AUTH_API_REFRESH_TOKEN_THRESHOLD_SECONDS | 60 | Configurable | 
| enableAllFacilities | EASEY_AUTH_API_ENABLE_ALL_FACILITIES | false | Configurable | 
| authApi | EASEY_AUTH_API | https://${apiHost}/auth-mgmt | Dynamically set by CI/CD workflow |

### OIDC Authentication/Authorization Variables
| Typescript Var Name | Environment Var Name | Default Value | Comment                    |
| :-------- | :------------------- | :------------ |:---------------------------|
|  | OIDC_CLIENT_ID | *** | Configurable |
|  | OIDC_CLIENT_SECRET | *** | Configurable |
|  | OIDC_CLIENT_CREDENTIAL_SCOPE | *** | Configurable |
|  | OIDC_CDX_API_TOKEN_URL | *** | Configurable |
|  | OIDC_HMAC_SECRET_KEY | *** | Configurable               |
|  | OIDC_REST_API_BASE | *** | Configurable |
|  | ECMPS_DATA_FLOW_NAME | *** | Configurable |
|  | ECMPS_UI_REDIRECT_URL | *** | Configurable               |
|  | OIDC_AUTH_API_REDIRECT_URI | *** | Configurable |
|  | OIDC_CDX_TOKEN_ENDPOINT | *** | Configurable |
|  | OIDC_CDX_JWKS_URI | *** | Configurable |
|  | OIDC_CDX_TOKEN_ISSUER | *** | Configurable |

### CDX BYPASS VARIABLES
| Typescript Var Name | Environment Var Name | Default Value | Comment |
| :------------------ | :------------------- | :------------ | :------ |
| enabled | EASEY_CDX_BYPASS_ENABLED | false | Configurable |
| users | EASEY_CDX_BYPASS_USERS | *** | Configurable |
| mockPermissionsEnabled | EASEY_CDX_MOCK_PERMISSIONS_ENABLED | false | Configurable |

## Environment Variables File
Database credentials are injected into the cloud.gov environments as part of the CI/CD deployment process therefore they do not need to be configured. However, when running locally for local development the following environment variables are required to be configured using a local .env file in the root of the project. **PLEASE DO NOT commit the .env file to source control.**

- EASEY_AUTH_API_ENABLE_DEBUG=true|false
- EASEY_AUTH_API_ENABLE_API_KEY=true|false
  - IF ABOVE IS TRUE THEN SET
    - EASEY_AUTH_API_KEY={ask project dev/tech lead}
- EASEY_AUTH_API_ENABLE_SECRET_TOKEN=true|false
  - IF ABOVE IS TRUE THEN SET
    - EASEY_AUTH_API_SECRET_TOKEN={ask project dev/tech lead}
- EASEY_CDX_BYPASS_ENABLED=true|false
  - IF ABOVE IS TRUE THEN SET
    - EASEY_CDX_BYPASS_USERS={ask project dev/tech lead}

**Please refer to our [Getting Started](https://github.com/US-EPA-CAMD/devops/blob/master/GETTING-STARTED.md) instructions on how to configure the following environment variables & connect to the database.**
- EASEY_DB_HOST
- EASEY_DB_PORT
- EASEY_DB_NAME
- EASEY_DB_USER
- EASEY_DB_PWD

## Building, Testing, & Running the application
From within the projects root directory run the following commands using the yarn command line interface

**Run in development mode**
```
$ yarn start:dev
```

**Install/update package dependencies & run in development mode**
```
$ yarn up
```

**Unit tests**
```
$ yarn test
```

**Build**
```
$ yarn build
```

**Run in production mode**
```
$ yarn start
```

## API Endpoints
Please refer to the auth Management API Swagger Documentation for descriptions of the endpoints.<br>
[Dev Environment](https://api.epa.gov/easey/dev/auth-mgmt/swagger/) | [Test Environment](https://api.epa.gov/easey/test/auth-mgmt/swagger/) | [Performance Environment](https://api.epa.gov/easey/perf/auth-mgmt/swagger/) | [Beta Environment](https://api.epa.gov/easey/beta/auth-mgmt/swagger/) | [Staging Environment](https://api.epa.gov/easey/staging/auth-mgmt/swagger/)

## CDX Services
​The Auth Api makes use of the government provided [cdx REST](https://devngn.epacdxnode.net/cdx-register-II-rest/apidocs/index.html#/) services. These new REST endpoints replaced the old [cdx soap](https://testngn.epacdxnode.net/cdx-register-II/documentation) services. 

With the shift from SOAP to OIDC (OpenID Connect), we transition from a service-specific token-based authentication to a more standardized and secure OAuth 2.0 based authentication framework. OIDC allows clients to verify the identity of the user and to obtain their profile information.

### Getting Started with OIDC Authentication

#### 1. **Client Registration**
Register your application with the ICAM team (OIDC team) to obtain the `client_id` and `client_secret`. These are necessary for the OAuth 2.0 flow to authenticate and communicate securely with the OIDC provider.

#### 2. **Authorization Request**
The customized authentication process starts with a call to determinePolicy endpoint.  Here is the complete auth flow
- The client makes a determine policy call to Auth API
- Auth API makes a determine policy call to the OIDC provider
- OIDC provider and thus Auth API responds with one of _SIGNIN, _MIGRATE, or _SIGNUP policy. 
- The client forwards the user to the Auth endpoint of the OIDC provider. 
- User completes authentication flow at the OIDC provider
- When the user authentication process finishes, OIDC provider sends a POST request with an authorization code back to the AUTH Api (/oauth2/code endpoint)
- Auth API validates the authentication result (nonce and state values), exchanges the auth code for an access token, retrieve the user's CDX roles, and retrieve the user's CBS facilities and permissions, creates a user session and finally redirects the user back to the home page as a logged-in user

For making any REST api calls against the OIDC provider, you need to first obtain an api token. This token, provided against a given client id and secret, will authorize Auth API to make most API calls. However, endpoints that require the user be specifically identified or authenticated (such as createActivity) will require a token to be available in the header with the request. 

#### 2. **Token Exchange**
After successful authentication, the OIDC provider redirects back to Auth API with an authorization code. Exchange this code for an ID token and access token at the token endpoint.
```
const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', authorizationCode);  
    const tokenEndpoint = `${this.configService.get('OIDC_CDX_TOKEN_ENDPOINT').replace('%s', userSession.oidcPolicy)}`;
    params.append('p', userSession.oidcPolicy);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    const response = await firstValueFrom(
        this.httpService.post<T>(tokenEndpoint, params, { headers }),
        );
      return response.data;
```

Note that once the token is received from the OIDC provider, Auth API will validate the token: verifies the signature and issuer at the JWKS URI endpoint, ensures the token has not expired, that it was issued by the expected issuer for the right audience, etc.

Here are the three types of tokens returned by the token exchange
- **ID Token**: Contains the user identity information in a JWT (JSON Web Token) format.
- **Access Token**: Used to make authenticated API requests (should be transmitted only over HTTPS).
- **Refresh Token**: Used by Auth API to obtain new access tokens without requiring the user to authenticate again (such as from a refresh token call).

#### 2. **Obtaining an API Token**

Before making any API calls to the CDX REST endpoints, you must first obtain an api token. Example below (see TokenService.getCdxApiToken() )

```
const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('scope', scope);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };
    
      const response = await firstValueFrom(
        this.httpService.post<T>(tokenUrl, params, { headers }),
        );
      return response.data;
```

## License & Contributing
This project is licensed under the MIT License. We encourage you to read this project’s [License](LICENSE), [Contributing Guidelines](CONTRIBUTING.md), and [Code of Conduct](CODE-OF-CONDUCT.md).

## Disclaimer
The United States Environmental Protection Agency (EPA) GitHub project code is provided on an "as is" basis and the user assumes responsibility for its use. EPA has relinquished control of the information and no longer has responsibility to protect the integrity , confidentiality, or availability of the information. Any reference to specific commercial products, processes, or services by service mark, trademark, manufacturer, or otherwise, does not constitute or imply their endorsement, recommendation or favoring by EPA. The EPA seal and logo shall not be used in any manner to imply endorsement of any commercial product or activity by EPA or the United States Government.
