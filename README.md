
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
| apiHost | EASEY_API_GATEWAY_HOST | api.epa.gov/easey/dev | Configurable |

### CDX BYPASS VARIABLES
| Typescript Var Name | Environment Var Name | Default Value | Comment |
| :------------------ | :------------------- | :------------ | :------ |
| enabled | EASEY_CDX_BYPASS_ENABLED | false | Configurable |
| users | EASEY_CDX_BYPASS_USERS | *** | Configurable |
| password | EASEY_CDX_BYPASS_PASSWORD | *** | Configurable |
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
    - EASEY_CDX_BYPASS_PASSWORD={ask project dev/tech lead}
- EASEY_NAAS_SERVICES_APP_ID={ask project dev/tech lead}
- EASEY_NAAS_SERVICES_APP_PASSWORD={ask project dev/tech lead}

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
​The Auth Api makes use of the government provided [cdx soap](https://testngn.epacdxnode.net/cdx-register-II/documentation) services. By importing`createClientAsync from "soap"` a user created service can make a connection to any soap api, provided they have the correct security token. A call to `createClientAsync` will return a client object, and that client object can reference any of the api endpoints within that service category, while passing in the required authentication token. Here is an example of the Authenticate endpoint being called asynchronously. 

```
const  url = `${this.configService.get<string>('app.cdxSvcs',)}/RegisterAuthService?wsdl`;
createClientAsync(url).then(client  => {
	return  client.AuthenticateAsync({
		userId,
		password,
	});
}).then(result => {})
```

Before using most endpoints that are part of the majority of soap services, authentication to that particular service must be performed, and the token returned from authenticating to that service must be passed with each request. 

For example, to receive a user's primary organization, first you must authenticate against the StreamlinedRegistrationService. In this example a `naasAppId` and  `naasAppPwd` are required to make this authentication.  

```
const  url = `${this.configService.get<string>('app.cdxSvcs',)}/StreamlinedRegistrationService?wsdl`;

return createClientAsync(url).then(client  => {
	return  client.AuthenticateAsync({
		userId:  this.configService.get<string>('app.naasAppId'),
		credential:  this.configService.get<string>('app.nassAppPwd'),
	});
})
.then(res  => {
	return  res[0].securityToken;
})
```

Once the token has been stored / returned, any request in the StreamlinedRegistrationService can be executed. For instance, retrieving a users primary organization: 

```
const  url = `${this.configService.get<string>(
'app.cdxSvcs',
)}/StreamlinedRegistrationService?wsdl`;

return  createClientAsync(url).then(client  => {
	return  client.RetrievePrimaryOrganizationAsync({
		securityToken:  RETRIEVED_TOKEN_ABOVE,
		user: { userId:  userId },
	});
})
.then(res  => {
return  res[0].result.email;
})
```

## License & Contributing
This project is licensed under the MIT License. We encourage you to read this project’s [License](LICENSE), [Contributing Guidelines](CONTRIBUTING.md), and [Code of Conduct](CODE-OF-CONDUCT.md).

## Disclaimer
The United States Environmental Protection Agency (EPA) GitHub project code is provided on an "as is" basis and the user assumes responsibility for its use. EPA has relinquished control of the information and no longer has responsibility to protect the integrity , confidentiality, or availability of the information. Any reference to specific commercial products, processes, or services by service mark, trademark, manufacturer, or otherwise, does not constitute or imply their endorsement, recommendation or favoring by EPA. The EPA seal and logo shall not be used in any manner to imply endorsement of any commercial product or activity by EPA or the United States Government.
